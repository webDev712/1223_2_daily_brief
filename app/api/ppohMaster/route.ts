import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
    try{
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user_id = user.id;
        const company_id = user.company_id;
        const permissions = user.permissions;

        const { searchParams } = new URL(request.url)
        const page_size = searchParams.get('page_size') || 100;
        const from_date = searchParams.get('from_date');
        const to_date = searchParams.get('to_date');
        const employee = searchParams.get('employee');
        const department = searchParams.get('department');
        const page = searchParams.get('page') || 1;
        const only_with_notes = Boolean(searchParams.get('only_with_notes')) || false;


        const rows_count = await sql`
            SELECT COUNT(*) 
            FROM ppoh_master
            WHERE company_id = ${company_id}
                AND (${!from_date} OR date >= ${from_date || '1970-01-01'}::date)
                AND (${!to_date} OR date <= ${to_date || '2999-12-31'}::date)
                AND (${!employee} OR external_id::text = ${employee || ''})
                AND (${!department} OR department = ${department || ''})
                AND (${only_with_notes !== true} OR (notes IS NOT NULL AND notes <> ''))
            ;
        `;

        const rows = await sql`
            SELECT p.id, p.external_id, p.date, COALESCE(e.name, p.employee_name) AS employee_name, p.department,
                p.pieces, p.value, p.hours, p.ppoh, p.target_ppoh, p.delta_ppoh, p.efficiency, p.notes
            FROM ppoh_master p
            LEFT JOIN smrt_employee e ON e.company_id = p.company_id AND e.external_id = p.external_id
            WHERE p.company_id = ${company_id}
                AND (${!from_date} OR date >= ${from_date || '1970-01-01'}::date)
                AND (${!to_date} OR date <= ${to_date || '2999-12-31'}::date)
                AND (${!employee} OR p.external_id::text = ${employee || ''})
                AND (${!department} OR department = ${department || ''})
                AND (${only_with_notes !== true} OR (notes IS NOT NULL AND notes <> ''))
            ORDER BY date DESC, department ASC, employee_name ASC
            LIMIT ${page_size}
            OFFSET ${(Number(page) - 1) * Number(page_size)}
            ;
        `;
        
        const departments = await sql`
            SELECT DISTINCT department
            FROM ppoh_master
            WHERE department IS NOT NULL
                AND company_id = ${company_id}
            ORDER BY department ASC;
        `;

        const employees = await sql`
            SELECT external_id AS id, name
            FROM smrt_employee
            WHERE company_id = ${company_id}
            ORDER BY name ASC;
        `;

        return NextResponse.json({
            ok: true,
            count: rows_count[0]["count"],
            rows: rows.map((row: any) => ({
                id: row.id,
                external_id: row.external_id,
                date: format(row.date, 'MM-dd-yyyy'),
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
            departments: departments.map((row: any) => row.department),
            employees,
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
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();

        const { id, notes } = body;
        if (!id){
            console.error("No production dashboard row with this id")
            return NextResponse.json(
                {error: "No production dashboard row with this id"},
                {status: 500}
            )
        }

        const rows = await sql`
            UPDATE ppoh_master
            SET notes = ${notes}
            WHERE id = ${id} AND company_id = ${user.company_id}
            RETURNING id;
        `

        if (!rows.length) {
            return NextResponse.json({ error: "Production dashboard row not found" }, { status: 404 });
        }


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
