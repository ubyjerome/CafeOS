import { Configs } from "@/configs";

export interface UploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export const uploadImage = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", Configs.cloudinary.upload_preset);
  formData.append("folder", "cafeos");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${Configs.cloudinary.cloud_name}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload image");
  }

  return response.json();
};

export const getOptimizedImageUrl = (
  url: string,
  options: { width?: number; height?: number; quality?: number } = {},
) => {
  if (!url.includes("cloudinary.com")) return url;

  const { width = 400, height, quality = 80 } = options;
  const transforms = [`q_${quality}`, `w_${width}`];
  if (height) transforms.push(`h_${height}`);
  transforms.push("c_fill", "f_auto");

  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
};
