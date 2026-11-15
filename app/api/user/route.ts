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
                    AND c.main_admin_id = ${user_id}::uuid AND w.archived = false;
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
            subject: "Welcome to Daily Brief | Your account is ready!",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="
                    margin: 0;
                    padding: 0;
                    background-color: #f3f5f9;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #1e293b;
                ">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="background-color: #f3f5f9; padding: 40px 15px;">
                        <tr>
                            <td align="center">

                                <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                    style="
                                        max-width: 560px;
                                        background-color: #ffffff;
                                        border-radius: 12px;
                                        overflow: hidden;
                                        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
                                    ">

                                    <!-- Header -->
                                    <tr>
                                        <td style="
                                            background-color: #1e293b;
                                            padding: 28px 35px;
                                        ">
                                            <h1 style="
                                                margin: 0;
                                                color: #ffffff;
                                                font-size: 23px;
                                                font-weight: 700;
                                                letter-spacing: -0.5px;
                                            ">
                                                Daily Brief
                                            </h1>
                                            <p style="
                                                margin: 6px 0 0;
                                                color: #cbd5e1;
                                                font-size: 12px;
                                                letter-spacing: 1.5px;
                                                text-transform: uppercase;
                                            ">
                                                Team Communication
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 35px;">

                                            <!-- Success Icon -->
                                            <table cellpadding="0" cellspacing="0" border="0"
                                                style="margin-bottom: 22px;">
                                                <tr>
                                                    <td align="center" valign="middle"
                                                        style="
                                                            width: 52px;
                                                            height: 52px;
                                                            background-color: #dcfce7;
                                                            border-radius: 50%;
                                                            color: #16a34a;
                                                            font-size: 27px;
                                                            font-weight: bold;
                                                        ">
                                                        &#10003;
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="
                                                margin: 0 0 10px;
                                                color: #16a34a;
                                                font-size: 13px;
                                                font-weight: 700;
                                                text-transform: uppercase;
                                                letter-spacing: 1px;
                                            ">
                                                Account successfully created
                                            </p>

                                            <h2 style="
                                                margin: 0 0 18px;
                                                color: #0f172a;
                                                font-size: 27px;
                                                line-height: 1.3;
                                            ">
                                                Welcome, ${name}!
                                            </h2>

                                            <p style="
                                                margin: 0 0 20px;
                                                color: #475569;
                                                font-size: 15px;
                                                line-height: 1.7;
                                            ">
                                                Your Daily Brief account has been created successfully.
                                                You're all set to get started!
                                            </p>

                                            <!-- Account Info -->
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="
                                                    background-color: #f8fafc;
                                                    border: 1px solid #e2e8f0;
                                                    border-radius: 8px;
                                                ">
                                                <tr>
                                                    <td style="padding: 18px 20px;">
                                                        <p style="
                                                            margin: 0 0 7px;
                                                            color: #64748b;
                                                            font-size: 12px;
                                                            font-weight: 700;
                                                            text-transform: uppercase;
                                                            letter-spacing: 0.8px;
                                                        ">
                                                            Your account
                                                        </p>
                                                        <p style="
                                                            margin: 0;
                                                            color: #334155;
                                                            font-size: 14px;
                                                            font-weight: 600;
                                                        ">
                                                            ${email}
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- CTA -->
                                            <table cellpadding="0" cellspacing="0" border="0"
                                                style="margin: 30px 0 15px;">
                                                <tr>
                                                    <td align="center"
                                                        style="
                                                            background-color: #2563eb;
                                                            border-radius: 7px;
                                                        ">
                                                        <a href="https://dailybrief-web.vercel.app/landing"
                                                            style="
                                                                display: inline-block;
                                                                padding: 14px 30px;
                                                                color: #ffffff;
                                                                font-size: 14px;
                                                                font-weight: 700;
                                                                text-decoration: none;
                                                            ">
                                                            Go to Daily Brief &rarr;
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="
                                                margin: 20px 0 0;
                                                color: #64748b;
                                                font-size: 13px;
                                                line-height: 1.7;
                                            ">
                                                Sign in using your account credentials and start
                                                collaborating with your team.
                                            </p>

                                            <p style="
                                                margin: 20px 0 0;
                                                color: #94a3b8;
                                                font-size: 12px;
                                                line-height: 1.6;
                                            ">
                                                If you did not expect this account to be created,
                                                please contact your administrator.
                                            </p>

                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="
                                            padding: 22px 35px;
                                            background-color: #f8fafc;
                                            border-top: 1px solid #e2e8f0;
                                            text-align: center;
                                        ">
                                            <p style="
                                                margin: 0 0 6px;
                                                color: #64748b;
                                                font-size: 12px;
                                            ">
                                                This is an automated notification from Daily Brief.
                                            </p>
                                            <p style="
                                                margin: 0;
                                                color: #94a3b8;
                                                font-size: 11px;
                                            ">
                                                &copy; ${new Date().getFullYear()} Daily Brief. All rights reserved.
                                            </p>
                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>
                    </table>
                </body>
                </html>
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
        if (!owner.length) {
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