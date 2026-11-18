import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
    const results: any = {};

    // Test 1: DNS
    try {
        results.dns = await Promise.race([
            dns.lookup('smtp.gmail.com'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('DNS timeout')), 5000)
            )
        ]);
    } catch (e: any) {
        results.dnsError = e.message;
    }

    // Test 2: TCP 465
    results.port465 = await testPort(465);

    // Test 3: TCP 587
    results.port587 = await testPort(587);

    return NextResponse.json(results);
}

function testPort(port: number): Promise<any> {
    return new Promise(resolve => {
        const socket = net.createConnection({
            host: 'smtp.gmail.com',
            port,
            timeout: 7000
        });

        socket.on('connect', () => {
            socket.destroy();
            resolve({ success: true });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ success: false, error: 'Timeout' });
        });

        socket.on('error', error => {
            resolve({
                success: false,
                code: (error as any).code,
                message: error.message
            });
        });
    });
}