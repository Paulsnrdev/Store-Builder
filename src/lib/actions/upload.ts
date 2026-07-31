"use server";

import { cloudinary } from "@/lib/cloudinary";
import { getCurrentStore } from "@/lib/store";

export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const store = await getCurrentStore();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "No file provided." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files are allowed." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Image must be under 8MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `storehike/${store.id}`,
    });
    return { url: result.secure_url };
  } catch {
    return { error: "Upload failed. Check Cloudinary configuration." };
  }
}
