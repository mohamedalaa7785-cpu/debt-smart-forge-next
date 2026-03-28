import { NextResponse } from "next/server";
import { uploadImage } from "@/server/services/cloudinary.service";

/* =========================
   CONFIG
========================= */
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* =========================
   VALIDATE BASE64
========================= */
function validateBase64(file: string) {
  if (!file.startsWith("data:image")) {
    return "Invalid image format";
  }

  /* =========================
     TYPE CHECK
  ========================= */
  const mimeMatch = file.match(/^data:(image\/[a-zA-Z]+);base64,/);

  if (!mimeMatch) {
    return "Invalid image type";
  }

  const mime = mimeMatch[1];

  if (!ALLOWED_TYPES.includes(mime)) {
    return "Unsupported image type";
  }

  /* =========================
     SIZE CHECK
  ========================= */
  const sizeInBytes =
    (file.length * 3) / 4 -
    (file.endsWith("==") ? 2 : file.endsWith("=") ? 1 : 0);

  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > MAX_SIZE_MB) {
    return `File too large (max ${MAX_SIZE_MB}MB)`;
  }

  return null;
}

/* =========================
   SANITIZE
========================= */
function sanitize(body: any) {
  return {
    file: body.file,
    folder: body.folder || "debt-smart",
  };
}

/* =========================
   POST
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* =========================
       VALIDATION
    ========================= */
    if (!body.file) {
      return NextResponse.json(
        { success: false, error: "File is required" },
        { status: 400 }
      );
    }

    const validationError = validateBase64(body.file);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    /* =========================
       SANITIZE
    ========================= */
    const clean = sanitize(body);

    /* =========================
       UPLOAD
    ========================= */
    const result = await uploadImage(clean.file, clean.folder);

    /* =========================
       RESPONSE
    ========================= */
    return NextResponse.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },

      meta: {
        sizeLimitMB: MAX_SIZE_MB,
      },
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
      },
      { status: 500 }
    );
  }
         }
