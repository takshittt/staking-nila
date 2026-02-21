import { useState, useMemo, useEffect } from 'react';
import { Info, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { stakingApi, type AmountConfig, type LockConfig } from '../services/stakingApi';
import { transactionApi } from '../services/transactionApi';
import { userApi } from '../services/userApi';
import { ContractService } from '../services/contractService';
import { useWallet } from '../hooks/useWallet';
import { useAccount } from 'wagmi';
import EthicsPaymentModal from './EthicsPaymentModal';
import toast from 'react-hot-toast';

const StakeNila = () => {
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
    const [amountConfigs, setAmountConfigs] = useState<AmountConfig[]>([]);
    const [lockConfigs, setLockConfigs] = useState<LockConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [staking, setStaking] = useState(false);
    const [approving, setApproving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);
    const [referrerAddress, setReferrerAddress] = useState<string | undefined>(undefined);
    const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'card'>('crypto');
    const [showEthicsModal, setShowEthicsModal] = useState(false);
    const [, setCardPaymentError] = useState<string | null>(null);

    const { address, isConnected, chain } = useAccount();
    const { connect } = useWallet();

    // Check network and fetch referrer when connected
    useEffect(() => {
        const checkNetwork = async () => {
            if (isConnected) {
                const correct = await ContractService.checkNetwork();
                setIsCorrectNetwork(correct);
            }
        };
        const fetchReferrer = async () => {
            if (isConnected && address) {
                try {
                    const user = await userApi.getUser(address);
                    if (user.referrerWallet) {
                        setReferrerAddress(user.referrerWallet);
                        console.log('Referrer found:', user.referrerWallet);
                    }
                } catch (error) {
                    console.error('Failed to fetch referrer:', error);
                }
            }
        }
        checkNetwork();
        fetchReferrer();
    }, [isConnected, chain, address]);

    // Fetch configs from backend
    useEffect(() => {
        const fetchConfigs = async () => {
            setLoading(true);
            try {
                const [amounts, locks] = await Promise.all([
                    stakingApi.getActiveAmountConfigs(),
                    stakingApi.getActiveLockConfigs()
                ]);

                setAmountConfigs(amounts);
                setLockConfigs(locks);

                // Set defaults if available
                if (amounts.length > 0 && !selectedPackage) {
                    setSelectedPackage(amounts[0].amount);
                }
                if (locks.length > 0 && !selectedDuration) {
                    setSelectedDuration(locks[0].lockDuration);
                }
            } catch (error) {
                console.error('Failed to fetch staking configs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchConfigs();
    }, []);

    const handleStake = async () => {
        if (!selectedPackage || !selectedDuration) {
            toast.error('Please select a package and duration');
            return;
        }

        // Validate configs exist
        const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
        const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

        console.log('[STAKE] Selected values:', {
            selectedPackage,
            selectedDuration,
            amountConfig,
            lockConfig,
            amountConfigs,
            lockConfigs
        });

        if (!amountConfig || !lockConfig) {
            toast.error('Invalid configuration selected');
            return;
        }

        // Route based on payment method
        if (paymentMethod === 'crypto') {
            await handleCryptoStake();
        } else {
            // Open Ethics payment modal for card payment
            console.log('[STAKE] Opening modal with IDs:', {
                amountConfigId: amountConfig.id,
                lockConfigId: lockConfig.id
            });
            setShowEthicsModal(true);
        }
    };

    const handleCryptoStake = async () => {
        if (!isConnected || !address) {
            connect();
            return;
        }

        if (!selectedPackage || !selectedDuration) {
            toast.error('Please select a package and duration');
            return;
        }

        const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
        const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

        if (!amountConfig || !lockConfig) {
            toast.error('Invalid configuration selected');
            return;
        }

        // Convert wei to NILA for display (this is the USD display amount)
        const displayAmount = Number(BigInt(amountConfig.amount) / BigInt(10 ** 18));

        // Calculate actual NILA amount user needs to pay (displayAmount ÷ 0.08)
        const nilaAmount = displayAmount / 0.08;

        // Convert NILA amount to wei string for contract calls
        // const nilaAmountWei = (BigInt(Math.floor(nilaAmount)) * BigInt(10 ** 18)).toString();

        try {
            setStaking(true);

            // Check and switch to BSC Testnet if needed
            setStatusMessage('Checking network...');
            await ContractService.ensureCorrectNetwork();

            setStatusMessage('Checking token allowance...');

            // Check if approval is needed (use wei amount)
            const hasAllowance = await ContractService.checkAllowance(address, nilaAmount.toString());

            if (!hasAllowance) {
                setApproving(true);
                setStatusMessage('Please approve NILA tokens in your wallet...');

                // Approve with wei amount
                await ContractService.approveToken(nilaAmount.toString());

                setApproving(false);
                setStatusMessage('Approval confirmed! Waiting for blockchain confirmation...');

                // Wait for blockchain to update state
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Verify approval was successful
                const verifyAllowance = await ContractService.checkAllowance(address, nilaAmount.toString());
                if (!verifyAllowance) {
                    throw new Error('Approval verification failed. Please try again.');
                }

                setStatusMessage('Approval verified! Proceeding to stake...');
            }

            setStatusMessage('Please confirm the staking transaction in your wallet...');

            // Stake tokens
            const txHash = await ContractService.stake({
                amountConfigId: amountConfig.id,
                lockConfigId: lockConfig.id,
                referrerAddress // Pass referrer address if available
            });

            setStatusMessage('Recording stake in database...');

            // Record stake in backend
            await stakingApi.recordStake({
                walletAddress: address,
                planName: 'NILA Staking',
                planVersion: 1,
                amount: nilaAmount,
                apy: lockConfig.apr / 100,
                lockDays: lockConfig.lockDuration,
                instantRewardPercent: amountConfig.instantRewardBps / 100,
                txHash
            });

            // Record transaction for transaction history
            await transactionApi.createTransaction({
                txHash,
                walletAddress: address,
                type: 'STAKE',
                amount: nilaAmount,
                status: 'confirmed'
            });

            setStatusMessage('');
            toast.success(`Successfully staked ${nilaAmount.toLocaleString()} NILA!\nTransaction: ${txHash.slice(0, 10)}...`);

            // Reset selections
            setSelectedPackage(null);
            setSelectedDuration(null);

        } catch (error: any) {
            console.error('Staking error:', error);
            setStatusMessage('');
            toast.error(error.message || 'Failed to stake tokens. Please try again.');
        } finally {
            setStaking(false);
            setApproving(false);
        }
    };

    const handleCardPaymentSuccess = async (invoiceId: string, intentId: string) => {
        try {
            setStaking(true);
            setStatusMessage('Verifying payment...');

            if (!address) {
                throw new Error('Wallet not connected');
            }

            const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
            const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

            if (!amountConfig || !lockConfig) {
                throw new Error('Invalid configuration');
            }

            setStatusMessage('Processing your stake...');

            // Call verify-intent endpoint - backend will create the stake
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
            const response = await fetch(`${API_BASE}/api/verify-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent_id: intentId,
                    invoice_id: invoiceId
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to verify payment');
            }

            setStatusMessage('');
            setShowEthicsModal(false);
            toast.success(`Successfully staked ${data.nilaAmount.toLocaleString()} NILA!\nTransaction: ${data.txHash.slice(0, 10)}...`);

            // Reset selections
            setSelectedPackage(null);
            setSelectedDuration(null);

        } catch (error: any) {
            console.error('Card payment staking error:', error);
            setStatusMessage('');
            setCardPaymentError(error.message || 'Failed to complete staking');
            toast.error(error.message || 'Failed to stake tokens. Please try again.');
        } finally {
            setStaking(false);
        }
    };

    // Auto-calculate rewards
    const calculations = useMemo(() => {
        if (!selectedPackage || !selectedDuration) {
            return {
                amount: 0,
                instantCashbackAmount: 0,
                apyRewards: 0,
                totalRewards: 0,
                instantRewardPercent: 0,
                aprPercent: 0,
                lockDuration: 0
            };
        }

        const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
        const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

        if (!amountConfig || !lockConfig) {
            return {
                amount: 0,
                instantCashbackAmount: 0,
                apyRewards: 0,
                totalRewards: 0,
                instantRewardPercent: 0,
                aprPercent: 0,
                lockDuration: 0
            };
        }

        // Use amount directly (admin assigns USD/USDT amount)
        const amount = Number(BigInt(amountConfig.amount) / BigInt(10 ** 18));

        // Convert basis points to percentage (divide by 100)
        // If payment method is card, instant reward is 0
        const instantRewardPercent = paymentMethod === 'card' ? 0 : amountConfig.instantRewardBps / 100;
        const aprPercent = lockConfig.apr / 100;

        // Calculate instant cashback in USD/USDT
        const instantCashbackAmount = Math.floor((amount * instantRewardPercent) / 100);

        // Calculate APY rewards in USD/USDT using simple interest
        // Formula: Principal * Rate * Time (in years)
        const apyRewards = Math.floor(amount * (aprPercent / 100) * (lockConfig.lockDuration / 365));

        const totalRewards = instantCashbackAmount + apyRewards;

        return {
            amount,
            instantCashbackAmount,
            apyRewards,
            totalRewards,
            instantRewardPercent,
            aprPercent,
            lockDuration: lockConfig.lockDuration
        };
    }, [selectedPackage, selectedDuration, amountConfigs, lockConfigs, paymentMethod]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (amountConfigs.length === 0 || lockConfigs.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center">
                <p className="text-slate-600">No staking options available at the moment. Please check back later.</p>
            </div>
        );
    }

    const isProcessing = staking || approving;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* Network Warning */}
            {isConnected && !isCorrectNetwork && (
                <div className="lg:col-span-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-yellow-600" />
                            <div>
                                <p className="text-yellow-800 font-medium">Wrong Network</p>
                                <p className="text-yellow-700 text-sm">Please switch to BSC Testnet to stake</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    await ContractService.switchToBscTestnet();
                                    setIsCorrectNetwork(true);
                                } catch (error: any) {
                                    toast.error(error.message || 'Failed to switch network');
                                }
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                        >
                            Switch Network
                        </button>
                    </div>
                </div>
            )}

            {/* Status Message */}
            {statusMessage && (
                <div className="lg:col-span-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-blue-800">{statusMessage}</span>
                    </div>
                </div>
            )}

            {/* Left Column: Selections */}
            <div className="lg:col-span-2 space-y-8">

                {/* Page Headline */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Stake NILA & Earn Rewards</h1>
                    <p className="text-slate-500">
                        Stake NILA securely and earn <span className="text-red-600 font-semibold">instant cashback</span> + APY rewards based on your selected package and duration.
                    </p>

                    {/* Payment Method Toggle */}
                    <div className="flex p-1 bg-slate-100 rounded-xl mt-6 w-fit">
                        <button
                            onClick={() => setPaymentMethod('crypto')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${paymentMethod === 'crypto'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-red-700'
                                }`}
                        >
                            Pay with Crypto
                        </button>
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${paymentMethod === 'card'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-red-700'
                                }`}
                        >
                            Pay with Credit Card
                        </button>
                    </div>

                    {paymentMethod === 'card' && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                            <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-800">
                                No instant cashback or referral rewards will be given when staking with credit card.
                            </p>
                        </div>
                    )}
                </div>

                {/* Step 1: Select Staking Package */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center">1</div>
                        <h2 className="text-xl font-bold text-slate-900">Choose Your Package</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {amountConfigs.map((config) => {
                            const amount = Number(BigInt(config.amount) / BigInt(10 ** 18));
                            // Show configured percentage in UI, but calculation will be 0 if card
                            const displayInstantRewardPercent = config.instantRewardBps / 100;
                            const isSelected = selectedPackage === config.amount;

                            return (
                                <button
                                    key={config.id}
                                    onClick={() => setSelectedPackage(config.amount)}
                                    className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 group ${isSelected
                                        ? 'border-red-600 bg-red-50/30'
                                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="mb-2">
                                        <span className="text-2xl font-bold text-slate-900">{amount.toLocaleString()}</span>
                                        <span className="text-sm font-medium text-slate-500 ml-1">
                                            {paymentMethod === 'crypto' ? 'USDT' : 'USD'}
                                        </span>
                                    </div>

                                    {paymentMethod === 'crypto' && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                                {displayInstantRewardPercent}% Cashback
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                        <Info size={16} className="text-slate-400" />
                        {paymentMethod === 'card'
                            ? 'Instant cashback and referral rewards are not available for credit card payments.'
                            : 'Higher packages unlock additional instant cashback credited immediately after staking.'}
                    </p>
                </div>

                {/* Step 2: Select Lock Period */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center">2</div>
                        <h2 className="text-xl font-bold text-slate-900">Choose Staking Duration</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {lockConfigs.map((config) => {
                            const aprPercent = config.apr / 100;
                            const isSelected = selectedDuration === config.lockDuration;
                            return (
                                <button
                                    key={config.id}
                                    onClick={() => setSelectedDuration(config.lockDuration)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${isSelected
                                        ? 'border-red-600 bg-red-50/30'
                                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="text-xl font-bold text-slate-900 mb-1">{config.lockDuration}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Days</div>
                                    <div className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold">
                                        {aprPercent}% APR
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                        <Info size={16} className="text-slate-400" />
                        <span>Longer lock periods earn higher APY. Staked NILA remains <span className="font-medium text-slate-700">locked</span> until maturity.</span>
                    </p>
                </div>
            </div>

            {/* Right Column: Live Reward Preview */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 sticky top-28 shadow-xl">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Zap className="text-yellow-400" size={20} />
                        </div>
                        <h3 className="text-xl font-bold">Staking Summary</h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Package Info */}
                        <div className="pb-6 border-b border-slate-700/50">
                            <div className="text-slate-400 text-sm mb-1">Selected Package</div>
                            <div className="text-2xl font-bold text-white">
                                {calculations.amount?.toLocaleString() || 0} {paymentMethod === 'crypto' ? 'USDT' : 'USD'}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                You will receive: {calculations.amount ? (calculations.amount / 0.08).toLocaleString() : 0} NILA
                            </div>
                        </div>

                        {/* Lock Period Info */}
                        <div className="pb-6 border-b border-slate-700/50">
                            <div className="text-slate-400 text-sm mb-1">Lock Period</div>
                            <div className="text-2xl font-bold text-white flex items-center gap-2">
                                {selectedDuration || 0} Days
                                {selectedDuration && (
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-normal">
                                        Maturity: {new Date(Date.now() + selectedDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Rewards Breakdown */}
                        <div className="space-y-3 pb-6 border-b border-slate-700/50">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    Instant Cashback
                                    <span title="Credited to your wallet immediately after staking" className="cursor-help">
                                        <Info size={12} className="text-slate-500" />
                                    </span>
                                </span>
                                <span className={`font-bold ${calculations.instantCashbackAmount > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                    {calculations.instantCashbackAmount.toLocaleString()} {paymentMethod === 'crypto' ? 'USDT' : 'USD'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">APR ({calculations.aprPercent}%)</span>
                                <span className="text-green-400 font-bold">{calculations.apyRewards.toLocaleString()} {paymentMethod === 'crypto' ? 'USDT' : 'USD'}</span>
                            </div>
                        </div>

                        {/* Total Estimations */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">Estimated Total Rewards</div>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                                {calculations.totalRewards.toLocaleString()} {paymentMethod === 'crypto' ? 'USDT' : 'USD'}
                            </div>
                        </div>

                        {/* Helper Text */}
                        <div className="text-xs text-slate-400 space-y-1">
                            {paymentMethod === 'card' ? (
                                <p className="text-yellow-500">• Instant cashback applied only for crypto payments.</p>
                            ) : (
                                <p>• Instant cashback is credited immediately.</p>
                            )}
                            <p>• APR rewards accumulate and are claimable at maturity.</p>
                            <p>• Backend will calculate NILA amount based on $0.08 per NILA.</p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleStake}
                            disabled={isProcessing || !selectedPackage || !selectedDuration || (paymentMethod === 'crypto' && !isConnected)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-600/20 active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {approving ? 'Approving...' : 'Staking...'}
                                </>
                            ) : paymentMethod === 'crypto' && !isConnected ? (
                                'Connect Wallet to Stake'
                            ) : (
                                'Buy & Stake NILA'
                            )}
                        </button>

                        <div className="flex items-start gap-2 text-xs text-slate-500 mt-4 text-center justify-center">
                            <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                            <span>By staking, you agree that your NILA will remain locked for the selected duration.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ethics Payment Modal */}
            {showEthicsModal && (() => {
                const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
                const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

                if (!amountConfig || !lockConfig) {
                    console.error('[MODAL] Cannot render: missing configs', { amountConfig, lockConfig });
                    return null;
                }

                return (
                    <EthicsPaymentModal
                        show={showEthicsModal}
                        amount={calculations.amount}
                        usdPrice={calculations.amount}
                        referralBonus={referrerAddress ? 3 : 0}
                        paymentMethod={paymentMethod}
                        amountConfigId={amountConfig.id}
                        lockConfigId={lockConfig.id}
                        walletAddress={address}
                        onSuccess={handleCardPaymentSuccess}
                        onCancel={() => {
                            setShowEthicsModal(false);
                            setCardPaymentError(null);
                        }}
                        onError={(error) => setCardPaymentError(error)}
                    />
                );
            })()}
        </div>
    );
};

export default StakeNila;
