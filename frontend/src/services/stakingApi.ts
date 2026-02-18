const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface AmountConfig {
  id: number;
  amount: string; // in wei
  instantRewardBps: number; // basis points (e.g., 500 = 5%)
  active: boolean;
}

export interface LockConfig {
  id: number;
  lockDuration: number; // in days
  apr: number; // basis points (e.g., 500 = 5%)
  active: boolean;
}

export interface CreateStakeDto {
  walletAddress: string;
  planName: string;
  planVersion: number;
  amount: number;
  apy: number;
  lockDays: number;
  instantRewardPercent?: number;
  txHash?: string;
}

export const stakingApi = {
  // Get all active amount configs (public endpoint)
  getActiveAmountConfigs: async (): Promise<AmountConfig[]> => {
    try {
      const response = await fetch(`${API_URL}/staking/amount-configs`);

      if (!response.ok) {
        throw new Error('Failed to fetch amount configs');
      }

      const configs: AmountConfig[] = await response.json();
      // Filter only active configs for users
      return configs.filter(config => config.active);
    } catch (error) {
      console.error('Failed to fetch amount configs:', error);
      return [];
    }
  },

  // Get all active lock configs (public endpoint)
  getActiveLockConfigs: async (): Promise<LockConfig[]> => {
    try {
      const response = await fetch(`${API_URL}/staking/lock-configs`);

      if (!response.ok) {
        throw new Error('Failed to fetch lock configs');
      }

      const configs: LockConfig[] = await response.json();
      // Filter only active configs for users
      return configs.filter(config => config.active);
    } catch (error) {
      console.error('Failed to fetch lock configs:', error);
      return [];
    }
  },

  // Record stake in database (public endpoint)
  recordStake: async (data: CreateStakeDto): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/stakes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record stake');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to record stake:', error);
      throw error;
    }
  }
};
