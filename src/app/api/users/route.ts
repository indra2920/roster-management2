import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                position: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
                region: { select: { id: true, name: true } },
                manager: {
                    select: { name: true }
                },
                isActive: true
            },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, email, password, role, positionId, locationId, regionId, managerId } = body

        // Basic validation
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password, // In real app, hash this!
                role: role || 'EMPLOYEE',
                positionId: positionId || null,
                locationId: locationId || null,
                regionId: regionId || null,
                managerId: managerId || null
            }
        })

        return NextResponse.json(newUser)
    } catch (error: any) {
        console.error('Error creating user:', error)

        // Handle Prisma unique constraint violation
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }

        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}
