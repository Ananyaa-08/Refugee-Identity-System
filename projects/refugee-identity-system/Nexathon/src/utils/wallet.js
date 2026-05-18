import { PeraWalletConnect } from "@perawallet/connect";

// Force TestNet (Pera chainId for Algorand TestNet is 416002)
export const peraWallet = new PeraWalletConnect({ chainId: 416002 });

export function buildPeraWalletScanUrl(walletConnectUri) {
    return `https://perawallet.app/qr/perawallet-wc?uri=${encodeURIComponent(walletConnectUri)}`;
}

export function normalizePeraAccount(account) {
    if (!account) return account;
    const raw = String(account);
    if (raw.includes(":")) return raw.split(":").pop();
    return raw;
}

export function killRefugeePeraWalletSession() {
    return peraWallet.disconnect().catch(() => {});
}

/**
 * Start Pera WalletConnect for the refugee (in-page QR).
 * Resolves with account addresses once the refugee approves on their phone.
 */
export function connectRefugeePeraWallet({ onQrUri }) {
    return new Promise((resolve, reject) => {
        const onDisplayUri = (error, payload) => {
            if (error || !payload?.params?.[0]) return;
            onQrUri(buildPeraWalletScanUrl(payload.params[0]));
        };

        const cleanup = () => {
            peraWallet.connector?.off?.("display_uri", onDisplayUri);
        };

        peraWallet.connector?.on("display_uri", onDisplayUri);

        peraWallet
            .connect()
            .then((accounts) => {
                cleanup();
                resolve(accounts.map(normalizePeraAccount));
            })
            .catch((error) => {
                cleanup();
                reject(error);
            });
    });
}

export const reconnectSession = async () => {
    try {
        const accounts = await peraWallet.reconnectSession();
        return accounts.map(normalizePeraAccount);
    } catch {
        console.log("No existing session found");
        return [];
    }
};

export const signTransaction = async (txGroups) => {
    return await peraWallet.signTransaction(txGroups);
};
