import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { BrowserProvider } from 'ethers';
import { TronLinkService } from '../services/tronLinkService';
import { modal } from '../config/wagmi';
import toast from 'react-hot-toast';

export type SupportedChain = 'BSC' | 'ETH' | 'TRON';

export interface WalletInfo {
  address: string | null;
  isConnected: boolean;
  chainId?: number;
}

export const useMultiChainWallet = () => {
  // EVM wallet state (wagmi)
  const { address: evmAddress, isConnected: evmConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // TRON wallet state
  const [tronAddress, setTronAddress] = useState<string | null>(null);
  const [tronConnected, setTronConnected] = useState(false);
  const [tronInstalled, setTronInstalled] = useState(false);

  // Check TronLink installation and connection on mount
  useEffect(() => {
    const checkTronLink = () => {
      const installed = TronLinkService.isInstalled();
      setTronInstalled(installed);

      if (installed) {
        const state = TronLinkService.getWalletState();
        setTronAddress(state.address);
        setTronConnected(state.isConnected);
      }
    };

    // Check immediately
    checkTronLink();

    // TronLink might load after page load, so check again after a delay
    const timeoutId = setTimeout(checkTronLink, 1000);

    // Listen for TronLink account changes
    const cleanup = TronLinkService.onAccountChanged((address) => {
      setTronAddress(address);
      setTronConnected(!!address);
    });

    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, []);

  /**
   * Get wallet info for specific chain
   */
  const getWalletInfo = useCallback((chain: SupportedChain): WalletInfo => {
    if (chain === 'TRON') {
      return {
        address: tronAddress,
        isConnected: tronConnected,
      };
    }

    return {
      address: evmAddress || null,
      isConnected: evmConnected,
      chainId,
    };
  }, [evmAddress, evmConnected, chainId, tronAddress, tronConnected]);

  /**
   * Connect wallet for specific chain
   */
  const connectWallet = useCallback(async (chain: SupportedChain): Promise<string> => {
    if (chain === 'TRON') {
      // Re-check installation status in case it loaded after initial check
      const isInstalled = TronLinkService.isInstalled();
      setTronInstalled(isInstalled);

      if (!isInstalled) {
        toast.error('TronLink is not installed. Please install the TronLink extension and refresh the page.');
        window.open(TronLinkService.getDownloadUrl(), '_blank');
        throw new Error('TronLink not installed');
      }

      try {
        const address = await TronLinkService.connect();
        setTronAddress(address);
        setTronConnected(true);
        toast.success('TronLink connected successfully');
        return address;
      } catch (error: any) {
        toast.error(error.message || 'Failed to connect TronLink');
        throw error;
      }
    }

    // EVM chains (BSC, ETH)
    try {
      if (!evmConnected) {
        await modal.open();
        // Wait for connection
        await new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (evmAddress) {
              clearInterval(checkConnection);
              resolve(evmAddress);
            }
          }, 100);

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkConnection);
            resolve(null);
          }, 30000);
        });
      }

      if (!evmAddress) {
        throw new Error('Failed to connect wallet');
      }

      return evmAddress;
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
      throw error;
    }
  }, [evmConnected, evmAddress, tronInstalled]);

  /**
   * Switch to specific EVM chain
   */
  const switchToChain = useCallback(async (chain: 'BSC' | 'ETH'): Promise<void> => {
    if (chain === 'BSC') {
      // BSC Mainnet only
      const targetChainId = 56;
      if (chainId !== targetChainId) {
        try {
          await switchChain({ chainId: targetChainId });
          toast.success('Switched to BSC');
        } catch (error: any) {
          toast.error('Failed to switch to BSC');
          throw error;
        }
      }
    } else if (chain === 'ETH') {
      // Ethereum Mainnet only
      const targetChainId = 1;
      if (chainId !== targetChainId) {
        try {
          await switchChain({ chainId: targetChainId });
          toast.success('Switched to Ethereum');
        } catch (error: any) {
          toast.error('Failed to switch to Ethereum');
          throw error;
        }
      }
    }
  }, [chainId, switchChain]);

  /**
   * Check if on correct chain
   */
  const isCorrectChain = useCallback((chain: SupportedChain): boolean => {
    if (chain === 'TRON') {
      return tronConnected;
    }

    if (chain === 'BSC') {
      return chainId === 56; // BSC Mainnet only
    }

    if (chain === 'ETH') {
      return chainId === 1; // Mainnet only
    }

    return false;
  }, [chainId, tronConnected]);

  /**
   * Get chain name from chainId
   */
  const getChainName = useCallback((chainId?: number): string => {
    if (!chainId) return 'Unknown';
    
    switch (chainId) {
      case 56: return 'BSC Mainnet';
      case 1: return 'Ethereum Mainnet';
      default: return `Chain ${chainId}`;
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async (chain: SupportedChain) => {
    if (chain === 'TRON') {
      // TronLink doesn't have a disconnect method, just clear state
      setTronAddress(null);
      setTronConnected(false);
      toast.success('TronLink disconnected');
    } else {
      await modal.close();
      toast.success('Wallet disconnected');
    }
  }, []);

  /**
   * Get ethers provider for EVM chains
   */
  const getProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }

    return new BrowserProvider(window.ethereum);
  }, []);

  return {
    // Wallet info
    getWalletInfo,
    evmAddress,
    evmConnected,
    tronAddress,
    tronConnected,
    tronInstalled,
    chainId,

    // Actions
    connectWallet,
    switchToChain,
    disconnect,
    getProvider,

    // Utilities
    isCorrectChain,
    getChainName,
  };
};
