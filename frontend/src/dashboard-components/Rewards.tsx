import { useState, useEffect } from 'react';
import { Trophy, Zap, Users, Clock, AlertCircle, TrendingUp, CheckCircle, ArrowUpRight, History, RefreshCw } from 'lucide-react';
import { rewardApi } from '../services/rewardApi';
import { transactionApi } from '../services/transactionApi';
import type { PendingRewards, RewardHistory, LifetimeEarnings } from '../services/rewardApi';
import { useWallet } from '../hooks/useWallet';
import { ContractService } from '../services/contractService';

const Rewards = () => {
    const { address } = useWallet();
    const [rewards, setRewards] = useState<PendingRewards | null>(null);
    const [lifetime, setLifetime] = useState<LifetimeEarnings | null>(null);
    const [history, setHistory] = useState<RewardHistory[]>([]);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Load rewards data
    const loadRewardsData = async () => {
        if (!address) return;

        try {
            setIsLoading(true);
            setError(null);

            const [pendingData, lifetimeData, historyData] = await Promise.all([
                rewardApi.getPendingRewards(address),
                rewardApi.getLifetimeEarnings(address),
                rewardApi.getRewardHistory(address, 10)
            ]);

            setRewards(pendingData);
            setLifetime(lifetimeData);
            setHistory(historyData);
        } catch (err: any) {
            console.error('Error loading rewards:', err);
            setError(err.message || 'Failed to load rewards');
        } finally {
            setIsLoading(false);
        }
    };

    // Sync APY rewards from blockchain
    const syncAPYRewards = async () => {
        if (!address) return;

        try {
            setIsSyncing(true);
            await rewardApi.syncAPYRewards(address);
            await loadRewardsData();
            setSuccessMessage('APY rewards synced successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error syncing APY rewards:', err);
            setError(err.message || 'Failed to sync APY rewards');
        } finally {
            setIsSyncing(false);
        }
    };

    // Claim rewards
    const handleClaim = async (type: 'ALL' | 'INSTANT_CASHBACK' | 'REFERRAL_REWARD') => {
        if (!address || !rewards) return;

        try {
            setIsClaiming(true);
            setError(null);

            // Capture the amounts BEFORE claiming (contract will return 0 after)
            const instantAmount = rewards.instantCashback;
            const referralAmount = rewards.referralRewards;

            let txHash: string;

            if (type === 'INSTANT_CASHBACK') {
                // Claim instant rewards via contract
                txHash = await ContractService.claimInstantRewards();
            } else if (type === 'REFERRAL_REWARD') {
                // Claim referral rewards via contract
                txHash = await ContractService.claimReferralRewards();
            } else {
                // Claim all rewards via contract
                txHash = await ContractService.claimAllRewards();
            }

            // Record the claim in the database for lifetime earnings tracking
            try {
                await rewardApi.recordClaim(address, type, instantAmount, referralAmount, txHash);

                // Also record in transactions table for transaction history
                const claimAmount = type === 'INSTANT_CASHBACK' ? instantAmount :
                    type === 'REFERRAL_REWARD' ? referralAmount :
                        instantAmount + referralAmount;

                await transactionApi.createTransaction({
                    txHash,
                    walletAddress: address,
                    type: 'CLAIM_REWARD',
                    amount: claimAmount,
                    status: 'confirmed'
                });
            } catch (backendError: any) {
                console.error('Backend record failed:', backendError);
                // Don't fail the whole operation if backend recording fails
                // The claim already succeeded on-chain
            }

            setSuccessMessage(`Successfully claimed rewards! Tx: ${txHash.substring(0, 10)}...`);
            setTimeout(() => setSuccessMessage(null), 5000);

            // Reload data
            await loadRewardsData();
        } catch (err: any) {
            console.error('Error claiming rewards:', err);
            setError(err.message || 'Failed to claim rewards');
        } finally {
            setIsClaiming(false);
        }
    };

    useEffect(() => {
        loadRewardsData();
    }, [address]);

    if (!address) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Your Wallet</h3>
                    <p className="text-slate-500">Please connect your wallet to view rewards</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading rewards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={20} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Page Title */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                <Trophy size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Rewards Center</h1>
                        </div>
                        <p className="text-slate-500 max-w-2xl">
                            Manage and claim your rewards from staking, referrals, and instant cashback.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={syncAPYRewards}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                            Sync APY
                        </button>
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Earnings</p>
                                <p className="text-xl font-bold text-slate-900">{lifetime?.totalLifetime.toFixed(2) || '0'} NILA</p>
                            </div>
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reward Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Instant Cashback Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={80} className="text-red-500" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <Zap size={24} />
                        </div>
                        {rewards && rewards.instantCashback > 0 && (
                            <button
                                onClick={() => handleClaim('INSTANT_CASHBACK')}
                                disabled={isClaiming}
                                className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isClaiming ? '...' : 'Claim'}
                            </button>
                        )}
                    </div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1 relative z-10">Instant Cashback</h3>
                    <div className="text-3xl font-bold text-slate-900 relative z-10">
                        {rewards?.instantCashback.toFixed(2) || '0'} <span className="text-sm font-medium text-slate-400">NILA</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 relative z-10">Available instantly</p>
                </div>

                {/* Staking Rewards (APY) Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={80} className="text-blue-500" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Clock size={12} />
                            30d Cooldown
                        </span>
                    </div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1 relative z-10">Staking Rewards</h3>
                    <div className="text-3xl font-bold text-slate-900 relative z-10">
                        {rewards?.stakingRewards.toFixed(2) || '0'} <span className="text-sm font-medium text-slate-400">NILA</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 relative z-10">Accumulating daily</p>
                </div>

                {/* Referral Rewards Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={80} className="text-purple-500" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        {rewards && rewards.referralRewards > 0 && (
                            <button
                                onClick={() => handleClaim('REFERRAL_REWARD')}
                                disabled={isClaiming}
                                className="text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                {isClaiming ? '...' : 'Claim'}
                            </button>
                        )}
                    </div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1 relative z-10">Referral Rewards</h3>
                    <div className="text-3xl font-bold text-slate-900 relative z-10">
                        {rewards?.referralRewards.toFixed(2) || '0'} <span className="text-sm font-medium text-slate-400">NILA</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 relative z-10">Available instantly</p>
                </div>
            </div>

            {/* Main Claim Panel */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Trophy size={300} className="text-white" />
                </div>

                <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="space-y-4 text-center md:text-left">
                        <div>
                            <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Claimable Balance</h2>
                            <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                                {rewards?.totalClaimable.toFixed(2) || '0'} <span className="text-2xl font-bold text-slate-500">NILA</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <div className="inline-flex items-center gap-2 bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {rewards?.instantCashback.toFixed(2) || '0'} Instant
                            </div>
                            <div className="inline-flex items-center gap-2 bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {rewards?.stakingRewards.toFixed(2) || '0'} Staking
                            </div>
                            <div className="inline-flex items-center gap-2 bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                {rewards?.referralRewards.toFixed(2) || '0'} Referral
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col items-center gap-4">
                        <button
                            onClick={() => handleClaim('ALL')}
                            disabled={!rewards || rewards.totalClaimable === 0 || isClaiming}
                            className={`w-full md:w-72 py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2
                                ${rewards && rewards.totalClaimable > 0
                                    ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white hover:shadow-red-600/30 active:scale-[0.98]'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }`}
                        >
                            {isClaiming ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle size={24} />
                                    Claim All Rewards
                                </>
                            )}
                        </button>
                        {rewards && rewards.stakingRewards > 0 && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Staking rewards subject to 30-day cooldown
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Rewards History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <History size={20} className="text-slate-400" />
                        Reward History
                    </h3>
                    <button
                        onClick={loadRewardsData}
                        className="text-sm text-red-600 font-medium hover:text-red-700"
                    >
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {history.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <History size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No reward history yet</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4 text-left">Type</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-left">Claimed</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Tx</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg 
                                                    ${item.type === 'INSTANT_CASHBACK' ? 'bg-red-50 text-red-600' :
                                                        item.type === 'APY_REWARD' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-purple-50 text-purple-600'}`}>
                                                    {item.type === 'INSTANT_CASHBACK' ? <Zap size={16} /> :
                                                        item.type === 'APY_REWARD' ? <TrendingUp size={16} /> :
                                                            <Users size={16} />}
                                                </div>
                                                <span className="font-medium text-slate-700">
                                                    {item.type === 'INSTANT_CASHBACK' ? 'Instant' :
                                                        item.type === 'APY_REWARD' ? 'Staking' : 'Referral'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                                            +{item.amount.toFixed(2)} NILA
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                            {new Date(item.claimedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                Claimed
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <a
                                                href={`https://testnet.bscscan.com/tx/${item.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                                            >
                                                <ArrowUpRight size={18} />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Rewards;
