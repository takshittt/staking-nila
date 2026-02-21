const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const stakeApi = {
  // Create stake (public endpoint)
  createStake: async (data: {
    walletAddress: string;
    planName: string;
    planVersion: number;
    amount: number;
    apy: number;
    lockDays: number;
    txHash?: string;
  }) => {
    const response = await fetch(`${API_URL}/stakes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create stake');
    }

    return response.json();
  },

  // Get all stakes (admin)
  getAllStakes: async (token: string) => {
    const response = await fetch(`${API_URL}/stakes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stakes');
    }

    return response.json();
  },

  // Get user stakes (admin)
  getUserStakes: async (walletAddress: string, token: string) => {
    const response = await fetch(`${API_URL}/stakes/user/${walletAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user stakes');
    }

    return response.json();
  },

  // Complete stake (admin)
  completeStake: async (stakeId: string, token: string) => {
    const response = await fetch(`${API_URL}/stakes/${stakeId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete stake');
    }

    return response.json();
  },

  // Create manual stake on-chain (admin)
  createManualStake: async (data: {
    walletAddress: string;
    amount: number;
    lockDays: number;
    apy: number;
    instantRewardPercent?: number;
  }, token: string) => {
    const response = await fetch(`${API_URL}/stakes/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create manual stake');
    }

    return response.json();
  }
};
