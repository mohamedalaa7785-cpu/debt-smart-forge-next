  import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/server/auth/session.service";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { ValidationError } from "@/server/core/error.handler";

const EMBEDDING_DIMENSIONS = 512;
const IMAGE_BUCKET =
  process.env.SUPABASE_IMAGE_BUCKET?.trim() || "client-documents";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ValidationError("OPENAI_API_KEY is required");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function base64ToBytes(base64DataUrl: string) {
  const match = base64DataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );
  if (!match) throw new ValidationError("Invalid image payload");

  return {
    mime: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function describeImageForEmbedding(imageUrl: string) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Extract short visual tags for search indexing (objects, colors, scene).",
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

  return res.choices[0]?.message?.content?.trim() || "";
}

async function toEmbeddingVector(text: string) {
  const openai = getOpenAI();

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return res.data[0].embedding;
}

function toPgVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export async function uploadImageAndIndex({
  ownerUserId,
  clientId = null,
  fileBase64,
  title = null,
}: {
  ownerUserId: string;
  clientId?: string | null;
  fileBase64: string;
  title?: string | null;
}) {
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
    .returning();

  await db.execute(sql`
    update documents
    set embedding = ${toPgVectorLiteral(embedding)}::vector
    where id = ${saved.id}
  `);

  return { id: saved.id, imageUrl: publicUrl };
}