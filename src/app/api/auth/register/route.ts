import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, password, positionId, locationId, regionId } = body

        // Validate required fields
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Nama, email, dan password wajib diisi' },
                { status: 400 }
            )
        }

        if (!positionId || !locationId || !regionId) {
            return NextResponse.json(
                { error: 'Jabatan, wilayah, dan lokasi wajib diisi' },
                { status: 400 }
            )
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email sudah terdaftar' },
                { status: 400 }
            )
        }

        // Create new user with isActive: false (pending approval)
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password, // TODO: Hash password with bcrypt
                role: 'EMPLOYEE',
                isActive: false,
                positionId,
                locationId,
                regionId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Pendaftaran berhasil! Silakan login setelah akun Anda diaktifkan oleh manager.',
            user: newUser
        })
    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat mendaftar' },
            { status: 500 }
        )
    }
}
