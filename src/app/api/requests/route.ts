import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    try {
        // Build where clause based on user role
        const whereClause: any = {
            ...(start && end ? {
                startDate: { gte: new Date(start) },
                endDate: { lte: new Date(end) }
            } : {})
        }

        // If user is EMPLOYEE, only show their own requests
        // If user is MANAGER or ADMIN, show all requests
        if (session.user.role === 'EMPLOYEE') {
            whereClause.userId = session.user.id
        }

        const requests = await prisma.request.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, email: true }
                },
                approvals: {
                    include: {
                        approver: {
                            select: { name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { startDate: 'asc' }
        })
        return NextResponse.json(requests)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { type, startDate, endDate, reason, justification, requestLat, requestLong } = body

        // Basic validation
        if (!type || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get user's position to determine approval flow
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { position: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Determine next approver based on requester's position
        let nextApproverPositionId: string | null = null
        let currentApprovalLevel = 0

        // Get position IDs for approval hierarchy
        const gslPosition = await prisma.position.findFirst({ where: { name: { contains: 'GSL' } } })
        const koordinatorPosition = await prisma.position.findFirst({ where: { name: { contains: 'Koordinator' } } })
        const managerPosition = await prisma.position.findFirst({ where: { name: 'Manager' } })

        const userPositionName = user.position?.name || ''

        if (userPositionName.includes('SOS')) {
            // SOS → GSL → Koordinator → Manager
            nextApproverPositionId = gslPosition?.id || null
            currentApprovalLevel = 1
        } else if (userPositionName.includes('GSL')) {
            // GSL → Koordinator → Manager
            nextApproverPositionId = koordinatorPosition?.id || null
            currentApprovalLevel = 2
        } else if (userPositionName.toLowerCase().includes('koordinator')) {
            // Koordinator → Manager
            nextApproverPositionId = managerPosition?.id || null
            currentApprovalLevel = 3
        } else {
            // Other positions → Manager directly
            nextApproverPositionId = managerPosition?.id || null
            currentApprovalLevel = 3
        }

        const newRequest = await prisma.request.create({
            data: {
                userId: session.user.id,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                justification: justification || null,
                requestLat: requestLat || null,
                requestLong: requestLong || null,
                status: 'PENDING',
                nextApproverPositionId,
                currentApprovalLevel
            }
        })

        // Check duration and notify manager if exceeded
        const start = new Date(startDate)
        const end = new Date(endDate)
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        const settingKey = type === 'ONSITE' ? 'MAX_ONSITE_DAYS' : 'MAX_OFFSITE_DAYS'
        const setting = await prisma.setting.findUnique({ where: { key: settingKey } })

        if (setting && durationDays > parseInt(setting.value)) {
            // Get user's manager
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { managerId: true, name: true }
            })

            if (user && user.managerId) {
                await prisma.notification.create({
                    data: {
                        userId: user.managerId,
                        type: 'DURATION_EXCEEDED',
                        title: 'Durasi Pengajuan Melebihi Batas',
                        message: `Pengajuan ${type} oleh ${user.name} selama ${durationDays} hari melebihi batas ${setting.value} hari.`,
                        relatedId: newRequest.id
                    }
                })
            }
        }

        return NextResponse.json(newRequest)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
}
