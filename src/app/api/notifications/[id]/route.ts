import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const { isRead } = await request.json()

        const notifRef = adminDb.collection('notifications').doc(id);
        const doc = await notifRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const data = doc.data();
        if (data?.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await notifRef.update({ isRead });

        return NextResponse.json({ id, ...data, isRead })
    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }
}
