import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/server/services/cloudinary.service";
import { withAuth } from "@/server/lib/auth";
import { UploadBodySchema } from "@/lib/validators/api";
import { ValidationError, handleApiError } from "@/server/core/error.handler";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_FOLDERS = new Set(["debt-smart/clients", "debt-smart/imports", "debt-smart/referrals"]);

function validateBase64(file: string) {
  if (!file.startsWith("data:image")) {
    return "Invalid image format";
  }

  const mimeMatch = file.match(/^data:(image\/[a-zA-Z]+);base64,/);

  if (!mimeMatch) return "Invalid image type";
  const mime = mimeMatch[1];

  if (!ALLOWED_TYPES.includes(mime)) return "Unsupported image type";

  const sizeInBytes = (file.length * 3) / 4 - (file.endsWith("==") ? 2 : file.endsWith("=") ? 1 : 0);
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > MAX_SIZE_MB) return `File too large (max ${MAX_SIZE_MB}MB)`;
  return null;
}

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    try {
      const body = await req.json();

      const parsed = UploadBodySchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Invalid upload payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const validationError = validateBase64(parsed.data.file);
      if (validationError) {
        throw new ValidationError(validationError);
      }

      const requestedFolder = (parsed.data.folder || "debt-smart/clients").trim();
      const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : "debt-smart/clients";

      const result = await uploadImage(parsed.data.file, folder);

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
          folder,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
