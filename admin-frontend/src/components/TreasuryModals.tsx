import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    isProcessing?: boolean;
}

interface WithdrawModalProps extends ModalProps {
    maxAmount?: number;
}

export const DepositModal = ({ isOpen, onClose, onConfirm, isProcessing = false }: ModalProps) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        onConfirm(value);
        setAmount('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">Deposit Tokens</h2>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Amount (NILA)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError('');
                                }}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Enter amount..."
                            />
                            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Deposit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export const WithdrawModal = ({ isOpen, onClose, onConfirm, isProcessing = false, maxAmount }: WithdrawModalProps) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (maxAmount !== undefined && value > maxAmount) {
            setError(`Amount exceeds available balance (${maxAmount.toLocaleString()} NILA)`);
            return;
        }
        onConfirm(value);
        setAmount('');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">Withdraw Tokens</h2>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                            <p className="text-sm text-amber-800">
                                Withdrawing tokens from the contract may affect the ability to pay out rewards. Proceed with caution.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Amount to Withdraw (NILA)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setError('');
                                    }}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Enter amount..."
                                />
                                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'Processing...' : 'Withdraw'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};
