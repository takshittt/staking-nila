import { useState } from 'react';
import { ExternalLink, CheckCircle2, ArrowUpRight, ArrowDownLeft, Gift, UserPlus } from 'lucide-react';

const Transactions = () => {
    const [activeFilter, setActiveFilter] = useState('All');

    const filters = ['All', 'Stake', 'Claim', 'Referral'];



    // Aligning mock data with strict filter categories for the demo
    const formattedTransactions = [
        {
            id: 1,
            date: 'Jan 10',
            type: 'Stake',
            amount: '10,000 NILA',
            status: 'Confirmed',
            filterCategory: 'Stake',
            icon: ArrowUpRight,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600'
        },
        {
            id: 2,
            date: 'Jan 10',
            type: 'Cashback',
            amount: '600 NILA',
            status: 'Credited',
            filterCategory: 'Claim', // Grouping cashback under Claim/Reward logic
            icon: ArrowDownLeft,
            iconBg: 'bg-green-50',
            iconColor: 'text-green-600'
        },
        {
            id: 3,
            date: 'Feb 10',
            type: 'Reward Claim',
            amount: '450 NILA',
            status: 'Completed',
            filterCategory: 'Claim',
            icon: Gift,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600'
        },
        {
            id: 4,
            date: 'Feb 15',
            type: 'Referral Reward',
            amount: '120 NILA',
            status: 'Completed',
            filterCategory: 'Referral',
            icon: UserPlus,
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-600'
        }
    ];

    const filteredTransactions = activeFilter === 'All'
        ? formattedTransactions
        : formattedTransactions.filter(tx => tx.filterCategory === activeFilter);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
                <p className="text-slate-500 mt-1">View all staking, reward, and referral transactions.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeFilter === filter
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Explorer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                        {tx.date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${tx.iconBg} ${tx.iconColor}`}>
                                                <tx.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-900">{tx.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                                        {tx.amount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold w-fit border border-green-100">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {tx.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <a
                                            href="#"
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="View on Explorer"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <p>No transactions found for this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Transactions;
