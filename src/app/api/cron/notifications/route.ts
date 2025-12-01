import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        console.log('🔔 Running notification check...')
        const now = new Date()

        // 1. Get Settings for limits
        const maxOnsiteSetting = await prisma.setting.findUnique({ where: { key: 'MAX_ONSITE_DAYS' } })
        const maxOffsiteSetting = await prisma.setting.findUnique({ where: { key: 'MAX_OFFSITE_DAYS' } })

        const maxOnsiteDays = maxOnsiteSetting ? parseInt(maxOnsiteSetting.value) : 14
        const maxOffsiteDays = maxOffsiteSetting ? parseInt(maxOffsiteSetting.value) : 14

        // 2. Get Active Requests (Approved and currently active)
        const activeRequests = await prisma.request.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: now },
                endDate: { gte: now }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        position: { select: { name: true } }
                    }
                }
            }
        })

        // 3. Get Target Users for Notifications (Admin, Manager, Koordinator)
        const targetUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'ADMIN' },
                    { role: 'MANAGER' },
                    { position: { name: { contains: 'Koordinator' } } }
                ]
            },
            select: { id: true }
        })

        let notificationsCreated = 0

        for (const req of activeRequests) {
            const start = new Date(req.startDate)
            const diffTime = Math.abs(now.getTime() - start.getTime())
            const durationSoFar = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 because start date counts as day 1

            const limit = req.type === 'ONSITE' ? maxOnsiteDays : maxOffsiteDays
            const daysRemaining = limit - durationSoFar

            let notificationType: 'DURATION_EXCEEDED' | 'DURATION_WARNING' | null = null
            let title = ''
            let message = ''

            if (durationSoFar > limit) {
                notificationType = 'DURATION_EXCEEDED'
                title = `⚠️ Batas Durasi Terlampaui: ${req.user.name}`
                message = `${req.user.name} (${req.type}) telah melewati batas durasi ${limit} hari. Durasi saat ini: ${durationSoFar} hari.`
            } else if (daysRemaining <= 3 && daysRemaining >= 0) {
                notificationType = 'DURATION_WARNING'
                title = `⚠️ Peringatan Batas Durasi: ${req.user.name}`
                message = `${req.user.name} (${req.type}) mendekati batas durasi. Sisa waktu: ${daysRemaining} hari.`
            }

            if (notificationType) {
                // Check if similar notification exists created in last 24 hours to avoid spam
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

                // For each target user, check and create notification
                for (const targetUser of targetUsers) {
                    const existingNotif = await prisma.notification.findFirst({
                        where: {
                            userId: targetUser.id,
                            relatedId: req.id,
                            type: notificationType,
                            createdAt: { gte: yesterday }
                        }
                    })

                    if (!existingNotif) {
                        await prisma.notification.create({
                            data: {
                                userId: targetUser.id,
                                type: notificationType,
                                title,
                                message,
                                relatedId: req.id,
                                isRead: false
                            }
                        })
                        notificationsCreated++
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            checked: activeRequests.length,
            notificationsCreated
        })

    } catch (error) {
        console.error('Error running notification check:', error)
        return NextResponse.json({ error: 'Failed to run notification check' }, { status: 500 })
    }
}
