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
            const planId = session.metadata?.plan_id;

            if (!companyName || !adminEmail || !planId) {
                console.error('Missing checkout metadata');
                break;
            }

            // 1. найти пользователя по email
            // 2. создать company
            // 3. создать billing
            // 4. сохранить Stripe customer/subscription
        }

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