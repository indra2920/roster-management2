
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

        // 1. Create/Ensure Location 'Jakarta'
        const jakartaRef = adminDb.collection('locations').doc('loc-jakarta');
        const jakartaDoc = await jakartaRef.get();
        if (!jakartaDoc.exists) {
            console.log("Creating Location: Jakarta");
            await jakartaRef.set({
                id: 'loc-jakarta',
                name: 'Jakarta',
                address: 'Jakarta',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } else {
            console.log("Location 'Jakarta' already exists.");
        }

        // 2. Update Admin User
        const adminSnap = await adminDb.collection('users').where('email', '==', 'admin@example.com').get();
        if (!adminSnap.empty) {
            const adminDoc = adminSnap.docs[0];
            console.log("Updating Admin User...");
            await adminDoc.ref.update({
                locationId: 'loc-jakarta',
                positionId: 'pos-admin',
                updatedAt: new Date()
            });
        }

        // 3. Update Manager User
        const mgrSnap = await adminDb.collection('users').where('email', '==', 'manager@example.com').get();
        if (!mgrSnap.empty) {
            const mgrDoc = mgrSnap.docs[0];
            console.log("Updating Manager User...");
            await mgrDoc.ref.update({
                locationId: 'loc-jakarta',
                updatedAt: new Date()
            });
        }

        console.log("✅ Updates complete.");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
