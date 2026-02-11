import { Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { useState } from 'react';
import CreatePlanModal from './CreatePlanModal';
import type { PlanFormData } from './CreatePlanModal';

interface StakingPlan {
    id: string;
    name: string;
    duration: number;
    apy: number;
    minStake: number;
    maxStake: number;
    status: 'active' | 'disabled' | 'locked';
}

const mockPlans: StakingPlan[] = [
    {
        id: '1',
        name: 'Starter Plan',
        duration: 30,
        apy: 5,
        minStake: 100,
        maxStake: 10000,
        status: 'active',
    },
    {
        id: '2',
        name: 'Premium Plan',
        duration: 90,
        apy: 8,
        minStake: 1000,
        maxStake: 100000,
        status: 'active',
    },
    {
        id: '3',
        name: 'Elite Plan',
        duration: 180,
        apy: 12,
        minStake: 10000,
        maxStake: 1000000,
        status: 'locked',
    },
    {
        id: '4',
        name: 'Legacy Plan',
        duration: 60,
        apy: 6,
        minStake: 500,
        maxStake: 50000,
        status: 'disabled',
    },
];

const getBadgeStyles = (status: string) => {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-800';
        case 'disabled':
            return 'bg-slate-100 text-slate-800';
        case 'locked':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
};

const getBadgeLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const StakingPlans = () => {
    const [plans, setPlans] = useState<StakingPlan[]>(mockPlans);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEdit = (id: string) => {
        console.log('Edit plan:', id);
        // TODO: Open edit modal
    };

    const handleDelete = (id: string) => {
        setPlans(plans.filter((plan) => plan.id !== id));
    };

    const handleCreateNew = () => {
        setIsModalOpen(true);
    };

    const handleSubmitPlan = (planData: PlanFormData) => {
        const newPlan: StakingPlan = {
            id: Date.now().toString(),
            ...planData,
            status: 'active',
        };
        setPlans([...plans, newPlan]);
        console.log('New plan created:', newPlan);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Staking Plans</h1>
                    <p className="text-slate-600 mt-1">Manage all staking plans and their configurations</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Create New Plan
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Plan Name
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Duration
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    APY
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Min Stake
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Max Stake
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
                            {plans.map((plan) => (
                                <tr
                                    key={plan.id}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {plan.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {plan.duration} days
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                        {plan.apy}%
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {plan.minStake.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {plan.maxStake.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyles(
                                                plan.status
                                            )}`}
                                        >
                                            {plan.status === 'locked' && (
                                                <Lock className="w-3 h-3" />
                                            )}
                                            {getBadgeLabel(plan.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {plan.status !== 'locked' && (
                                                <button
                                                    onClick={() => handleEdit(plan.id)}
                                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Edit plan"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {plan.status === 'locked' && (
                                                <div className="p-2 text-slate-300 cursor-not-allowed">
                                                    <Edit2 className="w-4 h-4" />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {plans.length === 0 && (
                    <div className="px-6 py-12 text-center">
                        <p className="text-slate-600 mb-4">No staking plans found</p>
                        <button
                            onClick={handleCreateNew}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            Create First Plan
                        </button>
                    </div>
                )}
            </div>

            {/* Create Plan Modal */}
            <CreatePlanModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmitPlan}
            />
        </div>
    );
};

export default StakingPlans;
