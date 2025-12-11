import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DocumentData } from 'firebase-admin/firestore'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    try {
        let requestsRef = adminDb.collection('requests');
        let query: FirebaseFirestore.Query = requestsRef.orderBy('startDate', 'asc');

        if (session.user.role === 'EMPLOYEE') {
            query = query.where('userId', '==', session.user.id);
        }

        // Date filtering in Firestore is tricky with inequality on multiple fields vs ordering.
        // We are ordering by startDate. We can startAt/endAt if we want.
        // Or fetch and filter in memory if volume is low.
        // For accurate range, let's filter in memory for MVP to avoid index issues with multiple fields (status, userId, dates).
        // (Composite indexes might be missing).

        const snapshot = await query.get();
        let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // Filter dates in memory
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            requests = requests.filter(r => {
                const s = r.startDate.toDate ? r.startDate.toDate() : new Date(r.startDate);
                const e = r.endDate.toDate ? r.endDate.toDate() : new Date(r.endDate);
                return s >= startDate && e <= endDate;
            });
        }

        // Fetch User details for expansion (simulating include user)
        // Also fetch Approvals
        // This is N+1 if we are not careful.
        // Optimization: Gather User IDs.
        const userIds = new Set(requests.map(r => r.userId));
        const usersRef = adminDb.collection('users');
        // If many users, fetch all? Or individually?
        // Let's fetch all active users map for caching.
        // Actually, let's just fetch individual if small batch, or all if > 5. Assuming all for simplicity.
        const allUsersSnap = await usersRef.get(); // Cache all users
        const usersMap = new Map(allUsersSnap.docs.map(d => [d.id, d.data()]));

        // Fetch Approvals for these requests
        // Approvals have `requestId`.
        // We can query approvals where requestId IN [...]. Firestore limits IN to 10.
        // So fetch ALL approvals? Or just fetch approvals for each request individually?
        // Query: approvalsRef.where('requestId', '==', r.id).orderBy('createdAt', 'desc').limit(1)
        // Doing this in loop is slow.
        // Better: Fetch all approvals (if reasonable size) or fetch by request logic efficiently.
        // MVP: Loop with Promise.all (Parallel).

        const enrichedRequests = await Promise.all(requests.map(async (r) => {
            const user = usersMap.get(r.userId);

            // Fetch approval
            const approvalsQuery = await adminDb.collection('approvals')
                .where('requestId', '==', r.id)
                // .orderBy('createdAt', 'desc') // Requires index
                .get();

            let approvals = approvalsQuery.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            approvals.sort((a, b) => {
                const dA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dB.getTime() - dA.getTime();
            });
            const latestApproval = approvals[0];

            let approver = null;
            if (latestApproval && latestApproval.approverId) {
                const approverUser = usersMap.get(latestApproval.approverId);
                if (approverUser) {
                    approver = { name: approverUser.name, email: approverUser.email };
                }
            }

            return {
                ...r,
                startDate: r.startDate.toDate ? r.startDate.toDate() : r.startDate, // Ensure serializable
                endDate: r.endDate.toDate ? r.endDate.toDate() : r.endDate,
                createdAt: r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt,
                user: user ? { name: user.name, email: user.email } : null,
                approvals: latestApproval ? [{
                    ...latestApproval,
                    createdAt: latestApproval.createdAt.toDate ? latestApproval.createdAt.toDate() : latestApproval.createdAt,
                    approver: approver
                }] : []
            };
        }));

        return NextResponse.json(enrichedRequests)
    } catch (error) {
        console.error("Error fetching requests:", error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { type, startDate, endDate, reason, justification, requestLat, requestLong } = body

        if (!type || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const usersRef = adminDb.collection('users');
        const userDoc = await usersRef.doc(session.user.id).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        const userData = userDoc.data() as DocumentData;

        // Fetch Position Name
        let userPositionName = '';
        if (userData.positionId) {
            const posDoc = await adminDb.collection('positions').doc(userData.positionId).get();
            if (posDoc.exists) userPositionName = posDoc.data()?.name || '';
        }

        // Hierarchy Logic
        // Fetch all positions to find by name
        const positionsSnap = await adminDb.collection('positions').get();
        const positions = positionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        const gslPosition = positions.find(p => p.name.includes('GSL'));
        const koordinatorPosition = positions.find(p => p.name.includes('Koordinator')); // Case sensitive? 'Koordinator'
        const managerPosition = positions.find(p => p.name === 'Manager');

        let nextApproverPositionId: string | null = null
        let currentApprovalLevel = 0

        if (userPositionName.includes('SOS')) {
            nextApproverPositionId = gslPosition?.id || null
            currentApprovalLevel = 1
        } else if (userPositionName.includes('GSL')) {
            nextApproverPositionId = koordinatorPosition?.id || null
            currentApprovalLevel = 2
        } else if (userPositionName.toLowerCase().includes('koordinator')) {
            nextApproverPositionId = managerPosition?.id || null
            currentApprovalLevel = 3
        } else {
            // Default to Manager
            nextApproverPositionId = managerPosition?.id || null
            currentApprovalLevel = 3
        }

        const requestsRef = adminDb.collection('requests');
        const newDocRef = requestsRef.doc();
        const newRequest = {
            id: newDocRef.id,
            userId: session.user.id,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            justification: justification || null,
            requestLat: requestLat || null,
            requestLong: requestLong || null,
            status: 'PENDING',
            nextApproverPositionId,
            currentApprovalLevel,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await newDocRef.set(newRequest);

        // Check duration logic
        const start = new Date(startDate)
        const end = new Date(endDate)
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        const settingKey = type === 'ONSITE' ? 'MAX_ONSITE_DAYS' : 'MAX_OFFSITE_DAYS'
        let settingValue = 0;

        const settingsSnap = await adminDb.collection('settings').where('key', '==', settingKey).limit(1).get();
        if (!settingsSnap.empty) {
            settingValue = parseInt(settingsSnap.docs[0].data().value);
        }

        if (settingValue > 0 && durationDays > settingValue) {
            if (userData.managerId) {
                // Create Notification
                const notification = {
                    userId: userData.managerId,
                    type: 'DURATION_EXCEEDED',
                    title: 'Durasi Pengajuan Melebihi Batas',
                    message: `Pengajuan ${type} oleh ${userData.name} selama ${durationDays} hari melebihi batas ${settingValue} hari.`,
                    relatedId: newRequest.id,
                    isRead: false,
                    createdAt: new Date()
                };
                await adminDb.collection('notifications').add(notification);
            }
        }

        return NextResponse.json(newRequest)
    } catch (error) {
        console.error("Error creating request:", error);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
}
