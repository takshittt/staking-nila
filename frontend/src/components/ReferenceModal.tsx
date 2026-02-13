import React, { useState } from 'react';
import { UserCheck, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { userApi } from '../services/userApi';
import { useWallet } from '../hooks/useWallet';

interface ReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { address } = useWallet();
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!referralCode.trim() || !address) return;

        setLoading(true);

        try {
            await userApi.setReferrer(address, referralCode.trim());
            onSuccess();
        } catch (err: any) {
            console.error('Referral error:', err);
            setError(err.response?.data?.error || 'Invalid referral code or request failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!address) return;

        setError(null);

        setLoading(true);
        try {
            await userApi.skipReferral(address);
            onClose();
        } catch (err: any) {
            console.error('Skip error:', err);
            setError(err.response?.data?.error || 'Failed to skip referral');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in relative">

                {/* Header Pattern */}
                <div className="bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center text-center p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>

                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 shadow-lg relative z-10 border-4 border-slate-900 backdrop-blur-sm">
                        <UserCheck className="text-white" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white relative z-10">Have a Referral Code?</h2>
                    <p className="text-slate-400 text-sm mt-2 relative z-10">
                        Enter a code to unlock exclusive rewards.
                    </p>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-xl mb-6 border border-green-100">
                        <div className="p-1.5 bg-green-100 rounded-full">
                            <ShieldCheck size={16} />
                        </div>
                        <p className="text-sm font-medium">
                            Apply code for <span className="font-bold">3% Bonus Reward</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Referral Code
                            </label>
                            <input
                                type="text"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value)}
                                placeholder="e.g. NILA-123X"
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-shake">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !referralCode.trim()}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-red-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Checking...
                                </>
                            ) : (
                                'Apply Code & Continue'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col items-center">
                        <button
                            onClick={handleSkip}
                            disabled={loading}
                            className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors flex items-center gap-1 group py-2"
                        >
                            I don't have a code, skip
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferenceModal;
