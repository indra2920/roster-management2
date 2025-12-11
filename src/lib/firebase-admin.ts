import { initializeApp, getApps, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    // 1. Priority: Manual Env Vars (Vercel / Production)
    if (process.env.FIREBASE_PRIVATE_KEY) {
        try {
            const serviceAccount: ServiceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace \n with actual newlines if stored as string literal
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };

            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('Firebase Admin Initialized with Private Key');
        } catch (error) {
            console.error('Firebase Admin Init Error (Env):', error);
        }
    }
    // 2. Fallback: GOOGLE_APPLICATION_CREDENTIALS (Local / Dev)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
            console.log('Firebase Admin Initialized with Application Default Credentials');
        } catch (error) {
            console.error('Firebase Admin Init Error (File):', error);
        }
    }
}

export const adminDb = getFirestore();
