import React from 'react';
import { ShieldCheck, QrCode, AlertTriangle, KeyRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useIdentity } from '../../context/IdentityContext';
import { formatAddress } from '../../utils/format';
import { canRequestWalletMigration } from '../../utils/refugeeMigration';

const STATUS_BADGE = {
    active: {
        label: 'Active · Custodial Identity',
        cls: 'bg-[#10b98115] text-[#10b981] border-[#10b98140]',
        dot: 'bg-[#10b981]',
    },
    migrated: {
        label: 'Migrated · Self-Sovereign',
        cls: 'bg-[#8b5cf615] text-[#c4b5fd] border-[#8b5cf640]',
        dot: 'bg-[#8b5cf6]',
    },
    pending_migration: {
        label: 'Migration Pending',
        cls: 'bg-[#f59e0b15] text-[#fcd34d] border-[#f59e0b40]',
        dot: 'bg-[#f59e0b]',
    },
    disabled: {
        label: 'Disabled',
        cls: 'bg-[#ef444412] text-[#fca5a5] border-[#ef444440]',
        dot: 'bg-[#ef4444]',
    },
};

const WalletStatusPill = ({ status }) => {
    const cfg = STATUS_BADGE[status] || STATUS_BADGE.active;
    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] ${cfg.cls}`}
        >
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
        </div>
    );
};

const RefugeeBlockchainStatus = () => {
    const { identity } = useIdentity();

    const status = identity?.status || 'active';
    const linkedWallet =
        identity?.linked_wallet ||
        identity?.walletAddress ||
        identity?.old_wallet ||
        '';
    const eligibleForMigration = canRequestWalletMigration(identity);
    const qrPayload = identity?.qr_payload || '';

    const blockReadOnlyCopy = (event) => {
        event.preventDefault();
    };

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-[#00c9b1]" /> Identity Recovery
                </h2>
                <p className="text-[#7a94bb] text-sm max-w-2xl">
                    Your secure identity-recovery card. Use this when an aid worker is helping you
                    migrate to a new device or restore access to your records.
                </p>
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 shadow-xl space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#1a2d4a]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00c9b115] border border-[#00c9b140] flex items-center justify-center">
                            <KeyRound size={18} className="text-[#00c9b1]" />
                        </div>
                        <div>
                            <h3 className="text-[#e2eaf8] font-bold text-base uppercase tracking-wider">
                                Identity Recovery QR
                            </h3>
                            <p className="text-[#3d5278] text-[11px] mt-0.5">
                                Sensitive · Treat like a passport
                            </p>
                        </div>
                    </div>
                    <WalletStatusPill status={status} />
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    <div
                        className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-6 select-none"
                        onCopy={blockReadOnlyCopy}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="space-y-5">
                            <Field label="Refugee ID" value={identity?.identity_id || '—'} mono />
                            <Field
                                label="Custodial Wallet (W1)"
                                value={
                                    linkedWallet
                                        ? formatAddress(linkedWallet)
                                        : 'Not yet linked'
                                }
                                mono
                                muted={!linkedWallet}
                                helper="Address is partially masked for your safety."
                            />
                            <Field
                                label="Wallet Status"
                                value={STATUS_BADGE[status]?.label || 'Active'}
                            />
                            <Field
                                label="Migration Eligibility"
                                value={
                                    status === 'migrated'
                                        ? 'Already migrated to self-sovereign wallet'
                                        : status === 'pending_migration'
                                          ? 'Pending — aid worker approval in progress'
                                          : eligibleForMigration
                                            ? 'Eligible — request from your dashboard'
                                            : 'Not currently eligible'
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div
                            className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-6 flex flex-col items-center select-none"
                            onCopy={blockReadOnlyCopy}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <div className="bg-white p-3 rounded-xl shrink-0 mb-4">
                                {qrPayload ? (
                                    <QRCodeSVG
                                        value={qrPayload}
                                        size={180}
                                        level="M"
                                        includeMargin={false}
                                    />
                                ) : (
                                    <div className="w-[180px] h-[180px] flex items-center justify-center text-[#1a2d4a] text-xs font-bold uppercase tracking-widest">
                                        Unavailable
                                    </div>
                                )}
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-[#e2eaf8] text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                                    <QrCode size={14} className="text-[#00c9b1]" /> Identity Recovery Code
                                </p>
                                <p className="text-[#7a94bb] text-[11px] leading-relaxed max-w-[260px]">
                                    Scan this QR during wallet migration or identity recovery. The
                                    full identity payload stays inside the QR and is never displayed
                                    on screen.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#f59e0b40] bg-[#f59e0b12] p-4 flex gap-3">
                            <AlertTriangle className="text-[#fcd34d] shrink-0 mt-0.5" size={18} />
                            <div className="space-y-1">
                                <p className="text-[#fcd34d] text-[11px] font-bold uppercase tracking-[0.2em]">
                                    Identity Recovery Credential
                                </p>
                                <ul className="text-[#7a94bb] text-[11px] leading-relaxed list-disc list-inside space-y-0.5">
                                    <li>Keep this QR secure — treat it like a passport.</li>
                                    <li>Do not share publicly, in chats, or on social media.</li>
                                    <li>
                                        Only show it to a verified aid worker during in-person
                                        migration or recovery.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, value, mono, muted, helper }) => (
    <div>
        <label className="block text-[#3d5278] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
            {label}
        </label>
        <div
            className={
                (mono ? 'font-mono ' : '') +
                'text-sm ' +
                (muted ? 'text-[#7a94bb]' : 'text-[#e2eaf8]') +
                ' font-semibold'
            }
        >
            {value}
        </div>
        {helper && <p className="text-[#3d5278] text-[10px] mt-1 leading-relaxed">{helper}</p>}
    </div>
);

export default RefugeeBlockchainStatus;
