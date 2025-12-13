
import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const LOG_FILE = 'scripts/diag.log';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function diagnose() {
    fs.writeFileSync(LOG_FILE, "--- Starting Diagnosis ---\n");
    log("Starting...");
    const startTime = Date.now();

    try {
        // 1. Initialize Firebase
        if (!getApps().length) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined;

            if (!privateKey) {
                log("❌ Stats: Missing FIREBASE_PRIVATE_KEY");
                process.exit(1);
            }

            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            log("✅ Firebase Initialized");
        }

        const db = getFirestore();

        // 2. Test Connection & Query Speed
        const queryStart = Date.now();
        log("Testing Firestore User Query...");

        const TestEmail = "manager@example.com";
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', TestEmail).limit(1).get();
        const queryTime = Date.now() - queryStart;

        log(`⏱️ Query Time: ${queryTime}ms`);

        if (snapshot.empty) {
            log("⚠️ User not found");
        } else {
            log("✅ User found!");
            const doc = snapshot.docs[0];
            const data = doc.data();

            // 3. Test Nested Query (Position)
            if (data.positionId) {
                log("Testing Position Query...");
                const posStart = Date.now();
                await db.collection('positions').doc(data.positionId).get();
                log(`⏱️ Position Query Time: ${Date.now() - posStart}ms`);
            }
        }

    } catch (e: any) {
        log(`❌ ERROR: ${e.message}`);
        console.error(e);
    }

    log(`--- Diagnosis Complete in ${Date.now() - startTime}ms ---`);
}

diagnose();
