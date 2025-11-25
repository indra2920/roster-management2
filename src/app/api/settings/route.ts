import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const settings = await prisma.setting.findMany()

        // Convert to key-value object for easier use
        const settingsObj = settings.reduce((acc, setting) => {
            acc[setting.key] = {
                value: setting.value,
                description: setting.description
            }
            return acc
        }, {} as Record<string, { value: string, description: string | null }>)

        return NextResponse.json(settingsObj)
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions)

    // Only ADMIN can update settings
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { settings } = body // { key: value }

        // Update each setting
        const updates = Object.entries(settings).map(([key, value]) =>
            prisma.setting.upsert({
                where: { key },
                update: { value: value as string },
                create: { key, value: value as string }
            })
        )

        await Promise.all(updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
