import { useState, useMemo } from 'react';
import { Info, ShieldCheck, Zap } from 'lucide-react';

const StakeNila = () => {
    const [selectedPackage, setSelectedPackage] = useState(10000);
    const [selectedDuration, setSelectedDuration] = useState(180);

    const packages = [
        { amount: 5000, baseCashback: 5, bonusCashback: 0 },
        { amount: 10000, baseCashback: 5, bonusCashback: 1 },
        { amount: 15000, baseCashback: 5, bonusCashback: 2 },
        { amount: 20000, baseCashback: 5, bonusCashback: 3 },
    ];

    const durations = [
        { days: 90, apy: 5 },
        { days: 180, apy: 6 },
        { days: 270, apy: 7 },
        { days: 360, apy: 8 },
    ];

    // Auto-calculate rewards
    const calculations = useMemo(() => {
        const pkg = packages.find(p => p.amount === selectedPackage) || packages[0];
        const dur = durations.find(d => d.days === selectedDuration) || durations[0];

        const totalCashbackPercent = pkg.baseCashback + pkg.bonusCashback;
        const instantCashbackAmount = Math.floor((selectedPackage * totalCashbackPercent) / 100);

        // Simple Interest Formula: Principal * Rate * Time
        // Rate is in decimal, Time is in years (days / 365)
        const apyRewards = Math.floor(selectedPackage * (dur.apy / 100) * (dur.days / 365));

        const totalRewards = instantCashbackAmount + apyRewards;

        return {
            pkg,
            dur,
            totalCashbackPercent,
            instantCashbackAmount,
            apyRewards,
            totalRewards
        };
    }, [selectedPackage, selectedDuration]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* Left Column: Selections */}
            <div className="lg:col-span-2 space-y-8">

                {/* Page Headline */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Stake NILA & Earn Rewards</h1>
                    <p className="text-slate-500">
                        Stake NILA securely and earn <span className="text-red-600 font-semibold">instant cashback</span> + APY rewards based on your selected package and duration.
                    </p>
                </div>

                {/* Step 1: Select Staking Package */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center">1</div>
                        <h2 className="text-xl font-bold text-slate-900">Choose Your Package</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {packages.map((pkg) => {
                            const totalPercent = pkg.baseCashback + pkg.bonusCashback;
                            const isSelected = selectedPackage === pkg.amount;

                            return (
                                <button
                                    key={pkg.amount}
                                    onClick={() => setSelectedPackage(pkg.amount)}
                                    className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 group ${isSelected
                                        ? 'border-red-600 bg-red-50/30'
                                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >


                                    <div className="mb-2">
                                        <span className="text-2xl font-bold text-slate-900">{pkg.amount.toLocaleString()}</span>
                                        <span className="text-sm font-medium text-slate-500 ml-1">NILA</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                            {totalPercent}% Cashback
                                        </span>
                                        {pkg.bonusCashback > 0 && (
                                            <span className="text-xs text-red-500 font-medium">
                                                (+{pkg.bonusCashback}% Bonus)
                                            </span>
                                        )}
                                    </div>

                                    {/* Optional: Add info icon with tooltip logic here if needed */}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                        <Info size={16} className="text-slate-400" />
                        Higher packages unlock additional instant cashback credited immediately after staking.
                    </p>
                </div>

                {/* Step 2: Select Lock Period */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-50 text-red-600 font-bold w-8 h-8 rounded-full flex items-center justify-center">2</div>
                        <h2 className="text-xl font-bold text-slate-900">Choose Staking Duration</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {durations.map((dur) => {
                            const isSelected = selectedDuration === dur.days;
                            return (
                                <button
                                    key={dur.days}
                                    onClick={() => setSelectedDuration(dur.days)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${isSelected
                                        ? 'border-red-600 bg-red-50/30'
                                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="text-xl font-bold text-slate-900 mb-1">{dur.days}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Days</div>
                                    <div className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold">
                                        {dur.apy}% APY
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                        <Info size={16} className="text-slate-400" />
                        <span>Longer lock periods earn higher APY. Staked NILA remains <span className="font-medium text-slate-700">locked</span> until maturity.</span>
                    </p>
                </div>
            </div>

            {/* Right Column: Live Reward Preview */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 sticky top-28 shadow-xl">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Zap className="text-yellow-400" size={20} />
                        </div>
                        <h3 className="text-xl font-bold">Staking Summary</h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Package Info */}
                        <div className="pb-6 border-b border-slate-700/50">
                            <div className="text-slate-400 text-sm mb-1">Selected Package</div>
                            <div className="text-2xl font-bold text-white">{selectedPackage.toLocaleString()} NILA</div>
                        </div>

                        {/* Lock Period Info */}
                        <div className="pb-6 border-b border-slate-700/50">
                            <div className="text-slate-400 text-sm mb-1">Lock Period</div>
                            <div className="text-2xl font-bold text-white flex items-center gap-2">
                                {selectedDuration} Days
                                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-normal">
                                    Maturity: {new Date(Date.now() + selectedDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Rewards Breakdown */}
                        <div className="space-y-3 pb-6 border-b border-slate-700/50">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm flex items-center gap-1">
                                    Instant Cashback
                                    <span title="Credited to your wallet immediately after staking" className="cursor-help">
                                        <Info size={12} className="text-slate-500" />
                                    </span>
                                </span>
                                <span className="text-green-400 font-bold">{calculations.instantCashbackAmount.toLocaleString()} NILA</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">APY ({calculations.dur.apy}%)</span>
                                <span className="text-green-400 font-bold">{calculations.apyRewards.toLocaleString()} NILA</span>
                            </div>
                        </div>

                        {/* Total Estimations */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">Estimated Total Rewards</div>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                                {calculations.totalRewards.toLocaleString()} NILA
                            </div>
                        </div>

                        {/* Helper Text */}
                        <div className="text-xs text-slate-400 space-y-1">
                            <p>• Instant cashback is credited immediately.</p>
                            <p>• APY rewards accumulate monthly and are claimable every 30 days.</p>
                        </div>

                        {/* Action Button */}
                        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-600/20 active:scale-[0.98] mt-2">
                            Buy & Stake NILA
                        </button>

                        <div className="flex items-start gap-2 text-xs text-slate-500 mt-4 text-center justify-center">
                            <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                            <span>By staking, you agree that your NILA will remain locked for the selected duration.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StakeNila;
