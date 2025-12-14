import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Starting verify-fix...");
        const db = getAdminDb();
        console.log("DB instance retrieved");

        const start = Date.now();
        const snapshot = await db.collection('users').limit(1).get();
        console.log("Query successful");
        const duration = Date.now() - start;

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Connected using getAdminDb() with Named App',
            docs: snapshot.size,
            duration: duration
        });
    } catch (error: any) {
        console.error("Verify Fix Error:", error);
        return NextResponse.json({
            status: 'ERROR',
            message: error.message,
            stack: error.stack,
            code: error.code
        }, { status: 500 });
    }
}
