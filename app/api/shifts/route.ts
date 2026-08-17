import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireRole } from "@/lib/auth";


export async function GET() {
    try{
        // await requireRole("lead");
        const rows = await sql`SELECT * FROM shift WHERE archived <> TRUE;`;
        return NextResponse.json(rows)
    }
    catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
}
