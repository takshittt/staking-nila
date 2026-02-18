import { useEffect, useState } from 'react';
import {
    Wallet,
    Users,
    Clock,
    CheckCircle,
    AlertTriangle,
    ShieldCheck,
    AlertOctagon,
    Coins
} from 'lucide-react';
import { overviewApi, type OverviewStats } from '../api/overviewApi';

const Overview = () => {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await overviewApi.getStats();
            setStats(data);
        } catch (err: any) {
            console.error('Failed to load stats:', err);
            setError(err.response?.data?.error || 'Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const formatTokenAmount = (wei: string): string => {
        try {
            const value = BigInt(wei);
            const tokens = Number(value) / 1e18;

            if (tokens === 0) return '0';
            if (tokens < 0.01) return '< 0.01';

            return tokens.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch {
            return '0';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                    <p className="text-red-800 font-medium">Failed to load overview</p>
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
                <button
                    onClick={loadStats}
                    className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!stats) return null;

    const totalStaked = formatTokenAmount(stats.staking.totalStaked);
    const rewardsPaid = parseFloat(stats.risks.estimatedRewardsPaid).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Safety & Coverage
    const coverageRatio = stats.treasury.coverageRatio * 100;
    const isHealthy = stats.treasury.healthStatus === 'healthy';
    const isCritical = stats.treasury.healthStatus === 'critical';

    // Financial calculations
    const contractBalanceVal = Number(stats.treasury.contractBalance) / 1e18;
    const stakedTokensVal = Number(stats.treasury.totalStaked) / 1e18;
    const assetsVal = contractBalanceVal - stakedTokensVal;
    const liabilitiesVal = Number(stats.treasury.pendingRewards) / 1e18;
    const netVal = assetsVal - liabilitiesVal;



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Health Snapshot</h1>
                    <p className="text-slate-500 mt-1">Real-time status of protocol growth and liabilities</p>
                </div>
                <button
                    onClick={loadStats}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Refresh Data"
                >
                    <Clock className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* Row 1: Key Metrics (Big Numbers) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TVL */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet className="w-16 h-16 text-slate-900" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-slate-500 font-medium text-sm">TVL</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{totalStaked}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">NILA LOCKED</div>
                </div>

                {/* Active Stakers */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users className="w-16 h-16 text-slate-900" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-slate-500 font-medium text-sm">Active Stakers</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stats.staking.uniqueStakers}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">USERS</div>
                </div>

                {/* Rewards Paid */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Coins className="w-16 h-16 text-slate-900" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <Coins className="w-5 h-5" />
                        </div>
                        <span className="text-slate-500 font-medium text-sm">Rewards Paid</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{rewardsPaid}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">ESTIMATED (NILA)</div>
                </div>
            </div>

            {/* Row 2: Treasury Financials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Assets */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet className="w-16 h-16 text-blue-600" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">Total Assets</p>
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                        {assetsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-sm text-slate-400 ml-2 font-normal">NILA</span>
                    </div>
                    <p className="text-xs text-slate-400">Total Liquid Funds</p>
                </div>

                {/* Liabilities */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-orange-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-16 h-16 text-orange-600" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">Total Liabilities</p>
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                        {liabilitiesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-sm text-slate-400 ml-2 font-normal">NILA</span>
                    </div>
                    <p className="text-xs text-slate-400">Pending Obligations</p>
                </div>

                {/* Net Position */}
                <div className={`bg-white p-6 rounded-xl border shadow-sm relative overflow-hidden group transition-all ${netVal >= 0 ? 'hover:border-green-100 border-slate-100' : 'hover:border-red-100 border-red-50'
                    }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle className={`w-16 h-16 ${netVal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">Net Position</p>
                    <div className={`text-3xl font-bold mb-1 ${netVal >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {netVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-sm text-slate-400 ml-2 font-normal">NILA</span>
                    </div>
                    <p className="text-xs text-slate-400">{netVal >= 0 ? 'Surplus Balance' : 'Treasury Deficit'}</p>
                </div>
            </div>

            {/* Row 2: Treasury Safety */}
            <div>
                {/* Treasury Safety Status */}
                <div className={`p-6 rounded-xl border shadow-sm ${isHealthy ? 'bg-green-50/50 border-green-100' :
                    isCritical ? 'bg-red-50/50 border-red-100' : 'bg-yellow-50/50 border-yellow-100'
                    }`}>
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldCheck className={`w-6 h-6 ${isHealthy ? 'text-green-600' :
                            isCritical ? 'text-red-600' : 'text-yellow-600'
                            }`} />
                        <h2 className="text-lg font-bold text-slate-900">Treasury Safety</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Coverage Ratio</p>
                            <div className={`text-4xl font-bold ${isHealthy ? 'text-green-700' :
                                isCritical ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                {coverageRatio.toFixed(0)}%
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {coverageRatio > 100 ? 'Surplus > Liability' : 'Deficit Warning'}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Status</p>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${isHealthy ? 'bg-green-100 text-green-700' :
                                isCritical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {isHealthy ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                {stats.treasury.healthStatus.toUpperCase()}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                {isHealthy ? 'Fully funded' : 'Action required'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Overview;
