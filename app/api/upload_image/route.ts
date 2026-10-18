import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try{ 
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (file.type !== "image/webp" || file.size > 120 * 1024) {
      return NextResponse.json(
        { error: "Invalid image" },
        { status: 400 }
      );
    }

    const blob = await put(
      `photos/${crypto.randomUUID()}.webp`,
      file,
      {
        access: "private",
        contentType: "image/webp",
        addRandomSuffix: true,
        // oidcToken: process.env.VERCEL_OIDC_TOKEN,
        storeId: process.env.BLOB_STORE_ID,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error while adding image')
    console.error(error)
    return NextResponse.json({ error: error });
  }
}