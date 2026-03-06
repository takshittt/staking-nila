const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

export const userApi = {
  // Validate wallet connection
  validateWallet: async (walletAddress: string) => {
    try {
      const response = await fetch(`${API_URL}/users/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to validate wallet');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

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
        const errorMessage = error.error || 'Failed to connect wallet';
        
        // If user is flagged, throw error to block connection
        if (errorMessage.includes('flagged') || errorMessage.includes('blocked')) {
          throw new Error(errorMessage);
        }
        
        // For other errors, log but don't block
        console.warn('Non-critical wallet registration error:', errorMessage);
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      // If it's a flagged user error, re-throw it
      if (error.message && (error.message.includes('flagged') || error.message.includes('blocked'))) {
        throw error;
      }
      
      // For other errors, don't block the user
      console.warn('Wallet registration failed:', error);
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
