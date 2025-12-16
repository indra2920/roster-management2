import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const notificationsRef = adminDb.collection('notifications');
        // REMOVED orderBy('createdAt', 'desc') to avoid Composite Index requirement
        const query = notificationsRef
            .where('userId', '==', session.user.id)
            .limit(50); // Fetch slightly more to ensure top 20 are likely included if vaguely sorted, but mainly to cap read costs

        const snapshot = await query.get();
        let notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }));

        // In-Memory Sort
        notifications.sort((a, b) => {
            const tA = new Date(a.createdAt || 0).getTime();
            const tB = new Date(b.createdAt || 0).getTime();
            return tB - tA;
        });

        // Limit to 20
        notifications = notifications.slice(0, 20);

        return NextResponse.json(notifications)
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
}
