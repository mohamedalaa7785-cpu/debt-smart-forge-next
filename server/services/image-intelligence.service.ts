import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/server/auth/session.service";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { ValidationError } from "@/server/core/error.handler";

const EMBEDDING_DIMENSIONS = 512;
const IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET?.trim() || "client-documents";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new ValidationError("OPENAI_API_KEY is required", { field: "OPENAI_API_KEY" });
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function base64ToBytes(base64DataUrl: string) {
  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new ValidationError("Invalid image payload");

  const mime = match[1];
  const content = match[2];
  const bytes = Buffer.from(content, "base64");
  if (!bytes.length) throw new ValidationError("Invalid image payload");

  return { mime, bytes };
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function describeImageForEmbedding(imageUrl: string) {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Extract concise visual tags for search indexing. Return a single plain text sentence with objects, colors, logos, scene type.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image for similarity indexing." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new ValidationError("Failed to generate image descriptor");
  return text;
}

async function toEmbeddingVector(text: string) {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const vector = res.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new ValidationError("Failed to generate embedding vector");
  }

  return vector;
}

function toPgVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export async function uploadImageAndIndex(params: {
  ownerUserId: string;
  clientId?: string | null;
  fileBase64: string;
  title?: string | null;
}) {
  const { ownerUserId, clientId = null, fileBase64, title = null } = params;
  const { mime, bytes } = base64ToBytes(fileBase64);

  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const filePath = `${sanitizePathPart(ownerUserId)}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createSupabaseAdminClient();
  const uploadRes = await supabase.storage.from(IMAGE_BUCKET).upload(filePath, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (uploadRes.error) {
    throw new ValidationError("Failed to upload image", { details: uploadRes.error.message });
  }

  const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;
  const descriptor = await describeImageForEmbedding(publicUrl);
  const embedding = await toEmbeddingVector(descriptor);

  const [saved] = await db
    .insert(documents)
    .values({
      ownerUserId,
      clientId,
      storagePath: filePath,
      title,
      mimeType: mime,
      metadata: { imageUrl: publicUrl, descriptor },
    })
    .returning({ id: documents.id, clientId: documents.clientId, storagePath: documents.storagePath });

  await db.execute(sql`
    update documents
    set embedding = ${toPgVectorLiteral(embedding)}::vector
    where id = ${saved.id}
  `);

  return {
    id: saved.id,
    clientId: saved.clientId,
    storagePath: saved.storagePath,
    imageUrl: publicUrl,
    descriptor,
  };
}

export async function searchSimilarImages(params: {
  ownerUserId: string;
  imageBase64?: string;
  imageUrl?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);

  let baseUrl = params.imageUrl?.trim() || "";
  if (!baseUrl) {
    if (!params.imageBase64) throw new ValidationError("Provide imageBase64 or imageUrl");
    const uploaded = await uploadImageAndIndex({
      ownerUserId: params.ownerUserId,
      fileBase64: params.imageBase64,
      title: "query-image",
    });
    baseUrl = uploaded.imageUrl;
  }

  const descriptor = await describeImageForEmbedding(baseUrl);
  const queryEmbedding = await toEmbeddingVector(descriptor);
  const vectorLiteral = toPgVectorLiteral(queryEmbedding);

  const rows = await db.execute(sql`
    select
      d.id,
      d.client_id,
      d.storage_path,
      coalesce(d.metadata->>'imageUrl', '') as image_url,
      (1 - (d.embedding <=> ${vectorLiteral}::vector)) as similarity
    from documents d
    where d.owner_user_id = ${params.ownerUserId}
      and d.embedding is not null
    order by d.embedding <=> ${vectorLiteral}::vector
    limit ${limit}
  `);

  const matches = rows.map((row: any) => ({
    document_id: String(row.id),
    client_id: row.client_id ? String(row.client_id) : null,
    image_url: String(row.image_url || row.storage_path || ""),
    similarity: Math.max(0, Math.min(1, Number(row.similarity || 0))),
  }));

  const riskRows = await db
    .select({
      clientId: documents.clientId,
      riskText: sql<string>`coalesce(max(${documents.metadata}->>'riskScore'), '0')`,
    })
    .from(documents)
    .where(and(eq(documents.ownerUserId, params.ownerUserId), isNotNull(documents.clientId)))
    .groupBy(documents.clientId)
    .orderBy(desc(documents.createdAt));

  const riskMap = new Map<string, number>();
  for (const row of riskRows) {
    if (!row.clientId) continue;
    riskMap.set(row.clientId, Number(row.riskText || 0));
  }

  return {
    query_descriptor: descriptor,
    matches: matches.map((m) => ({
      ...m,
      risk_score: m.client_id ? riskMap.get(m.client_id) ?? 0 : 0,
    })),
  };
}
