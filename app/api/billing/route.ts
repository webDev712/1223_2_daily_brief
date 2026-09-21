import { auth } from "@/auth";
import sql from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET (request: NextRequest) {
    try{
        const { searchParams } = new URL(request.url);
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const rows = await sql`SELECT * FROM billing`;
        return NextResponse.json(rows);
    }
    catch(error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}