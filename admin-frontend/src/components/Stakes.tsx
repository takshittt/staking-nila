import { CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { stakeApi } from '../api/stakeApi';
import { useAuthStore } from '../stores/authStore';

interface Stake {
    id: string;
    stakeId: string;
    wallet: string;
    planVersion: string;
    amount: number;
    apy: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed';
}

const getStatusBadge = (status: string) => {
    if (status === 'active') {
        return 'bg-blue-100 text-blue-800';
    }
    return 'bg-slate-100 text-slate-800';
};

const getStatusIcon = (status: string) => {
    if (status === 'active') {
        return <Clock className="w-3 h-3" />;
    }
    return <CheckCircle className="w-3 h-3" />;
};

const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const Stakes = () => {
    const [stakes, setStakes] = useState<Stake[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuthStore();

    useEffect(() => {
        fetchStakes();
    }, []);

    const fetchStakes = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await stakeApi.getAllStakes(token!);
            setStakes(response.stakes);
        } catch (err: any) {
            console.error('Failed to fetch stakes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Stakes</h1>
                <p className="text-slate-600 mt-1">View all active and completed stakes</p>
            </div>

            {loading && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
                    <p className="text-slate-600">Loading stakes...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800">Error: {error}</p>
                    <button
                        onClick={fetchStakes}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        Stake ID
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        Wallet
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        Plan Version
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        Amount
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        APY
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        Start Date
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        End Date
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stakes.map((stake) => (
                                    <tr
                                        key={stake.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {stake.stakeId}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            <span title={stake.wallet}>
                                                {truncateAddress(stake.wallet)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {stake.planVersion}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                            {stake.amount.toLocaleString()} NILA
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                            {stake.apy}%
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {formatDate(stake.startDate)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {formatDate(stake.endDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                                                    stake.status
                                                )}`}
                                            >
                                                {getStatusIcon(stake.status)}
                                                {getStatusLabel(stake.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {stakes.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <p className="text-slate-600">No stakes found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Stakes;
