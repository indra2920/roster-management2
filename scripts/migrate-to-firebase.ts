import { PrismaClient } from '@prisma/client';
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load .env manually to avoid dependency
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, ''); // Remove quotes
            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// Initialize Firebase Admin
const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
    if (serviceAccount.projectId) {
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        console.error("Missing FIREBASE_PROJECT_ID");
    }
}

const adminDb = getFirestore();
const prisma = new PrismaClient();

async function migrateCollection(name: string, data: any[]) {
    console.log(`Migrating ${data.length} records to ${name}...`);
    const batchSize = 500;
    const chunks = [];

    for (let i = 0; i < data.length; i += batchSize) {
        chunks.push(data.slice(i, i + batchSize));
    }

    let count = 0;
    for (const chunk of chunks) {
        const batch = adminDb.batch();
        for (const item of chunk) {
            const docRef = adminDb.collection(name).doc(item.id);
            // Convert Dates to Firestore Timestamps or Strings? 
            // Firestore Admin SDK handles JS Dates, but let's be safe and copy generic simple objects
            // We need to ensure undefined values are not passed (Firestore doesn't like them)
            const cleanItem = JSON.parse(JSON.stringify(item));

            // Fix Dates that turned into strings via stringify
            for (const key in item) {
                if (item[key] instanceof Date) {
                    cleanItem[key] = item[key]; // Put back the Date object
                }
            }

            batch.set(docRef, cleanItem);
        }
        await batch.commit();
        count += chunk.length;
        console.log(`Written ${count} / ${data.length} to ${name}`);
    }
}

async function main() {
    console.log('Starting migration...');

    if (!process.env.FIREBASE_PROJECT_ID) {
        // It might be set now due to manual loading, check again
        console.error('ERROR: FIREBASE_PROJECT_ID is not set in .env');
        if (!process.env.FIREBASE_PROJECT_ID) process.exit(1);
    }

    try {
        // 1. Settings
        const settings = await prisma.setting.findMany();
        await migrateCollection('settings', settings);

        // 2. Master Data: Regions, Locations, Positions
        const regions = await prisma.region.findMany();
        await migrateCollection('regions', regions);

        const locations = await prisma.location.findMany();
        await migrateCollection('locations', locations);

        const positions = await prisma.position.findMany();
        await migrateCollection('positions', positions);

        // 3. Users
        const users = await prisma.user.findMany();
        await migrateCollection('users', users);

        // 4. Requests & Approvals & Delegations
        const requests = await prisma.request.findMany();
        await migrateCollection('requests', requests);

        const approvals = await prisma.approval.findMany();
        await migrateCollection('approvals', approvals);

        const delegations = await prisma.delegation.findMany();
        await migrateCollection('delegations', delegations);

        // 5. Notifications
        const notifications = await prisma.notification.findMany();
        await migrateCollection('notifications', notifications);

        console.log('Migration completed successfully!');

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
