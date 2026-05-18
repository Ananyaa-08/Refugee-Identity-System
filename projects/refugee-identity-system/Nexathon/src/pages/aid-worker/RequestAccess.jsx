import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Key, ShieldCheck, Globe, User, FileText,
    CheckCircle, Clock, AlertCircle, ChevronRight, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';

const FIELDS = [
    { id: 'ageProof', label: 'Age Verification', icon: ShieldCheck },
    { id: 'nationality', label: 'Nationality Proof', icon: Globe },
    { id: 'identity', label: 'Full Identity', icon: User },
    { id: 'record', label: 'Registration Record', icon: FileText },
];

const RequestAccess = () => {
    const { showToast } = useToast();
    const [refugeeId, setRefugeeId] = useState('');
    const [selectedField, setSelectedField] = useState(null);
    const [purpose, setPurpose] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [historyError, setHistoryError] = useState(null);

    const canSubmit = useMemo(() => {
        const id = refugeeId.trim().toUpperCase();
        return /^REF-\d{4}-\d{3}$/i.test(id) && selectedField && purpose.trim().length >= 3;
    }, [refugeeId, selectedField, purpose]);

    const fetchHistory = useCallback(async () => {
        setHistoryError(null);
        try {
            const data = await api.getAccessRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Access history fetch error:', err);
            setRequests([]);
            setHistoryError('Could not load request history.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleRequest = async () => {
        if (!canSubmit) {
            showToast(
                'warning',
                'Incomplete form',
                'Enter a valid Refugee ID (REF-YYYY-NNN), select a data component, and describe the purpose.',
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await api.createAccessRequest({
                refugee_id: refugeeId.trim().toUpperCase(),
                requestedField: selectedField.id,
                purpose: purpose.trim(),
                requestedBy: 'Aid Worker',
            });

            showToast(
                'success',
                'Request submitted',
                'The refugee will see this request in their portal under Data Governance.',
            );

            setRefugeeId('');
            setSelectedField(null);
            setPurpose('');
            await fetchHistory();
        } catch (error) {
            showToast('error', 'Request failed', error.message || 'Could not submit access request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRequests = requests.filter(
        (r) => filter === 'All' || r.status?.toLowerCase() === filter.toLowerCase(),
    );

    return (
        <div className="page-enter grid lg:grid-cols-5 gap-8 pb-20">
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
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">
                                1. Refugee ID
                            </label>
                            <input
                                type="text"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-4 text-[#e2eaf8] text-sm font-mono focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] uppercase"
                                placeholder="REF-2026-001"
                                value={refugeeId}
                                onChange={(e) => setRefugeeId(e.target.value)}
                            />
                            <p className="text-[#3d5278] text-[11px] pl-2">
                                Use the Refugee ID from registration or the printed QR card.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">
                                2. Data Component
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {FIELDS.map((field) => {
                                    const Icon = field.icon;
                                    const isSelected = selectedField?.id === field.id;
                                    return (
                                        <button
                                            key={field.id}
                                            type="button"
                                            onClick={() => setSelectedField(field)}
                                            className={clsx(
                                                'p-4 border rounded-xl transition-all duration-200 flex items-center gap-3 text-left',
                                                isSelected
                                                    ? 'bg-[#00c9b110] border-[#00c9b1] shadow-[0_0_15px_rgba(0,201,177,0.1)]'
                                                    : 'bg-[#060d1f] border-[#1a2d4a] hover:border-[#3d5278] text-[#7a94bb] hover:text-[#e2eaf8]',
                                            )}
                                        >
                                            <Icon size={18} className={isSelected ? 'text-[#00c9b1]' : 'text-inherit'} />
                                            <span className="text-xs font-bold uppercase tracking-tighter">{field.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest pl-2">
                                3. Purpose of Access
                            </label>
                            <textarea
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] min-h-[100px] resize-none"
                                placeholder="Briefly state why this data is required for aid delivery..."
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleRequest}
                            disabled={!canSubmit || isSubmitting}
                            className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-40 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Submitting…
                                </>
                            ) : (
                                'Submit request'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl flex flex-col min-h-[600px]">
                    <div className="p-6 border-b border-[#1a2d4a]">
                        <h3 className="text-[#e2eaf8] font-bold text-lg mb-6 tracking-tight">Your requests</h3>
                        <div className="flex gap-2 flex-wrap">
                            {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFilter(status)}
                                    className={clsx(
                                        'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                                        filter === status
                                            ? 'bg-[#152342] text-[#00c9b1] border border-[#00c9b120]'
                                            : 'text-[#3d5278] hover:text-[#e2eaf8]',
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[700px]">
                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="animate-spin text-[#00c9b1]" />
                            </div>
                        ) : historyError ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <AlertCircle size={40} className="text-[#f59e0b] mb-4 opacity-60" />
                                <p className="text-sm text-[#7a94bb]">{historyError}</p>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-[#3d5278]">
                                <Clock size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">No requests yet</p>
                                <p className="text-xs mt-2 max-w-[200px]">Submitted requests appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1a2d4a]">
                                {filteredRequests.map((req) => (
                                    <div key={req.id} className="p-6 hover:bg-[#152342] transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={clsx(
                                                        'w-8 h-8 rounded-full flex items-center justify-center',
                                                        req.status === 'approved'
                                                            ? 'bg-[#10b98115] text-[#10b981]'
                                                            : req.status === 'rejected'
                                                              ? 'bg-[#ef444415] text-[#ef4444]'
                                                              : 'bg-[#f59e0b15] text-[#f59e0b]',
                                                    )}
                                                >
                                                    {req.status === 'approved' ? (
                                                        <CheckCircle size={16} />
                                                    ) : req.status === 'rejected' ? (
                                                        <AlertCircle size={16} />
                                                    ) : (
                                                        <Clock size={16} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#e2eaf8]">
                                                        {req.refugee_id || req.refugeeId || 'Refugee'}
                                                    </p>
                                                    <p className="text-[10px] text-[#7a94bb] uppercase tracking-tighter">
                                                        {req.requestedField}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={clsx(
                                                    'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border',
                                                    req.status === 'approved'
                                                        ? 'bg-[#10b98110] text-[#10b981] border-[#10b98120]'
                                                        : req.status === 'rejected'
                                                          ? 'bg-[#ef444410] text-[#ef4444] border-[#ef444420]'
                                                          : 'bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]',
                                                )}
                                            >
                                                {req.status}
                                            </span>
                                        </div>
                                        {req.purpose && (
                                            <p className="text-[11px] text-[#7a94bb] mb-2 line-clamp-2">{req.purpose}</p>
                                        )}
                                        <div className="flex items-center justify-between text-[10px] text-[#3d5278]">
                                            <span>{new Date(req.requestedAt || Date.now()).toLocaleDateString()}</span>
                                            <ChevronRight size={14} />
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
