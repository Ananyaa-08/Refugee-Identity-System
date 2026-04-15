import React from 'react';
import { Fingerprint, Hash, Wallet, Calendar } from 'lucide-react';
import { useIdentity } from '../../context/IdentityContext';

const Row = ({ label, value, mono }) => (
    <div className="space-y-1">
        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">{label}</label>
        <div className={mono ? 'font-mono text-[#e2eaf8] text-sm break-all' : 'text-[#e2eaf8] text-sm font-semibold'}>
            {value || '—'}
        </div>
    </div>
);

const RefugeeIdentityDetails = () => {
    const { identity } = useIdentity();

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 tracking-tight flex items-center gap-3">
                    <Fingerprint className="text-[#00c9b1]" /> Identity Details
                </h2>
                <p className="text-[#7a94bb] text-sm">This identity is verified through backend custody records and on-chain local state (W1).</p>
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl">
                <div className="grid md:grid-cols-2 gap-8">
                    <Row label="Refugee ID" value={identity?.identity_id} mono />
                    <Row label="Name" value={identity?.name} />
                    <Row label="Linked Custodial Wallet (W1)" value={identity?.old_wallet} mono />
                    <Row
                        label="Status"
                        value={identity?.status === 'migrated' ? 'Migrated' : identity?.status === 'active' ? 'Active' : identity?.status}
                    />
                    <Row label="Application ID" value={identity?.app_id ? String(identity.app_id) : ''} mono />
                    <Row label="Issued At" value={identity?.created_at ? new Date(identity.created_at).toLocaleString() : ''} />
                </div>

                <div className="mt-10 grid md:grid-cols-3 gap-6">
                    <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-5">
                        <div className="flex items-center gap-2 text-[#7a94bb] text-xs font-bold uppercase tracking-widest mb-2">
                            <Hash size={14} /> Identity proofs
                        </div>
                        <p className="text-[#3d5278] text-[11px] leading-relaxed">
                            Proof hashes (identity/personhood/age) are stored on-chain and are not displayed as raw data.
                        </p>
                    </div>
                    <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-5">
                        <div className="flex items-center gap-2 text-[#7a94bb] text-xs font-bold uppercase tracking-widest mb-2">
                            <Wallet size={14} /> Custodial custody
                        </div>
                        <p className="text-[#3d5278] text-[11px] leading-relaxed">
                            Your wallet (W1) private key never leaves the backend. You can request migration to a self-sovereign wallet (W2).
                        </p>
                    </div>
                    <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-5">
                        <div className="flex items-center gap-2 text-[#7a94bb] text-xs font-bold uppercase tracking-widest mb-2">
                            <Calendar size={14} /> Auditability
                        </div>
                        <p className="text-[#3d5278] text-[11px] leading-relaxed">
                            All critical identity operations are verifiable on Algorand via local state and recorded actions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefugeeIdentityDetails;

