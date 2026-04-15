import React from 'react';
import { Activity, CheckCircle, XCircle, QrCode } from 'lucide-react';
import { useIdentity } from '../../context/IdentityContext';

const Pill = ({ ok, label }) => (
    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${ok ? 'bg-[#10b98115] text-[#10b981] border-[#10b98130]' : 'bg-[#ef444415] text-[#ef4444] border-[#ef444430]'}`}>
        {ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
        <span>{label}</span>
    </div>
);

const RefugeeBlockchainStatus = () => {
    const { identity } = useIdentity();
    const bc = identity?.blockchain || {};

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 tracking-tight flex items-center gap-3">
                    <Activity className="text-[#00c9b1]" /> Blockchain Status
                </h2>
                <p className="text-[#7a94bb] text-sm">Transparent view of your custodial wallet (W1) state in Algorand.</p>
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl space-y-8">
                <div className="flex flex-wrap gap-3">
                    <Pill ok={!!bc.funded} label={bc.funded ? 'Wallet funded' : 'Not funded'} />
                    <Pill ok={!!bc.opted_in} label={bc.opted_in ? 'Opted into app' : 'Not opted in'} />
                    <Pill ok={!!bc.local_state_exists} label={bc.local_state_exists ? 'Local state exists' : 'No local state'} />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-6">
                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Application ID</label>
                        <div className="font-mono text-[#e2eaf8] text-sm">{identity?.app_id ? String(identity.app_id) : '—'}</div>

                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mt-6 mb-2">W1 Balance</label>
                        <div className="font-mono text-[#e2eaf8] text-sm">
                            {typeof bc.amount_microalgos === 'number' ? `${bc.amount_microalgos} µAlgos` : '—'}
                        </div>

                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mt-6 mb-2">W1 Address</label>
                        <div className="font-mono text-[#00c9b1] text-xs break-all select-all">{identity?.old_wallet || '—'}</div>
                    </div>

                    <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-6">
                        <div className="flex items-center gap-2 text-[#7a94bb] text-xs font-bold uppercase tracking-widest mb-3">
                            <QrCode size={14} /> Migration QR payload
                        </div>
                        <p className="text-[#3d5278] text-[11px] leading-relaxed mb-3">
                            This payload is compatible with the migration system (contains `identity_id` + `old_wallet`).
                        </p>
                        <textarea
                            readOnly
                            value={identity?.qr_payload || ''}
                            className="w-full min-h-[120px] bg-[#0f1e38] border border-[#1a2d4a] rounded-lg p-3 font-mono text-[11px] text-[#e2eaf8]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefugeeBlockchainStatus;

