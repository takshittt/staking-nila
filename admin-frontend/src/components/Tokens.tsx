import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, Clock, Zap, Users, Pause, Play } from 'lucide-react';
import { DepositModal, WithdrawModal } from './TreasuryModals';
import { treasuryApi } from '../api/treasuryApi';
import type { TreasuryStats } from '../api/treasuryApi';
import toast from 'react-hot-toast';

const Tokens = () => {
    const [stats, setStats] = useState<TreasuryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoadingPauseStatus, setIsLoadingPauseStatus] = useState(false);

    // Fetch treasury stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch main treasury stats
            const data = await treasuryApi.getStats();
            setStats(data);
            
            // Fetch contract pause status
            await fetchPauseStatus();
            
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch treasury stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchPauseStatus = async () => {
        try {
            const status = await treasuryApi.getStatus();
            setIsPaused(status.isPaused);
        } catch (err) {
            // Silent error handling
        }
    };

    const handlePauseToggle = async () => {
        try {
            setIsLoadingPauseStatus(true);
            if (isPaused) {
                await treasuryApi.unpause();
                toast.success('Contract unpaused successfully');
            } else {
                await treasuryApi.pause();
                toast.success('Contract paused successfully');
            }
            await fetchPauseStatus();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to toggle pause status');
        } finally {
            setIsLoadingPauseStatus(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDeposit = async (amount: number) => {
        try {
            setIsProcessing(true);
            await treasuryApi.deposit(amount);
            setIsDepositOpen(false);
            toast.success(`Successfully deposited ${amount} NILA`);
            // Refresh stats after deposit
            await fetchStats();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to deposit tokens');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWithdraw = async (amount: number) => {
        try {
            setIsProcessing(true);
            await treasuryApi.withdraw(amount);
            setIsWithdrawOpen(false);
            toast.success(`Successfully withdrew ${amount} NILA`);
            // Refresh stats after withdrawal
            await fetchStats();
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to withdraw tokens';
            toast.error(errorMessage);
            // Keep modal open so user can see the error and try again
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-600">Loading treasury data...</div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }

    if (!stats) return null;

    // Convert wei to tokens (18 decimals)
    const contractBalance = Number(stats.contractBalance || 0) / 1e18;
    const totalStaked = Number(stats.totalStaked || 0) / 1e18;
    const availableForRewards = Number(stats.availableForRewards || 0) / 1e18;
    const claimableInstant = Number(stats.claimableInstantRewards || 0) / 1e18;
    const claimableReferral = Number(stats.claimableReferralRewards || 0) / 1e18;
    const totalClaimableNow = Number(stats.totalClaimableNow || 0) / 1e18;
    const currentAPY = Number(stats.currentAPYRewards || 0) / 1e18;
    const projectedDaily = Number(stats.projectedAPYDaily || 0) / 1e18;
    const projectedMonthly = Number(stats.projectedAPYMonthly || 0) / 1e18;
    const totalObligations = Number(stats.totalObligations || 0) / 1e18;
    const netPosition = Number(stats.netPosition || 0) / 1e18;
    const recommendedDeposit = Number(stats.recommendedDeposit || 0) / 1e18;
    const bufferForNewStakes = Number(stats.bufferForNewStakes || 0) / 1e18;
    
    const healthStatus = stats.healthStatus;
    const coverageRatio = stats.coverageRatio;
    const daysUntilCritical = stats.daysUntilCritical;

    // Helper function to safely format numbers
    const formatNumber = (value: number, decimals: number = 2) => {
        if (isNaN(value) || !isFinite(value)) return '0';
        return value.toLocaleString(undefined, { 
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals 
        });
    };

    const renderHealthBanner = () => {
        switch (healthStatus) {
            case 'healthy':
                return (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-full">
                            <ShieldCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-green-900">Treasury is Healthy</h3>
                            <p className="text-sm text-green-700">
                                Coverage ratio: {formatNumber(coverageRatio * 100, 0)}% • 
                                Surplus: {formatNumber(netPosition)} NILA • 
                                Safe for ~{daysUntilCritical} days
                            </p>
                        </div>
                    </div>
                );
            case 'low':
                return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-900">Treasury Needs Attention</h3>
                            <p className="text-sm text-amber-700">
                                Coverage ratio: {formatNumber(coverageRatio * 100, 0)}% (below 120% threshold) • 
                                Recommend depositing {formatNumber(recommendedDeposit)} NILA
                            </p>
                        </div>
                        <button
                            onClick={() => setIsDepositOpen(true)}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                        >
                            Deposit Now
                        </button>
                    </div>
                );
            case 'critical':
                return (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertOctagon className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-900">Treasury Critical - Immediate Action Required</h3>
                            <p className="text-sm text-red-700">
                                <strong>Deficit: {formatNumber(Math.abs(netPosition))} NILA</strong> • 
                                Deposit {formatNumber(recommendedDeposit)} NILA immediately to ensure solvency
                            </p>
                        </div>
                        <button
                            onClick={() => setIsDepositOpen(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm animate-pulse"
                        >
                            Deposit Now
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Token Treasury</h1>
                    <p className="text-slate-600 mt-1">Monitor reward pool and manage liquidity</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                        title="Refresh treasury data"
                    >
                        <Clock className="w-5 h-5" />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={() => setIsWithdrawOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                        <ArrowUpCircle className="w-5 h-5" />
                        Withdraw
                    </button>
                    <button
                        onClick={() => setIsDepositOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
                    >
                        <ArrowDownCircle className="w-5 h-5" />
                        Deposit
                    </button>
                </div>
            </div>

            {renderHealthBanner()}

            {/* Contract Overview */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Contract Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-5 h-5 text-blue-600" />
                            <p className="text-sm text-slate-600 font-medium">Contract Balance</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatNumber(contractBalance)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Total NILA in contract</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            <p className="text-sm text-slate-600 font-medium">User Staked</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatNumber(totalStaked)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Locked by users (not for rewards)</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <p className="text-sm text-slate-600 font-medium">Available for Rewards</p>
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                            {formatNumber(availableForRewards)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Admin deposited reward pool</p>
                    </div>
                </div>
            </div>

            {/* Immediate Obligations */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Immediate Obligations (Claimable Now)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-xl border border-orange-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-5 h-5 text-orange-600" />
                            <p className="text-sm text-slate-700 font-medium">Instant Cashback</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatNumber(claimableInstant)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">From Buy & Stake purchases</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <p className="text-sm text-slate-700 font-medium">Referral Rewards</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatNumber(claimableReferral)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">Referrer + referral bonuses</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-purple-600" />
                            <p className="text-sm text-slate-700 font-medium">Total Claimable</p>
                        </div>
                        <p className="text-3xl font-bold text-purple-600">
                            {formatNumber(totalClaimableNow)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">Can be claimed immediately</p>
                    </div>
                </div>
            </div>

            {/* APY Rewards */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">APY Rewards (Time-based, Accruing)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            <p className="text-sm text-slate-600 font-medium">Current APY Pending</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatNumber(currentAPY)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Accrued since last claim</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm text-slate-600 font-medium">Daily Accrual</p>
                        </div>
                        <p className="text-3xl font-bold text-emerald-600">
                            +{formatNumber(projectedDaily)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">NILA per day</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-teal-600" />
                            <p className="text-sm text-slate-600 font-medium">Monthly Projection</p>
                        </div>
                        <p className="text-3xl font-bold text-teal-600">
                            +{formatNumber(projectedMonthly)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">NILA per month</p>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Financial Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-sm text-slate-600 font-medium mb-2">Total Obligations</p>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatNumber(totalObligations)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Claimable + APY pending</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-sm text-slate-600 font-medium mb-2">Net Position</p>
                        <p className={`text-3xl font-bold ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {netPosition >= 0 ? '+' : ''}{formatNumber(netPosition)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {netPosition >= 0 ? 'Surplus available' : 'Deficit - deposit needed'}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-sm text-slate-600 font-medium mb-2">Recommended Deposit</p>
                        <p className={`text-3xl font-bold ${recommendedDeposit > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {formatNumber(recommendedDeposit)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {recommendedDeposit > 0 ? 'To reach healthy status' : 'Already healthy'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Treasury Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">Coverage Ratio</p>
                            <p className="text-2xl font-bold text-blue-600">{formatNumber(coverageRatio * 100, 0)}%</p>
                            <p className="text-xs text-slate-600 mt-1">
                                {coverageRatio >= 1.2 ? 'Healthy (above 120% threshold)' : 
                                 coverageRatio >= 1.0 ? 'Low (below 120% threshold)' : 
                                 'Critical (below 100%)'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">Days Until Critical</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {daysUntilCritical > 0 ? daysUntilCritical : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                {daysUntilCritical > 0 ? 'At current APY accrual rate' : 'Already critical or no accrual'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Wallet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">Buffer for New Stakes</p>
                            <p className="text-2xl font-bold text-green-600">{formatNumber(bufferForNewStakes)}</p>
                            <p className="text-xs text-slate-600 mt-1">
                                Available for instant + referral rewards (~12% of stake amount)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">Max New Stakes Supported</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatNumber(bufferForNewStakes / 0.12, 0)}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Approximate NILA worth of new stakes before deposit needed
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contract Control */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-3">Contract Control</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                {isPaused ? (
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <Pause className="w-5 h-5 text-red-600" />
                                    </div>
                                ) : (
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Play className="w-5 h-5 text-green-600" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Contract Status</p>
                                    <p className="text-xs text-slate-600">
                                        {isPaused ? 'Paused - Withdrawals enabled' : 'Active - Normal operations'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handlePauseToggle}
                                disabled={isLoadingPauseStatus}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    isPaused
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isLoadingPauseStatus ? 'Processing...' : isPaused ? 'Unpause' : 'Pause'}
                            </button>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                            <p>• Pause contract before withdrawing tokens</p>
                            <p>• Unpause after withdrawal to resume operations</p>
                            <p>• Users cannot stake or claim while paused</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">About Treasury Health</h3>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>
                                <strong>Healthy:</strong> Coverage ratio ≥ 120%. Safe buffer for operations.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <span>
                                <strong>Low:</strong> Coverage ratio 100-120%. Monitor closely and consider depositing.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                            <span>
                                <strong>Critical:</strong> Coverage ratio &lt; 100%. 
                                <span className="text-red-600 font-medium"> Immediate deposit required.</span>
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Contract Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Contract Info</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Contract Address</p>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="bg-white px-2 py-1 rounded border border-slate-200 text-sm font-mono text-slate-700">
                                    {stats.contractAddress ? `${stats.contractAddress.slice(0, 6)}...${stats.contractAddress.slice(-4)}` : 'N/A'}
                                </code>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    isPaused 
                                        ? 'text-red-600 bg-red-100' 
                                        : 'text-green-600 bg-green-100'
                                }`}>
                                    {isPaused ? 'Paused' : 'Active'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Network</p>
                            <p className="text-sm text-slate-700 font-medium">BSC Mainnet</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Withdrawal Instructions</h3>
                    <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                        <li>Pause the contract using the control panel</li>
                        <li>Click "Withdraw" and enter the amount</li>
                        <li>Confirm the transaction in your wallet</li>
                        <li>Unpause the contract to resume operations</li>
                    </ol>
                </div>
            </div>

            <DepositModal
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onConfirm={handleDeposit}
                isProcessing={isProcessing}
                recommendedAmount={recommendedDeposit}
                currentHealth={healthStatus}
            />

            <WithdrawModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
                onConfirm={handleWithdraw}
                isProcessing={isProcessing}
                maxAmount={availableForRewards}
            />
        </div>
    );
};

export default Tokens;
