import { useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { userApi } from '../services/userApi';
import toast from 'react-hot-toast';

/**
 * Global component that watches for wallet connections
 * and automatically registers users in the database
 */
export const WalletWatcher = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address) {
      // Get referral code from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref') || undefined;
      
      // Register user in database
      userApi.connectWallet(address, referralCode).catch((error) => {
        // If wallet is flagged, disconnect and show error
        if (error && error.message && (error.message.includes('flagged') || error.message.includes('blocked'))) {
          console.error('Wallet connection blocked:', error.message);
          toast.error(error.message, {
            duration: 6000,
            style: {
              background: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #FCA5A5',
            },
          });
          disconnect();
        }
        // Silent error handling for other errors
      });
    }
  }, [isConnected, address, disconnect]);

  // This component doesn't render anything
  return null;
};
