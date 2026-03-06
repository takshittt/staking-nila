import { useAccount, useDisconnect, useBalance } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useEffect } from 'react'
import { userApi } from '../services/userApi'
import toast from 'react-hot-toast'

export const useWallet = () => {
  const { address, isConnected, isConnecting, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()
  const { data: balance } = useBalance({
    address: address,
  })

  // Register wallet in database when connected
  useEffect(() => {
    if (isConnected && address) {
      // Get referral code from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref') || undefined;

      // Register user in database
      userApi.connectWallet(address, referralCode).then((result) => {
        if (result) {
          // Wallet registered successfully
        }
      }).catch((error) => {
        // If wallet is flagged, disconnect immediately and show error
        if (error && error.message) {
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
      });
    }
  }, [isConnected, address, disconnect]);

  const connect = () => {
    open()
  }

  const formatAddress = (addr?: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return {
    address,
    isConnected,
    isConnecting,
    chain,
    balance,
    connect,
    disconnect,
    formatAddress,
  }
}
