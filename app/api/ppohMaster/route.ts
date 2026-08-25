import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { count } from "console";
import { format } from "date-fns";

export async function GET(request: Request) {
    try{
        const { searchParams } = new URL(request.url)
        const page_size = searchParams.get('page_size') || 100;
        const from_date = searchParams.get('from_date');
        const to_date = searchParams.get('to_date');
        const employee = searchParams.get('employee');
        const department = searchParams.get('department');
        const page = searchParams.get('page') || 1;

        const rows_count = await sql`
            SELECT COUNT(*) 
            FROM ppoh_master
            WHERE 1=1
            ${from_date ? sql`
                AND date >= ${format(from_date, 'yyyy-MM-dd')}` : sql``}
            ${to_date ? sql`
                AND date <= ${format(to_date, 'yyyy-MM-dd')}` : sql``}
            ${employee ? sql`
                AND external_id = ${employee}` : sql``}
            ${department ? sql`
                AND department = ${department}` : sql``}
            ;
        `;

        const rows = await sql`
            SELECT *
            FROM ppoh_master
            WHERE 1=1
            ${from_date ? sql`
                AND date >= ${format(new Date(from_date), 'yyyy-MM-dd')}` : sql``}
            ${to_date ? sql`
                AND date <= ${format(new Date(to_date), 'yyyy-MM-dd')}` : sql``}
            ${employee ? sql`
                AND external_id = ${employee}` : sql``}
            ${department ? sql`
                AND department = ${department}` : sql``}
            ORDER BY date DESC, department ASC, employee_name ASC
            LIMIT ${page_size}
            OFFSET ${(Number(page) - 1) * Number(page_size)}
            ;
        `;
        
        const departments = await sql`
            SELECT DISTINCT department
            FROM ppoh_master
            WHERE department IS NOT NULL
            ORDER BY department ASC;
        `;
        console.log(departments.map(row => row.department))

        return NextResponse.json({
            ok: true,
            count: rows_count[0]["count"],
            rows: rows.map(row => ({
                id: row.id,
                external_id: row.external_id,
                date: row.date,
                employee_name: row.employee_name,
                department: row.department,
                pieces: row.pieces,
                value: row.value,
                hours: row.hours,
                ppoh: row.ppoh,
                target_ppoh: row.target_ppoh,
                delta_ppoh: row.delta_ppoh,
                efficiency: row.efficiency,
                notes: row.notes,
            })),
            departments: departments.map(row => row.department),
        });
    }
    catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try{
        const body = await request.json();

        const { id, notes } = body;
        if (!id){
            console.error("No production dashboard row with this id")
            NextResponse.json(
                {error: "No production dashboard row with this id"},
                {status: 500}
            )
        }

        await sql`
            UPDATE ppoh_master
            SET notes = ${notes}
            WHERE id = ${id};
        `


        return NextResponse.json({
            success: true,
            ok: true,
            status: 200,
        })
    }
    catch (error){
        console.error(error)
        return NextResponse.json(
            {error: "Database error"},
            {status: 500}
        )
    }
}