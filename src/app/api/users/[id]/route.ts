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
        const { name, email, password, role, positionId, locationId, regionId, managerId } = body

        const updateData: any = {
            name,
            email,
            role,
            positionId: positionId || null,
            locationId: locationId || null,
            regionId: regionId || null,
            managerId: managerId || null
        }

        if (password) {
            updateData.password = password // In production, hash this password!
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(updatedUser)
    } catch (error: any) {
        console.error('Error updating user:', error)

        // Handle Prisma unique constraint violation
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }

        // Handle record not found
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}
