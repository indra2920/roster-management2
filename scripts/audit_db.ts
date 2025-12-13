
import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function main() {
    try {
        console.log("Initializing Firebase Admin for Audit...");

        if (!getApps().length) {
            let key = process.env.FIREBASE_PRIVATE_KEY || "";
            // Handle Base64 encoded key (Safe for Vercel Env Vars)
            if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
                try {
                    key = Buffer.from(key, 'base64').toString('utf-8');
                } catch (e) {
                    console.warn("Failed to decode Base64 private key, falling back to raw value");
                }
            }

            if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
            const privateKey = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

            const serviceAccount: ServiceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            };

            initializeApp({
                credential: cert(serviceAccount),
            });
        }

        const adminDb = getFirestore();
        const collections = ['users', 'requests', 'teachers', 'students', 'classes', 'levels', 'subjects'];

        console.log("\n--- Database Audit Results ---");

        for (const colName of collections) {
            const snapshot = await adminDb.collection(colName).get();
            console.log(`\nCollection: ${colName}`);
            console.log(`Count: ${snapshot.size}`);

            if (!snapshot.empty) {
                const sampleDoc = snapshot.docs[0];
                const data = sampleDoc.data();
                console.log(`Sample Doc ID: ${sampleDoc.id}`);
                console.log(`Sample Keys: ${Object.keys(data).join(', ')}`);

                // Check specific fields for types
                if (data.createdAt) {
                    const type = data.createdAt.toDate ? 'Timestamp' : typeof data.createdAt;
                    console.log(`createdAt type: ${type} (${data.createdAt})`);
                }
            } else {
                console.log(" (Empty)");
            }
        }
        console.log("\n------------------------------");

    } catch (error) {
        console.error("❌ Error auditing DB:", error);
    }
}

main();
