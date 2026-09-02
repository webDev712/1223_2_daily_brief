import { NextResponse } from "next/server";
import sql from "@/lib/db";


export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);

    const id_1 = searchParams.get('id_1');
    const id_2 = searchParams.get('id_2');

    const rows = await sql`
        SELECT *
        FROM chat
        WHERE (from_user = ${id_1}
            AND to_user = ${id_2})
                OR (from_user = ${id_2}
                    AND to_user = ${id_1})
        ORDER BY timestamp;
    `;

    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            text,
            from_user,
            to_user,
            timestamp,
        } = body;

        const rows = await sql`
            INSERT INTO chat (
                text,
                from_user,
                to_user,
                timestamp,
                read
            )
            VALUES (
                ${text},
                ${from_user},
                ${to_user},
                ${timestamp},
                FALSE
            )
            RETURNING id;
        `;

        return NextResponse.json({
            success: true,
            id: rows[0].id
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}


export async function PATCH(request: Request) {
    try {
        const body = await request.json();

        const {
            id,
            text,
            from_user,
            to_user,
            timestamp,
            read
        } = body;

        const rows = await sql`
            UPDATE chat 
            SET text = ${text}, from_user = ${from_user}, to_user = ${to_user}, timestamp = ${timestamp}, read = ${read}
            WHERE id = ${id};
        `;

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}