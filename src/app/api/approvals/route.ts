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
        // Fetch current user with position info
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { positionId: true, role: true }
        })

        // Check if user has approval rights (has a position OR is ADMIN OR is MANAGER)
        const hasApprovalRights = currentUser?.positionId || session.user.role === 'ADMIN' || session.user.role === 'MANAGER'

        if (!hasApprovalRights) {
            // No approval rights, return empty array
            return NextResponse.json([])
        }

        let whereClause: any = {
            status: 'PENDING'
        }

        // Filter by nextApproverPositionId to show only requests assigned to this position
        if (session.user.role === 'ADMIN') {
            // ADMIN sees all pending requests
        } else if (session.user.role === 'MANAGER') {
            // Special handling for MANAGER role
            // If user has positionId, use it. If not, find the "Manager" position ID
            let managerPositionId = currentUser?.positionId

            if (!managerPositionId) {
                const managerPos = await prisma.position.findFirst({ where: { name: { contains: 'Manager' } } })
                managerPositionId = managerPos?.id
            }

            if (managerPositionId) {
                whereClause.nextApproverPositionId = managerPositionId
            }
        } else if (currentUser?.positionId) {
            whereClause.nextApproverPositionId = currentUser.positionId
        }
        // ADMIN sees all pending requests

        const pendingRequests = await prisma.request.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, email: true, position: { select: { name: true } } }
                },
                nextApproverPosition: {
                    select: { name: true }
                },
                approvals: {
                    include: {
                        approver: {
                            select: { name: true, position: { select: { name: true } } }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
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
        const { requestId, status, comment, approvalLat, approvalLong } = await request.json()
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

        // Fetch current user with position info
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { positionId: true, role: true }
        })

        // Check authorization: user must have a position OR be ADMIN
        const hasApprovalRights = currentUser?.positionId || session.user.role === 'ADMIN'

        if (!hasApprovalRights) {
            console.log('❌ Forbidden - no position or admin role')
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        console.log('✅ Authorization passed, updating request...')

        // Get position IDs for approval hierarchy
        const gslPosition = await prisma.position.findFirst({ where: { name: { contains: 'GSL' } } })
        const koordinatorPosition = await prisma.position.findFirst({ where: { name: { contains: 'Koordinator' } } })
        const managerPosition = await prisma.position.findFirst({ where: { name: 'Manager' } })

        // Determine next approver and new level based on current level
        let nextApproverPositionId: string | null = null
        let newApprovalLevel = requestToUpdate.currentApprovalLevel
        let finalStatus = status

        if (status === 'APPROVED') {
            // Progress to next level
            if (requestToUpdate.currentApprovalLevel === 1) {
                // GSL approved, move to Koordinator
                nextApproverPositionId = koordinatorPosition?.id || null
                newApprovalLevel = 2
                finalStatus = 'PENDING' // Still pending at next level
            } else if (requestToUpdate.currentApprovalLevel === 2) {
                // Koordinator approved, move to Manager
                nextApproverPositionId = managerPosition?.id || null
                newApprovalLevel = 3
                finalStatus = 'PENDING' // Still pending at next level
            } else if (requestToUpdate.currentApprovalLevel === 3) {
                // Manager approved, final approval
                nextApproverPositionId = null
                finalStatus = 'APPROVED'
            }
        } else {
            // Rejected at any level - final rejection
            finalStatus = 'REJECTED'
            nextApproverPositionId = null
        }

        // Transaction to update request status and create approval record
        const result = await prisma.$transaction([
            prisma.request.update({
                where: { id: requestId },
                data: {
                    status: finalStatus,
                    currentApprovalLevel: newApprovalLevel,
                    nextApproverPositionId
                }
            }),
            prisma.approval.create({
                data: {
                    requestId,
                    approverId: session.user.id,
                    status,
                    comment,
                    approvalLevel: requestToUpdate.currentApprovalLevel,
                    approvalLat: approvalLat || null,
                    approvalLong: approvalLong || null
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
