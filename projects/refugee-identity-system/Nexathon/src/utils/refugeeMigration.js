/**
 * Wallet migration is only for custodial (no smartphone) refugees who have not
 * migrated yet AND don't already have a pending migration request.
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
    const status = (identity.status || '').toString().toLowerCase();
    if (status === 'migrated' || status === 'pending_migration' || status === 'disabled') {
        return false;
    }
    return walletType === 'custodial';
}
