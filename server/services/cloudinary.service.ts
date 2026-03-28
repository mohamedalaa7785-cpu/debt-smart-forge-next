import { v2 as cloudinary } from "cloudinary";

/* =========================
   CONFIG (SECURE)
========================= */
if (
  !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("❌ Cloudinary env variables missing");
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =========================
   TYPES
========================= */
export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/* =========================
   UPLOAD BASE64 / URL
========================= */
export async function uploadImage(
  file: string
): Promise<UploadResult> {
  try {
    const res = await cloudinary.uploader.upload(file, {
      folder: "debt-smart/clients",
      resource_type: "image",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    return {
      url: res.secure_url,
      publicId: res.public_id,
      width: res.width,
      height: res.height,
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
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/* =========================
   OPTIMIZED URL GENERATOR
========================= */
export function getOptimizedImageUrl(
  publicId: string,
  width = 400
) {
  return cloudinary.url(publicId, {
    width,
    crop: "scale",
    quality: "auto",
    fetch_format: "auto",
  });
}
