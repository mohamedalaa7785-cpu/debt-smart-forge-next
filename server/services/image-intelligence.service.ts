 codex/remove-debug-text-from-login-ui-qogfas
import OpenAI from "openai";

  import OpenAI from "openai";
 main
import { createSupabaseAdminClient } from "@/server/auth/session.service";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { ValidationError } from "@/server/core/error.handler";

const EMBEDDING_DIMENSIONS = 512;
 codex/remove-debug-text-from-login-ui-qogfas
const IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET?.trim() || "client-documents";
const IMAGE_BUCKET =
  process.env.SUPABASE_IMAGE_BUCKET?.trim() || "client-documents";
 main

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
 codex/remove-debug-text-from-login-ui-qogfas
    if (!apiKey) throw new ValidationError("OPENAI_API_KEY is required", { field: "OPENAI_API_KEY" });
    if (!apiKey) {
      throw new ValidationError("OPENAI_API_KEY is required");
    }
 main
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function base64ToBytes(base64DataUrl: string) {
 codex/remove-debug-text-from-login-ui-qogfas
  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new ValidationError("Invalid image payload");

  const mime = match[1];
  const content = match[2];
  const bytes = Buffer.from(content, "base64");
  if (!bytes.length) throw new ValidationError("Invalid image payload");

  return { mime, bytes };
  const match = base64DataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );
  if (!match) throw new ValidationError("Invalid image payload");

  return {
    mime: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
 main
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function describeImageForEmbedding(imageUrl: string) {
  const openai = getOpenAI();

 codex/remove-debug-text-from-login-ui-qogfas
  const completion = await openai.chat.completions.create({

  const res = await openai.chat.completions.create({
 main
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
 codex/remove-debug-text-from-login-ui-qogfas
          "Extract concise visual tags for search indexing. Return a single plain text sentence with objects, colors, logos, scene type.",
          "Extract short visual tags for search indexing (objects, colors, scene).",
 main
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image for indexing." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

 codex/remove-debug-text-from-login-ui-qogfas
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new ValidationError("Failed to generate image descriptor");
  return text;
  return res.choices[0]?.message?.content?.trim() || "";
 main
}

async function toEmbeddingVector(text: string) {
  const openai = getOpenAI();
 codex/remove-debug-text-from-login-ui-qogfas


 main
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

 codex/remove-debug-text-from-login-ui-qogfas
  const vector = res.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new ValidationError("Failed to generate embedding vector");
  }

  return vector;
  return res.data[0].embedding;
 main
}

function toPgVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

 codex/remove-debug-text-from-login-ui-qogfas
export async function uploadImageAndIndex(params: {

export async function uploadImageAndIndex({
  ownerUserId,
  clientId = null,
  fileBase64,
  title = null,
}: {
 main
  ownerUserId: string;
  clientId?: string | null;
  fileBase64: string;
  title?: string | null;
}) {
 codex/remove-debug-text-from-login-ui-qogfas
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

  const signedForEmbedding = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(filePath, 60 * 60);
  if (signedForEmbedding.error || !signedForEmbedding.data?.signedUrl) {
    throw new ValidationError("Failed to generate signed URL for indexing", { details: signedForEmbedding.error?.message });
  }

  const descriptor = await describeImageForEmbedding(signedForEmbedding.data.signedUrl);
  const { mime, bytes } = base64ToBytes(fileBase64);

  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
    ? "webp"
    : "jpg";

  const filePath = `${sanitizePathPart(
    ownerUserId
  )}/${Date.now()}.${ext}`;

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(filePath, bytes);

  if (error) throw new ValidationError(error.message);

  const publicUrl = supabase.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(filePath).data.publicUrl;

  const descriptor = await describeImageForEmbedding(publicUrl);
 main
  const embedding = await toEmbeddingVector(descriptor);

  const [saved] = await db
    .insert(documents)
    .values({
      ownerUserId,
      clientId,
      storagePath: filePath,
      title,
      mimeType: mime,
 codex/remove-debug-text-from-login-ui-qogfas
      metadata: { descriptor },
    })
    .returning({ id: documents.id, clientId: documents.clientId, storagePath: documents.storagePath });

      metadata: { imageUrl: publicUrl, descriptor },
    })
    .returning();
 main

  await db.execute(sql`
    update documents
    set embedding = ${toPgVectorLiteral(embedding)}::vector
    where id = ${saved.id}
  `);

 codex/remove-debug-text-from-login-ui-qogfas
  return {
    id: saved.id,
    clientId: saved.clientId,
    storagePath: saved.storagePath,
    imageUrl: signedForEmbedding.data.signedUrl,
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
      (1 - (d.embedding <=> ${vectorLiteral}::vector)) as similarity
    from documents d
    where d.owner_user_id = ${params.ownerUserId}
      and d.embedding is not null
    order by d.embedding <=> ${vectorLiteral}::vector
    limit ${limit}
  `);

  const storageClient = createSupabaseAdminClient();
  const matches = await Promise.all(rows.map(async (row: any) => {
    const storagePath = String(row.storage_path || "");
    let signedUrl = "";

    if (storagePath) {
      const signed = await storageClient.storage.from(IMAGE_BUCKET).createSignedUrl(storagePath, 60 * 60);
      signedUrl = signed.data?.signedUrl || "";
    }

    return {
      document_id: String(row.id),
      client_id: row.client_id ? String(row.client_id) : null,
      image_url: signedUrl,
      similarity: Math.max(0, Math.min(1, Number(row.similarity || 0))),
    };
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


export async function compareFaceSimilarity(imageBase64A: string, imageBase64B: string) {
  const descriptorA = await describeImageForEmbedding(imageBase64A);
  const descriptorB = await describeImageForEmbedding(imageBase64B);

  const embA = await toEmbeddingVector(descriptorA);
  const embB = await toEmbeddingVector(descriptorB);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embA.length; i++) {
    const a = embA[i] || 0;
    const b = embB[i] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  return {
    similarity: Math.max(0, Math.min(1, similarity)),
    descriptor_a: descriptorA,
    descriptor_b: descriptorB,
  };
}
  return { id: saved.id, imageUrl: publicUrl };
}
 main
