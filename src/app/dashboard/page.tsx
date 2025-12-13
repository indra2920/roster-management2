'use client'

import { useSession } from "next-auth/react"
import RequestForm from "@/components/RequestForm"
import RosterCalendar from "@/components/RosterCalendar"
import ApprovalsDashboard from "@/components/ApprovalsDashboard"
import NotificationBell from "@/components/NotificationBell"
import ClientDashboardStatsWrapper from "@/components/ClientDashboardStatsWrapper"
import ErrorBoundary from "@/components/ErrorBoundary"

export default function Dashboard() {
    const { data: session } = useSession()

    return (
        <>
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500">Welcome back, {session?.user?.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    <ErrorBoundary componentName="NotificationBell">
                        <NotificationBell />
                    </ErrorBoundary>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    <ErrorBoundary componentName="DashboardStats">
                        <ClientDashboardStatsWrapper />
                    </ErrorBoundary>
                    <ErrorBoundary componentName="RosterCalendar">
                        <RosterCalendar />
                    </ErrorBoundary>
                </div>

                {/* Sidebar / Actions Area */}
                <div className="space-y-8">
                    {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN' || session?.user?.positionId) ? (
                        <ErrorBoundary componentName="ApprovalsDashboard">
                            <ApprovalsDashboard />
                        </ErrorBoundary>
                    ) : (
                        <ErrorBoundary componentName="RequestForm">
                            <RequestForm />
                        </ErrorBoundary>
                    )}
                </div>
            </div>
        </>
    )
}
