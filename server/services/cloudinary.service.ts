import { v2 as cloudinary } from "cloudinary";

/* =========================
   LAZY CONFIG 🔥
========================= */
let isConfigured = false;

function ensureCloudinary() {
  if (isConfigured) return;

  const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    console.error("❌ Cloudinary ENV missing");
    throw new Error("Cloudinary not configured");
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
  });

  isConfigured = true;
}

/* =========================
   TYPES
========================= */
export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  sizeKB: number;
}

/* =========================
   HELPERS
========================= */
function calculateSizeKB(bytes: number) {
  return Math.round(bytes / 1024);
}

function isBase64Image(file: string) {
  return file.startsWith("data:image");
}

/* =========================
   UPLOAD IMAGE 🔥
========================= */
export async function uploadImage(
  file: string,
  folder = "debt-smart/clients"
): Promise<UploadResult> {
  try {
    ensureCloudinary();

    if (!file) {
      throw new Error("No file provided");
    }

    if (!isBase64Image(file) && !file.startsWith("http")) {
      throw new Error("Invalid image format");
    }

    const res = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "image",

      transformation: [
        { width: 1000, height: 1000, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],

      use_filename: true,
      unique_filename: true,
    });

    return {
      url: res.secure_url,
      publicId: res.public_id,
      width: res.width,
      height: res.height,
      format: res.format,
      sizeKB: calculateSizeKB(res.bytes),
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Image upload failed");
  }
}

/* =========================
   DELETE IMAGE
========================= */
export async function deleteImage(publicId: string) {
  try {
    ensureCloudinary();

    if (!publicId) return false;

    const res = await cloudinary.uploader.destroy(publicId);

    return res.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/* =========================
   BULK DELETE
========================= */
export async function deleteMultipleImages(
  publicIds: string[]
) {
  try {
    ensureCloudinary();

    if (!publicIds?.length) return false;

    await cloudinary.api.delete_resources(publicIds);

    return true;
  } catch (error) {
    console.error("Bulk delete error:", error);
    return false;
  }
}

/* =========================
   OPTIMIZED URL
========================= */
export function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
  }
) {
  if (!publicId) return "";

  return cloudinary.url(publicId, {
    width: options?.width || 400,
    height: options?.height,
    crop: "scale",
    quality: "auto",
    fetch_format: "auto",
  });
}

/* =========================
   THUMBNAIL
========================= */
export function getThumbnail(publicId: string) {
  if (!publicId) return "";

  return cloudinary.url(publicId, {
    width: 150,
    height: 150,
    crop: "fill",
    quality: "auto",
  });
   }
