import api from './axiosConfig';

export const userApi = {
  // Connect wallet (public endpoint)
  connectWallet: async (walletAddress: string, referralCode?: string) => {
    const response = await api.post('/users/connect', { walletAddress, referralCode });
    return response.data;
  },

  // Get all users (admin)
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Get single user (admin)
  getUserByWallet: async (walletAddress: string) => {
    const response = await api.get(`/users/${walletAddress}`);
    return response.data;
  },

  // Update user status (admin)
  updateUserStatus: async (walletAddress: string, status: string) => {
    const response = await api.patch(`/users/${walletAddress}/status`, { status });
    return response.data;
  },

  // Flag user (admin)
  flagUser: async (walletAddress: string, reason?: string) => {
    const response = await api.post(`/users/${walletAddress}/flag`, { reason });
    return response.data;
  },

  // Unflag user (admin)
  unflagUser: async (walletAddress: string) => {
    const response = await api.post(`/users/${walletAddress}/unflag`);
    return response.data;
  }
};
