import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: Request) {
    try {
        console.log('🔔 Running notification check...')
        const now = new Date()

        // 1. Get Settings for limits
        let maxOnsiteDays = 14;
        let maxOffsiteDays = 14;

        const settingsSnap = await adminDb.collection('settings').get();
        const settingsMap = new Map(settingsSnap.docs.map(d => [d.data().key, d.data().value]));

        if (settingsMap.has('MAX_ONSITE_DAYS')) maxOnsiteDays = parseInt(settingsMap.get('MAX_ONSITE_DAYS'));
        if (settingsMap.has('MAX_OFFSITE_DAYS')) maxOffsiteDays = parseInt(settingsMap.get('MAX_OFFSITE_DAYS'));

        // 2. Get Active Requests
        // Status APPROVED, Date covers 'now'
        // Firestore query for date overlap is hard.
        // We'll fetch 'APPROVED' requests where endDate >= now.
        // Then filter startDate <= now in memory.
        // 2. Get Active Requests
        // Status APPROVED, Date covers 'now'
        // Avoid Composite Index (status + endDate) by fetching status=APPROVED and filtering endDate in memory.
        const requestsRef = adminDb.collection('requests');
        const activeRequestsSnap = await requestsRef
            .where('status', '==', 'APPROVED')
            .get(); // Only index on 'status' needed (auto)

        const activeRequests = activeRequestsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() as any }))
            .filter(req => {
                const s = req.startDate.toDate ? req.startDate.toDate() : new Date(req.startDate);
                return s <= now;
            });

        // Need User details for these requests
        // Optimization: Fetch all users map
        const usersSnap = await adminDb.collection('users').get();
        const usersMap = new Map(usersSnap.docs.map(d => [d.id, d.data()]));

        // 3. Get Target Users for Notifications (Admin, Manager, Koordinator)
        // We can iterate all users and check roles
        const targetUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(u =>
            u.role === 'ADMIN' ||
            u.role === 'MANAGER' ||
            (u.positionId && false) // Logic for 'Koordinator' position check requires position name
        );
        // Need to check position names for Koordinator.
        // Fetch positions
        const positionsSnap = await adminDb.collection('positions').get();
        const positionsMap = new Map(positionsSnap.docs.map(d => [d.id, d.data()]));

        // Re-filter with position names
        const finalTargetUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(u => {
            if (u.role === 'ADMIN' || u.role === 'MANAGER') return true;
            if (u.positionId) {
                const posName = positionsMap.get(u.positionId)?.name || '';
                if (posName.includes('Koordinator')) return true;
            }
            return false;
        });

        let notificationsCreated = 0

        for (const req of activeRequests) {
            const start = req.startDate.toDate ? req.startDate.toDate() : new Date(req.startDate);
            const diffTime = Math.abs(now.getTime() - start.getTime())
            const durationSoFar = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

            const limit = req.type === 'ONSITE' ? maxOnsiteDays : maxOffsiteDays
            const daysRemaining = limit - durationSoFar

            let notificationType = null
            let title = ''
            let message = ''

            const reqUser = usersMap.get(req.userId);
            const reqUserName = reqUser?.name || 'Unknown';

            if (durationSoFar > limit) {
                notificationType = 'DURATION_EXCEEDED'
                title = `⚠️ Batas Durasi Terlampaui: ${reqUserName}`
                message = `${reqUserName} (${req.type}) telah melewati batas durasi ${limit} hari. Durasi saat ini: ${durationSoFar} hari.`
            } else if (daysRemaining <= 3 && daysRemaining >= 0) {
                notificationType = 'DURATION_WARNING'
                title = `⚠️ Peringatan Batas Durasi: ${reqUserName}`
                message = `${reqUserName} (${req.type}) mendekati batas durasi. Sisa waktu: ${daysRemaining} hari.`
            }

            if (notificationType) {
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                for (const targetUser of finalTargetUsers) {
                    // Check duplicate
                    // Check duplicate
                    // Avoid composite index by querying only relatedId and filtering memory
                    const notifSnap = await adminDb.collection('notifications')
                        .where('relatedId', '==', req.id)
                        .get();

                    const duplicateExists = notifSnap.docs.some(d => {
                        const data = d.data();
                        const nDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                        return data.userId === targetUser.id &&
                            data.type === notificationType &&
                            nDate >= yesterday;
                    });

                    if (!duplicateExists) {
                        await adminDb.collection('notifications').add({
                            userId: targetUser.id,
                            type: notificationType,
                            title,
                            message,
                            relatedId: req.id,
                            isRead: false,
                            createdAt: new Date()
                        });
                        notificationsCreated++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            checked: activeRequests.length,
            notificationsCreated
        })

    } catch (error) {
        console.error('Error running notification check:', error)
        return NextResponse.json({ error: 'Failed to run notification check' }, { status: 500 })
    }
}
