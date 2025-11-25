import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)

    // Only ADMIN and MANAGER can activate accounts
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { isActive } = body

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error: any) {
        console.error('Error updating user activation status:', error)

        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ error: 'Failed to update activation status' }, { status: 500 })
    }
}
