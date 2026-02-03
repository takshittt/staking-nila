import React from 'react';

const LandingReferral: React.FC = () => {
    return (
        <section id="referral" className="py-20 bg-slate-900 text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left: Content */}
                    <div className="space-y-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 bg-slate-800/50 mb-6">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E31E24]"></span>
                                <span className="uppercase tracking-wider text-xs font-bold text-slate-300">REFER & EARN</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-manrope font-bold leading-tight mb-6">
                                Earn More with <span className="text-[#E31E24]">Referrals</span>
                            </h2>
                            <p className="text-slate-400 text-lg max-w-lg">
                                Invite others to stake NILA and earn rewards automatically. Get instant commissions on every successful referral.
                            </p>
                        </div>

                        {/* Reward Table */}
                        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700 mb-4 text-sm uppercase tracking-wider text-slate-400 font-bold">
                                <div>Participant</div>
                                <div>Reward</div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="font-semibold text-white">You (Referrer)</div>
                                    <div className="text-[#E31E24] font-bold text-xl">5% reward</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="font-semibold text-slate-300">New User</div>
                                    <div className="text-emerald-400 font-bold">3% bonus reward</div>
                                </div>
                            </div>
                        </div>

                        {/* Feature List */}
                        <ul className="space-y-4">
                            {[
                                'Instant distribution to your wallet',
                                'No limits on number of referrals',
                                'Fully on-chain transparent tracking'
                            ].map((item, index) => (
                                <li key={index} className="flex items-center gap-3 text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-[#E31E24]/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-[#E31E24]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right: Stats Mockup */}
                    <div className="relative">
                        {/* Background Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E31E24]/20 rounded-full blur-[100px] -z-10" />

                        {/* Card Container */}
                        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-6 border-b border-slate-700/50">
                                <div>
                                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Referral Earnings</h3>
                                    <div className="text-3xl font-bold text-white mt-1">12,450.00 NILA</div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-[#E31E24]/10 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#E31E24]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div>
                                <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Recent Activity</h4>
                                <div className="space-y-4">
                                    {[
                                        { wallet: '0x71...3A29', amount: '+ 450 NILA', time: '2 mins ago' },
                                        { wallet: '0x9B...8C12', amount: '+ 1,200 NILA', time: '1 hour ago' },
                                        { wallet: '0x3F...E941', amount: '+ 320 NILA', time: '4 hours ago' }
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs text-slate-300">
                                                    {item.wallet.slice(2, 4)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-200">Referred User</div>
                                                    <div className="text-xs text-slate-500">{item.time}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-emerald-400 text-sm font-bold">{item.amount}</div>
                                                <div className="text-xs text-slate-500">{item.wallet}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Referral Link Box */}
                            <div className="pt-2">
                                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Your Referral Link</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 px-4 py-3 text-slate-300 text-sm truncate font-mono">
                                        https://nila.staking/ref/david
                                    </div>
                                    <button className="bg-[#E31E24] hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors">
                                        Copy
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default LandingReferral;
