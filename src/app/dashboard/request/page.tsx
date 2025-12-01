'use client'

import RequestForm from "@/components/RequestForm"

export default function RequestPage() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900">New Request</h1>
                <p className="text-gray-500">Submit a new request for approval</p>
            </header>

            <div className="max-w-2xl">
                <RequestForm />
            </div>
        </div>
    )
}
