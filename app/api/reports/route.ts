import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
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
        
        const rows = await sql`
            SELECT r.*, COALESCE((SELECT json_agg(s ORDER BY s.position)
                FROM report_schedule s WHERE s.report_id = r.id AND s.company_id = r.company_id), '[]'::json) AS schedules
            FROM report r
            WHERE r.company_id = ${company_id}
            ORDER BY r.id;`;
        return NextResponse.json(rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}