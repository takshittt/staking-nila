import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

export default function AdminApp() {
    return (
        <BrowserRouter basename="/kudoadmin">
            <Routes>
                <Route path="/" element={<AdminLogin />} />
                <Route path="/login" element={<AdminLogin />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                {/* Redirect unknown routes in this sub-app to login */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
