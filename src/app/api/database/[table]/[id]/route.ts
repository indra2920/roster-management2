import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ table: string; id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { table, id } = await params
        const body = await request.json()

        // Remove id from update data
        const { id: _, ...updateData } = body

        let result: any

        switch (table) {
            case 'User':
                result = await prisma.user.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Position':
                result = await prisma.position.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Location':
                result = await prisma.location.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Region':
                result = await prisma.region.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Request':
                result = await prisma.request.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Approval':
                result = await prisma.approval.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Setting':
                result = await prisma.setting.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Delegation':
                result = await prisma.delegation.update({
                    where: { id },
                    data: updateData
                })
                break

            case 'Notification':
                result = await prisma.notification.update({
                    where: { id },
                    data: updateData
                })
                break

            default:
                return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Database update error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to update record'
        }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ table: string; id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { table, id } = await params

        switch (table) {
            case 'User':
                await prisma.user.delete({ where: { id } })
                break

            case 'Position':
                await prisma.position.delete({ where: { id } })
                break

            case 'Location':
                await prisma.location.delete({ where: { id } })
                break

            case 'Region':
                await prisma.region.delete({ where: { id } })
                break

            case 'Request':
                await prisma.request.delete({ where: { id } })
                break

            case 'Approval':
                await prisma.approval.delete({ where: { id } })
                break

            case 'Setting':
                await prisma.setting.delete({ where: { id } })
                break

            case 'Delegation':
                await prisma.delegation.delete({ where: { id } })
                break

            case 'Notification':
                await prisma.notification.delete({ where: { id } })
                break

            default:
                return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Database delete error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to delete record'
        }, { status: 500 })
    }
}
