import { useState, useEffect } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

const peraWallet = new PeraWalletConnect();

export const useWallet = () => {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length) {
        setAccount(accounts[0]);
      }
    });

    peraWallet.on('disconnect', () => {
      setAccount(null);
    });
  }, []);

  const connect = async () => {
    try {
      const accounts = await peraWallet.connect();
      setAccount(accounts[0]);
      return { account: accounts[0] };
    } catch (error) {
      if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        console.error('Error connecting to Pera Wallet:', error);
      }
    }
  };

  const disconnect = () => {
    peraWallet.disconnect();
    setAccount(null);
  };

  const signTransactions = async (txGroups) => {
    return peraWallet.signTransaction(txGroups);
  };

  return { 
    account, 
    connect, 
    disconnect, 
    signTransactions,
    isConnected: !!account 
  };
};
