import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding settings...')

    const settings = [
        {
            key: 'MAX_ONSITE_DAYS',
            value: '5',
            description: 'Maximum allowed duration for onsite requests in days'
        },
        {
            key: 'MAX_OFFSITE_DAYS',
            value: '14',
            description: 'Maximum allowed duration for offsite requests in days'
        }
    ]

    for (const setting of settings) {
        const upsertedSetting = await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting,
        })
        console.log(`Upserted setting: ${upsertedSetting.key}`)
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
