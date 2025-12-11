import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { isActive } = body

        const userRef = adminDb.collection('users').doc(id);

        await userRef.update({
            isActive: isActive,
            updatedAt: new Date()
        });

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error activating user:', error)
        return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
    }
}
