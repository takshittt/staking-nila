import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface TreasuryStats {
  contractAddress: string;
  contractBalance: string;
  totalStaked: string;
  availableRewards: string;
  pendingRewards: string;
  surplus: string;
  coverageRatio: number;
  healthStatus: 'healthy' | 'low' | 'critical';
}

export interface ContractStatus {
  isPaused: boolean;
}

export interface UserRewards {
  walletAddress: string;
  totalPendingRewards: string;
  activeStakes: number;
  breakdown: Array<{
    stakeId: number;
    amount: string;
    pendingReward: string;
    apr: number;
  }>;
}

export interface TransactionResult {
  txHash: string;
  blockNumber: number;
  amount?: string;
}

export const treasuryApi = {
  // Get treasury statistics
  getStats: async (): Promise<TreasuryStats> => {
    const response = await api.get('/treasury/stats');
    return response.data;
  },

  // Get contract status
  getStatus: async (): Promise<ContractStatus> => {
    const response = await api.get('/treasury/status');
    return response.data;
  },

  // Get user pending rewards
  getUserRewards: async (walletAddress: string): Promise<UserRewards> => {
    const response = await api.get(`/treasury/user-rewards/${walletAddress}`);
    return response.data;
  },

  // Deposit rewards to contract
  deposit: async (amount: number): Promise<TransactionResult> => {
    const response = await api.post('/treasury/deposit', { amount });
    return response.data;
  },

  // Withdraw excess rewards from contract
  withdraw: async (amount: number): Promise<TransactionResult> => {
    const response = await api.post('/treasury/withdraw', { amount });
    return response.data;
  },

  // Pause contract
  pause: async (): Promise<TransactionResult> => {
    const response = await api.post('/treasury/pause');
    return response.data;
  },

  // Unpause contract
  unpause: async (): Promise<TransactionResult> => {
    const response = await api.post('/treasury/unpause');
    return response.data;
  },
};
