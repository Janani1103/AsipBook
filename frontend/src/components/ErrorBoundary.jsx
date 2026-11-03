import React from 'react';
import { RefreshCw, Home, AlertOctagon } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React ErrorBoundary Caught:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        try {
            localStorage.removeItem('auth-storage');
        } catch (_) {}
        window.location.href = '/login';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertOctagon size={36} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            An unexpected application error occurred. You can reload the page or return to the sign-in screen.
                        </p>
                        {this.state.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left text-xs font-mono text-red-800 mb-6 max-h-32 overflow-auto">
                                {this.state.error.message || String(this.state.error)}
                            </div>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                            >
                                <RefreshCw size={16} /> Reload Page
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                            >
                                <Home size={16} /> Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

