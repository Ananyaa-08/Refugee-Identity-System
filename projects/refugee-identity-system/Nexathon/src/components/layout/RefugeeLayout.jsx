import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useIdentity } from '../../context/IdentityContext';

const RefugeeLayout = () => {
    const navigate = useNavigate();
    const { identity, refresh } = useIdentity();

    useEffect(() => {
        const id = (localStorage.getItem('refugee_identity_id') || '').trim();
        if (!id) {
            navigate('/', { replace: true });
            return;
        }
        refresh(id).catch(() => navigate('/', { replace: true }));
    }, [navigate, refresh]);

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8]">
            <Navbar role="refugee" walletAddress={identity?.old_wallet || ''} />
            <Sidebar
                role="refugee"
                walletAddress={identity?.old_wallet || ''}
                pendingRequests={0}
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
