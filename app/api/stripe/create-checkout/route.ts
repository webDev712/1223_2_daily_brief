import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
    try {
        const {
            email,
            adminName,
            companyName,
            planId
        } = await request.json();

        if (!email || !adminName || !companyName || !planId) {
            return NextResponse.json(
                { error: 'Email, admin name, company name and plan are required' },
                { status: 400 }
            );
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',

            line_items: [
                {
                    price: 'price_1UHufoRt7b3WU1FstnsEaPSs',
                    quantity: 1,
                },
            ],

            success_url:
                'https://dailybrief-web.vercel.app/payment/success',

            cancel_url:
                'https://dailybrief-web.vercel.app/payment/cancel',

            customer_email: email,

            metadata: {
                company_name: companyName,
                admin_email: email,
                admin_name: adminName,
                plan_id: planId,
            },

            subscription_data: {
                metadata: {
                    company_name: companyName,
                    admin_email: email,
                    admin_name: adminName,
                    plan_id: planId,
                },
            },
        });

        return NextResponse.json({
            url: session.url,
        });

    } catch (error) {
        console.error('Stripe Checkout error:', error);

        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}