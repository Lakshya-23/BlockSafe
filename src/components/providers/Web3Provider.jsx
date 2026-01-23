'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext({
  provider: null,
  signer: null,
  account: null,
  connectWallet: async () => {},
  isConnected: false,
});

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const initializeWeb3 = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        // Auto-reconnect: Check if MetaMask is already connected
        try {
          console.log('[Web3Provider] Checking for existing connection...');
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            console.log('[Web3Provider] Found existing connection:', accounts[0]);
            setAccount(accounts[0]);
            const signer = await provider.getSigner();
            setSigner(signer);
          } else {
            console.log('[Web3Provider] No existing connection found');
          }
        } catch (error) {
          console.error('[Web3Provider] Failed to check existing connection:', error);
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          console.log('[Web3Provider] Account changed:', accounts);
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            // Update signer when account changes
            provider.getSigner().then(setSigner);
          } else {
            setAccount(null);
            setSigner(null);
          }
        });
      }
    };

    initializeWeb3();
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const signer = await provider.getSigner();
      setSigner(signer);
      
      // Register encryption public key for file sharing
      try {
        const { registerPublicKey } = await import('@/lib/publicKeyRegistry');
        await registerPublicKey(accounts[0]);
        console.log('[Web3Provider] Encryption public key registered');
      } catch (error) {
        console.warn('[Web3Provider] Failed to register encryption key:', error);
        // Non-fatal error, user can still use the app
      }
      
      return signer;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  return (
    <Web3Context.Provider
      value={{ provider, signer, account, connectWallet, isConnected: !!account }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);
