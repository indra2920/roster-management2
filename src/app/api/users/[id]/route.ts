import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DocumentData } from 'firebase-admin/firestore'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { name, email, role, positionId, locationId, regionId, managerId } = body

        // Check if user exists
        const userRef = adminDb.collection('users').doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check Unique Email if changed
        const currentUserData = userDoc.data() as DocumentData;
        if (email !== currentUserData.email) {
            const existing = await adminDb.collection('users').where('email', '==', email).limit(1).get();
            if (!existing.empty) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
            }
        }

        const updatedData = {
            name,
            email,
            role,
            positionId: positionId || null,
            locationId: locationId || null,
            regionId: regionId || null,
            managerId: managerId || null,
            updatedAt: new Date()
        };

        await userRef.update(updatedData);

        return NextResponse.json({ id, ...updatedData })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        // Check dependencies?
        // Requests, Approvals, etc.
        // Prisma code likely checks relation constraints implicitly (FK).
        // Firestore doesn't enforce.
        // We should check if user has requests?
        const requestsSnap = await adminDb.collection('requests').where('userId', '==', id).limit(1).get();
        if (!requestsSnap.empty) {
            return NextResponse.json({ error: 'Cannot delete user with existing requests' }, { status: 400 })
        }

        await adminDb.collection('users').doc(id).delete();

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}

// GET single user? (Likely used by UI for edit form)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const userRef = adminDb.collection('users').doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Fetch related names?
        // UI might need them.
        const user = { id: userDoc.id, ...userDoc.data() as DocumentData };

        // Fetch names if needed, but usually Edit Form has dropdowns loaded separately.
        // Let's return raw user data matching Prisma 'findUnique' usually.

        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}
