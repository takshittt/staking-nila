import { X } from 'lucide-react';
import { useState } from 'react';

export interface PlanFormData {
    name: string;
    duration: number;
    apy: number;
    minStake: number;
    maxStake: number;
}

interface CreatePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (planData: PlanFormData) => void;
}

const CreatePlanModal = ({ isOpen, onClose, onSubmit }: CreatePlanModalProps) => {
    const [formData, setFormData] = useState<PlanFormData>({
        name: '',
        duration: 30,
        apy: 5,
        minStake: 100,
        maxStake: 10000,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof PlanFormData, string>>>({});

    const validateForm = () => {
        const newErrors: Partial<Record<keyof PlanFormData, string>> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Plan name is required';
        }
        if (formData.duration <= 0) {
            newErrors.duration = 'Duration must be greater than 0';
        }
        if (formData.apy < 0) {
            newErrors.apy = 'APY cannot be negative';
        }
        if (formData.minStake <= 0) {
            newErrors.minStake = 'Minimum stake must be greater than 0';
        }
        if (formData.maxStake <= formData.minStake) {
            newErrors.maxStake = 'Maximum stake must be greater than minimum stake';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
            setFormData({
                name: '',
                duration: 30,
                apy: 5,
                minStake: 100,
                maxStake: 10000,
            });
            setErrors({});
            onClose();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'name' ? value : parseFloat(value) || 0,
        }));
        if (errors[name as keyof PlanFormData]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            duration: 30,
            apy: 5,
            minStake: 100,
            maxStake: 10000,
        });
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
                        <h2 className="text-xl font-bold text-slate-900">Create New Staking Plan</h2>
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
                                Plan Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Premium Plan"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                                    errors.name ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Duration (days)
                            </label>
                            <input
                                type="number"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                min="1"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                                    errors.duration ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.duration && (
                                <p className="text-xs text-red-600 mt-1">{errors.duration}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                APY (%)
                            </label>
                            <input
                                type="number"
                                name="apy"
                                value={formData.apy}
                                onChange={handleChange}
                                min="0"
                                step="0.1"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                                    errors.apy ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.apy && (
                                <p className="text-xs text-red-600 mt-1">{errors.apy}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Minimum Stake (NILA)
                            </label>
                            <input
                                type="number"
                                name="minStake"
                                value={formData.minStake}
                                onChange={handleChange}
                                min="1"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                                    errors.minStake ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.minStake && (
                                <p className="text-xs text-red-600 mt-1">{errors.minStake}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Maximum Stake (NILA)
                            </label>
                            <input
                                type="number"
                                name="maxStake"
                                value={formData.maxStake}
                                onChange={handleChange}
                                min="1"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${
                                    errors.maxStake ? 'border-red-500' : 'border-slate-200'
                                }`}
                            />
                            {errors.maxStake && (
                                <p className="text-xs text-red-600 mt-1">{errors.maxStake}</p>
                            )}
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
                                Create Plan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default CreatePlanModal;
