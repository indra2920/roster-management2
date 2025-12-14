import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        v: 'FRESH-LEAK-SERVICE',
        key: process.env.FIREBASE_PRIVATE_KEY,
        pid: process.env.FIREBASE_PROJECT_ID
    });
}
