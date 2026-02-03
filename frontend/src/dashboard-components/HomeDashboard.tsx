import React, { useState } from 'react';
import { ArrowRight, Wallet, TrendingUp, Zap, Clock, ChevronRight } from 'lucide-react';
import StakeDetailsModal from './StakeDetailsModal';

interface HomeDashboardProps {
    onNavigate: (tab: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
    const [selectedStake, setSelectedStake] = useState<any>(null);

    // Mock data for active stakes
    const activeStakes = [
        {
            id: '1024',
            amount: '10,000',
            duration: '180 Days',
            apy: '6%',
            cashback: '6%',
            progress: 72,
            rewards: '420',
            status: 'Active',
            cashbackClaimed: true
        },
        {
            id: '1025',
            amount: '5,000',
            duration: '90 Days',
            apy: '4%',
            cashback: '3%',
            progress: 35,
            rewards: '85',
            status: 'Active'
        },
        {
            id: '1026',
            amount: '25,000',
            duration: '365 Days',
            apy: '8%',
            cashback: '8%',
            progress: 12,
            rewards: '1,250',
            status: 'Active'
        }
    ];

    return (
        <>
            <div className="space-y-6">
                {/* Welcome Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome to NILA Staking</h1>
                    <p className="text-slate-500 mt-1">Track your stakes, rewards, and referrals in one place.</p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total NILA Staked */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <Wallet size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Total NILA Staked</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">45,000 NILA</div>
                        <div className="mt-2 text-xs text-green-600 font-medium">+12% from last month</div>
                    </div>

                    {/* Total Rewards Earned */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Total Rewards Earned</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">3,250 NILA</div>
                        <div className="mt-2 text-xs text-slate-400">Lifetime earnings</div>
                    </div>

                    {/* Referral Rewards */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                <Zap size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Referral Rewards</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">450 NILA</div>
                        <div className="mt-2 text-xs text-slate-400">Earned from invites</div>
                    </div>

                    {/* Next Reward Claim */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                <Clock size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Next Reward Claim</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">Available in 14 days</div>
                        <div className="mt-2 text-xs text-slate-400">Oct 28, 2024</div>
                    </div>
                </div>

                {/* Active Stake Summary */}
                <div className="bg-gradient-to-r from-red-50 to-white rounded-xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-red-600 shrink-0 border border-slate-100">
                            <div className="relative">
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                <Wallet size={24} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Active Stake Summary</h3>
                            <p className="text-slate-600">You currently have <span className="font-semibold text-slate-900">3 active staking plans</span>. Rewards are accumulating in real time.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => onNavigate('Stake Nila')}
                        className="group whitespace-nowrap bg-white text-slate-900 px-6 py-3 rounded-xl border border-slate-200 font-semibold shadow-sm hover:shadow-md hover:border-red-200 transition-all flex items-center space-x-2"
                    >
                        <span>View Stake Plans</span>
                        <ArrowRight size={18} className="text-red-500 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Active Staking Plans Breakdown */}
                <div className="pb-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Active Staking Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeStakes.map((stake) => (
                            <div
                                key={stake.id}
                                onClick={() => setSelectedStake(stake)}
                                className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                            >
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                                    <span className="text-xs font-semibold text-slate-900 bg-white px-3 py-1.5 rounded-full shadow-sm">Click to view details</span>
                                </div>

                                <div className="p-5">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-xs font-medium text-slate-500 mb-1">Stake #{stake.id}</div>
                                            <div className="text-lg font-bold text-slate-900">{stake.amount} NILA</div>
                                        </div>
                                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            {stake.status}
                                        </span>
                                    </div>

                                    {/* Meta Row */}
                                    <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                                            <div className="text-slate-400 mb-0.5">Duration</div>
                                            <div className="font-semibold text-slate-700">{stake.duration}</div>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                                            <div className="text-slate-400 mb-0.5">APY</div>
                                            <div className="font-semibold text-green-600">{stake.apy}</div>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                                            <div className="text-slate-400 mb-0.5">Cashback</div>
                                            <div className="font-semibold text-purple-600">{stake.cashback}</div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-slate-500">Staking Progress</span>
                                            <span className="font-medium text-slate-900">{stake.progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-red-500 to-red-600 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${stake.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400">Rewards Earned</span>
                                            <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                                {stake.rewards} NILA
                                            </span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {selectedStake && (
                <StakeDetailsModal
                    stake={selectedStake}
                    onClose={() => setSelectedStake(null)}
                />
            )}
        </>
    );
};

export default HomeDashboard;
