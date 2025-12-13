'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Users, FileText, CheckCircle, Clock, TrendingUp, Activity, MapPin, Globe } from 'lucide-react'

type Stats = {
    totalEmployees: number
    pendingRequests: number
    approvedRequests: number
    requestsByType: { name: string; value: number }[]
    requestsByStatus: { name: string; value: number }[]
    activePersonnel: {
        onsite: {
            count: number
            personnel: Array<{
                requestId: string
                userId: string
                userName: string
                userEmail: string
                startDate: Date
                endDate: Date
                durationDays: number
                reason: string
            }>
        }
        offsite: {
            count: number
            personnel: Array<{
                requestId: string
                userId: string
                userName: string
                userEmail: string
                startDate: Date
                endDate: Date
                durationDays: number
                reason: string
            }>
        }
    }
    monthlyTrends: { name: string; Onsite: number; Offsite: number; Total: number }[]
    topReasons: { name: string; value: number }[]
    requestsByLocation: { name: string; value: number }[]
    requestsByRegion: { name: string; value: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function DashboardStats() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/dashboard/stats')
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (error) {
                console.error('Failed to fetch stats', error)
            } finally {
                setLoading(false)
            }
        }

        // Trigger notification check (Lazy Cron)
        const checkNotifications = async () => {
            try {
                await fetch('/api/cron/notifications')
            } catch (error) {
                console.error('Failed to trigger notification check', error)
            }
        }

        fetchStats()
        checkNotifications()
    }, [])

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl"></div>
    if (!stats) return null

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Karyawan</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending Requests</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</h3>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-full text-yellow-600">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Approved (Bulan Ini)</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.approvedRequests}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full text-green-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid - Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends - Full Width */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Tren Pengajuan Bulanan</h3>
                            <p className="text-sm text-gray-500">6 Bulan Terakhir</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.monthlyTrends}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="Total" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Request Status Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Status Pengajuan</h3>
                            <p className="text-sm text-gray-500">Distribusi Keseluruhan</p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.requestsByStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.requestsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Requests by Type */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Tipe Pengajuan</h3>
                            <p className="text-sm text-gray-500">Onsite vs Offsite</p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.requestsByType}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Requests by Region */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Pengajuan per Wilayah</h3>
                            <p className="text-sm text-gray-500">Distribusi Berdasarkan Region</p>
                        </div>
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                            <Globe className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.requestsByRegion}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.requestsByRegion.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Requests by Location */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Pengajuan per Lokasi</h3>
                            <p className="text-sm text-gray-500">Distribusi Berdasarkan Lokasi Kerja</p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <MapPin className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.requestsByLocation} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Reasons - Full Width */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Alasan Terpopuler</h3>
                            <p className="text-sm text-gray-500">Top 5 Alasan Pengajuan</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={stats.topReasons} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#4B5563', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Active Personnel Section */}
            {stats.activePersonnel && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Onsite Personnel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Onsite Saat Ini</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {stats.activePersonnel?.onsite?.count ?? 0} Orang
                            </span>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {stats.activePersonnel.onsite.personnel.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Tidak ada personel onsite</p>
                            ) : (
                                stats.activePersonnel?.onsite?.personnel?.map((person) => (
                                    <div key={person.requestId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{person.userName}</p>
                                                <p className="text-xs text-gray-500">{person.userEmail}</p>
                                                <p className="text-sm text-gray-600 mt-1">{person.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                    {person.durationDays} hari
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            {new Date(person.startDate).toLocaleDateString('id-ID')} - {new Date(person.endDate).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Offsite Personnel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Offsite Saat Ini</h3>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                {stats.activePersonnel?.offsite?.count ?? 0} Orang
                            </span>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {stats.activePersonnel.offsite.personnel.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Tidak ada personel offsite</p>
                            ) : (
                                stats.activePersonnel?.offsite?.personnel?.map((person) => (
                                    <div key={person.requestId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{person.userName}</p>
                                                <p className="text-xs text-gray-500">{person.userEmail}</p>
                                                <p className="text-sm text-gray-600 mt-1">{person.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                    {person.durationDays} hari
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            {new Date(person.startDate).toLocaleDateString('id-ID')} - {new Date(person.endDate).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
