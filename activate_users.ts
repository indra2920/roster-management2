import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Activating all seeded users...')

    const emails = ['admin@example.com', 'manager@example.com', 'employee@example.com']

    for (const email of emails) {
        const updated = await prisma.user.update({
            where: { email },
            data: { isActive: true }
        })
        console.log(`✅ Activated: ${updated.email} (${updated.role})`)
    }

    console.log('\n✅ All users activated!')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
