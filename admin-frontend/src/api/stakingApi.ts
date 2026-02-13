import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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



export interface AmountConfig {
  id: number;
  amount: string;
  instantRewardBps: number;
  active: boolean;
}

export interface LockConfig {
  id: number;
  lockDuration: number;
  apr: number;
  active: boolean;
}

export interface StakingStats {
  totalStaked: string;
  uniqueStakers: number;
  availableRewards: string;
}

export interface CreateAmountConfigDto {
  amount: number;
  instantRewardPercent: number;
}

export interface UpdateAmountConfigDto {
  instantRewardPercent: number;
  active: boolean;
}

export interface CreateLockConfigDto {
  lockDays: number;
  aprPercent: number;
}

export interface UpdateLockConfigDto {
  aprPercent: number;
  active: boolean;
}

export interface TransactionResult {
  txHash: string;
  blockNumber: number;
  configId?: number;
}

// Amount Config APIs
export const stakingApi = {
  // Amount Configs
  async getAmountConfigs(): Promise<AmountConfig[]> {
    const response = await api.get('/staking/amount-configs');
    return response.data;
  },

  async getAmountConfig(id: number): Promise<AmountConfig> {
    const response = await api.get(`/staking/amount-configs/${id}`);
    return response.data;
  },

  async createAmountConfig(data: CreateAmountConfigDto): Promise<TransactionResult> {
    const response = await api.post('/staking/amount-configs', data);
    return response.data;
  },

  async updateAmountConfig(id: number, data: UpdateAmountConfigDto): Promise<TransactionResult> {
    const response = await api.put(`/staking/amount-configs/${id}`, data);
    return response.data;
  },

  // Lock Configs
  async getLockConfigs(): Promise<LockConfig[]> {
    const response = await api.get('/staking/lock-configs');
    return response.data;
  },

  async getLockConfig(id: number): Promise<LockConfig> {
    const response = await api.get(`/staking/lock-configs/${id}`);
    return response.data;
  },

  async createLockConfig(data: CreateLockConfigDto): Promise<TransactionResult> {
    const response = await api.post('/staking/lock-configs', data);
    return response.data;
  },

  async updateLockConfig(id: number, data: UpdateLockConfigDto): Promise<TransactionResult> {
    const response = await api.put(`/staking/lock-configs/${id}`, data);
    return response.data;
  },

  // Stats
  async getStakingStats(): Promise<StakingStats> {
    const response = await api.get('/staking/stats');
    return response.data;
  },
};
