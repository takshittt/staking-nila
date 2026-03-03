import { useState, useMemo, useEffect } from 'react';
import { Info, ShieldCheck, Zap, Loader2, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { ContractService } from '../services/contractService';
import { useWallet } from '../hooks/useWallet';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { handleError } from '../utils/errorHandler';
import { stakingApi, type LockConfig, type AmountConfig } from '../services/stakingApi';
import { PriceService, type PriceData } from '../services/priceService';
import { formatUnits } from 'ethers';

const MIN_USDT_PURCHASE = 10; // Minimum 10 USDT

const BuyStakeNila = () => {
    const [plans, setPlans] = useState<LockConfig[]>([]);
    const [packages, setPackages] = useState<AmountConfig[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
    const [customUsdtAmount, setCustomUsdtAmount] = useState<string>('');
    const [isCustom, setIsCustom] = useState<boolean>(false);
    const [selectedChain, setSelectedChain] = useState<'BSC' | 'ETH' | 'TRON'>('BSC');
    const [selectedToken, setSelectedToken] = useState<'USDT' | 'USDC' | 'NATIVE'>('USDT');
    const [basePriceUnit, setBasePriceUnit] = useState<'USDT' | 'NILA'>('USDT');
    const [usdtBalance, setUsdtBalance] = useState<string>('0');
    const [loadingUsdtBalance, setLoadingUsdtBalance] = useState(false);
    
    // Real-time prices state
    const [prices, setPrices] = useState<PriceData>({
        BNB: 600,
        ETH: 3000,
        TRX: 0.12,
        NILA: 0.08,
        timestamp: Date.now()
    });
    const [loadingPrices, setLoadingPrices] = useState(true);

    // Status states
    const [staking, setStaking] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);

    const { address, isConnected, chain } = useAccount();
    const { connect } = useWallet();

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    const selectedPackage = packages.find(p => p.id === selectedPackageId);

    // Fetch real-time prices
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                setLoadingPrices(true);
                const priceData = await PriceService.fetchPrices();
                setPrices(priceData);
            } catch (error) {
                console.error('Failed to fetch prices:', error);
                toast.error('Failed to load real-time prices, using fallback');
            } finally {
                setLoadingPrices(false);
            }
        };

        fetchPrices();

        // Refresh prices every 60 seconds
        const interval = setInterval(fetchPrices, 60000);

        return () => clearInterval(interval);
    }, []);

    // Fetch staking plans and packages from backend
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

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                setLoadingPackages(true);
                const amountConfigs = await stakingApi.getActiveAmountConfigs();
                setPackages(amountConfigs);
                // Auto-select first package if available
                if (amountConfigs.length > 0 && !selectedPackageId) {
                    setSelectedPackageId(amountConfigs[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch packages:', error);
                toast.error('Failed to load packages');
            } finally {
                setLoadingPackages(false);
            }
        };
        fetchPackages();
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

    // Fetch USDT Balance
    useEffect(() => {
        const fetchUsdtBalance = async () => {
            if (isConnected && address) {
                try {
                    const balanceWei = await ContractService.getUSDTBalance(address);
                    const balanceFormatted = formatUnits(balanceWei, 18);
                    setUsdtBalance(balanceFormatted);
                } catch (error) {
                    console.error('Failed to fetch USDT balance:', error);
                    setUsdtBalance('0');
                } finally {
                    setLoadingUsdtBalance(false);
                }
            } else {
                setLoadingUsdtBalance(false);
                setUsdtBalance('0');
            }
        };
        fetchUsdtBalance();
    }, [isConnected, address]);

    const handleBuyAndStake = async () => {
        if (!isConnected || !address) {
            connect();
            return;
        }

        const usdtSpent = calculations.usdtSpent;

        if (usdtSpent < MIN_USDT_PURCHASE) {
            toast.error(`Minimum purchase is ${MIN_USDT_PURCHASE} USDT`);
            return;
        }

        if (usdtSpent > parseFloat(usdtBalance)) {
            toast.error('Insufficient USDT balance');
            return;
        }

        if (!selectedPlan) {
            toast.error('Please select a staking plan');
            return;
        }

        try {
            setStaking(true);
            setStatusMessage('Checking network...');
            await ContractService.ensureCorrectNetwork();

            setStatusMessage('Checking USDT allowance...');
            const hasAllowance = await ContractService.checkUSDTAllowance(address, usdtSpent.toString());

            if (!hasAllowance) {
                setStatusMessage('Approving USDT...');
                await ContractService.approveUSDT(usdtSpent.toString());
                toast.success('USDT approval successful!');
            }

            setStatusMessage('Processing purchase...');
            const txHash = await ContractService.buyAndStakeWithUSDT({
                usdtAmount: usdtSpent.toString(),
                lockConfigId: selectedPlanId!
            });

            setStatusMessage('Purchase successful!');
            toast.success(
                `Successfully purchased ${calculations.nilaStaked.toLocaleString()} NILA with ${usdtSpent} USDT!`
            );

            // Refresh balance
            const newBalance = await ContractService.getUSDTBalance(address);
            setUsdtBalance(formatUnits(newBalance, 18));

            // Reset form
            setCustomUsdtAmount('');
            setIsCustom(false);

        } catch (error: any) {
            handleError(error, 'Failed to complete purchase. Please try again.');
        } finally {
            setStaking(false);
            setStatusMessage('');
        }
    };

    // Calculate Earnings Preview
    const calculations = useMemo(() => {
        const NILA_PRICE_USDT = prices.NILA;
        const NATIVE_PRICES = {
            BSC: prices.BNB,
            ETH: prices.ETH,
            TRON: prices.TRX
        };

        // Calculate base USDT spent which is used for NILA calculations
        let usdtEquivalentSpent = 0;
        let cryptoSpent = 0;
        let cashbackPercent = 0;

        if (isCustom) {
            cryptoSpent = parseFloat(customUsdtAmount) || 0;
            cashbackPercent = 0; // No cashback for custom amounts
        } else if (selectedPackage) {
            const nilaAmount = parseFloat(selectedPackage.amount) / 1e18;
            usdtEquivalentSpent = nilaAmount * NILA_PRICE_USDT;

            // Convert to respective crypto if needed based on package which is in USDT originally
            if (selectedToken === 'NATIVE') {
                const nativePrice = NATIVE_PRICES[selectedChain];
                cryptoSpent = usdtEquivalentSpent / nativePrice;
            } else {
                cryptoSpent = usdtEquivalentSpent; // USDT or USDC
            }

            cashbackPercent = selectedPackage.instantRewardBps / 100;
        }

        if (isCustom) {
            if (selectedToken === 'NATIVE') {
                const nativePrice = NATIVE_PRICES[selectedChain];
                usdtEquivalentSpent = cryptoSpent * nativePrice;
            } else {
                usdtEquivalentSpent = cryptoSpent; // USDT or USDC
            }
        }

        const nilaStaked = usdtEquivalentSpent / NILA_PRICE_USDT;
        const cashbackUSDT = usdtEquivalentSpent * (cashbackPercent / 100);

        if (!selectedPlan) {
            return {
                usdtSpent: usdtEquivalentSpent,
                cryptoSpent,
                nilaStaked,
                cashbackUSDT,
                cashbackPercent,
                apyRewardsNILA: 0,
                totalNILAAtMaturity: nilaStaked,
                duration: 0,
                apr: 0
            };
        }

        // Convert APR from basis points to percentage (e.g., 500 bps = 5%)
        const aprPercent = selectedPlan.apr / 100;

        // Simple interest formula for APY rewards in NILA
        const apyRewardsNILA = nilaStaked * (aprPercent / 100) * (selectedPlan.lockDuration / 365);
        const totalNILAAtMaturity = nilaStaked + apyRewardsNILA;

        return {
            usdtSpent: usdtEquivalentSpent,
            cryptoSpent,
            nilaStaked,
            cashbackUSDT,
            cashbackPercent,
            apyRewardsNILA,
            totalNILAAtMaturity,
            duration: selectedPlan.lockDuration,
            apr: aprPercent
        };
    }, [selectedPackage, selectedPlan, isCustom, customUsdtAmount, selectedChain, selectedToken, prices]);

    const isProcessing = staking;

    return (
        <div className="pb-12 space-y-8 max-w-7xl mx-auto">
            {/* Header Area Removed */}

            {/* Network Warning */}
            {isConnected && !isCorrectNetwork && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Info className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-amber-900 font-bold">Wrong Network Connected</p>
                            <p className="text-amber-700 text-sm font-medium">Please switch to BSC Testnet to interact with the contract.</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">

                {/* Left Column: Input & Plan Selection */}
                <div className="lg:col-span-2 space-y-5">

                    {/* 1. Payment Selection Card */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 relative overflow-hidden transition-colors hover:border-red-100 group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-red-50/50 shrink-0 text-sm">1</div>
                            <h2 className="text-lg font-bold text-slate-900">Payment Option</h2>
                        </div>

                        <div className="sm:ml-11 pl-1 sm:pl-0 relative z-10 space-y-5">
                            {/* Payment Method Toggle */}
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Select Chain</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'BSC', name: 'BSC', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png', short: 'BNB Chain' },
                                            { id: 'ETH', name: 'Ethereum', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png', short: 'Ethereum' },
                                            { id: 'TRON', name: 'Tron', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png', short: 'Tron' }
                                        ].map(chain => (
                                            <button
                                                key={chain.id}
                                                onClick={() => {
                                                    setSelectedChain(chain.id as any);
                                                    if (chain.id === 'TRON' && selectedToken === 'USDC') {
                                                        setSelectedToken('USDT'); // TRON only supports TRX and USDT in backend
                                                    }
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all text-sm border-2 ${selectedChain === chain.id ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-50' : 'bg-amber-50/50 border-amber-100/50 text-slate-600 hover:border-amber-200'}`}
                                            >
                                                <div className="w-6 h-6 rounded-full bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-slate-100">
                                                    <img src={chain.icon} alt={chain.name} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="truncate">{chain.short}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Select Token</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'USDT', name: 'USDT', symbol: '₮' },
                                            ...(selectedChain !== 'TRON' ? [{ id: 'USDC', name: 'USDC', symbol: '$' }] : []),
                                            { id: 'NATIVE', name: selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX', symbol: selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX' }
                                        ].map(token => (
                                            <button
                                                key={token.id}
                                                onClick={() => setSelectedToken(token.id as any)}
                                                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold transition-all text-sm border-2 ${selectedToken === token.id ? 'bg-slate-800 border-slate-900 text-white shadow-sm ring-2 ring-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                                            >
                                                {token.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Base Price Display */}
                            <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-500">Base Price {loadingPrices && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}</span>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm font-bold text-slate-800">
                                        {selectedToken === 'NATIVE'
                                            ? (basePriceUnit === 'USDT'
                                                ? `1 ${selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX'} = ${prices[selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX'].toLocaleString()} USDT`
                                                : `1 ${selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX'} = ${(prices[selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX'] / prices.NILA).toLocaleString()} NILA`)
                                            : (basePriceUnit === 'USDT'
                                                ? `1 NILA = ${prices.NILA} ${selectedToken}`
                                                : `1 ${selectedToken} = ${(1 / prices.NILA).toFixed(2)} NILA`)
                                        }
                                    </div>
                                    <div className="flex bg-slate-200/70 p-0.5 rounded-lg">
                                        <button
                                            onClick={() => setBasePriceUnit('NILA')}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${basePriceUnit === 'NILA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            NILA
                                        </button>
                                        <button
                                            onClick={() => setBasePriceUnit('USDT')}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${basePriceUnit === 'USDT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            USDT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Package Amount Card */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 relative overflow-hidden transition-colors hover:border-red-100 group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        <div className="relative z-10 flex items-center gap-3 mb-4">
                            <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-red-50/50 shrink-0 text-sm">2</div>
                            <h2 className="text-lg font-bold text-slate-900">Select {selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken} Package</h2>
                        </div>

                        {loadingPackages ? (
                            <div className="flex items-center justify-center py-12 sm:ml-11 pl-1 sm:pl-0">
                                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                <span className="ml-3 text-slate-500 font-medium">Loading packages...</span>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2.5 shadow-sm sm:ml-11 pl-1 sm:pl-0">
                                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-amber-900 font-medium text-xs">No packages available at the moment.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:ml-11 pl-1 sm:pl-0 relative z-10">
                                {packages.map((pkg) => {
                                    const isSelected = !isCustom && selectedPackageId === pkg.id;
                                    const nilaAmount = parseFloat(pkg.amount) / 1e18;
                                    const usdtAmount = nilaAmount * prices.NILA;
                                    const cashbackPercent = pkg.instantRewardBps / 100;
                                    return (
                                        <button
                                            key={pkg.id}
                                            onClick={() => {
                                                setIsCustom(false);
                                                setSelectedPackageId(pkg.id);
                                            }}
                                            className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-300 focus:outline-none ${isSelected
                                                ? 'border-red-500 bg-red-50/40 shadow-md ring-4 ring-red-50'
                                                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2 w-full">
                                                <span className={`text-xs font-bold ${isSelected ? 'text-red-600' : 'text-slate-500'}`}>
                                                    Package
                                                </span>
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>

                                            <div className="mb-2">
                                                <div className="text-xl font-bold text-slate-900 mb-0.5">
                                                    {selectedToken === 'NATIVE'
                                                        ? (usdtAmount / prices[selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX']).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                        : usdtAmount.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken}
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-500 mb-3">
                                                → {nilaAmount.toLocaleString()} NILA
                                            </div>

                                            <div className="mt-auto">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isSelected ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    <Zap className="w-3.5 h-3.5" />
                                                    +{cashbackPercent}% CB
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setIsCustom(true)}
                                    className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-300 focus:outline-none ${isCustom
                                        ? 'border-red-500 bg-red-50/40 shadow-md ring-4 ring-red-50'
                                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2 w-full">
                                        <span className={`text-xs font-bold ${isCustom ? 'text-red-600' : 'text-slate-500'}`}>
                                            Custom
                                        </span>
                                        {isCustom ? (
                                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center w-full">
                                        <span className="text-sm font-bold text-slate-900 mb-1">Enter Amount</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken}</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Custom Amount Input Field */}
                        {isCustom && (
                            <div className="sm:ml-11 pl-1 sm:pl-0 relative z-10 mt-4 animate-in fade-in slide-in-from-top-2">
                                <div className="relative flex items-center bg-slate-50/50 border-2 border-slate-200 rounded-xl focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-50 transition-all shadow-sm">
                                    <input
                                        type="number"
                                        value={customUsdtAmount}
                                        onChange={(e) => setCustomUsdtAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-transparent px-4 py-3 text-2xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none focus:ring-0"
                                        min={MIN_USDT_PURCHASE}
                                        step="any"
                                    />
                                    <div className="pr-4 flex items-center gap-2 select-none">
                                        <span className="text-sm font-bold text-slate-400">{selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 mt-2 ml-1">
                                    ≈ {(
                                        selectedToken === 'NATIVE'
                                            ? (parseFloat(customUsdtAmount || '0') * prices[selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX'] / prices.NILA)
                                            : (parseFloat(customUsdtAmount || '0') / prices.NILA)
                                    ).toLocaleString()} NILA
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Plan Selection Cards */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 hover:border-red-100 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-red-50/50 shrink-0 text-sm">3</div>
                            <h2 className="text-lg font-bold text-slate-900">Select Stake Period</h2>
                        </div>

                        {loadingPlans ? (
                            <div className="flex items-center justify-center py-12 sm:ml-11 pl-1 sm:pl-0">
                                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                <span className="ml-3 text-slate-500 font-medium">Loading plans...</span>
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2.5 shadow-sm sm:ml-11 pl-1 sm:pl-0">
                                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-amber-900 font-medium text-xs">No staking plans available at the moment.</span>
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
                                <h3 className="text-xl font-bold">Purchase Summary</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Breakdown section */}
                                <div className="space-y-4 pb-6 border-b border-slate-800">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">{selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken} Payment</span>
                                        <span className="font-bold">{calculations.cryptoSpent.toLocaleString(undefined, { maximumFractionDigits: selectedToken === 'NATIVE' ? 4 : 2 })} {selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">NILA Staked (recorded)</span>
                                        <span className="font-bold">{calculations.nilaStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })} NILA</span>
                                    </div>
                                    {calculations.cashbackUSDT > 0 && (
                                        <div className="flex justify-between items-center text-sm bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                                            <span className="text-yellow-500 font-medium flex items-center gap-1"><Zap size={14} /> Instant Cashback ({calculations.cashbackPercent}%)</span>
                                            <span className="font-bold text-yellow-500">+{calculations.cashbackUSDT.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Lock Duration</span>
                                        <span className="font-bold">{calculations.duration} Days</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium text-emerald-400">APY Rewards (+{calculations.apr}%)</span>
                                        <span className="font-bold text-emerald-400">+{calculations.apyRewardsNILA.toLocaleString(undefined, { maximumFractionDigits: 2 })} NILA</span>
                                    </div>
                                </div>

                                {/* Final Return block */}
                                <div className="pt-2 pb-6">
                                    <div className="text-slate-400 text-sm font-medium mb-2">Total NILA at maturity</div>
                                    <div className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-500 drop-shadow-sm mb-2">
                                        {calculations.totalNILAAtMaturity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-yellow-500 text-sm font-bold flex items-center gap-1.5 opacity-90">
                                        <TrendingUp size={16} /> Principal + APY in NILA
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={handleBuyAndStake}
                                    disabled={isProcessing || calculations.cryptoSpent === 0}
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
                                            ${(isProcessing || calculations.cryptoSpent === 0)
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
                                    ) : !isConnected && selectedChain !== 'TRON' ? (
                                        'Connect Wallet to Buy'
                                    ) : calculations.cryptoSpent === 0 ? (
                                        `Select Amount`
                                    ) : (
                                        `Buy & Stake with ${selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken}`
                                    )}
                                </button>

                                <div className="flex items-start gap-2.5 text-xs text-slate-400 mt-6 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
                                    <span>You pay in {selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken} on {selectedChain === 'BSC' ? 'BNB Chain' : selectedChain === 'ETH' ? 'Ethereum' : 'Tron'} and receive NILA recorded in the contract. Instant cashback is in USDT. At maturity, you receive your principal + APY rewards in NILA tokens.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyStakeNila;
