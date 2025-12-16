import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DocumentData } from 'firebase-admin/firestore'

export async function GET(request: Request) {
    try {
        console.log("[API/Requests] HIT");
        const session = await getServerSession(authOptions)
        console.log("[API/Requests] Session:", session ? "Found" : "Missing");

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!session?.user?.id) {
            console.error("[API/Requests] Session User ID missing:", session);
            return NextResponse.json({ error: 'User ID missing' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url)
        console.log("[API/Requests] Params:", searchParams.toString());

        const start = searchParams.get('start')
        const end = searchParams.get('end')

        // 1. Date Filtering
        let startDate: Date;
        let endDate: Date;

        try {
            if (start && end) {
                startDate = new Date(start);
                endDate = new Date(end);
            } else {
                const d = new Date();
                d.setMonth(d.getMonth() - 2);
                d.setDate(1);
                startDate = d;
                endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
            }
            console.log("[API/Requests] Date Range:", startDate, "to", endDate);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error("Invalid Date Parameters");
            }
        } catch (e: any) {
            console.error("[API/Requests] Date Parsing Error:", e);
            return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 });
        }

        const requestsRef = adminDb.collection('requests');
        let requests = [];

        try {
            console.log("[API/Requests] Querying. User:", session.user.id, "Role:", session.user.role);

            // SIMPLIFIED LOGIC: Use Basic Query + Memory Filtering to avoid Index Hell effectively
            // This is cleaner and more robust for now.
            let q: FirebaseFirestore.Query = requestsRef;

            if (session.user.role === 'EMPLOYEE') {
                q = q.where('userId', '==', session.user.id);
            } else {
                q = q.limit(100); // Admin limit
            }

            // Execute Basic Query
            const snap = await q.get();
            requests = snap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as any[];

            // Apply Date Filtering in Memory (Robust)
            requests = requests.filter(r => {
                const s = r.startDate.toDate ? r.startDate.toDate() : new Date(r.startDate);
                return s >= startDate && s <= endDate;
            });

            console.log("[API/Requests] Found requests:", requests.length);

        } catch (e: any) {
            console.error("[API/Requests] Firestore Error:", e);
            throw new Error(`Firestore Query Failed: ${e.message}`);
        }

        // Apply End Date filter in memory to be safe
        requests = requests.filter(r => {
            const s = r.startDate.toDate ? r.startDate.toDate() : new Date(r.startDate);
            return s >= startDate;
        });


        // 2. Optimize Approvals & Users Fetching
        const userIds = new Set<string>();
        requests.forEach(r => userIds.add(r.userId));

        // Fetch Approvals for these requests
        const requestIds = requests.map(r => r.id);
        const approvalsMap = new Map<string, any>();

        await Promise.all(requests.map(async (r) => {
            const approvalSnap = await adminDb.collection('approvals')
                .where('requestId', '==', r.id)
                .get();

            if (!approvalSnap.empty) {
                // Sort in memory to avoid Composite Index requirement
                const docs = approvalSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                docs.sort((a, b) => {
                    const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                    const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                    return tB - tA; // Descending
                });

                const appData = docs[0];
                approvalsMap.set(r.id, appData);
                if (appData.approverId) userIds.add(appData.approverId);
            }
        }));

        // 3. Fetch Unique Users
        const uniqueUserIds = Array.from(userIds);
        const usersMap = new Map<string, any>();

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
                    approver: approver
                }] : []
            };
        });

        // Sort by Date Descending
        enrichedRequests.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

        return NextResponse.json(enrichedRequests)
    } catch (error: any) {
        console.error("Error fetching requests:", error);
        return NextResponse.json({
            error: 'Failed to fetch requests',
            details: error.message,
            stack: error.stack
        }, { status: 500 })
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
