import { initializeApp, getApps, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '@/lib/env';

// Lazy initialization function
export const getAdminDb = () => {
    if (!getApps().length) {
        // 1. Priority: Manual Env Vars (Vercel / Production)
        // Accessing env.FIREBASE_PRIVATE_KEY triggers validation
        if (env.FIREBASE_PRIVATE_KEY) {
            try {
                // Sanitize Private Key:
                let key = env.FIREBASE_PRIVATE_KEY || "";

                // Handle Base64 encoded key (Safe for Vercel Env Vars)
                if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
                    try {
                        key = Buffer.from(key, 'base64').toString('utf-8');
                    } catch (e) {
                        console.warn("Failed to decode Base64 private key, falling back to raw value");
                    }
                }

                // 1. Remove surrounding quotes if present (common copy-paste error)
                if (key.startsWith('"') && key.endsWith('"')) {
                    key = key.slice(1, -1);
                }

                // 2. Aggressive cleanup:
                // - Replace escaped newlines with actual newlines
                // - Remove carriage returns (\r) which can break PEM parsing
                // - Trim leading/trailing whitespace
                const privateKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

                const serviceAccount: ServiceAccount = {
                    projectId: env.FIREBASE_PROJECT_ID,
                    clientEmail: env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                };

                initializeApp({
                    credential: cert(serviceAccount),
                });
                console.log('Firebase Admin Initialized with Private Key');
            } catch (error) {
                console.error('Firebase Admin Init Error (Env):', error);

                // Only throw in production to prevent build crashes in dev/build phase
                // unless we are sure we are at runtime
                // if (process.env.NODE_ENV === 'production') {
                //    throw error; 
                // }
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

    return getFirestore();
}

// Backwards compatibility for existing imports
// We use a Proxy to lazy-load the Firestore instance only when it's actually used.
// This prevents build-time initialization errors while supporting legacy code.
export const adminDb = new Proxy({} as FirebaseFirestore.Firestore, {
    get: function (target, prop, receiver) {
        // Initialize/Get the DB instance on first access of any property
        const db = getAdminDb();

        // Forward the access to the actual DB instance
        const value = Reflect.get(db, prop, receiver);

        // If the accessed property is a function (e.g., .collection()), bind it to the db instance
        if (typeof value === 'function') {
            return value.bind(db);
        }

        return value;
    }
});

