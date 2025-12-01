import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    try {
        // If no table specified, return list of tables
        if (!table) {
            const tables = [
                { name: 'User', description: 'User accounts and profiles' },
                { name: 'Position', description: 'Job positions' },
                { name: 'Location', description: 'Work locations' },
                { name: 'Region', description: 'Work regions' },
                { name: 'Request', description: 'Onsite/Offsite requests' },
                { name: 'Approval', description: 'Request approvals' },
                { name: 'Setting', description: 'System settings' },
                { name: 'Delegation', description: 'Request delegations' },
                { name: 'Notification', description: 'User notifications' },
            ]
            return NextResponse.json({ tables })
        }

        // Fetch data from specified table
        let data: any[] = []
        let total = 0

        switch (table) {
            case 'User':
                data = await prisma.user.findMany({
                    skip,
                    take: limit,
                    include: {
                        position: { select: { name: true } },
                        location: { select: { name: true } },
                        region: { select: { name: true } },
                        manager: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                })
                total = await prisma.user.count()
                break

            case 'Position':
                data = await prisma.position.findMany({
                    skip,
                    take: limit,
                    orderBy: { name: 'asc' }
                })
                total = await prisma.position.count()
                break

            case 'Location':
                data = await prisma.location.findMany({
                    skip,
                    take: limit,
                    include: {
                        region: { select: { name: true } }
                    },
                    orderBy: { name: 'asc' }
                })
                total = await prisma.location.count()
                break

            case 'Region':
                data = await prisma.region.findMany({
                    skip,
                    take: limit,
                    orderBy: { name: 'asc' }
                })
                total = await prisma.region.count()
                break

            case 'Request':
                data = await prisma.request.findMany({
                    skip,
                    take: limit,
                    include: {
                        user: { select: { name: true, email: true } },
                        nextApproverPosition: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                })
                total = await prisma.request.count()
                break

            case 'Approval':
                data = await prisma.approval.findMany({
                    skip,
                    take: limit,
                    include: {
                        request: { select: { type: true } },
                        approver: { select: { name: true, email: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                })
                total = await prisma.approval.count()
                break

            case 'Setting':
                data = await prisma.setting.findMany({
                    skip,
                    take: limit,
                    orderBy: { key: 'asc' }
                })
                total = await prisma.setting.count()
                break

            case 'Delegation':
                data = await prisma.delegation.findMany({
                    skip,
                    take: limit,
                    include: {
                        request: { select: { type: true } },
                        delegateUser: { select: { name: true } },
                        delegatorUser: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                })
                total = await prisma.delegation.count()
                break

            case 'Notification':
                data = await prisma.notification.findMany({
                    skip,
                    take: limit,
                    include: {
                        user: { select: { name: true, email: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                })
                total = await prisma.notification.count()
                break

            default:
                return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
        }

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Database API error:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
}
