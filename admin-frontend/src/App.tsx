import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard, Setup, Login } from './pages';

function App() {
    // TODO: Replace with actual auth check from backend
    const isSetupComplete = false; // Change to true to test login page
    const isAuthenticated = false; // Change to true to test dashboard

    return (
        <BrowserRouter>
            <Routes>
                {/* Setup Route - Only accessible if setup not complete */}
                <Route 
                    path="/setup" 
                    element={!isSetupComplete ? <Setup /> : <Navigate to="/login" replace />} 
                />

                {/* Login Route - Only accessible if setup complete but not authenticated */}
                <Route 
                    path="/login" 
                    element={isSetupComplete && !isAuthenticated ? <Login /> : <Navigate to={isSetupComplete ? "/admin" : "/setup"} replace />} 
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
                            to={!isSetupComplete ? "/setup" : !isAuthenticated ? "/login" : "/admin"} 
                            replace 
                        />
                    } 
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
