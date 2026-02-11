import { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';

const Login = () => {
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
            // TODO: Call API to login
            // const response = await fetch('/api/auth/login', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ password, totpCode })
            // });

            console.log('Login with:', { password, totpCode });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // TODO: Store token and redirect to dashboard
            // localStorage.setItem('token', response.token);
            // navigate('/admin');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin Login</h1>
                    <p className="text-sm text-slate-500 font-medium tracking-wide">Enter your credentials to continue</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                                Master Password
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* 2FA Code Input */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                                Authentication Code
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-center text-xl tracking-[0.2em] placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-mono font-bold"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                <p className="text-xs font-bold text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-[0.98] text-sm"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Wait...</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                        Admin Interface 2.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
