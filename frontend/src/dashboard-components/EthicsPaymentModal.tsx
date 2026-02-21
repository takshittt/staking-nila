import { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, CreditCard, Wallet, User, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';

interface EthicsPaymentModalProps {
    show: boolean;
    amount: number;
    usdPrice: number;
    referralBonus: number;
    paymentMethod: 'crypto' | 'card';
    amountConfigId?: number;
    lockConfigId?: number;
    walletAddress?: string;
    userData?: {
        name: string;
        email: string;
    };
    onSuccess: (invoiceId: string, intentId: string) => void;
    onCancel: () => void;
    onError: (error: string) => void;
}

const EthicsPaymentModal = ({
    show,
    amount,
    usdPrice,
    referralBonus,
    paymentMethod,
    amountConfigId,
    lockConfigId,
    walletAddress,
    userData,
    onSuccess,
    onCancel,
    onError
}: EthicsPaymentModalProps) => {
    const [iframeUrl, setIframeUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
    const [paymentStep, setPaymentStep] = useState<'init' | 'confirmation' | 'loading' | 'processing' | 'success'>('init');
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    const [showCancelWarning, setShowCancelWarning] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Form state for card payments
    const [formData, setFormData] = useState({
        name: userData?.name || '',
        email: userData?.email || ''
    });

    const [formErrors, setFormErrors] = useState({
        name: '',
        email: ''
    });

    const [touched, setTouched] = useState({
        name: false,
        email: false
    });

    // Focus Trap logic
    useEffect(() => {
        if (!show || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        // Focus the first element when modal opens
        if (firstElement) {
            firstElement.focus();
        }

        window.addEventListener('keydown', handleTabKey);
        return () => window.removeEventListener('keydown', handleTabKey);
    }, [show, paymentStep]); // Re-run when step changes as focusable elements might change

    // Validation functions
    const validateEmail = (email: string): string => {
        const EMAIL_REGEX = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

        if (!email) return 'Email is required';
        if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';

        const lowerEmail = email.toLowerCase();
        if (lowerEmail.includes('test') || lowerEmail.includes('example')) {
            return 'Please enter a valid email address';
        }

        return '';
    };

    const validateName = (name: string): string => {
        if (!name) return 'Name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        if (name.trim().length > 100) return 'Name must be less than 100 characters';
        return '';
    };

    // Event handlers
    const handleNameChange = (value: string) => {
        setFormData(prev => ({ ...prev, name: value }));
        if (touched.name) {
            setFormErrors(prev => ({ ...prev, name: validateName(value) }));
        }
    };

    const handleEmailChange = (value: string) => {
        setFormData(prev => ({ ...prev, email: value }));
        if (touched.email) {
            setFormErrors(prev => ({ ...prev, email: validateEmail(value) }));
        }
    };

    const handleFieldBlur = (field: 'name' | 'email') => {
        setTouched(prev => ({ ...prev, [field]: true }));

        if (field === 'name') {
            setFormErrors(prev => ({ ...prev, name: validateName(formData.name) }));
        } else {
            setFormErrors(prev => ({ ...prev, email: validateEmail(formData.email) }));
        }
    };

    // Listen for 3thix payment success message and verify
    useEffect(() => {
        if (!show) return;

        const handleMessage = async (event: MessageEvent) => {
            if (event.data && event.data.event === 'payment.success') {
                console.log('Payment Successful via Iframe!', event.data);

                const payload = event.data.data || event.data;
                const intentId = payload.intent_id || payload.payment_intent || payload.transaction_id;
                const invoiceId = payload.invoice_id ||
                    payload.order_id ||
                    payload.reference_id ||
                    payload.id ||
                    currentInvoiceId;

                if (!intentId) {
                    setError('Payment successful but missing intent ID');
                    return;
                }

                if (!invoiceId) {
                    setError('Payment successful but missing invoice ID');
                    return;
                }

                // Show success screen immediately for better UX
                setPaymentStep('success');

                // Verify payment with backend
                try {
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

                    if (response.ok && data.success) {
                        console.log('Payment verified successfully:', data);
                        // Wait a bit before calling onSuccess for smooth UX
                        setTimeout(() => {
                            onSuccess(invoiceId, intentId);
                        }, 1500);
                    } else {
                        console.error('Payment verification failed:', data);
                        setError(data.error || 'Payment verification failed');
                        setPaymentStep('processing');
                    }
                } catch (err: any) {
                    console.error('Payment verification error:', err);
                    setError('Failed to verify payment. Please contact support.');
                    setPaymentStep('processing');
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [show, currentInvoiceId, onSuccess]);

    // Initialize form data from userData prop
    useEffect(() => {
        if (userData?.name || userData?.email) {
            setFormData({
                name: userData.name || '',
                email: userData.email || ''
            });
        }
    }, [userData, show]);

    // Reset state when modal closes
    useEffect(() => {
        if (!show) {
            // Reset all state
            setPaymentStep('init');
            setIframeUrl('');
            setError(null);
            setLoading(false);
            setIframeLoaded(false);
            setLoadingTimeout(false);
            setCurrentInvoiceId(null);

            // Clear timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Reset form errors and touched state
            setFormErrors({ name: '', email: '' });
            setTouched({ name: false, email: false });
        }
    }, [show]);

    // Keyboard support (ESC to close)
    useEffect(() => {
        if (!show) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Don't allow closing during processing or loading
                if (paymentStep !== 'processing' && paymentStep !== 'loading') {
                    onCancel();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [show, paymentStep, onCancel]);

    // Handle iframe loading timeout
    useEffect(() => {
        if (paymentStep === 'loading' && iframeUrl) {
            timeoutRef.current = setTimeout(() => {
                if (!iframeLoaded) {
                    setLoadingTimeout(true);
                }
            }, 30000); // 30 second timeout

            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        }
    }, [paymentStep, iframeUrl, iframeLoaded]);

    const handleProceedToConfirmation = () => {
        // Validate form for card payments
        if (paymentMethod === 'card') {
            const nameError = validateName(formData.name);
            const emailError = validateEmail(formData.email);

            if (nameError || emailError) {
                setFormErrors({ name: nameError, email: emailError });
                setTouched({ name: true, email: true });
                return;
            }
        }

        setPaymentStep('confirmation');
    };

    const handleBackToForm = () => {
        setPaymentStep('init');
        setError(null);
    };

    const handleBackToConfirmation = () => {
        // Show warning if trying to cancel during processing
        if (paymentStep === 'processing') {
            setShowCancelWarning(true);
            return;
        }

        setPaymentStep('confirmation');
        setError(null);
        setIframeUrl('');
        setIframeLoaded(false);
        setLoadingTimeout(false);
        setCurrentInvoiceId(null);

        // Clear timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    const handleConfirmCancel = () => {
        setShowCancelWarning(false);
        setPaymentStep('confirmation');
        setError(null);
        setIframeUrl('');
        setIframeLoaded(false);
        setLoadingTimeout(false);
        setCurrentInvoiceId(null);

        // Clear timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    const handleRetryLoading = () => {
        setLoadingTimeout(false);
        setIframeLoaded(false);
        handleInitiatePayment();
    };

    const handleInitiatePayment = async () => {
        setLoading(true);
        setError(null);
        setPaymentStep('loading');

        try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

            // Use form data for card payments, hardcoded for crypto
            const name = paymentMethod === 'card' ? formData.name : 'NILA Staker';
            const email = paymentMethod === 'card' ? formData.email : 'staker@mindwavedao.com';

            // Debug logging
            console.log('[PAYMENT] Modal props:', {
                amountConfigId,
                lockConfigId,
                walletAddress,
                amount,
                usdPrice
            });

            // Validate required fields (0 is a valid ID, so check for null/undefined)
            if (amountConfigId === undefined || amountConfigId === null || lockConfigId === undefined || lockConfigId === null) {
                console.error('[PAYMENT] Missing IDs:', { amountConfigId, lockConfigId });
                throw new Error('Missing configuration IDs. Please try again.');
            }

            console.log('[PAYMENT] Initiating payment with:', {
                amount: usdPrice,
                amountConfigId,
                lockConfigId,
                walletAddress,
                name,
                email
            });

            const response = await fetch(`${API_BASE}/api/create-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: usdPrice,
                    currency: 'USD',
                    name: name,
                    email: email,
                    walletAddress: walletAddress || '',
                    amountConfigId: amountConfigId,
                    lockConfigId: lockConfigId,
                    integration_type: 'iframe',
                    billing_data: {
                        first_name: name.split(' ')[0],
                        last_name: name.split(' ').slice(1).join(' ') || 'Staker',
                        country: 'US'
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = 'Failed to initialize payment';
                let errorType = 'UNKNOWN';

                try {
                    const errorData = JSON.parse(errorText);
                    errorMsg = errorData.error || errorMsg;
                    errorType = errorData.errorType || 'UNKNOWN';
                    
                    // Provide user-friendly messages based on error type
                    if (errorType === 'GATEWAY_TIMEOUT' || errorType === 'GATEWAY_ERROR') {
                        errorMsg = '⚠️ Payment Gateway Unavailable\n\nThe payment service (3thix) is currently experiencing technical difficulties. This is a temporary issue on their end.\n\nPlease try again in a few minutes or contact support if the issue persists.';
                    } else if (response.status === 503) {
                        errorMsg = '⚠️ Service Temporarily Unavailable\n\nThe payment gateway is not responding. Please try again shortly.';
                    }
                } catch {
                    if (response.status >= 500) {
                        errorMsg = '⚠️ Payment Gateway Error\n\nThe payment service is experiencing technical difficulties. Please try again later.';
                    } else {
                        errorMsg = `Server error: ${response.status}`;
                    }
                }

                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.success && data.paymentUrl) {
                setIframeUrl(data.paymentUrl);
                setCurrentInvoiceId(data.invoiceId);
                // Stay in loading state until iframe loads
            } else {
                throw new Error(data.error || 'Failed to get payment URL');
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Network error connecting to payment service';
            console.error('Payment initialization error:', err);
            setError(errorMsg);
            onError(errorMsg);
            setPaymentStep('confirmation');
        } finally {
            setLoading(false);
        }
    };

    const handleIframeLoad = () => {
        setIframeLoaded(true);
        setPaymentStep('processing');
    };

    // Calculate NILA amount from USD (amount ÷ 0.08)
    const nilaAmount = amount / 0.08;
    
    // Calculate total NILA (no bonus for card payments)
    const totalNila = paymentMethod === 'crypto' && referralBonus > 0
        ? nilaAmount + (nilaAmount * referralBonus / 100)
        : nilaAmount;

    // Steps configuration
    const steps = [
        { key: 'init', label: 'Details', icon: User },
        { key: 'confirmation', label: 'Review', icon: ShieldCheck },
        { key: 'processing', label: 'Payment', icon: CreditCard },
        { key: 'success', label: 'Done', icon: CheckCircle }
    ];

    const currentStepIndex = steps.findIndex(s =>
        paymentStep === 'loading' ? s.key === 'processing' : s.key === paymentStep
    );

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden"
            role="presentation"
        >
            <div
                ref={modalRef}
                className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-2xl h-full sm:h-auto max-h-screen sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
            >
                {/* Progress Stepper */}
                <div className="px-6 pt-6 hidden sm:block">
                    <div className="flex items-center justify-between relative px-2">
                        {/* Progress Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                        <div
                            className="absolute top-1/2 left-0 h-0.5 bg-red-600 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        />

                        {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = idx <= currentStepIndex;
                            return (
                                <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold ${isActive ? 'text-red-600' : 'text-slate-400'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Header */}
                <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 id="modal-title" className="text-xl font-bold text-slate-900">Purchase NILA</h2>
                                {paymentMethod === 'card' && (
                                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                                        💳 Card
                                    </span>
                                )}
                                {paymentMethod === 'crypto' && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                                        🪙 Crypto
                                    </span>
                                )}
                            </div>
                            <p id="modal-description" className="text-xs text-slate-500 font-medium">Securely facilitated by 3thix</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={paymentStep === 'processing' || paymentStep === 'loading'}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        aria-label="Close modal"
                    >
                        <X size={20} className="text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="max-w-xl mx-auto space-y-6">
                        {/* Order Summary */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-colors">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Wallet size={14} />
                                Order Details
                            </h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center group">
                                    <span className="text-sm font-medium text-slate-500">Base Amount</span>
                                    <span className="text-sm font-bold text-slate-900">{nilaAmount.toLocaleString()} NILA</span>
                                </div>

                                {paymentMethod === 'crypto' && referralBonus > 0 && (
                                    <div className="flex justify-between items-center pb-4 border-b border-slate-200/60 transition-all">
                                        <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                            Reward Bonus
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                +{referralBonus}%
                                            </span>
                                        </span>
                                        <span className="text-sm font-bold text-green-600">
                                            +{(nilaAmount * referralBonus / 100).toLocaleString()} NILA
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-semibold text-slate-600">Total NILA</span>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-900 leading-none">
                                            {totalNila.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tokens</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Amount Due</span>
                                    <span className="text-xl font-bold text-red-600">${usdPrice.toFixed(2)} USD</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Messages */}
                        <div aria-live="polite">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-left duration-300">
                                    <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-red-900">Connection Error</p>
                                        <div className="text-xs text-red-700 mt-1 leading-relaxed font-medium whitespace-pre-line">{error}</div>
                                        {paymentStep === 'confirmation' && (
                                            <button
                                                onClick={() => setError(null)}
                                                className="mt-3 text-[10px] uppercase tracking-wider font-bold text-red-600 hover:text-red-800 transition-colors"
                                            >
                                                Dismiss and Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dynamic Step Content */}
                        <div className="transition-all duration-300">
                            {/* STEP 1: INIT - Form Collection */}
                            {paymentStep === 'init' && paymentMethod === 'card' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <User size={16} className="text-red-600" />
                                            Billing Details
                                        </h3>

                                        <div className="grid grid-cols-1 gap-5">
                                            <div>
                                                <label htmlFor="full-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    Full Name
                                                </label>
                                                <input
                                                    id="full-name"
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => handleNameChange(e.target.value)}
                                                    onBlur={() => handleFieldBlur('name')}
                                                    placeholder="Enter your registered name"
                                                    className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none ${touched.name && formErrors.name
                                                        ? 'border-red-200 bg-red-50/50 focus:border-red-400'
                                                        : 'border-slate-100 bg-slate-50/30 focus:border-red-500 focus:bg-white'
                                                        } placeholder:text-slate-300 font-medium`}
                                                />
                                                {touched.name && formErrors.name && (
                                                    <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center gap-1">
                                                        <AlertCircle size={10} />
                                                        {formErrors.name}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    Email Address
                                                </label>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => handleEmailChange(e.target.value)}
                                                    onBlur={() => handleFieldBlur('email')}
                                                    placeholder="example@email.com"
                                                    className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none ${touched.email && formErrors.email
                                                        ? 'border-red-200 bg-red-50/50 focus:border-red-400'
                                                        : 'border-slate-100 bg-slate-50/30 focus:border-red-500 focus:bg-white'
                                                        } placeholder:text-slate-300 font-medium`}
                                                />
                                                {touched.email && formErrors.email && (
                                                    <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center gap-1">
                                                        <AlertCircle size={10} />
                                                        {formErrors.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleProceedToConfirmation}
                                        disabled={!formData.name || !formData.email || !!formErrors.name || !!formErrors.email}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-red-200 active:scale-[0.97] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                    >
                                        Review My Order
                                        <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            )}

                            {(paymentStep === 'init' && paymentMethod === 'crypto') && (
                                <button
                                    onClick={handleProceedToConfirmation}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-red-200 active:scale-[0.97] flex items-center justify-center gap-2 group animate-in fade-in slide-in-from-bottom duration-500"
                                >
                                    Proceed to Review
                                    <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}

                            {/* STEP 2: CONFIRMATION - Review Before Payment */}
                            {paymentStep === 'confirmation' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                                    {paymentMethod === 'card' && (
                                        <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ShieldCheck size={14} />
                                                Billing Information Review
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-medium text-slate-500">Name</span>
                                                    <span className="text-sm font-bold text-slate-900">{formData.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-medium text-slate-500">Email</span>
                                                    <span className="text-sm font-bold text-slate-900">{formData.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleBackToForm}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                                            aria-label="Back to details"
                                        >
                                            <ArrowLeft size={18} />
                                            Back
                                        </button>
                                        <button
                                            onClick={handleInitiatePayment}
                                            disabled={loading}
                                            className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-red-200 active:scale-[0.97] disabled:opacity-30 flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Preparing...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={18} />
                                                    Confirm & Pay
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: LOADING - Iframe Loading State */}
                            {paymentStep === 'loading' && (
                                <div className="animate-in fade-in duration-500">
                                    {!loadingTimeout ? (
                                        <div className="text-center space-y-6 py-12">
                                            <div className="flex justify-center relative">
                                                <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
                                                <div className="relative p-6 bg-red-50 text-red-600 rounded-full animate-pulse border-4 border-red-100">
                                                    <Loader2 size={48} className="animate-spin" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black text-slate-900 leading-tight">Securing Your Connection</h3>
                                                <p className="text-sm text-slate-500 font-medium">Please avoid refreshing or closing this window</p>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Clock size={12} strokeWidth={3} />
                                                <span>Establishing gateway...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-6 py-12 animate-in zoom-in-95 duration-300">
                                            <div className="flex justify-center">
                                                <div className="p-6 bg-yellow-50 text-yellow-500 rounded-full border-4 border-yellow-100">
                                                    <AlertCircle size={48} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black text-slate-900 leading-tight">Server Timeout</h3>
                                                <p className="text-sm text-slate-500 font-medium">The payment gateway is taking longer than expected.</p>
                                            </div>
                                            <div className="flex gap-4 justify-center">
                                                <button
                                                    onClick={handleBackToConfirmation}
                                                    className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleRetryLoading}
                                                    className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-100"
                                                >
                                                    <Loader2 size={18} />
                                                    Try Again
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Hidden iframe for background loading */}
                                    {iframeUrl && (
                                        <iframe
                                            src={iframeUrl}
                                            title="3thix Payment Gateway"
                                            className="hidden"
                                            allow="payment"
                                            onLoad={handleIframeLoad}
                                        />
                                    )}
                                </div>
                            )}

                            {/* STEP 4: PROCESSING - Iframe Display */}
                            {paymentStep === 'processing' && iframeUrl && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-red-50/40 p-4 rounded-2xl flex items-center justify-center gap-3 border border-red-100">
                                        <Loader2 size={18} className="text-red-500 animate-spin" strokeWidth={3} />
                                        <span className="text-[10px] uppercase font-black tracking-widest text-red-600">Final Step: Complete Payment Below</span>
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-slate-200/50 rounded-[26px] blur-sm opacity-0 group-hover:opacity-100 duration-500" />
                                        <iframe
                                            src={iframeUrl}
                                            title="3thix Payment Gateway"
                                            className="relative w-full h-[600px] border-2 border-slate-100 rounded-[20px] bg-white shadow-sm"
                                            allow="payment"
                                        />
                                    </div>

                                    {showCancelWarning && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 shadow-sm animate-in zoom-in-95 duration-200">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle size={22} className="text-yellow-600 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-yellow-900">Stop Payment?</p>
                                                    <p className="text-xs text-yellow-700 mt-1 font-medium leading-relaxed">
                                                        If you cancel now, your transaction might be interrupted. Are you sure you want to stop?
                                                    </p>
                                                    <div className="flex gap-3 mt-4">
                                                        <button
                                                            onClick={handleConfirmCancel}
                                                            className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-colors text-xs font-black shadow-lg shadow-yellow-200"
                                                        >
                                                            Yes, Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => setShowCancelWarning(false)}
                                                            className="flex-1 px-4 py-2.5 bg-white hover:bg-yellow-50 text-yellow-900 border-2 border-yellow-200 rounded-xl transition-all text-xs font-black"
                                                        >
                                                            Back
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                            <ShieldCheck size={12} className="text-green-500" />
                                            <span>256-bit encrypted secure session</span>
                                        </div>
                                        <button
                                            onClick={handleBackToConfirmation}
                                            className="text-xs font-black text-slate-400 hover:text-slate-600 transition-colors py-2 uppercase tracking-widest underline decoration-2 underline-offset-4 decoration-slate-200"
                                        >
                                            Return to Review
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: SUCCESS */}
                            {paymentStep === 'success' && (
                                <div className="text-center space-y-8 py-12 animate-in zoom-in-95 duration-500">
                                    <div className="flex justify-center relative">
                                        <div className="absolute inset-0 bg-green-500/20 blur-3xl animate-pulse" />
                                        <div className="relative p-8 bg-green-50 text-green-500 rounded-full border-8 border-green-100 shadow-2xl animate-bounce">
                                            <CheckCircle size={64} strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Purchase Confirmed!</h3>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="text-sm text-slate-500 font-bold">Allocating your NILA tokens...</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-8 shadow-inner">
                                        <div className="h-full bg-green-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 p-6 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Protocol: <span className="text-slate-600">NILA STAKING V2.0</span>
                    </p>
                    {paymentStep === 'init' && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all font-black text-xs uppercase tracking-widest"
                        >
                            Abort Purchase
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default EthicsPaymentModal;
