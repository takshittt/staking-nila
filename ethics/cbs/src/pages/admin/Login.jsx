import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const API_BASE = import.meta.env.VITE_API_BASE || '';
            const res = await fetch(`${API_BASE}/api/support-admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });

            if (res.ok) {
                navigate('/dashboard');
            } else {
                // Generic error as requested
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                <div className="flex flex-col items-center space-y-3">
                    <img
                        src="https://www.mindwavedao.com/wp-content/uploads/nila-logo-alt.png"
                        alt="MindwaveDAO"
                        className="h-16 w-auto"
                    />
                    <h1 className="text-2xl font-bold text-center">Admin Panel</h1>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none text-white text-center"
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none text-white text-center"
                            autoComplete="off"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
