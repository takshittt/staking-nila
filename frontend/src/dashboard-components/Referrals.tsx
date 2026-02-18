import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Users, Gift, Share2, TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { userApi } from '../services/userApi';
import { ContractService } from '../services/contractService';

const Referrals = () => {
    const { address } = useWallet();
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({
        referralCode: '...',
        referralCount: 0,
        referralEarnings: 0,
        referredBy: null as string | null
    });
    const [referralConfig, setReferralConfig] = useState({
        referralPercent: 5,
        referrerPercent: 3
    });
    const [loading, setLoading] = useState(true);

    // New state for inline referral input
    const [referralInput, setReferralInput] = useState('');
    const [submittingCode, setSubmittingCode] = useState(false);
    const [referralError, setReferralError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch referral config (public)
            try {
                const config = await ContractService.getReferralConfig();
                setReferralConfig({
                    referralPercent: config.referralPercent,
                    referrerPercent: config.referrerPercent
                });
            } catch (error) {
                console.error('Failed to fetch referral config:', error);
            }

            // Fetch user stats (private)
            if (address) {
                try {
                    const user = await userApi.getUser(address);
                    setStats({
                        referralCode: user.referralCode || 'Pending...',
                        referralCount: user.referralCount || 0,
                        referralEarnings: user.referralEarnings || 0,
                        referredBy: user.referredBy || null
                    });
                } catch (error) {
                    console.error('Failed to fetch referral stats:', error);
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [address]);

    const handleCopy = () => {
        if (stats.referralCode === '...') return;
        navigator.clipboard.writeText(stats.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApplyCode = async () => {
        if (!referralInput.trim() || !address) return;

        setSubmittingCode(true);
        setReferralError(null);

        try {
            await userApi.setReferrer(address, referralInput.trim());
            // Update local state on success
            const user = await userApi.getUser(address);
            setStats(prev => ({
                ...prev,
                referredBy: user.referredBy
            }));
            setReferralInput(''); // Clear input
        } catch (err: any) {
            console.error('Referral error:', err);
            setReferralError(err.response?.data?.error || 'Invalid referral code or request failed');
        } finally {
            setSubmittingCode(false);
        }
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

                    {/* Enter Referral Code Section (Inline) */}
                    {!loading && !stats.referredBy && (
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-800 text-sm">Have a referral code?</h3>
                                <p className="text-xs text-slate-500 mt-1">Enter code to get {referralConfig.referrerPercent}% bonus reward</p>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={referralInput}
                                    onChange={(e) => setReferralInput(e.target.value)}
                                    placeholder="Enter code"
                                    disabled={submittingCode}
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                                />
                                <button
                                    onClick={handleApplyCode}
                                    disabled={submittingCode || !referralInput.trim()}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submittingCode ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <>
                                            Apply <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                            {referralError && (
                                <div className="mt-3 text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                                    {referralError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Display Referred By (Fixed Display) */}
                    {!loading && stats.referredBy && (
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <CheckCircle size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Referred by</p>
                                <p className="text-sm font-bold text-slate-800 font-mono">{stats.referredBy}</p>
                            </div>
                        </div>
                    )}

                    {/* Reward Rules */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Gift className="text-red-500" size={18} />
                            <h2 className="text-base font-bold text-slate-900">Reward Rules</h2>
                        </div>

                        <ul className="space-y-3">
                            {[
                                { text: `You earn ${referralConfig.referralPercent}% when a referred user stakes`, highlight: `${referralConfig.referralPercent}%` },
                                { text: `New user receives ${referralConfig.referrerPercent}% bonus reward`, highlight: `${referralConfig.referrerPercent}%` },
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
        </div >
    );
};

export default Referrals;

