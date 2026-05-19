import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    Package,
    Wallet,
    MapPin,
    Hash,
    Lock,
    ArrowRight,
    RefreshCw,
    Activity,
    CheckCircle2,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../../components/ui/Common';
import { useIdentity } from '../../context/IdentityContext';
import { formatAddress } from '../../utils/format';
import { canRequestWalletMigration } from '../../utils/refugeeMigration';

const STATUS_LABEL = {
    active: { label: 'Active', cls: 'bg-[#10b98115] text-[#10b981] border-[#10b98140]', dot: 'bg-[#10b981]' },
    migrated: { label: 'Self-Sovereign', cls: 'bg-[#8b5cf615] text-[#c4b5fd] border-[#8b5cf640]', dot: 'bg-[#8b5cf6]' },
    pending_migration: {
        label: 'Migration Pending',
        cls: 'bg-[#f59e0b15] text-[#fcd34d] border-[#f59e0b40]',
        dot: 'bg-[#f59e0b]',
    },
    disabled: { label: 'Disabled', cls: 'bg-[#ef444412] text-[#fca5a5] border-[#ef444440]', dot: 'bg-[#ef4444]' },
};

const IdentityBadge = ({ status }) => {
    const cfg = STATUS_LABEL[status] || STATUS_LABEL.active;
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${cfg.cls}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} glow-teal`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{cfg.label}</span>
        </div>
    );
};

const RefugeeDashboard = () => {
    const navigate = useNavigate();
    const { identity } = useIdentity();
    const showMigration = canRequestWalletMigration(identity);

    const status = identity?.status || 'active';
    const walletType = (identity?.wallet_type || identity?.walletType || '').toLowerCase();
    const isCustodial = walletType === 'custodial';
    const isSelfSovereign = walletType === 'pera';
    const isMigrated = status === 'migrated';
    const isPending = status === 'pending_migration';

    const linkedWallet = identity?.linked_wallet || identity?.walletAddress || identity?.old_wallet || '';
    const custodialWallet = identity?.custodial_wallet || (isCustodial ? identity?.old_wallet : '') || '';
    const migratedWallet =
        identity?.migrated_wallet || (isSelfSovereign ? linkedWallet : '') || '';

    const aidClaimedTypes = identity?.aid_claimed_types || [];
    const migrationHistory = identity?.migration_history || [];

    const blockchain = identity?.blockchain || {};
    const onChainVerified = Boolean(blockchain.on_chain || blockchain.local_state_exists);

    const ownershipLabel = useMemo(() => {
        if (isMigrated) return 'Self-Sovereign (W2)';
        if (isSelfSovereign) return 'Self-Sovereign';
        if (isPending) return 'Custodial → Pending';
        return 'Custodial (W1)';
    }, [isMigrated, isSelfSovereign, isPending]);

    return (
        <div className="page-enter space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[#7a94bb] text-lg mb-1 font-medium">Welcome back,</p>
                    <div className="flex items-center gap-4 flex-wrap">
                        <h2 className="text-4xl font-bold text-[#e2eaf8] tracking-tight">
                            {identity?.name || 'Refugee'}
                        </h2>
                        <IdentityBadge status={status} />
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#3d5278] font-bold uppercase tracking-[0.15em] flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <MapPin size={14} /> {onChainVerified ? 'On-Chain Verified' : 'Backend Registry'}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Hash size={14} /> {identity?.identity_id || '—'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                    icon={ShieldCheck}
                    label="Identity Status"
                    value={STATUS_LABEL[status]?.label || 'Active'}
                    accentColor={isMigrated ? '#8b5cf6' : isPending ? '#f59e0b' : '#00c9b1'}
                />
                <StatCard
                    icon={Package}
                    label="Aid Entitlement"
                    value={aidClaimedTypes.length > 0 ? `${aidClaimedTypes.length} claimed` : 'Available'}
                    accentColor="#f59e0b"
                    change={
                        aidClaimedTypes.length > 0
                            ? `Latest: ${aidClaimedTypes[aidClaimedTypes.length - 1]}`
                            : 'Claim with an aid worker'
                    }
                    changeType={aidClaimedTypes.length > 0 ? 'up' : 'down'}
                />
                <StatCard
                    icon={Wallet}
                    label="Ownership"
                    value={ownershipLabel}
                    accentColor={isMigrated || isSelfSovereign ? '#8b5cf6' : '#3b82f6'}
                />
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#1a2d4a]">
                    <div className="flex items-center gap-3">
                        <Lock size={20} className="text-[#00c9b1]" />
                        <h3 className="text-[#e2eaf8] font-bold text-lg uppercase tracking-wider">
                            Authenticated Identity Record
                        </h3>
                    </div>
                    <div className="text-[10px] text-[#3d5278] font-mono uppercase tracking-widest">
                        Stored on Algorand Ledger
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-12">
                    <Detail label="Full Name" value={identity?.name || '—'} />
                    <Detail label="Refugee ID" value={identity?.identity_id || '—'} mono />
                    <Detail
                        label="Linked Wallet"
                        value={linkedWallet ? formatAddress(linkedWallet) : '—'}
                        tooltip={linkedWallet}
                        mono
                    />
                    <Detail
                        label="Application ID"
                        value={identity?.app_id ? String(identity.app_id) : '—'}
                        mono
                    />
                    {custodialWallet && (
                        <Detail
                            label="Custodial Wallet (W1)"
                            value={formatAddress(custodialWallet)}
                            tooltip={custodialWallet}
                            mono
                        />
                    )}
                    {migratedWallet && (
                        <Detail
                            label="Self-Sovereign Wallet (W2)"
                            value={formatAddress(migratedWallet)}
                            tooltip={migratedWallet}
                            mono
                        />
                    )}
                    <Detail
                        label="On-Chain Verified"
                        value={onChainVerified ? 'Yes' : 'No'}
                    />
                    <Detail
                        label="Opted-in"
                        value={blockchain.opted_in ? 'Yes' : 'No'}
                    />
                </div>

                <p className="mt-8 text-[#3d5278] text-[10px] italic">
                    Identity, personhood, and age attestation hashes are stored securely on the Algorand
                    blockchain and are not displayed.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1a2d4a]">
                        <Package size={20} className="text-[#f59e0b]" />
                        <h3 className="text-[#e2eaf8] font-bold text-lg uppercase tracking-wider">Aid History</h3>
                    </div>
                    {aidClaimedTypes.length === 0 ? (
                        <p className="text-[#7a94bb] text-sm">
                            No aid distributions recorded yet. Speak to an aid worker at a distribution
                            site to claim food, medicine, shelter, cash, or clothing assistance.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {aidClaimedTypes.map((type) => (
                                <li
                                    key={type}
                                    className="flex items-center justify-between bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#f59e0b15] text-[#f59e0b] flex items-center justify-center">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <span className="text-[#e2eaf8] capitalize font-semibold">
                                            {type}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">
                                        Claimed
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1a2d4a]">
                        <Activity size={20} className="text-[#8b5cf6]" />
                        <h3 className="text-[#e2eaf8] font-bold text-lg uppercase tracking-wider">
                            Wallet & Migration
                        </h3>
                    </div>

                    {(isMigrated || isSelfSovereign) && (
                        <div className="rounded-xl border border-[#8b5cf640] bg-[#8b5cf612] p-4 mb-4">
                            <p className="text-[#c4b5fd] text-xs font-bold uppercase tracking-[0.15em] mb-1">
                                Self-Owned Blockchain Identity
                            </p>
                            <p className="text-[#7a94bb] text-xs leading-relaxed">
                                {isMigrated
                                    ? 'Your identity has been migrated to a self-sovereign Pera Wallet. You authenticate cryptographically — no PIN required.'
                                    : 'Your identity is held in a self-sovereign Pera Wallet. You authenticate cryptographically — no PIN required.'}
                            </p>
                        </div>
                    )}
                    {isCustodial && !isPending && (
                        <div className="rounded-xl border border-[#00c9b140] bg-[#00c9b112] p-4 mb-4">
                            <p className="text-[#00c9b1] text-xs font-bold uppercase tracking-[0.15em] mb-1">
                                Managed Identity Access
                            </p>
                            <p className="text-[#7a94bb] text-xs leading-relaxed">
                                Your identity is currently custodial. When ready, you can migrate to a
                                self-sovereign wallet for full ownership.
                            </p>
                        </div>
                    )}
                    {isPending && (
                        <div className="rounded-xl border border-[#f59e0b40] bg-[#f59e0b12] p-4 mb-4 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-[#fcd34d] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[#fcd34d] text-xs font-bold uppercase tracking-[0.15em] mb-1">
                                    Migration awaiting admin approval
                                </p>
                                <p className="text-[#7a94bb] text-xs leading-relaxed">
                                    An aid worker has submitted your migration request. You'll move to a
                                    self-sovereign wallet once it's approved.
                                </p>
                            </div>
                        </div>
                    )}

                    {migrationHistory.length > 0 && (
                        <ul className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                            {migrationHistory.map((row) => (
                                <li
                                    key={row.id}
                                    className="flex items-start gap-3 bg-[#060d1f] border border-[#1a2d4a] rounded-xl px-4 py-3 text-[11px]"
                                >
                                    <Clock size={14} className="text-[#7a94bb] shrink-0 mt-1" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[#e2eaf8] font-bold capitalize">{row.status}</p>
                                        <p className="text-[#3d5278]">
                                            {row.requestedAt
                                                ? new Date(row.requestedAt).toLocaleString()
                                                : '—'}
                                        </p>
                                        {row.newWallet && (
                                            <p
                                                className="text-[#7a94bb] font-mono truncate mt-1"
                                                title={row.newWallet}
                                            >
                                                → {formatAddress(row.newWallet)}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {showMigration && (
                        <button
                            type="button"
                            onClick={() => navigate('/refugee/migration')}
                            className="w-full mt-2 px-5 py-3 bg-[#8b5cf6] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#7c3aed] transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                        >
                            <RefreshCw size={16} /> Request Wallet Migration
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Detail = ({ label, value, mono, tooltip }) => (
    <div className="space-y-1">
        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em]">
            {label}
        </label>
        <div
            className={
                mono
                    ? 'text-[#e2eaf8] text-sm font-mono break-all'
                    : 'text-[#e2eaf8] text-sm font-semibold'
            }
            title={tooltip || undefined}
        >
            {value}
        </div>
    </div>
);

export default RefugeeDashboard;
