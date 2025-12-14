'use client'

import { LayoutDashboard, FileText, Users, Database, Settings, LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

type NavItem = {
    name: string
    href: string
    icon: React.ElementType
    roles?: string[]
    positions?: string[]
}

export default function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    const navItems: NavItem[] = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Request', href: '/dashboard/request', icon: FileText, roles: ['EMPLOYEE', 'GSL', 'Koordinator'] },
        { name: 'Data Karyawan', href: '/dashboard/master/employees', icon: Users, positions: ['GSL', 'Koordinator'], roles: ['ADMIN', 'MANAGER'] },
        { name: 'Master Data', href: '/dashboard/master', icon: Database, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Database', href: '/dashboard/database', icon: Database, roles: ['ADMIN'] },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
    ]

    return (
        <div className="hidden md:flex flex-col w-64 bg-gray-900 text-white min-h-screen">
            <div className="p-6">
                <h1 className="text-2xl font-bold tracking-wider">ROSTER<span className="text-blue-500">APP</span></h1>
            </div>

            <div className="flex-1 px-4 space-y-2">
                {navItems.filter(item => {
                    const userRole = session?.user?.role || ''
                    const userPosition = session?.user?.positionName || ''

                    const hasRole = !item.roles || item.roles.includes(userRole)

                    // Check if user has one of the allowed positions
                    // Note: userPosition might be "Koordinator Area 1", so we check if it includes "Koordinator"
                    const hasPosition = !item.positions || (item.positions.some(pos => userPosition.includes(pos)))

                    // If item has BOTH roles and positions, we treat it as OR (accessible by Role OR Position)
                    if (item.roles && item.positions) {
                        return hasRole || hasPosition
                    }

                    if (item.positions) return hasPosition
                    return hasRole
                }).map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                'flex items-center px-4 py-3 rounded-lg transition-colors',
                                pathname === item.href
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </Link>
                    )
                })}
            </div>

            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center mb-4 px-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                        {session?.user?.name?.[0] || 'U'}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium">{session?.user?.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{session?.user?.role?.toLowerCase()}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
