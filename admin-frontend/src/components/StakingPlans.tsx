import { Plus, Power, PowerOff, Loader2, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CreateAmountConfigModal, CreateLockConfigModal } from './CreatePlanModal';
import type { AmountConfigFormData, LockConfigFormData } from './CreatePlanModal';
import { stakingApi } from '../api/stakingApi';
import type { AmountConfig, LockConfig } from '../api/stakingApi';
import toast from 'react-hot-toast';

const getBadgeStyles = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800';
};

const StakingPlans = () => {
    const [activeTab, setActiveTab] = useState<'amounts' | 'locks'>('amounts');
    const [amountConfigs, setAmountConfigs] = useState<AmountConfig[]>([]);
    const [lockConfigs, setLockConfigs] = useState<LockConfig[]>([]);

    // Modal states
    const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);

    // Edit states
    const [editingAmountId, setEditingAmountId] = useState<number | null>(null);
    const [editingLockId, setEditingLockId] = useState<number | null>(null);
    const [amountInitialData, setAmountInitialData] = useState<AmountConfigFormData | undefined>(undefined);
    const [lockInitialData, setLockInitialData] = useState<LockConfigFormData | undefined>(undefined);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txPending, setTxPending] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        setError(null);
        try {
            const [amounts, locks] = await Promise.all([
                stakingApi.getAmountConfigs(),
                stakingApi.getLockConfigs()
            ]);
            setAmountConfigs(amounts);
            setLockConfigs(locks);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch configurations');
            console.error('Error fetching configs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAmountActive = async (id: number) => {
        const config = amountConfigs.find(c => c.id === id);
        if (!config) return;

        setTxPending(true);
        try {
            await stakingApi.updateAmountConfig(id, {
                instantRewardPercent: config.instantRewardBps / 100,
                active: !config.active
            });
            await fetchConfigs();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update config');
        } finally {
            setTxPending(false);
        }
    };

    const handleToggleLockActive = async (id: number) => {
        const config = lockConfigs.find(c => c.id === id);
        if (!config) return;

        setTxPending(true);
        try {
            await stakingApi.updateLockConfig(id, {
                aprPercent: config.apr / 100,
                active: !config.active
            });
            await fetchConfigs();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update config');
        } finally {
            setTxPending(false);
        }
    };

    const handleCreateAmountConfig = async (data: AmountConfigFormData) => {
        setTxPending(true);
        try {
            const result = await stakingApi.createAmountConfig(data);
            console.log('Transaction hash:', result.txHash);
            await fetchConfigs();
            toast.success(`Amount config created! TX: ${result.txHash.slice(0, 10)}...`);
            handleCloseAmountModal();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create config');
        } finally {
            setTxPending(false);
        }
    };

    const handleUpdateAmountConfig = async (data: AmountConfigFormData) => {
        if (editingAmountId === null) return;

        // Find existing config to preserve active state
        const config = amountConfigs.find(c => c.id === editingAmountId);
        if (!config) return;

        setTxPending(true);
        try {
            const result = await stakingApi.updateAmountConfig(editingAmountId, {
                instantRewardPercent: data.instantRewardPercent,
                active: config.active // Preserve existing active state
            });
            console.log('Transaction hash:', result.txHash);
            await fetchConfigs();
            toast.success(`Amount config updated! TX: ${result.txHash.slice(0, 10)}...`);
            handleCloseAmountModal();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update config');
        } finally {
            setTxPending(false);
        }
    };

    const handleCreateLockConfig = async (data: LockConfigFormData) => {
        setTxPending(true);
        try {
            const result = await stakingApi.createLockConfig(data);
            console.log('Transaction hash:', result.txHash);
            await fetchConfigs();
            toast.success(`Lock config created! TX: ${result.txHash.slice(0, 10)}...`);
            handleCloseLockModal();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create config');
        } finally {
            setTxPending(false);
        }
    };

    const handleUpdateLockConfig = async (data: LockConfigFormData) => {
        if (editingLockId === null) return;

        // Find existing config to preserve active state
        const config = lockConfigs.find(c => c.id === editingLockId);
        if (!config) return;

        setTxPending(true);
        try {
            const result = await stakingApi.updateLockConfig(editingLockId, {
                aprPercent: data.aprPercent,
                active: config.active // Preserve existing active state
            });
            console.log('Transaction hash:', result.txHash);
            await fetchConfigs();
            toast.success(`Lock config updated! TX: ${result.txHash.slice(0, 10)}...`);
            handleCloseLockModal();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update config');
        } finally {
            setTxPending(false);
        }
    };

    const openCreateAmountModal = () => {
        setEditingAmountId(null);
        setAmountInitialData(undefined);
        setIsAmountModalOpen(true);
    };

    const openEditAmountModal = (config: AmountConfig) => {
        setEditingAmountId(config.id);
        setAmountInitialData({
            amount: Number(BigInt(config.amount) / BigInt(10 ** 18)),
            instantRewardPercent: config.instantRewardBps / 100
        });
        setIsAmountModalOpen(true);
    };

    const handleCloseAmountModal = () => {
        setIsAmountModalOpen(false);
        setEditingAmountId(null);
        setAmountInitialData(undefined);
    };

    const openCreateLockModal = () => {
        setEditingLockId(null);
        setLockInitialData(undefined);
        setIsLockModalOpen(true);
    };

    const openEditLockModal = (config: LockConfig) => {
        setEditingLockId(config.id);
        setLockInitialData({
            lockDays: config.lockDuration,
            aprPercent: config.apr / 100
        });
        setIsLockModalOpen(true);
    };

    const handleCloseLockModal = () => {
        setIsLockModalOpen(false);
        setEditingLockId(null);
        setLockInitialData(undefined);
    };

    // Convert wei to NILA for display
    const formatAmount = (amountWei: string) => {
        const amount = BigInt(amountWei) / BigInt(10 ** 18);
        return amount.toString();
    };

    if (loading && amountConfigs.length === 0 && lockConfigs.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {txPending && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
                    <span className="text-yellow-800">Transaction pending... Please wait for blockchain confirmation.</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <span className="text-red-800">{error}</span>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Staking Configuration</h1>
                    <p className="text-slate-600 mt-1">Manage stake amounts and lock durations</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('amounts')}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'amounts'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Amount Configs
                    </button>
                    <button
                        onClick={() => setActiveTab('locks')}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'locks'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Lock Configs
                    </button>
                </div>
            </div>

            {/* Amount Configs Tab */}
            {activeTab === 'amounts' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={openCreateAmountModal}
                            disabled={txPending}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-5 h-5" />
                            Create Amount Config
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                            ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                            Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                            Instant Reward
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
                                    {amountConfigs.map((config) => (
                                        <tr
                                            key={config.id}
                                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                #{config.id}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                                {formatAmount(config.amount)} USD/USDT
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {(config.instantRewardBps / 100).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyles(
                                                        config.active
                                                    )}`}
                                                >
                                                    {config.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditAmountModal(config)}
                                                        disabled={txPending}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleAmountActive(config.id)}
                                                        disabled={txPending}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={config.active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {config.active ? (
                                                            <PowerOff className="w-4 h-4" />
                                                        ) : (
                                                            <Power className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {amountConfigs.length === 0 && (
                            <div className="px-6 py-12 text-center text-slate-600">
                                No amount configs found. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lock Configs Tab */}
            {activeTab === 'locks' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={openCreateLockModal}
                            disabled={txPending}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-5 h-5" />
                            Create Lock Config
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                            ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                            Duration
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                            APR
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
                                    {lockConfigs.map((config) => (
                                        <tr
                                            key={config.id}
                                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                #{config.id}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                                {config.lockDuration} days
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {(config.apr / 100).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getBadgeStyles(
                                                        config.active
                                                    )}`}
                                                >
                                                    {config.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditLockModal(config)}
                                                        disabled={txPending}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleLockActive(config.id)}
                                                        disabled={txPending}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={config.active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {config.active ? (
                                                            <PowerOff className="w-4 h-4" />
                                                        ) : (
                                                            <Power className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {lockConfigs.length === 0 && (
                            <div className="px-6 py-12 text-center text-slate-600">
                                No lock configs found. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <CreateAmountConfigModal
                isOpen={isAmountModalOpen}
                onClose={handleCloseAmountModal}
                onSubmit={editingAmountId !== null ? handleUpdateAmountConfig : handleCreateAmountConfig}
                initialData={amountInitialData}
                isEditing={editingAmountId !== null}
            />
            <CreateLockConfigModal
                isOpen={isLockModalOpen}
                onClose={handleCloseLockModal}
                onSubmit={editingLockId !== null ? handleUpdateLockConfig : handleCreateLockConfig}
                initialData={lockInitialData}
                isEditing={editingLockId !== null}
            />
        </div>
    );
};

export default StakingPlans;
