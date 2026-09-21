import sql from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error) {
        console.error('Stripe webhook signature verification failed:', error);

        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
        );
    }

    console.log('Stripe event:', event.type);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;

            const companyName = session.metadata?.company_name;
            const adminEmail = session.metadata?.admin_email;
            const adminName = session.metadata?.admin_name;
            const planId = session.metadata?.plan_id;
            const stripeCustomerId =
                typeof session.customer === 'string'
                    ? session.customer
                    : session.customer?.id ?? null;
            const stripeSubscriptionId =
                typeof session.subscription === 'string'
                    ? session.subscription
                    : session.subscription?.id ?? null;

            if (!companyName || !adminEmail || !adminName || !planId) {
                console.error('Missing checkout metadata');
                break;
            }

            // 1. найти пользователя по email
            // 2. создать company
            // 3. создать billing
            const department = await sql`
                SELECT id 
                FROM department
                LIMIT 1;
            `
            const company = await sql`
                INSERT INTO company (name, plan_id, stripe_customer_id, created_at)
                VALUES (${companyName}, ${planId}, ${stripeCustomerId}, NOW())
                RETURNING id;
            `
            const role = await sql`
                INSERT INTO role (name, company_id, permissions)
                VALUES ('Manager', ${company[0].id}, 
                    '{"see_brief": true, "update_brief": true, "handoff_brief": true, "see_all_briefs": true, "see_dashboard": true, "see_briefs_history": true, "see_reports_page": true, "edit_reports": true, "see_team_roles": true, "archive_give_access_users": true, "add_users": true, "add_roles": true, "see_profile_settings": true, "edit_profile_settings": true, "see_app_settings": true, "edit_app_settings": true, "see_production_dashboard": true, "send_messages_to_all": true, "see_other_employees_messages": true, "see_action_tracker": true, "edit_action_tracker": true, "add_actions_to_io": true }'::jsonb
                )
                RETURNING id;
            `
            const admin = await sql`
                INSERT INTO website_user (
                    email,
                    name,
                    role_id,
                    user_role,
                    archived,
                    department_id)
                VALUES (
                    ${adminEmail},
                    ${adminName},
                    ${role[0].id},
                    'Manager',
                    FALSE,
                    ${department[0].id}
                )
                RETURNING id;
            `
            await sql`
                UPDATE company
                SET main_admin_id = ${admin[0].id}
                WHERE id = ${company[0].id};
            `

            const plan = await sql`
                SELECT stripe_price_id
                FROM plan
                WHERE id = ${planId}
                LIMIT 1;
            `;


            await sql`
                INSERT INTO billing (
                    company_id,
                    plan_id,
                    date_from,
                    date_to,
                    stripe_subscription_id,
                    stripe_price_id,
                    stripe_checkout_session_id
                )
                VALUES (
                    ${company[0].id},
                    ${planId},
                    CURRENT_DATE,
                    CURRENT_DATE + INTERVAL '1 month',
                    ${stripeSubscriptionId},
                    ${plan[0].stripe_price_id},
                    ${session.id}
                );
            `;
            // 4. сохранить Stripe customer/subscription
        }
        break;

        case 'invoice.paid':
            console.log('Invoice paid');
            break;

        case 'invoice.payment_failed':
            console.log('Invoice payment failed');
            break;

        case 'customer.subscription.updated':
            console.log('Subscription updated');
            break;

        case 'customer.subscription.deleted':
            console.log('Subscription deleted');
            break;
    }

    return NextResponse.json({ received: true });
}