import { useState } from 'react';
import DashboardNavbar from '../dashboard-components/DashboardNavbar';
import SidePanel from '../dashboard-components/SidePanel';
import StakeNila from '../dashboard-components/StakeNila';
import Rewards from '../dashboard-components/Rewards';
import Referrals from '../dashboard-components/Referrals';
import Transactions from '../dashboard-components/Transactions';

import ReferenceModal from '../components/ReferenceModal';
import { useWallet } from '../hooks/useWallet';
import { userApi } from '../services/userApi';
import { useEffect } from 'react';

import HomeDashboard from '../dashboard-components/HomeDashboard';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('Home');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showReferenceModal, setShowReferenceModal] = useState(false);
    const { address } = useWallet();

    useEffect(() => {
        const checkReferralStatus = async () => {
            if (!address) return;
            try {
                const user = await userApi.getUser(address);
                console.log('User referral status:', {
                    referredBy: user.referredBy,
                    isReferralSkipped: user.isReferralSkipped,
                    referralCode: user.referralCode
                });

                // Show modal if user hasn't been referred and hasn't skipped
                if (!user.referredBy && !user.isReferralSkipped) {
                    setTimeout(() => setShowReferenceModal(true), 500);
                }
            } catch (error) {
                console.error('Failed to check referral status:', error);
            }
        };

        checkReferralStatus();
    }, [address]);

    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardNavbar onMenuClick={() => setIsMobileMenuOpen(true)} />
            <SidePanel
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                }}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            <div className="pt-24 px-4 md:px-6 max-w-7xl mx-auto md:ml-64">

                {activeTab === 'Home' && <HomeDashboard onNavigate={setActiveTab} />}

                {activeTab === 'Stake Nila' && <StakeNila />}

                {activeTab === 'Rewards' && <Rewards />}

                {activeTab === 'Referrals' && <Referrals />}

                {activeTab === 'Transactions' && <Transactions />}
            </div>

            <ReferenceModal
                isOpen={showReferenceModal}
                onClose={() => setShowReferenceModal(false)}
                onSuccess={() => {
                    setShowReferenceModal(false);
                    // Refresh data if needed
                }}
            />
        </div>
    );
};

export default Dashboard;
