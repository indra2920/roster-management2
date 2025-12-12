
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function main() {
    try {
        console.log("Initializing Firebase Admin...");
        const { adminDb } = await import('../src/lib/firebase-admin');

        const DEFAULT_USER = {
            email: 'manager@example.com',
            password: 'password123',
            name: 'Manager Demo',
            role: 'manager',
            isActive: true,
            createdAt: new Date().toISOString()
        };

        console.log(`Checking for user: ${DEFAULT_USER.email}`);

        const usersRef = adminDb.collection('users');
        const snapshot = await usersRef.where('email', '==', DEFAULT_USER.email).limit(1).get();

        if (!snapshot.empty) {
            console.log("✅ User already exists. Skipping creation.");
            return;
        }

        console.log("Creating default user...");
        await usersRef.add(DEFAULT_USER);

        console.log("✅ User 'manager' created successfully!");
        console.log("---------------------------------------");
        console.log("Email:    " + DEFAULT_USER.email);
        console.log("Password: " + DEFAULT_USER.password);
        console.log("---------------------------------------");
        console.log("You can now login to your Vercel deployment.");

    } catch (error) {
        console.error("❌ Error seeding user:", error);
    }
}

main();
