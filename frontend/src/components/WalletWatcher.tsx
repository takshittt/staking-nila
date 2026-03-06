import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { userApi } from '../services/userApi';

/**
 * Global component that watches for wallet connections
 * and automatically registers users in the database
 */
export const WalletWatcher = () => {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      // Get referral code from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref') || undefined;
      
      // Register user in database
      userApi.connectWallet(address, referralCode).catch(() => {
        // Silent error handling
      });
    }
  }, [isConnected, address]);

  // This component doesn't render anything
  return null;
};
