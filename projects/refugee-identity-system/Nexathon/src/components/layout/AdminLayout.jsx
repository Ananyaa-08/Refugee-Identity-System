import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_STATS } from '../../utils/mockData';

const AdminLayout = () => {
    // Demo admin wallet
    const ADMIN_WALLET = 'ADMIN8H2JKLM1NPQR3STU5VWX7YZ9ABCDE';

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="admin" walletAddress={ADMIN_WALLET} />
            <Sidebar
                role="admin"
                pendingMigrations={MOCK_STATS.pendingMigrations}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
