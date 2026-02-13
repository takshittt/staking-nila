import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, ArrowUpRight, ArrowDownLeft, Gift, UserPlus, Clock, XCircle, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { transactionApi, type Transaction } from '../services/transactionApi';

const Transactions = () => {
    const { address } = useAccount();
    const [activeFilter, setActiveFilter] = useState('All');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const filters = ['All', 'Stake', 'Claim', 'Referral'];

    useEffect(() => {
        if (address) {
            fetchTransactions();
        }
    }, [address, page]);

    const fetchTransactions = async () => {
        if (!address) return;
        
        setLoading(true);
        try {
            console.log('Fetching transactions for wallet:', address);
            const data = await transactionApi.getWalletTransactions(address, page, 20);
            console.log('Received data:', data);
            setTransactions(data.transactions);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'STAKE':
                return { icon: ArrowUpRight, bg: 'bg-blue-50', color: 'text-blue-600' };
            case 'UNSTAKE':
                return { icon: ArrowDownLeft, bg: 'bg-orange-50', color: 'text-orange-600' };
            case 'CLAIM_REWARD':
                return { icon: Gift, bg: 'bg-purple-50', color: 'text-purple-600' };
            case 'REFERRAL_REWARD':
                return { icon: UserPlus, bg: 'bg-green-50', color: 'text-green-600' };
            default:
                return { icon: CheckCircle2, bg: 'bg-slate-50', color: 'text-slate-600' };
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return {
                    icon: CheckCircle2,
                    bg: 'bg-green-50',
                    text: 'text-green-700',
                    border: 'border-green-100',
                    label: 'Confirmed'
                };
            case 'pending':
                return {
                    icon: Clock,
                    bg: 'bg-yellow-50',
                    text: 'text-yellow-700',
                    border: 'border-yellow-100',
                    label: 'Pending'
                };
            case 'failed':
                return {
                    icon: XCircle,
                    bg: 'bg-red-50',
                    text: 'text-red-700',
                    border: 'border-red-100',
                    label: 'Failed'
                };
            default:
                return {
                    icon: Clock,
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    border: 'border-slate-100',
                    label: status
                };
        }
    };

    const getFilterCategory = (type: string): string => {
        if (type === 'STAKE' || type === 'UNSTAKE') return 'Stake';
        if (type === 'CLAIM_REWARD') return 'Claim';
        if (type === 'REFERRAL_REWARD') return 'Referral';
        return 'All';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatType = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formattedTransactions = transactions.map(tx => {
        const iconData = getTransactionIcon(tx.type);
        return {
            id: tx.id,
            txHash: tx.txHash,
            date: formatDate(tx.createdAt),
            type: formatType(tx.type),
            amount: tx.amount ? `${Number(tx.amount).toLocaleString()} NILA` : '-',
            status: tx.status,
            filterCategory: getFilterCategory(tx.type),
            icon: iconData.icon,
            iconBg: iconData.bg,
            iconColor: iconData.color
        };
    });

    const filteredTransactions = activeFilter === 'All'
        ? formattedTransactions
        : formattedTransactions.filter(tx => tx.filterCategory === activeFilter);

    if (!address) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
                    <p className="text-slate-500 mt-1">View all staking, reward, and referral transactions.</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                    <p className="text-slate-500">Please connect your wallet to view transactions.</p>
                </div>
            </div>
        );
    }

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

                {/* Loading State */}
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">Loading transactions...</p>
                    </div>
                ) : (
                    <>
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
                                    {filteredTransactions.map((tx) => {
                                        const statusBadge = getStatusBadge(tx.status);
                                        return (
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
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text} text-xs font-semibold w-fit border ${statusBadge.border}`}>
                                                        <statusBadge.icon className="w-3.5 h-3.5" />
                                                        {statusBadge.label}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <a
                                                        href={`https://testnet.bscscan.com/tx/${tx.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                        title="View on BSCScan"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {filteredTransactions.length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                <p>No transactions found for this category.</p>
                                {transactions.length === 0 && (
                                    <p className="mt-2 text-sm">
                                        Connected wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-slate-600">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Transactions;
