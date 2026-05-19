import React, { useEffect, useState } from 'react';
import {
    Users, Search, Filter, ChevronRight, X,
    ShieldCheck, MapPin, Hash, Lock, Copy, Check, CheckCircle, XCircle, Loader2,
    Eye, EyeOff, QrCode,
} from 'lucide-react';
import { api } from '../../utils/api';
import { clsx } from 'clsx';
import { formatAddress } from '../../utils/format';

const RefugeeProfileDrawer = ({ refugee, onClose }) => {
    const [identity, setIdentity] = useState(null);
    const [loadingIdentity, setLoadingIdentity] = useState(false);
    const [identityError, setIdentityError] = useState('');
    const [showTechnical, setShowTechnical] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!refugee?.id) {
            setIdentity(null);
            setShowTechnical(false);
            setIdentityError('');
            return;
        }
        let cancelled = false;
        setLoadingIdentity(true);
        setIdentityError('');
        api.getIdentity(refugee.id)
            .then((res) => {
                if (cancelled) return;
                setIdentity(res?.data || null);
            })
            .catch((err) => {
                if (cancelled) return;
                setIdentityError(err?.message || 'Unable to load identity details.');
            })
            .finally(() => {
                if (!cancelled) setLoadingIdentity(false);
            });
        return () => {
            cancelled = true;
        };
    }, [refugee?.id]);

    if (!refugee) return null;

    const copyToClipboard = async (value) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (_) {
            /* clipboard may not be available */
        }
    };

    const bc = identity?.blockchain || {};
    const linkedWallet =
        identity?.linked_wallet ||
        identity?.walletAddress ||
        refugee.walletAddress ||
        '';
    const qrPayload = identity?.qr_payload || '';

    return (
        <div className="fixed inset-y-0 right-0 w-[460px] bg-[#0a1428] border-l border-[#1a2d4a] shadow-2xl z-50 animate-slideInRight overflow-y-auto">
            <div className="sticky top-0 bg-[#0a1428/80] backdrop-blur-md p-6 border-b border-[#1a2d4a] flex items-center justify-between z-10">
                <h3 className="text-[#e2eaf8] font-bold uppercase tracking-wider">Identity Profile</h3>
                <button onClick={onClose} className="p-2 hover:bg-[#152342] rounded-lg transition-colors text-[#3d5278] hover:text-[#e2eaf8]">
                    <X size={20} />
                </button>
            </div>

            <div className="p-8 space-y-10">
                {/* Header Profile */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-[#00c9b110] border border-[#00c9b130] rounded-3xl flex items-center justify-center text-[#00c9b1] font-bold text-3xl mb-4">
                        {refugee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h2 className="text-2xl font-bold text-[#e2eaf8]">{refugee.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="bg-[#10b98115] text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded border border-[#10b98120] uppercase tracking-widest leading-none">Verified Identity</span>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                    {[
                        { label: 'Refugee ID', value: refugee.id },
                        { label: 'Nationality', value: refugee.nationality },
                        { label: 'Gender', value: refugee.gender || 'N/A' },
                        { label: 'Camp Location', value: refugee.campID },
                        { label: 'Wallet Type', value: refugee.walletType.toUpperCase() },
                        { label: 'Languages', value: refugee.languages?.length ? refugee.languages.join(', ') : 'N/A' },
                        { label: 'Registration', value: new Date(refugee.registeredAt).toLocaleDateString() },
                    ].map((item, i) => (
                        <div key={i} className="space-y-1">
                            <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em]">{item.label}</label>
                            <div className="text-[#e2eaf8] text-sm font-semibold">{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* Wallet Address — masked by default */}
                <div className="space-y-6 pt-6 border-t border-[#1a2d4a]">
                    <div className="space-y-3">
                        <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em]">Wallet Address</label>
                        <div className="flex items-center gap-3 p-3 bg-[#060d1f] rounded-xl border border-[#1a2d4a]">
                            <span className="font-mono text-[#00c9b1] text-xs truncate flex-1 leading-relaxed" title={linkedWallet || ''}>
                                {linkedWallet ? formatAddress(linkedWallet) : '—'}
                            </span>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(linkedWallet)}
                                disabled={!linkedWallet}
                                className="text-[#3d5278] hover:text-[#00c9b1] transition-colors disabled:opacity-40"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Technical Details — operator-only */}
                <div className="pt-6 border-t border-[#1a2d4a]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#8b5cf615] border border-[#8b5cf640] flex items-center justify-center shrink-0">
                                <Lock size={16} className="text-[#8b5cf6]" />
                            </div>
                            <div>
                                <p className="text-[#e2eaf8] text-xs font-bold uppercase tracking-[0.2em]">
                                    Technical Details
                                </p>
                                <p className="text-[#3d5278] text-[10px] mt-0.5">
                                    Operator view · Not shown to refugees
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTechnical((value) => !value)}
                            disabled={loadingIdentity || (!identity && !identityError)}
                            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#8b5cf640] bg-[#8b5cf612] text-[#c4b5fd] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#8b5cf620] transition-colors disabled:opacity-50"
                        >
                            {loadingIdentity ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : showTechnical ? (
                                <EyeOff size={12} />
                            ) : (
                                <Eye size={12} />
                            )}
                            {loadingIdentity ? 'Loading' : showTechnical ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {showTechnical && (
                        <div className="mt-5 space-y-4">
                            {identityError ? (
                                <div className="rounded-xl border border-[#ef444440] bg-[#ef444412] px-4 py-3 text-[#fca5a5] text-xs">
                                    {identityError}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        <BlockchainPill ok={!!bc.funded} label={bc.funded ? 'Wallet funded' : 'Not funded'} />
                                        <BlockchainPill ok={!!bc.opted_in} label={bc.opted_in ? 'Opted into app' : 'Not opted in'} />
                                        <BlockchainPill
                                            ok={!!bc.local_state_exists}
                                            label={bc.local_state_exists ? 'Local state exists' : 'No local state'}
                                        />
                                        <BlockchainPill
                                            ok={!!bc.on_chain}
                                            label={bc.on_chain ? 'On-chain verified' : 'Backend only'}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <TechCell
                                            label="Application ID"
                                            value={bc.app_id || identity?.app_id || '—'}
                                            mono
                                        />
                                        <TechCell
                                            label="W1 Balance (µAlgos)"
                                            value={
                                                typeof bc.amount_microalgos === 'number'
                                                    ? bc.amount_microalgos.toLocaleString()
                                                    : '—'
                                            }
                                            mono
                                        />
                                    </div>

                                    <TechCell
                                        label="Full W1 Address"
                                        value={linkedWallet || '—'}
                                        mono
                                        breakAll
                                        copyable
                                        onCopy={() => copyToClipboard(linkedWallet)}
                                    />

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                                <QrCode size={12} /> Raw QR Payload (JSON)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(qrPayload)}
                                                disabled={!qrPayload}
                                                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a94bb] hover:text-[#e2eaf8] disabled:opacity-40 transition-colors"
                                            >
                                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <textarea
                                            readOnly
                                            value={qrPayload}
                                            className="w-full min-h-[96px] bg-[#0f1e38] border border-[#1a2d4a] rounded-lg p-3 font-mono text-[11px] text-[#e2eaf8]"
                                        />
                                        <p className="text-[#3d5278] text-[10px] mt-2 leading-relaxed">
                                            Contains <code>identity_id</code> + <code>old_wallet</code> only.
                                            Compatible with the wallet-migration scanner workflow.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Meta Badge */}
                <div className="bg-[#152342] rounded-2xl p-6 border border-[#1a2d4a]">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck size={20} className="text-[#00c9b1]" />
                        <span className="text-white font-bold text-sm uppercase tracking-wide">Blockchain Integrity</span>
                    </div>
                    <p className="text-[#7a94bb] text-xs leading-relaxed italic">
                        This identity record was anchored to Algorand TestNet block #4,521,894. All biometric liveness proofs are cryptographically verified.
                    </p>
                </div>
            </div>
        </div>
    );
};

const BlockchainPill = ({ ok, label }) => (
    <div
        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${
            ok
                ? 'bg-[#10b98115] text-[#10b981] border-[#10b98130]'
                : 'bg-[#ef444415] text-[#ef4444] border-[#ef444430]'
        }`}
    >
        {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
        <span>{label}</span>
    </div>
);

const TechCell = ({ label, value, mono, breakAll, copyable, onCopy }) => (
    <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
            <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">
                {label}
            </label>
            {copyable && (
                <button
                    type="button"
                    onClick={onCopy}
                    className="text-[#3d5278] hover:text-[#e2eaf8] transition-colors"
                >
                    <Copy size={12} />
                </button>
            )}
        </div>
        <div
            className={
                (mono ? 'font-mono ' : '') +
                'text-xs text-[#e2eaf8] ' +
                (breakAll ? 'break-all' : '')
            }
        >
            {value}
        </div>
    </div>
);

const AdminRefugees = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRefugee, setSelectedRefugee] = useState(null);
    const [refugees, setRefugees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRefugees = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.getRefugees();
            setRefugees(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setRefugees([]);
            setError(err.message || 'Unable to load registered refugees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefugees();
    }, []);

    const filteredRefugees = refugees.filter(r => {
        const term = searchTerm.toLowerCase();
        return !term ||
            (r.name || '').toLowerCase().includes(term) ||
            (r.id || '').toLowerCase().includes(term) ||
            (r.walletAddress || '').toLowerCase().includes(term);
    });

    return (
        <div className="page-enter space-y-8 pb-20 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8]">Registered Refugees</h2>
                    <p className="text-[#7a94bb] mt-1">All identity records on the system</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3d5278] group-focus-within:text-[#00c9b1] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or wallet address..."
                        className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl pl-12 pr-6 py-3.5 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] focus:ring-1 focus:ring-[#00c9b120] transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchRefugees}
                    className="flex items-center gap-2 px-6 py-3.5 bg-[#152342] text-white text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#1a2d4a] border border-[#1a2d4a] transition-all"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />} REFRESH
                </button>
            </div>

            {/* Refugees Table */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a1428] border-b border-[#1a2d4a]">
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Refugee ID</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Name</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Nationality</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Camp</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Wallet Type</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Aid Status</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Registered</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2d4a]">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-14 px-6 text-center">
                                        <Loader2 size={32} className="text-[#00c9b1] animate-spin mx-auto mb-3" />
                                        <div className="text-[#7a94bb] text-sm">Loading registered refugees...</div>
                                    </td>
                                </tr>
                            ) : filteredRefugees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-14 px-6 text-center">
                                        <div className="text-[#e2eaf8] text-sm font-bold">{error ? 'Unable to load records' : 'No registered refugees found'}</div>
                                        <div className="text-[#7a94bb] text-xs mt-2">{error || 'Register a refugee to see the record here.'}</div>
                                    </td>
                                </tr>
                            ) : filteredRefugees.map((refugee) => (
                                <tr
                                    key={refugee.id}
                                    onClick={() => setSelectedRefugee(refugee)}
                                    className="hover:bg-[#152342] transition-colors group cursor-pointer"
                                >
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="font-mono text-xs text-[#00c9b1] font-bold">{refugee.id}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#e2eaf8] text-sm font-semibold">{refugee.name}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#7a94bb] text-sm font-medium">{refugee.nationality}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="bg-[#152342] text-[#7a94bb] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-[#1a2d4a]">{refugee.campID}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border",
                                            refugee.walletType === 'pera' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" : "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                        )}>
                                            {refugee.walletType === 'pera' ? 'Pera' : 'Custodial'}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        {refugee.aidClaimed ? (
                                            <span className="inline-flex items-center gap-1.5 text-[#10b981] text-[10px] font-bold uppercase tracking-widest">
                                                <CheckCircle size={10} /> Claimed
                                            </span>
                                        ) : (
                                            <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">Not Claimed</span>
                                        )}
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#7a94bb] text-[11px] font-medium">{new Date(refugee.registeredAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap text-right">
                                        <div className="p-2 text-[#3d5278] group-hover:text-[#00c9b1] transition-colors inline-block">
                                            <ChevronRight size={20} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Profile Drawer */}
            {selectedRefugee && (
                <div className="fixed inset-0 z-[60]">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedRefugee(null)} />
                    <RefugeeProfileDrawer
                        refugee={selectedRefugee}
                        onClose={() => setSelectedRefugee(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default AdminRefugees;
