import { X, AlertCircle, CheckCircle } from 'lucide-react';
import type { User } from './Users';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const UserProfileModal = ({ isOpen, onClose, user }: UserProfileModalProps) => {
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
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserProfileModal;
