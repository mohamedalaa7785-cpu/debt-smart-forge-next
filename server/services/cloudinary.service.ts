import { v2 as cloudinary } from "cloudinary";

/* =========================
   ENV VALIDATION 🔥
========================= */
const REQUIRED_ENV = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`❌ Missing ENV: ${key}`);
  }
});

/* =========================
   CONFIG
========================= */
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
  format: string;
  sizeKB: number;
}

/* =========================
   INTERNAL HELPERS
========================= */
function calculateSizeKB(bytes: number) {
  return Math.round(bytes / 1024);
}

/* =========================
   UPLOAD IMAGE 🔥
   (Base64 / URL)
========================= */
export async function uploadImage(
  file: string,
  folder = "debt-smart/clients"
): Promise<UploadResult> {
  try {
    const res = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "image",

      /* =========================
         OPTIMIZATION 🔥
      ========================= */
      transformation: [
        { width: 1000, height: 1000, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],

      /* =========================
         PERFORMANCE
      ========================= */
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
    if (!publicId) return false;

    const res = await cloudinary.uploader.destroy(publicId);

    return res.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/* =========================
   BULK DELETE 🔥
========================= */
export async function deleteMultipleImages(
  publicIds: string[]
) {
  try {
    if (!publicIds.length) return false;

    await cloudinary.api.delete_resources(publicIds);

    return true;
  } catch (error) {
    console.error("Bulk delete error:", error);
    return false;
  }
}

/* =========================
   OPTIMIZED URL 🔥
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
   THUMBNAIL URL 🔥
========================= */
export function getThumbnail(publicId: string) {
  return cloudinary.url(publicId, {
    width: 150,
    height: 150,
    crop: "fill",
    quality: "auto",
  });
       }
