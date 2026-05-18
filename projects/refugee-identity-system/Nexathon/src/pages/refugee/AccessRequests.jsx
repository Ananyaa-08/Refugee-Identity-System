import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Clock, CheckCircle, XCircle,
    Info, Bell, ChevronDown, Fingerprint, Loader2, User
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { useWallet } from '../../context/WalletContext';
import { useIdentity } from '../../context/IdentityContext';
import { api } from '../../utils/api';
import { peraWallet, normalizePeraAccount } from '../../utils/wallet';
import { isWalletAuthorizedForConsent } from '../../utils/refugeeConsent';

const AccessRequests = () => {
    const { showToast } = useToast();
    const { account } = useWallet();
    const { identity } = useIdentity();
    const [activeTab, setActiveTab] = useState('Pending');
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [signingStage, setSigningStage] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const tabs = ['Pending', 'Approved', 'Rejected', 'All'];

    const refugeeId = (identity?.identity_id || localStorage.getItem('refugee_identity_id') || '').trim();

    const fetchRequests = async () => {
        if (!refugeeId) {
            setRequests([]);
            setIsLoading(false);
            return;
        }
        try {
            const data = await api.getAccessRequests({ refugee_id: refugeeId });
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setRequests([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 15000);
        return () => clearInterval(interval);
    }, [refugeeId]);

    const filteredRequests = requests.filter(r =>
        activeTab === 'All' ? true : r.status.toLowerCase() === activeTab.toLowerCase()
    );

    const handleApprove = async (req) => {
        setIsSigning(true);
        setSigningStage(1);

        try {
            let signerAddress = normalizePeraAccount(account);
            if (!signerAddress) {
                const accounts = await peraWallet.connect();
                signerAddress = normalizePeraAccount(accounts?.[0]);
            }
            if (!signerAddress) {
                throw new Error('Connect your Pera Wallet to approve this request.');
            }

            setSigningStage(2);
            if (!isWalletAuthorizedForConsent(identity, signerAddress)) {
                throw new Error(
                    'This Pera wallet does not match your registered identity or your wallet after migration. ' +
                        'Connect the correct wallet and try again.'
                );
            }

            await new Promise((r) => setTimeout(r, 800));
            setSigningStage(3);
            await new Promise((r) => setTimeout(r, 600));

            await api.approveAccessRequest(req.id, signerAddress);

            showToast('success', 'Consent Granted', `Access authorized for ${req.requestedField}.`);
            fetchRequests();
        } catch (error) {
            console.error('Approve Error:', error);
            const msg = error?.message || 'Could not approve this request.';
            const isWalletMismatch = msg.toLowerCase().includes('wallet');
            showToast(
                'error',
                isWalletMismatch ? 'Wallet mismatch' : 'Approval failed',
                msg,
            );
        } finally {
            setIsSigning(false);
            setSigningStage(0);
        }
    };

    const handleReject = async (req) => {
        if (window.confirm("Reject this access request?")) {
            try {
                await api.rejectAccessRequest(req.id);
                showToast('info', 'Request Rejected', 'The requester has been notified.');
                fetchRequests();
            } catch (error) {
                console.error("Reject Error:", error);
                showToast('error', 'Network Error', 'Failed to reject request.');
            }
        }
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 font-sans tracking-tight">Data Governance</h2>
                <p className="text-[#7a94bb] text-sm">Manage who can access specific parts of your digital identity record.</p>
            </div>

            <div className="flex items-center gap-1 border-b border-[#1a2d4a]">
                {tabs.map(tab => {
                    const count = tab === 'All' ? requests.length : requests.filter(r => r.status.toLowerCase() === tab.toLowerCase()).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative",
                                activeTab === tab ? "text-[#00c9b1]" : "text-[#3d5278] hover:text-[#7a94bb]"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {tab}
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                    activeTab === tab ? "bg-[#00c9b110] border-[#00c9b140]" : "bg-[#152342] border-[#1a2d4a]"
                                )}>{count}</span>
                            </div>
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_10px_#00c9b1]" />}
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl py-24 flex flex-col items-center justify-center text-center">
                        <Loader2 size={48} className="text-[#00c9b1] animate-spin mb-4" />
                        <h4 className="text-[#e2eaf8] font-bold text-lg">Fetching Ledger</h4>
                        <p className="text-[#7a94bb] text-sm mt-1 max-w-xs">Connecting to secure decentralized network...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl py-24 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-[#152342] rounded-full flex items-center justify-center mb-6">
                            <ShieldCheck size={32} className="text-[#3d5278]" />
                        </div>
                        <h4 className="text-[#e2eaf8] font-bold text-lg">No {activeTab.toLowerCase()} requests</h4>
                        <p className="text-[#7a94bb] text-sm mt-1 max-w-xs">Your data is currently private. New requests will appear here instantly.</p>
                    </div>
                ) : (
                    filteredRequests.map((req, i) => (
                        <div
                            key={req.id}
                            style={{ animationDelay: `${i * 100}ms` }}
                            className={clsx(
                                "bg-[#0f1e38] border rounded-2xl p-6 transition-all duration-300 animate-fadeSlideUp",
                                req.status === 'pending' ? "border-[#f59e0b40] border-l-4 border-l-[#f59e0b]" :
                                    req.status === 'approved' ? "border-[#10b98140] border-l-4 border-l-[#10b981]" :
                                        "border-[#ef444440] border-l-4 border-l-[#ef4444] opacity-80"
                            )}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-5">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                                        req.status === 'pending' ? "bg-[#f59e0b10] border-[#f59e0b25] text-[#f59e0b]" :
                                            req.status === 'approved' ? "bg-[#10b98110] border-[#10b98125] text-[#10b981]" :
                                                "bg-[#ef444410] border-[#ef444425] text-[#ef4444]"
                                    )}>
                                        {req.status === 'pending' ? <Bell size={24} /> :
                                            req.status === 'approved' ? <ShieldCheck size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-[#e2eaf8] font-bold text-lg">{req.name}</h3>
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border",
                                                req.status === 'pending' ? "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]" :
                                                    req.status === 'approved' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                                        "bg-[#ef444410] text-[#ef4444] border-[#ef444420]"
                                            )}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="text-[#7a94bb] text-sm">Component: <span className="text-[#e2eaf8] font-semibold">{req.requestedField}</span></p>
                                        {req.purpose ? (
                                            <p className="text-[#7a94bb] text-xs mt-1 italic line-clamp-2">&ldquo;{req.purpose}&rdquo;</p>
                                        ) : null}
                                        <div className="flex items-center gap-4 pt-1">
                                            <span className="text-[#3d5278] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                                <User className="w-3 h-3" /> By: {req.requestedBy}
                                            </span>
                                            <span className="text-[#3d5278] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" /> {new Date(req.requestedAt || Date.now()).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {req.status === 'pending' ? (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => handleReject(req)}
                                            className="px-6 py-3 border border-[#ef444440] text-[#ef4444] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#ef444410] transition-all"
                                        >
                                            REJECT
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="px-10 py-3 bg-[#00c9b1] text-[#060d1f] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#00e0c5] shadow-[0_0_20px_rgba(0,201,177,0.1)] transition-all"
                                        >
                                            APPROVE
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 shrink-0 pr-4">
                                        {req.status === 'approved' && (
                                            <p className="text-[#10b981] text-[10px] font-bold uppercase italic tracking-widest">Access Active</p>
                                        )}
                                        <ChevronDown className="text-[#3d5278] cursor-pointer" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isSigning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-md px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#3b82f6]" />
                        <div className="text-center">
                            <div className="w-20 h-20 bg-[#3b82f615] text-[#3b82f6] rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-12 glow-teal">
                                <Fingerprint size={48} className={signingStage >= 2 ? "text-[#10b981]" : "text-[#3b82f6]"} />
                            </div>
                            <h3 className="text-[#e2eaf8] text-2xl font-bold mb-4">Pera Multi-Sig</h3>
                            <p className="text-[#7a94bb] text-sm leading-relaxed mb-10">
                                Please confirm the biometric challenge on your Pera Wallet mobile app.
                            </p>
                            <div className="space-y-4 text-left">
                                {[
                                    { label: 'Open Pera Wallet app', done: signingStage >= 1 },
                                    { label: 'Biometric authorization', done: signingStage >= 2 },
                                    { label: 'Smart contract signing', done: signingStage >= 3 },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className={clsx("text-xs font-bold uppercase tracking-widest", s.done ? "text-[#10b981]" : "text-[#3d5278]")}>
                                            {i + 1}. {s.label}
                                        </span>
                                        {s.done ? <CheckCircle size={14} className="text-[#10b981]" /> :
                                            (!s.done && signingStage === i + 1) ? <Loader2 size={14} className="animate-spin text-[#3b82f6]" /> :
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#1a2d4a]" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessRequests;
