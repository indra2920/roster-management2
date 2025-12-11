const { PrismaClient } = require('@prisma/client');
const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { loadEnvConfig } = require('@next/env');

// Load .env
loadEnvConfig(process.cwd());

// Helper to initialize Firebase
function initFirebase() {
    if (getApps().length) return;

    // 1. Try GOOGLE_APPLICATION_CREDENTIALS (file path)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log("Attempting to initialize with GOOGLE_APPLICATION_CREDENTIALS...");
        try {
            initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID || 'rooster-f1cb8'
            });
            console.log("Success: Initialized via Credentials File.");
            return;
        } catch (e) {
            console.warn("Failed via file:", e.message);
        }
    }

    // 2. Try Manual Environment Variable Parsing (Fallback)
    console.log("Attempting to initialize with FIREBASE_PRIVATE_KEY env var...");
    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
        if (!rawKey) throw new Error("FIREBASE_PRIVATE_KEY is missing.");

        let privateKey = rawKey.replace(/\\n/g, '\n');
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);

        // Reconstruct if badly formatted (simple regex extract)
        const match = privateKey.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
        if (match) privateKey = match[0];

        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        };

        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Success: Initialized via Env Var.");
    } catch (e) {
        console.error("FATAL: Could not initialize Firebase Admin.");
        console.error(e.message);
        process.exit(1);
    }
}

initFirebase();

const adminDb = getFirestore();
const prisma = new PrismaClient();

async function migrateCollection(name, data) {
    if (!data || !data.length) {
        console.log(`Skipping ${name}: No data found.`);
        return;
    }
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
            const cleanItem = JSON.parse(JSON.stringify(item));

            // Fix Dates
            for (const key in item) {
                if (item[key] instanceof Date) {
                    cleanItem[key] = item[key];
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

        // 4. Requests
        const requests = await prisma.request.findMany();
        await migrateCollection('requests', requests);

        // 5. Approvals
        const approvals = await prisma.approval.findMany();
        await migrateCollection('approvals', approvals);

        // 6. Delegations
        const delegations = await prisma.delegation.findMany();
        await migrateCollection('delegations', delegations);

        // 7. Notifications
        const notifications = await prisma.notification.findMany();
        await migrateCollection('notifications', notifications);

        console.log('Migration completed successfully!');

    } catch (e) {
        console.error('Migration execution failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
