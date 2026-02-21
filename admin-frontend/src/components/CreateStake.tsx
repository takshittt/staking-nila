import { useState } from 'react';
import { PlusCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { stakeApi } from '../api/stakeApi';

const CreateStake = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        walletAddress: '',
        amount: '',
        lockDays: '',
        apy: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear status when user types
        if (error) setError(null);
        if (success) setSuccess(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Validate inputs
            if (!formData.walletAddress || !formData.amount || !formData.lockDays || !formData.apy) {
                throw new Error('All fields are required');
            }

            // Get auth token
            const token = localStorage.getItem('admin_token');
            if (!token) {
                throw new Error('Not authenticated');
            }

            // Call API to create manual stake on-chain
            const result = await stakeApi.createManualStake({
                walletAddress: formData.walletAddress,
                amount: Number(formData.amount),
                lockDays: Number(formData.lockDays),
                apy: Number(formData.apy),
                instantRewardPercent: 0 // No instant reward for manual stakes
            }, token);

            setSuccess(`Stake created successfully! TX: ${result.txHash?.substring(0, 10)}...`);
            
            // Reset form
            setFormData({
                walletAddress: '',
                amount: '',
                lockDays: '',
                apy: ''
            });
        } catch (err: any) {
            console.error('Failed to create stake:', err);
            setError(err.message || 'Failed to create stake');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Create Stake</h1>
                <p className="text-slate-600 mt-1">Manually create a new stake for a user</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Status Messages */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            <p>{success}</p>
                        </div>
                    )}

                    {/* Wallet Address */}
                    <div className="space-y-2">
                        <label htmlFor="walletAddress" className="block text-sm font-medium text-slate-700">
                            Wallet Address
                        </label>
                        <input
                            type="text"
                            id="walletAddress"
                            name="walletAddress"
                            value={formData.walletAddress}
                            onChange={handleChange}
                            placeholder="0x..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Amount */}
                        <div className="space-y-2">
                            <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
                                Amount (NILA)
                            </label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                min="0"
                                step="any"
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                            />
                        </div>

                        {/* APY */}
                        <div className="space-y-2">
                            <label htmlFor="apy" className="block text-sm font-medium text-slate-700">
                                APY (%)
                            </label>
                            <input
                                type="number"
                                id="apy"
                                name="apy"
                                value={formData.apy}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Lock Period */}
                    <div className="space-y-2">
                        <label htmlFor="lockDays" className="block text-sm font-medium text-slate-700">
                            Lock Period (Days)
                        </label>
                        <input
                            type="number"
                            id="lockDays"
                            name="lockDays"
                            value={formData.lockDays}
                            onChange={handleChange}
                            min="0"
                            step="1"
                            placeholder="30"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Stake...
                                </>
                            ) : (
                                <>
                                    <PlusCircle className="w-5 h-5" />
                                    Create Stake
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateStake;
