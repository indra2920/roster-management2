'use client'

import { Users, Briefcase, MapPin, Map } from 'lucide-react'
import Link from 'next/link'

export default function MasterDataPage() {
    const menuItems = [
        {
            name: 'Data Karyawan',
            description: 'Kelola data karyawan, akun, dan penugasan',
            href: '/dashboard/master/employees',
            icon: Users,
            color: 'bg-blue-500'
        },
        {
            name: 'Jabatan',
            description: 'Kelola struktur jabatan dan level approval',
            href: '/dashboard/master/positions',
            icon: Briefcase,
            color: 'bg-indigo-500'
        },
        {
            name: 'Lokasi Kerja',
            description: 'Kelola daftar lokasi kerja (site/office)',
            href: '/dashboard/master/locations',
            icon: MapPin,
            color: 'bg-green-500'
        },
        {
            name: 'Wilayah Kerja',
            description: 'Kelola pembagian wilayah dan region',
            href: '/dashboard/master/regions',
            icon: Map,
            color: 'bg-purple-500'
        },
    ]

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Master Data</h1>
            <p className="text-gray-500 mb-8">Pusat pengelolaan data referensi sistem.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow hover:border-blue-300 group"
                        >
                            <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                {item.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {item.description}
                            </p>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
