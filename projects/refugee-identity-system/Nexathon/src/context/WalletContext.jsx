import React, { createContext, useContext, useState, useEffect } from "react";
import { peraWallet, reconnectSession } from "../utils/wallet";

const WalletContext = createContext(null);

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    // 1. Check if we have a persisted session from local storage first (for demo)
    const savedAccount = localStorage.getItem('demo_account');
    if (savedAccount) {
      setAccount(savedAccount);
    }

    // 2. Otherwise check Pera Wallet sessions
    reconnectSession().then(accounts => {
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      setAccount(newAccounts[0]);
      localStorage.setItem('demo_account', newAccounts[0]);
    } catch (error) {
      if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
        console.error("Connection failed", error);
      }
    }
  };

  const disconnectWallet = async () => {
    await peraWallet.disconnect();
    setAccount(null);
    localStorage.removeItem('demo_account');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('demo_aid_worker_name');
  };

  const setManualAccount = (address) => {
    setAccount(address);
    localStorage.setItem('demo_account', address);
  };

  return (
    <WalletContext.Provider value={{ account, connectWallet, disconnectWallet, setManualAccount }}>
      {children}
    </WalletContext.Provider>
  );
};