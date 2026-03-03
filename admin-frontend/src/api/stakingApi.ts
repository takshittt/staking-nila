import api from './axiosConfig';
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

export interface RewardTier {
  id: number;
  minNilaAmount: number;
  maxNilaAmount: number;
  instantRewardBps: number;
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

export interface CreateRewardTierDto {
  minNilaAmount: number;
  maxNilaAmount: number;
  instantRewardPercent: number;
}

export interface UpdateRewardTierDto {
  minNilaAmount: number;
  maxNilaAmount: number;
  instantRewardPercent: number;
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

  // Reward Tiers
  async getRewardTiers(): Promise<RewardTier[]> {
    const response = await api.get('/staking/reward-tiers');
    return response.data;
  },

  async getRewardTier(id: number): Promise<RewardTier> {
    const response = await api.get(`/staking/reward-tiers/${id}`);
    return response.data;
  },

  async createRewardTier(data: CreateRewardTierDto): Promise<TransactionResult> {
    const response = await api.post('/staking/reward-tiers', data);
    return response.data;
  },

  async updateRewardTier(id: number, data: UpdateRewardTierDto): Promise<TransactionResult> {
    const response = await api.put(`/staking/reward-tiers/${id}`, data);
    return response.data;
  },

  // Active Configs (for frontend display)
  async getActiveAmountConfigs(): Promise<AmountConfig[]> {
    const response = await api.get('/staking/amount-configs/active');
    return response.data;
  },

  async getActiveLockConfigs(): Promise<LockConfig[]> {
    const response = await api.get('/staking/lock-configs/active');
    return response.data;
  },

  async getActiveRewardTiers(): Promise<RewardTier[]> {
    const response = await api.get('/staking/reward-tiers/active');
    return response.data;
  },

  // Stats
  async getStakingStats(): Promise<StakingStats> {
    const response = await api.get('/staking/stats');
    return response.data;
  },
};
