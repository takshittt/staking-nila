import { useState } from 'react';
import DashboardNavbar from '../dashboard-components/DashboardNavbar';
import SidePanel from '../dashboard-components/SidePanel';
import StakeNila from '../dashboard-components/StakeNila';
import Rewards from '../dashboard-components/Rewards';
import Referrals from '../dashboard-components/Referrals';
import Transactions from '../dashboard-components/Transactions';

import HomeDashboard from '../dashboard-components/HomeDashboard';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('Home');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        </div>
    );
};

export default Dashboard;
