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
        const { name } = body

        const regionsRef = adminDb.collection('regions');
        const docRef = regionsRef.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Region not found' }, { status: 404 })
        }

        // Uniqueness check
        const existingNameSnapshot = await regionsRef.where('name', '==', name).limit(2).get();
        let duplicate = false;
        existingNameSnapshot.forEach(d => {
            if (d.id !== id) duplicate = true;
        });

        if (duplicate) {
            return NextResponse.json({ error: 'Region name already exists' }, { status: 400 })
        }

        const updatedData = {
            name,
            updatedAt: new Date()
        };

        await docRef.update(updatedData);

        return NextResponse.json({ id, ...updatedData })
    } catch (error) {
        console.error("Error updating region:", error);
        return NextResponse.json({ error: 'Failed to update region' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        // Check if used by User (Users have regionId)
        const usersRef = adminDb.collection('users');
        const userSnapshot = await usersRef.where('regionId', '==', id).limit(1).get();

        if (!userSnapshot.empty) {
            return NextResponse.json({ error: 'Cannot delete: Region is assigned to employees' }, { status: 400 })
        }

        // Check if used by Locations (Locations have regionId)
        const locationsRef = adminDb.collection('locations');
        const locSnapshot = await locationsRef.where('regionId', '==', id).limit(1).get();

        if (!locSnapshot.empty) {
            return NextResponse.json({ error: 'Cannot delete: Region is assigned to locations' }, { status: 400 })
        }

        await adminDb.collection('regions').doc(id).delete();

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting region:", error);
        return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 })
    }
}
