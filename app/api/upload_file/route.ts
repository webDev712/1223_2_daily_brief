import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large (limit: 10MB)'},
        { status: 413 }
      );
    }

    const blob = await put(
      `chat-attachments/${crypto.randomUUID()}`,
      file,
      {
        access: "private",
        contentType: 'application/octet-stream',
        addRandomSuffix: true,
        storeId: process.env.BLOB_STORE_ID,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );

    return NextResponse.json({ url: blob.url, size: file.size });
  } catch (error) {
    console.error("Error while adding file:", error);

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}