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
            return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
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
