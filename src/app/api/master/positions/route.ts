import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const positionsRef = adminDb.collection('positions');
        const snapshot = await positionsRef.orderBy('name').get();

        const positions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json(positions)
    } catch (error) {
        console.error('Error fetching positions:', error)
        return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const positionsRef = adminDb.collection('positions');

        // Check uniqueness
        const existing = await positionsRef.where('name', '==', name).limit(1).get();
        if (!existing.empty) {
            return NextResponse.json({ error: 'Position name already exists' }, { status: 400 })
        }

        const newDocRef = positionsRef.doc();
        const newPosition = {
            id: newDocRef.id,
            name,
            description: description || null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await newDocRef.set(newPosition);

        return NextResponse.json(newPosition)
    } catch (error: any) {
        console.error('Error creating position:', error)
        return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
    }
}
