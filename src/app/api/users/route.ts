import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DocumentData } from 'firebase-admin/firestore'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)

    // Check for Role OR Position access
    // Note: session user might not have positionName if not mapped in auth.ts yet, but we handled that.
    const positionName = session?.user?.positionName || ''
    const isGSL = positionName.includes('GSL')
    const isKoordinator = positionName.toLowerCase().includes('koordinator')
    const isAdminOrManager = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'

    if (!session || (!isAdminOrManager && !isGSL && !isKoordinator)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        let usersRef = adminDb.collection('users');
        let query: FirebaseFirestore.Query = usersRef;

        // Apply filters for GSL and Koordinator
        if (!isAdminOrManager) {
            if (isGSL) {
                if (!session.user.locationId) {
                    return NextResponse.json({ error: 'GSL account has no location assigned' }, { status: 400 })
                }
                query = query.where('locationId', '==', session.user.locationId);
            } else if (isKoordinator) {
                if (!session.user.regionId) {
                    return NextResponse.json({ error: 'Koordinator account has no region assigned' }, { status: 400 })
                }
                query = query.where('regionId', '==', session.user.regionId);
            }
        }

        // Fetch Users
        const usersSnapshot = await query.get();
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch Master Data for Joins
        const [positionsSnap, locationsSnap, regionsSnap] = await Promise.all([
            adminDb.collection('positions').get(),
            adminDb.collection('locations').get(),
            adminDb.collection('regions').get()
        ]);

        const positionsMap = new Map(positionsSnap.docs.map(d => [d.id, d.data()]));
        const locationsMap = new Map(locationsSnap.docs.map(d => [d.id, d.data()]));
        const regionsMap = new Map(regionsSnap.docs.map(d => [d.id, d.data()]));

        const usersMap = new Map(usersData.map(u => [u.id, u]));

        const joinedUsers = await Promise.all(usersData.map(async (user: any) => {
            // Resolve Manager Name
            let managerName = null;
            if (user.managerId) {
                if (usersMap.has(user.managerId)) {
                    const mgr = usersMap.get(user.managerId) as DocumentData;
                    managerName = mgr.name;
                } else {
                    const mDoc = await adminDb.collection('users').doc(user.managerId).get();
                    if (mDoc.exists) managerName = mDoc.data()?.name;
                }
            }

            const posData = user.positionId ? positionsMap.get(user.positionId) : null;
            const locData = user.locationId ? locationsMap.get(user.locationId) : null;
            const regData = user.regionId ? regionsMap.get(user.regionId) : null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                position: user.positionId ? { id: user.positionId, name: posData?.name } : null,
                location: user.locationId ? { id: user.locationId, name: locData?.name } : null,
                region: user.regionId ? { id: user.regionId, name: regData?.name } : null,
                manager: managerName ? { name: managerName } : null,
                isActive: user.isActive
            };
        }));

        // Sort by name
        joinedUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return NextResponse.json(joinedUsers)
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, email, password, role, positionId, locationId, regionId, managerId } = body

        // Basic validation
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const usersRef = adminDb.collection('users');

        // Check uniqueness
        const existing = await usersRef.where('email', '==', email).get();
        if (!existing.empty) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }

        const newDocRef = usersRef.doc();

        const newUser = {
            id: newDocRef.id,
            name,
            email,
            password,
            role: role || 'EMPLOYEE',
            positionId: positionId || null,
            locationId: locationId || null,
            regionId: regionId || null,
            managerId: managerId || null,
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await newDocRef.set(newUser);

        return NextResponse.json(newUser)
    } catch (error: any) {
        console.error('Error creating user:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}
