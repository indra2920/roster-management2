import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Creating GSL test user...')

    // First, ensure GSL position exists
    const gslPosition = await prisma.position.upsert({
        where: { id: 'pos-gsl' },
        update: {},
        create: {
            id: 'pos-gsl',
            name: 'GSL',
            description: 'Group Shift Leader',
            level: 2
        }
    })
    console.log('✅ GSL position ready:', gslPosition.name)

    // Create GSL user
    const gslUser = await prisma.user.upsert({
        where: { email: 'gsl@example.com' },
        update: {
            positionId: gslPosition.id,
            isActive: true
        },
        create: {
            email: 'gsl@example.com',
            name: 'GSL User',
            password: 'password123',
            role: 'EMPLOYEE',
            positionId: gslPosition.id,
            isActive: true
        }
    })
    console.log('✅ GSL user created:', gslUser.email)

    console.log('✅ Setup completed!')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
