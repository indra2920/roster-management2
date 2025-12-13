
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

        // Users to delete (Logic: All incomplete users EXCEPT the kept ones)
        // Original list of incomplete:
        // 1. Tomi (tes@example.com)
        // 2. Test User (test@example.com)
        // 3. Admin User (admin@example.com) - KEEP
        // 4. Manager User (manager@example.com) - KEEP
        // 5. Employee User (employee@example.com) - KEEP
        // 6. Manager Test (manager_test@example.com)

        const emailsToDelete = [
            'tes@example.com',
            'test@example.com',
            'manager_test@example.com'
        ];

        console.log(`Deleting ${emailsToDelete.length} users...`);

        // Batch delete
        const batch = adminDb.batch();
        let deletedCount = 0;

        const usersRef = adminDb.collection('users');
        const snapshot = await usersRef.where('email', 'in', emailsToDelete).get();

        snapshot.docs.forEach((doc) => {
            console.log(`- Deleting: ${doc.data().name} (${doc.data().email})`);
            batch.delete(doc.ref);
            deletedCount++;
        });

        if (deletedCount > 0) {
            await batch.commit();
            console.log("✅ Cleanup successful.");
        } else {
            console.log("⚠️ No matching users found to delete.");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
