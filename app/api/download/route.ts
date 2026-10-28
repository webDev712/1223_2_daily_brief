import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";


export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const url = request.nextUrl.searchParams.get("url");
    const name = request.nextUrl.searchParams.get("name");

    if (!url || !name) {
      return NextResponse.json(
        { error: "Missing url or name" },
        { status: 400 }
      );
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN!;

    const result = await get(url, {
      access: "private",
      token: blobToken,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const safeName = name.replace(/[\r\n"\\/]/g, "_");

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Download error:", error);

    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}