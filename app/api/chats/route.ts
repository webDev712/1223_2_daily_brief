import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { User } from "@/lib/types";
import { auth } from "@/auth";


export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);

    const id = searchParams.get('id');
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const user_id = session.user.id;
    const company_id = session.user.company_id;
    const permissions = session.user.permissions;

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
            WHERE (from_user = ${id}
                    OR to_user = ${id})
                        AND company_id = ${company_id}
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
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user_id = session.user.id;
        const company_id = session.user.company_id;
        const permissions = session.user.permissions;

        const body = await request.json();
    
        const {id, text, timestamp, users_ids} = body;
    
        const rows = await sql`
        INSERT INTO chat (
            text,
            from_user,
            to_user,
            timestamp,
            read,
            company_id
        )
        SELECT
            ${text},
            ${id},
            id,
            ${timestamp},
            FALSE,
            ${company_id}
        FROM website_user
        WHERE id = ANY(${users_ids})
            AND company_id = ${company_id}
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