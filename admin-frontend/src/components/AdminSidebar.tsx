import { BarChart3, TrendingUp, Users, Zap, Users2, Coins, Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { name: 'Overview', icon: BarChart3 },
        { name: 'Staking Plans', icon: TrendingUp },
        { name: 'Users', icon: Users },
        { name: 'Stakes', icon: Zap },
        { name: 'Referrals', icon: Users2 },
        { name: 'Tokens', icon: Coins },
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

    const handleTabChange = (tab: string) => {
        onTabChange(tab);
        setIsOpen(false);
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-40 md:hidden p-2 rounded-lg bg-red-600 border border-red-700 hover:bg-red-700"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <Menu className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-screen w-64 bg-red-600 border-r border-red-700 z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-red-700">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="relative">
                            <img
                                src="/mw-logo-light.webp"
                                alt="MindwaveDAO"
                                className="h-8 w-8 relative z-10"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-white">
                                MindwaveDAO
                            </span>
                            <span className="text-xs text-red-100 font-medium">Admin</span>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => handleTabChange(item.name)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                activeTab === item.name
                                    ? 'bg-white/20 text-white font-semibold'
                                    : 'text-red-100 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <item.icon
                                className={`w-5 h-5 ${
                                    activeTab === item.name
                                        ? 'text-white'
                                        : 'text-red-200 group-hover:text-white'
                                }`}
                            />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>

                {/* Logout Button */}
                <div className="p-4 border-t border-red-700">
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-100 hover:bg-white/10 hover:text-white transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5 text-red-200" />
                        <span>Logout</span>
                    </button>
                </div>

            </aside>
        </>
    );
};

export default AdminSidebar;
