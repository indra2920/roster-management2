import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const positions = await prisma.position.findMany()
    console.log('Positions in database:')
    positions.forEach(p => {
        console.log(`- ID: ${p.id}, Name: '${p.name}'`)
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
