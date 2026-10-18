"use client";

import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import './css/ImageUploader.css'

type ImageUploaderProps = {
  send_url_to: (url: string) => void;
  disabled?: boolean;
};


export default function ImageUploader({send_url_to, disabled=false}: ImageUploaderProps) {
  async function upload(file: File) {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 0.5,
      initialQuality: 0.9,
      useWebWorker: true,
      fileType: "image/webp",
    });

    const formData = new FormData();
    formData.append("file", compressed);

    const response = await fetch("/api/upload_image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      toast.error("Upload failed");
    }

    const { url } = await response.json();

    console.log("Photo URL:", url);
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
            toast.success('Added image!');
          } catch {
            toast.error("Error while uploading an image.");
          }
        }}
      />
    </label>
  );
}