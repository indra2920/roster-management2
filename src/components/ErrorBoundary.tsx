'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
    children: ReactNode
    componentName?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
                    <div className="flex items-center gap-2 mb-2 font-semibold">
                        <AlertTriangle className="w-5 h-5" />
                        <h2>Error in {this.props.componentName || 'Component'}</h2>
                    </div>
                    <p className="text-sm font-mono whitespace-pre-wrap bg-white p-2 rounded border border-red-100 overflow-auto max-h-40">
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <button
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Try again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
