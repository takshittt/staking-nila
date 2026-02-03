import React from 'react';
import { X, Clock, Zap, TrendingUp, CheckCircle } from 'lucide-react';

interface StakeData {
    id: string;
    amount: string;
    duration: string;
    apy: string;
    cashback: string;
    progress: number;
    rewards: string;
    status: string;
    cashbackClaimed?: boolean;
}

interface StakeDetailsModalProps {
    stake: StakeData;
    onClose: () => void;
}

const StakeDetailsModal: React.FC<StakeDetailsModalProps> = ({ stake, onClose }) => {
    // Mock cooldown/claimable status
    const isRewardClaimable = false;
    const isCashbackClaimable = !stake.cashbackClaimed;
    const cooldownTime = "14d 12h";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-slate-900">Stake #{stake.id}</h2>
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                {stake.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">View details and manage rewards</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Staked Amount</div>
                            <div className="text-lg font-bold text-slate-900">{stake.amount} NILA</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Duration</div>
                            <div className="text-lg font-bold text-slate-900">{stake.duration}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">APY</div>
                            <div className="text-lg font-bold text-green-600">{stake.apy}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Instant Cashback</div>
                            <div className="text-lg font-bold text-purple-600">{stake.cashback}</div>
                        </div>
                    </div>

                    {/* Reward Actions */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">Available Actions</h3>

                        {/* APY Rewards Claim */}
                        <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">Staking Rewards</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        Accrued: <span className="font-medium text-slate-900">{stake.rewards} NILA</span>
                                    </div>
                                </div>
                            </div>

                            {isRewardClaimable ? (
                                <button className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-200">
                                    Claim
                                </button>
                            ) : (
                                <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium border border-orange-100">
                                        <Clock size={12} />
                                        <span>{cooldownTime}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cashback Claim */}
                        <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">Instant Cashback</div>
                                    <div className="text-xs text-slate-500">6% of principal</div>
                                </div>
                            </div>

                            {isCashbackClaimable ? (
                                <button className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                                    Claim
                                </button>
                            ) : (
                                <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-lg flex items-center gap-2 cursor-not-allowed">
                                    <CheckCircle size={14} />
                                    Claimed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StakeDetailsModal;
