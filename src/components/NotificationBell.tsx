'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import clsx from 'clsx'

type Notification = {
    id: string
    title: string
    message: string
    isRead: boolean
    createdAt: string
    type: string
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter(n => !n.isRead).length

    useEffect(() => {
        fetchNotifications()
        // Optional: Poll for new notifications every minute
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error)
        }
    }

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true })
            })

            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                )
            }
        } catch (error) {
            console.error('Failed to mark as read', error)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                        <span className="text-xs text-gray-500">{unreadCount} belum dibaca</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Tidak ada notifikasi
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={clsx(
                                            "p-4 hover:bg-gray-50 transition-colors",
                                            !notification.isRead && "bg-blue-50/50"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <p className={clsx("text-sm font-medium", !notification.isRead ? "text-blue-900" : "text-gray-900")}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {new Date(notification.createdAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-blue-600 hover:text-blue-800 self-start"
                                                    title="Tandai sudah dibaca"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
