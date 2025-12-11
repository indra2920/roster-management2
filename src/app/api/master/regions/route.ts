import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const regionsRef = adminDb.collection('regions');
        const snapshot = await regionsRef.orderBy('name').get();
        const regions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return NextResponse.json(regions)
    } catch (error) {
        console.error("Error fetching regions:", error);
        return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const regionsRef = adminDb.collection('regions');

        // Uniqueness
        const existing = await regionsRef.where('name', '==', name).limit(1).get();
        if (!existing.empty) {
            return NextResponse.json({ error: 'Region name already exists' }, { status: 400 })
        }

        const newDocRef = regionsRef.doc();
        const newRegion = {
            id: newDocRef.id,
            name,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await newDocRef.set(newRegion);

        return NextResponse.json(newRegion)
    } catch (error) {
        console.error("Error creating region:", error);
        return NextResponse.json({ error: 'Failed to create region' }, { status: 500 })
    }
}
