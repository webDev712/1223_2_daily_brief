import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";

export async function GET() {
    try{
        // await requireRole("lead");
        const rows = await sql`
            SELECT 
                w.id,
                w.email,
                w.name,
                w.lead_letter,
                w.archived,
                w.phone, 
                d.name as department,
                r.permissions,
                r.name AS user_role,
                r.id AS role_id
            FROM website_user w, department d, role r
            WHERE d.id = w.department_id
                AND r.id = w.role_id;`
        return NextResponse.json(rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}