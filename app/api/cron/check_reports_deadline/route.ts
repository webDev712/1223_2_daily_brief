import { NextResponse } from "next/server";
import { isAuthorized } from "../sync-ppoh/route";
import sql from "@/lib/db";
import { sendEmail } from "../../email/route";
import { format } from "date-fns";

type ReportDeadlineCheck = {
    timezone: string;
    check_before: string;
    name: string;
    holder_name: string;
    email: string;
    department_id: string;
    date: string;
}

async function checkReportsDeadline (request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) 
        return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
    if (!isAuthorized(request, secret)) 
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    
    const savedReport = await sql`
        SELECT c.timezone, sr.check_before, sr.name, u.name AS holder_name, u.email, u.department_id, sr.date
        FROM saved_report sr, company c, website_user u
        WHERE sr.date = (NOW() AT TIME ZONE c.timezone)::date
            AND sr.check_before is not NULL
            AND sr.checked <> TRUE
            AND c.id = sr.company_id
            AND sr.holder_id = u.id
            AND (
                (sr.date + TO_TIMESTAMP(sr.check_before, 'HH12 AM')::time)
                - (NOW() AT TIME ZONE c.timezone)
            ) BETWEEN INTERVAL '0 minutes' AND INTERVAL '60 minutes';
        `;
    await Promise.all(
        savedReport.map((report: ReportDeadlineCheck) => {
            sendEmail(
                `Upcoming report deadline: ${report.name}`,
                `
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
                                                color: #d97706;
                                                font-size: 13px;
                                                font-weight: 700;
                                                text-transform: uppercase;
                                                letter-spacing: 1px;
                                            ">
                                                Upcoming deadline
                                            </p>

                                            <h2 style="
                                                margin: 0 0 18px;
                                                color: #0f172a;
                                                font-size: 25px;
                                                line-height: 1.3;
                                            ">
                                                Hi, ${report.holder_name}!
                                            </h2>

                                            <p style="
                                                margin: 0 0 25px;
                                                color: #475569;
                                                font-size: 15px;
                                                line-height: 1.7;
                                            ">
                                                This is a friendly reminder that the deadline
                                                for your report is approaching. Please make sure
                                                to complete and submit it on time.
                                            </p>

                                            <!-- Report Card -->
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="
                                                    background-color: #fffbeb;
                                                    border-left: 4px solid #f59e0b;
                                                    border-radius: 6px;
                                                ">
                                                <tr>
                                                    <td style="padding: 20px 22px;">

                                                        <p style="
                                                            margin: 0 0 10px;
                                                            color: #92400e;
                                                            font-size: 12px;
                                                            font-weight: 700;
                                                            text-transform: uppercase;
                                                            letter-spacing: 0.8px;
                                                        ">
                                                            Report deadline reminder
                                                        </p>

                                                        <p style="
                                                            margin: 0 0 15px;
                                                            color: #0f172a;
                                                            font-size: 18px;
                                                            font-weight: 700;
                                                            line-height: 1.4;
                                                        ">
                                                            ${report.name}
                                                        </p>

                                                        <p style="
                                                            margin: 0;
                                                            color: #92400e;
                                                            font-size: 14px;
                                                            line-height: 1.7;
                                                        ">
                                                            <strong>Deadline:</strong> ${report.check_before}
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
                                                        <a href="https://dytabrief.com/daily-brief?date=${format(new Date(report.date), 'dd-MM-yyyy')}&department_id=${report.department_id}"
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
                                                Please log in to your account and submit
                                                your report before the deadline.
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
                report.email
            );
        })
    );
    return NextResponse.json(JSON.stringify(savedReport));
}


export async function GET(request: Request) {
    return checkReportsDeadline(request)
}