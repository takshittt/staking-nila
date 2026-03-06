import { useState, useMemo, useEffect } from 'react';
import { Info, ShieldCheck, Zap, Loader2, CheckCircle2, Circle, TrendingUp, ExternalLink, Wallet } from 'lucide-react';
import { useMultiChainWallet } from '../hooks/useMultiChainWallet';
import { useAccount } from 'wagmi'; // Import to get EVM address
import toast from 'react-hot-toast';
import { handleError } from '../utils/errorHandler';
import { stakingApi, type LockConfig, type AmountConfig } from '../services/stakingApi';
import { PriceService, type PriceData } from '../services/priceService';
import { transactionApi } from '../services/transactionApi';
import { MultiChainPaymentService } from '../services/multiChainPaymentService';
import { TransactionService, type TransactionProgress } from '../services/transactionService';
import { TronLinkService } from '../services/tronLinkService';

const MIN_USDT_PURCHASE = 1; // Minimum 10 USDT

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

    // Gateway flow states
    // @ts-ignore - Used by setters
    const [orderId, setOrderId] = useState<string | null>(null);
    // @ts-ignore - Used by setters
    const [paymentAddress, setPaymentAddress] = useState<string | null>(null);
    // @ts-ignore - Used by setters
    const [amountToPay, setAmountToPay] = useState<number | null>(null);
    // @ts-ignore - Used by setters
    const [userTxHash, setUserTxHash] = useState<string>('');
    const [paymentStep, setPaymentStep] = useState<'select' | 'payment' | 'verify' | 'success'>('select');

    // Real-time prices state
    const [prices, setPrices] = useState<PriceData | null>(null);
    const [loadingPrices, setLoadingPrices] = useState(true);
    const [priceError, setPriceError] = useState<string | null>(null);

    // Status states
    const [processing, setProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

    const {
        getWalletInfo,
        connectWallet,
        switchToChain,
        isCorrectChain,
        getChainName,
        tronInstalled,
        chainId,
        getProvider,
        evmAddress // Get EVM address from multi-chain wallet
    } = useMultiChainWallet();

    // Also get EVM address directly from wagmi for TRON payments
    const { address: wagmiEvmAddress } = useAccount();

    const walletInfo = getWalletInfo(selectedChain);
    const address = walletInfo.address;
    const isConnected = walletInfo.isConnected;

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    const selectedPackage = packages.find(p => p.id === selectedPackageId);

    // Fetch real-time prices
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                setLoadingPrices(true);
                setPriceError(null);
                const priceData = await PriceService.fetchPrices();
                setPrices(priceData);
            } catch (error) {
                setPriceError('Failed to load prices. Please refresh the page.');
                toast.error('Failed to load prices');
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
                // Sort plans by lockDuration (ascending order: 1 day, 7 days, 30 days, etc.)
                const sortedConfigs = lockConfigs.sort((a, b) => a.lockDuration - b.lockDuration);
                setPlans(sortedConfigs);
                // Auto-select first plan if available (now will be shortest duration)
                if (sortedConfigs.length > 0 && !selectedPlanId) {
                    setSelectedPlanId(sortedConfigs[0].id);
                }
            } catch (error) {
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
                // Sort packages by amount (ascending order: smallest to largest)
                const sortedConfigs = amountConfigs.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
                setPackages(sortedConfigs);
                // Auto-select first package if available (now will be smallest amount)
                if (sortedConfigs.length > 0 && !selectedPackageId) {
                    setSelectedPackageId(sortedConfigs[0].id);
                }
            } catch (error) {
                toast.error('Failed to load packages');
            } finally {
                setLoadingPackages(false);
            }
        };
        fetchPackages();
    }, []);

    // Reset flow when user changes selection
    useEffect(() => {
        if (paymentStep !== 'select') {
            setPaymentStep('select');
            setOrderId(null);
            setPaymentAddress(null);
            setAmountToPay(null);
            setUserTxHash('');
            setSuccessTxHash(null);
        }
    }, [selectedChain, selectedToken, selectedPackageId, selectedPlanId, customUsdtAmount]);

    // Auto-switch chain when user changes selection
    useEffect(() => {
        const handleChainSwitch = async () => {
            if (isConnected && selectedChain !== 'TRON' && !isCorrectChain(selectedChain)) {
                try {
                    await switchToChain(selectedChain);
                } catch (error) {
                    // Silent error handling
                }
            }
        };

        handleChainSwitch();
    }, [selectedChain, isConnected, isCorrectChain, switchToChain]);

    const handleBuyAndStake = async () => {
        if (!isConnected || !address) {
            try {
                await connectWallet(selectedChain);
            } catch (error) {
                return; // Error already handled in connectWallet
            }
            return;
        }

        // Check if on correct chain for EVM
        if (selectedChain !== 'TRON' && !isCorrectChain(selectedChain)) {
            toast.error(`Please switch to ${selectedChain} network`);
            try {
                await switchToChain(selectedChain);
            } catch (error) {
                return;
            }
            return;
        }

        const usdtSpent = calculations.usdtSpent;

        if (usdtSpent < MIN_USDT_PURCHASE) {
            toast.error(`Minimum purchase is ${MIN_USDT_PURCHASE} USDT`);
            return;
        }

        if (!selectedPlan) {
            toast.error('Please select a staking plan');
            return;
        }

        try {
            setProcessing(true);
            setPaymentStep('payment');
            setStatusMessage('Creating order...');

            // Step 1: Create order on backend
            const network = MultiChainPaymentService.getNetworkCode(selectedChain, selectedToken);
            
            // For TRON payments, we need to send both TRON address and EVM address
            // The EVM address will be used for staking on BSC
            let orderWallet = address;
            let trcWallet = undefined;
            
            if (selectedChain === 'TRON') {
                // Check if user has connected EVM wallet
                const userEvmAddress = evmAddress || wagmiEvmAddress;
                
                if (!userEvmAddress) {
                    toast.error('Please connect your EVM wallet (MetaMask/WalletConnect) first before paying with TRON');
                    setProcessing(false);
                    return;
                }
                
                // For TRON: wallet = EVM address (for staking), trcWallet = TRON address (for payment)
                orderWallet = userEvmAddress;
                trcWallet = address; // TRON address
            }
            
            const order = await MultiChainPaymentService.createOrder({
                wallet: orderWallet,
                pyrandAmount: calculations.nilaStaked,
                network,
                trcWallet,
                lockDays: selectedPlan?.lockDuration,
                apr: selectedPlan?.apr
            });

            setOrderId(order.orderId);
            setPaymentAddress(order.recipient);
            setAmountToPay(order.stableAmount || order.cryptoAmount || 0);

            // Step 2: Send payment automatically
            setStatusMessage('Preparing transaction...');

            const provider = selectedChain !== 'TRON' ? await getProvider() : undefined;

            const paymentResult = await TransactionService.sendPayment({
                chain: selectedChain,
                token: selectedToken,
                recipientAddress: order.recipient,
                amount: order.stableAmount || order.cryptoAmount || 0,
                provider: provider || undefined,
                onProgress: (progress: TransactionProgress) => {
                    setStatusMessage(progress.message);
                    if (progress.txHash) {
                        setUserTxHash(progress.txHash);
                    }
                }
            });

            setUserTxHash(paymentResult.txHash);

            // Step 3: Verify transaction automatically
            setPaymentStep('verify');
            setStatusMessage('Verifying your payment on-chain...');

            const result = await MultiChainPaymentService.verifyTransaction({
                orderId: order.orderId,
                txHash: paymentResult.txHash,
                network
            });

            setStatusMessage('Recording stake in database...');

            // Step 4: Record in our backend database
            try {
                await stakingApi.recordStake({
                    walletAddress: address!,
                    planName: `${selectedPlan?.lockDuration} Days`,
                    planVersion: 1,
                    amount: result.pyrandSent,
                    apy: selectedPlan?.apr || 0,
                    lockDays: selectedPlan?.lockDuration || 0,
                    instantRewardPercent: calculations.cashbackPercent,
                    txHash: result.tokenTx,
                    onChainStakeId: undefined
                });

                // Record transaction
                await transactionApi.createTransaction({
                    txHash: result.tokenTx,
                    walletAddress: address!,
                    type: 'STAKE',
                    amount: result.pyrandSent,
                    status: 'confirmed'
                });
            } catch (backendError: any) {
                // Silent error handling
            }

            setSuccessTxHash(result.tokenTx);
            setPaymentStep('success');
            setStatusMessage('');
            
            toast.success(
                `Successfully purchased ${result.pyrandSent.toLocaleString()} NILA!`
            );

        } catch (error: any) {
            // User rejected transaction
            if (error.message?.includes('user rejected') || 
                error.message?.includes('User denied') ||
                error.message?.includes('rejected by user')) {
                toast.error('Transaction cancelled');
                setPaymentStep('select');
            } else {
                handleError(error, 'Failed to complete purchase. Please try again.');
                setPaymentStep('select');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleReset = () => {
        setPaymentStep('select');
        setOrderId(null);
        setPaymentAddress(null);
        setAmountToPay(null);
        setUserTxHash('');
        setSuccessTxHash(null);
        setCustomUsdtAmount('');
        setIsCustom(false);
        setProcessing(false);
        setStatusMessage('');
    };

    // Calculate Earnings Preview
    const calculations = useMemo(() => {
        if (!prices) {
            return {
                usdtSpent: 0,
                cryptoSpent: 0,
                nilaStaked: 0,
                cashbackNILA: 0,
                cashbackPercent: 0,
                apyRewardsNILA: 0,
                totalNILAAtMaturity: 0,
                duration: 0,
                apr: 0
            };
        }

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
            // Amount config is now in USDT (stored as wei, so divide by 1e18)
            usdtEquivalentSpent = parseFloat(selectedPackage.amount) / 1e18;

            // Convert to respective crypto if needed
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
        const cashbackNILA = nilaStaked * (cashbackPercent / 100);

        if (!selectedPlan) {
            return {
                usdtSpent: usdtEquivalentSpent,
                cryptoSpent,
                nilaStaked,
                cashbackNILA,
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
            cashbackNILA,
            cashbackPercent,
            apyRewardsNILA,
            totalNILAAtMaturity,
            duration: selectedPlan.lockDuration,
            apr: aprPercent
        };
    }, [selectedPackage, selectedPlan, isCustom, customUsdtAmount, selectedChain, selectedToken, prices]);

    const isProcessing = processing;

    return (
        <div className="pb-12 space-y-8 max-w-7xl mx-auto">
            {/* Header Area Removed */}

            {/* Price Loading/Error State */}
            {loadingPrices && (
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-900 font-medium">Loading real-time prices...</span>
                </div>
            )}

            {priceError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full">
                            <Info className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-red-900 font-bold">Price Data Unavailable</p>
                            <p className="text-red-700 text-sm font-medium">{priceError}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold shadow-sm shadow-red-500/20 active:scale-95"
                    >
                        Refresh Page
                    </button>
                </div>
            )}

            {/* Show error overlay when prices are not available */}
            {!loadingPrices && !prices && !priceError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Info className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-amber-900 font-bold">Prices Not Available</p>
                            <p className="text-amber-700 text-sm font-medium">Unable to load price data. Please refresh the page or try again later.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold shadow-sm shadow-amber-500/20 active:scale-95"
                    >
                        Refresh Page
                    </button>
                </div>
            )}

            {/* Wallet Connection Warning */}
            {!isConnected && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Wallet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-blue-900 font-bold">
                                {selectedChain === 'TRON' ? 'TronLink Not Connected' : 'Wallet Not Connected'}
                            </p>
                            <p className="text-blue-700 text-sm font-medium">
                                {selectedChain === 'TRON' 
                                    ? 'Please connect your TronLink wallet to continue.'
                                    : 'Please connect your wallet to continue.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => connectWallet(selectedChain)}
                        className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-bold shadow-sm shadow-blue-500/20 active:scale-95"
                    >
                        {selectedChain === 'TRON' ? 'Connect TronLink' : 'Connect Wallet'}
                    </button>
                </div>
            )}

            {/* TronLink Not Installed Warning */}
            {selectedChain === 'TRON' && !tronInstalled && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Info className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-amber-900 font-bold">TronLink Not Installed</p>
                            <p className="text-amber-700 text-sm font-medium">Please install TronLink extension to use TRON network.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.open(TronLinkService.getDownloadUrl(), '_blank')}
                        className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold shadow-sm shadow-amber-500/20 active:scale-95"
                    >
                        Install TronLink
                    </button>
                </div>
            )}

            {/* Wrong Network Warning */}
            {isConnected && selectedChain !== 'TRON' && !isCorrectChain(selectedChain) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Info className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-amber-900 font-bold">Wrong Network</p>
                            <p className="text-amber-700 text-sm font-medium">
                                You're on {getChainName(chainId)}. Please switch to {selectedChain}.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => switchToChain(selectedChain)}
                        className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold shadow-sm shadow-amber-500/20 active:scale-95"
                    >
                        Switch to {selectedChain}
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
            {!loadingPrices && !prices ? (
                <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <Info className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Price Data Required</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        Real-time price data is required to calculate staking amounts and rewards. 
                        Please refresh the page or try again later when price data is available.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            ) : (
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
                                        {!prices ? (
                                            <span className="text-red-500">N/A</span>
                                        ) : selectedToken === 'NATIVE'
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
                                    // Amount config is now in USDT (stored as wei, so divide by 1e18)
                                    const usdtAmount = parseFloat(pkg.amount) / 1e18;
                                    const nilaAmount = prices ? usdtAmount / prices.NILA : 0;
                                    const cashbackPercent = pkg.instantRewardBps / 100;
                                    return (
                                        <button
                                            key={pkg.id}
                                            onClick={() => {
                                                setIsCustom(false);
                                                setSelectedPackageId(pkg.id);
                                            }}
                                            disabled={!prices}
                                            className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-300 focus:outline-none ${!prices
                                                    ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                                    : isSelected
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
                                                    {!prices ? (
                                                        <span className="text-slate-400">--</span>
                                                    ) : selectedToken === 'NATIVE'
                                                        ? (usdtAmount / prices[selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX']).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                        : usdtAmount.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken}
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-500 mb-3">
                                                → {prices ? nilaAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'} NILA
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
                                    disabled={!prices}
                                    className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-300 focus:outline-none ${!prices
                                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                            : isCustom
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
                                    ≈ {prices ? (
                                        selectedToken === 'NATIVE'
                                            ? (parseFloat(customUsdtAmount || '0') * prices[selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX'] / prices.NILA)
                                            : (parseFloat(customUsdtAmount || '0') / prices.NILA)
                                    ).toLocaleString() : '--'} NILA
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
                                    {calculations.cashbackNILA > 0 && (
                                        <div className="flex justify-between items-center text-sm bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                                            <span className="text-yellow-500 font-medium flex items-center gap-1"><Zap size={14} /> Instant Cashback ({calculations.cashbackPercent}%)</span>
                                            <span className="font-bold text-yellow-500">+{calculations.cashbackNILA.toLocaleString(undefined, { maximumFractionDigits: 2 })} NILA</span>
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
                                    disabled={isProcessing || calculations.cryptoSpent === 0 || !prices}
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
                                            ${(isProcessing || calculations.cryptoSpent === 0 || !prices)
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
                                    ) : !prices ? (
                                        'Prices Unavailable'
                                    ) : !isConnected ? (
                                        selectedChain === 'TRON' ? 'Connect TronLink' : 'Connect Wallet'
                                    ) : calculations.cryptoSpent === 0 ? (
                                        `Select Amount`
                                    ) : (
                                        `Buy & Stake NILA`
                                    )}
                                </button>

                                <div className="flex items-start gap-2.5 text-xs text-slate-400 mt-6 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
                                    <span>You pay in {selectedToken === 'NATIVE' ? (selectedChain === 'BSC' ? 'BNB' : selectedChain === 'ETH' ? 'ETH' : 'TRX') : selectedToken} on {selectedChain === 'BSC' ? 'BNB Chain' : selectedChain === 'ETH' ? 'Ethereum' : 'Tron'}. After payment verification, NILA will be staked automatically. Instant cashback is in NILA. At maturity, you receive your principal + APY rewards in NILA tokens.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Verification Progress Modal */}
            {(paymentStep === 'payment' || paymentStep === 'verify') && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-blue-50 p-4 rounded-full mb-4">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {paymentStep === 'payment' ? 'Processing Payment' : 'Verifying Payment'}
                            </h2>
                            <p className="text-slate-500 mb-4">{statusMessage}</p>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full animate-pulse" style={{ width: paymentStep === 'payment' ? '40%' : '80%' }}></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-4">
                                {paymentStep === 'payment' 
                                    ? 'Please confirm the transaction in your wallet...' 
                                    : 'This may take 1-2 minutes...'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {paymentStep === 'success' && successTxHash && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-green-50 p-4 rounded-full mb-4">
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Stake Successful!</h2>
                            <p className="text-slate-500 mb-6">
                                Your {calculations.nilaStaked.toLocaleString()} NILA has been staked successfully.
                            </p>

                            <div className="w-full bg-slate-50 rounded-xl p-4 mb-6 text-left">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-500">Staking Transaction</span>
                                    <a
                                        href={`https://bscscan.com/tx/${successTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                                    >
                                        View <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <code className="text-xs font-mono text-slate-700 break-all block">
                                    {successTxHash}
                                </code>
                            </div>

                            <button
                                onClick={handleReset}
                                className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyStakeNila;
