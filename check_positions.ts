import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const positions = await prisma.position.findMany()
    console.log('Positions:', positions)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
