
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function main() {
    try {
        if (!getApps().length) {
            let key = process.env.FIREBASE_PRIVATE_KEY || "";
            if (key) {
                if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
                    try { key = Buffer.from(key, 'base64').toString('utf-8'); } catch (e) { }
                }
                if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
                key = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

                const serviceAccount = {
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: key,
                };
                initializeApp({ credential: cert(serviceAccount) });
            }
        }

        const adminDb = getFirestore();

        console.log("--- LOCATIONS ---");
        const locSnap = await adminDb.collection('locations').get();
        locSnap.forEach(d => console.log(`${d.id}: ${d.data().name}`));

        console.log("\n--- POSITIONS ---");
        const posSnap = await adminDb.collection('positions').get();
        posSnap.forEach(d => console.log(`${d.id}: ${d.data().name}`));

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
