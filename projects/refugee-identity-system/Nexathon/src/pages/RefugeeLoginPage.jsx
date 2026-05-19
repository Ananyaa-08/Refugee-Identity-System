import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    User,
    ArrowLeft,
    ArrowRight,
    Lock,
    Wallet,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    KeyRound,
    Fingerprint,
} from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useWallet } from '../context/WalletContext';
import { peraWallet, normalizePeraAccount } from '../utils/wallet';

const PIN_PATTERN = /^[A-Za-z]{4}\d{2}$/;

const STATUS_BADGES = {
    active: {
        label: 'ACTIVE',
        cls: 'bg-[#10b98115] text-[#10b981] border-[#10b98140]',
        dot: 'bg-[#10b981]',
    },
    migrated: {
        label: 'MIGRATED · SELF-SOVEREIGN',
        cls: 'bg-[#8b5cf615] text-[#c4b5fd] border-[#8b5cf640]',
        dot: 'bg-[#8b5cf6]',
    },
    pending_migration: {
        label: 'MIGRATION PENDING',
        cls: 'bg-[#f59e0b15] text-[#fcd34d] border-[#f59e0b40]',
        dot: 'bg-[#f59e0b]',
    },
    disabled: {
        label: 'DISABLED',
        cls: 'bg-[#ef444412] text-[#fca5a5] border-[#ef444440]',
        dot: 'bg-[#ef4444]',
    },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_BADGES[status] || STATUS_BADGES.active;
    return (
        <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] ${cfg.cls}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const RefugeeLoginPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { setManualAccount } = useWallet();

    const [stage, setStage] = useState('id'); // 'id' | 'pin' | 'wallet'
    const [refugeeId, setRefugeeId] = useState('');
    const [identityInfo, setIdentityInfo] = useState(null);
    const [probing, setProbing] = useState(false);
    const [pin, setPin] = useState('');
    const [pinSubmitting, setPinSubmitting] = useState(false);
    const [walletStatus, setWalletStatus] = useState('');
    const [walletSubmitting, setWalletSubmitting] = useState(false);
    const challengeRef = useRef(null);

    useEffect(() => {
        return () => {
            // Best-effort cleanup of any dangling Pera WalletConnect session.
            peraWallet.disconnect().catch(() => {});
        };
    }, []);

    const resetToIdStage = () => {
        setStage('id');
        setIdentityInfo(null);
        setPin('');
        setWalletStatus('');
        challengeRef.current = null;
    };

    const handleProbeIdentity = async (event) => {
        if (event) event.preventDefault();
        const value = refugeeId.trim();
        if (!value) {
            showToast('error', 'Missing Refugee ID', 'Enter the Refugee ID issued at registration.');
            return;
        }
        setProbing(true);
        try {
            const res = await api.verifyIdentity(value);
            const data = res?.data;
            if (!data) throw new Error('Identity not found.');
            setIdentityInfo(data);
            setRefugeeId(data.identity_id || value);
            if (data.auth_method === 'wallet') {
                setStage('wallet');
            } else {
                setStage('pin');
            }
        } catch (err) {
            const message = err?.message || '';
            if (/not found/i.test(message)) {
                showToast('error', 'Identity not found', 'No identity matches that Refugee ID.');
            } else if (/disabled/i.test(message)) {
                showToast('error', 'Identity disabled', message);
            } else {
                showToast('error', 'Access denied', message || 'Unable to verify identity.');
            }
        } finally {
            setProbing(false);
        }
    };

    const handlePinSubmit = async (event) => {
        if (event) event.preventDefault();
        if (!identityInfo) return;
        const normalized = pin.trim().toUpperCase();
        if (!PIN_PATTERN.test(normalized)) {
            showToast(
                'error',
                'Invalid PIN format',
                'PIN must be 4 letters followed by 2 digits (e.g. ABCD12).',
            );
            return;
        }
        setPinSubmitting(true);
        try {
            const res = await api.refugeeLoginPin(identityInfo.identity_id, normalized);
            const canonicalId = res?.data?.identity_id || identityInfo.identity_id;
            localStorage.setItem('refugee_identity_id', canonicalId);
            if (res?.data?.first_login) {
                showToast(
                    'success',
                    'PIN saved',
                    'Remember this PIN — you will need it to sign in again.',
                );
            } else {
                showToast('success', 'Welcome back', 'Identity verified.');
            }
            navigate('/refugee/dashboard');
        } catch (err) {
            const message = err?.message || '';
            if (/migrated/i.test(message)) {
                showToast('info', 'Identity migrated', message);
                // Re-probe so the UI can switch to wallet mode.
                handleProbeIdentity().catch(() => {});
            } else if (/invalid credentials/i.test(message)) {
                showToast('error', 'Invalid credentials', 'The PIN you entered is incorrect.');
            } else {
                showToast('error', 'Access denied', message || 'Unable to sign in.');
            }
        } finally {
            setPinSubmitting(false);
        }
    };

    const handleWalletSignIn = async () => {
        if (!identityInfo) return;
        if (!identityInfo.has_linked_wallet) {
            showToast('error', 'No wallet linked', 'This identity has no wallet linked yet.');
            return;
        }
        setWalletSubmitting(true);
        setWalletStatus('Connecting to Pera Wallet…');
        try {
            const accounts = await peraWallet.connect();
            const address = normalizePeraAccount(accounts[0]);
            if (!address) {
                throw new Error('No wallet address returned from Pera Wallet.');
            }

            // NOTE: we never reveal or compare the linked wallet on the frontend.
            // The backend is the sole authority that validates the signing
            // address matches the wallet linked to this Refugee ID.
            setWalletStatus('Requesting login challenge…');
            const challengeRes = await api.loginChallenge(identityInfo.identity_id);
            const challenge = challengeRes?.data?.challenge;
            if (!challenge) {
                throw new Error('Failed to obtain login challenge.');
            }
            challengeRef.current = challenge;

            setWalletStatus('Please sign the login challenge in Pera Wallet…');
            const promptMessage = `RIMS Refugee Login

Refugee ID: ${identityInfo.identity_id}
Challenge: ${challenge}

Sign to prove ownership of this self-sovereign identity.`;
            const msgBytes = new TextEncoder().encode(challenge);
            const signed = await peraWallet.signData(
                [{ data: msgBytes, message: promptMessage }],
                address,
            );
            const sigU8 = signed[0];
            const signatureB64 = btoa(String.fromCharCode(...sigU8));

            setWalletStatus('Verifying signature…');
            const verifyRes = await api.verifyLoginSignature({
                identity_id: identityInfo.identity_id,
                challenge,
                signature: signatureB64,
                address,
            });
            if (!verifyRes?.success) {
                throw new Error('Wallet verification failed.');
            }

            localStorage.setItem('refugee_identity_id', identityInfo.identity_id);
            setManualAccount(address);
            setWalletStatus('Signature verified. Loading dashboard…');
            showToast('success', 'Wallet verified', 'You are signed in with your self-sovereign identity.');
            setTimeout(() => navigate('/refugee/dashboard'), 350);
        } catch (err) {
            if (err?.data?.type === 'CONNECT_MODAL_CLOSED') {
                setWalletStatus('');
                return;
            }
            const raw = err?.message || '';
            const isMismatch = /verification failed|does not match/i.test(raw);
            const message = isMismatch
                ? 'The connected wallet is not the one linked to this Refugee ID. Open the correct wallet in Pera and try again.'
                : raw || 'Wallet authentication failed.';
            showToast('error', 'Wallet verification failed', message);
            setWalletStatus('');
            try {
                await peraWallet.disconnect();
            } catch (_) {
                /* no-op */
            }
        } finally {
            setWalletSubmitting(false);
        }
    };

    const identityIsCustodial = identityInfo?.wallet_type === 'custodial';
    const accentColor = identityIsCustodial ? '#00c9b1' : '#8b5cf6';

    return (
        <div className="min-h-screen bg-[#060d1f] text-[#e2eaf8] relative overflow-hidden page-enter">
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #1e3a5f 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    animation: 'pulseOpacity 4s ease-in-out infinite',
                }}
            />

            <button
                type="button"
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 text-[#7a94bb] text-xs font-bold uppercase tracking-[0.2em] hover:text-[#e2eaf8] transition-colors"
            >
                <ArrowLeft size={16} /> Back to portals
            </button>

            <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-16 h-16 bg-[#00c9b110] rounded-2xl flex items-center justify-center border border-[#00c9b130] mb-5 shadow-[0_0_30px_rgba(0,201,177,0.15)]">
                        <Shield size={32} className="text-[#00c9b1]" />
                    </div>
                    <p className="text-[#7a94bb] text-[10px] font-bold uppercase tracking-[0.4em] mb-3">
                        Refugee Identity Management System
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold text-[#e2eaf8] tracking-tight mb-3">
                        Refugee Portal Sign-In
                    </h1>
                    <p className="text-[#7a94bb] text-sm max-w-md leading-relaxed">
                        Securely access your identity and aid information using your Refugee ID. Your
                        login automatically adapts to whether your identity is custodial or self-owned.
                    </p>
                </div>

                <div
                    className="w-full max-w-md bg-[#0f1e38] border rounded-2xl shadow-2xl overflow-hidden transition-colors"
                    style={{ borderColor: identityInfo ? `${accentColor}40` : '#1a2d4a' }}
                >
                    <ProgressBar stage={stage} identityIsCustodial={identityIsCustodial} />

                    <div className="p-8 space-y-6">
                        {stage === 'id' && (
                            <IdentityIdStage
                                refugeeId={refugeeId}
                                setRefugeeId={setRefugeeId}
                                onSubmit={handleProbeIdentity}
                                loading={probing}
                            />
                        )}

                        {stage === 'pin' && identityInfo && (
                            <PinStage
                                identityInfo={identityInfo}
                                pin={pin}
                                setPin={setPin}
                                onSubmit={handlePinSubmit}
                                onBack={resetToIdStage}
                                submitting={pinSubmitting}
                            />
                        )}

                        {stage === 'wallet' && identityInfo && (
                            <WalletStage
                                identityInfo={identityInfo}
                                onConnect={handleWalletSignIn}
                                onBack={resetToIdStage}
                                submitting={walletSubmitting}
                                walletStatus={walletStatus}
                            />
                        )}
                    </div>
                </div>

                <p className="text-[#3d5278] text-[10px] uppercase tracking-[0.3em] mt-8 text-center">
                    All verification is performed server-side. Wallet addresses are never entered manually.
                </p>
            </div>
        </div>
    );
};

const ProgressBar = ({ stage, identityIsCustodial }) => {
    const steps = [
        { id: 'id', label: 'Refugee ID', icon: Fingerprint },
        identityIsCustodial
            ? { id: 'pin', label: 'Secret PIN', icon: KeyRound }
            : { id: 'wallet', label: 'Pera Wallet', icon: Wallet },
    ];
    const activeIdx = stage === 'id' ? 0 : 1;
    return (
        <div className="px-8 pt-6 pb-4 border-b border-[#1a2d4a] flex items-center gap-3">
            {steps.map((step, idx) => {
                const isActive = idx === activeIdx;
                const isDone = idx < activeIdx;
                const StepIcon = step.icon;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                    isActive
                                        ? 'bg-[#00c9b115] border-[#00c9b1] text-[#00c9b1]'
                                        : isDone
                                          ? 'bg-[#10b98115] border-[#10b981] text-[#10b981]'
                                          : 'bg-[#0a1428] border-[#1a2d4a] text-[#3d5278]'
                                }`}
                            >
                                {isDone ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                            </div>
                            <span
                                className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${
                                    isActive
                                        ? 'text-[#e2eaf8]'
                                        : isDone
                                          ? 'text-[#10b981]'
                                          : 'text-[#3d5278]'
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className="h-px flex-1 bg-[#1a2d4a]" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const IdentityIdStage = ({ refugeeId, setRefugeeId, onSubmit, loading }) => (
    <form onSubmit={onSubmit} className="space-y-5">
        <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#00c9b110] border border-[#00c9b130] flex items-center justify-center mx-auto">
                <User size={22} className="text-[#00c9b1]" />
            </div>
            <h2 className="text-[#e2eaf8] text-lg font-bold">Enter your Refugee ID</h2>
            <p className="text-[#7a94bb] text-xs leading-relaxed">
                The Refugee ID was printed on your registration card (e.g. <span className="font-mono text-[#e2eaf8]">REF-2026-001</span>).
            </p>
        </div>

        <div className="space-y-2">
            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">
                Refugee ID
            </label>
            <input
                placeholder="REF-2026-001"
                value={refugeeId}
                onChange={(event) => setRefugeeId(event.target.value)}
                autoFocus
                autoComplete="off"
                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#3d5278] focus:outline-none focus:border-[#00c9b1] font-mono"
            />
        </div>

        <button
            type="submit"
            disabled={loading || !refugeeId.trim()}
            className="w-full py-3 bg-[#00c9b1] text-[#060d1f] text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-[#00e0c5] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {loading ? (
                <>
                    <Loader2 size={16} className="animate-spin" /> Verifying identity…
                </>
            ) : (
                <>
                    Continue <ArrowRight size={16} />
                </>
            )}
        </button>
    </form>
);

const IdentitySummary = ({ identityInfo, modeLabel, modeDescription, accentColor }) => (
    <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: `${accentColor}40`, background: `${accentColor}0d` }}
    >
        <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: accentColor }}
            >
                {modeLabel}
            </span>
            <StatusBadge status={identityInfo.status} />
        </div>
        <p className="text-[#7a94bb] text-xs leading-relaxed">{modeDescription}</p>
        <div>
            <p className="text-[#3d5278] uppercase tracking-[0.2em] text-[9px] font-bold mb-1">
                Refugee ID
            </p>
            <p className="font-mono text-[#e2eaf8] text-[11px]">{identityInfo.identity_id}</p>
        </div>
    </div>
);

const PinStage = ({ identityInfo, pin, setPin, onSubmit, onBack, submitting }) => {
    const firstTime = identityInfo.requires_pin_setup;
    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <IdentitySummary
                identityInfo={identityInfo}
                modeLabel="Managed Identity Access"
                modeDescription="Your identity is currently held in a backend-managed custodial wallet (W1). Enter the private PIN you created at registration."
                accentColor="#00c9b1"
            />

            <div className="space-y-2">
                <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    <Lock size={12} /> {firstTime ? 'Create your secret PIN' : 'Enter your secret PIN'}
                </label>
                <input
                    placeholder="ABCD12"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    value={pin}
                    onChange={(event) =>
                        setPin(
                            event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase(),
                        )
                    }
                    className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-base text-white placeholder:text-[#3d5278] focus:outline-none focus:border-[#00c9b1] font-mono tracking-[0.3em] text-center uppercase"
                />
                <p className="text-[#3d5278] text-[10px] leading-relaxed">
                    {firstTime
                        ? 'First-time login — choose 4 letters followed by 2 digits. Memorise this PIN; only its hash is stored.'
                        : 'Format: 4 letters followed by 2 digits (e.g. ABCD12).'}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    type="submit"
                    disabled={submitting || !PIN_PATTERN.test(pin)}
                    className="w-full py-3 bg-[#00c9b1] text-[#060d1f] text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-[#00e0c5] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            {firstTime ? 'Saving PIN…' : 'Signing in…'}
                        </>
                    ) : (
                        <>
                            {firstTime ? 'Set PIN & sign in' : 'Sign in'}
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="w-full text-[10px] uppercase tracking-[0.2em] text-[#7a94bb] hover:text-[#e2eaf8] transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={12} /> Use a different Refugee ID
                </button>
            </div>
        </form>
    );
};

const WalletStage = ({ identityInfo, onConnect, onBack, submitting, walletStatus }) => {
    const hasLinkedWallet = Boolean(identityInfo.has_linked_wallet);
    return (
        <div className="space-y-5">
            <IdentitySummary
                identityInfo={identityInfo}
                modeLabel="Self-Owned Blockchain Identity"
                modeDescription={
                    identityInfo.status === 'migrated'
                        ? 'This identity has been migrated to a self-sovereign wallet (W2). Sign in by connecting Pera Wallet and signing a one-time challenge.'
                        : 'This identity is held in a self-sovereign Pera Wallet. Connect the wallet and sign a one-time challenge to authenticate.'
                }
                accentColor="#8b5cf6"
            />

            {!hasLinkedWallet && (
                <div className="rounded-xl border border-[#ef444440] bg-[#ef444412] px-4 py-3 flex gap-3">
                    <AlertTriangle size={16} className="text-[#fca5a5] shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                        <p className="text-[#fca5a5] font-bold">No wallet linked</p>
                        <p className="text-[#7a94bb] mt-1">
                            This identity has no linked wallet yet. Contact your aid worker.
                        </p>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-[#1a2d4a] bg-[#060d1f] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#7a94bb] text-[10px] font-bold uppercase tracking-[0.2em]">
                    <Wallet size={12} /> Wallet ownership check
                </div>
                <p className="text-[#7a94bb] text-[11px] leading-relaxed">
                    Connect Pera Wallet and sign the one-time challenge. The backend will verify
                    that the signing wallet matches the one linked to your Refugee ID — for your
                    privacy, the linked wallet address is never shown on this screen.
                </p>
            </div>

            {walletStatus && (
                <div className="rounded-xl border border-[#8b5cf640] bg-[#8b5cf612] px-4 py-3 flex gap-3 items-center">
                    <Loader2 size={16} className="text-[#c4b5fd] animate-spin shrink-0" />
                    <p className="text-[#c4b5fd] text-xs font-medium">{walletStatus}</p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={onConnect}
                    disabled={submitting || !hasLinkedWallet}
                    className="w-full py-3 bg-[#8b5cf6] text-white text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-[#7c3aed] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Working…
                        </>
                    ) : (
                        <>
                            <Wallet size={16} /> Connect Pera Wallet
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    disabled={submitting}
                    className="w-full text-[10px] uppercase tracking-[0.2em] text-[#7a94bb] hover:text-[#e2eaf8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <ArrowLeft size={12} /> Use a different Refugee ID
                </button>
            </div>
        </div>
    );
};

export default RefugeeLoginPage;
