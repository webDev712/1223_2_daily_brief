import { NextResponse } from "next/server";
import sql from "@/lib/db";


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