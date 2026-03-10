import { X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface AmountConfigFormData {
    amount: number;
    instantRewardPercent: number;
}

export interface LockConfigFormData {
    lockDays: number;
    aprPercent: number;
}

export interface RewardTierFormData {
    minNilaAmount: number;
    maxNilaAmount: number;
    instantRewardPercent: number;
}

interface CreateAmountConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (configData: AmountConfigFormData) => void;
    initialData?: AmountConfigFormData;
    isEditing?: boolean;
    isLoading?: boolean;
}

interface CreateLockConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (configData: LockConfigFormData) => void;
    initialData?: LockConfigFormData;
    isEditing?: boolean;
    isLoading?: boolean;
}

export const CreateAmountConfigModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isEditing = false,
    isLoading = false
}: CreateAmountConfigModalProps) => {
    const [formData, setFormData] = useState<any>({
        amount: '',
        instantRewardPercent: ''
    });

    // Initialize form data when modal opens or initialData changes
    useState(() => {
        if (initialData) {
            setFormData(initialData);
        }
    });

    // Update form state if initialData changes while component is mounted
    if (isOpen && initialData && formData.amount !== initialData.amount && !isEditing) {
        // This logic is tricky with hooks. Better handled with useEffect.
    }

    // Using useEffect to handle initialData updates
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !isEditing) {
            setFormData({
                amount: '',
                instantRewardPercent: ''
            });
        }
    }, [isOpen, initialData, isEditing]);

    const [errors, setErrors] = useState<Partial<Record<keyof AmountConfigFormData, string>>>({});

    const validateForm = () => {
        const newErrors: Partial<Record<keyof AmountConfigFormData, string>> = {};

        if (formData.amount === '' || formData.amount <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }
        if (formData.instantRewardPercent === '' || formData.instantRewardPercent < 0 || formData.instantRewardPercent > 100) {
            newErrors.instantRewardPercent = 'Instant reward must be between 0 and 100%';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit({
                ...formData
            } as AmountConfigFormData);
            setErrors({});
            if (!isEditing) {
                setFormData({
                    amount: '',
                    instantRewardPercent: ''
                });
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: value === '' ? '' : parseFloat(value),
        }));
        if (errors[name as keyof AmountConfigFormData]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                onClick={handleClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">
                            {isEditing ? 'Edit Amount Config' : 'Create Amount Config'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-xs text-amber-900 font-medium mb-1">
                                📌 Reference Only
                            </p>
                            <p className="text-xs text-amber-800">
                                Amount configs are for UI display only. Instant rewards are now controlled by Reward Tiers (see Reward Tiers tab).
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Stake Amount (USD/USDT)
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                min="1"
                                placeholder="Enter amount"
                                disabled={isEditing}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.amount ? 'border-red-500' : 'border-slate-200'
                                    } ${isEditing ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            />
                            {errors.amount && (
                                <p className="text-xs text-red-600 mt-1">{errors.amount}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Predefined amount shown in UI. Backend calculates NILA at $0.08 per token.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Approximate Instant Reward (%)
                            </label>
                            <input
                                type="number"
                                name="instantRewardPercent"
                                value={formData.instantRewardPercent}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="Enter instant reward %"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.instantRewardPercent ? 'border-red-500' : 'border-slate-200'
                                    }`}
                            />
                            {errors.instantRewardPercent && (
                                <p className="text-xs text-red-600 mt-1">{errors.instantRewardPercent}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Reference value for UI display only. Actual rewards are calculated by Reward Tiers based on NILA amount.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 flex items-center justify-center bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isEditing ? 'Updating...' : 'Creating...'}
                                    </span>
                                ) : (
                                    isEditing ? 'Update Config' : 'Create Config'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export const CreateLockConfigModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isEditing = false,
    isLoading = false
}: CreateLockConfigModalProps) => {
    const [formData, setFormData] = useState<any>({
        lockDays: '',
        aprPercent: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof LockConfigFormData, string>>>({});

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !isEditing) {
            setFormData({
                lockDays: '',
                aprPercent: '',
            });
        }
    }, [isOpen, initialData, isEditing]);

    const validateForm = () => {
        const newErrors: Partial<Record<keyof LockConfigFormData, string>> = {};

        if (formData.lockDays === '' || formData.lockDays <= 0) {
            newErrors.lockDays = 'Lock duration must be greater than 0';
        }
        if (formData.aprPercent === '' || formData.aprPercent < 0 || formData.aprPercent > 500) {
            newErrors.aprPercent = 'APR must be between 0 and 500%';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData as LockConfigFormData);
            setErrors({});
            if (!isEditing) {
                setFormData({
                    lockDays: '',
                    aprPercent: '',
                });
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: value === '' ? '' : parseFloat(value),
        }));
        if (errors[name as keyof LockConfigFormData]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                onClick={handleClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">
                            {isEditing ? 'Edit Lock Config' : 'Create Lock Config'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Lock Duration (days)
                            </label>
                            <input
                                type="number"
                                name="lockDays"
                                value={formData.lockDays}
                                onChange={handleChange}
                                min="1"
                                placeholder="Enter lock duration in days"
                                disabled={isEditing}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.lockDays ? 'border-red-500' : 'border-slate-200'
                                    } ${isEditing ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            />
                            {errors.lockDays && (
                                <p className="text-xs text-red-600 mt-1">{errors.lockDays}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                APR (%)
                            </label>
                            <input
                                type="number"
                                name="aprPercent"
                                value={formData.aprPercent}
                                onChange={handleChange}
                                min="0"
                                max="500"
                                step="0.1"
                                placeholder="Enter APR"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.aprPercent ? 'border-red-500' : 'border-slate-200'
                                    }`}
                            />
                            {errors.aprPercent && (
                                <p className="text-xs text-red-600 mt-1">{errors.aprPercent}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Annual percentage rate for staking rewards
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 flex items-center justify-center bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isEditing ? 'Updating...' : 'Creating...'}
                                    </span>
                                ) : (
                                    isEditing ? 'Update Config' : 'Create Config'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

interface CreateRewardTierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tierData: RewardTierFormData) => void;
    initialData?: RewardTierFormData;
    isEditing?: boolean;
    isLoading?: boolean;
}

export const CreateRewardTierModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isEditing = false,
    isLoading = false
}: CreateRewardTierModalProps) => {
    const [formData, setFormData] = useState<any>({
        minNilaAmount: '',
        maxNilaAmount: '',
        instantRewardPercent: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof RewardTierFormData, string>>>({});

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !isEditing) {
            setFormData({
                minNilaAmount: '',
                maxNilaAmount: '',
                instantRewardPercent: '',
            });
        }
    }, [isOpen, initialData, isEditing]);

    const validateForm = () => {
        const newErrors: Partial<Record<keyof RewardTierFormData, string>> = {};

        if (formData.minNilaAmount === '' || formData.minNilaAmount < 0) {
            newErrors.minNilaAmount = 'Minimum amount cannot be negative or empty';
        }
        if (formData.maxNilaAmount === '' || formData.maxNilaAmount < 0) {
            newErrors.maxNilaAmount = 'Maximum amount cannot be negative or empty';
        }
        if (formData.maxNilaAmount !== '' && formData.minNilaAmount !== '' && formData.maxNilaAmount > 0 && formData.maxNilaAmount <= formData.minNilaAmount) {
            newErrors.maxNilaAmount = 'Maximum must be greater than minimum (or 0 for unlimited)';
        }
        if (formData.instantRewardPercent === '' || formData.instantRewardPercent < 0 || formData.instantRewardPercent > 100) {
            newErrors.instantRewardPercent = 'Instant reward must be between 0 and 100%';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData as RewardTierFormData);
            setErrors({});
            if (!isEditing) {
                setFormData({
                    minNilaAmount: '',
                    maxNilaAmount: '',
                    instantRewardPercent: '',
                });
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: value === '' ? '' : parseFloat(value),
        }));
        if (errors[name as keyof RewardTierFormData]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                onClick={handleClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">
                            {isEditing ? 'Edit Reward Tier' : 'Create Reward Tier'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-xs text-blue-900">
                                Reward tiers automatically calculate instant rewards based on the NILA stake amount. Set max to 0 for unlimited.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Minimum NILA Amount
                            </label>
                            <input
                                type="number"
                                name="minNilaAmount"
                                value={formData.minNilaAmount}
                                onChange={handleChange}
                                min="0"
                                step="1"
                                placeholder="Enter NILA amount"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.minNilaAmount ? 'border-red-500' : 'border-slate-200'
                                    }`}
                            />
                            {errors.minNilaAmount && (
                                <p className="text-xs text-red-600 mt-1">{errors.minNilaAmount}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Minimum NILA tokens required for this tier
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Maximum NILA Amount
                            </label>
                            <input
                                type="number"
                                name="maxNilaAmount"
                                value={formData.maxNilaAmount}
                                onChange={handleChange}
                                min="0"
                                step="1"
                                placeholder="Enter NILA amount"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.maxNilaAmount ? 'border-red-500' : 'border-slate-200'
                                    }`}
                            />
                            {errors.maxNilaAmount && (
                                <p className="text-xs text-red-600 mt-1">{errors.maxNilaAmount}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Maximum NILA tokens for this tier (0 = unlimited)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Instant Reward (%)
                            </label>
                            <input
                                type="number"
                                name="instantRewardPercent"
                                value={formData.instantRewardPercent}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="Enter instant reward %"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.instantRewardPercent ? 'border-red-500' : 'border-slate-200'
                                    }`}
                            />
                            {errors.instantRewardPercent && (
                                <p className="text-xs text-red-600 mt-1">{errors.instantRewardPercent}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Instant cashback percentage for this tier
                            </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-slate-700 mb-1">Example:</p>
                            <p className="text-xs text-slate-600">
                                {Number(formData.minNilaAmount || 0).toLocaleString()} - {formData.maxNilaAmount === 0 || formData.maxNilaAmount === '' ? 'Unlimited' : Number(formData.maxNilaAmount).toLocaleString()} NILA = {Number(formData.instantRewardPercent || 0)}% instant reward
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 flex items-center justify-center bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isEditing ? 'Updating...' : 'Creating...'}
                                    </span>
                                ) : (
                                    isEditing ? 'Update Tier' : 'Create Tier'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
