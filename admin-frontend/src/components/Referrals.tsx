import { Users2, AlertCircle, Save } from 'lucide-react';
import { useState } from 'react';

interface ReferralStats {
    referralPercentage: number;
    referrerPercentage: number;
    totalReferrals: number;
    totalEarnings: number;
    isPaused: boolean;
}

const Referrals = () => {
    const [stats, setStats] = useState<ReferralStats>({
        referralPercentage: 5,
        referrerPercentage: 2,
        totalReferrals: 342,
        totalEarnings: 15750,
        isPaused: false,
    });

    const [editMode, setEditMode] = useState(false);
    const [tempStats, setTempStats] = useState<ReferralStats>(stats);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleTogglePause = async () => {
        setIsUpdating(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setStats((prev) => ({
            ...prev,
            isPaused: !prev.isPaused,
        }));
        setIsUpdating(false);
    };

    const handleEditClick = () => {
        setTempStats(stats);
        setEditMode(true);
    };

    const handleCancel = () => {
        setEditMode(false);
        setTempStats(stats);
    };

    const handleSave = async () => {
        setIsUpdating(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setStats(tempStats);
        setEditMode(false);
        setIsUpdating(false);
    };

    const handleInputChange = (field: keyof ReferralStats, value: number) => {
        setTempStats((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Referrals</h1>
                <p className="text-slate-600 mt-1">Manage referral program settings</p>
            </div>

            {/* Main Stats Card */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Referral Percentage */}
                        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                            <p className="text-sm text-slate-600 font-medium mb-2">Referral Commission</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-bold text-red-600">{stats.referralPercentage}</span>
                                <span className="text-2xl text-red-600">%</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">Per successful referral</p>
                        </div>

                        {/* Total Referrals */}
                        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                            <Users2 className="w-8 h-8 text-blue-600 mb-2" />
                            <p className="text-sm text-slate-600 font-medium mb-2">Total Referrals</p>
                            <p className="text-4xl font-bold text-blue-600">
                                {stats.totalReferrals.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-3">Active referrals</p>
                        </div>

                        {/* Total Earnings */}
                        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                            <p className="text-sm text-slate-600 font-medium mb-2">Total Earnings</p>
                            <p className="text-4xl font-bold text-green-600">
                                ${stats.totalEarnings.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-3">From referrals</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Configuration Section */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Configuration</h3>
                    {!editMode && (
                        <button
                            onClick={handleEditClick}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                        >
                            Edit Settings
                        </button>
                    )}
                </div>

                {editMode ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Referral Percentage Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Referral Commission (%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={tempStats.referralPercentage}
                                        onChange={(e) =>
                                            handleInputChange('referralPercentage', parseFloat(e.target.value) || 0)
                                        }
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    <span className="text-slate-600 font-medium">%</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Commission earned by referrer</p>
                            </div>

                            {/* Referrer Percentage Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Referrer Bonus (%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={tempStats.referrerPercentage}
                                        onChange={(e) =>
                                            handleInputChange('referrerPercentage', parseFloat(e.target.value) || 0)
                                        }
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    <span className="text-slate-600 font-medium">%</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Bonus for referred user</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={handleCancel}
                                disabled={isUpdating}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isUpdating}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600 font-medium mb-2">Referral Commission</p>
                            <p className="text-3xl font-bold text-red-600">{stats.referralPercentage}%</p>
                            <p className="text-xs text-slate-500 mt-2">Commission earned by referrer</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600 font-medium mb-2">Referrer Bonus</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.referrerPercentage}%</p>
                            <p className="text-xs text-slate-500 mt-2">Bonus for referred user</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pause Referrals Section */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Pause Referral Program</h3>
                            <p className="text-sm text-slate-600 mt-1">
                                {stats.isPaused
                                    ? 'The referral program is currently paused. New referrals will not be processed.'
                                    : 'The referral program is currently active. Users can earn commissions from referrals.'}
                            </p>
                        </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                        onClick={handleTogglePause}
                        disabled={isUpdating}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            stats.isPaused
                                ? 'bg-slate-300 hover:bg-slate-400'
                                : 'bg-red-600 hover:bg-red-700'
                        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                stats.isPaused ? 'translate-x-1' : 'translate-x-7'
                            }`}
                        />
                    </button>
                </div>

                {/* Status Badge */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Status:</span>
                        <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                stats.isPaused
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'bg-green-100 text-green-800'
                            }`}
                        >
                            <span
                                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    stats.isPaused ? 'bg-slate-600' : 'bg-green-600'
                                }`}
                            />
                            {stats.isPaused ? 'Paused' : 'Active'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 mb-2">About Referrals</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Referrers earn {stats.referralPercentage}% commission on each successful referral</li>
                    <li>• Referred users receive {stats.referrerPercentage}% bonus on their first stake</li>
                    <li>• Referral earnings are credited to the referrer's account</li>
                    <li>• Pausing the program prevents new referrals from being processed</li>
                    <li>• Existing referral earnings are not affected by pausing</li>
                </ul>
            </div>
        </div>
    );
};

export default Referrals;
