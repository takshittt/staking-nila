import { Link, useNavigate } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';

const StartStaking = () => {
    const { open } = useAppKit();
    const { isConnected } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        if (isConnected && window.location.pathname === '/') {
            navigate('/dashboard');
        }
    }, [isConnected, navigate]);

    const handleConnect = () => {
        if (!isConnected) {
            open();
        }
    };

    return (
        <section className="py-24 relative overflow-hidden bg-[#EBE9E4]">
            {/* Subtle yellow hints and gradient overlay */}
            <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-yellow-100/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-[-50%] right-[-20%] w-[600px] h-[600px] bg-amber-50/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-white/20 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10 text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
                    Start Earning with NILA Today
                </h2>

                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                    Stake NILA and unlock instant rewards, predictable returns, and passive referral income.
                </p>

                {isConnected ? (
                    <Link to="/dashboard">
                        <button className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-gray-100/50">
                            Start Staking
                        </button>
                    </Link>
                ) : (
                    <button 
                        onClick={handleConnect}
                        className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-gray-100/50"
                    >
                        Connect Wallet & Start Staking
                    </button>
                )}
            </div>
        </section>
    );
};

export default StartStaking;
