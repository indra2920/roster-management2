import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

        // Verify ownership
        const notification = await prisma.notification.findUnique({
            where: { id }
        })

        if (!notification || notification.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead }
        })

        return NextResponse.json(updated)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }
}
