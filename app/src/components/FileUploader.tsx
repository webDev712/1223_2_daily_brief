"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import "./css/ImageUploader.css";

type FileUploaderProps = {
  send_url_to: (url: string, file_name: string) => void;
  disabled?: boolean;
};

const ALLOWED_EXTENSIONS = ["pdf", "txt", "csv", "doc", "docx", "xls", "xlsx", "zip", ];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function FileUploader({
  send_url_to,
  disabled = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Maximum file size is 10 MB");
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error("This file type is not supported");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload_file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error ?? "Upload failed");
    }

    const result = await response.json();

    if (!result.url) {
      throw new Error("Server did not return a file URL");
    }

    send_url_to(result.url, file.name);
  }

  async function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      await upload(file);
      toast.success("File uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <label className="image-uploader-wrapper file-uploader-wrapper">
      <span className="image-uploader-label file-uploader-label">
        {uploading ? "Uploading..." : "Add File (up to 10 MB)"}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(",")}
        className={
          disabled || uploading
            ? "image-uploader file-uploader d"
            : "image-uploader file-uploader"
        }
        disabled={disabled || uploading}
        onChange={handleChange}
      />
    </label>
  );
}