import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find user with role MANAGER or email containing 'manager'
    const managers = await prisma.user.findMany({
        where: {
            OR: [
                { role: 'MANAGER' },
                { email: { contains: 'manager' } }
            ]
        },
        include: {
            position: true
        }
    })

    console.log('Manager Users found:', managers.length)
    managers.forEach(m => {
        console.log(`- Name: ${m.name}, Email: ${m.email}, Role: ${m.role}, Position: ${m.position?.name || 'NONE'} (ID: ${m.positionId})`)
    })

    // Also list the Manager position to get its ID
    const managerPos = await prisma.position.findFirst({
        where: { name: { contains: 'Manager' } }
    })
    console.log('Manager Position in DB:', managerPos ? `${managerPos.name} (${managerPos.id})` : 'NOT FOUND')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
