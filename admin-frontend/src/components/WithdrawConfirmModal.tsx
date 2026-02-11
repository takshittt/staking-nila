import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { TokenWallet } from './Tokens';

interface WithdrawConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    wallet: TokenWallet;
}

const WithdrawConfirmModal = ({ isOpen, onClose, onConfirm, wallet }: WithdrawConfirmModalProps) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            await onConfirm();
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">Confirm Withdrawal</h2>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Warning */}
                        <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-800">
                                Please review the details carefully before confirming this withdrawal.
                            </p>
                        </div>

                        {/* Withdrawal Details */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-1">
                                    Wallet Address
                                </p>
                                <div className="p-3 bg-slate-50 rounded-lg break-all font-mono text-sm text-slate-900">
                                    {wallet.address}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-1">
                                        NILA Balance
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {wallet.nila.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 font-medium uppercase tracking-wide mb-1">
                                        Rewards
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        {wallet.rewards.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">
                                    Total Withdrawal Amount
                                </p>
                                <p className="text-3xl font-bold text-red-600">
                                    {wallet.totalValue.toLocaleString()} NILA
                                </p>
                            </div>
                        </div>

                        {/* Confirmation Text */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-700">
                                This action will withdraw <span className="font-semibold">{wallet.totalValue.toLocaleString()} NILA</span> to the wallet address <span className="font-mono text-xs">{truncateAddress(wallet.address)}</span>. This action cannot be undone.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Confirm Withdrawal'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WithdrawConfirmModal;
