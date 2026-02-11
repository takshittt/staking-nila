import { Send, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import WithdrawConfirmModal from './WithdrawConfirmModal';

export interface TokenWallet {
    id: string;
    address: string;
    nila: number;
    rewards: number;
    totalValue: number;
}

const mockWallets: TokenWallet[] = [
    {
        id: '1',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f42e1',
        nila: 50000,
        rewards: 2500,
        totalValue: 52500,
    },
    {
        id: '2',
        address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        nila: 125000,
        rewards: 8750,
        totalValue: 133750,
    },
    {
        id: '3',
        address: '0x1234567890123456789012345678901234567890',
        nila: 25000,
        rewards: 500,
        totalValue: 25500,
    },
    {
        id: '4',
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        nila: 75000,
        rewards: 4500,
        totalValue: 79500,
    },
];

const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const Tokens = () => {
    const [wallets, setWallets] = useState<TokenWallet[]>(mockWallets);
    const [selectedWallet, setSelectedWallet] = useState<TokenWallet | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleWithdrawClick = (wallet: TokenWallet) => {
        setSelectedWallet(wallet);
        setIsConfirmOpen(true);
    };

    const handleConfirmWithdraw = async () => {
        if (selectedWallet) {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log(`Withdrew ${selectedWallet.totalValue} NILA from ${selectedWallet.address}`);
            setIsConfirmOpen(false);
            setSelectedWallet(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Tokens</h1>
                <p className="text-slate-600 mt-1">Manage token balances and withdrawals</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-600 text-sm font-medium">Total NILA</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                        {wallets.reduce((sum, w) => sum + w.nila, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-600 text-sm font-medium">Total Rewards</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                        {wallets.reduce((sum, w) => sum + w.rewards, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-slate-600 text-sm font-medium">Total Value</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                        {wallets.reduce((sum, w) => sum + w.totalValue, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Wallets Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Wallet Address
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    NILA Balance
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Rewards
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Total Value
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {wallets.map((wallet) => (
                                <tr
                                    key={wallet.id}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        <span title={wallet.address}>
                                            {truncateAddress(wallet.address)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {wallet.nila.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {wallet.rewards.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                        {wallet.totalValue.toLocaleString()} NILA
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleWithdrawClick(wallet)}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                                        >
                                            <Send className="w-4 h-4" />
                                            Withdraw
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {wallets.length === 0 && (
                    <div className="px-6 py-12 text-center">
                        <p className="text-slate-600">No wallets found</p>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-blue-900 mb-2">Withdrawal Information</h4>
                        <ul className="space-y-1 text-sm text-blue-800">
                            <li>• Withdrawals are processed immediately to the wallet address</li>
                            <li>• All pending rewards will be included in the withdrawal</li>
                            <li>• A confirmation is required before processing any withdrawal</li>
                            <li>• Ensure the wallet address is correct before confirming</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Withdraw Confirmation Modal */}
            {selectedWallet && (
                <WithdrawConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmWithdraw}
                    wallet={selectedWallet}
                />
            )}
        </div>
    );
};

export default Tokens;
