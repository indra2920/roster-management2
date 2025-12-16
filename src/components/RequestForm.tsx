'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, FileText, Send, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RequestForm() {
    const [type, setType] = useState('ONSITE')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reason, setReason] = useState('')
    const [justification, setJustification] = useState('')
    const [loading, setLoading] = useState(false)
    const [maxDays, setMaxDays] = useState<{ ONSITE: number; OFFSITE: number }>({ ONSITE: 5, OFFSITE: 14 })
    const router = useRouter()

    useEffect(() => {
        // Fetch duration limits from settings
        const fetchSettings = async () => {
            try {
                const [onsiteRes, offsiteRes] = await Promise.all([
                    fetch('/api/settings/MAX_ONSITE_DAYS'),
                    fetch('/api/settings/MAX_OFFSITE_DAYS')
                ])
                if (onsiteRes.ok && offsiteRes.ok) {
                    const onsiteData = await onsiteRes.json()
                    const offsiteData = await offsiteRes.json()
                    setMaxDays({
                        ONSITE: onsiteData?.value ? parseInt(onsiteData.value) : 5,
                        OFFSITE: offsiteData?.value ? parseInt(offsiteData.value) : 14
                    })
                }
            } catch (error) {
                console.error('Failed to fetch settings', error)
            }
        }
        fetchSettings()
    }, [])

    const calculateDuration = () => {
        if (!startDate || !endDate) return 0
        const start = new Date(startDate)
        const end = new Date(endDate)
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }

    const duration = calculateDuration()
    const limit = type === 'ONSITE' ? maxDays.ONSITE : maxDays.OFFSITE
    const exceedsLimit = duration > limit

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (exceedsLimit && !justification.trim()) {
            alert('Justifikasi diperlukan karena durasi melebihi batas yang ditentukan')
            return
        }

        setLoading(true)

        // Capture Geolocation
        let locationData = { lat: null as number | null, long: null as number | null, address: null as string | null }

        try {
            if (navigator.geolocation) {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
                })
                locationData.lat = position.coords.latitude
                locationData.long = position.coords.longitude
                // Optional: Reverse geocoding could happen here or on server, but for now just sending coords
            }
        } catch (error: any) {
            console.error('Error getting location:', error)
            let msg = 'Gagal mengambil lokasi.'
            if (error?.code === 1) msg = 'Izin lokasi ditolak. Pastikan Anda mengizinkan akses lokasi.'
            else if (error?.code === 2) msg = 'GPS tidak tersedia.'
            else if (error?.code === 3) msg = 'Waktu pengambilan lokasi habis.'

            // toast.error(msg, { id: 'location-error' })
            console.warn(msg)
        }

        const res = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                startDate,
                endDate,
                reason,
                justification: exceedsLimit ? justification : null,
                requestLat: locationData.lat,
                requestLong: locationData.long
            }),
        })

        if (res.ok) {
            setReason('')
            setJustification('')
            setStartDate('')
            setEndDate('')
            router.refresh()
        } else {
            alert('Failed to submit request')
        }
        setLoading(false)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Send className="w-5 h-5 mr-2 text-blue-600" />
                    New Request
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                    <select
                        suppressHydrationWarning
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="ONSITE">On-site Work</option>
                        <option value="OFFSITE">Off-site Work</option>
                        <option value="CUTI">Cuti / Leave</option>
                        <option value="SAKIT">Sakit / Sick Leave</option>
                        <option value="IZIN">Izin / Permission</option>
                        <option value="WFH">Work From Home</option>
                        <option value="DINAS_LUAR">Dinas Luar / Business Trip</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FileText className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            suppressHydrationWarning
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="block w-full pl-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Client meeting, Project deadline"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full pl-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="block w-full pl-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Duration Warning & Justification */}
                {exceedsLimit && duration > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800">
                                    Durasi Melebihi Batas
                                </p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Pengajuan {type} Anda selama <strong>{duration} hari</strong> melebihi batas maksimal <strong>{limit} hari</strong>.
                                    Silakan berikan justifikasi.
                                </p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Justifikasi <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                                rows={3}
                                placeholder="Jelaskan alasan mengapa Anda memerlukan durasi lebih lama..."
                                required={exceedsLimit}
                            />
                        </div>
                    </div>
                )}

                <button
                    suppressHydrationWarning
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Request'
                    )}
                </button>
            </form>
        </div>
    )
}
