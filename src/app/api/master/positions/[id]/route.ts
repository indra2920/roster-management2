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
        const { name, description } = body

        const positionsRef = adminDb.collection('positions');
        const docRef = positionsRef.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 })
        }

        // Check if name exists in OTHER docs
        // Note: Firestore doesn't support NOT EQUAL in the same query easily with other filters sometimes, 
        // but here we just want where name == newName AND id != currentId.
        // It's easier to just query name == newName, loop results, if any has id != currentId, fail.
        const existingNameSnapshot = await positionsRef.where('name', '==', name).limit(2).get();

        let duplicate = false;
        existingNameSnapshot.forEach(d => {
            if (d.id !== id) duplicate = true;
        });

        if (duplicate) {
            return NextResponse.json({ error: 'Position name already exists' }, { status: 400 })
        }

        const updatedData = {
            name,
            description: description || null,
            updatedAt: new Date()
        };

        await docRef.update(updatedData);

        return NextResponse.json({ id, ...updatedData })
    } catch (error: any) {
        console.error('Error updating position:', error)
        return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        // Check if position is used by any user
        const usersRef = adminDb.collection('users');
        const userSnapshot = await usersRef.where('positionId', '==', id).limit(1).get();

        if (!userSnapshot.empty) {
            // We can even Count if we want, but > 0 is enough
            return NextResponse.json({ error: `Cannot delete: Position is assigned to employees` }, { status: 400 })
        }

        await adminDb.collection('positions').doc(id).delete();

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting position:', error)
        return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
    }
}
