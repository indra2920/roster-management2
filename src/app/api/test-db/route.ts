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

                return {
                    result: isMatch ? 'MATCH' : 'MISMATCH',
                    inputEmail: checkEmail,
                    inputPasswordLength: checkPassword.length,
                    dbPasswordLength: user.password ? user.password.length : 0,
                    dbPassword: user.password, // Still keep for debug
                    comparison: `'${checkPassword}' === '${user.password}'`
                };
            }

            // Default behavior
            const snapshot = await adminDb.collection('users').limit(5).get();
            return {
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
