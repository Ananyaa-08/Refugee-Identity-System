/**
 * Wallet migration is only for custodial (no smartphone) refugees who have not migrated yet.
 */
export function canRequestWalletMigration(identity) {
    if (!identity) return false;
    const walletType = (
        identity.walletType ||
        identity.wallet_type ||
        identity.profile?.walletType ||
        ''
    )
        .toString()
        .toLowerCase();
    if (walletType === 'pera') return false;
    if (identity.status === 'migrated') return false;
    return walletType === 'custodial';
}
