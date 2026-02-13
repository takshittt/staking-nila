import { useEffect, useState } from 'react';
import {
    Wallet,
    Users,
    Clock,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    ShieldCheck,
    AlertOctagon,
    Coins
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
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
            return tokens.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
    const pendingRewards = formatTokenAmount(stats.treasury.pendingRewards);
    const rewardsPaid = parseFloat(stats.risks.estimatedRewardsPaid).toLocaleString(undefined, { maximumFractionDigits: 0 });

    // Safety & Coverage
    const coverageRatio = stats.treasury.coverageRatio * 100;
    const isHealthy = stats.treasury.healthStatus === 'healthy';
    const isCritical = stats.treasury.healthStatus === 'critical';

    // Chart Data
    const assetsVal = parseFloat(stats.treasury.contractBalance) / 1e18;
    const liabilitiesVal = parseFloat(stats.treasury.pendingRewards) / 1e18;
    const netVal = assetsVal - liabilitiesVal;

    const chartData = [
        { name: 'Assets', value: assetsVal, fill: '#3b82f6', label: 'Treasury Balance' },
        { name: 'Liabilities', value: liabilitiesVal, fill: '#f97316', label: 'Pending Rewards' },
        { name: 'Net', value: netVal, fill: netVal >= 0 ? '#22c55e' : '#ef4444', label: 'Net Position' },
    ];

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Pending Rewards */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-16 h-16 text-slate-900" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-slate-500 font-medium text-sm">Pending Rewards</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{pendingRewards}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">LIABILITY (NILA)</div>
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

            {/* Row 2: Treasury & Risks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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

                {/* Risk Alerts */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                        <h2 className="text-lg font-bold text-slate-900">Risk Radar</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-slate-400" />
                                <span className="text-slate-700 font-medium">Expiring Soon (7 Days)</span>
                            </div>
                            <span className={`font-bold ${stats.risks.expiringStakesCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                {stats.risks.expiringStakesCount} Stakes
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-slate-400" />
                                <span className="text-slate-700 font-medium">Large Unlocks (&gt;50k)</span>
                            </div>
                            <span className={`font-bold ${stats.risks.largeUnlockCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                {stats.risks.largeUnlockCount} Events
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Treasury Allocation</h2>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(value: number) => [`${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} NILA`, '']}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={100}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Overview;
