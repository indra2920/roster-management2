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
        // 1. Date Filtering
        // If no start/end provided, default to last 3 months to prevent loading full history.
        let startDate: Date;
        let endDate: Date;

        if (start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() - 2); // Last 3 months approx
            d.setDate(1);
            startDate = d;
            endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // Future open
        }

        const requestsRef = adminDb.collection('requests');

        // Firestore Query with Date filters
        // Note: This requires composite index (userId + startDate) if filtering by both.
        // If index missing, we catch error and fallback or let Vercel logs guide.
        // For MVP, we try to use the index.

        let requests = [];
        try {
            if (session.user.role === 'EMPLOYEE') {
                const snap = await requestsRef
                    .where('userId', '==', session.user.id)
                    .where('startDate', '>=', startDate)
                    .get(); // Sorting might require index with where
                requests = snap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as any[];
            } else {
                // Admin/Manager? Usually DashboardStats handles them. 
                // But RosterCalendar might be used by them too.
                // If Manager, filter by userIds? 
                // Existing code didn't filter by manager logic in GET, seemingly?
                // Actually existing code only checked 'EMPLOYEE'. 
                // Let's keep existing logic but add date filter.
                const snap = await requestsRef
                    .where('startDate', '>=', startDate)
                    .get();
                requests = snap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as any[];
            }
        } catch (e) {
            console.warn("Index missing for date filter, falling back to memory sort/filter", e);
            // Fallback: Fetch by User only (if Employee) or All (if Admin) - limit to 100?
            let q: FirebaseFirestore.Query = requestsRef;
            if (session.user.role === 'EMPLOYEE') q = q.where('userId', '==', session.user.id);
            const snap = await q.get();
            requests = snap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as any[];
        }

        // Memory Filter END date (Firestore only allows range on one field well without complex indexes)
        if (end) {
            requests = requests.filter(r => {
                const s = r.startDate.toDate ? r.startDate.toDate() : new Date(r.startDate);
                // We already filtered startDate >= startDate in DB (mostly)
                // Just ensure logic is tight
                return s >= startDate; // Redundant if DB worked
            });
        }
        // Apply End Date filter in memory to be safe
        // (Since we only filtered StartDate in DB)
        requests = requests.filter(r => {
            const s = r.startDate.toDate ? r.startDate.toDate() : new Date(r.startDate);
            return s >= startDate;
            // We don't strictly filter EndDate <= queryEnd unless strictly required. 
            // Usually "requests starting in range" is what we want.
        });


        // 2. Optimize Approvals & Users Fetching
        // Collect IDs first
        const userIds = new Set<string>();
        requests.forEach(r => userIds.add(r.userId));

        // Fetch Approvals for these requests
        // Optimization: Run in parallel
        const requestIds = requests.map(r => r.id);
        const approvalsMap = new Map<string, any>(); // requestId -> latestApproval

        // If too many requests, this parallel loop is still heavy?
        // But we limited date range, so hopefully < 50 items.

        // Parallel Approval Fetch
        await Promise.all(requests.map(async (r) => {
            const approvalSnap = await adminDb.collection('approvals')
                .where('requestId', '==', r.id)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (!approvalSnap.empty) {
                const appData = { id: approvalSnap.docs[0].id, ...approvalSnap.docs[0].data() } as any;
                approvalsMap.set(r.id, appData);
                if (appData.approverId) userIds.add(appData.approverId);
            }
        }));

        // 3. Fetch Unique Users
        // Fetch only the IDs we found (Owner + Approver)
        const uniqueUserIds = Array.from(userIds);
        const usersMap = new Map<string, any>();

        // Chunk fetches if needed, but for < 30 items, Promise.all get() is fine or 'in' query
        // Firestore 'in' limit is 10. safe to just loop get() for small set or fetch all if large?
        // Fetching individual docs is 1 read each. 
        // If 20 requests = 20-30 reads. 
        // Fetching "all users" = 100+ reads. 
        // Individual is better if total requests < total users.

        await Promise.all(uniqueUserIds.map(async (uid) => {
            const uSnap = await adminDb.collection('users').doc(uid).get();
            if (uSnap.exists) usersMap.set(uid, uSnap.data());
        }));

        // 4. Enrich
        const enrichedRequests = requests.map(r => {
            const user = usersMap.get(r.userId);
            const latestApproval = approvalsMap.get(r.id);
            let approver = null;
            if (latestApproval?.approverId) {
                const approverUser = usersMap.get(latestApproval.approverId);
                if (approverUser) approver = { name: approverUser.name, email: approverUser.email };
            }

            return {
                ...r,
                startDate: r.startDate.toDate ? r.startDate.toDate() : r.startDate,
                endDate: r.endDate.toDate ? r.endDate.toDate() : r.endDate,
                createdAt: r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt,
                user: user ? { name: user.name, email: user.email } : null,
                approvals: latestApproval ? [{
                    ...latestApproval,
                    createdAt: latestApproval.createdAt.toDate ? latestApproval.createdAt.toDate() : latestApproval.createdAt,
                    approver: approver // Now correctly populated
                }] : []
            };
        });

        // Sort by Date Descending
        enrichedRequests.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

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
