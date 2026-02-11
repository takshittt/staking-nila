import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import Overview from '../components/Overview';
import StakingPlans from '../components/StakingPlans';
import Users from '../components/Users';
import Stakes from '../components/Stakes';
import Referrals from '../components/Referrals';
import Tokens from '../components/Tokens';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('Overview');

    const renderContent = () => {
        switch (activeTab) {
            case 'Overview':
                return <Overview />;
            case 'Staking Plans':
                return <StakingPlans />;
            case 'Users':
                return <Users />;
            case 'Stakes':
                return <Stakes />;
            case 'Referrals':
                return <Referrals />;
            case 'Tokens':
                return <Tokens />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:ml-64">
                <div className="p-4 md:p-8 mt-16 md:mt-0">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
