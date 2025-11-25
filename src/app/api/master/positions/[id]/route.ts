import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { name, description } = body

        const updatedPosition = await prisma.position.update({
            where: { id },
            data: {
                name,
                description: description || null
            }
        })

        return NextResponse.json(updatedPosition)
    } catch (error: any) {
        console.error('Error updating position:', error)

        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Position name already exists' }, { status: 400 })
        }

        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 })
        }

        return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        // Check if position is used by any user
        const userCount = await prisma.user.count({
            where: { positionId: id }
        })

        if (userCount > 0) {
            return NextResponse.json({ error: `Cannot delete: Position is assigned to ${userCount} employees` }, { status: 400 })
        }

        await prisma.position.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting position:', error)
        return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
    }
}
