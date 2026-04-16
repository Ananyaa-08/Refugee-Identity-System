import React, { useState, useEffect } from 'react';
import {
    Users, Package, ArrowLeftRight, ShieldAlert,
    ArrowRight, TrendingUp, TrendingDown, Clock,
    Download, CheckCircle, UserPlus, ShieldCheck
} from 'lucide-react';
import { StatCard } from '../../components/ui/Common';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { formatAddress } from '../../utils/format';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [pendingWorkers, setPendingWorkers] = useState([]);
    const [stats, setStats] = useState({
        totalRegistered: 0,
        aidClaimsThisWeek: 0,
        pendingMigrations: 0,
        blockedDuplicates: 0,
        registrationsByDay: [],
        aidDistribution: [],
        recentActivity: [],
    });

    // Load pending staff registrations from localStorage
    useEffect(() => {
        const loadPending = () => {
            const workers = JSON.parse(localStorage.getItem('demo_aid_workers') || '[]');
            setPendingWorkers(workers.filter(w => w.status === 'pending'));
        };
        loadPending();

        const fetchStats = async () => {
            try {
                const res = await api.getAdminStats();
                if (res?.data) setStats(prev => ({ ...prev, ...res.data }));
            } catch (err) {
                console.error('Failed to fetch admin stats:', err);
            }
        };
        fetchStats();

        const interval = setInterval(loadPending, 5000);
        return () => clearInterval(interval);
    }, []);

    const maxRegistrations = Math.max(...stats.registrationsByDay.map(item => Number(item.count) || 0), 1);
    const maxAidDistribution = Math.max(...stats.aidDistribution.map(item => Number(item.count) || 0), 1);

    const handleApproveWorker = (workerId) => {
        const workers = JSON.parse(localStorage.getItem('demo_aid_workers') || '[]');
        const updated = workers.map(w =>
            w.id === workerId ? { ...w, status: 'approved' } : w
        );
        localStorage.setItem('demo_aid_workers', JSON.stringify(updated));
        setPendingWorkers(prev => prev.filter(w => w.id !== workerId));
        showToast('success', 'Staff Approved', 'Aid worker can now log in.');
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8]">Admin Overview</h2>
                <p className="text-[#7a94bb] mt-1">System-wide monitoring and controls</p>
            </div>

            {/* Stats Row */}
            <div className="grid md:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="TOTAL REGISTERED"
                    value={Number(stats.totalRegistered || 0).toLocaleString()}
                    accentColor="#00c9b1"
                    change="Loaded from backend"
                    changeType="neutral"
                />
                <StatCard
                    icon={Package}
                    label="AID CLAIMS THIS WEEK"
                    value={String(stats.aidClaimsThisWeek || 0)}
                    accentColor="#10b981"
                    change="Last 7 days"
                    changeType="neutral"
                />
                <div onClick={() => navigate('/admin/migrations')} className="cursor-pointer">
                    <StatCard
                        icon={ArrowLeftRight}
                        label="PENDING MIGRATIONS"
                        value={String(stats.pendingMigrations || 0)}
                        accentColor="#f59e0b"
                        change="Awaiting approval"
                        changeType="neutral"
                    />
                </div>
                <StatCard
                    icon={ShieldAlert}
                    label="BLOCKED DUPLICATES"
                    value={String(stats.blockedDuplicates || 0)}
                    accentColor="#ef4444"
                    change="Detected by backend"
                    changeType="neutral"
                />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-8 mt-8">
                {/* Registrations Chart */}
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                    <h3 className="text-[#e2eaf8] font-bold mb-8 uppercase tracking-wider text-sm">Registrations This Week</h3>
                    <div className="h-48 relative flex items-end gap-3 px-4 pb-8">
                        {/* Guide Lines */}
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="absolute left-0 right-0 border-t border-[#1a2d4a]" style={{ bottom: `${(i + 1) * 25}%` }} />
                        ))}

                        {stats.registrationsByDay.map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div
                                    className="w-full bg-[#00c9b1] rounded-t-sm transition-all duration-500 hover:bg-[#00e0c5] relative"
                                    style={{ height: `${((Number(item.count) || 0) / maxRegistrations) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#152342] text-[#00c9b1] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#00c9b140] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {item.count}
                                    </div>
                                </div>
                                <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-tighter">{item.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aid Distribution Chart */}
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                    <h3 className="text-[#e2eaf8] font-bold mb-8 uppercase tracking-wider text-sm">Aid Distribution by Type</h3>
                    <div className="space-y-6">
                        {stats.aidDistribution.map((item, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-[#7a94bb] text-xs font-bold w-20 uppercase tracking-tight">{item.label}</span>
                                <div className="flex-1 bg-[#152342] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${((Number(item.count) || 0) / maxAidDistribution) * 100}%`, backgroundColor: i === 0 ? '#10b981' : '#f59e0b' }}
                                    />
                                </div>
                                <span className="font-mono text-[11px] text-[#e2eaf8] w-10 text-right">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff Approval Queue */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00c9b1] opacity-[0.02] rounded-full -mr-16 -mt-16 blur-3xl"></div>

                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1a2d4a]">
                    <div className="flex items-center gap-3">
                        <UserPlus size={18} className="text-[#00c9b1]" />
                        <h3 className="text-[#e2eaf8] font-bold uppercase tracking-wider text-sm">Pending Staff Approvals</h3>
                    </div>
                    {pendingWorkers.length > 0 && (
                        <span className="bg-[#00c9b110] text-[#00c9b1] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#00c9b120]">
                            {pendingWorkers.length} AWAITING ACTION
                        </span>
                    )}
                </div>

                {pendingWorkers.length === 0 ? (
                    <div className="py-10 text-center">
                        <ShieldCheck size={40} className="text-[#1a2d4a] mx-auto mb-4 opacity-20" />
                        <p className="text-[#3d5278] text-sm italic">No pending staff registrations.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingWorkers.map((worker) => (
                            <div key={worker.id} className="flex items-center justify-between p-4 bg-[#0a1428] border border-[#1a2d4a] rounded-xl hover:border-[#00c9b140] transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#152342] rounded-full flex items-center justify-center text-[#00c9b1] font-bold border border-[#1a2d4a]">
                                        {worker.name[0]}
                                    </div>
                                    <div>
                                        <div className="text-[#e2eaf8] font-bold text-sm tracking-wide">{worker.name}</div>
                                        <div className="text-[#7a94bb] font-mono text-[10px] flex items-center gap-2">
                                            ID: <span className="text-[#00c9b1]">{worker.id}</span>
                                            <span className="text-[#1a2d4a]">|</span>
                                            Status: <span className="text-yellow-500/80">Pending</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApproveWorker(worker.id)}
                                    className="flex items-center gap-2 bg-[#00c9b1] text-[#060d1f] font-bold px-4 py-2 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(0,201,177,0.1)]"
                                >
                                    <CheckCircle size={14} /> APPROVE
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1a2d4a]">
                    <h3 className="text-[#e2eaf8] font-bold uppercase tracking-wider text-sm">Recent On-Chain Activity</h3>
                    <button onClick={() => navigate('/admin/audit')} className="text-[#8b5cf6] text-[10px] font-bold uppercase tracking-[0.2em] hover:underline">VIEW FULL LOG</button>
                </div>

                <div className="divide-y divide-[#1a2d4a]">
                    {stats.recentActivity.length === 0 ? (
                        <div className="py-8 text-center text-[#3d5278] text-sm italic">No recent activity yet.</div>
                    ) : stats.recentActivity.map((log) => (
                        <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 animate-fadeIn">
                            <div className="flex items-center gap-4">
                                <span className={clsx(
                                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight border",
                                    log.type === 'Registration' ? "bg-[#00c9b110] text-[#00c9b1] border-[#00c9b120]" :
                                        log.type === 'Aid Issued' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                                            log.type === 'Consent Approved' ? "bg-[#8b5cf610] text-[#8b5cf6] border-[#8b5cf620]" :
                                                "bg-[#f59e0b10] text-[#f59e0b] border-[#f59e0b20]"
                                )}>
                                    {log.type}
                                </span>
                                <div className="space-y-0.5">
                                    <div className="font-mono text-xs text-[#e2eaf8]">{log.refugeeID}</div>
                                    <div className="font-mono text-[10px] text-[#3d5278]" title={log.address || ''}>
                                        {log.address ? formatAddress(log.address) : 'No address recorded'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-[11px] text-[#7a94bb] flex items-center gap-1.5">
                                    <Clock size={12} className="text-[#3d5278]" />
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="font-mono text-[10px] text-[#3d5278] bg-[#060d1f] px-2 py-1 rounded border border-[#1a2d4a] hidden lg:block">
                                    {log.txHash ? `${log.txHash.slice(0, 10)}...` : 'No tx recorded'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
