
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function main() {
    try {
        console.log("Initializing Firebase Admin (Temp Credentials)...");

        const credPath = path.resolve(process.cwd(), 'temp_credentials.json');
        if (!fs.existsSync(credPath)) {
            console.error("Credentials file missing!");
            return;
        }

        const serviceAccount = require(credPath);

        if (!getApps().length) {
            initializeApp({
                credential: cert(serviceAccount),
            });
        }

        const adminDb = getFirestore();
        const collections = ['users', 'requests', 'teachers', 'students', 'classes', 'levels', 'subjects', 'positions', 'locations', 'regions'];

        console.log("\n--- Database Audit Results ---");

        const results = {};

        for (const colName of collections) {
            try {
                const snapshot = await adminDb.collection(colName).count().get();
                const count = snapshot.data().count;
                console.log(`Collection: ${colName.padEnd(15)} | Count: ${count}`);
                results[colName] = count;
            } catch (e) {
                console.log(`Collection: ${colName.padEnd(15)} | Error: ${e.message}`);
                // Fallback for older SDKs
                const snap = await adminDb.collection(colName).get();
                console.log(`Collection: ${colName.padEnd(15)} | Count: ${snap.size} (via fetch)`);
            }
        }
        console.log("\n------------------------------");

    } catch (error) {
        console.error("❌ Error auditing DB:", error);
    }
}

main();
