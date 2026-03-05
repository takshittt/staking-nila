import { useEffect, useState } from 'react';
import { TronLinkService } from '../services/tronLinkService';

/**
 * Debug component to check TronLink installation status
 * Add this temporarily to your dashboard to verify TronLink detection
 */
export const TronLinkDebug = () => {
  const [status, setStatus] = useState({
    hasTronWeb: false,
    hasTronLink: false,
    isInstalled: false,
    isReady: false,
    address: null as string | null,
  });

  useEffect(() => {
    const checkStatus = () => {
      setStatus({
        hasTronWeb: typeof window.tronWeb !== 'undefined',
        hasTronLink: typeof window.tronLink !== 'undefined',
        isInstalled: TronLinkService.isInstalled(),
        isReady: TronLinkService.isReady(),
        address: TronLinkService.getAddress(),
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">TronLink Debug</h3>
      <div className="space-y-1">
        <div>window.tronWeb: {status.hasTronWeb ? '✅' : '❌'}</div>
        <div>window.tronLink: {status.hasTronLink ? '✅' : '❌'}</div>
        <div>isInstalled(): {status.isInstalled ? '✅' : '❌'}</div>
        <div>isReady(): {status.isReady ? '✅' : '❌'}</div>
        <div>Address: {status.address || 'Not connected'}</div>
      </div>
    </div>
  );
};
