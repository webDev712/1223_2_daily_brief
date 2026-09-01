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
                    AND to_user = ${id_1});
    `;

    return NextResponse.json(rows);
}