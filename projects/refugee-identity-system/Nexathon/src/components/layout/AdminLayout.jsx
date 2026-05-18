import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MOCK_STATS } from '../../utils/mockData';
import {
    getAdminLoginMethod,
    getAdminWalletAddress,
    isAdminAuthenticated,
} from '../../utils/adminAuth';
import { useWallet } from '../../context/WalletContext';

const AdminLayout = () => {
    const { account, connectWallet } = useWallet();

    if (!isAdminAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    const loginMethod = getAdminLoginMethod();
    const adminWallet = getAdminWalletAddress();
    const needsWalletConnect =
        loginMethod === 'password' && !adminWallet && !account;

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="admin" />
            <Sidebar
                role="admin"
                pendingMigrations={MOCK_STATS.pendingMigrations}
            />
            <main className="ml-[240px] pt-16 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    {needsWalletConnect && (
                        <div className="mb-6 rounded-xl border border-[#8b5cf640] bg-[#8b5cf612] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-[#e2eaf8]">Deployer wallet not connected</p>
                                <p className="text-xs text-[#7a94bb] mt-1">
                                    You signed in with a password. Connect your deployer wallet to perform on-chain admin actions.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={connectWallet}
                                className="shrink-0 text-xs font-bold bg-[#8b5cf6] text-white px-5 py-2.5 rounded-lg hover:bg-[#7c3aed] transition-colors"
                            >
                                CONNECT DEPLOYER WALLET
                            </button>
                        </div>
                    )}
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
