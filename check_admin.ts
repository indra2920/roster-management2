import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking admin user...')

    const admin = await prisma.user.findUnique({
        where: { email: 'admin@example.com' }
    })

    if (admin) {
        console.log('Admin user found:')
        console.log('- ID:', admin.id)
        console.log('- Name:', admin.name)
        console.log('- Email:', admin.email)
        console.log('- Role:', admin.role)
        console.log('- isActive:', admin.isActive)
        console.log('- Password:', admin.password)
    } else {
        console.log('Admin user NOT found!')
    }

    // List all users
    const allUsers = await prisma.user.findMany()
    console.log(`\nTotal users in database: ${allUsers.length}`)
    allUsers.forEach(u => {
        console.log(`- ${u.email} (${u.role}, isActive: ${u.isActive})`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
