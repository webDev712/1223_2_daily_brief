"use client";

import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import './css/ImageUploader.css'

type ImageUploaderProps = {
  send_url_to: (url: string) => void;
  disabled?: boolean;
};


export default function ImageUploader({send_url_to, disabled=false}: ImageUploaderProps) {
async function convertToWebP(file: File): Promise<Blob> {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load image"));
    });

    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Image conversion failed"));
            return;
          }

          resolve(result);
        },
        "image/webp",
        0.85
      );
    });

    if (blob.type !== "image/webp") {
      throw new Error(
        `Browser does not support WebP conversion: ${blob.type}`
      );
    }

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

  async function upload(file: File) {
    const webp = await convertToWebP(file);

    const compressed = await imageCompression(
      new File([webp], "image.webp", { type: "image/webp" }),
      {
        maxWidthOrHeight: 1600,
        maxSizeMB: 0.5,
        initialQuality: 0.85,
        useWebWorker: false,
        fileType: "image/webp",
      }
    );

    console.log("Final image:", compressed.type, compressed.size);

    const formData = new FormData();
    formData.append("file", compressed, "image.webp");

    const response = await fetch("/api/upload_image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const { url } = await response.json();

    if (!url) throw new Error("Server did not return an image URL");

    send_url_to(url);
    return url;
  }
  return (
    <label className="image-uploader-wrapper">
      <span className="image-uploader-label">Add image</span>

      <input
        type="file"
        accept="image/*"
        placeholder=""
        className={disabled ? 'image-uploader d' : 'image-uploader'}
        disabled={disabled ?? false}
        onChange={async (e) => {
        let file = e.currentTarget.files?.[0];
        alert(
          file
            ? `1 File selected: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024 / 1024).toFixed(2)} MB`
            : "1 File was not selected"
        );

          if (!file) file = e.target.files?.[0];
          alert(
            file
              ? `2 File selected: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024 / 1024).toFixed(2)} MB`
              : "2 File was not selected"
          );
          if (!file) return;
          try {
            const url = await upload(file);
            alert('Added image!');
          } catch (error) {
            alert(`Error while uploading an image: ${error}`);
          }
        }}
      />
    </label>
  );
}