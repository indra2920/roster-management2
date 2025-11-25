'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Briefcase } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

type Position = {
    id: string
    name: string
    description: string | null
}

export default function PositionsPage() {
    const { data: session } = useSession()
    const [positions, setPositions] = useState<Position[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({ id: '', name: '', description: '' })
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        fetchPositions()
    }, [])

    const fetchPositions = async () => {
        try {
            const res = await fetch('/api/master/positions', { cache: 'no-store' })
            if (res.ok) {
                const data = await res.json()
                setPositions(data)
            }
        } catch (error) {
            console.error('Failed to fetch positions', error)
            toast.error('Gagal mengambil data jabatan')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (position?: Position) => {
        if (position) {
            setFormData({ id: position.id, name: position.name, description: position.description || '' })
            setIsEditing(true)
        } else {
            setFormData({ id: '', name: '', description: '' })
            setIsEditing(false)
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const url = isEditing ? `/api/master/positions/${formData.id}` : '/api/master/positions'
        const method = isEditing ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setIsModalOpen(false)
                fetchPositions()
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
        if (!confirm(`Apakah Anda yakin ingin menghapus jabatan "${name}"?\n\nData yang sudah dihapus tidak dapat dikembalikan.`)) return

        const toastId = toast.loading('Menghapus data...')
        try {
            const res = await fetch(`/api/master/positions/${id}`, { method: 'DELETE' })

            if (res.ok) {
                toast.success('Data jabatan berhasil dihapus!', { id: toastId })
                fetchPositions()
            } else if (res.status === 401) {
                toast.error('Session Anda telah berakhir. Silakan logout dan login kembali.', { id: toastId })
            } else {
                const errorData = await res.json().catch(() => ({}))
                toast.error(`Gagal menghapus data: ${errorData.error || 'Unknown error'}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error deleting position:', error)
            toast.error('Terjadi kesalahan saat menghapus data', { id: toastId })
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Jabatan</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Tambah Jabatan
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Jabatan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {positions.map((pos) => (
                            <tr key={pos.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                    <div className="flex items-center">
                                        <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                                        {pos.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{pos.description || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleOpenModal(pos)} className="text-blue-600 hover:text-blue-900 mr-4">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(pos.id, pos.name)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Jabatan' : 'Tambah Jabatan'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jabatan</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" disabled={isSaving}>Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSaving}>
                                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
