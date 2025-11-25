
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Cleaning up test data...')

    const namesToDelete = ['Test Delete UI', 'Test Delete UI Retry', 'VERIFICATION_TEST_POSITION']

    const deleted = await prisma.position.deleteMany({
        where: {
            name: {
                in: namesToDelete
            }
        }
    })

    console.log(`Deleted ${deleted.count} test positions.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
