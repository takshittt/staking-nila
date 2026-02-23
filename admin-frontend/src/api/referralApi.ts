import api from './axiosConfig';

export const referralApi = {
  // Get config (public)
  getConfig: async () => {
    const response = await api.get('/referrals/config');
    return response.data;
  },

  // Get blockchain config (admin)
  getBlockchainConfig: async () => {
    const response = await api.get('/referrals/config/blockchain');
    return response.data;
  },

  // Sync with blockchain (admin)
  syncWithBlockchain: async () => {
    const response = await api.post('/referrals/sync');
    return response.data;
  },

  // Get stats (admin)
  getStats: async () => {
    const response = await api.get('/referrals/stats');
    return response.data;
  },

  // Update config (admin) - updates both blockchain and database
  updateConfig: async (
    data: {
      referralPercentage?: number;
      referrerPercentage?: number;
      isPaused?: boolean;
    }
  ) => {
    const response = await api.put('/referrals/config', data);
    return response.data;
  },

  // Get wallet referrals (admin)
  getWalletReferrals: async (walletAddress: string) => {
    const response = await api.get(`/referrals/wallet/${walletAddress}`);
    return response.data;
  }
};
