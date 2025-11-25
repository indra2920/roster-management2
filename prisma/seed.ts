import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'password123', // In real app, hash this!
      role: 'ADMIN',
      isActive: true,
    },
  })

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      name: 'Manager User',
      password: 'password123',
      role: 'MANAGER',
      isActive: true,
    },
  })

  // Create Employee
  const employee = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: {
      email: 'employee@example.com',
      name: 'Employee User',
      password: 'password123',
      role: 'EMPLOYEE',
      managerId: manager.id,
      isActive: true,
    },
  })

  console.log({ admin, manager, employee })
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
