import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface AmountConfigFormData {
    amount: number;
    instantRewardPercent: number;
}

export interface LockConfigFormData {
    lockDays: number;
    aprPercent: number;
}

interface CreateAmountConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (configData: AmountConfigFormData) => void;
    initialData?: AmountConfigFormData;
    isEditing?: boolean;
}

interface CreateLockConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (configData: LockConfigFormData) => void;
    initialData?: LockConfigFormData;
    isEditing?: boolean;
}

export const CreateAmountConfigModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isEditing = false
}: CreateAmountConfigModalProps) => {
    const [formData, setFormData] = useState<AmountConfigFormData>({
        amount: 10000,
        instantRewardPercent: 5,
    });

    // Initialize form data when modal opens or initialData changes
    useState(() => {
        if (initialData) {
            setFormData(initialData);
        }
    });

    // Update form state if initialData changes while component is mounted
    if (isOpen && initialData && (formData.amount !== initialData.amount || formData.instantRewardPercent !== initialData.instantRewardPercent) && !isEditing) {
        // This logic is tricky with hooks. Better handled with useEffect.
    }

    // Using useEffect to handle initialData updates
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !isEditing) {
            setFormData({
                amount: 10000,
                instantRewardPercent: 5,
            });
        }
    }, [isOpen, initialData, isEditing]);

    const [errors, setErrors] = useState<Partial<Record<keyof AmountConfigFormData, string>>>({});

    const validateForm = () => {
        const newErrors: Partial<Record<keyof AmountConfigFormData, string>> = {};

        if (formData.amount <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }
        if (formData.instantRewardPercent < 0 || formData.instantRewardPercent > 100) {
            newErrors.instantRewardPercent = 'Instant reward must be between 0 and 100%';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
            setErrors({});
            // Don't close immediately, let parent handle it or close here? Parent handles it usually.
            // But we need to reset if closing.
            if (!isEditing) {
                setFormData({
                    amount: 10000,
                    instantRewardPercent: 5,
                });
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: parseFloat(value) || 0,
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
                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Stake Amount (NILA)
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                min="1"
                                placeholder="e.g., 10000"
                                disabled={isEditing}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.amount ? 'border-red-500' : 'border-slate-200'
                                    } ${isEditing ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            />
                            {errors.amount && (
                                <p className="text-xs text-red-600 mt-1">{errors.amount}</p>
                            )}
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
                                placeholder="e.g., 5"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${errors.instantRewardPercent ? 'border-red-500' : 'border-slate-200'
                                    }`}
                            />
                            {errors.instantRewardPercent && (
                                <p className="text-xs text-red-600 mt-1">{errors.instantRewardPercent}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                Instant cashback credited immediately after staking
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
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                {isEditing ? 'Update Config' : 'Create Config'}
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
    isEditing = false
}: CreateLockConfigModalProps) => {
    const [formData, setFormData] = useState<LockConfigFormData>({
        lockDays: 180,
        aprPercent: 8,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof LockConfigFormData, string>>>({});

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !isEditing) {
            setFormData({
                lockDays: 180,
                aprPercent: 8,
            });
        }
    }, [isOpen, initialData, isEditing]);

    const validateForm = () => {
        const newErrors: Partial<Record<keyof LockConfigFormData, string>> = {};

        if (formData.lockDays <= 0) {
            newErrors.lockDays = 'Lock duration must be greater than 0';
        }
        if (formData.aprPercent < 0 || formData.aprPercent > 500) {
            newErrors.aprPercent = 'APR must be between 0 and 500%';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
            setErrors({});
            if (!isEditing) {
                setFormData({
                    lockDays: 180,
                    aprPercent: 8,
                });
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: parseFloat(value) || 0,
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
                                placeholder="e.g., 180"
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
                                placeholder="e.g., 8"
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
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                {isEditing ? 'Update Config' : 'Create Config'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
