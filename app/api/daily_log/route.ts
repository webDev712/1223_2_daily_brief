import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { IdName } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { managesBriefs } from "@/lib/briefs";

export async function GET(request: NextRequest) {
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
        const canSeeAll = managesBriefs(user) || user.permissions.see_all_briefs === true || user.permissions.see_dashboard === true;
            
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get("fromDate") || null;
        const toDate = searchParams.get("toDate") || null;
        const status = searchParams.get("status") || null;
        const employee = searchParams.get("employee") || null;
        const department = searchParams.get("department") || null;
        const severity = searchParams.get("severity") || null;
        const category = searchParams.get("category") || null;
        const page_size = Math.max(1, Number(searchParams.get("pageSize")) || 20);
        const page = Math.max(1, Number(searchParams.get("page")) || 1);

        const filterParams = [
            company_id,
            fromDate,
            toDate,
            employee,
            department,
            status,
            severity,
            category,
            canSeeAll,
            user.department_id ?? null,
            user_id,
        ];

        const whereClause = `
            WHERE dl.company_id = $1
                AND u.company_id = $1
                AND d.id = dl.department_id
                AND u.id = dl.user_id
                AND ($2::date IS NULL OR dl.date >= $2::date)
                AND ($3::date IS NULL OR dl.date < ($3::date + INTERVAL '1 day'))
                AND ($4::uuid IS NULL OR dl.user_id = $4::uuid OR dl.assigned_to_user_id = $4::uuid)
                AND ($5::uuid IS NULL OR dl.department_id = $5::uuid)
                AND ($6::text IS NULL OR LOWER(dl.status) = LOWER($6::text))
                AND ($7::text IS NULL OR dl.severity = $7::text)
                AND ($8::text IS NULL OR dl.category = $8::text)
                AND ($9::boolean OR dl.department_id = $10::uuid OR dl.user_id = $11::uuid OR dl.assigned_to_user_id = $11::uuid)
        `;

        const rows_count = await sql(`
            SELECT COUNT(*)
            FROM daily_log dl
            JOIN department d ON d.id = dl.department_id
            JOIN website_user u ON u.id = dl.user_id
            ${whereClause}
        `, filterParams);

        const rows = await sql(`
            SELECT dl.*, d.name AS d_name, u.name AS u_name,
                au.name AS assigned_to_name,
                COALESCE(sb.date::text, dl.date::date::text) AS brief_date,
                COALESCE(sb.department_id, dl.department_id) AS brief_department_id
            FROM daily_log dl
            JOIN department d ON d.id = dl.department_id
            JOIN website_user u ON u.id = dl.user_id
            LEFT JOIN website_user au ON au.id = dl.assigned_to_user_id AND au.company_id = dl.company_id
            LEFT JOIN saved_brief sb ON sb.id = dl.saved_brief_id AND sb.company_id = dl.company_id
            ${whereClause}
            ORDER BY CASE dl.status
                WHEN 'Unset' THEN 1
                WHEN 'In progress' THEN 2
                WHEN 'Resolved' THEN 3
                ELSE 4
            END, dl.date DESC, d_name ASC, u_name ASC
            LIMIT $12
            OFFSET $13
        `, [...filterParams, page_size, (page - 1) * page_size]);
        
        const statuses = <string[]>[];
        const employees = <IdName[]>[];
        const departments = <IdName[]>[];
        const severities = <string[]>[];
        const categories = <string[]>[];
        
        const all_rows = await sql(`
            SELECT dl.*, u.name AS u_name, d.name AS d_name, au.name AS assigned_to_name
            FROM daily_log dl
            JOIN department d ON d.id = dl.department_id
            JOIN website_user u ON u.id = dl.user_id
            LEFT JOIN website_user au ON au.id = dl.assigned_to_user_id AND au.company_id = dl.company_id
            WHERE dl.company_id = $1
                AND u.company_id = $1
                AND ($2::boolean OR dl.department_id = $3::uuid OR dl.user_id = $4::uuid OR dl.assigned_to_user_id = $4::uuid)
        `, [company_id, canSeeAll, user.department_id ?? null, user_id]);
        
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
            if (row.assigned_to_user_id && row.assigned_to_name)
                if (employees.filter((e: IdName) => e.id === row.assigned_to_user_id).length === 0)
                    employees.push({
                        id: row.assigned_to_user_id,
                        name: row.assigned_to_name,
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
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const company_id = user.company_id;

        const body = await request.json();
        const {
            id = crypto.randomUUID(),
            date,
            user_id,
            assigned_to_user_id = null,
            department_id,
            shift,
            category,
            severity,
            text,
            status,
            actions,
            date_resolved = null
        } = body;
        
        await sql`
            INSERT INTO daily_log (
                id,
                date,
                user_id,
                assigned_to_user_id,
                department_id,
                shift,
                category,
                severity,
                text,
                status,
                actions,
                date_resolved,
                company_id
            )
            VALUES (
                ${id},
                ${date},
                ${user_id || user.id},
                ${assigned_to_user_id || null},
                ${department_id},
                ${shift},
                ${category},
                ${severity},
                ${text},
                ${status},
                ${JSON.stringify(actions ?? [])},
                ${(status === 'Resolved' || date_resolved !== null) ? date_resolved : null},
                ${company_id}
            )
            ON CONFLICT (id)
            DO UPDATE SET
                date = ${date},
                user_id = CASE WHEN daily_log.finding_id IS NOT NULL THEN daily_log.user_id ELSE ${user_id || user.id} END,
                assigned_to_user_id = ${assigned_to_user_id || null},
                department_id = ${department_id},
                shift = ${shift},
                category = ${category},
                severity = ${severity},
                text = ${text},
                status = ${date_resolved !== null ? 'Resolved' : status},
                actions = ${JSON.stringify(actions ?? [])},
                date_resolved = ${status === 'Resolved' || date_resolved !== null ? date_resolved : null}
            WHERE daily_log.company_id = ${company_id};
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
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const company_id = user.company_id;

        const body = await request.json();
        const { id } = body;
        
        await sql`
            DELETE FROM daily_log
            WHERE id = ${id}
                AND company_id = ${company_id};
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