import React, { useMemo, useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { useWallet } from '../../context/WalletContext';
import { peraWallet } from '../../utils/wallet';
import { api } from '../../utils/api';
import { useIdentity } from '../../context/IdentityContext';

const RefugeeMigrationRequest = () => {
    const { showToast } = useToast();
    const { account, setManualAccount } = useWallet();
    const { identity } = useIdentity();

    const [newWallet, setNewWallet] = useState('');
    const [processing, setProcessing] = useState(false);
    const [sent, setSent] = useState(false);

    const w1 = identity?.old_wallet || '';
    const identityId = identity?.identity_id || '';

    const canRequest = useMemo(() => {
        return !!identityId && !!w1 && (identity?.status !== 'migrated');
    }, [identityId, w1, identity?.status]);

    const connectW2 = async () => {
        setProcessing(true);
        try {
            const accounts = await peraWallet.connect();
            const addr = accounts?.[0];
            if (!addr) throw new Error('No wallet selected');
            setManualAccount(addr);
            setNewWallet(addr);
            showToast('success', 'Wallet connected', 'New wallet (W2) is connected for signing.');
        } catch (e) {
            showToast('error', 'Wallet connection failed', e.message || 'Could not connect wallet.');
        } finally {
            setProcessing(false);
        }
    };

    const submit = async () => {
        if (!canRequest) return;
        const w2 = (newWallet || account || '').trim();
        if (!w2) {
            showToast('warning', 'Connect a wallet', 'Please connect your new wallet (W2) first.');
            return;
        }
        if (w2 === w1) {
            showToast('error', 'Invalid wallet', 'New wallet (W2) must be different from custodial wallet (W1).');
            return;
        }
        setProcessing(true);
        try {
            const challenge = await api.migrationMessage({ identity_id: identityId, old_wallet: w1, new_wallet: w2 });
            const msg = challenge?.data?.message;
            if (!msg) throw new Error('Missing challenge message from backend');

            await peraWallet.reconnectSession().catch(() => {});
            // Sign the backend-issued challenge (no on-chain tx here; only an off-chain signature).
            const signed = await peraWallet.signData([{ data: msg, message: msg }], w2);
            const signed_message = Array.isArray(signed) ? signed?.[0] : signed;
            if (!signed_message) throw new Error('Signature was not returned by wallet');

            await api.migrationSubmit({
                identity_id: identityId,
                old_wallet: w1,
                new_wallet: w2,
                signed_message,
            });

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
                        <div className="font-mono text-[#00c9b1] text-xs break-all select-all">{w1 || '—'}</div>
                    </div>
                </div>

                <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-[#7a94bb] text-xs font-bold uppercase tracking-widest">
                            <ShieldCheck size={14} /> New wallet (W2) for signing
                        </div>
                        <button
                            type="button"
                            onClick={connectW2}
                            disabled={processing}
                            className="px-4 py-2 bg-[#152342] border border-[#1a2d4a] rounded-lg text-[#e2eaf8] text-[11px] font-bold uppercase tracking-widest hover:border-[#8b5cf640] transition-colors disabled:opacity-60"
                        >
                            {processing ? 'Connecting…' : 'Connect Wallet'}
                        </button>
                    </div>

                    <input
                        value={newWallet}
                        readOnly
                        placeholder="Connect wallet to autofill W2 address"
                        className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl px-4 py-3 text-[#e2eaf8] text-sm font-mono"
                    />

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
        </div>
    );
};

export default RefugeeMigrationRequest;

