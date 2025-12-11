
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from root before importing firebase-admin
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('FIREBASE_PROJECT_ID present:', !!process.env.FIREBASE_PROJECT_ID);

async function main() {
    // Dynamic import to ensure env vars are loaded first
    const { adminDb } = await import('../src/lib/firebase-admin');

    console.log("Checking Firestore users...");
    try {
        const snapshot = await adminDb.collection('users').get();
        if (snapshot.empty) {
            console.log("No users found in Firestore 'users' collection.");
        } else {
            console.log(`Found ${snapshot.size} users:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- ID: ${doc.id}`);
                console.log(`  Email: ${data.email}`);
                console.log(`  Role: ${data.role}`);
                console.log(`  Password: ${data.password}`);
                console.log(`  IsActive: ${data.isActive}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

main();
