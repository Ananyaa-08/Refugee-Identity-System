import React, { useEffect, useState } from 'react';
import {
    ClipboardList, Download, ExternalLink, Search,
    Filter, Calendar, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { clsx } from 'clsx';

const AdminAudit = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('All');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const tabs = ['All', 'Registration', 'Aid Issued', 'Consent', 'Migration'];

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.getAuditLogs();
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setLogs([]);
            setError(err.message || 'Unable to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Consent') return (log.type || '').startsWith('Consent');
        return log.type === activeTab;
    });

    const handleExport = () => {
        const header = ['Event Type', 'Refugee ID', 'Address', 'Timestamp UTC', 'Transaction Hash'];
        const rows = filteredLogs.map(log => [
            log.type || '',
            log.refugeeID || '',
            log.address || '',
            log.timestamp || '',
            log.txHash || '',
        ]);
        const csv = [header, ...rows]
            .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rims-audit-log.csv';
        link.click();
        URL.revokeObjectURL(url);
        showToast('success', 'Export Ready', 'Audit CSV downloaded.');
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-[#e2eaf8]">Audit Log</h2>
                    <p className="text-[#7a94bb] mt-1">Complete record of all on-chain activity</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#152342] text-white text-[11px] font-bold uppercase tracking-widest rounded-lg border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                >
                    <Download size={14} /> EXPORT CSV
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[#1a2d4a]">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200",
                            activeTab === tab
                                ? "bg-[#8b5cf620] text-[#8b5cf6] border border-[#8b5cf640]"
                                : "text-[#3d5278] hover:text-[#e2eaf8] hover:bg-[#152342]"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Audit Table */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a1428] border-b border-[#1a2d4a]">
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Event Type</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Refugee ID</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Address</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Timestamp (UTC)</th>
                                <th className="py-5 px-6 text-[#3d5278] text-[10px] uppercase font-bold tracking-widest">Transaction Hash</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a2d4a]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-14 px-6 text-center">
                                        <Loader2 size={32} className="text-[#00c9b1] animate-spin mx-auto mb-3" />
                                        <div className="text-[#7a94bb] text-sm">Loading audit activity...</div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-14 px-6 text-center">
                                        <div className="text-[#e2eaf8] text-sm font-bold">{error ? 'Unable to load audit logs' : 'No audit events found'}</div>
                                        <div className="text-[#7a94bb] text-xs mt-2">{error || 'Events will appear after registrations, access approvals, aid claims, or migrations.'}</div>
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#152342] transition-colors group">
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight border",
                                            log.type === 'Registration' ? "bg-[#00c9b110] text-[#00c9b1] border-[#00c9b120]" :
                                                log.type === 'Aid Issued' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                                    log.type === 'Consent Approved' ? "bg-[#8b5cf610] text-[#8b5cf6] border-[#8b5cf620]" :
                                                        "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                        )}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="font-mono text-xs text-[#00c9b1] font-bold">{log.refugeeID}</span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        {log.address ? (
                                            <span className="font-mono text-[11px] text-[#7a94bb]">
                                                {log.address.slice(0, 8)}...{log.address.slice(-4)}
                                            </span>
                                        ) : (
                                            <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">Not recorded</span>
                                        )}
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        <span className="text-[#e2eaf8] text-xs font-semibold">
                                            {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                        </span>
                                        <span className="text-[#3d5278] text-[10px] font-bold ml-2">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 whitespace-nowrap">
                                        {log.txHash ? (
                                            <a
                                                className="flex items-center gap-2 group/hash"
                                                href={`https://testnet.explorer.perawallet.app/tx/${log.txHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <span className="font-mono text-[10px] text-[#3d5278] group-hover/hash:text-[#8b5cf6] transition-colors">
                                                    {log.txHash.slice(0, 16)}...
                                                </span>
                                                <ExternalLink size={12} className="text-[#3d5278] group-hover/hash:text-[#8b5cf6] transition-colors" />
                                            </a>
                                        ) : (
                                            <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">Not recorded</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Simulation */}
                <div className="bg-[#0a1428] border-t border-[#1a2d4a] py-4 px-6 flex items-center justify-between">
                    <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest">Showing {filteredLogs.length} event{filteredLogs.length === 1 ? '' : 's'}</span>
                    <div className="flex gap-2">
                        <button disabled className="p-2 border border-[#1a2d4a] text-[#3d5278] rounded-lg opacity-40 cursor-not-allowed"><ChevronLeft size={16} /></button>
                        <button disabled className="p-2 border border-[#1a2d4a] text-[#3d5278] rounded-lg opacity-40 cursor-not-allowed"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAudit;
