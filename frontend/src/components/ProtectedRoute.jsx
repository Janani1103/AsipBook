import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, user, _hasHydrated, logout } = useAuthStore();
    const location = useLocation();

    // While zustand is hydrating from localStorage on initial boot
    if (!_hasHydrated && !isAuthenticated && !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // If not authenticated or user data missing
    if (!isAuthenticated || !user) {
        if (isAuthenticated && !user) {
            logout();
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based guard (optional)
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        console.warn('Access Denied: User role not authorized', {
            userRole: user?.role,
            allowedRoles,
            path: location.pathname
        });
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
