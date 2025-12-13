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
        const managerId = session.user.id;

        // 1. Fetch Users
        const usersRef = adminDb.collection('users');
        const usersSnapshot = await usersRef.get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // Filter users if Manager (subordinates only)
        // Optimization: In Firestore we can query this, but we need all users for "Locations" stats? 
        // No, stats usually imply context.
        // Let's filter relevant users.
        let relevantUsers = users;
        if (isManager) {
            relevantUsers = users.filter(u => u.managerId === managerId);
        }

        const relevantUserIds = new Set(relevantUsers.map(u => u.id));

        // 2. Optimized Request Fetching
        // Instead of fetching ALL requests, we fetch only what's needed for the dashboard.
        // - Recent (Last 6 Months): For trends, distribution, and approved counts.
        // - Pending (All): For the "Pending" counter and list.
        // - Active (Future/Current): For "Active Personnel".

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const requestsRef = adminDb.collection('requests');

        const [recentSnap, pendingSnap, activeSnap] = await Promise.all([
            // Recent requests (last 6 months)
            requestsRef.where('createdAt', '>=', sixMonthsAgo).get(),
            // All Pending requests
            requestsRef.where('status', '==', 'PENDING').get(),
            // Future/Active requests (EndDate >= Now)
            // Note: This relies on 'endDate' being comparable. 
            // If composite index issues arise, client might need to add index link from console.
            requestsRef.where('endDate', '>=', now).get()
        ]);

        const recentRequests = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const pendingRequestsList = pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const potentialActiveRequests = activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // Filter by relevant users (if Manager)
        const filterByManager = (reqs: any[]) => isManager ? reqs.filter(r => relevantUserIds.has(r.userId)) : reqs;

        const filteredRecent = filterByManager(recentRequests);
        const filteredPending = filterByManager(pendingRequestsList);
        const filteredActive = filterByManager(potentialActiveRequests);


        // --- Aggregations ---

        // 1. Total Employees (Active)
        const totalEmployees = relevantUsers.filter(u => u.isActive && u.role === 'EMPLOYEE').length;

        // 2. Pending Requests
        const pendingRequests = filteredPending.length;

        // 3. Approved Requests (Current Month)
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const approvedRequests = filteredRecent.filter(r =>
            r.status === 'APPROVED' &&
            new Date(r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt) >= firstDayOfMonth
        ).length;

        // 4. Requests by Type (Based on Recent Data for Relevance)
        // Merging recent + pending for a "Current View"? 
        // Or just using Recent? Using Recent (Last 6 Months) + Pending represents "Active Window".
        // Let's rely on filteredRecent which includes Approved/Rejected/Pending from last 6 months.
        // But we should also include older Pending? 
        // Let's combine unique IDs from filteredRecent and filteredPending for general stats to cover "Active concerns" + "Recent History".

        const workingSetMap = new Map();
        filteredRecent.forEach(r => workingSetMap.set(r.id, r));
        filteredPending.forEach(r => workingSetMap.set(r.id, r));
        const workingSet = Array.from(workingSetMap.values());

        const onsiteCount = workingSet.filter(r => r.type === 'ONSITE').length;
        const offsiteCount = workingSet.filter(r => r.type === 'OFFSITE').length;

        // 5. Requests by Status (From Working Set)
        const approvedCount = workingSet.filter(r => r.status === 'APPROVED').length;
        const rejectedCount = workingSet.filter(r => r.status === 'REJECTED').length;
        const pendingCount = workingSet.filter(r => r.status === 'PENDING').length;

        // 6. Active Personnel (Currently Onsite/Offsite)
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
            const user = users.find(u => u.id === req.userId);
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

        // 7. Monthly Trends (From filteredRecent)
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

        // 8. Top Reasons (From Working Set)
        const reasonCounts: { [key: string]: number } = {};
        workingSet.forEach(req => {
            const reason = (req.reason || '').trim();
            if (reason) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        const topReasons = Object.entries(reasonCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 9. Location & Region Stats (From Working Set)
        const [locationsSnap, regionsSnap] = await Promise.all([
            adminDb.collection('locations').get(),
            adminDb.collection('regions').get()
        ]);
        const locMap = new Map(locationsSnap.docs.map(d => [d.id, d.data().name]));
        const regMap = new Map(regionsSnap.docs.map(d => [d.id, d.data().name]));

        const locationCounts: { [key: string]: number } = {};
        const regionCounts: { [key: string]: number } = {};

        workingSet.forEach(req => {
            const user = users.find(u => u.id === req.userId);
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
            approvedRequests, // using simplified logic matching requests count
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
