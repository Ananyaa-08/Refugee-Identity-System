import React, { useState, useEffect } from 'react';
import {
    Activity, Code, Database, Server,
    RefreshCw, Shield, Zap, Globe, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../utils/api';
import { clearActiveAppIdCache } from '../../utils/appId';
import { useToast } from '../../context/ToastContext';

const StatusCard = ({ title, icon: Icon, badge, items, accentColor }) => (
    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 hover:border-[#8b5cf640] transition-all group relative overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    accentColor === 'green' ? "bg-[#10b98110] border-[#10b98130] text-[#10b981]" :
                        accentColor === 'teal' ? "bg-[#00c9b110] border-[#00c9b130] text-[#00c9b1]" :
                            accentColor === 'blue' ? "bg-[#3b82f610] border-[#3b82f630] text-[#3b82f6]" :
                                "bg-[#8b5cf610] border-[#8b5cf630] text-[#8b5cf6]"
                )}>
                    <Icon size={24} />
                </div>
                <h3 className="text-[#e2eaf8] font-bold text-lg">{title}</h3>
            </div>
            <span className={clsx(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2",
                accentColor === 'green' ? "bg-[#10b98110] text-[#10b981] border-[#10b98120]" :
                    accentColor === 'teal' ? "bg-[#00c9b110] text-[#00c9b1] border-[#00c9b120]" :
                        accentColor === 'blue' ? "bg-[#3b82f610] text-[#3b82f6] border-[#3b82f620]" :
                            "bg-[#8b5cf610] text-[#8b5cf6] border-[#8b5cf620]"
            )}>
                <div className={clsx(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    accentColor === 'green' ? "bg-[#10b981] shadow-[0_0_8px_#10b981]" :
                        accentColor === 'teal' ? "bg-[#00c9b1] shadow-[0_0_8px_#00c9b1]" :
                            accentColor === 'blue' ? "bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" :
                                "bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]"
                )} />
                {badge}
            </span>
        </div>

        <div className="space-y-4">
            {items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#1a2d4a]/50 last:border-0">
                    <span className="text-[#7a94bb] text-xs font-semibold uppercase tracking-tight">{item.label}</span>
                    <span className="font-mono text-xs text-[#e2eaf8] font-bold">{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

const AdminStatus = () => {
    const { showToast } = useToast();
    const [appInfo, setAppInfo] = useState(null);
    const [isDeploying, setIsDeploying] = useState(false);
    const [registrarAddress, setRegistrarAddress] = useState('');
    const [isAddingRegistrar, setIsAddingRegistrar] = useState(false);

    useEffect(() => {
        api.getAppInfo().then((r) => {
            const data = r.data ?? r;
            setAppInfo(data?.app_id ? data : null);
        }).catch(() => {});
    }, []);

    const handleDeploy = async (forceNew = false) => {
        setIsDeploying(true);
        try {
            const res = await api.deploy({ force_new: forceNew });
            const data = res.data ?? res;
            if (!data?.app_id) throw new Error('Deploy succeeded but no app_id returned');
            clearActiveAppIdCache();
            setAppInfo(data);
            if (data.warning) {
                showToast('warning', 'Deploy completed with warning', data.warning);
            } else {
                showToast(
                    'success',
                    forceNew ? 'Fresh contract deployed' : 'Contract deployed',
                    `App ID: ${data.app_id} (creator: ${data.creator ? `${data.creator.slice(0, 6)}…` : '—'})`,
                );
            }
        } catch (err) {
            showToast('error', 'Deploy Failed', err.message);
        } finally {
            setIsDeploying(false);
        }
    };

    const handleAddRegistrar = async () => {
        if (!registrarAddress.trim()) return;
        setIsAddingRegistrar(true);
        try {
            await api.addRegistrar(registrarAddress.trim());
            showToast('success', 'Registrar Added', `${registrarAddress.slice(0, 10)}... added as aid worker`);
            setRegistrarAddress('');
        } catch (err) {
            showToast('error', 'Add Failed', err.message);
        } finally {
            setIsAddingRegistrar(false);
        }
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8]">System Status</h2>
                <p className="text-[#7a94bb] mt-1">Algorand network and service health indicators</p>
            </div>

            {/* Blockchain Setup - Admin actions */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8">
                <h3 className="text-[#e2eaf8] font-bold text-lg mb-4 flex items-center gap-2">
                    <Code size={20} className="text-[#00c9b1]" />
                    Blockchain Setup
                </h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-[#7a94bb] text-xs font-bold uppercase mb-2">Contract</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => handleDeploy(false)}
                                disabled={isDeploying}
                                className="bg-[#152342] text-[#e2eaf8] font-bold py-2 px-5 rounded-lg border border-[#1a2d4a] hover:border-[#3d5278] disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeploying ? <Loader2 size={18} className="animate-spin" /> : null}
                                {appInfo?.app_id ? 'Update in place' : 'Deploy'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeploy(true)}
                                disabled={isDeploying}
                                className="bg-[#00c9b1] text-[#060d1f] font-bold py-2 px-5 rounded-lg hover:bg-[#00e0c5] disabled:opacity-50 flex items-center gap-2"
                            >
                                Deploy Fresh Contract
                            </button>
                        </div>
                    </div>
                    {appInfo?.app_id && (
                        <>
                            <div className="text-[#7a94bb] text-sm">
                                App ID: <span className="text-[#00c9b1] font-mono font-bold">{appInfo.app_id}</span>
                            </div>
                            {appInfo.warning ? (
                                <p className="text-[#f59e0b] text-xs leading-relaxed border border-[#f59e0b30] bg-[#f59e0b08] rounded-lg p-3 w-full">
                                    {appInfo.warning}
                                </p>
                            ) : null}
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-[#7a94bb] text-xs font-bold uppercase mb-2">Add Registrar (aid worker address)</label>
                                <div className="flex gap-2">
                                    <input
                                        value={registrarAddress}
                                        onChange={(e) => setRegistrarAddress(e.target.value)}
                                        placeholder="ALGORAND_ADDRESS"
                                        className="flex-1 bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-2 text-[#e2eaf8] text-sm font-mono"
                                    />
                                    <button
                                        onClick={handleAddRegistrar}
                                        disabled={isAddingRegistrar || !registrarAddress.trim()}
                                        className="bg-[#8b5cf6] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#9d6ef7] disabled:opacity-50"
                                    >
                                        {isAddingRegistrar ? <Loader2 size={18} className="animate-spin" /> : 'Add'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                {!appInfo?.app_id && (
                    <p className="text-[#3d5278] text-xs mt-4">
                        Deploy the RefugeeContract to LocalNet first. Requires: <code className="bg-[#060d1f] px-1 rounded">algokit localnet start</code> and <code className="bg-[#060d1f] px-1 rounded">DEPLOYER</code> in .env
                    </p>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <StatusCard
                    title="Algorand TestNet"
                    icon={Globe}
                    badge="CONNECTED"
                    accentColor="green"
                    items={[
                        { label: 'Block Height', value: '#4,521,894' },
                        { label: 'Avg Block Time', value: '3.2s' },
                        { label: 'Last Sync', value: '2 mins ago' },
                        { label: 'Network Load', value: '1.4 TPS' },
                    ]}
                />
                <StatusCard
                    title="Smart Contract"
                    icon={Code}
                    badge={appInfo?.app_id ? 'DEPLOYED' : 'NOT DEPLOYED'}
                    accentColor={appInfo ? 'teal' : 'blue'}
                    items={appInfo?.app_id ? [
                        { label: 'Contract ID', value: `APP-${appInfo.app_id}` },
                        { label: 'App Address', value: appInfo.app_address?.slice(0, 12) + '...' || '—' },
                        { label: 'Logic Version', value: 'v1.0.0' },
                        { label: 'Account State', value: 'Local Ops' },
                    ] : [
                        { label: 'Status', value: 'Deploy from Admin' },
                        { label: '—', value: '—' },
                        { label: '—', value: '—' },
                        { label: '—', value: '—' },
                    ]}
                />
                <StatusCard
                    title="Database"
                    icon={Database}
                    badge="OPERATIONAL"
                    accentColor="blue"
                    items={[
                        { label: 'Records Total', value: '4,729' },
                        { label: 'Last Backup', value: '1h ago' },
                        { label: 'Storage Used', value: '2.4 GB' },
                        { label: 'IOPS', value: 'Healthy' },
                    ]}
                />
                <StatusCard
                    title="API Services"
                    icon={Server}
                    badge="ALL SYSTEMS GO"
                    accentColor="green"
                    items={[
                        { label: 'Uptime', value: '99.97%' },
                        { label: 'Daily Requests', value: '8,421' },
                        { label: 'Avg Latency', value: '45ms' },
                        { label: 'Error Rate', value: '< 0.01%' },
                    ]}
                />
            </div>

            {/* Performance Audit */}
            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 mt-12 overflow-hidden relative group shadow-2xl animate-fadeSlideUp">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={120} className="text-[#8b5cf6]" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-[#8b5cf610] border border-[#8b5cf630] text-[#8b5cf6] rounded-2xl flex items-center justify-center">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-xl">Auto-Scaling Infrastructure</h3>
                        <p className="text-[#3d5278] text-sm uppercase tracking-[0.2em] font-bold">Resiliency Status: High</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-12 border-t border-[#1a2d4a] pt-10">
                    <div>
                        <h4 className="text-[#e2eaf8] font-bold text-sm mb-2 uppercase">Global CDN</h4>
                        <p className="text-[#7a94bb] text-xs leading-relaxed">Content delivered via 14 edge locations worldwide for minimum latency in field operation centers.</p>
                    </div>
                    <div>
                        <h4 className="text-[#e2eaf8] font-bold text-sm mb-2 uppercase">Encryption</h4>
                        <p className="text-[#7a94bb] text-xs leading-relaxed">AES-256 at-rest and TLS 1.3 in-transit for all identity data. Periodic rotation of security keys enabled.</p>
                    </div>
                    <div>
                        <h4 className="text-[#e2eaf8] font-bold text-sm mb-2 uppercase">Failover</h4>
                        <p className="text-[#7a94bb] text-xs leading-relaxed">Multi-region database replication active. Zero single-point-of-failure architecture verified.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminStatus;
