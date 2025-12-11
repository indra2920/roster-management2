import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const settingsRef = adminDb.collection('settings');
        const snapshot = await settingsRef.get();
        const settings = snapshot.docs.map(doc => doc.data());

        const settingsObj = settings.reduce((acc: any, setting: any) => {
            acc[setting.key] = {
                value: setting.value,
                description: setting.description
            }
            return acc
        }, {})

        return NextResponse.json(settingsObj)
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { settings } = body // { key: value }

        const batch = adminDb.batch();
        const settingsRef = adminDb.collection('settings');

        // We need to upsert.
        // Since we don't know IDs, we query by key?
        // Best practice: Use 'key' as Document ID for settings!
        // But migration might have used auto-IDs or CUIDs?
        // Let's check migration.
        // Migration: `migrateCollection('Setting', 'settings')`.
        // Prisma `Setting`: `id String @id`, `key String @unique`.
        // So docs have IDs. But key is unique.
        // To query by key efficiently we need index.
        // Or we can just read all settings, find matches, and update.
        // Settings are small (MAX_ONSITE, MAX_OFFSITE).

        const allSettingsSnap = await settingsRef.get();
        const existingSettingsMap = new Map();
        allSettingsSnap.docs.forEach(d => existingSettingsMap.set(d.data().key, d.ref));

        for (const [key, value] of Object.entries(settings)) {
            if (existingSettingsMap.has(key)) {
                // Update
                batch.update(existingSettingsMap.get(key), { value: String(value) });
            } else {
                // Create
                const newRef = settingsRef.doc();
                // Emulate schema: id, key, value, description
                batch.set(newRef, {
                    id: newRef.id,
                    key,
                    value: String(value),
                    description: null, // Default
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        await batch.commit();

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
