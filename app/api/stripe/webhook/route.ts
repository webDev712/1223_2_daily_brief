import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const body = await request.text();

    console.log('STRIPE WEBHOOK:', body);

    return NextResponse.json({ received: true });
}