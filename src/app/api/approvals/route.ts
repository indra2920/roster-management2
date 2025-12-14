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
            return NextResponse.json([])
        }

        // Fetch requests
        const snapshot = await query.get();
        let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<DocumentData & { id: string }>;

        if (requests.length === 0) {
            return NextResponse.json([]);
        }

        // Sort in memory by createdAt ASC
        requests.sort((a, b) => {
            const dA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dA.getTime() - dB.getTime();
        });

        // Collect IDs for batch fetching
        const userIds = new Set<string>();
        const positionIds = new Set<string>();

        requests.forEach(r => {
            if (r.userId) userIds.add(r.userId);
            if (r.nextApproverPositionId) positionIds.add(r.nextApproverPositionId);
        });

        // Include current user position if needed for logic (already have currentUser)
        if (currentUser.positionId) positionIds.add(currentUser.positionId);


        // Fetch Approvals for these requests
        const approvalsMap = new Map<string, any[]>();

        await Promise.all(requests.map(async (r) => {
            const approvalsQuery = await adminDb.collection('approvals')
                .where('requestId', '==', r.id)
                .get();

            if (!approvalsQuery.empty) {
                const requestApprovals = approvalsQuery.docs.map(d => {
                    const data = d.data();
                    if (data.approverId) userIds.add(data.approverId); // Collect approver IDs
                    return { id: d.id, ...data };
                });
                // Sort approvals
                requestApprovals.sort((a: any, b: any) =>
                    (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)).getTime() -
                    (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)).getTime()
                );
                approvalsMap.set(r.id, requestApprovals);
            } else {
                approvalsMap.set(r.id, []);
            }
        }));

        // Batch Fetch Users and Positions using getAll
        const uniqueUserIds = Array.from(userIds);
        const uniquePositionIds = Array.from(positionIds);

        const usersMap = new Map();
        const positionsMap = new Map();

        if (uniqueUserIds.length > 0) {
            const userRefs = uniqueUserIds.map(id => adminDb.collection('users').doc(id));
            const userDocs = await adminDb.getAll(...userRefs);
            userDocs.forEach(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    usersMap.set(doc.id, data);
                    if (data?.positionId) positionIds.add(data.positionId); // Add position from user if missing
                }
            });
        }

        // Re-sync position IDs if new ones found from users? 
        // Technically strict `getAll` requires refs upfront. 
        // If we found new positionIds from users, we might miss them if we don't fetch again?
        // Optimization: Usually approvers have positions we already saw? 
        // Let's just do a second pass OR just fetch all unique positions found so far.
        // To be safe, let's fetch positions AFTER users to catch user positions.

        const allPositionIds = Array.from(positionIds);
        if (allPositionIds.length > 0) {
            const posRefs = allPositionIds.map(id => adminDb.collection('positions').doc(id));
            const posDocs = await adminDb.getAll(...posRefs);
            posDocs.forEach(doc => {
                if (doc.exists) positionsMap.set(doc.id, doc.data());
            });
        }

        const enrichedRequests = requests.map(r => {
            const reqUser = usersMap.get(r.userId);
            const reqUserPos = reqUser?.positionId ? positionsMap.get(reqUser.positionId) : null;
            const nextPos = r.nextApproverPositionId ? positionsMap.get(r.nextApproverPositionId) : null;

            let approvals = approvalsMap.get(r.id) || [];
            approvals = approvals.map((app: any) => {
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
        });

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
