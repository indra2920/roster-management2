import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

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

        const usersRef = adminDb.collection('users');

        // Check if email already exists
        const existing = await usersRef.where('email', '==', email).limit(1).get();

        if (!existing.empty) {
            return NextResponse.json(
                { error: 'Email sudah terdaftar' },
                { status: 400 }
            )
        }

        // Create new user with isActive: false (pending approval)
        const newDocRef = usersRef.doc();
        const newUser = {
            id: newDocRef.id,
            name,
            email,
            password, // TODO: Hash password with bcrypt
            role: 'EMPLOYEE',
            isActive: false,
            positionId,
            locationId,
            regionId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await newDocRef.set(newUser);

        return NextResponse.json({
            success: true,
            message: 'Pendaftaran berhasil! Silakan login setelah akun Anda diaktifkan oleh manager.',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                isActive: newUser.isActive
            }
        })
    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat mendaftar' },
            { status: 500 }
        )
    }
}
