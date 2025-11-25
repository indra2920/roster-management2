import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedSettings() {
    console.log('Seeding default settings...')

    const settings = [
        {
            key: 'MAX_ONSITE_DAYS',
            value: '30',
            description: 'Maksimal durasi onsite dalam hari'
        },
        {
            key: 'MAX_OFFSITE_DAYS',
            value: '14',
            description: 'Maksimal durasi offsite dalam hari'
        },
        {
            key: 'SUPERVISOR_DELEGATION_REQUIRED',
            value: 'true',
            description: 'Apakah supervisor perlu delegasi saat offsite'
        }
    ]

    for (const setting of settings) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting
        })
    }

    console.log('Settings seeded successfully!')
}

seedSettings()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
