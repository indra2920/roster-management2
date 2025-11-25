import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Checking User-Manager Relationships ===\n')

    // Get all users with their manager info
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            managerId: true,
            manager: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            }
        }
    })

    console.log('📋 All Users:')
    users.forEach(user => {
        console.log(`\n👤 ${user.name} (${user.email})`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Manager ID: ${user.managerId || 'NULL'}`)
        if (user.manager) {
            console.log(`   Manager: ${user.manager.name} (${user.manager.email}) - ${user.manager.role}`)
        }
    })

    console.log('\n\n=== Checking Pending Requests ===\n')

    // Get pending requests with user and manager info
    const pendingRequests = await prisma.request.findMany({
        where: { status: 'PENDING' },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    managerId: true,
                    manager: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                }
            }
        }
    })

    console.log(`Found ${pendingRequests.length} pending requests:\n`)
    pendingRequests.forEach((req, index) => {
        console.log(`\n📝 Request #${index + 1}:`)
        console.log(`   Request ID: ${req.id}`)
        console.log(`   Type: ${req.type}`)
        console.log(`   Requester: ${req.user.name} (${req.user.email})`)
        console.log(`   Requester ID: ${req.user.id}`)
        console.log(`   Manager ID: ${req.user.managerId || 'NULL'}`)
        if (req.user.manager) {
            console.log(`   Manager: ${req.user.manager.name} (${req.user.manager.email}) - ${req.user.manager.role}`)
        } else {
            console.log(`   ⚠️  NO MANAGER ASSIGNED!`)
        }
    })
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
