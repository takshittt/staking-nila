import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InitialSetup, PasswordSetup, GoogleAuthenticator } from '../components/setup-components';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';

type SetupStep = 'initial' | 'password' | 'authenticator';

const Setup = () => {
    const navigate = useNavigate();
    const { setToken } = useAuthStore();
    const [currentStep, setCurrentStep] = useState<SetupStep>('initial');
    const [password, setPassword] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [manualEntryCode, setManualEntryCode] = useState('');
    const [error, setError] = useState('');

    const handleInitialNext = () => {
        setCurrentStep('password');
    };

    const handlePasswordNext = (pwd: string) => {
        setPassword(pwd);
        setCurrentStep('authenticator');
        // Fetch QR code when moving to authenticator step
        fetchQRCode();
    };

    const handlePasswordBack = () => {
        setCurrentStep('initial');
    };

    const handleAuthenticatorBack = () => {
        setCurrentStep('password');
    };

    const fetchQRCode = async () => {
        try {
            const data = await authApi.getSetupQR();
            setQrCodeUrl(data.qrCodeUrl);
            setManualEntryCode(data.manualEntryCode);
            setSessionId(data.sessionId);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate QR code');
        }
    };

    const handleSetupComplete = async (totpCode: string) => {
        try {
            setError('');
            const data = await authApi.completeSetup({
                password,
                totpCode,
                sessionId
            });

            // Store token
            setToken(data.token);

            // Redirect to dashboard
            navigate('/admin');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Setup failed. Please try again.');
            throw err; // Re-throw to show error in GoogleAuthenticator component
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-5xl">
                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-slate-200">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <p className="text-sm font-bold text-red-600">{error}</p>
                        </div>
                    )}

                    {currentStep === 'initial' && (
                        <InitialSetup onNext={handleInitialNext} />
                    )}

                    {currentStep === 'password' && (
                        <PasswordSetup
                            onNext={handlePasswordNext}
                            onBack={handlePasswordBack}
                        />
                    )}

                    {currentStep === 'authenticator' && (
                        <GoogleAuthenticator
                            password={password}
                            qrCodeUrl={qrCodeUrl}
                            manualEntryCode={manualEntryCode}
                            onComplete={handleSetupComplete}
                            onBack={handleAuthenticatorBack}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-sm text-slate-500 font-medium">
                        &copy; {new Date().getFullYear()} MindwaveDAO Admin Panel - Secure Setup
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Setup;
