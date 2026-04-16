import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const StatusPill = ({ status }) => {
    const st = (status || '').toLowerCase();
    const cfg =
        st === 'approved'
            ? { bg: 'bg-[#10b98115]', border: 'border-[#10b98130]', text: 'text-[#10b981]', icon: CheckCircle, label: 'Approved' }
            : st === 'rejected'
                ? { bg: 'bg-[#ef444415]', border: 'border-[#ef444430]', text: 'text-[#ef4444]', icon: XCircle, label: 'Rejected' }
                : { bg: 'bg-[#f59e0b10]', border: 'border-[#f59e0b20]', text: 'text-[#f59e0b]', icon: Clock, label: 'Pending' };
    const Icon = cfg.icon;
    return (
        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-widest', cfg.bg, cfg.border, cfg.text)}>
            <Icon size={12} />
            {cfg.label}
        </span>
    );
};

const MigrationRequests = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);

    const refresh = async () => {
        setLoading(true);
        try {
            const res = await api.migrationRequests();
            setRows(res?.data || []);
        } catch (e) {
            setRows([]);
            showToast('error', 'API Error', e.message || 'Could not load migration requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="page-enter space-y-8 pb-20">
            <div className="flex items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 tracking-tight flex items-center gap-3">
                        <ArrowLeftRight className="text-[#00c9b1]" /> Migration Requests
                    </h2>
                    <p className="text-[#7a94bb] text-sm">View migration requests submitted by refugees (W1 → W2). Approvals are handled by admins.</p>
                </div>
                <button
                    type="button"
                    onClick={refresh}
                    className="px-5 py-2.5 bg-[#152342] border border-[#1a2d4a] rounded-xl text-[#e2eaf8] text-[11px] font-bold uppercase tracking-widest hover:border-[#00c9b130] transition-colors"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 text-[#00c9b1] animate-spin" />
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl py-32 flex flex-col items-center justify-center text-center animate-fadeIn">
                    <ArrowLeftRight size={64} className="text-[#3d5278] mb-6 opacity-20" />
                    <h4 className="text-[#e2eaf8] font-bold text-lg">No migration requests</h4>
                    <p className="text-[#7a94bb] text-sm mt-1">Nothing has been submitted yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.map((r, i) => (
                        <div key={r.id || i} className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-6 shadow-xl animate-fadeSlideUp">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="text-[#e2eaf8] font-bold">{r.refugeeName || 'Migration request'}</div>
                                        <StatusPill status={r.status} />
                                    </div>
                                    <div className="text-[#3d5278] font-mono text-xs">
                                        ID: {r.identity_id || r.refugeeID || '—'} {r.requestedAt ? `• ${new Date(r.requestedAt).toLocaleString()}` : ''}
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-4">
                                    <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Old wallet (W1)</label>
                                    <div className="font-mono text-[#7a94bb] text-xs break-all select-all">{r.oldWallet || '—'}</div>
                                </div>
                                <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-4">
                                    <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">New wallet (W2)</label>
                                    <div className="font-mono text-[#00c9b1] text-xs break-all select-all">{r.newWallet || '— (set in Wallet Migration Tools)'}</div>
                                </div>
                            </div>

                            <div className="flex justify-end mt-5">
                                <button
                                    type="button"
                                    onClick={() => navigate('/aid-worker/migration', { state: { migrationRequest: r } })}
                                    className="px-6 py-2.5 bg-[#00c9b1] text-[#060d1f] text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#00e0c5] transition-all active:scale-95"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MigrationRequests;

