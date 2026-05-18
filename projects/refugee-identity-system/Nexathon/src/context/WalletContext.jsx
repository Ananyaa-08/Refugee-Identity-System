import React, { createContext, useContext, useState, useEffect } from "react";
import { peraWallet, reconnectSession, signTransaction, normalizePeraAccount } from "../utils/wallet";
import {
  getAdminLoginMethod,
  getAdminWalletAddress,
  isAdminAuthenticated,
  setAdminWalletAddress,
} from "../utils/adminAuth";

const WalletContext = createContext(null);

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      const method = getAdminLoginMethod();
      if (method === 'password') {
        return;
      }
      const adminWallet = getAdminWalletAddress();
      if (adminWallet) {
        setAccount(adminWallet);
        return;
      }
    }

    const savedAccount = localStorage.getItem('demo_account');
    if (savedAccount) {
      setAccount(savedAccount);
    }

    reconnectSession().then((accounts) => {
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect();
      const address = normalizePeraAccount(newAccounts[0]);
      setAccount(address);
      localStorage.setItem('demo_account', address);
      if (isAdminAuthenticated()) {
        setAdminWalletAddress(address);
      }
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
    if (isAdminAuthenticated()) {
      setAdminWalletAddress(null);
    }
  };

  const setManualAccount = (address) => {
    const normalized = normalizePeraAccount(address);
    setAccount(normalized);
    localStorage.setItem('demo_account', normalized);
    if (isAdminAuthenticated()) {
      setAdminWalletAddress(normalized);
    }
  };

  const clearAccount = () => {
    setAccount(null);
    localStorage.removeItem('demo_account');
  };

  return (
    <WalletContext.Provider value={{ 
        account, 
        connectWallet, 
        disconnectWallet, 
        setManualAccount,
        clearAccount,
        signTransactions: signTransaction
    }}>
      {children}
    </WalletContext.Provider>
  );
};