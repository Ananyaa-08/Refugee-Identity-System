import React, { useState, useEffect } from 'react';
import {
    Key, ShieldCheck, Globe, User, FileText,
    Search, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';

const RequestAccess = () => {
    const { showToast } = useToast();
    const [walletAddress, setWalletAddress] = useState(''); // Manually type/paste wallet
    const [selectedField, setSelectedField] = useState(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);

    const fields = [
        { id: 'ageProof', label: 'Age Verification', icon: ShieldCheck },
        { id: 'nationality', label: 'Nationality Proof', icon: Globe },
        { id: 'identity', label: 'Full Identity', icon: User },
        { id: 'record', label: 'Registration Record', icon: FileText },
    ];

    // 1. Fetch Request History on Load from Database
    const fetchHistory = async (silent = false) => {
        try {
            const BASE_URL = import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${BASE_URL}/access/requests`, {
                headers: {
                    'ngrok-skip-browser-warning': '69420'
                }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (err) {
            console.error("History fetch error:", err);
            if (!silent) {
                showToast('error', 'Sync Error', 'Could not refresh access history.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // 2. The REAL Backend Request Function
    const handleRequest = async () => {
        if (!walletAddress || !selectedField) {
            showToast('warning', 'Missing Info', 'Please enter a wallet address and select a field.');
            return;
        }

        setIsSubmitting(true);
        try {
            const BASE_URL = import.meta.env.VITE_API_BASE_URL;

            // Step 1: Create the request on the backend
            const response = await fetch(`${BASE_URL}/access/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "69420"
                },
                body: JSON.stringify({
                    walletAddress: walletAddress.trim(),
                    requestedField: selectedField.id,
                    requestedBy: "Aid Worker Admin"
                })
            });

            if (!response.ok) throw new Error("Backend failed to create request");

            // Success Toast
            showToast('success', 'Request Dispatched', `Request created successfully.`);

            // Step 2: Clear Form
            setWalletAddress('');
            setSelectedField(null);
            setReason('');

            // Step 3: Refresh the history list from the backend (silently)
            fetchHistory(true);

        } catch (error) {
            console.error("Request Error:", error);
            showToast('error', 'Request Failed', 'Could not connect to the governance network.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRequests = requests.filter(r =>
        filter === 'All' || r.status.toLowerCase() === filter.toLowerCase()
    );

    return (
        <div className="page-enter grid lg:grid-cols-5 gap-8 pb-20">
            {/* Left: New Request Form */}
            <div className="lg:col-span-3 space-y-6">
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 sticky top-24">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#f59e0b10] rounded-lg flex items-center justify-center border border-[#f59e0b20]">
                            <Key size={20} className="text-[#f59e0b]" />
                        </div>
                        <h2 className="text-xl font-bold text-[#e2eaf8] uppercase tracking-wider">Request Data Access</h2>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">1. Refugee Wallet Address</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3d5278]" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl pl-12 pr-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278]"
                                    placeholder="Paste CUST... or PERA... address"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">2. Data Component</label>
                            <div className="grid grid-cols-2 gap-3">
                                {fields.map(field => {
                                    const Icon = field.icon;
                                    const isSelected = selectedField?.id === field.id;
                                    return (
                                        <div
                                            key={field.id}
                                            onClick={() => setSelectedField(field)}
                                            className={clsx(
                                                "p-4 border rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-3",
                                                isSelected
                                                    ? "bg-[#00c9b110] border-[#00c9b1] shadow-[0_0_15px_rgba(0,201,177,0.1)]"
                                                    : "bg-[#060d1f] border-[#1a2d4a] hover:border-[#3d5278] text-[#7a94bb] hover:text-[#e2eaf8]"
                                            )}
                                        >
                                            <Icon size={18} className={isSelected ? "text-[#00c9b1]" : "text-inherit"} />
                                            <span className="text-xs font-bold uppercase tracking-tighter">{field.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">3. Purpose of Access</label>
                            <textarea
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] min-h-[100px] resize-none"
                                placeholder="Briefly state why this data is required for aid delivery..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleRequest}
                            disabled={!walletAddress || !selectedField || isSubmitting}
                            className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-40 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> SUBMITTING...</> : 'SUBMIT CONSENT REQUEST'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Active Requests List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl flex flex-col min-h-[600px]">
                    <div className="p-6 border-b border-[#1a2d4a]">
                        <h3 className="text-[#e2eaf8] font-bold text-lg mb-6 tracking-tight">Access History</h3>
                        <div className="flex gap-2">
                            {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                        filter === status
                                            ? "bg-[#152342] text-[#00c9b1] border border-[#00c9b120]"
                                            : "text-[#3d5278] hover:text-[#e2eaf8]"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[700px]">
                        {isLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#00c9b1]" /></div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-[#3d5278]">
                                <Clock size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">No history found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1a2d4a]">
                                {filteredRequests.map(req => (
                                    <div key={req.id} className="p-6 hover:bg-[#152342] transition-colors group cursor-pointer">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                                    req.status === 'approved' ? "bg-[#10b98115] text-[#10b981]" :
                                                        req.status === 'rejected' ? "bg-[#ef444415] text-[#ef4444]" :
                                                            "bg-[#f59e0b15] text-[#f59e0b]"
                                                )}>
                                                    {req.status === 'approved' ? <CheckCircle size={16} /> :
                                                        req.status === 'rejected' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#e2eaf8]">{req.name || 'Refugee'}</p>
                                                    <p className="text-[10px] text-[#7a94bb] uppercase tracking-tighter">{req.requestedField}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border",
                                                req.status === 'approved' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                                    req.status === 'rejected' ? "bg-[#ef444410] text-[#ef4444] border-[#ef444420]" :
                                                        "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                            )}>
                                                {req.status}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-[#3d5278]">
                                            <span>{new Date(req.requestedAt || Date.now()).toLocaleDateString()}</span>
                                            <ChevronRight size={14} className="group-hover:text-[#00c9b1] transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestAccess;