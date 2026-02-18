import React, { useState, useEffect } from 'react';
import { ArrowRight, Wallet, TrendingUp, Zap, Clock, ChevronRight, RefreshCw, CheckCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import StakeDetailsModal from './StakeDetailsModal';
import { dashboardApi, type DashboardStats, type StakeWithRewards } from '../services/dashboardApi';
import { ContractService } from '../services/contractService';
import { rewardApi } from '../services/rewardApi';
import { transactionApi } from '../services/transactionApi';

interface HomeDashboardProps {
    onNavigate: (tab: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
    const { address } = useAccount();
    const [selectedStake, setSelectedStake] = useState<any>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activeStakes, setActiveStakes] = useState<StakeWithRewards[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [claimingStakeId, setClaimingStakeId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (address) {
            loadDashboardData();
        }
    }, [address]);

    const loadDashboardData = async () => {
        if (!address) return;

        try {
            setLoading(true);
            setError(null);
            const [statsData, stakesData] = await Promise.all([
                dashboardApi.getDashboardStats(address),
                dashboardApi.getActiveStakes(address)
            ]);
            setStats(statsData);
            setActiveStakes(stakesData);
        } catch (err: any) {
            console.error('Failed to load dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatTokenAmount = (amount: string): string => {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0';
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const formatDate = (dateString?: string): string => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Available now';
        if (diffDays === 0) return 'Available today';
        if (diffDays === 1) return 'Available in 1 day';
        return `Available in ${diffDays} days`;
    };

    const handleClaimCashback = async (stake: StakeWithRewards) => {
        if (!address || stake.cashbackClaimed) return;

        try {
            setClaimingStakeId(stake.id);
            setError(null);

            // Capture the cashback amount BEFORE claiming
            const cashbackAmount = parseFloat(stake.cashback);

            if (cashbackAmount <= 0) {
                throw new Error('No instant cashback to claim for this stake');
            }

            // 1. Claim via smart contract
            const txHash = await ContractService.claimInstantRewards();

            // 2. Record the claim in database
            try {
                await rewardApi.recordClaim(address, 'INSTANT_CASHBACK', cashbackAmount, 0, txHash);

                // 3. Create transaction record
                await transactionApi.createTransaction({
                    txHash,
                    walletAddress: address,
                    type: 'CLAIM_REWARD',
                    amount: cashbackAmount,
                    status: 'confirmed'
                });
            } catch (backendError: any) {
                console.error('Backend record failed:', backendError);
                // Don't fail the whole operation if backend recording fails
                // The claim already succeeded on-chain
            }

            setSuccessMessage(`Successfully claimed ${cashbackAmount.toFixed(2)} NILA cashback!`);
            setTimeout(() => setSuccessMessage(null), 5000);

            // 4. Reload dashboard data to update UI
            await loadDashboardData();
        } catch (err: any) {
            console.error('Error claiming cashback:', err);
            setError(err.message || 'Failed to claim instant cashback');
            setTimeout(() => setError(null), 5000);
        } finally {
            setClaimingStakeId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Welcome Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Welcome to NILA Staking</h1>
                        <p className="text-slate-500 mt-1">Track your stakes, rewards, and referrals in one place.</p>
                    </div>
                    <button
                        onClick={loadDashboardData}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-green-800 text-sm font-medium">{successMessage}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

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
                        <div className="text-2xl font-bold text-slate-900">
                            {formatTokenAmount(stats?.totalStaked || '0')} NILA
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                            {stats?.activeStakesCount || 0} active stake{stats?.activeStakesCount !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Total Rewards Earned */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Total Rewards Earned</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                            {formatTokenAmount(stats?.totalRewardsEarned || '0')} NILA
                        </div>
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
                        <div className="text-2xl font-bold text-slate-900">
                            {formatTokenAmount(stats?.referralRewards || '0')} NILA
                        </div>
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
                        <div className="text-xl font-bold text-slate-900">
                            {formatDate(stats?.nextRewardDate)}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                            {stats?.nextRewardDate ? new Date(stats.nextRewardDate).toLocaleDateString() : 'No active stakes'}
                        </div>
                    </div>
                </div>

                {/* Active Stake Summary */}
                <div className="bg-gradient-to-r from-red-50 to-white rounded-xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-red-600 shrink-0 border border-slate-100">
                            <div className="relative">
                                {activeStakes.length > 0 && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                                <Wallet size={24} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Active Stake Summary</h3>
                            <p className="text-slate-600">
                                You currently have <span className="font-semibold text-slate-900">{activeStakes.length} active staked package{activeStakes.length !== 1 ? 's' : ''}</span>.
                                {activeStakes.length > 0 ? ' Rewards are accumulating in real time.' : ' Start staking to earn rewards.'}
                            </p>
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

                {/* Active Stakes Breakdown */}
                {activeStakes.length > 0 ? (
                    <div className="pb-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Active Stakes</h3>
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
                                                <div className="text-xs font-medium text-slate-500 mb-1">Stake #{stake.stakeId}</div>
                                                <div className="text-lg font-bold text-slate-900">{formatTokenAmount(stake.amount)} NILA</div>
                                            </div>
                                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Active
                                            </span>
                                        </div>

                                        {/* Meta Row */}
                                        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-slate-400 mb-0.5">Duration</div>
                                                <div className="font-semibold text-slate-700">{stake.lockDays} Days</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-slate-400 mb-0.5">APY</div>
                                                <div className="font-semibold text-green-600">{(stake.apy / 100).toFixed(1)}%</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-slate-400 mb-0.5">Cashback</div>
                                                <div className="font-semibold text-purple-600">{stake.cashbackPercentage || '0'}%</div>
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
                                                    {formatTokenAmount(stake.rewards)} NILA
                                                </span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                                            </div>
                                        </div>

                                        {/* Instant Cashback Section */}
                                        {parseFloat(stake.cashback) > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                                                            <Zap size={16} className="text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-900">Instant Cashback</div>
                                                            <div className="text-xs text-slate-500">{stake.cashbackPercentage}% of principal</div>
                                                        </div>
                                                    </div>
                                                    {stake.cashbackClaimed ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-100">
                                                            <CheckCircle size={14} />
                                                            Claimed
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleClaimCashback(stake);
                                                            }}
                                                            disabled={claimingStakeId === stake.id}
                                                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        >
                                                            {claimingStakeId === stake.id ? (
                                                                <>
                                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                    <span>Claiming...</span>
                                                                </>
                                                            ) : (
                                                                'Claim'
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="pb-8 text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                        <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Stakes</h3>
                        <p className="text-slate-500 mb-6">Start staking NILA to earn rewards</p>
                        <button
                            onClick={() => onNavigate('Stake Nila')}
                            className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                        >
                            <span>Start Staking</span>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            {selectedStake && (
                <StakeDetailsModal
                    stake={selectedStake}
                    onClose={() => setSelectedStake(null)}
                    onClaimSuccess={loadDashboardData}
                />
            )}
        </>
    );
};

export default HomeDashboard;
