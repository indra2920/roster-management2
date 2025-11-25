'use client'

import { useSession } from "next-auth/react"
import dynamic from 'next/dynamic'

const DashboardStats = dynamic(() => import('@/components/DashboardStats'), { ssr: false })

export default function ClientDashboardStatsWrapper() {
    const { data: session } = useSession()

    if (session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') {
        return <DashboardStats />
    }
    return null
}
