import { NextResponse } from "next/server";
import sql from "@/lib/db"
import nodemailer from "nodemailer";
import { auth } from "@/auth";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function GET(request: Request) {
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

        // await requireRole("lead");
        const { searchParams } = new URL(request.url);

        const id = searchParams.get("id");
        const rows = await sql`
            SELECT * FROM website_user WHERE id = ${id} AND company_id = ${company_id};
        `
        return NextResponse.json(rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        // await requireRole("manager");
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

        let {
            email,
            name,
            user_role,
            lead_letter,
            archived = false,
            phone = "+1 111 111 1111",
            department_id
        } = body;

        let rows;
        if (body.resend_invite === true) {
            rows = await sql`
                SELECT w.id, w.email, w.name
                FROM website_user w JOIN company c ON c.id = w.company_id
                WHERE w.id = ${body.id} AND w.company_id = ${company_id}
                    AND (c.main_admin_id = ${user_id}::uuid OR ${permissions.add_users === true}) AND w.archived = false;
            `;
            if (!rows.length) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            email = rows[0].email;
            name = rows[0].name;
        } else {
            const existingUser = await sql`
                SELECT id
                FROM website_user
                WHERE LOWER(email) = LOWER(${email})
                LIMIT 1;
            `;

            if (existingUser.length > 0) {
                return NextResponse.json(
                    { error_translation_key: 'toasts.user_exists' },
                    { status: 409 }
                );
            }
            rows = await sql`
            INSERT INTO website_user (
                email,
                name,
                role_id,
                lead_letter,
                archived,
                phone,
                department_id,
                company_id
            )
            VALUES (
                ${email},
                ${name},
                ${user_role},
                ${lead_letter},
                ${archived},
                ${phone},
                ${department_id},
                ${company_id}
            )
            RETURNING id;
        `;
        }

        try {
            await transporter.sendMail({
                from: `"Daily Brief" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: "Your Daily Brief account is ready",
                html: `
                    <h2>Welcome, ${name}!</h2>
                    <p>Your Daily Brief account has been created successfully.</p>
                    <p>You can sign in here:</p>
                    <a href="https://dailybrief-web.vercel.app/landing">dailybrief-web.vercel.app</a>
                    <p>If you did not expect this account, please contact your administrator.</p>
                    <p>Best, Daily Brief.</p>
                `,
            });

            transporter.verify((error, success) => {
                if (error) {
                    console.error("GMAIL SMTP ERROR:", error);
                } else {
                    console.log("GMAIL SMTP READY:", success);
                }
            });

            console.log(`Welcome email sent to ${email}`);
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            if (body.resend_invite === true) {
                return NextResponse.json({ error: "Failed to send invitation" }, { status: 502 });
            }
        }

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



export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user_id = session.user.id;
        const company_id = session.user.company_id;
        const owner = await sql`SELECT id FROM company WHERE id = ${company_id} AND main_admin_id = ${user_id}::uuid`;
        if (!owner.length && !session.user.permissions.add_users) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id, email, name, phone, lead_letter, role_id, department_id } = await request.json();
        const existingUser = await sql`
            SELECT id FROM website_user WHERE LOWER(email) = LOWER(${email}) AND id <> ${id} LIMIT 1;
        `;
        if (existingUser.length > 0) {
            return NextResponse.json({ error_translation_key: 'toasts.user_exists' }, { status: 409 });
        }
        const rows = await sql`
            UPDATE website_user w
            SET email = ${email}, name = ${name}, phone = ${phone}, lead_letter = ${lead_letter},
                role_id = ${role_id}, department_id = ${department_id}
            WHERE w.id = ${id} AND w.company_id = ${company_id}
                AND EXISTS (SELECT 1 FROM role WHERE id = ${role_id} AND company_id = ${company_id})
                AND EXISTS (SELECT 1 FROM department WHERE id = ${department_id} AND company_id = ${company_id})
                AND (w.id <> ${user_id}::uuid OR (w.role_id = ${role_id} AND w.department_id = ${department_id}))
            RETURNING w.id;
        `;
        if (!rows.length) {
            return NextResponse.json({ error: "Invalid user, role or department" }, { status: 400 });
        }
        return NextResponse.json({ success: true, id: rows[0].id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
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

        // await requireRole("lead");
        const body = await request.json()

        const {
            id,
            email,
            name,
            lead_letter,
            archived,
            role_id,
            department
        } = body;
        await sql`
            UPDATE website_user
            SET email = ${email}, name = ${name}, lead_letter = ${lead_letter}, archived = ${archived}, role_id = ${role_id}, department_id = ${department}
            WHERE id = ${id} AND company_id = ${company_id};
        `
        return NextResponse.json({
            success: true,
            id: id
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}