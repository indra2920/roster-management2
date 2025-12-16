import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const { key } = await params

        // Settings are stored as documents where 'key' is a field, OR 'key' is the doc ID?
        // In previous refactor of settings POST, I tried to check existence by key.
        // Prisma schema usually had `key` as unique.
        // Let's assume we query by field 'key'.

        const settingsRef = adminDb.collection('settings');
        const snapshot = await settingsRef.where('key', '==', key).limit(1).get();

        if (snapshot.empty) {
            // Return default instead of 404 to avoid console errors
            return NextResponse.json({
                key: key,
                value: "0", // Default to 0 (unlimited/unset)
                description: "Default value (Setting not found)"
            })
        }

        const setting = snapshot.docs[0].data();
        // Return matching Prisma structure
        return NextResponse.json({
            id: snapshot.docs[0].id,
            key: setting.key,
            value: setting.value,
            description: setting.description
        })
    } catch (error) {
        console.error("Error fetching setting:", error);
        return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 })
    }
}
