import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminDashboard, Setup, Login } from './pages';
import { authApi } from './api/authApi';
import { useAuthStore } from './stores/authStore';

function App() {
    const { isAuthenticated, setupRequired, setSetupRequired, initializeAuth } = useAuthStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Initialize auth from localStorage
                initializeAuth();

                // Check if setup is required
                const { setupRequired: required } = await authApi.checkStatus();
                setSetupRequired(required);
            } catch (error) {
                console.error('Failed to check auth status:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [initializeAuth, setSetupRequired]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    className: '!bg-white !text-slate-900 !border !border-slate-100 !shadow-lg !rounded-xl',
                    success: {
                        iconTheme: {
                            primary: '#16a34a',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#dc2626',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <Routes>
                {/* Setup Route - Only accessible if setup not complete */}
                <Route
                    path="/setup"
                    element={setupRequired ? <Setup /> : <Navigate to="/login" replace />}
                />

                {/* Login Route - Only accessible if setup complete but not authenticated */}
                <Route
                    path="/login"
                    element={!setupRequired && !isAuthenticated ? <Login /> : <Navigate to={setupRequired ? "/setup" : "/admin"} replace />}
                />

                {/* Admin Dashboard - Only accessible if authenticated */}
                <Route
                    path="/admin"
                    element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" replace />}
                />

                {/* Default Route - Redirect based on state */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to={setupRequired ? "/setup" : !isAuthenticated ? "/login" : "/admin"}
                            replace
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
