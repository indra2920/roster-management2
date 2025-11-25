import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 1. Total Employees (Active)
        const totalEmployees = await prisma.user.count({
            where: { isActive: true, role: 'EMPLOYEE' }
        })

        // 2. Pending Requests (where user is manager)
        const pendingRequests = await prisma.request.count({
            where: {
                status: 'PENDING',
                user: { managerId: session.user.id }
            }
        })

        // 3. Approved Requests (Current Month)
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const approvedRequests = await prisma.approval.count({
            where: {
                status: 'APPROVED',
                createdAt: { gte: firstDayOfMonth }
            }
        })

        // 4. Requests by Type (All time or recent?) -> Let's do all time for now or last 30 days
        // Group by is better but sqlite support in prisma has limitations sometimes, let's try simple count
        const onsiteCount = await prisma.request.count({ where: { type: 'ONSITE' } })
        const offsiteCount = await prisma.request.count({ where: { type: 'OFFSITE' } })

        // 5. Requests by Status
        const approvedCount = await prisma.request.count({ where: { status: 'APPROVED' } })
        const rejectedCount = await prisma.request.count({ where: { status: 'REJECTED' } })
        const pendingCount = await prisma.request.count({ where: { status: 'PENDING' } })

        return NextResponse.json({
            totalEmployees,
            pendingRequests,
            approvedRequests,
            requestsByType: [
                { name: 'Onsite', value: onsiteCount },
                { name: 'Offsite', value: offsiteCount }
            ],
            requestsByStatus: [
                { name: 'Approved', value: approvedCount },
                { name: 'Rejected', value: rejectedCount },
                { name: 'Pending', value: pendingCount }
            ]
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
