import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Package, Search, CheckCircle, AlertTriangle,
    MapPin, Globe, Loader2, ArrowRight, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { formatAddress } from '../../utils/format';

const AID_TYPES = [
    { id: 'food', name: 'Food', icon: '🍞' },
    { id: 'medicine', name: 'Medicine', icon: '🏥' },
    { id: 'shelter', name: 'Shelter', icon: '🏠' },
    { id: 'cash', name: 'Cash', icon: '💵' },
    { id: 'clothing', name: 'Clothing', icon: '👕' },
];

const AidDistribution = () => {
    const { showToast } = useToast();
    const location = useLocation();
    const [selectedRefugee, setSelectedRefugee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [pendingAid, setPendingAid] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [claimedTypes, setClaimedTypes] = useState(new Set());
    const [loadingAidStatus, setLoadingAidStatus] = useState(false);
    const [onchainStatus, setOnchainStatus] = useState(null);
    const aidStatusWarnedRef = useRef(false);

    const loadAidStatus = useCallback(async (walletAddress, { silent = false } = {}) => {
        if (!walletAddress) {
            setClaimedTypes(new Set());
            return;
        }
        setLoadingAidStatus(true);
        try {
            const res = await api.getAidStatus(walletAddress);
            setClaimedTypes(new Set(res.claimed_types || []));
        } catch (err) {
            setClaimedTypes(new Set());
            if (!silent && !aidStatusWarnedRef.current) {
                aidStatusWarnedRef.current = true;
                showToast(
                    'warning',
                    'Aid status unavailable',
                    err.message || 'Could not load on-chain aid status. Restart the API if this persists.'
                );
            }
        } finally {
            setLoadingAidStatus(false);
        }
    }, [showToast]);

    const refreshOnchainStatus = useCallback(async (walletAddress) => {
        if (!walletAddress) {
            setOnchainStatus(null);
            return 'unknown';
        }
        const verify = await api.verifyOnchainStatus(walletAddress);
        setOnchainStatus(verify.onchain_status);
        return verify.onchain_status;
    }, []);

    useEffect(() => {
        const refugee = location.state?.refugee;
        if (!refugee?.walletAddress) return;

        setSelectedRefugee(refugee);
        setSearchTerm(refugee.walletAddress);
        aidStatusWarnedRef.current = false;

        (async () => {
            const status = await refreshOnchainStatus(refugee.walletAddress);
            await loadAidStatus(refugee.walletAddress, { silent: true });
            if (status !== 'confirmed') {
                showToast(
                    'warning',
                    'Re-registration required',
                    `This refugee is not fully registered on the active contract (status: ${status}). ` +
                        'For custodial (no smartphone) refugees, re-provision via Aid Worker → Register.'
                );
            }
        })();
    }, [location.state?.refugee?.walletAddress, loadAidStatus, refreshOnchainStatus, showToast]);

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            const wallet = searchTerm.trim();
            try {
                const [res, verify, appInfo] = await Promise.all([
                    api.getRefugeeState(wallet),
                    api.verifyOnchainStatus(wallet),
                    api.getAppInfo(),
                ]);
                if (!res.success || !res.data) {
                    const hint = res.detail || verify.onchain_status;
                    throw new Error(
                        hint === 'not_registered'
                            ? 'This wallet is not registered on the active contract. Re-register the refugee after the latest contract deploy.'
                            : hint || 'Not found on blockchain.'
                    );
                }
                if (verify.onchain_status !== 'confirmed') {
                    throw new Error(
                        `On-chain status: ${verify.onchain_status}. Active app #${appInfo?.data?.app_id ?? '?'}. ` +
                        'Re-run aid-worker registration (opt-in + register) on this contract.'
                    );
                }
                setSelectedRefugee({
                    walletAddress: wallet,
                    name: 'Registered Refugee',
                    campID: 'On-Chain',
                    nationality: 'N/A',
                    id: res.data.identity_hash ? 'VERIFIED' : 'N/A',
                });
                setOnchainStatus(verify.onchain_status);
                aidStatusWarnedRef.current = false;
                await loadAidStatus(wallet, { silent: true });
                showToast('success', 'Refugee Found', 'Profile loaded for aid distribution.');
            } catch (error) {
                setSelectedRefugee(null);
                setClaimedTypes(new Set());
                setOnchainStatus(null);
                showToast('error', 'Not Found', error.message || 'No refugee found with that address on blockchain.');
            }
        }
    };

    const handleIssue = (aid) => {
        if (onchainStatus && onchainStatus !== 'confirmed') {
            showToast(
                'error',
                'Not registered on-chain',
                'This refugee must complete custodial provisioning (fund + opt-in + register) before aid can be issued.'
            );
            return;
        }
        if (claimedTypes.has(aid.id)) {
            showToast('error', 'Already Claimed', 'This aid type has already been recorded on-chain.');
            return;
        }
        if (!selectedRefugee) {
            showToast('warning', 'No Refugee', 'Please search for a refugee first.');
            return;
        }
        setPendingAid(aid);
        setIsConfirming(true);
    };

    const confirmDistribution = async () => {
        const aid = pendingAid;
        const claimAddress = selectedRefugee?.walletAddress;
        const aidType = aid?.id;

        setIsConfirming(false);
        setIsProcessing(true);
        setIsSubmitting(true);

        try {
            if (!claimAddress || !aidType) {
                throw new Error('No refugee wallet address or aid type.');
            }

            const res = await api.claimAid(claimAddress, aidType);
            const updated = new Set(res.all_claimed_types || [...claimedTypes, aidType]);
            setClaimedTypes(updated);
            showToast(
                'success',
                'Aid Recorded',
                `${aid?.name || 'Aid'} aid recorded on-chain (${[...updated].join(', ')})`
            );
        } catch (err) {
            const msg = err.message || 'Could not record aid claim on blockchain.';
            if (msg.toLowerCase().includes('already')) {
                showToast('error', 'Already Claimed', msg);
                if (claimAddress) loadAidStatus(claimAddress);
            } else {
                showToast('error', 'Claim Failed', msg);
            }
        } finally {
            setIsProcessing(false);
            setIsSubmitting(false);
            setPendingAid(null);
        }
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 font-sans tracking-tight">Aid Distribution</h2>
                    <p className="text-[#7a94bb] text-sm">
                        Issue food, medicine, shelter, cash, or clothing — each type is tracked separately on-chain.
                    </p>
                </div>

                <div className="w-full md:w-96 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                        <Search size={18} />
                    </div>
                    <input
                        className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl pl-11 pr-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                        placeholder="Enter wallet address & press Enter..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            {!selectedRefugee ? (
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center justify-center text-center text-[#3d5278]">
                    <Search size={48} className="mb-4 opacity-50" />
                    <p className="text-sm font-medium uppercase tracking-widest">Search for a refugee to issue aid</p>
                </div>
            ) : (
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 right-0 p-3">
                        <div
                            className={clsx(
                                'flex items-center gap-2 px-3 py-1 rounded-lg border',
                                onchainStatus === 'confirmed'
                                    ? 'bg-[#10b98110] border-[#10b98120]'
                                    : 'bg-[#f59e0b10] border-[#f59e0b20]',
                            )}
                        >
                            {onchainStatus === 'confirmed' ? (
                                <>
                                    <CheckCircle size={14} className="text-[#10b981]" />
                                    <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">
                                        On-Chain Verified
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={14} className="text-[#f59e0b]" />
                                    <span className="text-[#f59e0b] text-[10px] font-bold uppercase tracking-widest">
                                        {onchainStatus === 'not_registered' ? 'Not On-Chain' : 'Registration Incomplete'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="w-20 h-20 bg-[#152342] rounded-2xl flex items-center justify-center text-3xl font-bold text-[#00c9b1] border border-[#1a2d4a]">
                        {selectedRefugee.name ? selectedRefugee.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold text-[#e2eaf8] mb-1">{selectedRefugee.name}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-[#7a94bb] font-medium">
                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {selectedRefugee.campID || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Globe size={14} /> {selectedRefugee.nationality || 'N/A'}</span>
                            <span className="font-mono text-[#3d5278] uppercase">{selectedRefugee.id || 'NO-ID'}</span>
                        </div>
                    </div>

                    <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] w-full md:w-auto">
                        <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Connected Address</label>
                        <div className="font-mono text-[#00c9b1] text-xs">
                            {selectedRefugee.walletAddress ? formatAddress(selectedRefugee.walletAddress) : 'UNKNOWN'}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#f59e0b08] border border-[#f59e0b20] rounded-xl p-4 flex gap-4 items-start">
                <AlertTriangle className="text-[#f59e0b] shrink-0" size={20} />
                <p className="text-[#7a94bb] text-[11px] leading-relaxed">
                    <strong className="text-[#f59e0b] uppercase font-bold tracking-widest">Security Protocol:</strong>{' '}
                    Each aid type can only be claimed <span className="text-[#e2eaf8] font-bold">once</span> per identity.
                    Refugees may receive multiple types across separate distribution cycles.
                </p>
            </div>

            {loadingAidStatus && selectedRefugee && (
                <div className="flex items-center gap-2 text-[#7a94bb] text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Loading on-chain aid status…
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                {AID_TYPES.map((aid) => {
                    const claimed = claimedTypes.has(aid.id);
                    return (
                        <button
                            key={aid.id}
                            type="button"
                            onClick={() => !claimed && handleIssue(aid)}
                            disabled={
                                !selectedRefugee
                                || claimed
                                || isSubmitting
                                || loadingAidStatus
                                || onchainStatus !== 'confirmed'
                            }
                            className={clsx(
                                'min-w-[140px] flex-1 max-w-[200px] px-4 py-4 rounded-xl border text-sm font-bold transition-all',
                                claimed
                                    ? 'bg-[#1a2d4a] border-[#1a2d4a] text-[#3d5278] cursor-not-allowed'
                                    : 'bg-[#00c9b1] border-[#00c9b1] text-[#060d1f] hover:bg-[#00e0c5] disabled:opacity-50'
                            )}
                        >
                            <span className="text-2xl block mb-2">{aid.icon}</span>
                            {claimed ? (
                                <span className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest">
                                    <CheckCircle size={14} /> Already Claimed
                                </span>
                            ) : (
                                <span className="text-xs uppercase tracking-widest">Issue {aid.name}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {isConfirming && pendingAid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-md px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00c9b1]" />
                        <button onClick={() => setIsConfirming(false)} className="absolute top-6 right-6 text-[#3d5278] hover:text-[#e2eaf8]">
                            <X size={24} />
                        </button>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-[#00c9b115] text-[#00c9b1] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                                {pendingAid.icon}
                            </div>
                            <h3 className="text-[#e2eaf8] text-xl font-bold mb-4">Confirm Aid Issue</h3>
                            <p className="text-[#7a94bb] text-sm leading-relaxed mb-8">
                                Issue <span className="text-[#00c9b1] font-bold">{pendingAid.name}</span> aid to{' '}
                                <span className="text-[#e2eaf8] font-bold">{selectedRefugee?.name}</span>?
                                This cannot be undone.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={confirmDistribution}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                                >
                                    CONFIRM <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    className="w-full py-4 text-[#3d5278] text-xs font-bold uppercase tracking-widest hover:text-[#7a94bb]"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#060d1f] px-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative w-24 h-24 mb-10">
                            <div className="absolute inset-0 border-4 border-[#1a2d4a] rounded-full" />
                            <div className="absolute inset-0 border-4 border-[#00c9b1] border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[#00c9b1]">
                                <Package className="animate-pulse" size={40} />
                            </div>
                        </div>
                        <h3 className="text-[#e2eaf8] text-3xl font-bold mb-4 animate-pulse">Confirming On-Chain</h3>
                        <p className="text-[#7a94bb] text-lg tracking-wide uppercase border-l-2 border-[#00c9b1] pl-6">
                            Recording {pendingAid?.name || 'aid'}…
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AidDistribution;
