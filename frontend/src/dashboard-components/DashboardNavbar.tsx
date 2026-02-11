import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import NotificationModal from './NotificationModal';
import { useDisconnect, useAccount } from 'wagmi';

interface DashboardNavbarProps {
    onMenuClick: () => void;
}

export default function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { disconnect } = useDisconnect();
    const { address, isConnected } = useAccount();

    const formatAddress = (addr?: string) => {
        if (!addr) return '0x000...000';
        return `${addr.slice(0, 6)}...${addr.slice(-3)}`;
    };

    const handleDisconnect = () => {
        disconnect();
    };

    // Monitor connection state and redirect when disconnected
    useEffect(() => {
        if (!isConnected) {
            navigate('/');
        }
    }, [isConnected, navigate]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [notificationRef]);

    return (
        <nav className="fixed right-0 top-0 z-40 transition-all duration-300 bg-white/90 backdrop-blur-md border-b border-gray-100 h-20 w-full md:w-[calc(100%-16rem)]">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-full font-sans">
                <div className="flex justify-between md:justify-end items-center h-full">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Right Action Section */}
                    <div className="flex items-center gap-4">
                        {/* Network Indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                            <span className="text-xs font-semibold text-slate-600">Nila Testnet</span>
                        </div>

                        {/* Wallet Info */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end mr-2">
                                <span className="text-xs text-slate-500 font-medium">{formatAddress(address)}</span>
                            </div>

                            {/* Notifications */}
                            <div className="relative" ref={notificationRef}>
                                <button
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className={`p-2 rounded-full hover:bg-slate-100 transition-colors relative ${isNotificationsOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
                                >
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                </button>
                                {isNotificationsOpen && <NotificationModal />}
                            </div>

                            {/* Disconnect Button */}
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all duration-300 text-sm font-semibold ml-2"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Disconnect</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
