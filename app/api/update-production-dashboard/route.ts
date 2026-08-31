import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    const response = await fetch(
      "https://example.com/api/data",
      {
        headers: {
          Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch external API");
    }

    const data = await response.json();

    for (const item of data) {
      await sql`
        INSERT INTO your_table (
          name,
          value
        )
        VALUES (
          ${item.name},
          ${item.value}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      imported: data.length,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { 
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}