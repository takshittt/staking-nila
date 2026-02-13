import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Users, Gift, Share2, TrendingUp, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { userApi } from '../services/userApi';

const Referrals = () => {
    const { address } = useWallet();
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({
        referralCode: '...',
        referralCount: 0,
        referralEarnings: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReferralStats = async () => {
            if (!address) return;
            try {
                const user = await userApi.getUser(address);
                setStats({
                    referralCode: user.referralCode || 'Pending...',
                    referralCount: user.referralCount || 0,
                    referralEarnings: user.referralEarnings || 0
                });
            } catch (error) {
                console.error('Failed to fetch referral stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReferralStats();
    }, [address]);

    const handleCopy = () => {
        if (stats.referralCode === '...') return;
        navigator.clipboard.writeText(stats.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Page Title */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Users size={20} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Referral Program</h1>
                </div>
                <p className="text-slate-500 text-sm max-w-xl">
                    Earn passive rewards by inviting others to stake NILA. Build your network and check earning stats.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Code & Rules */}
                <div className="space-y-6">
                    {/* Referral Code Section */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-12 -mt-12 blur-2xl opacity-50"></div>

                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Referral Code</h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 bg-slate-50 border-2 border-slate-200 border-dashed rounded-lg flex items-center justify-center p-3">
                                {loading ? (
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                ) : (
                                    <span className="text-2xl font-mono font-bold text-slate-800 tracking-wider">
                                        {stats.referralCode}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`px-5 py-3 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 min-w-[140px] text-sm
                                    ${copied
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md active:scale-[0.98]'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle size={18} />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy size={18} />
                                        Copy Code
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Reward Rules */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Gift className="text-red-500" size={18} />
                            <h2 className="text-base font-bold text-slate-900">Reward Rules</h2>
                        </div>

                        <ul className="space-y-3">
                            {[
                                { text: "You earn 5% when a referred user stakes", highlight: "5%" },
                                { text: "New user receives 3% bonus reward", highlight: "3%" },
                                { text: "Rewards are credited instantly to your wallet", highlight: "instantly" },
                                { text: "No limit on the number of referrals", highlight: "No limit" }
                            ].map((rule, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm">
                                    <div className="bg-green-100 text-green-600 rounded-full p-1 mt-0.5 shrink-0">
                                        <CheckCircle size={12} />
                                    </div>
                                    <span>
                                        {rule.text.split(rule.highlight).map((part, i, arr) => (
                                            <span key={i}>
                                                {part}
                                                {i < arr.length - 1 && (
                                                    <span className="font-bold text-slate-800">{rule.highlight}</span>
                                                )}
                                            </span>
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Stats & CTA */}
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Users size={20} />
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-medium text-xs mb-1">Total Referrals</h3>
                            <div className="text-2xl font-bold text-slate-900">
                                {loading ? '...' : stats.referralCount}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-medium text-xs mb-1">Total Earned</h3>
                            <div className="text-2xl font-bold text-slate-900">
                                {loading ? '...' : stats.referralEarnings.toFixed(2)} <span className="text-sm text-slate-400 font-medium">NILA</span>
                            </div>
                        </div>
                    </div>

                    {/* Simple Explanation / CTA Card */}
                    <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/10 rounded-full -ml-8 -mb-8 blur-3xl"></div>

                        <div className="relative z-10 text-center">
                            <h2 className="text-xl font-bold mb-2">Boost Your Earnings</h2>
                            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                                Share your code on social media and crypto communities to maximize your passive income.
                            </p>

                            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-lg transition-all shadow-md hover:shadow-red-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
                                <Share2 size={18} />
                                Share Referral Code
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Referrals;

