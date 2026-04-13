import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, Package, Wallet, MapPin, Hash,
    Bell, Lock, ArrowRight, RefreshCw
} from 'lucide-react';
import { MOCK_REFUGEES, MOCK_ACCESS_REQUESTS } from '../../utils/mockData';
import { StatCard } from '../../components/ui/Common';

const RefugeeDashboard = () => {
    const navigate = useNavigate();
    const refugee = MOCK_REFUGEES[0];
    const pendingRequests = MOCK_ACCESS_REQUESTS.filter(r => r.status === 'pending');

    return (
        <div className="page-enter space-y-8 pb-20">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[#7a94bb] text-lg mb-1 font-medium">Welcome back,</p>
                    <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-bold text-[#e2eaf8] tracking-tight">{refugee.name}</h2>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#10b98115] border border-[#10b98130] rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] glow-teal" />
                            <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">Verified Identity</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#3d5278] font-bold uppercase tracking-[0.15em]">
                        <span className="flex items-center gap-1.5"><MapPin size={14} /> {refugee.campID}</span>
                        <span className="flex items-center gap-1.5"><Hash size={14} /> {refugee.id}</span>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {pendingRequests.length > 0 && (
                <div className="bg-[#f59e0b10] border border-[#f59e0b30] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f59e0b15] text-[#f59e0b] rounded-full flex items-center justify-center shrink-0">
                            <Bell size={20} />
                        </div>
                        <p className="text-[#e2eaf8] text-sm font-semibold">
                            You have <span className="text-[#f59e0b]">{pendingRequests.length} access request</span> waiting for your authorization.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/refugee/requests')}
                        className="w-full md:w-auto px-6 py-2 border border-[#f59e0b] text-[#f59e0b] text-xs font-bold rounded-lg hover:bg-[#f59e0b15] transition-all flex items-center justify-center gap-2"
                    >
                        REVIEW NOW <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                    icon={ShieldCheck}
                    label="Identity Status"
                    value="Proven"
                    accentColor="#00c9b1"
                />
                <StatCard
                    icon={Package}
                    label="Aid Entitlement"
                    value={refugee.aidClaimed ? "Issued" : "Available"}
                    accentColor="#f59e0b"
                    change={refugee.aidClaimed ? "Last: 48h ago" : "Claim Now"}
                    changeType={refugee.aidClaimed ? "up" : "down"}
                />
                <StatCard
                    icon={Wallet}
                    label="Ownership"
                    value="Self-Sovereign"
                    accentColor="#3b82f6"
                />
            </div>

            {/* Identity Record Card */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#1a2d4a]">
                    <div className="flex items-center gap-3">
                        <Lock size={20} className="text-[#00c9b1]" />
                        <h3 className="text-[#e2eaf8] font-bold text-lg uppercase tracking-wider">Authenticated Identity Record</h3>
                    </div>
                    <div className="text-[10px] text-[#3d5278] font-mono uppercase tracking-widest">Stored on Algorand Ledger</div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-12">
                    {[
                        { label: 'Full Name', value: refugee.name },
                        { label: 'Nationality', value: refugee.nationality },
                        { label: 'Place of Birth', value: 'Homs, Syria' },
                        { label: 'Gender', value: refugee.gender },
                        { label: 'Camp ID', value: refugee.campID },
                        { label: 'Languages', value: refugee.languages.join(', ') },
                        { label: 'Family Status', value: 'Married with Children' },
                    ].map((item, i) => (
                        <div key={i} className="space-y-1">
                            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">{item.label}</label>
                            <div className="text-[#e2eaf8] text-sm font-semibold">{item.value}</div>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-[#3d5278] text-[10px] italic">
                    Identity, personhood, and age attestation hashes are stored securely on the Algorand blockchain and are not displayed.
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-8">
                <div
                    onClick={() => navigate('/refugee/requests')}
                    className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 cursor-pointer hover:border-[#00c9b1] transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#00c9b105] rounded-full group-hover:bg-[#00c9b110] transition-colors" />
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-14 h-14 bg-[#00c9b115] text-[#00c9b1] rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-[#e2eaf8] font-bold text-xl mb-1 flex items-center gap-3">
                                Grant Access
                                {pendingRequests.length > 0 && <span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full glow-teal animate-pulse" />}
                            </h3>
                            <p className="text-[#7a94bb] text-sm tracking-wide">Manage permissions for aid workers and officials.</p>
                        </div>
                    </div>
                    <button className="text-[#00c9b1] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all whitespace-nowrap">
                        MANAGE DATA CONSENT <ArrowRight size={16} />
                    </button>
                </div>

                <div
                    onClick={() => navigate('/refugee/migration')}
                    className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 cursor-pointer hover:border-[#8b5cf6] transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#8b5cf605] rounded-full group-hover:bg-[#8b5cf610] transition-colors" />
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-14 h-14 bg-[#8b5cf615] text-[#8b5cf6] rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                            <RefreshCw size={32} />
                        </div>
                        <div>
                            <h3 className="text-[#e2eaf8] font-bold text-xl mb-1">Backup & Migration</h3>
                            <p className="text-[#7a94bb] text-sm tracking-wide">Secure your recovery keys or migrate to a new device.</p>
                        </div>
                    </div>
                    <button className="text-[#8b5cf6] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-4 transition-all whitespace-nowrap">
                        START SECURITY WIZARD <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefugeeDashboard;
