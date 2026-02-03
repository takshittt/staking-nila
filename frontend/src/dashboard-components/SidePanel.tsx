import { Home, Wallet, Gift, Users, History, X } from 'lucide-react';
import { useEffect } from 'react';

interface SidePanelProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

const SidePanel = ({ activeTab, onTabChange, isOpen, onClose }: SidePanelProps) => {
    const menuItems = [
        { name: 'Home', icon: Home },
        { name: 'Stake Nila', icon: Wallet },
        { name: 'Rewards', icon: Gift },
        { name: 'Referrals', icon: Users },
        { name: 'Transactions', icon: History },
    ];

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-100 z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="relative">
                            <img
                                src="/nila-logo-alt-2.png"
                                alt="Nilla"
                                className="h-8 w-8 relative z-10"
                            />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                            MindwaveDAO
                        </span>
                    </div>
                </div>

                <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => onTabChange(item.name)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.name
                                ? 'bg-red-50 text-red-600 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${activeTab === item.name ? 'text-red-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>


                <div className="absolute bottom-8 left-0 w-full px-4">
                    {/* 'Need Help' section removed as per user request */}
                </div>

            </aside>
        </>
    );
};

export default SidePanel;
