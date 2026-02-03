import React from 'react';

const HowItWorks: React.FC = () => {
    const steps = [
        {
            id: '01',
            title: 'Connect Your Wallet',
            description: 'Connect your wallet securely to access the NILA staking dashboard.',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
        },
        {
            id: '02',
            title: 'Buy & Stake NILA',
            description: 'Purchase NILA using USDT directly from your wallet. Your NILA tokens are automatically staked into the smart contract.',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            id: '03',
            title: 'Earn Rewards',
            description: (
                <ul className="list-none space-y-1">
                    <li>• 5% instant cashback credited immediately</li>
                    <li>• Earn APY-based rewards</li>
                    <li>• Claim rewards every 30 days</li>
                </ul>
            ),
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
            ),
        },
        {
            id: '04',
            title: 'Referral Earnings',
            description: 'Invite others using your referral code and earn passive rewards automatically.',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
    ];

    return (
        <section id="how-it-works" className="py-20 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-100 bg-white mb-6 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E31E24]"></span>
                        <span className="uppercase tracking-wider text-xs font-bold text-gray-700">HOW IT WORKS</span>
                    </div>
                    <p className="font-manrope text-lg text-gray-500 max-w-2xl mx-auto">
                        Get started with NILA staking in 4 simple steps
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-[60px] left-0 w-full h-0.5 bg-gray-100 -z-10" />

                    {steps.map((step) => (
                        <div key={step.id} className="relative group">
                            <div className="flex flex-col items-center">
                                {/* Step Number Circle */}
                                <div className="w-28 h-28 rounded-full bg-white border-4 border-[#E31E24] flex items-center justify-center mb-6 relative z-10 shadow-lg transition-transform duration-300">
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="font-manrope font-bold text-4xl text-[#E31E24]">
                                            {step.id}
                                        </span>
                                        <div className="text-[#E31E24] mt-1">
                                            {step.icon}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-center space-y-3 px-2">
                                    <h3 className="font-manrope font-bold text-xl text-black">
                                        {step.title}
                                    </h3>
                                    <div className="font-manrope text-gray-500 leading-relaxed text-sm">
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
