
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
    const stage: string[] = [];

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ''),
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
            logger: true,
            debug: true,
        });

        stage.push('Transporter created');

        await transporter.verify();
        stage.push('SMTP authentication successful');

        const info = await transporter.sendMail({
            from: `"Daily Brief" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            subject: 'Daily Brief - SMTP diagnostic test',
            text: 'SMTP test from Vercel Preview',
        });

        stage.push('Email accepted by SMTP server');

        return NextResponse.json({
            success: true,
            stage,
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
        });

    } catch (error: any) {
        console.error('[SMTP TEST ERROR]', {
            name: error.name,
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            stack: error.stack,
        });

        return NextResponse.json({
            success: false,
            stage,
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode,
            },
        }, { status: 500 });
    }
}
