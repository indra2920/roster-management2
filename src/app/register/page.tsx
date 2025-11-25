'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

type Position = {
    id: string
    name: string
}

type Location = {
    id: string
    name: string
    regionId: string | null
}

type Region = {
    id: string
    name: string
}

export default function RegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [positions, setPositions] = useState<Position[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [regions, setRegions] = useState<Region[]>([])

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        positionId: '',
        locationId: '',
        regionId: '',
    })

    useEffect(() => {
        fetchMasterData()
    }, [])

    const fetchMasterData = async () => {
        try {
            const [posRes, locRes, regRes] = await Promise.all([
                fetch('/api/master/positions', { cache: 'no-store' }),
                fetch('/api/master/locations', { cache: 'no-store' }),
                fetch('/api/master/regions', { cache: 'no-store' })
            ])

            if (posRes.ok) setPositions(await posRes.json())
            if (locRes.ok) setLocations(await locRes.json())
            if (regRes.ok) setRegions(await regRes.json())
        } catch (error) {
            console.error('Failed to fetch master data', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (formData.password !== formData.confirmPassword) {
            toast.error('Password dan konfirmasi password tidak cocok')
            return
        }

        if (formData.password.length < 8) {
            toast.error('Password minimal 8 karakter')
            return
        }

        setLoading(true)
        const toastId = toast.loading('Mendaftarkan akun...')

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    positionId: formData.positionId || null,
                    locationId: formData.locationId || null,
                    regionId: formData.regionId || null,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(data.message || 'Pendaftaran berhasil!', { id: toastId })
                setTimeout(() => router.push('/login'), 2000)
            } else {
                toast.error(data.error || 'Pendaftaran gagal', { id: toastId })
            }
        } catch (error) {
            console.error('Registration error:', error)
            toast.error('Terjadi kesalahan saat mendaftar', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    const filteredLocations = formData.regionId
        ? locations.filter(loc => loc.regionId === formData.regionId)
        : locations

    const handleRegionChange = (regionId: string) => {
        setFormData({ ...formData, regionId, locationId: '' })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Daftar Akun Baru</h1>
                    <p className="text-gray-600">Buat akun karyawan baru</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            minLength={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimal 8 karakter</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Konfirmasi Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Jabatan <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.positionId}
                            onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Pilih Jabatan</option>
                            {positions.map(pos => (
                                <option key={pos.id} value={pos.id}>{pos.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wilayah <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.regionId}
                            onChange={(e) => handleRegionChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Pilih Wilayah</option>
                            {regions.map(reg => (
                                <option key={reg.id} value={reg.id}>{reg.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lokasi <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.locationId}
                            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Pilih Lokasi</option>
                            {filteredLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? 'Mendaftar...' : 'Daftar'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Login di sini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
