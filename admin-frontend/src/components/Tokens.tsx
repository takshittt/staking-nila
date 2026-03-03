import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { DepositModal, WithdrawModal } from './TreasuryModals';
import { USDTWithdrawModal, NILALiabilityDepositModal } from './USDTModals';
import { treasuryApi } from '../api/treasuryApi';
import type { TreasuryStats, NILALiabilityStatus, USDTBalance } from '../api/treasuryApi';
import toast from 'react-hot-toast';

const Tokens = () => {
    const [stats, setStats] = useState<TreasuryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // USDT states
    const [usdtBalance, setUsdtBalance] = useState<USDTBalance | null>(null);
    const [isUSDTWithdrawOpen, setIsUSDTWithdrawOpen] = useState(false);
    
    // NILA Liability states
    const [nilaLiabilityStatus, setNilaLiabilityStatus] = useState<NILALiabilityStatus | null>(null);
    const [isNILALiabilityDepositOpen, setIsNILALiabilityDepositOpen] = useState(false);

    // Fetch treasury stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch main treasury stats
            const data = await treasuryApi.getStats();
            setStats(data);
            
            // Fetch USDT balance
            try {
                const usdtData = await treasuryApi.getUSDTBalance();
                setUsdtBalance(usdtData);
            } catch (err) {
                console.error('Failed to fetch USDT balance:', err);
            }
            
            // Fetch NILA liability status
            try {
                const liabilityData = await treasuryApi.getNILALiabilityStatus();
                setNilaLiabilityStatus(liabilityData);
            } catch (err) {
                console.error('Failed to fetch NILA liability status:', err);
            }
            
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch treasury stats');
        } finally {
            setLoading(false);
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
            toast.error(err.response?.data?.error || 'Failed to withdraw tokens');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUSDTWithdraw = async (amount: number) => {
        try {
            setIsProcessing(true);
            await treasuryApi.withdrawUSDT(amount);
            setIsUSDTWithdrawOpen(false);
            toast.success(`Successfully withdrew ${amount} USDT`);
            // Refresh stats after withdrawal
            await fetchStats();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to withdraw USDT');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNILALiabilityDeposit = async (amount: number) => {
        try {
            setIsProcessing(true);
            await treasuryApi.depositNILAForLiabilities(amount);
            setIsNILALiabilityDepositOpen(false);
            toast.success(`Successfully deposited ${amount} NILA for liabilities`);
            // Refresh stats after deposit
            await fetchStats();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to deposit NILA for liabilities');
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
    const pendingRewards = Number(stats.pendingRewards || 0) / 1e18;
    const healthStatus = stats.healthStatus;
    const tokensNeeded = Math.max(0, pendingRewards - contractBalance);

    // Helper function to safely format numbers
    const formatNumber = (value: number) => {
        if (isNaN(value) || !isFinite(value)) return '0';
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const renderHealthBanner = () => {
        switch (healthStatus) {
            case 'healthy':
                return (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-full">
                            <ShieldCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-green-900">Treasury is Healthy</h3>
                            <p className="text-sm text-green-700">Contract balance is sufficient to cover all pending rewards.</p>
                        </div>
                    </div>
                );
            case 'low':
                return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-amber-900">Treasury Needs Attention</h3>
                            <p className="text-sm text-amber-700">Balance is low relative to pending obligations. Consider depositing more tokens.</p>
                        </div>
                    </div>
                );
            case 'critical':
                return (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertOctagon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-900">Treasury Critical</h3>
                            <p className="text-sm text-red-700">
                                <strong>{formatNumber(tokensNeeded)} NILA</strong> deficit. Immediate deposit required to ensure solvency.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Token Treasury</h1>
                    <p className="text-slate-600 mt-1">Monitor contract liquidity and manage funds</p>
                </div>
                <div className="flex gap-3">
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

            {/* NILA Liability Status Section */}
            {nilaLiabilityStatus && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">NILA Liabilities (USDT Purchases)</h3>
                                <p className="text-sm text-slate-600">NILA recorded from USDT purchases - must be covered</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsNILALiabilityDepositOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                        >
                            <ArrowDownCircle className="w-5 h-5" />
                            Deposit NILA
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-red-100">
                            <p className="text-sm text-slate-600 mb-1">Total Liabilities</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {(Number(nilaLiabilityStatus.totalLiabilities) / 1e18).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">NILA recorded</p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-red-100">
                            <p className="text-sm text-slate-600 mb-1">NILA Balance</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {(Number(nilaLiabilityStatus.nilaBalance) / 1e18).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Available to pay</p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-red-100">
                            <p className="text-sm text-slate-600 mb-1">
                                {nilaLiabilityStatus.hasSurplus ? 'Surplus' : 'Deficit'}
                            </p>
                            <p className={`text-2xl font-bold ${nilaLiabilityStatus.hasSurplus ? 'text-green-600' : 'text-red-600'}`}>
                                {nilaLiabilityStatus.hasSurplus ? '+' : '-'}
                                {(Math.abs(Number(nilaLiabilityStatus.deficitOrSurplus)) / 1e18).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {nilaLiabilityStatus.hasSurplus ? 'Extra buffer' : 'Need to deposit'}
                            </p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-red-100 flex items-center justify-center">
                            {nilaLiabilityStatus.hasSurplus ? (
                                <div className="text-center">
                                    <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-green-700">Covered</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <AlertOctagon className="w-8 h-8 text-red-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-red-700">Action Needed</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* USDT Treasury Section */}
            {usdtBalance && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">USDT Treasury</h3>
                                <p className="text-sm text-slate-600">Collected from USDT purchases</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsUSDTWithdrawOpen(true)}
                            disabled={Number(usdtBalance.balance) === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowUpCircle className="w-5 h-5" />
                            Withdraw USDT
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100">
                            <p className="text-sm text-slate-600 mb-1">Current Balance</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {(Number(usdtBalance.balance) / 1e18).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">USDT available to withdraw</p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100">
                            <p className="text-sm text-slate-600 mb-1">Total Collected</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {(Number(usdtBalance.totalCollected) / 1e18).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">USDT from all purchases</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contract Balance (Treasury Assets) */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24 text-blue-600" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Total Assets</p>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">
                        {(contractBalance - (Number(stats.totalStaked) / 1e18)).toLocaleString()}
                        <span className="text-lg text-slate-500 font-normal ml-2">NILA</span>
                    </h2>
                    <p className="text-sm text-slate-400">Excludes user staked tokens</p>
                </div>

                {/* Pending Rewards (Liabilities) */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Liabilities</p>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">
                        {pendingRewards.toLocaleString()}
                        <span className="text-lg text-slate-500 font-normal ml-2">NILA</span>
                    </h2>
                    <p className="text-sm text-slate-400">Pending rewards (APY + Instant + Ref)</p>
                </div>

                {/* Net Position */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Net Position</p>
                    <h2 className={`text-4xl font-bold mb-2 ${(contractBalance - (Number(stats.totalStaked) / 1e18)) >= pendingRewards ? 'text-green-600' : 'text-red-600'}`}>
                        {((contractBalance - (Number(stats.totalStaked) / 1e18)) - pendingRewards).toLocaleString()}
                        <span className="text-lg text-slate-500 font-normal ml-2">NILA</span>
                    </h2>
                    <p className="text-sm text-slate-400">
                        {(contractBalance - (Number(stats.totalStaked) / 1e18)) >= pendingRewards ? 'Surplus available' : 'Deficit - Action needed'}
                    </p>
                </div>
            </div>
            {/* Quick Actions / Explainer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">About Treasury Health</h3>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>
                                <strong>Healthy:</strong> Assets cover at least 120% of liabilities. Safe buffer.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <span>
                                <strong>Low:</strong> Assets cover 100-120% of liabilities. Monitor closely.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                            <span>
                                <strong>Critical:</strong> Assets are less than liabilities.
                                <span className="text-red-600 font-medium"> Deposits may fail.</span>
                            </span>
                        </li>
                    </ul>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Contract Info</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Contract Address</p>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="bg-white px-2 py-1 rounded border border-slate-200 text-sm font-mono text-slate-700">
                                    {stats.contractAddress ? `${stats.contractAddress.slice(0, 6)}...${stats.contractAddress.slice(-4)}` : 'N/A'}
                                </code>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">Active</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Network</p>
                            <p className="text-sm text-slate-700 font-medium">BSC Testnet</p>
                        </div>
                    </div>
                </div>
            </div>

            <DepositModal
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onConfirm={handleDeposit}
                isProcessing={isProcessing}
            />

            <WithdrawModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
                onConfirm={handleWithdraw}
                isProcessing={isProcessing}
                maxAmount={contractBalance}
            />

            <USDTWithdrawModal
                isOpen={isUSDTWithdrawOpen}
                onClose={() => setIsUSDTWithdrawOpen(false)}
                onConfirm={handleUSDTWithdraw}
                isProcessing={isProcessing}
                currentBalance={usdtBalance ? Number(usdtBalance.balance) / 1e18 : 0}
                totalCollected={usdtBalance ? Number(usdtBalance.totalCollected) / 1e18 : 0}
            />

            <NILALiabilityDepositModal
                isOpen={isNILALiabilityDepositOpen}
                onClose={() => setIsNILALiabilityDepositOpen(false)}
                onConfirm={handleNILALiabilityDeposit}
                isProcessing={isProcessing}
                totalLiabilities={nilaLiabilityStatus ? Number(nilaLiabilityStatus.totalLiabilities) / 1e18 : 0}
                nilaBalance={nilaLiabilityStatus ? Number(nilaLiabilityStatus.nilaBalance) / 1e18 : 0}
                deficit={nilaLiabilityStatus ? Math.abs(Number(nilaLiabilityStatus.deficitOrSurplus)) / 1e18 : 0}
                hasSurplus={nilaLiabilityStatus?.hasSurplus || false}
            />
        </div >
    );
};

export default Tokens;
