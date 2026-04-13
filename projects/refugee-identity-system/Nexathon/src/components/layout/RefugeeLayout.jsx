import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_REFUGEES, MOCK_ACCESS_REQUESTS } from '../../utils/mockData';

const RefugeeLayout = () => {
    const refugee = MOCK_REFUGEES[0];
    const pendingRequestsCount = MOCK_ACCESS_REQUESTS.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="refugee" walletAddress={refugee.walletAddress} />
            <Sidebar
                role="refugee"
                walletAddress={refugee.walletAddress}
                pendingRequests={pendingRequestsCount}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default RefugeeLayout;
