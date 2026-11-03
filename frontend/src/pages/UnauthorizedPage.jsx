import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <ShieldOff className="w-16 h-16 text-red-500 mx-auto" />
                <h1 className="text-2xl font-bold text-gray-900 mt-4">Access Denied</h1>
                <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
                <div className="flex flex-col gap-3 mt-6">
                    <Link to="/dashboard">
                        <Button variant="primary" className="w-full">
                            Back to Dashboard
                        </Button>
                    </Link>
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/login';
                        }}
                    >
                        Logout & Sign In Again
                    </Button>
                </div>
            </div>
        </div>
    );
}