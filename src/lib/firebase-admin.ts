import { initializeApp, getApps, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    // 1. Priority: Manual Env Vars (Vercel / Production)
    if (process.env.FIREBASE_PRIVATE_KEY) {
        try {
            // Sanitize Private Key:
            // 1. Remove surrounding quotes if present (common copy-paste error)
            let key = process.env.FIREBASE_PRIVATE_KEY;
            if (key.startsWith('"') && key.endsWith('"')) {
                key = key.slice(1, -1);
            }
            // 2. Replace escaped newlines with actual newlines
            const privateKey = key.replace(/\\n/g, '\n');

            const serviceAccount: ServiceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
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
