
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function main() {
    try {
        console.log("Initializing Firebase Admin (Verifying ENV)...");

        if (!getApps().length) {
            let key = process.env.FIREBASE_PRIVATE_KEY || "";
            if (key) {
                if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
                    try {
                        key = Buffer.from(key, 'base64').toString('utf-8');
                    } catch (e) {
                        console.log("Base64 decode failed, using raw");
                    }
                }
                if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
                key = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

                const serviceAccount = {
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: key,
                };
                initializeApp({ credential: cert(serviceAccount) });
            } else {
                console.log("Key missing in .env");
                return;
            }
        }

        const adminDb = getFirestore();

        console.log("\n--- Integrity Check ---");

        // 1. Check Users
        const usersSnap = await adminDb.collection('users').get();
        console.log(`Users: ${usersSnap.size}`);

        let usersWithPosition = 0;
        let usersWithLocation = 0;

        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.positionId) usersWithPosition++;
            if (data.locationId) usersWithLocation++;
        });

        console.log(`- With Position: ${usersWithPosition}/${usersSnap.size}`);
        console.log(`- With Location: ${usersWithLocation}/${usersSnap.size}`);

        if (usersWithPosition < usersSnap.size) {
            console.warn("⚠️ Some users are missing positionId!");
        }

        // 2. Check Requests
        const requestsSnap = await adminDb.collection('requests').get();
        console.log(`Requests: ${requestsSnap.size}`);

        let requestsOrphaned = 0;
        const userIds = new Set(usersSnap.docs.map(d => d.id));

        requestsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (!userIds.has(data.userId)) {
                requestsOrphaned++;
            }
        });

        if (requestsOrphaned > 0) {
            console.warn(`⚠️ Found ${requestsOrphaned} requests with unknown userId!`);
        } else {
            console.log("✅ All requests Linked to valid Users.");
        }

        // 3. Check Positions
        const posSnap = await adminDb.collection('positions').get();
        console.log(`Positions: ${posSnap.size}`);

        console.log("\nCheck Complete.");

    } catch (error) {
        console.error("❌ Error checking DB:", error);
    }
}

main();
