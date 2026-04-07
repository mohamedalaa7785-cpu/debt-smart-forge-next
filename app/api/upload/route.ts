import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/server/services/cloudinary.service";
import { requireUser } from "@/server/lib/auth";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateBase64(file: string) {
  if (!file || typeof file !== "string") {
    return "Invalid file";
  }

  if (!file.startsWith("data:image")) {
    return "Invalid image format";
  }

  const mimeMatch = file.match(/^data:(image\/[a-zA-Z]+);base64,/);

  if (!mimeMatch) {
    return "Invalid image type";
  }

  const mime = mimeMatch[1];

  if (!ALLOWED_TYPES.includes(mime)) {
    return "Unsupported image type";
  }

  const sizeInBytes = (file.length * 3) / 4 - (file.endsWith("==") ? 2 : file.endsWith("=") ? 1 : 0);
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > MAX_SIZE_MB) {
    return `File too large (max ${MAX_SIZE_MB}MB)`;
  }

  return null;
}

function sanitize(body: any) {
  return {
    file: String(body.file || ""),
    folder: typeof body.folder === "string" && body.folder.trim() ? body.folder.trim() : "debt-smart/clients",
  };
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body?.file) {
      return NextResponse.json({ success: false, error: "File is required" }, { status: 400 });
    }

    const validationError = validateBase64(body.file);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const clean = sanitize(body);
    const result = await uploadImage(clean.file, clean.folder);

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        sizeKB: result.sizeKB,
      },
      meta: {
        maxSizeMB: MAX_SIZE_MB,
      },
    });
  } catch (error: any) {
    console.error("UPLOAD ERROR:", error);
    const status = error?.message === "Unauthorized" || error?.message === "Invalid session" ? 401 : 500;
    return NextResponse.json({ success: false, error: error?.message || "Upload failed" }, { status });
  }
}
