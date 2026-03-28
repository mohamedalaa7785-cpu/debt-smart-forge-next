import { v2 as cloudinary } from "cloudinary";

/* =========================
   CONFIG
========================= */
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_URL?.split(":")[1],
  api_secret: process.env.CLOUDINARY_URL?.split(":")[2]?.split("@")[0],
});

/* =========================
   UPLOAD IMAGE
========================= */
export async function uploadImage(file: string) {
  try {
    const res = await cloudinary.uploader.upload(file, {
      folder: "debt-smart",
    });

    return {
      url: res.secure_url,
      publicId: res.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}
