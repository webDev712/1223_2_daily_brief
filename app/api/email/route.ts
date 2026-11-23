import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { auth } from "@/auth";


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function sendEmail (subject: string, html: string, email: string) {
    try {
        await transporter.sendMail({
            from: `"Daily Brief" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `Daily Brief | ${subject}`,
            html: html
        });
        transporter.verify((error, success) => {
            if (error) {
                console.error("GMAIL SMTP ERROR:", error);
            } else {
                console.log("GMAIL SMTP READY:", success);
            }
        });
        console.log(`Email sent to ${email}`);
    }
    catch (error){
        console.log(error)
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
        const body = await request.json();

        const {
            from_user_name,
            to_user_email,
            to_user_name,
            message,
        } = body;

        try {
            sendEmail(`New message from ${from_user_name}`, `
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
                                            text-align: left;
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

                                            <p style="
                                                margin: 0 0 10px;
                                                color: #64748b;
                                                font-size: 13px;
                                                font-weight: 600;
                                                text-transform: uppercase;
                                                letter-spacing: 1px;
                                            ">
                                                New message
                                            </p>

                                            <h2 style="
                                                margin: 0 0 18px;
                                                color: #0f172a;
                                                font-size: 25px;
                                                line-height: 1.3;
                                            ">
                                                Hi, ${to_user_name}!
                                            </h2>

                                            <p style="
                                                margin: 0 0 25px;
                                                color: #475569;
                                                font-size: 15px;
                                                line-height: 1.7;
                                            ">
                                                You have received a new message from
                                                <strong style="color: #0f172a;">
                                                    ${from_user_name}
                                                </strong>
                                                in your Daily Brief account.
                                            </p>

                                            <!-- Message Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="
                                                    background-color: #f8fafc;
                                                    border-left: 4px solid #3b82f6;
                                                    border-radius: 6px;
                                                ">
                                                <tr>
                                                    <td style="padding: 20px 22px;">

                                                        <p style="
                                                            margin: 0 0 10px;
                                                            color: #64748b;
                                                            font-size: 12px;
                                                            font-weight: 700;
                                                            text-transform: uppercase;
                                                            letter-spacing: 0.8px;
                                                        ">
                                                            Message from ${from_user_name}
                                                        </p>

                                                        <p style="
                                                            margin: 0;
                                                            color: #334155;
                                                            font-size: 15px;
                                                            line-height: 1.7;
                                                            white-space: pre-wrap;
                                                            word-break: break-word;
                                                        ">${message}
                                                        </p>

                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- CTA -->
                                            <table cellpadding="0" cellspacing="0" border="0"
                                                style="margin: 30px 0 10px;">
                                                <tr>
                                                    <td align="center"
                                                        style="
                                                            background-color: #2563eb;
                                                            border-radius: 7px;
                                                        ">
                                                        <a href="https://dailybrief-web.vercel.app/landing"
                                                            style="
                                                                display: inline-block;
                                                                padding: 14px 28px;
                                                                color: #ffffff;
                                                                font-size: 14px;
                                                                font-weight: 700;
                                                                text-decoration: none;
                                                            ">
                                                            Open Daily Brief &rarr;
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="
                                                margin: 25px 0 0;
                                                color: #94a3b8;
                                                font-size: 13px;
                                                line-height: 1.6;
                                            ">
                                                Log in to your account to continue the conversation
                                                with your team.
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
            `,to_user_email);
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
        }

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}
