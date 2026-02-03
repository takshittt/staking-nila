import React from 'react';

const LandingRewards: React.FC = () => {
    const rewards = [
        {
            title: 'Instant Reward',
            subtitle: '5% Cashback',
            description: 'Credited instantly to your rewards balance when you stake.',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Staking Rewards',
            subtitle: 'APY-Based Returns',
            description: 'Calculated on-chain and distributed monthly.',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
        },
        {
            title: 'Flexible Claiming',
            subtitle: 'Claim rewards every 30 days',
            description: 'Claim rewards every 30 days while your stake remains locked.',
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
    ];

    return (
        <section className="py-20 bg-gray-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-100 bg-white mb-6 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E31E24]"></span>
                        <span className="uppercase tracking-wider text-xs font-bold text-gray-700">REWARDS</span>
                    </div>
                    <h2 className="font-manrope text-3xl md:text-4xl font-bold text-black mb-4">
                        Multiple Ways to Earn
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {rewards.map((reward, index) => (
                        <div key={index} className="bg-white rounded-2xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 border border-gray-100 flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-white border-[6px] border-red-50 flex items-center justify-center mb-8 text-[#E31E24] shadow-sm">
                                {reward.icon}
                            </div>
                            <h3 className="font-manrope font-bold text-xl text-black mb-3">
                                {reward.title}
                            </h3>
                            <div className="text-[#E31E24] font-bold text-lg mb-4">
                                {reward.subtitle}
                            </div>
                            <p className="font-manrope text-gray-500 leading-relaxed text-sm px-4">
                                {reward.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-16 flex justify-center">
                    <div className="inline-flex items-center gap-3 bg-white py-4 px-8 rounded-full border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.05)]">
                        <div className="w-5 h-5 rounded bg-[#E31E24] flex items-center justify-center text-white text-xs font-bold">!</div>
                        <p className="font-manrope text-sm text-gray-500">
                            Staked NILA remains locked for the selected period. Rewards accumulate separately and remain claimable.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LandingRewards;
