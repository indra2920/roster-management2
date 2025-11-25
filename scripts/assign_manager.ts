import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Assigning Manager to Tomi ===\n')

    // Find the manager user
    const manager = await prisma.user.findUnique({
        where: { email: 'manager@example.com' }
    })

    if (!manager) {
        console.error('❌ Manager user not found!')
        return
    }

    console.log(`✅ Found manager: ${manager.name} (${manager.email}) - ID: ${manager.id}`)

    // Find Tomi
    const tomi = await prisma.user.findUnique({
        where: { email: 'tes@example.com' }
    })

    if (!tomi) {
        console.error('❌ Tomi user not found!')
        return
    }

    console.log(`✅ Found Tomi: ${tomi.name} (${tomi.email}) - ID: ${tomi.id}`)
    console.log(`   Current Manager ID: ${tomi.managerId || 'NULL'}`)

    // Update Tomi's manager
    const updated = await prisma.user.update({
        where: { id: tomi.id },
        data: { managerId: manager.id }
    })

    console.log(`\n✅ Successfully assigned manager to Tomi!`)
    console.log(`   New Manager ID: ${updated.managerId}`)

    // Verify pending requests can now be seen
    const pendingRequests = await prisma.request.findMany({
        where: {
            status: 'PENDING',
            user: {
                managerId: manager.id
            }
        },
        include: {
            user: {
                select: { name: true, email: true }
            }
        }
    })

    console.log(`\n📋 Pending requests for manager (${manager.name}): ${pendingRequests.length}`)
    pendingRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.type} - ${req.user.name} (${req.user.email})`)
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
