import { normalizePeraAccount } from './wallet';

/**
 * Build the set of Algorand addresses allowed to approve data-access requests.
 */
export function getAuthorizedConsentWallets(identity) {
    const wallets = new Set();
    const add = (addr) => {
        const normalized = normalizePeraAccount(addr);
        if (normalized) wallets.add(normalized);
    };

    if (!identity) return wallets;

    add(identity.old_wallet);
    add(identity.walletAddress);
    add(identity.profile?.walletAddress);

    const list = identity.authorized_consent_wallets || identity.authorizedConsentWallets;
    if (Array.isArray(list)) {
        list.forEach(add);
    }

    return wallets;
}

export function isWalletAuthorizedForConsent(identity, connectedAddress) {
    const signer = normalizePeraAccount(connectedAddress);
    if (!signer) return false;
    return getAuthorizedConsentWallets(identity).has(signer);
}
