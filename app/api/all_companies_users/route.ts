import { NextResponse } from "next/server";
import sql from "@/lib/db";


export async function GET(request: Request) {
    try{
        const {searchParams} = new URL(request.url);
    
        const email = searchParams.get('email');
    
        const rows = await sql`
            SELECT *
            FROM website_user
            WHERE email = ${email};
        `;
    
        return NextResponse.json(rows);
    }
    catch(error) {
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
}
