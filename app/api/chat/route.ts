import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/auth";


export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);

    const id_1 = searchParams.get('id_1');
    const id_2 = searchParams.get('id_2');
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
        SELECT *
        FROM chat
        WHERE company_id = ${company_id} AND (
                (from_user = ${id_1} AND to_user = ${id_2})
                OR (from_user = ${id_2} AND to_user = ${id_1})
            )
        ORDER BY timestamp;
    `;

    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

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
                read,
                company_id
            )
            VALUES (
                ${text},
                ${from_user},
                ${to_user},
                ${timestamp},
                FALSE,
                ${company_id}
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
            SET text = ${text}, from_user = ${from_user}, to_user = ${to_user}, timestamp = ${timestamp}, read = ${read}, company_id = ${company_id}
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