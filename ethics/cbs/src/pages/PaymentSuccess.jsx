
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { log } from '../utils/logger';

// Environment-based API base URL
const API_BASE = import.meta.env.VITE_API_BASE;

function PaymentSuccess() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState('loading');
    const [details, setDetails] = useState(null);

    // 3thix might return: invoiceId, order_id, or reference_id
    const invoiceId = params.get('invoiceId') || params.get('invoice_id') || params.get('order_id') || params.get('reference_id');
    // Robustly check for intent_id, payment_intent, or transaction_id
    const intentId = params.get('intent_id') || params.get('payment_intent') || params.get('transaction_id');

    useEffect(() => {
        // We need at least an intentId or invoiceId to proceed.
        // If we have intentId, we can verify the payment.
        // If we only have invoiceId, we can try to check status directly (legacy flow) or fail if verify-intent is strictly required.
        // Given the new flow, intentId is primary.
        if (!invoiceId && !intentId) {
            setStatus('error');
            return;
        }

        const verifyAndCheckStatus = async () => {
            try {
                // Step 1: Verify Intent
                log.info("Verifying intent...", { invoiceId, intentId });

                let isVerified = false;
                let finalInvoiceId = invoiceId;

                try {
                    const verifyRes = await fetch(`${API_BASE}/api/verify-intent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ invoice_id: invoiceId, intent_id: intentId })
                    });
                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        isVerified = true;
                        // Determine invoiceId from response if we didn't have it
                        if (!finalInvoiceId && verifyData.invoice_id) {
                            finalInvoiceId = verifyData.invoice_id;
                        }
                    } else {
                        log.warn("Verification endpoint returned false", verifyData);
                        // If verification explicitly fails, we might still want to check-payment as a fallback?
                        // For now, let's assume if verify-intent fails, it's a failure, UNLESS it was just a network error.
                        // However, let's proceed to check-payment ONLY if we have an invoiceId to fallback on.
                    }
                } catch (err) {
                    log.error("Verification call failed / network error", err);
                    // Continue to try check-payment if we have manual invoiceId
                }

                if (isVerified) {
                    // PRIMARY SUCCESS PATH
                    // We know the payment is valid.
                    setStatus('success');
                }

                // Step 2: Fetch Details (Optional for success state, but needed for UI)
                // We only do this if we have an invoiceId.
                if (finalInvoiceId) {
                    try {
                        const res = await fetch(`${API_BASE}/api/check-payment?invoiceId=${finalInvoiceId}`);
                        const data = await res.json();

                        if (data.status === 'SUCCESS' || data.status === 'PAID') {
                            setDetails(data);
                            // If we weren't verified yet (maybe verify-intent 404'd but check-payment worked?), confirm success now
                            if (!isVerified) setStatus('success');
                        } else if (data.status === 'PENDING') {
                            if (!isVerified) setStatus('pending');
                        } else {
                            // Only set error if we weren't already verified. 
                            // If verified, we just show success with missing details.
                            if (!isVerified) setStatus('error');
                        }
                    } catch (e) {
                        log.error("Failed to check status details", e);
                        // If we were verified, we stay success. If not, we error.
                        if (!isVerified) setStatus('error');
                    }
                } else {
                    // No invoiceId to check details with.
                    // If verified, remain success (just no details).
                    // If not verified, error.
                    if (!isVerified) {
                        log.error("No invoiceId and verification failed/skipped.");
                        setStatus('error');
                    }
                }

            } catch (e) {
                log.error("Unexpected error in payment flow", e);
                setStatus('error');
            }
        };

        verifyAndCheckStatus();
    }, [invoiceId, intentId]);

    if (status === 'loading') {
        return (
            <div className="status-page flex items-center justify-center min-h-screen bg-brand-light text-brand-dark">
                <p className="text-xl animate-pulse text-brand-primary">Verifying payment...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="status-page error flex flex-col items-center justify-center min-h-screen bg-brand-light text-brand-dark p-6">
                <h1 className="text-3xl font-bold text-brand-primary mb-4">❌ Verification Failed</h1>
                <p className="mb-6 text-brand-muted">
                    {invoiceId
                        ? <>We couldn't verify your payment. Note your Invoice ID: <span className="font-mono bg-white border border-brand-light px-2 py-1 rounded text-brand-dark">{invoiceId}</span></>
                        : "Missing Payment Parameters (Invoice ID). Please contact support."}
                </p>
                <a href="/" className="px-6 py-2 bg-white border border-brand-light hover:bg-gray-50 rounded-lg transition-colors text-brand-dark shadow-sm">Return Home</a>
            </div>
        );
    }

    return (
        <div className="status-page cancelled flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-6 text-center">
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6 border border-yellow-200 shadow-sm">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-slate-900">Payment Cancelled</h1>
            <p className="text-slate-500 mb-8">Your payment was not completed. No charges were made.</p>

            {details && (
                <div className="bg-white rounded-xl p-6 max-w-md w-full mb-8 border border-slate-100 shadow-xl">
                    <table className="w-full text-left">
                        <tbody>
                            <tr className="border-b border-slate-100"><td className="py-3 text-slate-500">Invoice Ref</td><td className="py-3 font-mono text-right text-slate-900">{invoiceId}</td></tr>
                            <tr className="border-b border-brand-light"><td className="py-3 text-brand-muted">Amount Paid</td><td className="py-3 text-right font-bold text-brand-success">${details.amount || details.amountUsd}</td></tr>
                            <tr><td className="py-3 text-brand-muted">Tokens</td><td className="py-3 text-right text-brand-primary font-bold">{details.nilaTokens || details.tokens} NILA</td></tr>
                        </tbody>
                    </table>
                </div>
            )}

            <p className="notice text-sm text-brand-muted mb-8">A confirmation email has been sent to your inbox.</p>
            <a href="/" className="px-8 py-3 bg-brand-primary hover:bg-brand-accent text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 transition-all">Return Home</a>
        </div>
    );
}

export default PaymentSuccess;
