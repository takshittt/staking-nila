import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';

const Login = () => {
    const navigate = useNavigate();
    const { setToken } = useAuthStore();
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password) {
            setError('Please enter your password');
            return;
        }

        if (totpCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);

        try {
            const data = await authApi.login({ password, totpCode });

            // Store token
            setToken(data.token);

            // Redirect to dashboard
            navigate('/admin');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">

                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Login</h1>
                    <p className="text-slate-600 font-medium">Enter your credentials to access the dashboard</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                Master Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* 2FA Code Input */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                2FA Code
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-center text-2xl tracking-[0.3em] font-mono font-bold placeholder-slate-200 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-inner"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 font-medium">
                                Enter the 6-digit code from Google Authenticator
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                <p className="text-sm font-bold text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    <span>Login to Dashboard</span>
                                </>
                            )}
                        </button>
                    </form>


                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-sm text-slate-500 font-medium">
                        &copy; {new Date().getFullYear()} MindwaveDAO Admin Panel
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
