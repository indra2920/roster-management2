'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Save, User, Lock, Bell, Shield, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
    const { data: session, update } = useSession()
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'duration'>('profile')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Profile settings
    const [profileData, setProfileData] = useState({
        name: session?.user?.name || '',
        email: session?.user?.email || '',
    })

    // Password settings
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    // Notification settings
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        approvalNotifications: true,
        requestNotifications: true,
    })

    // Duration settings (Admin only)
    const [durationSettings, setDurationSettings] = useState({
        maxOnsiteDays: '30',
        maxOffsiteDays: '14',
        supervisorDelegationRequired: true,
    })

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            fetchDurationSettings()
        }
    }, [session])

    const fetchDurationSettings = async () => {
        try {
            const res = await fetch('/api/settings')
            if (res.ok) {
                const settings = await res.json()
                setDurationSettings({
                    maxOnsiteDays: settings.MAX_ONSITE_DAYS?.value || '30',
                    maxOffsiteDays: settings.MAX_OFFSITE_DAYS?.value || '14',
                    supervisorDelegationRequired: settings.SUPERVISOR_DELEGATION_REQUIRED?.value === 'true',
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDurationUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const toastId = toast.loading('Menyimpan pengaturan...')

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: {
                        MAX_ONSITE_DAYS: durationSettings.maxOnsiteDays,
                        MAX_OFFSITE_DAYS: durationSettings.maxOffsiteDays,
                        SUPERVISOR_DELEGATION_REQUIRED: durationSettings.supervisorDelegationRequired.toString(),
                    }
                }),
            })

            if (res.ok) {
                toast.success('Pengaturan durasi berhasil disimpan!', { id: toastId })
            } else {
                const error = await res.json()
                toast.error(`Gagal menyimpan pengaturan: ${error.error}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error updating duration settings:', error)
            toast.error('Terjadi kesalahan saat menyimpan pengaturan', { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const toastId = toast.loading('Menyimpan perubahan...')

        try {
            const res = await fetch(`/api/users/${session?.user?.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profileData.name,
                    email: profileData.email,
                }),
            })

            if (res.ok) {
                toast.success('Profil berhasil diperbarui!', { id: toastId })
                // Update session
                await update()
            } else {
                const error = await res.json()
                toast.error(`Gagal memperbarui profil: ${error.error}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Terjadi kesalahan saat memperbarui profil', { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Password baru tidak cocok!')
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password minimal 6 karakter!')
            return
        }

        setIsSaving(true)
        const toastId = toast.loading('Mengubah password...')

        try {
            const res = await fetch(`/api/users/${session?.user?.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: passwordData.newPassword,
                }),
            })

            if (res.ok) {
                toast.success('Password berhasil diubah!', { id: toastId })
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                })
            } else {
                const error = await res.json()
                toast.error(`Gagal mengubah password: ${error.error}`, { id: toastId })
            }
        } catch (error) {
            console.error('Error updating password:', error)
            toast.error('Terjadi kesalahan saat mengubah password', { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    const handleNotificationUpdate = async () => {
        setIsSaving(true)
        const toastId = toast.loading('Menyimpan pengaturan...')

        // Simulate API call
        setTimeout(() => {
            toast.success('Pengaturan notifikasi berhasil disimpan!', { id: toastId })
            setIsSaving(false)
        }, 1000)
    }

    const tabs = [
        { id: 'profile' as const, name: 'Profil', icon: User },
        { id: 'security' as const, name: 'Keamanan', icon: Lock },
        { id: 'notifications' as const, name: 'Notifikasi', icon: Bell },
        ...(session?.user?.role === 'ADMIN' ? [{ id: 'duration' as const, name: 'Aturan Durasi', icon: Clock }] : []),
    ]

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-2">Kelola pengaturan akun dan preferensi Anda</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex space-x-8 px-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 mr-2" />
                                    {tab.name}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileUpdate} className="max-w-2xl">
                            <h2 className="text-xl font-semibold mb-6">Informasi Profil</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Lengkap
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.name}
                                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        value={session?.user?.role || ''}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Role tidak dapat diubah</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <form onSubmit={handlePasswordUpdate} className="max-w-2xl">
                            <h2 className="text-xl font-semibold mb-6">Ubah Password</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password Baru
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Konfirmasi Password Baru
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Lock className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Mengubah...' : 'Ubah Password'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="max-w-2xl">
                            <h2 className="text-xl font-semibold mb-6">Pengaturan Notifikasi</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-gray-900">Email Notifications</p>
                                        <p className="text-sm text-gray-500">Terima notifikasi melalui email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.emailNotifications}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-gray-900">Approval Notifications</p>
                                        <p className="text-sm text-gray-500">Notifikasi saat ada request yang perlu di-approve</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.approvalNotifications}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, approvalNotifications: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-gray-900">Request Notifications</p>
                                        <p className="text-sm text-gray-500">Notifikasi saat request Anda diproses</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.requestNotifications}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, requestNotifications: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={handleNotificationUpdate}
                                    disabled={isSaving}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Duration Rules Tab (Admin Only) */}
                    {activeTab === 'duration' && session?.user?.role === 'ADMIN' && (
                        <form onSubmit={handleDurationUpdate} className="max-w-2xl">
                            <h2 className="text-xl font-semibold mb-2">Aturan Durasi Onsite/Offsite</h2>
                            <p className="text-gray-600 mb-6">Atur batas maksimal durasi dan aturan delegasi untuk request onsite/offsite</p>

                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                                        <div>
                                            <h3 className="font-medium text-blue-900">Tentang Aturan Durasi</h3>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Sistem akan otomatis memberikan notifikasi ke manager jika karyawan mengajukan request yang melebihi durasi maksimal yang ditentukan.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Maksimal Durasi Onsite (Hari)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={durationSettings.maxOnsiteDays}
                                        onChange={(e) => setDurationSettings({ ...durationSettings, maxOnsiteDays: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Jika karyawan mengajukan onsite lebih dari {durationSettings.maxOnsiteDays} hari, manager akan menerima notifikasi
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Maksimal Durasi Offsite (Hari)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={durationSettings.maxOffsiteDays}
                                        onChange={(e) => setDurationSettings({ ...durationSettings, maxOffsiteDays: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Jika karyawan mengajukan offsite lebih dari {durationSettings.maxOffsiteDays} hari, manager akan menerima notifikasi
                                    </p>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">Delegasi untuk Supervisor</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Wajibkan supervisor ke atas untuk menunjuk delegasi saat mengajukan offsite
                                            </p>
                                            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <p className="text-sm text-yellow-800">
                                                    ⚠️ Jika diaktifkan, supervisor yang mengajukan offsite harus menunjuk karyawan lain sebagai delegasi untuk menangani tanggung jawab mereka selama offsite.
                                                </p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                                            <input
                                                type="checkbox"
                                                checked={durationSettings.supervisorDelegationRequired}
                                                onChange={(e) => setDurationSettings({ ...durationSettings, supervisorDelegationRequired: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Menyimpan...' : 'Simpan Aturan'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
