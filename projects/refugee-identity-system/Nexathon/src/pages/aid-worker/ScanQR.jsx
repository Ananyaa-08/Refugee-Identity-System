import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Check, FileText, Package, X, MapPin, Globe, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { formatAddress } from '../../utils/format';

function parseQrPayload(raw) {
    const data = JSON.parse(raw);
    return {
        identityId: (data.identity_id || data.id || '').trim(),
        walletAddress: (data.old_wallet || data.address || data.walletAddress || '').trim(),
        legacyName: (data.name || '').trim(),
    };
}

const ONCHAIN_BADGE = {
    confirmed: { label: 'On-Chain Verified', className: 'bg-[#10b98120] text-[#10b981] border-[#10b98140]' },
    opted_in_only: { label: 'Partially Registered', className: 'bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40]' },
    not_registered: { label: 'Not On-Chain', className: 'bg-[#ef444420] text-[#ef4444] border-[#ef444440]' },
    migrated: { label: 'Wallet Migrated', className: 'bg-[#3b82f620] text-[#3b82f6] border-[#3b82f640]' },
    unknown: { label: 'Status Unknown', className: 'bg-[#64748b20] text-[#94a3b8] border-[#64748b40]' },
};

function OnChainStatusBadge({ status }) {
    const badge = ONCHAIN_BADGE[status] || ONCHAIN_BADGE.unknown;
    return (
        <span
            className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border',
                badge.className,
            )}
        >
            {badge.label}
        </span>
    );
}

function profileFromApi(data) {
    if (!data) return null;
    return {
        id: data.id || data.identity_id || '',
        name: data.name || 'Registered Refugee',
        walletAddress: data.walletAddress || data.old_wallet || '',
        campID: data.campID || 'N/A',
        nationality: data.nationality || 'N/A',
        dob: data.dob,
        gender: data.gender,
        languages: data.languages || [],
        familyMembers: data.familyMembers || [],
        walletType: data.walletType,
        aidClaimed: data.aidClaimed,
        registeredAt: data.registeredAt,
        status: data.status,
        verification_mode: data.verification_mode,
        blockchain: data.blockchain,
    };
}

const ProfileModal = ({ profile, onClose }) => {
    if (!profile) return null;

    const rows = [
        { label: 'Refugee ID', value: profile.id || '—' },
        { label: 'Full Name', value: profile.name || '—' },
        { label: 'Date of Birth', value: profile.dob || '—' },
        { label: 'Nationality', value: profile.nationality || '—' },
        { label: 'Camp ID', value: profile.campID || '—' },
        { label: 'Gender', value: profile.gender || '—' },
        {
            label: 'Wallet Type',
            value: profile.walletType === 'pera' ? 'Self-Sovereign (Pera)' : profile.walletType === 'custodial' ? 'Custodial' : '—',
        },
        {
            label: 'Languages',
            value: (profile.languages || []).length ? profile.languages.join(', ') : '—',
        },
        {
            label: 'Family Members',
            value: (profile.familyMembers || []).length
                ? profile.familyMembers.map((m) => `${m.name || 'Member'} (${m.relationship || '—'})`).join('; ')
                : '—',
        },
        {
            label: 'Wallet Address',
            value: profile.walletAddress ? formatAddress(profile.walletAddress) : '—',
            mono: true,
        },
        {
            label: 'Registered',
            value: profile.registeredAt ? new Date(profile.registeredAt).toLocaleString() : '—',
        },
        { label: 'Verification', value: profile.verification_mode || '—' },
        { label: 'Status', value: profile.status || 'active' },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-[fadeSlideUp_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-[#e2eaf8]">{profile.name}</h3>
                        <p className="text-[#7a94bb] text-xs mt-1 font-mono">{profile.id}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[#3d5278] hover:text-[#e2eaf8] hover:bg-[#152342] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.label} className="bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3">
                            <p className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest mb-1">{row.label}</p>
                            <p
                                className={clsx(
                                    'text-sm text-[#e2eaf8]',
                                    row.mono && 'font-mono text-xs break-all text-[#00c9b1]',
                                )}
                            >
                                {row.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ScanQR = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [manualAddress, setManualAddress] = useState('');
    const [onchainStatus, setOnchainStatus] = useState(null);
    const lastScanRef = useRef('');

    useEffect(() => {
        const wallet = result?.walletAddress?.trim();
        if (!wallet) {
            setOnchainStatus(null);
            return undefined;
        }

        let cancelled = false;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            if (!cancelled) {
                setOnchainStatus('unknown');
            }
        }, 3000);

        api.verifyOnchainStatus(wallet, { signal: controller.signal })
            .then((data) => {
                if (!cancelled) {
                    clearTimeout(timeoutId);
                    setOnchainStatus(data.onchain_status || 'unknown');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    clearTimeout(timeoutId);
                    setOnchainStatus('unknown');
                }
            });

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [result?.walletAddress]);

    const fetchProfile = useCallback(
        async ({ identityId, walletAddress }) => {
            const res = await api.lookupRefugee({
                identity_id: identityId || undefined,
                wallet_address: walletAddress || undefined,
            });
            if (!res.success || !res.data) {
                throw new Error('Profile not found');
            }
            return profileFromApi(res.data);
        },
        [],
    );

    const handleLookup = async ({ identityId, walletAddress, legacyName }) => {
        setIsLoading(true);
        setResult(null);
        setOnchainStatus(null);
        setProfileOpen(false);

        try {
            const profile = await fetchProfile({ identityId, walletAddress });
            setResult(profile);
            showToast('success', 'Identity Found', `${profile.name} verified.`);
        } catch (error) {
            if (legacyName && walletAddress) {
                setResult({
                    id: identityId || 'REF-VERIFIED',
                    name: legacyName,
                    walletAddress,
                    campID: 'N/A',
                    nationality: 'N/A',
                });
                showToast('warning', 'Limited Profile', 'Showing QR data only — full record not in registry yet.');
            } else {
                showToast('error', 'Verification Failed', error?.message || 'Could not load refugee profile.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleScan = (scanResult) => {
        if (!scanResult?.[0]?.rawValue) return;
        const raw = scanResult[0].rawValue;
        if (raw === lastScanRef.current) return;
        lastScanRef.current = raw;

        let parsed;
        try {
            parsed = parseQrPayload(raw);
        } catch {
            showToast('error', 'Invalid QR', 'Not a valid RIMS identity card.');
            return;
        }

        if (!parsed.identityId && !parsed.walletAddress) {
            showToast('error', 'Invalid QR', 'QR is missing identity or wallet data.');
            return;
        }

        handleLookup(parsed);
    };

    const handleManualLookup = () => {
        const term = manualAddress.trim();
        if (!term) return;

        const looksLikeRefId = /^REF-/i.test(term);
        handleLookup({
            identityId: looksLikeRefId ? term : '',
            walletAddress: looksLikeRefId ? '' : term,
        });
    };

    const resetScanner = () => {
        setResult(null);
        setOnchainStatus(null);
        setProfileOpen(false);
        lastScanRef.current = '';
    };

    const aidIssueEnabled = onchainStatus === 'confirmed';

    const initials = (result?.name || '?')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="page-enter max-w-2xl mx-auto py-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-3">Identity Verification</h2>
                <p className="text-[#7a94bb] text-sm tracking-wide">
                    Scan a refugee&apos;s QR card or enter their wallet address manually.
                </p>
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center mb-10">
                <div
                    className={clsx(
                        'w-full max-w-md aspect-square rounded-2xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 mb-8',
                        result ? 'border-[#10b981] bg-[#10b98105]' : isLoading ? 'border-[#00c9b1] bg-[#00c9b105]' : 'border-[#1a2d4a] bg-[#060d1f]',
                    )}
                >
                    {result ? (
                        <div className="animate-bounce flex flex-col items-center z-10">
                            <Check size={64} className="text-[#10b981]" strokeWidth={3} />
                            <span className="text-[#10b981] font-bold mt-4 tracking-widest uppercase text-center bg-[#060d1f] p-2 rounded-lg">
                                SCAN SUCCESS
                            </span>
                        </div>
                    ) : isLoading ? (
                        <>
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_15px_#00c9b1] animate-scanLine z-20" />
                            <div className="text-[#00c9b1] font-mono text-xs font-bold tracking-widest animate-pulse z-10 flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                LOADING PROFILE…
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 w-full h-full">
                            <Scanner
                                onScan={handleScan}
                                components={{ audio: false }}
                                styles={{
                                    container: { width: '100%', height: '100%' },
                                    video: { objectFit: 'cover' },
                                }}
                            />
                            <div className="absolute inset-0 pointer-events-none border-[40px] border-[#0f1e38]/90" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-[#00c9b1]/50 rounded-xl pointer-events-none overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_15px_#00c9b1] animate-scanLine" />
                            </div>
                            <p className="absolute bottom-4 left-0 right-0 text-center text-[#00c9b1] text-[10px] font-bold uppercase tracking-[0.2em] pointer-events-none">
                                Position QR code in frame
                            </p>
                        </div>
                    )}
                </div>

                {result && (
                    <div className="w-full animate-fadeSlideUp">
                        <div className="bg-[#0f1e38] border border-[#10b98140] rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] mb-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-[#00c9b120] text-[#00c9b1] rounded-full flex items-center justify-center font-bold text-xl">
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold text-[#e2eaf8] truncate">{result.name}</h3>
                                        {onchainStatus && <OnChainStatusBadge status={onchainStatus} />}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-[#7a94bb] text-xs">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} /> {result.campID}
                                        </span>
                                        <span className="text-[#1a2d4a]">|</span>
                                        <span className="flex items-center gap-1">
                                            <Globe size={12} /> {result.nationality}
                                        </span>
                                        <span className="text-[#1a2d4a]">|</span>
                                        <span className="font-mono text-[#00c9b1]/60 font-bold">
                                            {result.walletAddress ? formatAddress(result.walletAddress) : '—'}
                                        </span>
                                    </div>
                                    {result.id && (
                                        <p className="text-[10px] font-mono text-[#00c9b1] mt-1">{result.id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(true)}
                                    className="flex items-center justify-center gap-2 bg-[#152342] text-[#e2eaf8] font-bold py-3 rounded-xl border border-[#1a2d4a] hover:border-[#3d5278] transition-all"
                                >
                                    <FileText size={18} /> PROFILE
                                </button>
                                <button
                                    type="button"
                                    disabled={!aidIssueEnabled}
                                    title={
                                        aidIssueEnabled
                                            ? undefined
                                            : 'Aid cannot be issued until on-chain registration is confirmed'
                                    }
                                    onClick={() => {
                                        if (!aidIssueEnabled) return;
                                        navigate('/aid-worker/distribution', {
                                            state: { refugee: result },
                                        });
                                    }}
                                    className={clsx(
                                        'flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all',
                                        aidIssueEnabled
                                            ? 'bg-[#00c9b1] text-[#060d1f] hover:bg-[#00e0c5]'
                                            : 'bg-[#3d5278] text-[#7a94bb] cursor-not-allowed opacity-60',
                                    )}
                                >
                                    <Package size={18} /> ISSUE AID
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={resetScanner}
                            className="w-full py-4 text-[#3d5278] text-xs font-bold uppercase tracking-widest hover:text-[#7a94bb] transition-colors"
                        >
                            RESET SCANNER
                        </button>
                    </div>
                )}

                <div className="w-full relative my-10">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#1a2d4a]" />
                    </div>
                    <div className="relative flex justify-center uppercase">
                        <span className="bg-[#060d1f] px-4 text-[#3d5278] text-[10px] font-bold tracking-widest">
                            OR manual lookup
                        </span>
                    </div>
                </div>

                <div className="w-full flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                            <Search size={16} />
                        </div>
                        <input
                            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl pl-11 pr-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                            placeholder="Wallet address or Refugee ID..."
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleManualLookup}
                        disabled={isLoading}
                        className="bg-[#152342] text-[#e2eaf8] font-bold px-8 rounded-xl border border-[#1a2d4a] hover:border-[#3d5278] active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                        {isLoading ? '…' : 'LOOKUP'}
                    </button>
                </div>
            </div>

            {profileOpen && <ProfileModal profile={result} onClose={() => setProfileOpen(false)} />}
        </div>
    );
};

export default ScanQR;
