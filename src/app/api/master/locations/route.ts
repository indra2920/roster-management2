import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const locationsRef = adminDb.collection('locations');
        const locationsSnapshot = await locationsRef.orderBy('name').get();
        const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch Regions for join
        const regionsRef = adminDb.collection('regions');
        const regionSnapshot = await regionsRef.get();
        const regionsMap = new Map(regionSnapshot.docs.map(d => [d.id, d.data()]));

        const locations = locationsData.map((loc: any) => ({
            ...loc,
            region: loc.regionId ? { id: loc.regionId, ...regionsMap.get(loc.regionId) } : null
        }));

        return NextResponse.json(locations)
    } catch (error) {
        console.error("Error fetching locations:", error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, address, regionId } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const locationsRef = adminDb.collection('locations');

        // Check uniqueness
        const existing = await locationsRef.where('name', '==', name).limit(1).get();
        if (!existing.empty) {
            return NextResponse.json({ error: 'Location name already exists' }, { status: 400 })
        }

        const newDocRef = locationsRef.doc();
        const newLocation = {
            id: newDocRef.id,
            name,
            address,
            regionId: regionId || null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await newDocRef.set(newLocation);

        return NextResponse.json(newLocation)
    } catch (error) {
        console.error("Error creating location:", error);
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
