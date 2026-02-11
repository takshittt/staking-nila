import { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface PasswordSetupProps {
    onNext: (password: string) => void;
    onBack: () => void;
}

const PasswordSetup = ({ onNext, onBack }: PasswordSetupProps) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordRequirements = [
        { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
        { label: 'Upper & lowercase', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
        { label: 'Numbers & symbols', test: (p: string) => /[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p) },
    ];

    const canProceed =
        password.length >= 12 &&
        password === confirmPassword &&
        passwordRequirements.every(req => req.test(password));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canProceed) onNext(password);
    };

    return (
        <div className="max-w-xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-red-100">
                    <span className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                    Step 1 of 2
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                    Create Master Password
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                    This password will be required for all administrative actions
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Master Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium"
                                placeholder="••••••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-medium"
                                placeholder="••••••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements Grid */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Security Requirements
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {passwordRequirements.map((req, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    {req.test(password) ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                                    )}
                                    <span className={`text-xs font-medium ${req.test(password) ? 'text-green-600' : 'text-slate-500'}`}>
                                        {req.label}
                                    </span>
                                </li>
                            ))}
                            <li className="flex items-center gap-2">
                                {password && password === confirmPassword ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                                )}
                                <span className={`text-xs font-medium ${password && password === confirmPassword ? 'text-green-600' : 'text-slate-500'}`}>
                                    Passwords match
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl transition-all duration-300 inline-flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                    <button
                        type="submit"
                        disabled={!canProceed}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-all duration-300 inline-flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/20 active:scale-[0.98]"
                    >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PasswordSetup;
