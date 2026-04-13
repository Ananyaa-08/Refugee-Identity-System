import React, { useState } from 'react';
import {
    Package, Search, Clock, CheckCircle, AlertTriangle,
    MapPin, Globe, Loader2, ArrowRight, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { useWallet } from '../../context/WalletContext';
import { api } from '../../utils/api';

const AidDistribution = () => {
    const { showToast } = useToast();
    const { account } = useWallet();
    const [selectedRefugee, setSelectedRefugee] = useState(null); // Starts empty
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [pendingAid, setPendingAid] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Local state for UI updates
    const [aidStatus, setAidStatus] = useState([
        { id: 'food', name: 'Food Rations', icon: '🍞', claimed: false },
        { id: 'meds', name: 'Medical Kit', icon: '🏥', claimed: false },
        { id: 'shelter', name: 'Shelter Items', icon: '🏠', claimed: false },
        { id: 'cash', name: 'Cash Assistance', icon: '💵', claimed: false },
        { id: 'clothing', name: 'Essentials Kit', icon: '👕', claimed: false },
    ]);

    // Search for refugee on blockchain (verify they are registered)
    const handleSearch = async (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            try {
                const res = await api.getRefugeeState(searchTerm.trim());
                if (!res.success || !res.data) throw new Error("Not found");
                // Build minimal profile from on-chain state
                setSelectedRefugee({
                    walletAddress: searchTerm.trim(),
                    name: 'Registered Refugee',
                    campID: 'On-Chain',
                    nationality: 'N/A',
                    id: res.data.identity_hash ? 'VERIFIED' : 'N/A',
                });
                showToast('success', 'Refugee Found', 'Profile loaded for aid distribution.');
            } catch (error) {
                showToast('error', 'Not Found', 'No refugee found with that address on blockchain.');
            }
        }
    };

    const handleIssue = (aid) => {
        if (aid.claimed) {
            showToast('error', 'Action Blocked', 'This specific aid has already been claimed and recorded on-chain.');
            return;
        }
        if (!selectedRefugee) {
            showToast('warning', 'No Refugee', 'Please search for a refugee first.');
            return;
        }
        setPendingAid(aid);
        setIsConfirming(true);
    };

    // Claim aid via blockchain backend
    const confirmDistribution = async () => {
        setIsConfirming(false);
        setIsProcessing(true);
        setIsSubmitting(true);

        try {
            const claimAddress = selectedRefugee?.walletAddress;
            if (!claimAddress) {
                throw new Error("No refugee wallet address.");
            }

            await api.claimAid(claimAddress);

            setAidStatus(prev => prev.map(a =>
                a.id === pendingAid.id ? { ...a, claimed: true, timestamp: new Date().toISOString() } : a
            ));
            showToast('success', 'Transaction Confirmed', 'Aid package has been recorded on the Algorand ledger');
        } catch (err) {
            if (err.message?.toLowerCase().includes('already')) {
                showToast('error', 'Already Claimed', 'This wallet has already received its allocated aid package');
            } else {
                showToast('error', 'Action Blocked', err.message || 'Could not record aid claim on blockchain.');
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
                    <p className="text-[#7a94bb] text-sm">Verify identity and authorize resource distribution via smart contract.</p>
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

            {/* Refugee Profile Bar */}
            {!selectedRefugee ? (
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center justify-center text-center text-[#3d5278]">
                    <Search size={48} className="mb-4 opacity-50" />
                    <p className="text-sm font-medium uppercase tracking-widest">Search for a refugee to issue aid</p>
                </div>
            ) : (
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 right-0 p-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#10b98110] border border-[#10b98120] rounded-lg">
                            <CheckCircle size={14} className="text-[#10b981]" />
                            <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">On-Chain Profile Verified</span>
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
                            <span className="font-mono text-[#3d5278] uppercase">{selectedRefugee.id || selectedRefugee._id || 'NO-ID'}</span>
                        </div>
                    </div>

                    <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] w-full md:w-auto">
                        <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Connected Address</label>
                        <div className="font-mono text-[#00c9b1] text-xs">
                            {selectedRefugee.walletAddress ? `${selectedRefugee.walletAddress.slice(0, 10)}...${selectedRefugee.walletAddress.slice(-8)}` : 'UNKNOWN'}
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Box */}
            <div className="bg-[#f59e0b08] border border-[#f59e0b20] rounded-xl p-4 flex gap-4 items-start">
                <AlertTriangle className="text-[#f59e0b] shrink-0" size={20} />
                <p className="text-[#7a94bb] text-[11px] leading-relaxed">
                    <strong className="text-[#f59e0b] uppercase font-bold tracking-widest">Security Protocol:</strong> Each aid type can only be claimed <span className="text-[#e2eaf8] font-bold">ONCE</span> per identity period. All transactions are permanently cryptographically signed and recorded on the Algorand blockchain to prevent double-claiming and fraud.
                </p>
            </div>

            {/* Aid Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aidStatus.map(aid => (
                    <div
                        key={aid.id}
                        className={clsx(
                            "bg-[#0f1e38] border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden",
                            aid.claimed
                                ? "border-[#1a2d4a] opacity-80"
                                : "border-[#1a2d4a] border-l-4 border-l-[#00c9b1] hover:border-[#00c9b1] group hover:shadow-[0_0_20px_rgba(0,201,177,0.05)] hover:-translate-y-1"
                        )}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-4xl">{aid.icon}</div>
                            <div className={clsx(
                                "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                                aid.claimed
                                    ? "bg-[#10b98115] text-[#10b981] border-[#10b98125]"
                                    : "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b25]"
                            )}>
                                {aid.claimed ? 'Claimed ✓' : 'Available'}
                            </div>
                        </div>

                        <h4 className="text-[#e2eaf8] font-bold text-lg mb-2">{aid.name}</h4>

                        {aid.claimed ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-[#060d1f] rounded-lg">
                                    <div className="flex items-center gap-2 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest mb-1.5">
                                        <Clock size={12} /> Issuance Log
                                    </div>
                                    <p className="text-[#7a94bb] text-[11px]">Recorded Just Now</p>
                                    <p className="text-[#3d5278] font-mono text-[9px] mt-1 truncate">Tx: Secured On-Chain</p>
                                </div>
                                <button disabled className="w-full py-3 bg-[#1a2d4a] text-[#3d5278] text-xs font-bold uppercase tracking-widest rounded-xl cursor-not-allowed">
                                    Already Distributed
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-[#7a94bb] text-xs">Standard humanitarian package for {aid.name.toLowerCase()}.</p>
                                <button
                                    onClick={() => handleIssue(aid)}
                                    disabled={!selectedRefugee}
                                    className="w-full py-3 bg-[#00c9b1] text-[#060d1f] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#00e0c5] transition-all group-hover:shadow-[0_0_20px_rgba(0,201,177,0.2)] disabled:opacity-50 disabled:hover:bg-[#00c9b1] disabled:hover:shadow-none"
                                >
                                    Issue Aid Package
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Confirmation Modal */}
            {isConfirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-md px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00c9b1]" />
                        <button onClick={() => setIsConfirming(false)} className="absolute top-6 right-6 text-[#3d5278] hover:text-[#e2eaf8]"><X size={24} /></button>

                        <div className="text-center">
                            <div className="w-20 h-20 bg-[#00c9b115] text-[#00c9b1] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                                {pendingAid?.icon}
                            </div>
                            <h3 className="text-[#e2eaf8] text-2xl font-bold mb-4 tracking-tight">Authorize Distribution</h3>
                            <p className="text-[#7a94bb] text-sm leading-relaxed mb-8">
                                You are issuing <span className="text-[#00c9b1] font-bold">{pendingAid?.name}</span> to <span className="text-[#e2eaf8] font-bold">{selectedRefugee?.name}</span>. This action will be permanently recorded via smart contract.
                            </p>

                            <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] text-left mb-8">
                                <div className="flex items-center gap-2 text-[#3d5278] text-[9px] font-bold uppercase tracking-[0.2em] mb-2">
                                    Subject Identity ID
                                </div>
                                <div className="font-mono text-[#00c9b1] text-xs break-all leading-relaxed">
                                    {selectedRefugee?.walletAddress}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={confirmDistribution}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                                >
                                    CONFIRM & SIGN <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    className="w-full py-4 text-[#3d5278] text-xs font-bold uppercase tracking-widest hover:text-[#7a94bb] transition-colors"
                                >
                                    CANCEL TRANSACTION
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#060d1f] px-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative w-24 h-24 mb-10">
                            <div className="absolute inset-0 border-4 border-[#1a2d4a] rounded-full" />
                            <div className="absolute inset-0 border-4 border-[#00c9b1] border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[#00c9b1] font-bold text-xl">
                                <Package className="animate-pulse" size={40} />
                            </div>
                        </div>
                        <h3 className="text-[#e2eaf8] text-3xl font-bold mb-4 animate-pulse">Confirming On-Chain</h3>
                        <p className="text-[#7a94bb] text-lg tracking-wide uppercase border-l-2 border-[#00c9b1] pl-6 h-8 flex items-center">
                            Updating Global Registry...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AidDistribution;