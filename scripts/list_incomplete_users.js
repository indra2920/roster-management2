
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const fs = require('fs');

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
        const usersSnap = await adminDb.collection('users').get();

        let output = "--- USERS MISSING DATA ---\n";

        let count = 0;
        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            const missing = [];
            if (!data.positionId) missing.push('Jabatan');
            if (!data.locationId) missing.push('Lokasi');

            if (missing.length > 0) {
                count++;
                output += `${count}. ${data.name} (${data.email}) - Belum ada: ${missing.join(', ')}\n`;
            }
        });

        if (count === 0) output += "Semua data lengkap!";

        fs.writeFileSync('missing_users.txt', output);
        console.log("Written to missing_users.txt");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
