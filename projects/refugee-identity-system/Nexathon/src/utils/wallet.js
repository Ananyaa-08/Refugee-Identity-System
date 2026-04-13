import { PeraWalletConnect } from "@perawallet/connect";

export const peraWallet = new PeraWalletConnect();

export const reconnectSession = async () => {
  try {
    const accounts = await peraWallet.reconnectSession();
    return accounts;
  } catch (error) {
    console.log("No existing session found");
    return [];
  }
};