import { useState, useMemo, useEffect } from 'react';
import { Info, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { stakingApi, type AmountConfig, type LockConfig } from '../services/stakingApi';
import { transactionApi } from '../services/transactionApi';
import { userApi } from '../services/userApi';
import { ContractService } from '../services/contractService';
import { useWallet } from '../hooks/useWallet';
import { useAccount } from 'wagmi';

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
        if (!isConnected || !address) {
            connect();
            return;
        }

        if (!selectedPackage || !selectedDuration) {
            alert('Please select a package and duration');
            return;
        }

        const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
        const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

        if (!amountConfig || !lockConfig) {
            alert('Invalid configuration selected');
            return;
        }

        const amountInNila = Number(BigInt(amountConfig.amount) / BigInt(10 ** 18));

        try {
            setStaking(true);

            // Check and switch to BSC Testnet if needed
            setStatusMessage('Checking network...');
            await ContractService.ensureCorrectNetwork();

            setStatusMessage('Checking token allowance...');

            // Check if approval is needed
            const hasAllowance = await ContractService.checkAllowance(address, amountInNila.toString());

            if (!hasAllowance) {
                setApproving(true);
                setStatusMessage('Please approve NILA tokens in your wallet...');

                await ContractService.approveToken(amountInNila.toString());

                setApproving(false);
                setStatusMessage('Approval confirmed! Proceeding to stake...');
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
                amount: amountInNila,
                apy: lockConfig.apr / 100,
                lockDays: lockConfig.lockDuration,
                txHash
            });

            // Record transaction for transaction history
            await transactionApi.createTransaction({
                txHash,
                walletAddress: address,
                type: 'STAKE',
                amount: amountInNila,
                status: 'confirmed'
            });

            setStatusMessage('');
            alert(`Successfully staked ${amountInNila.toLocaleString()
                } NILA!\n\nTransaction: ${txHash}`);

            // Reset selections
            setSelectedPackage(null);
            setSelectedDuration(null);

        } catch (error: any) {
            console.error('Staking error:', error);
            setStatusMessage('');
            alert(error.message || 'Failed to stake tokens. Please try again.');
        } finally {
            setStaking(false);
            setApproving(false);
        }
    };

    // Auto-calculate rewards
    const calculations = useMemo(() => {
        if (!selectedPackage || !selectedDuration) {
            return {
                instantCashbackAmount: 0,
                apyRewards: 0,
                totalRewards: 0,
                instantRewardPercent: 0,
                aprPercent: 0
            };
        }

        const amountConfig = amountConfigs.find(c => c.amount === selectedPackage);
        const lockConfig = lockConfigs.find(c => c.lockDuration === selectedDuration);

        if (!amountConfig || !lockConfig) {
            return {
                instantCashbackAmount: 0,
                apyRewards: 0,
                totalRewards: 0,
                instantRewardPercent: 0,
                aprPercent: 0
            };
        }

        // Convert wei to NILA (divide by 10^18)
        const amountInNila = Number(BigInt(amountConfig.amount) / BigInt(10 ** 18));

        // Convert basis points to percentage (divide by 100)
        const instantRewardPercent = amountConfig.instantRewardBps / 100;
        const aprPercent = lockConfig.apr / 100;

        // Calculate instant cashback
        const instantCashbackAmount = Math.floor((amountInNila * instantRewardPercent) / 100);

        // Calculate APY rewards using simple interest
        // Formula: Principal * Rate * Time (in years)
        const apyRewards = Math.floor(amountInNila * (aprPercent / 100) * (lockConfig.lockDuration / 365));

        const totalRewards = instantCashbackAmount + apyRewards;

        return {
            amountInNila,
            instantCashbackAmount,
            apyRewards,
            totalRewards,
            instantRewardPercent,
            aprPercent,
            lockDuration: lockConfig.lockDuration
        };
    }, [selectedPackage, selectedDuration, amountConfigs, lockConfigs]);

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
                                    alert(error.message);
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
                </div>

                {/* Step 1: Select Staking Package */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center">1</div>
                        <h2 className="text-xl font-bold text-slate-900">Choose Your Package</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {amountConfigs.map((config) => {
                            const amountInNila = Number(BigInt(config.amount) / BigInt(10 ** 18));
                            const instantRewardPercent = config.instantRewardBps / 100;
                            const isSelected = selectedPackage === config.amount;

                            return (
                                <button
                                    key={config.id}
                                    onClick={() => setSelectedPackage(config.amount)}
                                    className={`relative p - 5 rounded - xl border - 2 text - left transition - all duration - 200 group ${isSelected
                                            ? 'border-red-600 bg-red-50/30'
                                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="mb-2">
                                        <span className="text-2xl font-bold text-slate-900">{amountInNila.toLocaleString()}</span>
                                        <span className="text-sm font-medium text-slate-500 ml-1">NILA</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                            {instantRewardPercent}% Cashback
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                        <Info size={16} className="text-slate-400" />
                        Higher packages unlock additional instant cashback credited immediately after staking.
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
                                    className={`p - 4 rounded - xl border - 2 text - center transition - all duration - 200 ${isSelected
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
                                {calculations.amountInNila?.toLocaleString() || 0} NILA
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
                                <span className="text-green-400 font-bold">{calculations.instantCashbackAmount.toLocaleString()} NILA</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">APR ({calculations.aprPercent}%)</span>
                                <span className="text-green-400 font-bold">{calculations.apyRewards.toLocaleString()} NILA</span>
                            </div>
                        </div>

                        {/* Total Estimations */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">Estimated Total Rewards</div>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                                {calculations.totalRewards.toLocaleString()} NILA
                            </div>
                        </div>

                        {/* Helper Text */}
                        <div className="text-xs text-slate-400 space-y-1">
                            <p>• Instant cashback is credited immediately.</p>
                            <p>• APR rewards accumulate and are claimable at maturity.</p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleStake}
                            disabled={isProcessing || !selectedPackage || !selectedDuration}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-600/20 active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {approving ? 'Approving...' : 'Staking...'}
                                </>
                            ) : !isConnected ? (
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
        </div>
    );
};

export default StakeNila;
