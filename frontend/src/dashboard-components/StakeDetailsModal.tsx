import React, { useState } from 'react';
import { X, Zap, TrendingUp, CheckCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ContractService } from '../services/contractService';
import { rewardApi } from '../services/rewardApi';
import { transactionApi } from '../services/transactionApi';

interface StakeData {
    id: string;
    stakeId?: number | string;
    amount: string;
    lockDays?: number;
    duration?: string;
    apy: number | string;
    cashback: string;
    cashbackPercentage?: string;
    progress: number;
    rewards: string;
    status: string;
    cashbackClaimed?: boolean;
    startDate?: string;
    endDate?: string;
}

interface StakeDetailsModalProps {
    stake: StakeData;
    onClose: () => void;
    onClaimSuccess?: () => void;
}

const StakeDetailsModal: React.FC<StakeDetailsModalProps> = ({ stake, onClose, onClaimSuccess }) => {
    const { address } = useAccount();
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formatTokenAmount = (amount: string): string => {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0';
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const formatAPY = (apy: number | string): string => {
        if (typeof apy === 'string') return apy;
        return `${(apy / 100).toFixed(1)}%`;
    };



    const handleClaimCashback = async () => {
        if (!address || claiming) return;

        try {
            setClaiming(true);
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

            // 4. Notify parent to reload data
            if (onClaimSuccess) {
                onClaimSuccess();
            }

            // 5. Close modal after success
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err: any) {
            console.error('Error claiming cashback:', err);
            setError(err.message || 'Failed to claim instant cashback');
        } finally {
            setClaiming(false);
        }
    };

    const handleClaimRewards = async () => {
        if (!address || claiming) return;

        try {
            setClaiming(true);
            setError(null);

            const rewardAmount = parseFloat(stake.rewards);
            if (rewardAmount <= 0) {
                throw new Error('No rewards to claim');
            }

            // Claim all rewards (since contract doesn't support claiming just for one stake easily)
            // This is a limitation of the current contract view
            const txHash = await ContractService.claimAllRewards();

            // Record claim
            try {
                // Determine breakdown based on available rewards
                // This is an estimation since we claimed ALL
                await rewardApi.recordClaim(address, 'ALL', 0, 0, txHash);

                await transactionApi.createTransaction({
                    txHash,
                    walletAddress: address,
                    type: 'CLAIM_REWARD',
                    amount: rewardAmount, // Recording what was shown for this stake
                    status: 'confirmed'
                });
            } catch (backendError) {
                console.error('Backend record failed:', backendError);
            }

            if (onClaimSuccess) onClaimSuccess();
            setTimeout(() => onClose(), 1000);

        } catch (err: any) {
            console.error('Error claiming rewards:', err);
            setError(err.message || 'Failed to claim rewards');
        } finally {
            setClaiming(false);
        }
    };

    const duration = stake.lockDays ? `${stake.lockDays} Days` : stake.duration || 'N/A';
    const stakeNumber = stake.stakeId || stake.id;
    // const cooldownTime = calculateTimeRemaining(); // Unused now
    const isRewardClaimable = parseFloat(stake.rewards) > 0;
    const cashbackAmount = parseFloat(stake.cashback || '0');
    const isCashbackClaimable = cashbackAmount > 0 && !stake.cashbackClaimed;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-slate-900">Stake #{stakeNumber}</h2>
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
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Staked Amount</div>
                            <div className="text-lg font-bold text-slate-900">{formatTokenAmount(stake.amount)} NILA</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Duration</div>
                            <div className="text-lg font-bold text-slate-900">{duration}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">APY</div>
                            <div className="text-lg font-bold text-green-600">{formatAPY(stake.apy)}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Instant Cashback</div>
                            <div className="text-lg font-bold text-purple-600">{stake.cashbackPercentage || '0'}%</div>
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
                                        Accrued: <span className="font-medium text-slate-900">{formatTokenAmount(stake.rewards)} NILA</span>
                                    </div>
                                </div>
                            </div>

                            {isRewardClaimable ? (
                                <button
                                    onClick={handleClaimRewards}
                                    disabled={claiming}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {claiming ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Claiming...</span>
                                        </>
                                    ) : (
                                        'Claim'
                                    )}
                                </button>
                            ) : (
                                <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-lg flex items-center gap-2 cursor-not-allowed">
                                    <CheckCircle size={14} />
                                    No Rewards
                                </button>
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
                                    <div className="text-xs text-slate-500">{stake.cashbackPercentage || '0'}% of principal</div>
                                </div>
                            </div>

                            {isCashbackClaimable ? (
                                <button
                                    onClick={handleClaimCashback}
                                    disabled={claiming}
                                    className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {claiming ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Claiming...</span>
                                        </>
                                    ) : (
                                        'Claim'
                                    )}
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
