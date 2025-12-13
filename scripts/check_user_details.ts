
import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function checkUser() {
    console.log("--- Checking User Details ---");

    if (!getApps().length) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined;

            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        } catch (e) {
            console.error("Firebase Init Failed", e);
            process.exit(1);
        }
    }

    const db = getFirestore();
    const email = "manager@example.com";

    try {
        const snapshot = await db.collection('users').where('email', '==', email).get();

        if (snapshot.empty) {
            console.log(`❌ User '${email}' NOT FOUND in database.`);
        } else {
            const user = snapshot.docs[0].data();
            console.log(`✅ User '${email}' FOUND:`);
            console.log(`   - ID: ${snapshot.docs[0].id}`);
            console.log(`   - Name: ${user.name}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - Is Active: ${user.isActive}`);
            console.log(`   - Password: ${user.password}`); // Showing this for debugging purposes only
            console.log(`   - Position ID: ${user.positionId || 'N/A'}`);
        }
    } catch (e) {
        console.error("Error querying database:", e);
    }
    process.exit(0);
}

checkUser();
