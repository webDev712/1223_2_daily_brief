import sql from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET () {
    try{
        const rows = await sql`SELECT * FROM plan`;
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