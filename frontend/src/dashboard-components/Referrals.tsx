import { useState } from 'react';
import { Copy, CheckCircle, Users, Gift, Share2, TrendingUp } from 'lucide-react';

const Referrals = () => {
    const [copied, setCopied] = useState(false);
    const referralCode = "NILA-829304";

    const handleCopy = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Page Title */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Referral Program</h1>
                </div>
                <p className="text-slate-500 max-w-2xl">
                    Earn passive rewards by inviting others to stake NILA. Build your network and check earning stats.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Code & Rules */}
                <div className="space-y-8">
                    {/* Referral Code Section */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>

                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Your Referral Code</h2>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl flex items-center justify-center p-4">
                                <span className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
                                    {referralCode}
                                </span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`px-6 py-4 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 min-w-[160px]
                                    ${copied
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg active:scale-[0.98]'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle size={20} />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy size={20} />
                                        Copy Code
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Reward Rules */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <Gift className="text-red-500" size={20} />
                            <h2 className="text-lg font-bold text-slate-900">Reward Rules</h2>
                        </div>

                        <ul className="space-y-4">
                            {[
                                { text: "You earn 5% when a referred user stakes", highlight: "5%" },
                                { text: "New user receives 3% bonus reward", highlight: "3%" },
                                { text: "Rewards are credited instantly to your wallet", highlight: "instantly" },
                                { text: "No limit on the number of referrals", highlight: "No limit" }
                            ].map((rule, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-slate-600">
                                    <div className="bg-green-100 text-green-600 rounded-full p-1 mt-0.5 shrink-0">
                                        <CheckCircle size={14} />
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
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <Users size={24} />
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-medium text-sm mb-1">Total Referrals</h3>
                            <div className="text-3xl font-bold text-slate-900">
                                12
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-medium text-sm mb-1">Total Earned</h3>
                            <div className="text-3xl font-bold text-slate-900">
                                4,500 <span className="text-sm text-slate-400 font-medium">NILA</span>
                            </div>
                        </div>
                    </div>

                    {/* Simple Explanation / CTA Card */}
                    <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full -ml-10 -mb-10 blur-3xl"></div>

                        <div className="relative z-10 text-center">
                            <h2 className="text-2xl font-bold mb-3">Boost Your Earnings</h2>
                            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                                Share your code on social media and crypto communities to maximize your passive income.
                            </p>

                            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-red-600/20 active:scale-[0.98] flex items-center justify-center gap-2">
                                <Share2 size={20} />
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
