'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, QrCode as QrIcon, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [currentUrl, setCurrentUrl] = useState('')
    const router = useRouter()

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href)
        }
    }, [])

    // Prefetch dashboard for faster transition
    useEffect(() => {
        router.prefetch('/dashboard')
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            console.log("Attempting login for:", email);
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            console.log("Login result:", result);

            if (result?.ok) {
                console.log("Login successful, redirecting to dashboard...");
                // Just push, don't refresh immediately to avoid double load. 
                // Middleware/SessionProvider will handle session state.
                router.push('/dashboard')
            } else {
                console.error("Login failed:", result?.error);
                const errorMsg = result?.error || 'Email atau password salah'
                alert(`GAGAL LOGIN: ${errorMsg}`)
                setLoading(false)
            }
        } catch (err: any) {
            console.error("Login Error Catch:", err);
            alert(`SYSTEM ERROR: ${err.message || 'Unknown error'}`)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold mb-4">Roster Management</h1>
                    <p className="text-blue-100 text-lg">Streamline your workforce scheduling and approval workflows with ease.</p>
                </div>
                <div className="relative z-10">
                    <blockquote className="text-xl font-light italic">
                        "Efficient management is the key to a productive team."
                    </blockquote>
                </div>

                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                        <p className="text-gray-500 mt-2">Please sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    suppressHydrationWarning
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    suppressHydrationWarning
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            suppressHydrationWarning
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Demo Credentials:</p>
                        <div className="mt-2 space-y-1 text-xs bg-gray-100 p-3 rounded text-left">
                            <p><span className="font-semibold">Manager:</span> manager@example.com / password123</p>
                            <p><span className="font-semibold">Employee:</span> employee@example.com / password123</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <button
                            suppressHydrationWarning
                            type="button"
                            onClick={() => setShowQR(true)}
                            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium"
                        >
                            <QrIcon className="w-4 h-4" />
                            Akses via Mobile (QR Code)
                        </button>
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowQR(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Scan untuk Akses Mobile</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Pastikan HP dan Komputer terhubung ke jaringan WiFi yang sama.
                            </p>

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner inline-block mb-4">
                                <QRCodeSVG
                                    value={currentUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg text-left break-all font-mono">
                                {currentUrl}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
