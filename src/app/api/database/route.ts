import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    // Firestore offset is expensive but acceptable for Admin tool.
    const offset = (page - 1) * limit

    try {
        if (!table) {
            const tables = [
                { name: 'User', description: 'User accounts and profiles' },
                { name: 'Position', description: 'Job positions' },
                { name: 'Location', description: 'Work locations' },
                { name: 'Region', description: 'Work regions' },
                { name: 'Request', description: 'Onsite/Offsite requests' },
                { name: 'Approval', description: 'Request approvals' },
                { name: 'Setting', description: 'System settings' },
                { name: 'Delegation', description: 'Request delegations' },
                { name: 'Notification', description: 'User notifications' },
            ]
            return NextResponse.json({ tables })
        }

        let data: any[] = []
        let total = 0

        // Helper to get collection name
        const getCollection = (t: string) => {
            switch (t) {
                case 'User': return 'users';
                case 'Position': return 'positions';
                case 'Location': return 'locations';
                case 'Region': return 'regions';
                case 'Request': return 'requests';
                case 'Approval': return 'approvals';
                case 'Setting': return 'settings';
                case 'Delegation': return 'delegations';
                case 'Notification': return 'notifications';
                default: return null;
            }
        };

        const collectionName = getCollection(table);
        if (!collectionName) {
            return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
        }

        const colRef = adminDb.collection(collectionName);

        // Get Total Count
        // In Firestore, count() aggregation is available (Node SDK >= 9.14) or slow count.
        // adminDb.collection(..).count().get()
        const countSnap = await colRef.count().get();
        total = countSnap.data().count;

        // Query with Pagination
        // Ordering: default to createdAt desc or name asc depending on collection?
        // Original code had specific ordering.
        let query: FirebaseFirestore.Query = colRef;

        if (['User', 'Request', 'Approval', 'Delegation', 'Notification'].includes(table)) {
            query = query.orderBy('createdAt', 'desc');
        } else if (['Position', 'Location', 'Region', 'Setting'].includes(table)) {
            // Position/Location/Region by name, Setting by key
            if (table === 'Setting') query = query.orderBy('key', 'asc');
            else query = query.orderBy('name', 'asc');
        }

        query = query.offset(offset).limit(limit);
        const snapshot = await query.get();
        let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

        // Resolve Relations (Manual Joins)
        // Helper to fetch map
        const fetchMap = async (col: string) => {
            const s = await adminDb.collection(col).get();
            return new Map(s.docs.map(d => [d.id, d.data()]));
        };

        if (table === 'User') {
            const [posts, locs, regs, users] = await Promise.all([
                fetchMap('positions'), fetchMap('locations'), fetchMap('regions'), fetchMap('users')
            ]);
            data = docs.map(d => ({
                ...d,
                position: d.positionId ? { name: posts.get(d.positionId)?.name } : null,
                location: d.locationId ? { name: locs.get(d.locationId)?.name } : null,
                region: d.regionId ? { name: regs.get(d.regionId)?.name } : null,
                manager: d.managerId ? { name: users.get(d.managerId)?.name } : null,
            }));
        } else if (table === 'Location') {
            const regs = await fetchMap('regions');
            data = docs.map(d => ({
                ...d,
                region: d.regionId ? { name: regs.get(d.regionId)?.name } : null
            }));
        } else if (table === 'Request') {
            const users = await fetchMap('users');
            const posts = await fetchMap('positions');
            data = docs.map(d => ({
                ...d,
                user: d.userId ? { name: users.get(d.userId)?.name, email: users.get(d.userId)?.email } : null,
                nextApproverPosition: d.nextApproverPositionId ? { name: posts.get(d.nextApproverPositionId)?.name } : null
            }));
        } else if (table === 'Approval') {
            const users = await fetchMap('users');
            const reqs = await fetchMap('requests'); // Fetching all requests might be heavy?
            // Fetch only related requests?
            // For Admin viewer, bulk fetch is okay if not huge. If huge, we optimize later.
            data = docs.map(d => ({
                ...d,
                approver: d.approverId ? { name: users.get(d.approverId)?.name, email: users.get(d.approverId)?.email } : null,
                request: d.requestId ? { type: reqs.get(d.requestId)?.type } : null
            }));
        } else if (table === 'Delegation') {
            const users = await fetchMap('users');
            const reqs = await fetchMap('requests');
            data = docs.map(d => ({
                ...d,
                delegateUser: d.delegateUserId ? { name: users.get(d.delegateUserId)?.name } : null,
                delegatorUser: d.delegatorUserId ? { name: users.get(d.delegatorUserId)?.name } : null,
                request: d.requestId ? { type: reqs.get(d.requestId)?.type } : null
            }));
        } else if (table === 'Notification') {
            const users = await fetchMap('users');
            data = docs.map(d => ({
                ...d,
                user: d.userId ? { name: users.get(d.userId)?.name, email: users.get(d.userId)?.email } : null
            }));
        } else {
            data = docs;
        }

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error: any) {
        console.error('Database API error:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
}
