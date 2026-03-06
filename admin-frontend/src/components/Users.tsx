import { Eye, AlertCircle, Flag, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import UserProfileModal from './UserProfileModal';
import { userApi } from '../api/userApi';


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
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [flagModalOpen, setFlagModalOpen] = useState(false);
    const [flagReason, setFlagReason] = useState('');
    const [userToFlag, setUserToFlag] = useState<User | null>(null);
    const [actionLoading, setActionLoading] = useState(false);


    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await userApi.getAllUsers();
            setUsers(response.users);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = (user: User) => {
        setSelectedUser(user);
        setIsProfileOpen(true);
    };

    const handleFlagClick = (user: User) => {
        setUserToFlag(user);
        setFlagReason('');
        setFlagModalOpen(true);
    };

    const handleFlagUser = async () => {
        if (!userToFlag) return;

        try {
            setActionLoading(true);
            await userApi.flagUser(userToFlag.walletAddress, flagReason || undefined);
            setFlagModalOpen(false);
            setFlagReason('');
            setUserToFlag(null);
            await fetchUsers();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnflagUser = async (user: User) => {
        if (!confirm(`Are you sure you want to unflag ${truncateAddress(user.walletAddress)}?`)) {
            return;
        }

        try {
            setActionLoading(true);
            await userApi.unflagUser(user.walletAddress);
            await fetchUsers();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Users</h1>
                <p className="text-slate-600 mt-1">Manage and monitor all staking users</p>
            </div>

            {loading && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
                    <p className="text-slate-600">Loading users...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800">Error: {error}</p>
                    <button
                        onClick={fetchUsers}
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
                                            {user.status === 'active' ? (
                                                <button
                                                    onClick={() => handleFlagClick(user)}
                                                    disabled={actionLoading}
                                                    className="inline-flex items-center gap-2 px-3 py-2 ml-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Flag user"
                                                >
                                                    <Flag className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Flag</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnflagUser(user)}
                                                    disabled={actionLoading}
                                                    className="inline-flex items-center gap-2 px-3 py-2 ml-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Unflag user"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Unflag</span>
                                                </button>
                                            )}
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
            )}

            {/* User Profile Modal */}
            {selectedUser && (
                <UserProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    user={selectedUser}
                    onUserUpdated={fetchUsers}
                />
            )}

            {/* Flag User Modal */}
            {flagModalOpen && userToFlag && (
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                        onClick={() => setFlagModalOpen(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900">Flag User</h2>
                                <button
                                    onClick={() => setFlagModalOpen(false)}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <AlertCircle className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <p className="text-sm text-slate-600 mb-2">Wallet Address</p>
                                    <p className="font-mono text-sm text-slate-900 break-all">
                                        {userToFlag.walletAddress}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Reason (Optional)
                                    </label>
                                    <textarea
                                        value={flagReason}
                                        onChange={(e) => setFlagReason(e.target.value)}
                                        placeholder="Enter reason for flagging this user..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        rows={3}
                                    />
                                </div>

                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-800">
                                        <strong>Warning:</strong> Flagging this user will prevent them from connecting their wallet to the staking platform.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setFlagModalOpen(false)}
                                        disabled={actionLoading}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleFlagUser}
                                        disabled={actionLoading}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Flagging...' : 'Flag User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Users;
