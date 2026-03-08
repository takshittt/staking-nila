import api from './axiosConfig';

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
    const response = await api.post('/stakes', data);
    return response.data;
  },

  // Get all stakes (admin)
  getAllStakes: async () => {
    const response = await api.get('/stakes');
    return response.data;
  },

  // Get user stakes (admin)
  getUserStakes: async (walletAddress: string) => {
    const response = await api.get(`/stakes/user/${walletAddress}`);
    return response.data;
  },

  // Complete stake (admin)
  completeStake: async (stakeId: string) => {
    const response = await api.patch(`/stakes/${stakeId}/complete`);
    return response.data;
  },

  // Create manual stake on-chain (admin)
  createManualStake: async (data: {
    walletAddress: string;
    amount: number;
    lockDays: number;
    apy: number;
  }) => {
    const response = await api.post('/stakes/manual', data);
    return response.data;
  }
};
