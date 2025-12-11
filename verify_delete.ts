
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting verification...')

    // 1. Create a test position
    const testPosition = await prisma.position.create({
        data: {
            name: 'VERIFICATION_TEST_POSITION',
            description: 'Temporary position for verification'
        }
    })
    console.log(`Created position: ${testPosition.name} (${testPosition.id})`)

    // 2. Verify it exists
    const exists = await prisma.position.findUnique({
        where: { id: testPosition.id }
    })
    if (!exists) {
        console.error('ERROR: Position not found immediately after creation!')
        return
    }
    console.log('Position confirmed in database.')

    // 3. Delete it
    await prisma.position.delete({
        where: { id: testPosition.id }
    })
    console.log('Executed delete operation.')

    // 4. Verify it is gone
    const gone = await prisma.position.findUnique({
        where: { id: testPosition.id }
    })

    if (gone) {
        console.error('ERROR: Position still exists after delete!')
    } else {
        console.log('SUCCESS: Position successfully deleted from database.')
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
