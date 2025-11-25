import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit to recent 20
        })
        return NextResponse.json(notifications)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
}
