import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: Date.now(),
        env_check: process.env.NODE_ENV
    });
}
