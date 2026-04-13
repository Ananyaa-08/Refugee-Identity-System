import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_STATS } from '../../utils/mockData';

const AidWorkerLayout = () => {
    // Common wallet for aid worker demo
    const AID_WORKER_WALLET = 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB';

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="aid-worker" walletAddress={AID_WORKER_WALLET} />
            <Sidebar
                role="aid-worker"
                pendingRequests={MOCK_STATS.pendingRequests}
                pendingMigrations={MOCK_STATS.pendingMigrations}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AidWorkerLayout;
