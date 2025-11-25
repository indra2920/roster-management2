import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get requests where the current user is the manager of the requester
    // and status is PENDING
    try {
        let whereClause: any = {
            status: 'PENDING'
        }

        // If MANAGER, only show requests from their subordinates
        // If ADMIN, show all pending requests
        if (session.user.role === 'MANAGER') {
            whereClause.user = {
                managerId: session.user.id
            }
        } else if (session.user.role !== 'ADMIN') {
            // If not MANAGER or ADMIN, return empty array
            return NextResponse.json([])
        }

        const pendingRequests = await prisma.request.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        })
        return NextResponse.json(pendingRequests)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        console.log('❌ No session found')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { requestId, status, comment } = await request.json()
        console.log('📝 Approval request:', { requestId, status, comment, userId: session.user.id, userRole: session.user.role })

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            console.log('❌ Invalid status:', status)
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Verify that the current user is indeed the manager (or admin)
        const requestToUpdate = await prisma.request.findUnique({
            where: { id: requestId },
            include: { user: true }
        })

        console.log('🔍 Request found:', requestToUpdate ? {
            id: requestToUpdate.id,
            userId: requestToUpdate.userId,
            managerId: requestToUpdate.user.managerId,
            currentStatus: requestToUpdate.status
        } : 'NOT FOUND')

        if (!requestToUpdate) {
            console.log('❌ Request not found:', requestId)
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        if (requestToUpdate.user.managerId !== session.user.id && session.user.role !== 'ADMIN') {
            console.log('❌ Forbidden - managerId:', requestToUpdate.user.managerId, 'sessionId:', session.user.id, 'role:', session.user.role)
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        console.log('✅ Authorization passed, updating request...')

        // Transaction to update request status and create approval record
        const result = await prisma.$transaction([
            prisma.request.update({
                where: { id: requestId },
                data: { status }
            }),
            prisma.approval.create({
                data: {
                    requestId,
                    approverId: session.user.id,
                    status,
                    comment
                }
            })
        ])

        console.log('✅ Transaction completed:', result)
        return NextResponse.json(result)
    } catch (error) {
        console.error('❌ Error processing approval:', error)
        return NextResponse.json({
            error: 'Failed to process approval',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
