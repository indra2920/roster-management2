import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    // Public access for registration
    // const session = await getServerSession(authOptions)
    // if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    try {
        const positions = await prisma.position.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(positions)
    } catch (error) {
        console.error('Error fetching positions:', error)
        return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const newPosition = await prisma.position.create({
            data: {
                name,
                description: description || null
            }
        })

        return NextResponse.json(newPosition)
    } catch (error: any) {
        console.error('Error creating position:', error)

        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Position name already exists' }, { status: 400 })
        }

        return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
    }
}
