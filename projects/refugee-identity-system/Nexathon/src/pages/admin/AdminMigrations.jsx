import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowLeftRight, ArrowRight, Info, CheckCircle,
    Shield, AlertTriangle, Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { clsx } from 'clsx';
import { api } from '../../utils/api';

const AdminMigrations = () => {
    const { showToast } = useToast();
    const [migrations, setMigrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingMig, setProcessingMig] = useState(null);
    const [submitStage, setSubmitStage] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmReject, setConfirmReject] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.migrationRequests();
            setMigrations(res.data || []);
        } catch {
            setMigrations([]);
            showToast('error', 'API Error', 'Could not load migration requests.');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const handleApprove = (mig) => {
        setProcessingMig(mig);
        setSubmitStage(1);

        setTimeout(() => setSubmitStage(2), 600);
        setTimeout(() => setSubmitStage(3), 1500);
        setTimeout(async () => {
            setSubmitStage(4);
            try {
                await api.migrationApprove(mig.id);
                setSubmitStage(5);
                setTimeout(() => setShowSuccess(true), 400);
            } catch (e) {
                setProcessingMig(null);
                setSubmitStage(0);
                showToast('error', 'Migration failed', e.message || String(e));
            }
        }, 2000);
    };

    const closeSuccess = () => {
        setMigrations((prev) => prev.filter((m) => m.id !== processingMig.id));
        setProcessingMig(null);
        setSubmitStage(0);
        setShowSuccess(false);
        showToast('success', 'Migration Approved', 'Wallet update has been recorded on Algorand.');
        refresh();
    };

    const handleReject = async (mig) => {
        try {
            await api.migrationReject(mig.id);
            setMigrations((prev) => prev.filter((m) => m.id !== mig.id));
            setConfirmReject(null);
            showToast('error', 'Migration Rejected', 'The migration request has been dismissed.');
            refresh();
        } catch (e) {
            showToast('error', 'Reject failed', e.message || String(e));
        }
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8]">Wallet Migration</h2>
                <p className="text-[#7a94bb] mt-1">Review and approve custodial → self-sovereign wallet transfers</p>
            </div>

            <div className="bg-[#00c9b108] border border-[#00c9b130] rounded-2xl p-6 flex gap-4 items-start animate-fadeIn">
                <Info className="text-[#00c9b1] shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                    <h4 className="text-[#e2eaf8] font-bold text-sm uppercase tracking-wider">What is wallet migration?</h4>
                    <p className="text-[#7a94bb] text-xs leading-relaxed max-w-2xl">
                        When a refugee with a custodial wallet gets a smartphone, they can claim full control of their identity by migrating to a Pera wallet.
                        The refugee signs a migration message with Pera; you submit the on-chain migration after confirming their new wallet has opted in to the app.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 text-[#8b5cf6] animate-spin" />
                </div>
            ) : (
            <div className="space-y-6">
                {migrations.length === 0 ? (
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl py-32 flex flex-col items-center justify-center text-center animate-fadeIn">
                        <ArrowLeftRight size={64} className="text-[#3d5278] mb-6 opacity-20" />
                        <h4 className="text-[#e2eaf8] font-bold text-lg">No pending migration requests</h4>
                        <p className="text-[#7a94bb] text-sm mt-1">All identity transfers have been processed.</p>
                    </div>
                ) : (
                    migrations.map((mig, i) => (
                        <div key={mig.id} style={{ animationDelay: `${i * 100}ms` }} className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl animate-fadeSlideUp group hover:border-[#8b5cf640] transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 flex gap-2">
                                <span className="bg-[#f59e0b10] text-[#f59e0b] text-[10px] font-bold px-2 py-1 rounded border border-[#f59e0b20] uppercase tracking-widest">Pending</span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#1a2d4a] pb-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-[#8b5cf615] border border-[#8b5cf630] text-[#8b5cf6] rounded-2xl flex items-center justify-center font-bold text-lg">
                                        <ArrowLeftRight size={22} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-[#e2eaf8] font-bold text-xl">{mig.refugeeName}</h3>
                                            <span className="bg-[#152342] text-[#7a94bb] text-[10px] font-bold px-2 py-0.5 rounded uppercase">{mig.camp}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[#3d5278] font-mono text-xs">
                                            <span>ID: {mig.refugeeID}</span>
                                            <span className="w-1 h-1 rounded-full bg-[#3d5278]" />
                                            <span>Requested: {new Date(mig.requestedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-[1fr,60px,1fr] items-center gap-6 mb-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[#ef4444] text-[10px] font-bold uppercase tracking-[0.2em]">Custodial Wallet (Retiring)</label>
                                        <span className="bg-[#ef444415] text-[#ef4444] text-[9px] font-bold px-2 py-0.5 rounded border border-[#ef444420] uppercase">Retiring</span>
                                    </div>
                                    <div className="bg-[#060d1f] border border-[#ef444430] rounded-xl p-5 group-hover:bg-[#ef444403] transition-colors">
                                        <div className="font-mono text-gray-500 text-xs break-all leading-relaxed mb-2">
                                            {mig.oldWallet}
                                        </div>
                                        <div className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest">Original QR / custodial address</div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-1 mt-6">
                                    <ArrowRight className="text-[#8b5cf6] animate-pulse" />
                                    <span className="text-[#3d5278] text-[9px] font-bold uppercase tracking-widest">MIGRATE</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[#00c9b1] text-[10px] font-bold uppercase tracking-[0.2em]">New Pera Wallet</label>
                                        <span className="bg-[#00c9b115] text-[#00c9b1] text-[9px] font-bold px-2 py-0.5 rounded border border-[#00c9b120] uppercase">Self-Sovereign</span>
                                    </div>
                                    <div className="bg-[#00c9b105] border border-[#00c9b130] rounded-xl p-5 group-hover:bg-[#00c9b10a] transition-colors">
                                        <div className="font-mono text-[#00c9b1] text-xs break-all leading-relaxed mb-2 font-bold select-all">
                                            {mig.newWallet}
                                        </div>
                                        <div className="text-[10px] text-[#00c9b1] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1.5">
                                            <Shield size={10} /> Refugee-controlled device
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-[#1a2d4a] pt-6">
                                <button
                                    type="button"
                                    onClick={() => setConfirmReject(mig)}
                                    className="px-6 py-2.5 border border-[#ef444430] text-[#ef4444] text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#ef444410] transition-colors"
                                >
                                    REJECT
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApprove(mig)}
                                    className="px-10 py-2.5 bg-[#00c9b1] text-[#060d1f] text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#00e0c5] shadow-[0_4px_20px_rgba(0,201,177,0.15)] transition-all active:scale-95"
                                >
                                    APPROVE MIGRATION
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            )}

            {processingMig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative overflow-hidden text-center">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#8b5cf6]" />

                        {!showSuccess ? (
                            <>
                                <Loader2 className="w-12 h-12 text-[#8b5cf6] animate-spin mx-auto mb-6" />
                                <h3 className="text-[#e2eaf8] text-xl font-bold mb-8">Processing Migration</h3>
                                <div className="space-y-4 text-left">
                                    {[
                                        { label: 'Verifying new wallet signature', done: submitStage >= 1 },
                                        { label: 'Validating identity ownership', done: submitStage >= 2 },
                                        { label: 'Submitting migrate_wallet to Algorand', done: submitStage >= 3 },
                                        { label: 'Updating request records', done: submitStage >= 4 },
                                        { label: 'Migration complete ✓', done: submitStage >= 5 },
                                    ].map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {s.done ? <CheckCircle size={14} className="text-[#00c9b1]" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#1a2d4a] animate-pulse" />}
                                                <span className={clsx('text-xs font-medium', s.done ? 'text-[#e2eaf8]' : 'text-[#3d5278]')}>{s.label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="animate-fadeIn">
                                <div className="w-20 h-20 bg-[#10b98115] rounded-full flex items-center justify-center mx-auto mb-6 text-[#10b981] animate-bounce">
                                    <CheckCircle size={48} strokeWidth={3} />
                                </div>
                                <h3 className="text-white text-2xl font-bold mb-2">Migration Approved</h3>
                                <p className="text-[#7a94bb] text-sm mb-8 leading-relaxed">
                                    Wallet ownership successfully transferred to refugee&apos;s personal device on-chain.
                                </p>
                                <div className="bg-[#060d1f] p-4 rounded-xl border border-[#1a2d4a] mb-8">
                                    <label className="block text-[#3d5278] text-[9px] font-bold uppercase tracking-widest mb-1">New Control Wallet</label>
                                    <div className="font-mono text-[#00c9b1] text-[10px] break-all">{processingMig.newWallet}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeSuccess}
                                    className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                                >
                                    CLOSE
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {confirmReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp text-center">
                        <div className="w-16 h-16 bg-[#ef444410] rounded-full flex items-center justify-center mx-auto mb-6 text-[#ef4444]">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-white text-xl font-bold mb-4">Reject Migration?</h3>
                        <p className="text-[#7a94bb] text-sm mb-10 leading-relaxed">
                            The refugee will keep their custodial wallet. They will need to submit a new request if this was a mistake.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => handleReject(confirmReject)}
                                className="w-full py-3 bg-[#ef4444] text-[#060d1f] font-bold rounded-xl hover:bg-[#ff5f5f] transition-all"
                            >
                                CONFIRM REJECTION
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmReject(null)}
                                className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMigrations;
