import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    UserPlus, QrCode, Search, Key, Package, ArrowLeftRight,
    LayoutDashboard, ShieldCheck, RefreshCw, Link as LinkIcon,
    ClipboardList, Users, Settings, Shield
} from 'lucide-react';
import { clsx } from 'clsx';

const NavItem = ({ to, icon: Icon, label, badge, amberDot, activeColor = 'text-[#00c9b1]', activeBg = 'bg-[#00c9b115]', activeBorder = 'border-[#00c9b1]' }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => clsx(
                "group flex items-center gap-3 px-4 py-3 rounded-lg mx-2 cursor-pointer transition-all duration-200",
                isActive
                    ? `${activeBg} ${activeColor} border-l-2 ${activeBorder} rounded-l-none`
                    : "text-[#7a94bb] hover:bg-[#152342] hover:text-[#e2eaf8]"
            )}
        >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{label}</span>
            {badge > 0 && (
                <span className="bg-[#f59e0b20] text-[#f59e0b] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#f59e0b40]">
                    {badge}
                </span>
            )}
            {amberDot && (
                <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full"></div>
            )}
        </NavLink>
    );
};

export const Sidebar = ({ role, pendingRequests, pendingMigrations, walletAddress }) => {
    const isAdmin = role === 'admin';

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#0a1428] border-r border-[#1a2d4a] flex flex-col z-30 pt-20">
            <div className="flex-1 overflow-y-auto py-4">
                {isAdmin ? (
                    <label className="block text-[#8b5cf6] text-[10px] font-bold uppercase tracking-[0.2em] px-6 mb-4 mt-2">
                        ADMIN PANEL
                    </label>
                ) : (
                    <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] px-6 mb-4 mt-2">
                        OPERATIONS
                    </label>
                )}

                <div className="space-y-1">
                    {role === 'aid-worker' ? (
                        <>
                            <NavItem to="/aid-worker/register" icon={UserPlus} label="Register Refugee" />
                            <NavItem to="/aid-worker/scan" icon={QrCode} label="Scan QR" />
                            <NavItem to="/aid-worker/search" icon={Search} label="Search Refugee" />
                            <NavItem to="/aid-worker/access" icon={Key} label="Request Access" amberDot={pendingRequests > 0} />
                            <NavItem to="/aid-worker/aid" icon={Package} label="Aid Distribution" />
                        </>
                    ) : role === 'refugee' ? (
                        <>
                            <NavItem to="/refugee/dashboard" icon={LayoutDashboard} label="Dashboard" />
                            <NavItem to="/refugee/requests" icon={ShieldCheck} label="Access Requests" badge={pendingRequests} />
                            <NavItem to="/refugee/migration" icon={RefreshCw} label="Wallet Migration" />
                        </>
                    ) : (
                        <>
                            <NavItem
                                to="/admin/dashboard"
                                icon={LayoutDashboard}
                                label="Overview"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/migrations"
                                icon={ArrowLeftRight}
                                label="Migration Approvals"
                                badge={pendingMigrations}
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/audit"
                                icon={ClipboardList}
                                label="Audit Log"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/refugees"
                                icon={Users}
                                label="Registered Refugees"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                            <NavItem
                                to="/admin/status"
                                icon={Settings}
                                label="System Status"
                                activeColor="text-[#8b5cf6]"
                                activeBg="bg-[#8b5cf615]"
                                activeBorder="border-[#8b5cf6]"
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-[#1a2d4a] space-y-4">
                {role === 'refugee' ? (
                    <div className="bg-[#00c9b105] border border-[#00c9b110] rounded-xl p-3">
                        <label className="block text-[#7a94bb] text-[10px] font-medium uppercase tracking-widest mb-2">
                            Connected Wallet
                        </label>
                        <div className="font-mono text-[#00c9b1] text-[11px] break-all p-2 bg-[#00c9b108] rounded-lg border border-[#00c9b115] leading-relaxed">
                            {walletAddress}
                        </div>
                    </div>
                ) : role === 'admin' ? (
                    <div className="space-y-1">
                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">
                            Admin Access
                        </label>
                        <div className="flex items-center gap-2 text-[#8b5cf6] text-[11px] font-mono">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse"></div>
                            Algorand TestNet
                        </div>
                    </div>
                ) : null}

                {role !== 'admin' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[#3d5278] text-[11px] font-medium">
                            <LinkIcon size={12} className="text-[#3d5278]" />
                            <span>Secured by Algorand</span>
                        </div>
                        <div className="font-mono text-[#3d5278] text-[10px] uppercase tracking-wider pl-5">
                            Algorand TestNet
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};
