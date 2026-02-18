
function PaymentCancelled() {
    return (
        <div className="status-page cancelled flex flex-col items-center justify-center min-h-screen bg-brand-light text-brand-dark p-6 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6 border border-yellow-200">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-brand-dark">Payment Cancelled</h1>
            <p className="text-brand-muted mb-8">Your payment was not completed. No charges were made.</p>
            <div className="actions flex gap-4">
                <a href="/" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold shadow-md">Try Again</a>
                <a href="/" className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors shadow-sm">Return Home</a>
            </div>
        </div>
    );
}

export default PaymentCancelled;
