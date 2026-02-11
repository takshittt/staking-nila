import { ArrowRight, Lock, Smartphone } from 'lucide-react';

interface InitialSetupProps {
    onNext: () => void;
}

const InitialSetup = ({ onNext }: InitialSetupProps) => {
    return (
        <div className="text-center space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Welcome, Administrator!
                </h1>
                <p className="text-lg text-slate-600 max-w-xl mx-auto font-medium">
                    Let's secure your dashboard with a master password and two-factor authentication.
                </p>
            </div>

            {/* Setup Steps Preview */}
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Step 1 */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 transition-all hover:shadow-sm group">
                    <div className="bg-red-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:bg-red-100 transition-colors">
                        <Lock className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                        1. Master Password
                    </h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Create a strong password to protect your administrative access.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 transition-all hover:shadow-sm group">
                    <div className="bg-red-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:bg-red-100 transition-colors">
                        <Smartphone className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                        2. Enable 2FA
                    </h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Scan a QR code with Google Authenticator for dual-layer protection.
                    </p>
                </div>
            </div>

            {/* Start Setup Button */}
            <div className="pt-2">
                <button
                    onClick={onNext}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-300 inline-flex items-center gap-2 text-base shadow-lg shadow-red-600/20 active:scale-[0.98]"
                >
                    <span>Begin Secure Setup</span>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default InitialSetup;
