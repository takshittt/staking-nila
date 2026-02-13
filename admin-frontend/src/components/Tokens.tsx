import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { DepositModal, WithdrawModal } from './TreasuryModals';
import { treasuryApi } from '../api/treasuryApi';
import type { TreasuryStats } from '../api/treasuryApi';

const Tokens = () => {
    const [stats, setStats] = useState<TreasuryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch treasury stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await treasuryApi.getStats();
            setStats(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch treasury stats');
            console.error('Error fetching treasury stats:', err);
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
            alert(err.response?.data?.error || 'Failed to deposit tokens');
            console.error('Deposit error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWithdraw = async (amount: number) => {
        try {
            setIsProcessing(true);
            await treasuryApi.withdraw(amount);
            setIsWithdrawOpen(false);
            // Refresh stats after withdrawal
            await fetchStats();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to withdraw tokens');
            console.error('Withdraw error:', err);
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
    const contractBalance = Number(stats.contractBalance) / 1e18;
    const pendingRewards = Number(stats.pendingRewards) / 1e18;
    const healthStatus = stats.healthStatus;
    const tokensNeeded = Math.max(0, pendingRewards - contractBalance);

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
                                <strong>{tokensNeeded.toLocaleString()} NILA</strong> deficit. Immediate deposit required to ensure solvency.
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contract Balance */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24 text-blue-600" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Total Assets</p>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">
                        {contractBalance.toLocaleString()}
                        <span className="text-lg text-slate-500 font-normal ml-2">NILA</span>
                    </h2>
                    <p className="text-sm text-slate-400">held in smart contract</p>
                </div>

                {/* Pending Rewards */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Liabilities</p>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">
                        {pendingRewards.toLocaleString()}
                        <span className="text-lg text-slate-500 font-normal ml-2">NILA</span>
                    </h2>
                    <p className="text-sm text-slate-400">pending user rewards</p>
                </div>

                {/* Net Position */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-medium mb-1">Net Position</p>
                    <h2 className={`text-4xl font-bold mb-2 ${contractBalance >= pendingRewards ? 'text-green-600' : 'text-red-600'}`}>
                        {(contractBalance - pendingRewards).toLocaleString()}
                        <span className="text-lg text-slate-500 font-normal ml-2">NILA</span>
                    </h2>
                    <p className="text-sm text-slate-400">
                        {contractBalance >= pendingRewards ? 'Surplus available' : 'Deficit - Action needed'}
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
        </div>
    );
};

export default Tokens;
