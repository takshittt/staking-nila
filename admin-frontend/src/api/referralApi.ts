const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const referralApi = {
  // Get config (public)
  getConfig: async () => {
    const response = await fetch(`${API_URL}/referrals/config`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch referral config');
    }

    return response.json();
  },

  // Get blockchain config (admin)
  getBlockchainConfig: async (token: string) => {
    const response = await fetch(`${API_URL}/referrals/config/blockchain`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch blockchain config');
    }

    return response.json();
  },

  // Sync with blockchain (admin)
  syncWithBlockchain: async (token: string) => {
    const response = await fetch(`${API_URL}/referrals/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync with blockchain');
    }

    return response.json();
  },

  // Get stats (admin)
  getStats: async (token: string) => {
    const response = await fetch(`${API_URL}/referrals/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch referral stats');
    }

    return response.json();
  },

  // Update config (admin) - updates both blockchain and database
  updateConfig: async (
    data: {
      referralPercentage?: number;
      referrerPercentage?: number;
      isPaused?: boolean;
    },
    token: string
  ) => {
    const response = await fetch(`${API_URL}/referrals/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update referral config');
    }

    return response.json();
  },

  // Get wallet referrals (admin)
  getWalletReferrals: async (walletAddress: string, token: string) => {
    const response = await fetch(`${API_URL}/referrals/wallet/${walletAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch wallet referrals');
    }

    return response.json();
  }
};
