import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const db = getAdminDb();
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        const user = snapshot.docs[0].data();
        const userId = snapshot.docs[0].id;

        if (!user.isActive) return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
        if (user.password !== password) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

        // Fetch position
        let positionName = null;
        if (user.positionId) {
            try {
                const posDoc = await db.collection('positions').doc(user.positionId).get();
                if (posDoc.exists) positionName = posDoc.data()?.name;
            } catch (e) {
                // ignore
            }
        }

        return NextResponse.json({
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role,
            positionId: user.positionId,
            positionName: positionName,
            locationId: user.locationId,
            regionId: user.regionId
        });

    } catch (error: any) {
        console.error('Internal Auth Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
