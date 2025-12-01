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
        const now = new Date()

        // Build user filter based on role
        let userFilter: any = {}
        if (session.user.role === 'MANAGER') {
            userFilter = { managerId: session.user.id }
        }

        // 1. Total Employees (Active)
        const totalEmployees = await prisma.user.count({
            where: { isActive: true, role: 'EMPLOYEE', ...userFilter }
        })

        // 2. Pending Requests (where user is manager)
        const pendingRequests = await prisma.request.count({
            where: {
                status: 'PENDING',
                user: userFilter
            }
        })

        // 3. Approved Requests (Current Month)
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const approvedRequests = await prisma.approval.count({
            where: {
                status: 'APPROVED',
                createdAt: { gte: firstDayOfMonth }
            }
        })

        // 4. Requests by Type (All time)
        const onsiteCount = await prisma.request.count({ where: { type: 'ONSITE' } })
        const offsiteCount = await prisma.request.count({ where: { type: 'OFFSITE' } })

        // 5. Requests by Status
        const approvedCount = await prisma.request.count({ where: { status: 'APPROVED' } })
        const rejectedCount = await prisma.request.count({ where: { status: 'REJECTED' } })
        const pendingCount = await prisma.request.count({ where: { status: 'PENDING' } })

        // 6. Active Personnel (Currently Onsite/Offsite)
        const activeRequests = await prisma.request.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: now },
                endDate: { gte: now },
                user: userFilter
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { startDate: 'asc' }
        })

        // Calculate duration for each request
        const calculateDuration = (startDate: Date) => {
            const start = new Date(startDate)
            const diffTime = Math.abs(now.getTime() - start.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays
        }

        // Separate into onsite and offsite
        const onsitePersonnel = activeRequests
            .filter(r => r.type === 'ONSITE')
            .map(req => ({
                requestId: req.id,
                userId: req.user.id,
                userName: req.user.name,
                userEmail: req.user.email,
                startDate: req.startDate,
                endDate: req.endDate,
                durationDays: calculateDuration(req.startDate),
                reason: req.reason
            }))

        const offsitePersonnel = activeRequests
            .filter(r => r.type === 'OFFSITE')
            .map(req => ({
                requestId: req.id,
                userId: req.user.id,
                userName: req.user.name,
                userEmail: req.user.email,
                startDate: req.startDate,
                endDate: req.endDate,
                durationDays: calculateDuration(req.startDate),
                reason: req.reason
            }))

        // 7. Monthly Trends (Last 6 Months)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
        sixMonthsAgo.setDate(1) // Start of the month

        const requestsLast6Months = await prisma.request.findMany({
            where: {
                createdAt: { gte: sixMonthsAgo },
                user: userFilter
            },
            select: {
                createdAt: true,
                type: true
            }
        })

        const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - (5 - i))
            return {
                name: d.toLocaleString('default', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                Onsite: 0,
                Offsite: 0,
                Total: 0
            }
        })

        requestsLast6Months.forEach(req => {
            const month = req.createdAt.getMonth()
            const year = req.createdAt.getFullYear()
            const trend = monthlyTrends.find(t => t.month === month && t.year === year)
            if (trend) {
                if (req.type === 'ONSITE') trend.Onsite++
                else if (req.type === 'OFFSITE') trend.Offsite++
                trend.Total++
            }
        })

        // 8. Top Reasons (All time)
        const allRequests = await prisma.request.findMany({
            where: { user: userFilter },
            select: { reason: true }
        })

        const reasonCounts: { [key: string]: number } = {}
        allRequests.forEach(req => {
            const reason = req.reason.trim()
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
        })

        const topReasons = Object.entries(reasonCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)

        // 9. Requests by Location (All time)
        const requestsByLocationRaw = await prisma.request.findMany({
            where: { user: userFilter },
            include: {
                user: {
                    include: {
                        location: true
                    }
                }
            }
        })

        const locationCounts: { [key: string]: number } = {}
        requestsByLocationRaw.forEach(req => {
            const locationName = req.user.location?.name || 'Unknown'
            locationCounts[locationName] = (locationCounts[locationName] || 0) + 1
        })

        const requestsByLocation = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

        // 10. Requests by Region (All time)
        const requestsByRegionRaw = await prisma.request.findMany({
            where: { user: userFilter },
            include: {
                user: {
                    include: {
                        region: true
                    }
                }
            }
        })

        const regionCounts: { [key: string]: number } = {}
        requestsByRegionRaw.forEach(req => {
            const regionName = req.user.region?.name || 'Unknown'
            regionCounts[regionName] = (regionCounts[regionName] || 0) + 1
        })

        const requestsByRegion = Object.entries(regionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)

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
            ],
            activePersonnel: {
                onsite: {
                    count: onsitePersonnel.length,
                    personnel: onsitePersonnel
                },
                offsite: {
                    count: offsitePersonnel.length,
                    personnel: offsitePersonnel
                }
            },
            monthlyTrends,
            topReasons,
            requestsByLocation,
            requestsByRegion
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
