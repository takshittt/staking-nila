import { useState } from 'react';
import { Trophy, Zap, Users, Clock, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';

const Rewards = () => {
    // Mock data state for rewards
    const [rewards] = useState({
        instantCashback: 500,
        stakingRewards: 120,
        referralRewards: 50,
        totalClaimable: 670,
        cooldownDays: 12,
        isClaimable: false
    });

    return (
        <div className="space-y-8 pb-12">

            {/* Page Title */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                        <Trophy size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Your Rewards</h1>
                </div>
                <p className="text-slate-500 max-w-2xl">
                    Track and claim all rewards earned from staking and referrals. Rewards accumulate over time and can be claimed monthly.
                </p>
            </div>

            {/* Reward Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Instant Cashback Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <Zap size={24} />
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                            Earned
                        </span>
                    </div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1">Instant Cashback</h3>
                    <div className="text-2xl font-bold text-slate-900">
                        {rewards.instantCashback.toLocaleString()} <span className="text-sm font-medium text-slate-400">NILA</span>
                    </div>
                </div>

                {/* Staking Rewards (APY) Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                            Accumulating
                        </span>
                    </div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1">Staking Rewards (APY)</h3>
                    <div className="text-2xl font-bold text-slate-900">
                        {rewards.stakingRewards.toLocaleString()} <span className="text-sm font-medium text-slate-400">NILA</span>
                    </div>
                </div>

                {/* Referral Rewards Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                            Earned
                        </span>
                    </div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1">Referral Rewards</h3>
                    <div className="text-2xl font-bold text-slate-900">
                        {rewards.referralRewards.toLocaleString()} <span className="text-sm font-medium text-slate-400">NILA</span>
                    </div>
                </div>
            </div>

            {/* Claim Panel */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">

                    {/* Left Side: Total Rewards Info */}
                    <div className="space-y-4 text-center md:text-left">
                        <div>
                            <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Claimable Rewards</h2>
                            <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                                {rewards.totalClaimable.toLocaleString()} <span className="text-2xl text-slate-500">NILA</span>
                            </div>
                        </div>

                        {!rewards.isClaimable && (
                            <div className="inline-flex items-center gap-2 bg-slate-800/50 text-yellow-400 px-4 py-2 rounded-full border border-yellow-500/20">
                                <Clock size={16} />
                                <span className="font-medium">Next claim available in {rewards.cooldownDays} days</span>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Action Button */}
                    <div className="w-full md:w-auto flex flex-col items-center gap-4">
                        <button
                            disabled={!rewards.isClaimable}
                            className={`w-full md:w-64 py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2
                                ${rewards.isClaimable
                                    ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-red-600/20 active:scale-[0.98]'
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                                }`}
                        >
                            {rewards.isClaimable ? (
                                <>
                                    <CheckCircle size={20} />
                                    Claim Rewards
                                </>
                            ) : (
                                <>
                                    <Clock size={20} />
                                    Cooldown Active
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer Info Section */}
                <div className="bg-slate-800/50 p-6 border-t border-slate-700/50 flex flex-col md:flex-row gap-6 md:gap-12 text-sm text-slate-400">
                    <div className="flex gap-3">
                        <AlertCircle className="shrink-0 text-slate-500" size={20} />
                        <p>Rewards can be claimed once every 30 days to ensure network stability and sustainable APY distribution.</p>
                    </div>
                    <div className="flex gap-3">
                        <CheckCircle className="shrink-0 text-slate-500" size={20} />
                        <p>Claiming rewards does not affect your staked NILA positions or ongoing APY accumulation.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rewards;
