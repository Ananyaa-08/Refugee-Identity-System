import { PeraWalletConnect } from "@perawallet/connect";

// Force TestNet (Pera chainId for Algorand TestNet is 416002)
export const peraWallet = new PeraWalletConnect({ chainId: 416002 });

export const reconnectSession = async () => {
  try {
    const accounts = await peraWallet.reconnectSession();
    return accounts;
  } catch {
    console.log("No existing session found");
    return [];
  }
};

export const signTransaction = async (txGroups) => {
  return await peraWallet.signTransaction(txGroups);
};