
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const key = process.env.FIREBASE_PRIVATE_KEY || "";
    let dbStatus = "Not tested";
    let dbError = null;

    try {
        console.log("Attempting to connect to Firestore...");
        const db = getAdminDb();
        // Try a lightweight operation
        const collections = await db.listCollections();
        dbStatus = `Connected! Found ${collections.length} collections.`;
    } catch (e: any) {
        console.error("Firestore DB Error:", e);
        dbError = e.message;
        dbStatus = "Connection Failed";
    }

    return NextResponse.json({
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        KEY_STATUS: {
            exists: !!key,
            length: key.length,
            isBase64Like: !key.includes("-----BEGIN PRIVATE KEY-----"),
        },
        DB_TEST: {
            status: dbStatus,
            error: dbError
        }
    });
}
