import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { User } from "@/lib/types";


export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);

    const id = searchParams.get('id');

    const rows = await sql`
        WITH ranked_messages AS (
            SELECT
                *,
                CASE
                    WHEN from_user = ${id} THEN to_user
                    ELSE from_user
                END AS other_user,
                ROW_NUMBER() OVER (
                    PARTITION BY
                        CASE
                            WHEN from_user = ${id} THEN to_user
                            ELSE from_user
                        END
                    ORDER BY timestamp DESC
                ) AS rn
            FROM chat
            WHERE from_user = ${id}
            OR to_user = ${id}
        )
        SELECT *
        FROM ranked_messages
        WHERE rn = 1
        ORDER BY timestamp DESC;
    `;

    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    try{
        const body = await request.json();
    
        const {id, text, timestamp} = body;
    
        const rows = await sql`
        INSERT INTO chat (
            text,
            from_user,
            to_user,
            timestamp,
            read
        )
        SELECT
            ${text},
            ${id},
            id,
            ${timestamp},
            FALSE
        FROM website_user
        WHERE id != ${id}
        RETURNING id;`
        return NextResponse.json({success: true, rows})
    }
    catch(e){
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
    
}