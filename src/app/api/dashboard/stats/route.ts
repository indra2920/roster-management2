import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DocumentData } from 'firebase-admin/firestore'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()
        const isManager = session.user.role === 'MANAGER';
        const managerId = session.user.id; // Corrected: session.user.id is the manager's ID

        // 1. Optimized Request Fetching
        // Fetch only potentially relevant requests
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const requestsRef = adminDb.collection('requests');

        // Logic for Manager: Fetch subordinates first
        let relevantUserIds: Set<string> | null = null;

        if (isManager && false) { // DISABLED: Manager should see ALL data, matching /api/users
            // Fetch employees managed by this user
            const subordinatesSnap = await adminDb.collection('users')
                .where('managerId', '==', managerId)
                .get();

            if (subordinatesSnap.empty) {
                // If no subordinates, return empty stats mostly
                return NextResponse.json({
                    totalEmployees: 0,
                    pendingRequests: 0,
                    approvedRequests: 0,
                    requestsByType: [],
                    requestsByStatus: [],
                    activePersonnel: { onsite: { count: 0, personnel: [] }, offsite: { count: 0, personnel: [] } },
                    monthlyTrends: [],
                    topReasons: [],
                    requestsByLocation: [],
                    requestsByRegion: []
                });
            }

            relevantUserIds = new Set(subordinatesSnap.docs.map(d => d.id));
        }

        // Helper to run query logic
        // Helper to run query logic
        // REFACTORED: For managers, fetch ALL requests for the user chunk to avoid composite indexes
        // (userId + status, userId + date, etc.)
        const fetchAllRequestsForUsers = async (userIds: string[]) => {
            const chunks = [];
            for (let i = 0; i < userIds.length; i += 30) {
                chunks.push(userIds.slice(i, i + 30));
            }
            const results = await Promise.all(chunks.map(chunk =>
                adminDb.collection('requests').where('userId', 'in', chunk).get()
            ));
            return results.flatMap(snap => snap.docs);
        };

        // Global fetch - Single Field Indexes generally exist or are easy to create
        // If these fail, we might need a similar "Scan recent" strategy, but for now strict querying is likely okay for Admin root.
        const [recentDocs, pendingDocs, activeDocs] = await Promise.all([
            requestsRef.where('createdAt', '>=', sixMonthsAgo).get(),
            requestsRef.where('status', '==', 'PENDING').get(),
            requestsRef.where('endDate', '>=', now).get()
        ]);

        const recentRequests = recentDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const pendingRequestsList = pendingDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const potentialActiveRequests = activeDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        const filteredRecent = recentRequests;
        const filteredPending = pendingRequestsList;
        const filteredActive = potentialActiveRequests;


        // 2. Identify Relevant Users
        // Collect all unique User IDs from all these requests
        const userIdsToCheck = new Set<string>();
        recentRequests.forEach(r => userIdsToCheck.add(r.userId));
        pendingRequestsList.forEach(r => userIdsToCheck.add(r.userId));
        potentialActiveRequests.forEach(r => userIdsToCheck.add(r.userId));

        // 3. Batch Fetch Users
        // We only fetch users that are actually involved in the retrieved requests.
        // This is much smaller than "ALL Users".
        const uniqueUserIds = Array.from(userIdsToCheck);
        const usersMap = new Map<string, any>();

        if (uniqueUserIds.length > 0) {
            // Firestore getAll supports up to 10 args? No, usually unlimited in array spread but good to check limits.
            // If > 100, chunk it? 'getAll' is variadic. 
            // In Node SDK, it can handle many.
            const userRefs = uniqueUserIds.map(id => adminDb.collection('users').doc(id));
            const userDocs = await adminDb.getAll(...userRefs);
            userDocs.forEach(doc => {
                if (doc.exists) usersMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
        }

        // --- Aggregations ---

        // 1. Total Employees (Active)
        // Optimization: Use Count Query
        let totalEmployees = 0;
        try {
            let employeesQuery = adminDb.collection('users')
                .where('isActive', '==', true);
            // REMOVED .where('role', '==', 'EMPLOYEE') to count ALL subordinates regardless of role (e.g. SOS, GSL)

            // if (isManager) {
            //    console.log("[Stats] Manager ID:", managerId);
            //    employeesQuery = employeesQuery.where('managerId', '==', managerId);
            // }

            const countSnap = await employeesQuery.count().get();
            totalEmployees = countSnap.data().count;
            // console.log("[Stats] Total Employees Found:", totalEmployees);
        } catch (e) {
            console.error("Count query failed, falling back to approximation or 0", e);
            // Fallback if count() not supported (unlikely in recent firebase-admin)
            // If strictly needed, we could fetch IDs only? Too heavy.
            // Just defaults to 0 or maybe we rely on usersMap size? No, usersMap is partial.
        }


        // 2. Pending Requests
        const pendingRequests = filteredPending.length;

        // 3. Approved Requests (Current Month)
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const approvedRequests = filteredRecent.filter(r =>
            r.status === 'APPROVED' &&
            new Date(r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt) >= firstDayOfMonth
        ).length;


        // 4. Requests by Type / Status (Working Set)
        const workingSetMap = new Map();
        filteredRecent.forEach(r => workingSetMap.set(r.id, r));
        filteredPending.forEach(r => workingSetMap.set(r.id, r));
        const workingSet = Array.from(workingSetMap.values());

        const onsiteCount = workingSet.filter(r => r.type === 'ONSITE').length;
        const offsiteCount = workingSet.filter(r => r.type === 'OFFSITE').length;

        const approvedCount = workingSet.filter(r => r.status === 'APPROVED').length;
        const rejectedCount = workingSet.filter(r => r.status === 'REJECTED').length;
        const pendingCount = workingSet.filter(r => r.status === 'PENDING').length;


        // 5. Active Personnel
        const calculateDuration = (startDate: any) => {
            const start = new Date(startDate.toDate ? startDate.toDate() : startDate)
            const diffTime = Math.abs(now.getTime() - start.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays
        }

        const activePersonnelRequests = filteredActive.filter(r => {
            if (r.status !== 'APPROVED') return false;
            const start = new Date(r.startDate.toDate ? r.startDate.toDate() : r.startDate);
            const end = new Date(r.endDate.toDate ? r.endDate.toDate() : r.endDate);
            return start <= now && end >= now;
        }).sort((a, b) => {
            const dateA = new Date(a.startDate.toDate ? a.startDate.toDate() : a.startDate);
            const dateB = new Date(b.startDate.toDate ? b.startDate.toDate() : b.startDate);
            return dateA.getTime() - dateB.getTime();
        });

        const mapPersonnel = (reqs: DocumentData[]) => reqs.map(req => {
            const user = usersMap.get(req.userId); // fetching from loaded map
            return {
                requestId: req.id,
                userId: req.userId,
                userName: user?.name,
                userEmail: user?.email,
                startDate: req.startDate.toDate ? req.startDate.toDate() : req.startDate,
                endDate: req.endDate.toDate ? req.endDate.toDate() : req.endDate,
                durationDays: calculateDuration(req.startDate),
                reason: req.reason
            };
        });

        const onsitePersonnel = mapPersonnel(activePersonnelRequests.filter(r => r.type === 'ONSITE'));
        const offsitePersonnel = mapPersonnel(activePersonnelRequests.filter(r => r.type === 'OFFSITE'));


        // 6. Monthly Trends
        const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - (5 - i))
            return {
                name: d.toLocaleString('default', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                Onsite: 0,
                Offsite: 0,
                Total: 0
            }
        });

        filteredRecent.forEach(req => {
            const created = new Date(req.createdAt.toDate ? req.createdAt.toDate() : req.createdAt);
            if (created >= sixMonthsAgo) {
                const month = created.getMonth();
                const year = created.getFullYear();
                const trend = monthlyTrends.find(t => t.month === month && t.year === year);
                if (trend) {
                    if (req.type === 'ONSITE') trend.Onsite++;
                    else if (req.type === 'OFFSITE') trend.Offsite++;
                    trend.Total++;
                }
            }
        });


        // 7. Top Reasons
        const reasonCounts: { [key: string]: number } = {};
        workingSet.forEach(req => {
            const reason = (req.reason || '').trim();
            if (reason) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        const topReasons = Object.entries(reasonCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        // 8. Location & Region Stats (Working Set Only)
        // Collect Loc/Region IDs from the users we loaded
        const locationIds = new Set<string>();
        const regionIds = new Set<string>();

        workingSet.forEach(req => {
            const user = usersMap.get(req.userId);
            if (user?.locationId) locationIds.add(user.locationId);
            if (user?.regionId) regionIds.add(user.regionId);
        });

        // Batch Fetch Locations & Regions
        const uniqueLocIds = Array.from(locationIds);
        const uniqueRegIds = Array.from(regionIds);

        const locMap = new Map();
        const regMap = new Map();

        if (uniqueLocIds.length > 0) {
            const locRefs = uniqueLocIds.map(id => adminDb.collection('locations').doc(id));
            const locDocs = await adminDb.getAll(...locRefs);
            locDocs.forEach(d => { if (d.exists) locMap.set(d.id, d.data()?.name || '') });
        }
        if (uniqueRegIds.length > 0) {
            const regRefs = uniqueRegIds.map(id => adminDb.collection('regions').doc(id));
            const regDocs = await adminDb.getAll(...regRefs);
            regDocs.forEach(d => { if (d.exists) regMap.set(d.id, d.data()?.name || '') });
        }


        const locationCounts: { [key: string]: number } = {};
        const regionCounts: { [key: string]: number } = {};

        workingSet.forEach(req => {
            const user = usersMap.get(req.userId);
            if (user) {
                const locName = (user.locationId && locMap.get(user.locationId)) || 'Unknown';
                const regName = (user.regionId && regMap.get(user.regionId)) || 'Unknown';

                locationCounts[locName] = (locationCounts[locName] || 0) + 1;
                regionCounts[regName] = (regionCounts[regName] || 0) + 1;
            }
        });

        const requestsByLocation = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const requestsByRegion = Object.entries(regionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);


        return NextResponse.json({
            totalEmployees,
            pendingRequests,
            approvedRequests,
            requestsByType: [
                { name: 'Onsite', value: onsiteCount },
                { name: 'Offsite', value: offsiteCount }
            ],
            requestsByStatus: [
                { name: 'Approved', value: approvedCount },
                { name: 'Rejected', value: rejectedCount },
                { name: 'Pending', value: pendingCount }
            ],
            activePersonnel: {
                onsite: {
                    count: onsitePersonnel.length,
                    personnel: onsitePersonnel
                },
                offsite: {
                    count: offsitePersonnel.length,
                    personnel: offsitePersonnel
                }
            },
            monthlyTrends,
            topReasons,
            requestsByLocation,
            requestsByRegion
        })

    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
