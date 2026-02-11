import { CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

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

const mockStakes: Stake[] = [
    {
        id: '1',
        stakeId: 'STK-001',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42e1',
        planVersion: 'Starter Plan v1',
        amount: 5000,
        apy: 5,
        startDate: '2024-01-15',
        endDate: '2024-02-14',
        status: 'active',
    },
    {
        id: '2',
        stakeId: 'STK-002',
        wallet: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        planVersion: 'Premium Plan v2',
        amount: 25000,
        apy: 8,
        startDate: '2023-12-20',
        endDate: '2024-03-19',
        status: 'active',
    },
    {
        id: '3',
        stakeId: 'STK-003',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42e1',
        planVersion: 'Starter Plan v1',
        amount: 10000,
        apy: 5,
        startDate: '2023-11-01',
        endDate: '2023-12-01',
        status: 'completed',
    },
    {
        id: '4',
        stakeId: 'STK-004',
        wallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        planVersion: 'Elite Plan v1',
        amount: 50000,
        apy: 12,
        startDate: '2024-01-05',
        endDate: '2024-07-04',
        status: 'active',
    },
    {
        id: '5',
        stakeId: 'STK-005',
        wallet: '0x1234567890123456789012345678901234567890',
        planVersion: 'Premium Plan v2',
        amount: 15000,
        apy: 8,
        startDate: '2023-10-15',
        endDate: '2024-01-13',
        status: 'completed',
    },
];

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
    const [stakes] = useState<Stake[]>(mockStakes);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Stakes</h1>
                <p className="text-slate-600 mt-1">View all active and completed stakes</p>
            </div>

            {/* Table */}
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
        </div>
    );
};

export default Stakes;
