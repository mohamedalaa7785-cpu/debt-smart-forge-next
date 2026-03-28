import { NextResponse } from "next/server";
import { uploadImage } from "@/server/services/cloudinary.service";

/* =========================
   MAX FILE SIZE (BASE64)
========================= */
const MAX_SIZE_MB = 5;

/* =========================
   VALIDATE BASE64
========================= */
function validateBase64(file: string) {
  if (!file.startsWith("data:image")) {
    return "Invalid image format";
  }

  const sizeInBytes =
    (file.length * 3) / 4 - (file.endsWith("==") ? 2 : 1);

  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > MAX_SIZE_MB) {
    return `File too large (max ${MAX_SIZE_MB}MB)`;
  }

  return null;
}

/* =========================
   POST
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.file) {
      return NextResponse.json(
        { success: false, error: "File is required" },
        { status: 400 }
      );
    }

    /* =========================
       VALIDATION
    ========================= */
    const error = validateBase64(body.file);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    /* =========================
       UPLOAD
    ========================= */
    const result = await uploadImage(body.file);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
      }
