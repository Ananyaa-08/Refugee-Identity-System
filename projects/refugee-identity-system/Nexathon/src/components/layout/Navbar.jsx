import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const Navbar = ({ role }) => {
    const navigate = useNavigate();
    const { account, connectWallet, disconnectWallet } = useWallet();

    const handleExit = async () => {
        await disconnectWallet();
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a1428] border-b border-[#1a2d4a] flex items-center justify-between px-6 z-40">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00c9b110] rounded-lg flex items-center justify-center border border-[#00c9b130]">
                    <Shield className="text-[#00c9b1]" size={24} />
                </div>
                <div>
                    <h1 className="font-mono text-[#00c9b1] text-lg font-bold leading-none tracking-widest">RIMS</h1>
                    <p className="text-[#7a94bb] text-[10px] uppercase tracking-tighter mt-0.5 font-medium">Refugee Identity Management</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {role === 'aid-worker' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b40]">
                        Aid Worker Portal
                    </span>
                ) : role === 'admin' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#8b5cf620] text-[#8b5cf6] border border-[#8b5cf640]">
                        Admin Portal
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00c9b120] text-[#00c9b1] border border-[#00c9b140]">
                        Refugee Portal
                    </span>
                )}

                <div className="flex items-center gap-2.5 bg-[#152342] border border-[#1a2d4a] rounded-lg px-3 py-1.5">
                    <div className={account ? "w-2 h-2 bg-[#10b981] rounded-full glow-teal" : "w-2 h-2 bg-[#ef4444] rounded-full"}></div>
                    <span className="font-mono text-[#00c9b1] text-xs font-medium tracking-tight">
                        {account ? `${account.slice(0, 7)}...${account.slice(-4)}` : 'DISCONNECTED'}
                    </span>
                </div>

                {!account ? (
                    <button onClick={connectWallet} className="text-xs font-bold bg-[#00c9b1] text-[#060d1f] px-4 py-1.5 rounded hover:bg-[#00e0c5] transition-colors shadow-[0_0_15px_rgba(0,201,177,0.2)]">
                        CONNECT
                    </button>
                ) : (
                    <button onClick={disconnectWallet} className="text-xs font-bold border border-[#ef4444] text-[#ef4444] px-4 py-1.5 rounded hover:bg-[#ef444420] transition-colors">
                        DISCONNECT
                    </button>
                )}

                {/* Global Exit Button - ALWAYS VISIBLE IN PORTALS */}
                <button
                    onClick={handleExit}
                    className="flex items-center gap-2 text-[#7a94bb] hover:text-[#ef4444] transition-colors border-l border-[#1a2d4a] pl-4 ml-2 group"
                    title="Exit to Portal Selection"
                >
                    <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Exit Portal</span>
                </button>
            </div>
        </nav>
    );
};
