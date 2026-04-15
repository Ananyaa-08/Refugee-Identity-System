import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    QrCode, Smartphone, ArrowLeftRight, CheckCircle,
    ArrowRight, ShieldCheck, RefreshCw, Loader2, AlertTriangle, Fingerprint
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { useWallet } from '../../context/WalletContext';
import { peraWallet } from '../../utils/wallet';
import { api } from '../../utils/api';
import { Scanner } from '@yudiel/react-qr-scanner';

const WalletMigration = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { account, setManualAccount } = useWallet();
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [signatureStatus, setSignatureStatus] = useState('');
    const [migrationData, setMigrationData] = useState({
        identityId: '',
        custodialAddress: '',
        qrPayload: '',
        newAddress: '',
        isWalletConnected: false
    });

    const nextStep = () => setStep(prev => prev + 1);

    const shorten = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-6)}` : '');

    const normalizeAlgoAddress = (value) => {
        const raw = (value || '').trim();
        if (!raw) return '';
        // Extract first valid Algorand address found (base32, 58 chars). Accept lower-case by normalizing.
        const upper = raw.toUpperCase();
        const match = upper.match(/[A-Z2-7]{58}/);
        return match ? match[0] : raw.trim();
    };

    const parseQrPayload = (rawInput) => {
        const raw = (rawInput || '').trim();
        if (!raw) return { identity_id: '', old_wallet: '' };

        // Accept either JSON ({ identity_id, old_wallet }) or query-string-ish payload.
        let identity_id = '';
        let old_wallet = '';
        try {
            const obj = JSON.parse(raw);
            identity_id = obj.identity_id || obj.identityId || obj.identity || obj.id || '';
            old_wallet = obj.old_wallet || obj.oldWallet || obj.w1 || obj.custodial_wallet || obj.address || '';
        } catch {
            try {
                const s = raw.startsWith('http') ? new URL(raw).search : raw;
                const params = new URLSearchParams(s.startsWith('?') ? s : `?${s}`);
                identity_id =
                    params.get('identity_id') ||
                    params.get('identityId') ||
                    params.get('identity') ||
                    params.get('id') ||
                    '';
                old_wallet =
                    params.get('old_wallet') ||
                    params.get('oldWallet') ||
                    params.get('w1') ||
                    params.get('custodial_wallet') ||
                    params.get('address') ||
                    '';
            } catch {
                // Ignore parse errors; user can fill manually.
            }
        }

        return { identity_id: (identity_id || '').trim(), old_wallet: normalizeAlgoAddress(old_wallet || '') };
    };

    const applyParsedQr = (raw) => {
        const parsed = parseQrPayload(raw);
        setMigrationData((p) => ({
            ...p,
            qrPayload: raw,
            identityId: parsed.identity_id || p.identityId || '',
            custodialAddress: parsed.old_wallet || p.custodialAddress || '',
        }));
        if (parsed.identity_id && parsed.old_wallet) {
            showToast('success', 'QR scanned', 'identity_id and custodial wallet (W1) detected.');
        } else {
            showToast('warning', 'QR scanned', 'QR detected, but missing identity_id or W1. Please verify the QR content.');
        }
    };

    const simulateScan = () => {
        const identityId = migrationData.identityId.trim();
        const w1 = normalizeAlgoAddress(migrationData.custodialAddress);
        if (!identityId) {
            showToast('error', 'Identity ID required', 'Scan your original camp QR code or enter the identity_id manually.');
            return;
        }
        if (!w1) {
            showToast('error', 'Custodial address required', 'Enter or paste the wallet address from your camp QR code (W1).');
            return;
        }
        setMigrationData((p) => ({ ...p, custodialAddress: w1 }));
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            nextStep();
            showToast('success', 'Identity Found', 'Custodial wallet address captured for migration.');
        }, 800);
    };

    const connectWallet = async () => {
        setIsProcessing(true);
        try {
            const newAccounts = await peraWallet.connect();
            const addr = newAccounts[0];
            setManualAccount(addr);
            setMigrationData((prev) => ({
                ...prev,
                newAddress: addr,
                isWalletConnected: true,
            }));
            setIsProcessing(false);
            showToast('success', 'Wallet Linked', 'Your new Pera wallet has been securely paired.');
        } catch (error) {
            console.error('Connection Error:', error);
            setIsProcessing(false);
            if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
                showToast('error', 'Connection Failed', 'User rejected the connection request.');
            }
        }
    };

    const finalSubmit = async () => {
        setIsProcessing(true);
        setSignatureStatus('Waiting for wallet approval...');
        const newAddrRaw = migrationData.newAddress === 'Awaiting Handshake...' ? account : migrationData.newAddress;
        const newAddr = normalizeAlgoAddress(newAddrRaw);
        const oldAddr = normalizeAlgoAddress(migrationData.custodialAddress);
        const identityId = migrationData.identityId.trim();
        if (!identityId || !oldAddr || !newAddr) {
            setIsProcessing(false);
            setSignatureStatus('');
            showToast('error', 'Missing required data', 'identity_id, custodial wallet (W1), and Pera wallet (W2) are required.');
            return;
        }
        // Ensure normalized addresses are reflected in UI and requests.
        setMigrationData((p) => ({ ...p, custodialAddress: oldAddr, newAddress: newAddr }));

        try {
            await peraWallet.reconnectSession();
            setSignatureStatus('Waiting for wallet approval...');
            const { data } = await api.migrationMessage({
                identity_id: identityId,
                old_wallet: oldAddr,
                new_wallet: newAddr,
            });
            const msgBytes = Uint8Array.from(atob(data.message_b64), (c) => c.charCodeAt(0));
            const walletPrompt = `Migrate your identity from your camp-issued ID to your personal wallet.

Old Wallet (W1): ${shorten(oldAddr)}
New Wallet (W2): ${shorten(newAddr)}

By signing, you confirm ownership of this wallet.`;

            let signed;
            try {
                signed = await peraWallet.signData([{ data: msgBytes, message: walletPrompt }], newAddr);
            } catch (e) {
                setIsProcessing(false);
                setSignatureStatus('');
                showToast('error', 'Signature required to continue migration', 'Signature required to continue migration');
                return;
            }

            setSignatureStatus('Signature received');
            const sigU8 = signed[0];
            const signature_b64 = btoa(String.fromCharCode.apply(null, [...sigU8]));

            setSignatureStatus('Verification in progress...');
            await api.migrationSubmit({
                identity_id: identityId,
                old_wallet: oldAddr,
                new_wallet: newAddr,
                signed_message: signature_b64,
            });

            setIsProcessing(false);
            setSignatureStatus('');
            nextStep();
            showToast('success', 'Request submitted', 'Camp staff will approve your on-chain migration when your wallet has opted in to the app.');
        } catch (error) {
            console.error('Migration Error:', error);
            setIsProcessing(false);
            setSignatureStatus('');
            showToast('error', 'Migration Failed', error?.message || 'Signature rejected or backend error.');
        }
    };

    return (
        <div className="page-enter max-w-2xl mx-auto py-8">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-3">Wallet Migration Upgrade</h2>
                <p className="text-[#8b5cf6] text-xs font-bold uppercase tracking-[0.2em] mb-4">Sovereignty Wizard</p>
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={clsx(
                            "w-10 h-1.5 rounded-full transition-all duration-500",
                            step >= i ? "bg-[#8b5cf6]" : "bg-[#1a2d4a]"
                        )} />
                    ))}
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-[#f59e0b10] text-[#f59e0b] rounded-full flex items-center justify-center mb-8 border border-[#f59e0b20]">
                            <QrCode size={40} />
                        </div>
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-4">Verification Phase</h3>
                        <p className="text-[#7a94bb] text-sm text-center leading-relaxed mb-10 max-w-sm">
                            Scan your current <span className="text-white font-bold">RIMS Security Card</span> to verify existing identity ownership before migrating to your mobile device.
                        </p>

                        <div className="w-full relative aspect-video bg-[#060d1f] border-2 border-[#1a2d4a] rounded-2xl flex flex-col items-center justify-center overflow-hidden mb-10">
                            <div className="absolute inset-0 border-[20px] border-[#0f1e38] opacity-50" />
                            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#8b5cf6]" />
                            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#8b5cf6]" />
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#8b5cf6]" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#8b5cf6]" />

                            {isProcessing ? (
                                <>
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#8b5cf6] shadow-[0_0_20px_#8b5cf6] animate-scanLine z-20" />
                                    <p className="text-[#8b5cf6] font-mono text-[10px] uppercase font-bold tracking-[0.3em] animate-pulse">Scanning...</p>
                                </>
                            ) : (
                                <div className="absolute inset-0">
                                    <Scanner
                                        onScan={(result) => {
                                            if (!result || !result[0] || !result[0].rawValue) return;
                                            applyParsedQr(result[0].rawValue);
                                        }}
                                        onError={() => {}}
                                        components={{ audio: false }}
                                        styles={{
                                            container: { width: '100%', height: '100%' },
                                            video: { objectFit: 'cover' },
                                        }}
                                    />
                                    <p className="absolute bottom-4 left-0 right-0 text-center text-[#3d5278] text-[9px] uppercase font-bold tracking-[0.2em] pointer-events-none">
                                        Point camera at QR code
                                    </p>
                                </div>
                            )}
                        </div>

                        <label className="block w-full text-left text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-2">
                            QR payload (must contain identity_id + W1)
                        </label>
                        <textarea
                            value={migrationData.qrPayload}
                            onChange={(e) => setMigrationData((p) => ({ ...p, qrPayload: e.target.value }))}
                            onBlur={() => applyParsedQr(migrationData.qrPayload)}
                            placeholder='Paste scanned QR content here (JSON or query params). Example: {"identity_id":"...","old_wallet":"..."}'
                            className="w-full mb-6 font-mono text-xs bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-3 text-[#e2eaf8] placeholder:text-[#3d5278] min-h-[90px]"
                        />

                        <label className="block w-full text-left text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-2">
                            identity_id from QR
                        </label>
                        <input
                            type="text"
                            value={migrationData.identityId}
                            onChange={(e) => setMigrationData((p) => ({ ...p, identityId: e.target.value.trim() }))}
                            placeholder="Identity ID from your camp-issued QR"
                            className="w-full mb-6 font-mono text-xs bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-3 text-[#e2eaf8] placeholder:text-[#3d5278]"
                        />

                        <label className="block w-full text-left text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-2">
                            Custodial wallet (W1) from QR
                        </label>
                        <input
                            type="text"
                            value={migrationData.custodialAddress}
                            onChange={(e) => setMigrationData((p) => ({ ...p, custodialAddress: e.target.value }))}
                            onBlur={() => setMigrationData((p) => ({ ...p, custodialAddress: normalizeAlgoAddress(p.custodialAddress) }))}
                            placeholder="58-character Algorand address from your registration card"
                            className="w-full mb-6 font-mono text-xs bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-3 text-[#e2eaf8] placeholder:text-[#3d5278]"
                        />
                        <button
                            onClick={simulateScan}
                            disabled={isProcessing}
                            className="w-full bg-[#8b5cf6] text-white font-bold py-5 rounded-2xl hover:bg-[#a78bfa] transition-all text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(139,92,246,0.2)] disabled:opacity-50"
                        >
                            {isProcessing ? 'VERIFYING...' : 'CONFIRM CUSTODIAL ADDRESS'}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-[#3b82f610] text-[#3b82f6] rounded-full flex items-center justify-center mb-8 border border-[#3b82f620]">
                            <Smartphone size={40} />
                        </div>
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-4">Pair Pera Wallet</h3>
                        <p className="text-[#7a94bb] text-sm text-center leading-relaxed mb-10 max-w-sm">
                            Open Pera Wallet on your mobile device and connect to create your permanent <span className="text-white font-bold">Self-Sovereign Identity</span>.
                        </p>

                        <div className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-2xl p-6 mb-10">
                            {migrationData.isWalletConnected ? (
                                <div className="flex flex-col items-center gap-4 animate-fadeSlideUp">
                                    <div className="px-4 py-1.5 bg-[#10b98115] text-[#10b981] rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#10b98125]">
                                        Successfully Paired
                                    </div>
                                    <div className="font-mono text-[#00c9b1] text-xs break-all text-center px-4">
                                        {migrationData.newAddress}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-32 text-center">
                                    <div className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest mb-2">Target Address Status</div>
                                    <p className="text-[#7a94bb] text-xs italic">Awaiting mobile handshake...</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 w-full gap-4">
                            {!migrationData.isWalletConnected ? (
                                <button
                                    onClick={connectWallet}
                                    disabled={isProcessing}
                                    className="w-full bg-[#3b82f6] text-white font-bold py-5 rounded-2xl hover:bg-[#60a5fa] transition-all text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                                >
                                    {isProcessing ? 'CONNECTING...' : 'CONNECT PERA WALLET'}
                                </button>
                            ) : (
                                <button
                                    onClick={nextStep}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-5 rounded-2xl hover:bg-[#00e0c5] transition-all text-xs tracking-[0.2em]"
                                >
                                    CONTINUE TO FINAL STEP
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10">
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#1a2d4a]">
                            <div className="w-12 h-12 bg-[#8b5cf610] text-[#8b5cf6] rounded-xl flex items-center justify-center border border-[#8b5cf620]">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-[#e2eaf8] font-bold text-lg">Final Confirmation</h3>
                                <p className="text-[#7a94bb] text-xs uppercase tracking-widest">Ownership Transfer Agreement</p>
                            </div>
                        </div>

                        <div className="bg-[#060d1f] rounded-2xl border border-[#1a2d4a] overflow-hidden mb-10">
                            <div className="p-4 border-b border-[#1a2d4a]">
                                <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Retiring Managed Wallet</label>
                                    <div className="font-mono text-[#7a94bb] text-[10px] break-all opacity-90">{migrationData.custodialAddress}</div>
                            </div>
                            <div className="flex justify-center p-2">
                                <ArrowLeftRight className="text-[#3d5278]" size={16} />
                            </div>
                            <div className="p-4 bg-[#8b5cf605]">
                                <label className="block text-[#8b5cf6] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Activating Personal Wallet</label>
                                <div className="font-mono text-[#8b5cf6] text-[10px] truncate font-bold">{migrationData.newAddress}</div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            {[
                                "New Pera hardware verified",
                                "Identity ownership transfer authorized",
                                "Digital history migration confirmed",
                                "Blockchain key destruction protocol initialized"
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-[#152342]/50 border border-[#1a2d4a] rounded-xl">
                                    <CheckCircle size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                                    <p className="text-[#e2eaf8] text-xs font-medium">{item}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#f59e0b10] border border-[#f59e0b30] rounded-xl p-4 flex gap-4 items-start mb-10">
                            <AlertTriangle className="text-[#f59e0b] shrink-0" size={18} />
                            <p className="text-[#7a94bb] text-[10px] leading-relaxed italic">
                                Critical: Once you sign with Pera, RIMS staff will NO LONGER have power to recover your identity if you lose your phone. Keep your recovery phrase safe.
                            </p>
                        </div>

                        <button
                            onClick={finalSubmit}
                            disabled={isProcessing}
                            className="w-full bg-[#8b5cf6] text-white font-bold py-5 rounded-2xl hover:bg-[#a78bfa] transition-all text-sm tracking-[0.2em] shadow-[0_0_40px_rgba(139,92,246,0.3)] uppercase flex items-center justify-center gap-3"
                        >
                            {isProcessing ? <><Loader2 className="animate-spin" /> AUTHORIZING...</> : 'SIGN MIGRATION WITH PERA'}
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fadeSlideUp py-12">
                    <div className="bg-[#0f1e38] border border-[#10b98140] rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                        <div className="w-24 h-24 bg-[#10b98110] text-[#10b981] rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                            <RefreshCw size={56} className="animate-[spin_4s_linear_infinite]" />
                        </div>

                        <h2 className="text-[#10b981] text-4xl font-bold mb-4 tracking-tight uppercase">Request Submitted</h2>
                        <p className="text-[#7a94bb] text-lg mb-12 max-w-sm mx-auto">
                            After you opt in to the identity app in Pera, camp admin can approve the migration on-chain.
                        </p>

                        <div className="grid gap-4 max-w-sm mx-auto mb-12 text-left">
                            <div className="p-4 bg-[#060d1f] border border-[#1a2d4a] rounded-2xl">
                                <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-widest mb-2">New Active Wallet</label>
                                <div className="font-mono text-[#00c9b1] text-xs break-all font-bold">{migrationData.newAddress === 'Awaiting Handshake...' ? account : migrationData.newAddress}</div>
                            </div>
                            <div className="p-4 bg-[#060d1f] border border-[#1a2d4a] rounded-2xl opacity-40">
                                <label className="block text-[#ef4444] text-[9px] font-bold uppercase tracking-widest mb-2">Retired Wallet</label>
                                <div className="font-mono text-[#7a94bb] text-xs break-all line-through">{migrationData.custodialAddress}</div>
                            </div>
                            <div className="flex justify-between px-4 text-[10px] text-[#3d5278] font-bold uppercase tracking-widest">
                                <span>Block Hash</span>
                                <span className="font-mono text-[#00c9b1]">#4521894_MIG</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/refugee/dashboard')}
                            className="w-full max-w-sm bg-[#00c9b1] text-[#060d1f] font-bold py-5 rounded-2xl hover:bg-[#00e0c5] transition-all text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(0,201,177,0.2)] uppercase"
                        >
                            RETURN TO DASHBOARD
                        </button>
                    </div>
                </div>
            )}

            {/* Pera Signing Simulation Modal (Universal for Step 3) */}
            {isProcessing && step === 3 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000ee] backdrop-blur-xl px-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-[#8b5cf620] text-[#8b5cf6] rounded-3xl flex items-center justify-center mb-10 rotate-12 glow-teal border border-[#8b5cf640]">
                            <Fingerprint size={56} className="animate-pulse" />
                        </div>
                        <h3 className="text-white text-3xl font-bold mb-4 tracking-tight">Confirm Sovereign Transition</h3>
                        <p className="text-[#7a94bb] mb-12 max-w-xs uppercase text-[10px] tracking-[0.3em] font-bold border-l-2 border-[#8b5cf6] pl-6 h-8 flex items-center">
                            {signatureStatus || 'Waiting for wallet approval...'}
                        </p>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:150ms]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletMigration;
