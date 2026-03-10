import { useEffect } from 'react';
import { useAccount, useReconnect } from 'wagmi';

/**
 * Component that handles automatic wallet reconnection on page load
 */
export const WalletReconnect = () => {
  const { isConnected } = useAccount();
  const { reconnect } = useReconnect();

  useEffect(() => {
    // Only attempt reconnection if not already connected
    if (!isConnected) {
      reconnect();
    }
  }, []);

  return null;
};
