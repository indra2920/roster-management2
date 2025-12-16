import { initializeApp, getApps, cert, ServiceAccount, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// import { env } from '@/lib/env'; // REMOVED to prevent Zod crash

// Lazy initialization function
// Lazy initialization function
export const getAdminDb = () => {
    const APP_NAME = 'ROSTER_FIXED_APP';

    // Check if app already exists
    const existingApp = getApps().find(app => app.name === APP_NAME);
    if (existingApp) {
        return getFirestore(existingApp);
    }

    // Use process.env directly to avoid Zod validation crashes
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    console.log("[FirebaseAdmin] Init Start. Project:", projectId, "Email:", clientEmail, "KeyLen:", rawKey ? rawKey.length : 0);

    if (rawKey) {
        try {
            // Sanitize Private Key:
            let key = rawKey || "";

            // Handle Base64 encoded key
            if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
                try {
                    key = Buffer.from(key, 'base64').toString('utf-8');
                    console.log("[FirebaseAdmin] Key possibly Base64 decoded. New Len:", key.length);
                } catch (e) {
                    console.warn("Failed to decode Base64 private key, falling back to raw value");
                }
            }

            // Cleanup
            if (key.startsWith('"') && key.endsWith('"')) {
                key = key.slice(1, -1);
            }
            const privateKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

            const serviceAccount: ServiceAccount = {
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey,
            };

            const app = initializeApp({
                credential: cert(serviceAccount),
            }, APP_NAME);

            console.log('Firebase Admin Initialized (Named App) with Process.Env');
            return getFirestore(app);
        } catch (error) {
            console.error('Firebase Admin Init Error (Env):', error);
            throw error;
        }
    }

    console.error("No FIREBASE_PRIVATE_KEY found in process.env.");
    throw new Error("Missing FIREBASE_PRIVATE_KEY");
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

