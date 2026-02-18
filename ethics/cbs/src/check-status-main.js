import { log } from './utils/logger.js';
import './index.css';



const API_BASE = import.meta.env.VITE_API_BASE;

if (import.meta.env.DEV) {
    log.info("API_BASE:", API_BASE);
}

const searchForm = document.getElementById('searchForm');
const lookupInput = document.getElementById('lookupInput');
const emailInput = document.getElementById('emailInput');
const emailContainer = document.getElementById('emailContainer');
const checkBtn = document.getElementById('checkBtn');
const resultArea = document.getElementById('resultArea');
const clearBtn = document.getElementById('clearBtn');
const toggleInvoice = document.getElementById('toggleInvoice');
const toggleTransaction = document.getElementById('toggleTransaction');
const inputLabel = document.getElementById('inputLabel');

// Current lookup mode: 'invoice' or 'crypto' (formerly transaction)
let lookupMode = 'invoice';

// Validation Regex
const INVOICE_REGEX = /^[a-zA-Z0-9-]{10,}$/;
const TX_HASH_REGEX = /^[a-zA-Z0-9]{6}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// Toggle handlers
toggleInvoice.addEventListener('click', () => {
    lookupMode = 'invoice';
    toggleInvoice.classList.add('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
    toggleInvoice.classList.remove('bg-white/5', 'text-gray-400', 'border-white/10');
    toggleTransaction.classList.remove('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
    toggleTransaction.classList.add('bg-white/5', 'text-gray-400', 'border-white/10');

    inputLabel.textContent = 'Invoice ID';
    lookupInput.placeholder = 'e.g. 086BN2upOY0HsGOe';
    emailContainer.classList.add('hidden');
    clearError();
});

toggleTransaction.addEventListener('click', () => {
    lookupMode = 'crypto';
    toggleTransaction.classList.add('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
    toggleTransaction.classList.remove('bg-white/5', 'text-gray-400', 'border-white/10');
    toggleInvoice.classList.remove('bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
    toggleInvoice.classList.add('bg-white/5', 'text-gray-400', 'border-white/10');

    inputLabel.textContent = 'Transaction Hash (Last 6 Digits)';
    lookupInput.placeholder = 'e.g. TDPUPQ';
    emailContainer.classList.remove('hidden');
    clearError();
});

// Input handling
lookupInput.addEventListener('input', () => {
    const val = lookupInput.value.trim();
    if (val.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
    clearError();
});

clearBtn.addEventListener('click', () => {
    lookupInput.value = '';
    clearBtn.classList.add('hidden');
    lookupInput.focus();
    resultArea.classList.add('hidden');
    clearError();
});

function showError(msg) {
    let errDiv = document.getElementById('inputError');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'inputError';
        errDiv.className = 'text-red-500 text-sm mt-2 ml-1';
        lookupInput.closest('.relative')?.parentNode?.appendChild(errDiv);
    }
    errDiv.textContent = msg;
    lookupInput.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/50');
}

function clearError() {
    const errDiv = document.getElementById('inputError');
    if (errDiv) errDiv.textContent = '';
    lookupInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/50');
}

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lookupValue = lookupInput.value.trim();
    const emailValue = emailInput.value.trim();

    // STRICT VALIDATION based on lookup mode
    if (lookupMode === 'invoice') {
        if (!lookupValue) {
            showError("Invoice ID is required");
            return;
        }
        if (!INVOICE_REGEX.test(lookupValue)) {
            showError("Invalid Invoice ID. Must be alphanumeric and at least 10 characters.");
            return;
        }
    } else {
        // Crypto Validation
        if (!emailValue) {
            showError("Email Address is required for verification");
            return;
        }
        if (!EMAIL_REGEX.test(emailValue)) {
            showError("Please enter a valid email address");
            return;
        }
        if (!lookupValue) {
            showError("Transaction Hash (Last 6 chars) is required");
            return;
        }
        if (!TX_HASH_REGEX.test(lookupValue)) {
            showError("Invalid Hash. Enter exactly the last 6 characters (alphanumeric).");
            return;
        }
    }

    // UI Loading State
    log.info(`Checking payment status by ${lookupMode}: ${lookupValue.slice(0, 6)}...`);
    setLoading(true);
    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `
    <div class="text-center py-6 animate-pulse">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500 mb-4"></i>
        <p class="text-gray-400">Checking status...</p>
    </div>
  `;

    try {
        let res;

        if (lookupMode === 'invoice') {
            res = await fetch(`https://token-api.mindwavedao.com/api/check-payment-status?invoiceId=${encodeURIComponent(lookupValue)}`);
        } else {
            res = await fetch('https://token-api.mindwavedao.com/api/crypto/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailValue, txHashLast6: lookupValue })
            });
        }

        // 500 / Server Error Check -> Treat as Verifying
        if (!res.ok && res.status !== 404) {
            renderProcessing({}, "Verifying payment", "Please wait while we securely confirm your payment.");
            return;
        }

        const data = await res.json();

        if (res.status === 404 || data.status === 'NOT_FOUND') {
            renderErrorCard({
                title: lookupMode === 'invoice' ? "Invalid Invoice ID" : "Payment Not Found",
                message: lookupMode === 'invoice' ? "No transaction found." : "No matching crypto payment found for this email and hash.",
                variant: 'alert'
            });
        } else if (data.status === 'BLOCKED') {
            renderBlocked(data);
        } else {
            renderByStatus(data);
        }

    } catch (error) {
        // Network error -> Treat as Verifying/Taking longer
        log.warn("Status check network error - treating as verification", error?.message);
        renderProcessing({}, "Taking longer than usual", "Your payment is being verified. You can safely check again shortly.");
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        checkBtn.disabled = true;
        checkBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Checking...`;
        lookupInput.disabled = true;
    } else {
        checkBtn.disabled = false;
        checkBtn.innerHTML = `<span>Check Status</span>`;
        lookupInput.disabled = false;
    }
}

// Helpers
function formatUSD(num) {
    if (num === undefined || num === null || isNaN(num) || num === "") return "---";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatTokens(num) {
    if (num === undefined || num === null || isNaN(num) || num === "") return "---";
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(num);
}

function formatPrice(num) {
    if (num === undefined || num === null || isNaN(num) || num === "") return "---";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(num);
}

const safe = (val) => (val === undefined || val === null || val === "" || Number.isNaN(val)) ? "---" : val;

function renderByStatus(data) {
    const status = data.status ? data.status.toUpperCase() : "UNKNOWN";

    if (status === 'SUCCESS' || status === 'PAID' || status === 'CONFIRMED') {
        renderSuccess(data);
    } else if (status === 'CREATED') {
        log.info("STATE → CREATED");
        renderPending(data, "Payment not completed", "Waiting for payment confirmation.");
    } else if (status === 'FAILED') {
        log.error("Status check failed", "Payment Failed");
        renderErrorCard({
            title: "Payment failed",
            message: "Your payment was not completed. No charges were applied.",
            invoiceId: data.invoiceId
        });
    } else {
        // AWAITING_FULFILLMENT, PROCESSING, AWAITING_WEBHOOK, or Unknown -> Treat as Verifying
        log.info("STATE → PENDING/VERIFYING");
        renderProcessing(data, "Verifying payment", "Please wait while we securely confirm your payment.");
    }
}

function renderPending(data, title, subtitle) {
    resultArea.innerHTML = `
    <div class="animate-fade-in-up">
       <div class="flex items-center gap-3 mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
           <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
               <i class="fa-solid fa-hourglass-half text-yellow-500 animate-pulse"></i>
           </div>
           <div>
               <span class="block text-yellow-500 font-bold text-sm tracking-wide">${title.toUpperCase()}</span>
                <span class="text-xs text-white/60">${subtitle}</span>
           </div>
       </div>

        <div class="p-4 bg-white/5 rounded-xl text-center border border-white/10">
           <p class="text-sm text-gray-300">If you have paid, confirmation may take a few minutes.</p>
       </div>
   </div>
`;
}

function renderProcessing(data, title, subtitle) {
    resultArea.innerHTML = `
    <div class="animate-fade-in-up">
       <div class="flex items-center gap-3 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
           <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
               <i class="fa-solid fa-circle-notch fa-spin text-blue-500"></i>
           </div>
           <div>
               <span class="block text-blue-500 font-bold text-sm tracking-wide">${title.toUpperCase()}</span>
           </div>
       </div>

        <div class="p-4 bg-white/5 rounded-xl text-center border border-white/10">
           <p class="text-sm text-gray-300">${subtitle}</p>
       </div>
   </div>
`;
}


function renderSuccess(data) {
    const invoiceId = safe(data.invoiceId);
    const transactionId = safe(data.transactionId);

    log.info("STATE → SUCCESS");
    if (invoiceId !== "---") log.info("Invoice ID:", invoiceId.slice(0, 6) + "****");
    if (transactionId !== "---") log.info("Transaction ID:", transactionId.slice(0, 6) + "****");

    // Conditionally build rows
    let amountRow = '';
    if (data.amount && !isNaN(data.amount)) {
        amountRow = `
            <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Amount Paid (USD)</span>
                <span class="text-white font-semibold">${formatUSD(data.amount)}</span>
            </div>`;
    }

    let tokenRow = '';
    const tokensVal = data.tokensPurchased || data.tokens || data.estimatedTokens;
    if (tokensVal && !isNaN(tokensVal)) {
        tokenRow = `
            <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Tokens Purchased</span>
                <span class="block text-white font-semibold">${formatTokens(tokensVal)} NILA</span>
            </div>`;
    }

    let priceRow = '';
    if (data.tokenPrice && !isNaN(data.tokenPrice)) {
        priceRow = `
            <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Token Price</span>
                <span class="text-white font-semibold">${formatPrice(data.tokenPrice)}</span>
            </div>`;
    }

    // Transaction ID row (conditional)
    let transactionRow = '';
    if (transactionId !== "---") {
        transactionRow = `
            <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Transaction ID</span>
                <span class="text-white font-mono text-sm">${transactionId}</span>
            </div>`;
    }

    const walletAddress = safe(data.walletAddress);
    // Network Label
    const network = data.network || "ETH / BSC";

    resultArea.innerHTML = `
    <div class="animate-fade-in-up">
        <div class="flex items-center gap-3 mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-check text-green-400"></i>
            </div>
            <div>
                <span class="block text-green-400 font-bold text-sm tracking-wide">PAYMENT SUCCESSFUL</span>
                <span class="text-xs text-white/60">Transaction Confirmed</span>
            </div>
        </div>

        <div class="space-y-4 mb-6">
            <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Invoice ID</span>
                <span class="text-white font-mono text-sm">${invoiceId}</span>
            </div>
            ${transactionRow}
            ${amountRow}
            ${priceRow}
            ${tokenRow}
            <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Wallet Address</span>
                <span class="text-white font-mono text-sm break-all">${walletAddress}</span>
            </div>
             <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="text-gray-400 text-sm">Network</span>
                <span class="text-white font-sm">${network}</span>
            </div>
        </div>
        
        <div class="p-4 bg-white/5 rounded-xl text-center border border-white/10">
             <p class="text-sm text-gray-300">Confirmation email will be sent shortly.</p>
        </div>
    </div>
`;
}

function renderBlocked(data) {
    resultArea.innerHTML = `
        <div class="text-center py-4 animate-fade-in-up" role="alert" aria-live="polite">
            <div class="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <i class="fa-solid fa-ban text-red-500"></i>
            </div>
            <p class="text-red-500 font-bold mb-2">PAYMENT BLOCKED</p>
            <p class="text-gray-400 text-sm">Please contact support: <a href="mailto:support@mindwavedao.com" class="text-white underline hover:no-underline">support@mindwavedao.com</a></p>
             ${data.invoiceId ? `<div class="text-xs font-mono text-gray-500 mt-2">${data.invoiceId}</div>` : ''}
        </div>
    `;
}

function renderErrorCard({ title, message = "", variant = "error", invoiceId = "" }) {
    const isAlert = variant === "alert";
    const displayTitle = isAlert ? "Invalid Invoice ID" : title;
    const displayMessage = isAlert ? "No transaction found." : message;

    resultArea.innerHTML = `
        <div class="text-center py-4 animate-fade-in-up" role="alert" aria-live="polite">
            <div class="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <i class="fa-solid ${isAlert ? 'fa-circle-exclamation' : 'fa-circle-xmark'} text-red-400"></i>
            </div>
            <p class="text-red-400 font-bold mb-2">${displayTitle}</p>
            <p class="text-gray-400 text-sm">${displayMessage}</p>
            ${invoiceId ? `<div class="text-xs font-mono text-gray-500 mt-2">${invoiceId}</div>` : ''}
        </div>
    `;
}
