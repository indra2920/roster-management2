import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Testing Firebase Connection...');

        // Timeout promise
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection Timeout (5s)')), 5000)
        );

        // DB Read Promise
        const dbRead = (async () => {
            const snapshot = await adminDb.collection('users').limit(1).get();
            return snapshot.size;
        })();

        // Race them
        const result = await Promise.race([dbRead, timeout]);

        return NextResponse.json({
            status: 'success',
            message: 'Connected to Firebase!',
            userCount: result
        });
    } catch (error: any) {
        console.error('Firebase Test Error:', error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
