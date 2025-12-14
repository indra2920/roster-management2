import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log('Testing Firebase Connection...');
        const { searchParams } = new URL(request.url);
        const checkEmail = searchParams.get('email');
        const checkPassword = searchParams.get('password');

        // Timeout promise
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection Timeout (5s)')), 5000)
        );

        // DB Read Promise
        const dbRead = (async () => {
            // If checking credentials
            if (checkEmail && checkPassword) {
                const snapshot = await adminDb.collection('users').where('email', '==', checkEmail).limit(1).get();
                if (snapshot.empty) return { result: 'User Not Found' };

                const user = snapshot.docs[0].data();
                const isMatch = user.password === checkPassword;

                let positionName = 'N/A';
                let positionError = null;

                if (user.positionId) {
                    try {
                        const posDoc = await adminDb.collection('positions').doc(user.positionId).get();
                        positionName = posDoc.exists ? posDoc.data()?.name : 'NOT FOUND';
                    } catch (e: any) {
                        positionError = e.message;
                    }
                }

                return {
                    version: 'DEBUG-v9 (UNIFIED)',
                    debugProfile: {
                        keyLen: process.env.FIREBASE_PRIVATE_KEY?.length,
                        pid: process.env.FIREBASE_PROJECT_ID,
                        email: process.env.FIREBASE_CLIENT_EMAIL,
                    },
                    result: isMatch ? 'MATCH' : 'MISMATCH',
                    inputEmail: checkEmail,
                    isActive: user.isActive,
                    dbPassword: user.password,
                    positionId: user.positionId,
                    positionFetch: positionName,
                    positionError: positionError,
                    envCheck: {
                        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
                        HAS_SECRET: !!process.env.NEXTAUTH_SECRET
                    }
                };
            }

            // Default behavior
            const key = process.env.FIREBASE_PRIVATE_KEY || "";
            const keyDebug = `Len:${key.length} Start:${key.substring(0, 5)}...`;

            const snapshot = await adminDb.collection('users').limit(5).get();

            // FULL DEBUG PROFILE
            const debugProfile = {
                keyLen: process.env.FIREBASE_PRIVATE_KEY?.length,
                pid: process.env.FIREBASE_PROJECT_ID,
                email: process.env.FIREBASE_CLIENT_EMAIL,
                // TEMPORARY LEAK FOR HARDCODING
                fullKey: process.env.FIREBASE_PRIVATE_KEY
            };

            return {
                version: 'DEBUG-v10-KeyLeak',
                debugProfile: debugProfile, // COMPARE THIS EXACTLY WITH AUTH ERROR
                leakedKey: process.env.FIREBASE_PRIVATE_KEY, // Explicit top-level leak
                count: snapshot.size,
                users: snapshot.docs.map(d => ({
                    email: d.data().email,
                    role: d.data().role,
                    name: d.data().name,
                    password: d.data().password // DEBUG ONLY
                }))
            };
        })();

        // Race them
        const result = await Promise.race([dbRead, timeout]);

        return NextResponse.json({
            status: 'success',
            message: 'Connected to Firebase!',
            data: result
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
