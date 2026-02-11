import { useState } from 'react';
import { CheckCircle, ArrowLeft, Copy, Check } from 'lucide-react';

interface GoogleAuthenticatorProps {
    password: string;
    qrCodeUrl: string;
    manualEntryCode: string;
    onComplete: (totpCode: string) => void;
    onBack: () => void;
}

const GoogleAuthenticator = ({ qrCodeUrl, manualEntryCode, onComplete, onBack }: GoogleAuthenticatorProps) => {
    const [totpCode, setTotpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(manualEntryCode.replace(/\s/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (totpCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);

        try {
            await onComplete(totpCode);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-red-100">
                    <span className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                    Step 2 of 2
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                    Two-Factor Authentication
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                    Secure your account by linking it with Google Authenticator
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Left Side - QR Code & Manual Entry */}
                <div className="space-y-6">

                    {/* QR Code */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h3 className="text-[10px] font-bold text-slate-400 mb-4 text-center uppercase tracking-widest">
                            Scan Secure QR Code
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl mx-auto w-fit border border-slate-100/50">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                            ) : (
                                <div className="w-40 h-40 bg-white flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 shadow-inner">
                                    <div className="w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin mb-2" />
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Generating...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual Entry Code */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 text-center mb-3 uppercase tracking-widest">
                            Secret Key (Manual Entry)
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
                                <p className="text-xs text-slate-900 font-mono font-bold text-center tracking-wider">
                                    {manualEntryCode}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-lg shadow-red-600/20 active:scale-[0.95]"
                                title="Copy code"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Verification Form */}
                <div className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Verification Code Input */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                            <label className="block text-[10px] font-bold text-slate-700 text-center uppercase tracking-widest">
                                ENTER SCAN CODE
                            </label>
                            <input
                                type="text"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-center text-3xl tracking-[0.4em] placeholder-slate-200 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-mono font-bold shadow-inner transition-all"
                                placeholder="000000"
                                maxLength={6}
                                required
                                autoFocus
                            />
                            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                                6-DIGIT AUTHENTICATION CODE
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                <p className="text-xs font-bold text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Success Info */}
                        <div className="bg-green-50/50 border border-green-100 rounded-xl p-5">
                            <div className="flex items-start gap-3">
                                <div className="bg-green-100 p-0.5 rounded-full flex-shrink-0">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                                <div className="text-xs">
                                    <p className="font-bold text-green-800 mb-0.5">Security Verification</p>
                                    <p className="text-green-700/80 font-medium leading-relaxed">
                                        Completing this step will finalize your administrative security profile.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
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
                                disabled={loading || totpCode.length !== 6}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-all duration-300 inline-flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/20 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Wait...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Complete Setup</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default GoogleAuthenticator;
