import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try{
        const rows = await sql`
            SELECT *
            FROM daily_log;
        `
        return NextResponse.json({success: true, rows: rows});
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try{
        const body = await request.json();
        const {
            id = crypto.randomUUID(),
            date,
            user_id,
            department_id,
            shift,
            category,
            severity,
            text,
            status,
            actions
        } = body;
        const dateResolved = status === 'resolved' ? sql`NOW()` : sql`NULL`;
        await sql`
            INSERT INTO daily_log (
                id,
                date,
                user_id,
                department_id,
                shift,
                category,
                severity,
                text,
                status,
                actions,
                date_resolved
            )
            VALUES (
                ${id},
                ${date},
                ${user_id},
                ${department_id},
                ${shift},
                ${category},
                ${severity},
                ${text},
                ${status},
                ${JSON.stringify(actions ?? [])},
                ${dateResolved}
            )
            ON CONFLICT (id)
            DO UPDATE SET
                date = ${date},
                user_id = ${user_id},
                department_id = ${department_id},
                shift = ${shift},
                category = ${category},
                severity = ${severity},
                text = ${text},
                status = ${status},
                actions = ${JSON.stringify(actions ?? [])},
                date_resolved = ${dateResolved};
        `
        return NextResponse.json({success: true})
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}