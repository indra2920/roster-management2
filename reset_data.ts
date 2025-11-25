
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import util from 'util'

const prisma = new PrismaClient()
const execPromise = util.promisify(exec)

async function main() {
    console.log('⚠️  STARTING FULL DATABASE RESET ⚠️')
    console.log('This will delete ALL data from the database.')

    try {
        // 1. Delete transactional data (child tables first)
        console.log('Deleting Approvals...')
        await prisma.approval.deleteMany({})

        console.log('Deleting Requests...')
        await prisma.request.deleteMany({})

        // 2. Delete Users (must be done before master data)
        console.log('Deleting Users...')
        await prisma.user.deleteMany({})

        // 3. Delete Master Data (child tables first)
        console.log('Deleting Locations...')
        await prisma.location.deleteMany({})

        console.log('Deleting Regions...')
        await prisma.region.deleteMany({})

        console.log('Deleting Positions...')
        await prisma.position.deleteMany({})

        console.log('✅ All data deleted successfully.')

        // 4. Re-seed the database
        console.log('🌱 Re-seeding database with default users...')
        await execPromise('npx prisma db seed')
        console.log('✅ Database seeded successfully.')

    } catch (error) {
        console.error('❌ Error resetting database:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
