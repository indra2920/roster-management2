import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding master data...')

    // Create Regions
    const regions = await Promise.all([
        prisma.region.upsert({
            where: { id: 'region-jakarta' },
            update: {},
            create: { id: 'region-jakarta', name: 'Jakarta' }
        }),
        prisma.region.upsert({
            where: { id: 'region-bandung' },
            update: {},
            create: { id: 'region-bandung', name: 'Bandung' }
        }),
        prisma.region.upsert({
            where: { id: 'region-surabaya' },
            update: {},
            create: { id: 'region-surabaya', name: 'Surabaya' }
        })
    ])
    console.log(`✅ Created ${regions.length} regions`)

    // Create Locations
    const locations = await Promise.all([
        prisma.location.upsert({
            where: { id: 'loc-jakarta-pusat' },
            update: {},
            create: {
                id: 'loc-jakarta-pusat',
                name: 'Jakarta Pusat',
                address: 'Jl. Sudirman No. 1',
                regionId: 'region-jakarta'
            }
        }),
        prisma.location.upsert({
            where: { id: 'loc-jakarta-selatan' },
            update: {},
            create: {
                id: 'loc-jakarta-selatan',
                name: 'Jakarta Selatan',
                address: 'Jl. TB Simatupang',
                regionId: 'region-jakarta'
            }
        }),
        prisma.location.upsert({
            where: { id: 'loc-bandung-kota' },
            update: {},
            create: {
                id: 'loc-bandung-kota',
                name: 'Bandung Kota',
                address: 'Jl. Asia Afrika',
                regionId: 'region-bandung'
            }
        }),
        prisma.location.upsert({
            where: { id: 'loc-surabaya-pusat' },
            update: {},
            create: {
                id: 'loc-surabaya-pusat',
                name: 'Surabaya Pusat',
                address: 'Jl. Tunjungan',
                regionId: 'region-surabaya'
            }
        })
    ])
    console.log(`✅ Created ${locations.length} locations`)

    // Create Positions
    const positions = await Promise.all([
        prisma.position.upsert({
            where: { id: 'pos-manager' },
            update: {},
            create: {
                id: 'pos-manager',
                name: 'Manager',
                description: 'Manajer departemen'
            }
        }),
        prisma.position.upsert({
            where: { id: 'pos-staff' },
            update: {},
            create: {
                id: 'pos-staff',
                name: 'Staff',
                description: 'Staff operasional'
            }
        }),
        prisma.position.upsert({
            where: { id: 'pos-supervisor' },
            update: {},
            create: {
                id: 'pos-supervisor',
                name: 'Supervisor',
                description: 'Supervisor tim'
            }
        }),
        prisma.position.upsert({
            where: { id: 'pos-admin' },
            update: {},
            create: {
                id: 'pos-admin',
                name: 'Admin',
                description: 'Administrator'
            }
        })
    ])
    console.log(`✅ Created ${positions.length} positions`)

    console.log('✅ Master data seeding completed!')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
