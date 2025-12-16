'use client'

import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, User, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'

type Request = {
    id: string
    type: string
    startDate: string
    endDate: string
    reason: string
    justification?: string | null
    requestLat?: number
    requestLong?: number
    status: string
    user: { name: string; email: string }
    approvals?: Array<{
        approver: { name: string; email: string }
        status: string
        createdAt: string
        approvalLat?: number
        approvalLong?: number
    }>
}

export default function RosterCalendar() {
    const { data: session } = useSession()
    const showLocation = session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN'
    const [requests, setRequests] = useState<Request[]>([])

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch('/api/requests', { cache: 'no-store' })
                if (!res.ok) {
                    let errorBody = await res.text();
                    console.error("API Error:", res.status, res.statusText, errorBody);
                    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
                }
                const data = await res.json()
                if (Array.isArray(data)) {
                    setRequests(data)
                } else {
                    console.error("Invalid data format:", data)
                    setRequests([])
                }
            } catch (error) {
                console.error("Error fetching requests:", error)
                setRequests([])
            }
        }
        fetchRequests()
    }, [])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                    </span>
                )
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </span>
                )
        }
    }

    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate)
        const end = new Date(endDate)
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentRequests = requests.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    const LocationLink = ({ lat, long, label }: { lat?: number, long?: number, label: string }) => {
        if (!lat || !long) return <span className="text-xs text-gray-400 block">{label}: -</span>
        return (
            <a
                href={`https://www.google.com/maps?q=${lat},${long}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline mb-1"
            >
                <MapPin className="w-3 h-3 mr-1" />
                {label}
            </a>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Roster Schedule
                </h2>
                <div className="text-sm text-gray-500">
                    Total: {requests.length} Requests
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Hari</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justifikasi</th>
                            {showLocation && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{req.user?.name || 'Unknown User'}</div>
                                            <div className="text-sm text-gray-500">{req.user?.email || '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={clsx(
                                        "px-2 py-1 text-xs font-semibold rounded-md",
                                        req.type === 'ONSITE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                    )}>
                                        {req.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {req.type === 'ONSITE'
                                        ? new Date(req.startDate).toLocaleDateString()
                                        : `${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}`
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {calculateDays(req.startDate, req.endDate)} hari
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {req.justification ? (
                                        <div className="text-sm text-gray-700 max-w-xs">
                                            <div className="line-clamp-2" title={req.justification}>
                                                {req.justification}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">-</span>
                                    )}
                                </td>
                                {showLocation && <td className="px-6 py-4 whitespace-nowrap">
                                    <LocationLink lat={req.requestLat} long={req.requestLong} label="Req" />
                                    {req.approvals && req.approvals.length > 0 && req.approvals[0].approvalLat && (
                                        <LocationLink
                                            lat={req.approvals[0].approvalLat}
                                            long={req.approvals[0].approvalLong}
                                            label="App"
                                        />
                                    )}
                                </td>}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(req.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {req.approvals && req.approvals.length > 0 ? (
                                        <div className="text-sm">
                                            <div className="font-medium text-gray-900">{req.approvals && req.approvals[0]?.approver?.name || 'Unknown'}</div>
                                            <div className="text-gray-500 text-xs">
                                                {new Date(req.approvals[0].createdAt).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {currentRequests.length === 0 && (
                            <tr>
                                <td colSpan={showLocation ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                                    No requests found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="text-sm text-gray-500">
                        Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handlePrevious}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
