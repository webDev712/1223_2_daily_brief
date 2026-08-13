import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function GET(request: Request) {
    try{
        await requireRole("lead");
        const { searchParams } = new URL(request.url);

        const id = searchParams.get("id");
        const rows = await sql`
            SELECT * FROM website_user WHERE id = ${id};
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
        await requireRole("manager");

        const body = await request.json();

        const {
            email,
            name,
            user_role,
            lead_letter,
            archived = false,
            phone = "+1 111 111 1111",
            department_id
        } = body;

        const rows = await sql`
            INSERT INTO website_user (
                email,
                name,
                role_id,
                lead_letter,
                archived,
                phone,
                department_id
            )
            VALUES (
                ${email},
                ${name},
                ${user_role},
                ${lead_letter},
                ${archived},
                ${phone},
                ${department_id}
            )
            RETURNING id;
        `;

        try {
            await transporter.sendMail({
                from: `"Helena's Cleaners" <${process.env.GMAIL_USER}>`,
                to: email,
                subject: "Your account has been created",
                html: `
                    <h2>Welcome, ${name}!</h2>
                    <p>Your account has been successfully created.</p>
                    <a href="https://dailybrief-web.vercel.app/login">dailybrief-web.vercel.app</a>
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



export async function PATCH(request: Request) {
    try{
        await requireRole("lead");
        const body = await request.json()

        const {
            id,
            email,
            name,
            lead_letter,
            archived,
            role_id
        } = body;

        await sql`
            UPDATE website_user
            SET email = ${email}, name = ${name}, lead_letter = ${lead_letter}, archived = ${archived}, role_id = ${role_id}
            WHERE id = ${id};
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