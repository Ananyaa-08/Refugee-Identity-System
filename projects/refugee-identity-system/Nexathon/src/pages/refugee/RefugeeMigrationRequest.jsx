import React, { useMemo, useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { useIdentity } from '../../context/IdentityContext';
import { formatAddress } from '../../utils/format';

const RefugeeMigrationRequest = () => {
    const { showToast } = useToast();
    const { identity } = useIdentity();

    const [processing, setProcessing] = useState(false);
    const [sent, setSent] = useState(false);

    const w1 = identity?.old_wallet || '';
    const identityId = identity?.identity_id || '';

    const canRequest = useMemo(() => {
        return !!identityId && !!w1 && (identity?.status !== 'migrated');
    }, [identityId, w1, identity?.status]);

    const submit = async () => {
        if (!canRequest) return;
        setProcessing(true);
        try {
            await api.migrationSubmitLite(identityId);

            setSent(true);
            showToast('success', 'Request submitted', 'Your migration request is pending admin approval.');
        } catch (e) {
            showToast('error', 'Migration request failed', e.message || 'Could not submit request.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 tracking-tight flex items-center gap-3">
                    <RefreshCw className="text-[#8b5cf6]" /> Request Wallet Migration
                </h2>
                <p className="text-[#7a94bb] text-sm">
                    This flow only signs a backend-issued challenge. All on-chain execution is performed by administrators.
                </p>
            </div>

            {!canRequest && (
                <div className="bg-[#ef444410] border border-[#ef444430] rounded-xl p-4 flex gap-4 items-start">
                    <AlertTriangle className="text-[#ef4444] shrink-0" size={20} />
                    <div className="space-y-1">
                        <p className="text-[#e2eaf8] text-sm font-semibold">Migration not available</p>
                        <p className="text-[#7a94bb] text-xs">
                            Your identity is missing, not active, or already migrated.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Refugee ID</label>
                        <div className="font-mono text-[#e2eaf8] text-sm break-all">{identityId || '—'}</div>
                    </div>
                    <div>
                        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Custodial Wallet (W1)</label>
                        <div className="font-mono text-[#00c9b1] text-xs" title={w1 || ''}>
                            {w1 ? formatAddress(w1) : '—'}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canRequest || processing || sent}
                        className={clsx(
                            'px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2',
                            sent
                                ? 'bg-[#10b98115] text-[#10b981] border border-[#10b98130]'
                                : 'bg-[#8b5cf6] text-[#060d1f] hover:bg-[#9f7aea] active:scale-95',
                            (!canRequest || processing) && 'opacity-60 cursor-not-allowed'
                        )}
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <CheckCircle size={16} /> : null}
                        {sent ? 'Request sent (pending)' : 'Submit migration request'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefugeeMigrationRequest;

