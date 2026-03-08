import { useState, useMemo, useEffect } from 'react';
import { Info, ShieldCheck, Zap, Loader2, Wallet, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { ContractService } from '../services/contractService';
import { useWallet } from '../hooks/useWallet';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { handleError } from '../utils/errorHandler';
import { formatUnits } from 'ethers';
import { stakingApi, type LockConfig } from '../services/stakingApi';
import { transactionApi } from '../services/transactionApi';

const StakeNila = () => {
    const [plans, setPlans] = useState<LockConfig[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [stakeAmount, setStakeAmount] = useState<string>('');
    const [nilaBalance, setNilaBalance] = useState<string>('0');

    // Status states
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [staking, setStaking] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);

    const { address, isConnected, chain } = useAccount();
    const { connect } = useWallet();

    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    // Fetch staking plans from backend
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoadingPlans(true);
                const lockConfigs = await stakingApi.getActiveLockConfigs();
                setPlans(lockConfigs);
                // Auto-select first plan if available
                if (lockConfigs.length > 0 && !selectedPlanId) {
                    setSelectedPlanId(lockConfigs[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch staking plans:', error);
                toast.error('Failed to load staking plans');
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    // Check network when connected
    useEffect(() => {
        const checkNetwork = async () => {
            if (isConnected) {
                const correct = await ContractService.checkNetwork();
                setIsCorrectNetwork(correct);
            }
        };
        checkNetwork();
    }, [isConnected, chain, address]);

    // Fetch NILA Balance
    useEffect(() => {
        const fetchBalance = async () => {
            if (isConnected && address) {
                try {
                    setLoadingBalance(true);
                    const balanceWei = await ContractService.getTokenBalance(address);
                    const balanceFormatted = formatUnits(balanceWei, 18);
                    setNilaBalance(balanceFormatted);
                } catch (error) {
                    console.error('Failed to fetch NILA balance:', error);
                    setNilaBalance('0');
                } finally {
                    setLoadingBalance(false);
                }
            } else {
                setLoadingBalance(false);
                setNilaBalance('0');
            }
        };
        fetchBalance();
    }, [isConnected, address]);

    const handleQuickSelect = (percentage: number) => {
        const balanceNum = parseFloat(nilaBalance);
        if (isNaN(balanceNum) || balanceNum <= 0) return;

        const amount = (balanceNum * percentage) / 100;
        // Format to a reasonable number of decimal places, avoid trailing zeros
        setStakeAmount(amount.toFixed(4).replace(/\.?0+$/, ''));
    };

    const handleStake = async () => {
        if (!isConnected || !address) {
            connect();
            return;
        }

        const amountNum = parseFloat(stakeAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid stake amount');
            return;
        }

        if (amountNum < 10) {
            toast.error('Minimum stake amount is 10 NILA');
            return;
        }

        if (amountNum > parseFloat(nilaBalance)) {
            toast.error('Insufficient NILA balance');
            return;
        }

        if (selectedPlanId === null || selectedPlanId === undefined) {
            toast.error('Please select a staking plan');
            return;
        }

        try {
            setStaking(true);
            setStatusMessage('Checking network...');
            await ContractService.ensureCorrectNetwork();

            setStatusMessage('Checking token allowance...');
            const hasAllowance = await ContractService.checkAllowance(address, stakeAmount);

            if (!hasAllowance) {
                setStatusMessage('Approving tokens...');
                await ContractService.approveToken(stakeAmount);
                toast.success('Token approval successful!');
            }

            setStatusMessage('Preparing stake transaction...');
            const result = await ContractService.stake({
                amount: stakeAmount,
                lockConfigId: selectedPlanId
            });

            setStatusMessage('Recording stake...');
            // Record stake in backend database
            try {
                await stakingApi.recordStake({
                    walletAddress: address,
                    planName: `${selectedPlan?.lockDuration} Days`,
                    planVersion: 1,
                    amount: amountNum,
                    apy: selectedPlan?.apr || 0,
                    lockDays: selectedPlan?.lockDuration || 0,
                    instantRewardAmount: 0, // Direct staking has no instant rewards
                    txHash: result.txHash,
                    onChainStakeId: result.stakeIndex ?? undefined
                });

                // Record transaction
                await transactionApi.createTransaction({
                    txHash: result.txHash,
                    walletAddress: address,
                    type: 'STAKE',
                    amount: amountNum,
                    status: 'confirmed'
                });
            } catch (backendError: any) {
                console.error('Failed to record stake in backend:', backendError);
                // Don't fail the whole operation if backend recording fails
                // The stake already succeeded on-chain
            }

            setStatusMessage('Stake successful!');
            toast.success(`Successfully staked ${amountNum.toLocaleString()} NILA for ${selectedPlan?.lockDuration || 0} days!`);

            // Refresh balance
            const newBalance = await ContractService.getTokenBalance(address);
            setNilaBalance(formatUnits(newBalance, 18));
            setStakeAmount('');

        } catch (error: any) {
            handleError(error, 'Failed to stake tokens. Please try again.');
        } finally {
            setStaking(false);
            setStatusMessage('');
        }
    };

    // Calculate Earnings Preview
    const calculations = useMemo(() => {
        const amountNum = parseFloat(stakeAmount) || 0;

        if (!selectedPlan) {
            return {
                amount: amountNum,
                profit: 0,
                total: amountNum,
                duration: 0,
                apr: 0
            };
        }

        // Convert APR from basis points to percentage (e.g., 500 bps = 5%)
        const aprPercent = selectedPlan.apr / 100;

        // Simple interest formula for preview
        const profit = amountNum * (aprPercent / 100) * (selectedPlan.lockDuration / 365);
        const total = amountNum + profit;

        return {
            amount: amountNum,
            profit,
            total,
            duration: selectedPlan.lockDuration,
            apr: aprPercent
        };
    }, [stakeAmount, selectedPlan]);

    const isProcessing = staking;

    return (
        <div className="pb-12 space-y-8 max-w-7xl mx-auto">
            {/* Header Area Removed */}

            {/* Reward Information Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="bg-blue-100 p-2.5 rounded-full shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-0.5">
                    <p className="text-blue-900 font-bold">Reward Notice</p>
                    <p className="text-blue-800 text-sm font-medium leading-relaxed">
                        Please note that direct staking of NILA tokens does not provide instant or referral rewards.
                        These benefits are exclusively available when using the <span className="font-bold text-blue-900">Buy & Stake NILA</span> option.
                    </p>
                </div>
            </div>

            {/* Network Warning */}
            {isConnected && !isCorrectNetwork && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Info className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-amber-900 font-bold">Wrong Network Connected</p>
                            <p className="text-amber-700 text-sm font-medium">Please switch to BNB Smart Chain (BSC Mainnet) to interact with the staking contract.</p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                await ContractService.switchToBscMainnet();
                                setIsCorrectNetwork(true);
                            } catch (error: any) {
                                toast.error(error.message || 'Failed to switch network');
                            }
                        }}
                        className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold shadow-sm shadow-amber-500/20 active:scale-95"
                    >
                        Switch Network
                    </button>
                </div>
            )}

            {/* Status Message */}
            {statusMessage && (
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-900 font-medium">{statusMessage}</span>
                </div>
            )}

            {/* STAKE NILA CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 slide-in-from-bottom-4">

                {/* Left Column: Input & Plan Selection */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Stake Amount Card */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:border-red-100 transition-colors">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-red-50/50 shrink-0 text-sm">1</div>
                                <h2 className="text-lg font-bold text-slate-900">Enter Stake Amount</h2>
                            </div>

                            {/* Available Balance Display */}
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                <Wallet size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Available:</span>
                                {loadingBalance ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                                ) : (
                                    <span className="text-sm font-bold text-slate-900">
                                        {parseFloat(nilaBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} NILA
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="relative mb-4 z-10 sm:ml-11 pl-1 sm:pl-0">
                            <div className="relative flex items-center bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-50 transition-all shadow-sm">
                                <input
                                    type="number"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="0.0"
                                    className="w-full bg-transparent px-5 py-4 text-2xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none focus:ring-0"
                                    min="0"
                                    step="any"
                                />
                                <div className="pr-5 flex items-center gap-2 select-none">
                                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-200 overflow-hidden">
                                        <img src="/nila-logo-alt-2.png" alt="NILA" className="w-5 h-5 object-contain" />
                                    </div>
                                    <span className="text-base font-bold text-slate-400">NILA</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Select Chips */}
                        <div className="flex flex-wrap items-center gap-2 sm:ml-11 pl-1 sm:pl-0 z-10 relative">
                            {[25, 50, 75].map(percent => (
                                <button
                                    key={percent}
                                    onClick={() => handleQuickSelect(percent)}
                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-colors active:scale-95"
                                >
                                    {percent}%
                                </button>
                            ))}
                            <button
                                onClick={() => handleQuickSelect(100)}
                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm transition-colors active:scale-95"
                            >
                                Max
                            </button>
                        </div>
                    </div>

                    {/* 2. Plan Selection Cards */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-red-50/50 shrink-0 text-sm">2</div>
                            <h2 className="text-lg font-bold text-slate-900">Select Stake Period</h2>
                        </div>

                        {loadingPlans ? (
                            <div className="flex items-center justify-center py-12 sm:ml-12 pl-1 sm:pl-0">
                                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                <span className="ml-3 text-slate-500 font-medium">Loading plans...</span>
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2.5 shadow-sm sm:ml-12 pl-1 sm:pl-0">
                                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-amber-900 font-medium text-sm">No staking plans available at the moment.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:ml-11 pl-1 sm:pl-0">
                                {plans.map((plan) => {
                                    const isSelected = selectedPlanId === plan.id;
                                    const aprPercent = plan.apr / 100; // Convert basis points to percentage
                                    return (
                                        <button
                                            key={plan.id}
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-300 focus:outline-none ${isSelected
                                                ? 'border-red-500 bg-red-50/40 shadow-md ring-4 ring-red-50'
                                                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-end mb-2 w-full">
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>

                                            <div className="mb-3">
                                                <div className="text-2xl font-bold text-slate-900 mb-0.5">{plan.lockDuration}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days Lock</div>
                                            </div>

                                            <div className="mt-auto">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isSelected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    {aprPercent}% APR
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Earnings Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 sticky top-28 shadow-2xl border border-slate-800 relative overflow-hidden group">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-slate-800 rounded-xl ring-1 ring-slate-700">
                                    <Zap className="text-yellow-400 w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold">Earnings Preview</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Breakdown section */}
                                <div className="space-y-4 pb-6 border-b border-slate-800">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Staking Amount</span>
                                        <span className="font-bold">{calculations.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} NILA</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Lock Duration</span>
                                        <span className="font-bold">{calculations.duration} Days</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium text-emerald-400">Estimated Profit (+{calculations.apr}%)</span>
                                        <span className="font-bold text-emerald-400">+{calculations.profit.toLocaleString(undefined, { maximumFractionDigits: 4 })} NILA</span>
                                    </div>
                                </div>

                                {/* Final Return block */}
                                <div className="pt-2 pb-6">
                                    <div className="text-slate-400 text-sm font-medium mb-2">You will receive</div>
                                    <div className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-500 drop-shadow-sm mb-2">
                                        {calculations.total.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </div>
                                    <div className="text-yellow-500 text-sm font-bold flex items-center gap-1.5 opacity-90">
                                        <TrendingUp size={16} /> Total NILA at maturity
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={handleStake}
                                    disabled={isProcessing || calculations.amount <= 0 || !isConnected || selectedPlanId === null}
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
                                            ${(isProcessing || calculations.amount <= 0 || !isConnected || selectedPlanId === null)
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-[0.98]'
                                        }
                                        `}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : !isConnected ? (
                                        'Connect Wallet to Stake'
                                    ) : selectedPlanId === null ? (
                                        'Select a Staking Plan'
                                    ) : calculations.amount <= 0 ? (
                                        'Enter Amount to Stake'
                                    ) : (
                                        'Confirm Stake'
                                    )}
                                </button>

                                <div className="flex items-start gap-2.5 text-xs text-slate-400 mt-6 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
                                    <span>Your principal NILA tokens remain completely secure and are locked exactly for the duration you chose.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StakeNila;
