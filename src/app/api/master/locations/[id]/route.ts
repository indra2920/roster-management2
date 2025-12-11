import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { name, address, regionId } = body

        const locationsRef = adminDb.collection('locations');
        const docRef = locationsRef.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Uniqueness check
        const existingNameSnapshot = await locationsRef.where('name', '==', name).limit(2).get();
        let duplicate = false;
        existingNameSnapshot.forEach(d => {
            if (d.id !== id) duplicate = true;
        });

        if (duplicate) {
            return NextResponse.json({ error: 'Location name already exists' }, { status: 400 })
        }

        const updatedData = {
            name,
            address,
            regionId: regionId || null,
            updatedAt: new Date()
        };

        await docRef.update(updatedData);

        return NextResponse.json({ id, ...updatedData })
    } catch (error) {
        console.error("Error updating location:", error);
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        // Check if used by User
        const usersRef = adminDb.collection('users');
        const userSnapshot = await usersRef.where('locationId', '==', id).limit(1).get();

        if (!userSnapshot.empty) {
            return NextResponse.json({ error: `Cannot delete: Location is assigned to employees` }, { status: 400 })
        }

        await adminDb.collection('locations').doc(id).delete();

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting location:", error);
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
