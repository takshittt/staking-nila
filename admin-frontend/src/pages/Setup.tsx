import { useState } from 'react';
import { InitialSetup, PasswordSetup, GoogleAuthenticator } from '../components/setup-components';

type SetupStep = 'initial' | 'password' | 'authenticator';

const Setup = () => {
    const [currentStep, setCurrentStep] = useState<SetupStep>('initial');
    const [password, setPassword] = useState('');

    const handleInitialNext = () => {
        setCurrentStep('password');
    };

    const handlePasswordNext = (pwd: string) => {
        setPassword(pwd);
        setCurrentStep('authenticator');
    };

    const handlePasswordBack = () => {
        setCurrentStep('initial');
    };

    const handleAuthenticatorBack = () => {
        setCurrentStep('password');
    };

    const handleSetupComplete = (totpCode: string) => {
        console.log('Setup complete!', { password, totpCode });

        // TODO: Call API to complete setup
        // const response = await fetch('/api/auth/setup', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ password, totpCode })
        // });

        // TODO: Store token and redirect to dashboard
        // localStorage.setItem('token', response.token);
        // navigate('/admin');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl">
                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-slate-100">
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
                            onComplete={handleSetupComplete}
                            onBack={handleAuthenticatorBack}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">
                        MindwaveDAO Admin Interface - Secure Setup
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Setup;
