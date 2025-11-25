'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, AlertCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

type Request = {
    id: string
    type: string
    startDate: string
    endDate: string
    reason: string
    user: { name: string; email: string }
}

export default function ApprovalsDashboard() {
    const [requests, setRequests] = useState<Request[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/approvals', { cache: 'no-store' })
            if (res.ok) {
                const data = await res.json()
                setRequests(data)
            } else if (res.status === 401) {
                toast.error('Session Anda telah berakhir. Silakan login kembali.')
            } else {
                toast.error('Gagal mengambil data approval')
            }
        } catch (error) {
            console.error('Error fetching approvals:', error)
            toast.error('Terjadi kesalahan saat mengambil data')
        } finally {
            setLoading(false)
        }
    }

    const handleApproval = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessingId(requestId)
        const toastId = toast.loading(status === 'APPROVED' ? 'Menyetujui...' : 'Menolak...')

        try {
            const res = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status }),
            })

            if (res.ok) {
                toast.success(
                    status === 'APPROVED' ? 'Request berhasil disetujui!' : 'Request berhasil ditolak!',
                    { id: toastId }
                )
                setRequests(requests.filter((r) => r.id !== requestId))
                router.refresh()
            } else if (res.status === 401) {
                toast.error('Session Anda telah berakhir. Silakan login kembali.', { id: toastId })
            } else if (res.status === 403) {
                toast.error('Anda tidak memiliki akses untuk approval ini', { id: toastId })
            } else {
                const errorData = await res.json().catch(() => ({}))
                toast.error(`Gagal memproses: ${errorData.error || 'Unknown error'}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error processing approval:', error)
            toast.error('Terjadi kesalahan saat memproses approval', { id: toastId })
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500">Memuat approval...</p>
            </div>
        )
    }

    if (requests.length === 0) return null

    return (
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 overflow-hidden">
            <div className="p-6 border-b border-yellow-100 bg-yellow-50">
                <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Pending Approvals
                    <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                        {requests.length}
                    </span>
                </h2>
            </div>

            <div className="divide-y divide-gray-100">
                {requests.map((req) => (
                    <div key={req.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col gap-4">
                            {/* Request Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-gray-900">{req.user.name}</h3>
                                    <span className="text-sm text-gray-500">({req.user.email})</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 mb-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium mr-2">
                                        {req.type}
                                    </span>
                                    <Calendar className="w-4 h-4 mr-1" />
                                    <span>
                                        {new Date(req.startDate).toLocaleDateString('id-ID')} - {new Date(req.endDate).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                                    <span className="font-medium">Alasan:</span> {req.reason}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleApproval(req.id, 'APPROVED')}
                                    disabled={processingId === req.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-4 h-4" />
                                    {processingId === req.id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                    onClick={() => handleApproval(req.id, 'REJECTED')}
                                    disabled={processingId === req.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-4 h-4" />
                                    {processingId === req.id ? 'Processing...' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
