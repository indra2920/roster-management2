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

    try {
        const currentUserRef = adminDb.collection('users').doc(session.user.id);
        const currentUserDoc = await currentUserRef.get();
        const currentUser = currentUserDoc.data() as DocumentData;

        // Check rights
        const hasApprovalRights = currentUser?.positionId || session.user.role === 'ADMIN' || session.user.role === 'MANAGER';
        if (!hasApprovalRights) {
            return NextResponse.json([])
        }

        // Logic to determine which requests to show
        // We match `nextApproverPositionId` with user's position (or "Manager" position if user is manager)
        let targetPositionId: string | null = null;

        if (session.user.role === 'MANAGER') {
            targetPositionId = currentUser?.positionId;
            if (!targetPositionId) {
                // Find "Manager" position ID
                const positionsSnap = await adminDb.collection('positions').where('name', '==', 'Manager').limit(1).get();
                if (!positionsSnap.empty) {
                    targetPositionId = positionsSnap.docs[0].id;
                }
            }
        } else if (currentUser?.positionId) {
            targetPositionId = currentUser.positionId;
        }

        let requestsRef = adminDb.collection('requests');
        let query: FirebaseFirestore.Query = requestsRef.where('status', '==', 'PENDING');

        if (session.user.role !== 'ADMIN' && targetPositionId) {
            query = query.where('nextApproverPositionId', '==', targetPositionId);
        } else if (session.user.role !== 'ADMIN') {
            // If not admin and no position ID determined, show nothing
            return NextResponse.json([])
        }

        // Fetch requests
        const snapshot = await query.get(); // we might want to order by createdAt. index needed.
        let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<DocumentData & { id: string }>;

        // Sort in memory by createdAt ASC (oldest first)
        requests.sort((a, b) => {
            const dA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dA.getTime() - dB.getTime();
        });

        // Enrich with User and NextApproverPosition names
        // Fetch User IDs and Position IDs
        const userIds = new Set(requests.map(r => r.userId));
        const positionIds = new Set(requests.map(r => r.nextApproverPositionId).filter(Boolean));

        const [usersSnap, positionsSnap] = await Promise.all([
            adminDb.collection('users').get(), // Optimize if needed
            adminDb.collection('positions').get()
        ]);
        const usersMap = new Map(usersSnap.docs.map(d => [d.id, d.data()]));
        const positionsMap = new Map(positionsSnap.docs.map(d => [d.id, d.data()]));

        // Fetch Approvals nested?
        // Logic in Prisma: include approvals (ordered asc).
        // Let's fetch all approvals for these requests.
        // Again, simple loop for now.

        const enrichedRequests = await Promise.all(requests.map(async (r) => {
            // Get approvals
            const approvalsQuery = await adminDb.collection('approvals')
                .where('requestId', '==', r.id)
                // .orderBy('createdAt', 'asc')
                .get();
            let approvals = approvalsQuery.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            approvals.sort((a, b) => (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)).getTime() - (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)).getTime());

            // Map approver names
            approvals = approvals.map(app => {
                const approverUser = usersMap.get(app.approverId);
                const approverPos = approverUser?.positionId ? positionsMap.get(approverUser.positionId) : null;
                return {
                    ...app,
                    approver: {
                        name: approverUser?.name,
                        position: { name: approverPos?.name }
                    }
                }
            });

            const reqUser = usersMap.get(r.userId);
            const reqUserPos = reqUser?.positionId ? positionsMap.get(reqUser.positionId) : null;
            const nextPos = r.nextApproverPositionId ? positionsMap.get(r.nextApproverPositionId) : null;

            return {
                ...r,
                user: {
                    name: reqUser?.name,
                    email: reqUser?.email,
                    position: { name: reqUserPos?.name }
                },
                nextApproverPosition: { name: nextPos?.name },
                approvals
            }
        }));

        return NextResponse.json(enrichedRequests)
    } catch (error) {
        console.error("Error fetching approvals:", error);
        return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { requestId, status, comment, approvalLat, approvalLong } = await request.json()

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const requestRef = adminDb.collection('requests').doc(requestId);

        // Run Transaction
        const result = await adminDb.runTransaction(async (t) => {
            const requestDoc = await t.get(requestRef);
            if (!requestDoc.exists) {
                throw new Error('Request not found');
            }
            const requestData = requestDoc.data() as DocumentData;

            // Re-fetch User Position for authorization check inside transaction or before? 
            // Before is fine for read-only static config, but let's do safe check.
            // We assume session user is valid.

            // Logic for Next Level
            // Need positions IDs
            const positionsSnap = await adminDb.collection('positions').get();
            const positions = positionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            const koordinatorPosition = positions.find(p => p.name.includes('Koordinator'));
            const managerPosition = positions.find(p => p.name === 'Manager');

            let nextApproverPositionId: string | null = null;
            let newApprovalLevel = requestData.currentApprovalLevel;
            let finalStatus = status;

            if (status === 'APPROVED') {
                if (requestData.currentApprovalLevel === 1) {
                    // GSL -> Koord
                    nextApproverPositionId = koordinatorPosition?.id || null;
                    newApprovalLevel = 2;
                    finalStatus = 'PENDING';
                } else if (requestData.currentApprovalLevel === 2) {
                    // Koord -> Manager
                    nextApproverPositionId = managerPosition?.id || null;
                    newApprovalLevel = 3;
                    finalStatus = 'PENDING';
                } else if (requestData.currentApprovalLevel === 3) {
                    // Manager -> Done
                    nextApproverPositionId = null;
                    finalStatus = 'APPROVED';
                }
            } else {
                finalStatus = 'REJECTED';
                nextApproverPositionId = null;
            }

            // Update Request
            t.update(requestRef, {
                status: finalStatus,
                currentApprovalLevel: newApprovalLevel,
                nextApproverPositionId,
                updatedAt: new Date()
            });

            // Create Approval Record
            const approvalRef = adminDb.collection('approvals').doc();
            t.set(approvalRef, {
                id: approvalRef.id,
                requestId,
                approverId: session.user.id,
                status,
                comment: comment || '',
                approvalLevel: requestData.currentApprovalLevel,
                approvalLat: approvalLat || null,
                approvalLong: approvalLong || null,
                createdAt: new Date()
            });

            return { success: true };
        });

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Error processing approval:', error)
        return NextResponse.json({
            error: 'Failed to process approval',
            details: error.message
        }, { status: 500 })
    }
}
