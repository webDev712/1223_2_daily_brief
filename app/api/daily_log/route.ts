import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { IdName } from "@/lib/types";

export async function GET(request: NextRequest) {
    try{
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const status = searchParams.get("status");
        const employee = searchParams.get("employee");
        const department = searchParams.get("department");
        const severity = searchParams.get("severity");
        const category = searchParams.get("category");
        const page_size = searchParams.get("pageSize");
        const page = searchParams.get("page");
        console.log('fromDate')
        console.log(fromDate)
        console.log('toDate')
        console.log(toDate)

        const rows_count = await sql`
            SELECT COUNT(*) 
            FROM daily_log dl, department d, website_user u
            WHERE d.id = dl.department_id
                AND u.id = dl.user_id
            ${fromDate ? sql`
                AND date >= ${fromDate}` : sql``}
            ${toDate ? sql`
                AND date <= ${toDate}` : sql``}
            ${employee ? sql`
                AND u.id = ${employee}` : sql``}
            ${department ? sql`
                AND d.id = ${department}` : sql``}
            ${status ? sql`
                AND status = ${status}` : sql``}
            ${severity ? sql`
                AND severity = ${severity}` : sql``}
            ${category ? sql`
                AND category = ${category}` : sql``}
            ;
        `;

        const rows = await sql`
            SELECT dl.*, d.name AS d_name, u.name AS u_name
            FROM daily_log dl, department d, website_user u
            WHERE d.id = dl.department_id
                AND u.id = dl.user_id
            ${fromDate ? sql`
                AND dl.date >= ${fromDate}` : sql``}
            ${toDate ? sql`
                AND dl.date <= ${toDate}` : sql``}
            ${employee ? sql`
                AND dl.user_id = ${employee}` : sql``}
            ${department ? sql`
                AND dl.department_id = ${department}` : sql``}
            ${status ? sql`
                AND dl.status = ${status}` : sql``}
            ${severity ? sql`
                AND dl.severity = ${severity}` : sql``}
            ${category ? sql`
                AND dl.category = ${category}` : sql``}
            ORDER BY CASE status
                WHEN 'Unset' THEN 1
                WHEN 'In progress' THEN 2
                WHEN 'Resolved' THEN 3
                ELSE 4
            END, date DESC, d_name ASC, u_name ASC
            LIMIT ${page_size}
            OFFSET ${(Number(page) - 1) * Number(page_size)};
        `
        
        const statuses = <string[]>[];
        const employees = <IdName[]>[];
        const departments = <IdName[]>[];
        const severities = <string[]>[];
        const categories = <string[]>[];
        
        const all_rows = await sql`
            SELECT dl.*, u.name AS u_name, d.name AS d_name
            FROM daily_log dl, department d, website_user u
            WHERE d.id = dl.department_id
                AND u.id = dl.user_id`;
        
        all_rows.map((row: any) => {
            if (row.status)
                if (statuses.indexOf(row.status) === -1)
                    statuses.push(row.status)
            if (row.user_id && row.u_name)
                if (employees.filter((e: IdName) => e.id === row.user_id).length === 0)
                    employees.push({
                        id: row.user_id,
                        name: row.u_name,
                    })
            if (row.department_id && row.d_name)
                if (departments.filter((dep: IdName) => dep.id === row.department_id).length === 0)
                    departments.push({
                        id: row.department_id,
                        name: row.d_name,
                    })
            if (row.severity)
                if (severities.indexOf(row.severity) === -1)
                    severities.push(row.severity)
            if (row.category)
                if (categories.indexOf(row.category) === -1)
                    categories.push(row.category)
        })
        const filterArrays = {
            statuses: statuses,
            employees: employees,
            departments: departments,
            severities: severities,
            categories: categories,
        }
        return NextResponse.json({success: true, rows: rows, filterArrays: filterArrays, ok: true, count: rows_count[0]["count"],});
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
            actions,
            date_resolved = null
        } = body;
        console.log("body")
        console.log(body)
        
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
                ${(status === 'Resolved' || date_resolved !== null) ? date_resolved : null}
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
                status = ${date_resolved !== null ? 'Resolved' : status},
                actions = ${JSON.stringify(actions ?? [])},
                date_resolved = ${status === 'Resolved' || date_resolved !== null ? date_resolved : null};
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

export async function DELETE(request: NextRequest) {
    try{
        const body = await request.json();
        const { id } = body;
        console.log("body")
        console.log(body)
        
        await sql`
            DELETE FROM daily_log
            WHERE id = ${id};
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