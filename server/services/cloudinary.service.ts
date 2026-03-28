import crypto from "crypto";

const CLOUDINARY_URL = process.env.CLOUDINARY_URL || "";
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

function parseCloudinaryUrl(url: string) {
  // format: cloudinary://api_key:api_secret@cloud_name
  try {
    const clean = url.replace("cloudinary://", "");
    const [auth, cloud] = clean.split("@");
    const [apiKey, apiSecret] = auth.split(":");

    return {
      apiKey,
      apiSecret,
      cloudName: cloud,
    };
  } catch {
    return null;
  }
}

export async function uploadToCloudinary(file: File | Blob) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary config missing");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const data = await res.json();

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
  };
}

export async function deleteFromCloudinary(publicId: string) {
  if (!CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL missing");
  }

  const parsed = parseCloudinaryUrl(CLOUDINARY_URL);
  if (!parsed) {
    throw new Error("Invalid CLOUDINARY_URL");
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${parsed.apiSecret}`)
    .digest("hex");

  const formData = new URLSearchParams();
  formData.append("public_id", publicId);
  formData.append("api_key", parsed.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${parsed.cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  return data;
}

export function buildCloudinaryUrl(publicId: string) {
  if (!CLOUD_NAME) return "";

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
    }
