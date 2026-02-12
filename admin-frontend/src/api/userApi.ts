const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const userApi = {
  // Connect wallet (public endpoint)
  connectWallet: async (walletAddress: string, referralCode?: string) => {
    const response = await fetch(`${API_URL}/users/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, referralCode })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to connect wallet');
    }

    return response.json();
  },

  // Get all users (admin)
  getAllUsers: async (token: string) => {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    return response.json();
  },

  // Get single user (admin)
  getUserByWallet: async (walletAddress: string, token: string) => {
    const response = await fetch(`${API_URL}/users/${walletAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user');
    }

    return response.json();
  },

  // Update user status (admin)
  updateUserStatus: async (walletAddress: string, status: string, token: string) => {
    const response = await fetch(`${API_URL}/users/${walletAddress}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user status');
    }

    return response.json();
  }
};
