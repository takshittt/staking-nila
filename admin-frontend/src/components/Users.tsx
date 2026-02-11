import { Eye, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import UserProfileModal from './UserProfileModal';

export interface User {
    id: string;
    walletAddress: string;
    totalStaked: number;
    activeStakes: number;
    rewardsClaimed: number;
    referralEarnings: number;
    status: 'active' | 'flagged';
    joinDate: string;
}

const mockUsers: User[] = [
    {
        id: '1',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f42e1',
        totalStaked: 50000,
        activeStakes: 3,
        rewardsClaimed: 2500,
        referralEarnings: 1200,
        status: 'active',
        joinDate: '2024-01-15',
    },
    {
        id: '2',
        walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        totalStaked: 125000,
        activeStakes: 5,
        rewardsClaimed: 8750,
        referralEarnings: 3500,
        status: 'active',
        joinDate: '2023-12-20',
    },
    {
        id: '3',
        walletAddress: '0x1234567890123456789012345678901234567890',
        totalStaked: 25000,
        activeStakes: 1,
        rewardsClaimed: 500,
        referralEarnings: 0,
        status: 'flagged',
        joinDate: '2024-02-01',
    },
    {
        id: '4',
        walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        totalStaked: 75000,
        activeStakes: 4,
        rewardsClaimed: 4500,
        referralEarnings: 2100,
        status: 'active',
        joinDate: '2024-01-05',
    },
];

const getStatusBadge = (status: string) => {
    if (status === 'active') {
        return 'bg-green-100 text-green-800';
    }
    return 'bg-red-100 text-red-800';
};

const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const Users = () => {
    const [users] = useState<User[]>(mockUsers);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleViewProfile = (user: User) => {
        setSelectedUser(user);
        setIsProfileOpen(true);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Users</h1>
                <p className="text-slate-600 mt-1">Manage and monitor all staking users</p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Wallet Address
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Total Staked
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Active Stakes
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Rewards Claimed
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Referral Earnings
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        <span title={user.walletAddress}>
                                            {truncateAddress(user.walletAddress)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.totalStaked.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.activeStakes}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.rewardsClaimed.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.referralEarnings.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                                                user.status
                                            )}`}
                                        >
                                            {user.status === 'flagged' && (
                                                <AlertCircle className="w-3 h-3" />
                                            )}
                                            {getStatusLabel(user.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleViewProfile(user)}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="View profile"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span className="text-sm font-medium">View</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {users.length === 0 && (
                    <div className="px-6 py-12 text-center">
                        <p className="text-slate-600">No users found</p>
                    </div>
                )}
            </div>

            {/* User Profile Modal */}
            {selectedUser && (
                <UserProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    user={selectedUser}
                />
            )}
        </div>
    );
};

export default Users;
