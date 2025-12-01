'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Briefcase, MapPin, Map, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

type User = {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    position: { id: string, name: string } | null
    location: { id: string, name: string } | null
    region: { id: string, name: string } | null
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

type Position = {
    id: string
    name: string
}

export default function EmployeesPage() {
    const { data: session } = useSession()
    const [users, setUsers] = useState<User[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [regions, setRegions] = useState<Region[]>([])
    const [positions, setPositions] = useState<Position[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean
        action: 'approve' | 'reject' | null
        userId: string
        userName: string
    }>({ isOpen: false, action: null, userId: '', userName: '' })
    const [isProcessing, setIsProcessing] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        positionId: '',
        locationId: '',
        regionId: '',
    })
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const timestamp = new Date().getTime()
            const [usersRes, locRes, regRes, posRes] = await Promise.all([
                fetch(`/api/users?t=${timestamp}`, { cache: 'no-store' }),
                fetch(`/api/master/locations?t=${timestamp}`, { cache: 'no-store' }),
                fetch(`/api/master/regions?t=${timestamp}`, { cache: 'no-store' }),
                fetch(`/api/master/positions?t=${timestamp}`, { cache: 'no-store' })
            ])

            if (usersRes.ok) setUsers(await usersRes.json())
            if (locRes.ok) setLocations(await locRes.json())
            if (regRes.ok) setRegions(await regRes.json())
            if (posRes.ok) setPositions(await posRes.json())
        } catch (error) {
            console.error('Failed to fetch data', error)
            toast.error('Gagal mengambil data')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (user?: User) => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                positionId: user.position?.id || '',
                locationId: user.location?.id || '',
                regionId: user.region?.id || '',
            })
            setIsEditing(true)
        } else {
            setFormData({
                id: '',
                name: '',
                email: '',
                password: '',
                role: 'EMPLOYEE',
                positionId: '',
                locationId: '',
                regionId: '',
            })
            setIsEditing(false)
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const url = isEditing ? `/api/users/${formData.id}` : '/api/users'
        const method = isEditing ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setIsModalOpen(false)
                fetchData()
                toast.success('Data berhasil disimpan!')
            } else if (res.status === 401) {
                toast.error('Session Anda telah berakhir. Silakan logout dan login kembali.')
                return
            } else {
                const text = await res.text()
                let errorMessage = 'Unknown error'
                try {
                    const errorData = JSON.parse(text)
                    errorMessage = errorData.error || 'Unknown error'
                } catch (e) {
                    errorMessage = `Server returned ${res.status}`
                }
                toast.error(`Gagal menyimpan: ${errorMessage}`)
            }
        } catch (error) {
            console.error('Network error:', error)
            toast.error('Terjadi kesalahan jaringan. Periksa koneksi internet Anda.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus karyawan "${name}"?\n\nData yang sudah dihapus tidak dapat dikembalikan.`)) return

        const toastId = toast.loading('Menghapus data...')
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })

            if (res.ok) {
                toast.success('Data karyawan berhasil dihapus!', { id: toastId })
                fetchData()
            } else if (res.status === 401) {
                toast.error('Session Anda telah berakhir. Silakan logout dan login kembali.', { id: toastId })
            } else {
                const errorData = await res.json().catch(() => ({}))
                toast.error(`Gagal menghapus data: ${errorData.error || 'Unknown error'}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            toast.error('Terjadi kesalahan saat menghapus data', { id: toastId })
        }
    }

    const handleApproveClick = (id: string, name: string) => {
        setConfirmModal({ isOpen: true, action: 'approve', userId: id, userName: name })
    }

    const handleRejectClick = (id: string, name: string) => {
        setConfirmModal({ isOpen: true, action: 'reject', userId: id, userName: name })
    }

    const handleConfirmAction = async () => {
        if (!confirmModal.action) return

        setIsProcessing(true)
        const toastId = toast.loading(
            confirmModal.action === 'approve' ? 'Mengaktifkan akun...' : 'Menolak akun...'
        )

        try {
            let res: Response

            if (confirmModal.action === 'approve') {
                res = await fetch(`/api/users/${confirmModal.userId}/activate`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive: true })
                })
            } else {
                res = await fetch(`/api/users/${confirmModal.userId}`, { method: 'DELETE' })
            }

            if (res.ok) {
                toast.success(
                    confirmModal.action === 'approve'
                        ? 'Akun berhasil diaktifkan!'
                        : 'Akun berhasil ditolak dan dihapus!',
                    { id: toastId }
                )

                // Update users state directly for immediate UI update
                if (confirmModal.action === 'approve') {
                    // Update the user's isActive status
                    setUsers(prevUsers =>
                        prevUsers.map(user =>
                            user.id === confirmModal.userId
                                ? { ...user, isActive: true }
                                : user
                        )
                    )
                } else {
                    // Remove the user from the list
                    setUsers(prevUsers =>
                        prevUsers.filter(user => user.id !== confirmModal.userId)
                    )
                }

                // Close modal
                setConfirmModal({ isOpen: false, action: null, userId: '', userName: '' })
            } else if (res.status === 401) {
                toast.error('Session Anda telah berakhir. Silakan logout dan login kembali.', { id: toastId })
            } else {
                const errorData = await res.json().catch(() => ({}))
                toast.error(
                    `Gagal ${confirmModal.action === 'approve' ? 'mengaktifkan' : 'menolak'} akun: ${errorData.error || 'Unknown error'}`,
                    { id: toastId }
                )
            }
        } catch (error) {
            console.error('Error processing action:', error)
            toast.error('Terjadi kesalahan saat memproses aksi', { id: toastId })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCancelConfirm = () => {
        setConfirmModal({ isOpen: false, action: null, userId: '', userName: '' })
    }


    // Filter locations based on selected region
    const filteredLocations = formData.regionId
        ? locations.filter(loc => loc.regionId === formData.regionId)
        : locations

    const selectedPosition = positions.find(p => p.id === formData.positionId)
    const isKoordinator = selectedPosition?.name?.toLowerCase().includes('koordinator')

    const handleRegionChange = (regionId: string) => {
        setFormData({ ...formData, regionId, locationId: '' }) // Reset location when region changes
    }

    const handleLocationChange = (locationId: string) => {
        const selectedLoc = locations.find(l => l.id === locationId)
        if (selectedLoc && selectedLoc.regionId) {
            setFormData({ ...formData, locationId, regionId: selectedLoc.regionId }) // Auto-select region
        } else {
            setFormData({ ...formData, locationId })
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Data Karyawan</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Tambah Karyawan
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Semua ({users.length})
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'active'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Aktif ({users.filter(u => u.isActive).length})
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Pending ({users.filter(u => !u.isActive).length})
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jabatan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wilayah</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users
                                .filter(user => {
                                    if (filter === 'active') return user.isActive
                                    if (filter === 'pending') return !user.isActive
                                    return true
                                })
                                .map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {user.name[0]}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isActive ? (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                                                {user.position?.name || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                                {user.location?.name || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Map className="w-4 h-4 mr-2 text-gray-400" />
                                                {user.region?.name || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                {!user.isActive && (session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER') ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveClick(user.id, user.name)}
                                                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                                            title="Setujui Akun"
                                                        >
                                                            <Check className="w-4 h-4 mr-1" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectClick(user.id, user.name)}
                                                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                                            title="Tolak Akun"
                                                        >
                                                            <X className="w-4 h-4 mr-1" />
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenModal(user)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user.id, user.name)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            {!isEditing && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        required={!isEditing}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Jabatan {selectedPosition && <span className="text-xs text-gray-400 font-normal">({selectedPosition.name})</span>}
                                </label>
                                <select
                                    value={formData.positionId}
                                    onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Pilih Jabatan</option>
                                    {positions.map(pos => (
                                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Region Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah Kerja</label>
                                <select
                                    value={formData.regionId}
                                    onChange={(e) => handleRegionChange(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Pilih Wilayah</option>
                                    {regions.map(reg => (
                                        <option key={reg.id} value={reg.id}>{reg.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Location Dropdown (Filtered) - Hidden for Koordinator */}
                            {isKoordinator ? (
                                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                                    <span className="font-medium">Info:</span> Lokasi kerja tidak perlu dipilih untuk posisi Koordinator.
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Kerja</label>
                                    <select
                                        value={formData.locationId}
                                        onChange={(e) => handleLocationChange(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2"
                                        disabled={!formData.regionId && filteredLocations.length === locations.length}
                                    >
                                        <option value="">Pilih Lokasi</option>
                                        {filteredLocations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" disabled={isSaving}>Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSaving}>
                                    {isSaving ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Buat Karyawan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {confirmModal.action === 'approve' ? 'Konfirmasi Approve' : 'Konfirmasi Reject'}
                        </h2>
                        <p className="text-gray-700 mb-6">
                            {confirmModal.action === 'approve' ? (
                                <>
                                    Apakah Anda yakin ingin <span className="font-semibold text-green-600">menyetujui dan mengaktifkan</span> akun <span className="font-semibold">"{confirmModal.userName}"</span>?
                                    <br /><br />
                                    Setelah diaktifkan, pengguna dapat login ke sistem.
                                </>
                            ) : (
                                <>
                                    Apakah Anda yakin ingin <span className="font-semibold text-red-600">menolak dan menghapus</span> akun pending <span className="font-semibold">"{confirmModal.userName}"</span>?
                                    <br /><br />
                                    <span className="text-red-600 font-medium">⚠️ Data yang sudah dihapus tidak dapat dikembalikan.</span>
                                </>
                            )}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelConfirm}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={isProcessing}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAction}
                                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${confirmModal.action === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Memproses...' : (confirmModal.action === 'approve' ? 'Ya, Approve' : 'Ya, Reject')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
