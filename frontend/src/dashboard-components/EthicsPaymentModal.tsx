import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, CreditCard, Wallet, User } from 'lucide-react';

interface EthicsPaymentModalProps {
    show: boolean;
    amount: number;
    usdPrice: number;
    referralBonus: number;
    paymentMethod: 'crypto' | 'card';
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
    userData,
    onSuccess,
    onCancel,
    onError
}: EthicsPaymentModalProps) => {
    const [iframeUrl, setIframeUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
    const [paymentStep, setPaymentStep] = useState<'init' | 'processing' | 'success'>('init');

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

    const needsUserData = !formData.name || !formData.email;

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

    // Listen for 3thix payment success message
    // Listen for 3thix payment success message
    useEffect(() => {
        if (!show) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.event === 'payment.success') {
                console.log('Payment Successful via Iframe!', event.data);

                const payload = event.data.data || event.data;
                const intentId = payload.intent_id || payload.payment_intent || payload.transaction_id;
                const invoiceId = payload.invoice_id ||
                    payload.order_id ||
                    payload.reference_id ||
                    payload.id ||
                    currentInvoiceId;

                if (intentId && invoiceId) {
                    setPaymentStep('success');
                    setTimeout(() => {
                        onSuccess(invoiceId, intentId);
                    }, 1500);
                } else {
                    setError('Payment successful but missing verification details');
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

    const handleInitiatePayment = async () => {
        // Validate form for card payments only
        if (paymentMethod === 'card' && needsUserData) {
            const nameError = validateName(formData.name);
            const emailError = validateEmail(formData.email);

            if (nameError || emailError) {
                setFormErrors({ name: nameError, email: emailError });
                setTouched({ name: true, email: true });
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

            // Use form data for card payments, hardcoded for crypto
            const name = paymentMethod === 'card' ? formData.name : 'NILA Staker';
            const email = paymentMethod === 'card' ? formData.email : 'staker@mindwavedao.com';

            const response = await fetch(`${API_BASE}/api/create-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: usdPrice,
                    currency: 'USD',
                    name: name,
                    email: email,
                    walletAddress: '',
                    integration_type: 'iframe',
                    billing_data: {
                        first_name: name.split(' ')[0],
                        last_name: name.split(' ').slice(1).join(' ') || 'Staker',
                        country: 'US'
                    }
                })
            });

            const data = await response.json();

            if (response.ok && data.success && data.paymentUrl) {
                setIframeUrl(data.paymentUrl);
                setCurrentInvoiceId(data.invoiceId);
                setPaymentStep('processing');
            } else {
                setError(data.error || 'Failed to initialize payment');
                onError(data.error || 'Failed to initialize payment');
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Network error connecting to payment service';
            setError(errorMsg);
            onError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Complete Your Purchase</h2>
                            <p className="text-sm text-slate-500">Secure payment via 3thix</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={paymentStep === 'processing'}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Order Summary */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Wallet size={18} className="text-slate-400" />
                            Order Summary
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">NILA Amount</span>
                                <span className="font-semibold text-slate-900">{amount.toLocaleString()} NILA</span>
                            </div>

                            {referralBonus > 0 && (
                                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                    <span className="text-slate-600 flex items-center gap-2">
                                        Referral Bonus
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                            +{referralBonus}%
                                        </span>
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        +{(amount * referralBonus / 100).toLocaleString()} NILA
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <span className="text-slate-600">Total NILA</span>
                                <span className="text-lg font-bold text-slate-900">
                                    {(amount + (referralBonus > 0 ? amount * referralBonus / 100 : 0)).toLocaleString()} NILA
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">USD Price</span>
                                <span className="font-semibold text-slate-900">${usdPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-900">Payment Error</p>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* User Data Form - Card Payments Only */}
                    {paymentStep === 'init' && paymentMethod === 'card' && (
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <User size={18} className="text-slate-400" />
                                Billing Information
                            </h3>

                            {/* Full Name Field */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    onBlur={() => handleFieldBlur('name')}
                                    className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                                        touched.name && formErrors.name
                                            ? 'border-red-300 bg-red-50 focus:ring-red-500'
                                            : 'border-slate-200 bg-white focus:ring-red-500'
                                    }`}
                                />
                                {touched.name && formErrors.name && (
                                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {formErrors.name}
                                    </p>
                                )}
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    onBlur={() => handleFieldBlur('email')}
                                    className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                                        touched.email && formErrors.email
                                            ? 'border-red-300 bg-red-50 focus:ring-red-500'
                                            : 'border-slate-200 bg-white focus:ring-red-500'
                                    }`}
                                />
                                {touched.email && formErrors.email && (
                                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {formErrors.email}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Step: Init */}
                    {paymentStep === 'init' && (
                        <button
                            onClick={handleInitiatePayment}
                            disabled={loading || (paymentMethod === 'card' && (!formData.name || !formData.email || !!formErrors.name || !!formErrors.email))}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Initializing Payment...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={20} />
                                    Proceed to Payment
                                </>
                            )}
                        </button>
                    )}

                    {/* Payment Step: Processing (Iframe) */}
                    {paymentStep === 'processing' && iframeUrl && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                <Loader2 size={20} className="text-blue-600 shrink-0 mt-0.5 animate-spin" />
                                <div>
                                    <p className="font-semibold text-blue-900">Processing Payment</p>
                                    <p className="text-sm text-blue-700 mt-1">Please complete the payment in the form below</p>
                                </div>
                            </div>

                            <iframe
                                src={iframeUrl}
                                title="3thix Payment Gateway"
                                className="w-full h-[600px] border border-slate-200 rounded-xl"
                                allow="payment"
                            />

                            <p className="text-xs text-slate-500 text-center">
                                Secure payment powered by 3thix. Your card details are encrypted and never stored.
                            </p>
                        </div>
                    )}

                    {/* Payment Step: Success */}
                    {paymentStep === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-4 bg-green-100 text-green-600 rounded-full animate-bounce">
                                    <CheckCircle size={48} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
                                <p className="text-slate-600">Your NILA will be staked automatically...</p>
                            </div>
                            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-600 animate-pulse" style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 p-6 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        By proceeding, you agree to our Terms of Service
                    </p>
                    {paymentStep === 'init' && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EthicsPaymentModal;
