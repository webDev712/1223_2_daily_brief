import { NextResponse } from "next/server";
import { isAuthorized } from "../sync-ppoh/route";
import sql from "@/lib/db";

type PendingHandoff = {
    id: number;
    from_name: string;
    to_name: string;
    reason: string | null;
    date: string;
    notes: string | null;
    company_id: string;
    from_user_id: string;
    to_user_id: string;
    department_id: string;
    department_name: string;
    main_admin_id: string;
};

async function checkHandoffPending(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) 
        return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
    if (!isAuthorized(request, secret)) 
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const pendingHandoffs = await sql`
        UPDATE handoff h
        SET overdue_notified_at = NOW()
        WHERE h.id IN (
            SELECT h2.id
            FROM handoff h2
            WHERE h2.status = 'pending'
                AND h2.requested_at IS NOT NULL
                AND h2.requested_at < NOW() - INTERVAL '30 minutes'
                AND h2.requested_at > NOW() - INTERVAL '24 hours'
                AND h2.overdue_notified_at IS NULL
            FOR UPDATE SKIP LOCKED
        )
        RETURNING
            h.id,
            h.from_name,
            h.to_name,
            h.reason,
            h.date,
            h.notes,
            h.company_id,
            h.from_user_id,
            h.to_user_id,
            h.requested_at;
    `;

    let messagesSent = 0;

    await Promise.all(
        pendingHandoffs.map(async (handoff: PendingHandoff) => {

            const [details] = await sql`
                SELECT
                    u.department_id,
                    d.name AS department_name,
                    c.main_admin_id
                FROM website_user u
                JOIN department d ON d.id = u.department_id
                JOIN company c ON c.id = u.company_id
                WHERE u.id = ${handoff.to_user_id}
                    AND u.company_id = ${handoff.company_id};
            `;

            if (!details) {
                console.log("No details found for handoff:", handoff.id);
                return;
            }
            const recipients = await sql`
                SELECT DISTINCT u.id
                FROM website_user u
                WHERE u.company_id = ${handoff.company_id}
                    AND (
                        u.id IN (
                            ${handoff.from_user_id},
                            ${handoff.to_user_id},
                            ${details.main_admin_id}
                        )
                        OR (
                            u.user_role = 'manager'
                            AND u.department_id = ${details.department_id}
                        )
                        OR (
                            u.user_role = 'Manager'
                            AND u.department_id = ${details.department_id}
                        )

                    )
            `;

            const message = `
                Handoff request was not accepted.

                From: ${handoff.from_name} /
                To: ${handoff.to_name} /
                Department: ${details.department_name} / 
                Reason: ${handoff.reason || "Not specified"}.

                The handoff request has been pending for more than 30 minutes.

                Please review the request and take appropriate action.
            `.trim();

            await Promise.all(
                recipients.map(async (recipient: { id: string }) => {
                    if (recipient.id === handoff.from_user_id) return;

                    await sql`
                        INSERT INTO chat (
                            text,
                            from_user,
                            to_user,
                            timestamp,
                            read,
                            company_id
                        )
                        VALUES (
                            ${message},
                            ${handoff.from_user_id},
                            ${recipient.id},
                            NOW(),
                            FALSE,
                            ${handoff.company_id}
                        );
                    `;

                    messagesSent++;
                })
            );
        })
    );

    return NextResponse.json({
        ok: true,
        pendingHandoffsOverdue: pendingHandoffs.length,
        messagesSent
    });
}

export async function GET(request: Request) {
    return checkHandoffPending(request);
}