import { initializeApp, getApps, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    // 1. Try GOOGLE_APPLICATION_CREDENTIALS (implicit in applicationDefault)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        } catch (error) {
            console.error('Firebase Admin Init Error (File):', error);
        }
    } else {
        // 2. Try Manual Env Vars
        const serviceAccount: ServiceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        try {
            initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (error) {
            console.error('Firebase Admin Init Error (Env):', error);
        }
    }
}

export const adminDb = getFirestore();
