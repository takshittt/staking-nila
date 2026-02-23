const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const userApi = {
  // Connect wallet - register user in database
  connectWallet: async (walletAddress: string, referralCode?: string) => {
    try {
      const response = await fetch(`${API_URL}/users/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, referralCode })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to connect wallet');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Don't throw - we don't want to block the user if API fails
      return null;
    }
  },

  // Set referrer
  setReferrer: async (walletAddress: string, referralCode: string) => {
    const response = await fetch(`${API_URL}/users/referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, referralCode })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to set referrer');
    }

    return await response.json();
  },

  // Skip referral
  skipReferral: async (walletAddress: string) => {
    const response = await fetch(`${API_URL}/users/referral/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to skip referral');
    }

    return await response.json();
  },

  // Get user details
  getUser: async (walletAddress: string) => {
    const response = await fetch(`${API_URL}/users/info/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch user');
    }

    const data = await response.json();
    return data.user;
  }
};
