import { useState } from 'react';

const faqData = [
    {
        question: "Can I withdraw my stake early?",
        answer: "No. Staked NILA remains locked until the staking period ends."
    },
    {
        question: "When can I claim rewards?",
        answer: "Rewards are claimable every 30 days."
    },
    {
        question: "Is cashback instant?",
        answer: "Yes. 5% cashback is credited immediately after staking."
    },
    {
        question: "How do referrals work?",
        answer: "Both users receive rewards when staking occurs using a referral code."
    }
];

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-20 bg-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-linear-to-b from-red-50 to-transparent blur-3xl opacity-60" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-linear-to-t from-red-50 to-transparent blur-3xl opacity-60" />
            </div>

            <div className="container mx-auto px-6 relative z-10 max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-gray-500 text-lg">
                        Everything you need to know about NILA Staking
                    </p>
                </div>

                <div className="space-y-4">
                    {faqData.map((item, index) => (
                        <div
                            key={index}
                            className="group border border-gray-100 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-red-100"
                        >
                            <button
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-hidden"
                                onClick={() => toggleFAQ(index)}
                            >
                                <span className={`text-lg font-semibold transition-colors duration-300 ${openIndex === index ? 'text-red-600' : 'text-gray-800'
                                    }`}>
                                    {item.question}
                                </span>
                                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${openIndex === index ? 'bg-red-100 rotate-180' : 'bg-gray-50 group-hover:bg-red-50'
                                    }`}>
                                    <svg
                                        className={`w-5 h-5 transition-colors duration-300 ${openIndex === index ? 'text-red-600' : 'text-gray-400 group-hover:text-red-500'
                                            }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            <div
                                className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                    }`}
                            >
                                <div className="overflow-hidden">
                                    <div className="px-6 pb-5 pt-0 text-gray-600 leading-relaxed">
                                        {item.answer}
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

export default FAQ;
