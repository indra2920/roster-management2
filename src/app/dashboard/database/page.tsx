'use client'

import { useEffect, useState } from 'react'
import { Database, Table, ChevronLeft, ChevronRight, Search, Edit, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

type TableInfo = {
    name: string
    description: string
}

type PaginationInfo = {
    page: number
    limit: number
    total: number
    totalPages: number
}

export default function DatabasePage() {
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<string>('')
    const [tableData, setTableData] = useState<any[]>([])
    const [filteredData, setFilteredData] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })
    const [loading, setLoading] = useState(true)
    const [dataLoading, setDataLoading] = useState(false)
    const [editingRow, setEditingRow] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; row: any | null }>({ isOpen: false, row: null })

    useEffect(() => {
        fetchTables()
    }, [])

    useEffect(() => {
        if (selectedTable) {
            setSearchTerm('')
            fetchTableData(selectedTable, 1)
        }
    }, [selectedTable])

    useEffect(() => {
        // Filter data based on search term
        if (!searchTerm.trim()) {
            setFilteredData(tableData)
        } else {
            const filtered = tableData.filter(row => {
                return Object.values(row).some(value => {
                    if (value === null || value === undefined) return false
                    return String(value).toLowerCase().includes(searchTerm.toLowerCase())
                })
            })
            setFilteredData(filtered)
        }
    }, [searchTerm, tableData])

    const fetchTables = async () => {
        try {
            const res = await fetch('/api/database')
            if (res.ok) {
                const data = await res.json()
                setTables(data.tables)
            } else {
                toast.error('Gagal mengambil daftar tabel')
            }
        } catch (error) {
            console.error('Error fetching tables:', error)
            toast.error('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    const fetchTableData = async (table: string, page: number) => {
        setDataLoading(true)
        try {
            const res = await fetch(`/api/database?table=${table}&page=${page}&limit=50`)
            if (res.ok) {
                const result = await res.json()
                setTableData(result.data)
                setFilteredData(result.data)
                setPagination(result.pagination)
            } else {
                toast.error('Gagal mengambil data tabel')
            }
        } catch (error) {
            console.error('Error fetching table data:', error)
            toast.error('Terjadi kesalahan')
        } finally {
            setDataLoading(false)
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchTableData(selectedTable, newPage)
        }
    }

    const handleEdit = (row: any) => {
        setEditingRow({ ...row })
        setIsModalOpen(true)
    }

    const handleDeleteClick = (row: any) => {
        setDeleteConfirm({ isOpen: true, row })
    }

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm.row) return

        const toastId = toast.loading('Menghapus data...')
        try {
            const res = await fetch(`/api/database/${selectedTable}/${deleteConfirm.row.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Data berhasil dihapus!', { id: toastId })
                setDeleteConfirm({ isOpen: false, row: null })
                fetchTableData(selectedTable, pagination.page)
            } else {
                const error = await res.json()
                toast.error(`Gagal menghapus: ${error.error || 'Unknown error'}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error deleting record:', error)
            toast.error('Terjadi kesalahan saat menghapus data', { id: toastId })
        }
    }

    const handleSaveEdit = async () => {
        if (!editingRow || !editingRow.id) {
            toast.error('Invalid record')
            return
        }

        const toastId = toast.loading('Menyimpan perubahan...')
        try {
            const res = await fetch(`/api/database/${selectedTable}/${editingRow.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingRow)
            })

            if (res.ok) {
                toast.success('Perubahan berhasil disimpan!', { id: toastId })
                setIsModalOpen(false)
                setEditingRow(null)
                fetchTableData(selectedTable, pagination.page)
            } else {
                const error = await res.json()
                toast.error(`Gagal menyimpan: ${error.error || 'Unknown error'}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error saving record:', error)
            toast.error('Terjadi kesalahan saat menyimpan data', { id: toastId })
        }
    }

    const renderTableData = () => {
        const dataToRender = filteredData

        if (!dataToRender || dataToRender.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    {searchTerm ? 'Tidak ada data yang cocok dengan pencarian' : 'Tidak ada data'}
                </div>
            )
        }

        const columns = Object.keys(dataToRender[0])

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {col}
                                </th>
                            ))}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {dataToRender.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                {columns.map((col) => (
                                    <td key={col} className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                        {typeof row[col] === 'object' && row[col] !== null
                                            ? JSON.stringify(row[col])
                                            : String(row[col] ?? '-')}
                                    </td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(row)}
                                        className="text-blue-600 hover:text-blue-900 mr-3"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(row)}
                                        className="text-red-600 hover:text-red-900"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Loading...</div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Database className="w-8 h-8 mr-3 text-blue-600" />
                    Database Viewer
                </h1>
                <p className="text-gray-500 mt-2">View, search, and manage database tables</p>
            </div>

            {/* Table Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Table
                </label>
                <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full max-w-md border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">-- Choose a table --</option>
                    {tables.map((table) => (
                        <option key={table.name} value={table.name}>
                            {table.name} - {table.description}
                        </option>
                    ))}
                </select>
            </div>

            {/* Table Data */}
            {selectedTable && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Table className="w-5 h-5 mr-2 text-gray-600" />
                                <h2 className="text-lg font-semibold text-gray-900">{selectedTable}</h2>
                                <span className="ml-3 text-sm text-gray-500">
                                    ({pagination.total} records)
                                </span>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search in all columns..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {dataLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">Loading data...</div>
                        </div>
                    ) : (
                        <>
                            {renderTableData()}

                            {/* Pagination */}
                            {pagination.totalPages > 1 && !searchTerm && (
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-700">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page === 1}
                                            className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page === pagination.totalPages}
                                            className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {isModalOpen && editingRow && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Edit Record</h2>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false)
                                    setEditingRow(null)
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Object.keys(editingRow).map((key) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {key}
                                    </label>
                                    {key === 'id' ? (
                                        <input
                                            type="text"
                                            value={editingRow[key] || ''}
                                            disabled
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                                        />
                                    ) : typeof editingRow[key] === 'boolean' ? (
                                        <select
                                            value={String(editingRow[key])}
                                            onChange={(e) => setEditingRow({
                                                ...editingRow,
                                                [key]: e.target.value === 'true'
                                            })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        >
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                    ) : typeof editingRow[key] === 'object' && editingRow[key] !== null ? (
                                        <textarea
                                            value={JSON.stringify(editingRow[key], null, 2)}
                                            onChange={(e) => {
                                                try {
                                                    setEditingRow({
                                                        ...editingRow,
                                                        [key]: JSON.parse(e.target.value)
                                                    })
                                                } catch (err) {
                                                    // Invalid JSON, ignore
                                                }
                                            }}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                                            rows={3}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={editingRow[key] || ''}
                                            onChange={(e) => setEditingRow({
                                                ...editingRow,
                                                [key]: e.target.value
                                            })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false)
                                    setEditingRow(null)
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm.isOpen && deleteConfirm.row && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Konfirmasi Hapus</h2>
                        <p className="text-gray-700 mb-6">
                            Apakah Anda yakin ingin menghapus record ini?
                            <br /><br />
                            <span className="text-red-600 font-medium">⚠️ Data yang sudah dihapus tidak dapat dikembalikan.</span>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm({ isOpen: false, row: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
