import React, { useState } from 'react';
import { X, Zap, TrendingUp, CheckCircle, LogOut } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ContractService } from '../services/contractService';
import { rewardApi } from '../services/rewardApi';
import { transactionApi } from '../services/transactionApi';
import toast from 'react-hot-toast';

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
    const [unstaking, setUnstaking] = useState(false);
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

    // Check if stake can be unstaked
    const canUnstake = () => {
        if (!stake.endDate) return false;
        const endTime = new Date(stake.endDate).getTime();
        const now = Date.now();
        return now >= endTime && stake.status === 'active';
    };

    const handleUnstake = async () => {
        if (!address || unstaking) return;

        try {
            setUnstaking(true);
            setError(null);

            // Since the database stakeId doesn't match blockchain index,
            // we need to find the correct stake by matching amount and dates
            // This is a workaround until onChainStakeId is added to the database
            
            // For now, try to use the stakeId if it's a valid number
            let stakeIndex: number | null = null;
            
            if (stake.stakeId !== undefined && stake.stakeId !== null) {
                if (typeof stake.stakeId === 'number') {
                    stakeIndex = stake.stakeId;
                } else if (typeof stake.stakeId === 'string') {
                    // Try to parse as number
                    const parsed = parseInt(stake.stakeId, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                        stakeIndex = parsed;
                    }
                }
            }

            if (stakeIndex === null || stakeIndex < 0) {
                throw new Error(
                    'Unable to determine blockchain stake index. ' +
                    'Please contact support with your stake details.'
                );
            }

            console.log('Unstaking with index:', stakeIndex);

            // Unstake via contract (automatically claims APY rewards + returns principal)
            const txHash = await ContractService.unstake(stakeIndex);

            // Record transaction
            try {
                const totalAmount = parseFloat(stake.amount) + parseFloat(stake.rewards);
                await transactionApi.createTransaction({
                    txHash,
                    walletAddress: address,
                    type: 'UNSTAKE',
                    amount: totalAmount,
                    status: 'confirmed'
                });
            } catch (backendError) {
                console.error('Backend recording failed:', backendError);
                // Don't fail if backend recording fails
            }

            toast.success(`Successfully unstaked ${stake.amount} NILA + ${stake.rewards} NILA rewards!`);

            if (onClaimSuccess) onClaimSuccess();
            setTimeout(() => onClose(), 1500);

        } catch (err: any) {
            console.error('Unstake error:', err);
            const errorMessage = err.message || 'Failed to unstake';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setUnstaking(false);
        }
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
                // Backend record failed
            }

            if (onClaimSuccess) onClaimSuccess();
            setTimeout(() => onClose(), 1000);

        } catch (err: any) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
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

                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 text-sm font-medium mb-1">Error</p>
                            <p className="text-red-700 text-xs">{error}</p>
                            <p className="text-red-600 text-xs mt-2">
                                Stake ID: {JSON.stringify(stake.stakeId)} (Type: {typeof stake.stakeId})
                            </p>
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

                            {canUnstake() ? (
                                // If stake can be unstaked, show info that rewards will be claimed on unstake
                                <div className="text-right">
                                    <div className="text-xs text-blue-600 font-medium mb-1">Auto-claimed on unstake</div>
                                    <div className="text-xs text-slate-500">Unstake to receive</div>
                                </div>
                            ) : isRewardClaimable ? (
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

                    {/* Unstake Section */}
                    {canUnstake() && (
                        <div className="pt-4 border-t border-slate-200">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                        <LogOut size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-green-900 mb-1">Ready to Unstake</h4>
                                        <p className="text-sm text-green-700 leading-relaxed">
                                            Your lock period has ended. Unstaking will automatically claim all pending APY rewards 
                                            and return your principal amount.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/60 rounded-lg p-3 mb-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Principal Amount:</span>
                                        <span className="font-bold text-slate-900">{formatTokenAmount(stake.amount)} NILA</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Pending APY Rewards:</span>
                                        <span className="font-bold text-green-600">+{formatTokenAmount(stake.rewards)} NILA</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200">
                                        <span className="font-bold text-slate-900">Total You'll Receive:</span>
                                        <span className="font-bold text-green-600 text-lg">
                                            {formatTokenAmount((parseFloat(stake.amount) + parseFloat(stake.rewards)).toString())} NILA
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUnstake}
                                    disabled={unstaking}
                                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {unstaking ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Unstaking...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LogOut size={20} />
                                            <span>Unstake & Claim All Rewards</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Lock Period Active Message */}
                    {!canUnstake() && stake.status === 'active' && (
                        <div className="pt-4 border-t border-slate-200">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <TrendingUp size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-blue-900 mb-1">Lock Period Active</p>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        You can unstake after {stake.endDate ? new Date(stake.endDate).toLocaleDateString() : 'the lock period ends'}. 
                                        Unstaking will automatically claim all your APY rewards along with your principal.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StakeDetailsModal;
