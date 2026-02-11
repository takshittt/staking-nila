import { TrendingUp, Wallet, Gift, Coins } from 'lucide-react';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

// Mock data for staking over time
const stakingData = [
    { month: 'Jan', staked: 10000 },
    { month: 'Feb', staked: 15000 },
    { month: 'Mar', staked: 22000 },
    { month: 'Apr', staked: 28000 },
    { month: 'May', staked: 35000 },
    { month: 'Jun', staked: 42000 },
];

// Mock data for rewards vs tokens (real-time comparison)
const rewardsData = [
    { name: 'Rewards', value: 2100, fill: '#dc2626' },
    { name: 'Tokens', value: 50000, fill: '#f87171' },
];

interface OverviewCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
}

const OverviewCard = ({ title, value, icon, trend }: OverviewCardProps) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-slate-600 text-sm font-medium">{title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
                {trend && <p className="text-xs text-green-600 mt-2">{trend}</p>}
            </div>
            <div className="p-3 bg-red-50 rounded-lg">{icon}</div>
        </div>
    </div>
);

const Overview = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Overview</h1>
                <p className="text-slate-600 mt-1">Dashboard summary and analytics</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <OverviewCard
                    title="Total Staked NILA"
                    value="42,000"
                    icon={<Wallet className="w-6 h-6 text-red-600" />}
                    trend="↑ 12% from last month"
                />
                <OverviewCard
                    title="Active Stakes"
                    value="1,234"
                    icon={<TrendingUp className="w-6 h-6 text-red-600" />}
                    trend="↑ 8% from last month"
                />
                <OverviewCard
                    title="Rewards Distributed"
                    value="$2,100"
                    icon={<Gift className="w-6 h-6 text-red-600" />}
                    trend="↑ 15% from last month"
                />
                <OverviewCard
                    title="Token Balance"
                    value="50,000"
                    icon={<Coins className="w-6 h-6 text-red-600" />}
                    trend="↓ 2% from last month"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Staking Over Time Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        Staking Over Time
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stakingData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="staked"
                                stroke="#dc2626"
                                strokeWidth={2}
                                dot={{ fill: '#dc2626', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Total Staked"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Rewards vs Tokens Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        Rewards vs Tokens
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={rewardsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {rewardsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                }}
                                formatter={(value) => value.toLocaleString()}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Overview;
