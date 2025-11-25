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
        const locations = await prisma.location.findMany({
            include: {
                region: true
            },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(locations)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, address, regionId } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const newLocation = await prisma.location.create({
            data: {
                name,
                address,
                regionId: regionId || null
            }
        })

        return NextResponse.json(newLocation)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
