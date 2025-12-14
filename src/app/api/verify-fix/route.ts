import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = getAdminDb();
        const start = Date.now();
        const snapshot = await db.collection('users').limit(1).get();
        const duration = Date.now() - start;

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Connected using getAdminDb() with Named App',
            docs: snapshot.size,
            duration: duration
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'ERROR',
            message: error.message,
            code: error.code
        }, { status: 500 });
    }
}
