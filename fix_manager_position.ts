import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Get Manager position
    const managerPos = await prisma.position.findFirst({
        where: { name: { contains: 'Manager' } }
    })

    if (!managerPos) {
        console.error('Manager position not found!')
        return
    }

    // Update Manager user
    const updatedUser = await prisma.user.updateMany({
        where: {
            role: 'MANAGER',
            positionId: null
        },
        data: {
            positionId: managerPos.id
        }
    })

    console.log(`Updated ${updatedUser.count} manager users with position ${managerPos.name} (${managerPos.id})`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
