import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const now = new Date()

    // Find an employee
    const employee = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } })
    if (!employee) {
        console.error('No employee found')
        return
    }

    // 1. Create Request Exceeding Limit (e.g., 20 days ago)
    const startDateExceeded = new Date()
    startDateExceeded.setDate(startDateExceeded.getDate() - 20)
    const endDateExceeded = new Date()
    endDateExceeded.setDate(endDateExceeded.getDate() + 5)

    await prisma.request.create({
        data: {
            userId: employee.id,
            type: 'ONSITE',
            startDate: startDateExceeded,
            endDate: endDateExceeded,
            reason: 'Test Exceeded Limit',
            status: 'APPROVED',
            currentApprovalLevel: 3,
            requestLat: 0,
            requestLong: 0
        }
    })
    console.log('Created request exceeding limit')

    // 2. Create Request Approaching Limit (e.g., 12 days ago, limit is 14)
    const startDateWarning = new Date()
    startDateWarning.setDate(startDateWarning.getDate() - 12)
    const endDateWarning = new Date()
    endDateWarning.setDate(endDateWarning.getDate() + 5)

    await prisma.request.create({
        data: {
            userId: employee.id,
            type: 'OFFSITE',
            startDate: startDateWarning,
            endDate: endDateWarning,
            reason: 'Test Warning Limit',
            status: 'APPROVED',
            currentApprovalLevel: 3,
            requestLat: 0,
            requestLong: 0
        }
    })
    console.log('Created request approaching limit')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
