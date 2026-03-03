import { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface USDTWithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
    isProcessing: boolean;
    currentBalance: number;
    totalCollected: number;
}

export const USDTWithdrawModal = ({
    isOpen,
    onClose,
    onConfirm,
    isProcessing,
    currentBalance,
    totalCollected
}: USDTWithdrawModalProps) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const amountNum = parseFloat(amount);

        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amountNum > currentBalance) {
            setError(`Cannot withdraw more than ${currentBalance.toLocaleString()} USDT`);
            return;
        }

        try {
            await onConfirm(amountNum);
            setAmount('');
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to withdraw USDT');
        }
    };

    const handleMaxClick = () => {
        setAmount(currentBalance.toString());
        setError('');
    };

    const handleClose = () => {
        if (!isProcessing) {
            setAmount('');
            setError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-slate-700" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Withdraw USDT</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Balance Info */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Current Balance</span>
                            <span className="text-lg font-bold text-slate-900">
                                {currentBalance.toLocaleString()} USDT
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Collected</span>
                            <span className="text-sm font-medium text-slate-700">
                                {totalCollected.toLocaleString()} USDT
                            </span>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Withdrawal Amount (USDT)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError('');
                                }}
                                placeholder="0.0"
                                step="any"
                                min="0"
                                disabled={isProcessing}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none disabled:bg-slate-50 disabled:text-slate-500 text-lg font-medium"
                            />
                            <button
                                type="button"
                                onClick={handleMaxClick}
                                disabled={isProcessing}
                                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Info Message */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                            USDT will be withdrawn from the staking contract to your admin wallet.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isProcessing}
                            className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                            className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Withdraw USDT'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface NILALiabilityDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
    isProcessing: boolean;
    totalLiabilities: number;
    nilaBalance: number;
    deficit: number;
    hasSurplus: boolean;
}

export const NILALiabilityDepositModal = ({
    isOpen,
    onClose,
    onConfirm,
    isProcessing,
    totalLiabilities,
    nilaBalance,
    deficit,
    hasSurplus
}: NILALiabilityDepositModalProps) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const amountNum = parseFloat(amount);

        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        try {
            await onConfirm(amountNum);
            setAmount('');
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to deposit NILA');
        }
    };

    const handleDeficitClick = () => {
        if (!hasSurplus && deficit > 0) {
            setAmount(deficit.toString());
            setError('');
        }
    };

    const handleClose = () => {
        if (!isProcessing) {
            setAmount('');
            setError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Deposit NILA for Liabilities</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Liability Status */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Total Liabilities</span>
                            <span className="text-lg font-bold text-slate-900">
                                {totalLiabilities.toLocaleString()} NILA
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Current NILA Balance</span>
                            <span className="text-sm font-medium text-slate-700">
                                {nilaBalance.toLocaleString()} NILA
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-sm font-medium text-slate-700">
                                {hasSurplus ? 'Surplus' : 'Deficit'}
                            </span>
                            <span className={`text-lg font-bold ${hasSurplus ? 'text-green-600' : 'text-red-600'}`}>
                                {hasSurplus ? '+' : '-'}{Math.abs(deficit).toLocaleString()} NILA
                            </span>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Deposit Amount (NILA)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError('');
                                }}
                                placeholder="0.0"
                                step="any"
                                min="0"
                                disabled={isProcessing}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-slate-50 disabled:text-slate-500 text-lg font-medium"
                            />
                            {!hasSurplus && deficit > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDeficitClick}
                                    disabled={isProcessing}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    Cover Deficit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Info Message */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                            NILA tokens will be deposited to cover recorded liabilities from USDT purchases. 
                            These tokens will be used to pay users at maturity.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isProcessing}
                            className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Deposit NILA'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
