import { X, AlertCircle, CheckCircle, Flag } from 'lucide-react';
import type { User } from './Users';
import { userApi } from '../api/userApi';
import { useState } from 'react';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUserUpdated?: () => void;
}

const UserProfileModal = ({ isOpen, onClose, user, onUserUpdated }: UserProfileModalProps) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [showFlagInput, setShowFlagInput] = useState(false);
    const [flagReason, setFlagReason] = useState('');

    if (!isOpen) return null;

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'text-green-600' : 'text-red-600';
    };

    const getStatusIcon = (status: string) => {
        return status === 'active' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
        );
    };

    const handleFlagUser = async () => {
        try {
            setActionLoading(true);
            await userApi.flagUser(user.walletAddress, flagReason || undefined);
            setShowFlagInput(false);
            setFlagReason('');
            if (onUserUpdated) onUserUpdated();
            onClose();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnflagUser = async () => {
        if (!confirm('Are you sure you want to unflag this user?')) {
            return;
        }

        try {
            setActionLoading(true);
            await userApi.unflagUser(user.walletAddress);
            if (onUserUpdated) onUserUpdated();
            onClose();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">User Profile</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Account Status</p>
                                <p className={`text-lg font-semibold mt-1 ${getStatusColor(user.status)}`}>
                                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                </p>
                            </div>
                            {getStatusIcon(user.status)}
                        </div>

                        <div>
                            <p className="text-sm text-slate-600 font-medium mb-2">Wallet Address</p>
                            <div className="p-3 bg-slate-50 rounded-lg break-all font-mono text-sm text-slate-900">
                                {user.walletAddress}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-slate-600 font-medium mb-2">Join Date</p>
                            <p className="text-slate-900">
                                {new Date(user.joinDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                                    Total Staked
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-2">
                                    {user.totalStaked.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">NILA</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                                    Active Stakes
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-2">
                                    {user.activeStakes}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Stakes</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                                    Rewards Claimed
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-2">
                                    {user.rewardsClaimed.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">NILA</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                                    Referral Earnings
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-2">
                                    {user.referralEarnings.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">NILA</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            {user.status === 'active' ? (
                                showFlagInput ? (
                                    <>
                                        <div className="flex-1 space-y-3">
                                            <textarea
                                                value={flagReason}
                                                onChange={(e) => setFlagReason(e.target.value)}
                                                placeholder="Enter reason for flagging (optional)..."
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                rows={2}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setShowFlagInput(false);
                                                        setFlagReason('');
                                                    }}
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
                                                    {actionLoading ? 'Flagging...' : 'Confirm Flag'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowFlagInput(true)}
                                            disabled={actionLoading}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                                        >
                                            <Flag className="w-4 h-4" />
                                            Flag User
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                        >
                                            Close
                                        </button>
                                    </>
                                )
                            ) : (
                                <>
                                    <button
                                        onClick={handleUnflagUser}
                                        disabled={actionLoading}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {actionLoading ? 'Unflagging...' : 'Unflag User'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserProfileModal;
