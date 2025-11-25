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
        const regions = await prisma.region.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(regions)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const newRegion = await prisma.region.create({
            data: {
                name
            }
        })

        return NextResponse.json(newRegion)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create region' }, { status: 500 })
    }
}
