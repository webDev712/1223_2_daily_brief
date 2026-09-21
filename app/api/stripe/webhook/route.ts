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
        case 'checkout.session.completed':
            console.log('Checkout completed');
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