import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, Package, Wallet, MapPin, Hash,
    Bell, Lock, ArrowRight, RefreshCw
} from 'lucide-react';
import { StatCard } from '../../components/ui/Common';
import { useIdentity } from '../../context/IdentityContext';
import { formatAddress } from '../../utils/format';

const RefugeeDashboard = () => {
    const navigate = useNavigate();
    const { identity } = useIdentity();

    return (
        <div className="page-enter space-y-8 pb-20">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[#7a94bb] text-lg mb-1 font-medium">Welcome back,</p>
                    <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-bold text-[#e2eaf8] tracking-tight">{identity?.name || 'Refugee'}</h2>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#10b98115] border border-[#10b98130] rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] glow-teal" />
                            <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">Verified Identity</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#3d5278] font-bold uppercase tracking-[0.15em]">
                        <span className="flex items-center gap-1.5"><MapPin size={14} /> On-Chain</span>
                        <span className="flex items-center gap-1.5"><Hash size={14} /> {identity?.identity_id || '—'}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                    icon={ShieldCheck}
                    label="Identity Status"
                    value={identity?.status === 'migrated' ? 'Migrated' : 'Active'}
                    accentColor="#00c9b1"
                />
                <StatCard
                    icon={Package}
                    label="Aid Entitlement"
                    value="Available"
                    accentColor="#f59e0b"
                    change="Claim with an aid worker"
                    changeType="down"
                />
                <StatCard
                    icon={Wallet}
                    label="Ownership"
                    value={identity?.status === 'migrated' ? 'Self-Sovereign' : 'Custodial (W1)'}
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
                        { label: 'Full Name', value: identity?.name || '—' },
                        { label: 'Refugee ID', value: identity?.identity_id || '—' },
                        { label: 'Custodial Wallet (W1)', value: identity?.old_wallet ? formatAddress(identity.old_wallet) : '—' },
                        { label: 'Application ID', value: identity?.app_id ? String(identity.app_id) : '—' },
                        { label: 'Status', value: identity?.status || '—' },
                        { label: 'Opted-in', value: identity?.blockchain?.opted_in ? 'Yes' : 'No' },
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
                        REQUEST MIGRATION <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefugeeDashboard;
