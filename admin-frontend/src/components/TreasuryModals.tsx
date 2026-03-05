import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    isProcessing?: boolean;
}

interface DepositModalProps extends ModalProps {
    recommendedAmount?: number;
    currentHealth?: 'healthy' | 'low' | 'critical';
}

interface WithdrawModalProps extends ModalProps {
    maxAmount?: number;
}

export const DepositModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    isProcessing = false,
    recommendedAmount = 0,
    currentHealth = 'healthy'
}: DepositModalProps) => {
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
    };

    const handleUseRecommended = () => {
        if (recommendedAmount > 0) {
            setAmount(recommendedAmount.toFixed(2));
            setError('');
        }
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
                        {recommendedAmount > 0 && currentHealth !== 'healthy' && (
                            <div className={`${
                                currentHealth === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                            } border rounded-lg p-4`}>
                                <p className={`text-sm font-medium ${
                                    currentHealth === 'critical' ? 'text-red-900' : 'text-amber-900'
                                } mb-2`}>
                                    Recommended Deposit
                                </p>
                                <div className="flex items-center justify-between">
                                    <p className={`text-2xl font-bold ${
                                        currentHealth === 'critical' ? 'text-red-600' : 'text-amber-600'
                                    }`}>
                                        {recommendedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} NILA
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleUseRecommended}
                                        className={`px-3 py-1 text-sm font-medium rounded-lg ${
                                            currentHealth === 'critical' 
                                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                                        }`}
                                    >
                                        Use This
                                    </button>
                                </div>
                                <p className={`text-xs ${
                                    currentHealth === 'critical' ? 'text-red-700' : 'text-amber-700'
                                } mt-2`}>
                                    This will bring treasury to healthy status (120% coverage)
                                </p>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                Amount (NILA)
                            </label>
                            <input
                                type="number"
                                step="0.01"
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
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800 space-y-2">
                                <p className="font-medium">Important Requirements:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>Contract must be paused before withdrawal</li>
                                    <li>Withdrawing reduces available reward pool</li>
                                    <li>May affect ability to pay out rewards</li>
                                    <li>Contract must be unpaused after withdrawal</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                                <strong>Note:</strong> If you get an error about the contract not being paused, 
                                you need to pause the contract first from the contract management section.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Amount to Withdraw (NILA)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setError('');
                                    }}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Enter amount..."
                                />
                                {maxAmount !== undefined && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Available: {maxAmount.toLocaleString()} NILA
                                    </p>
                                )}
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
