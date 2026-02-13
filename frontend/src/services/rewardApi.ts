import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface RewardBreakdown {
  id: string;
  type: 'INSTANT_CASHBACK' | 'APY_REWARD' | 'REFERRAL_REWARD';
  amount: number;
  createdAt: string;
  sourceId?: string;
  metadata?: any;
}

export interface PendingRewards {
  instantCashback: number;
  stakingRewards: number;
  referralRewards: number;
  totalClaimable: number;
  breakdown: RewardBreakdown[];
}

export interface RewardHistory {
  id: string;
  type: 'INSTANT_CASHBACK' | 'APY_REWARD' | 'REFERRAL_REWARD';
  amount: number;
  createdAt: string;
  claimedAt: string;
  txHash: string;
  sourceId?: string;
}

export interface LifetimeEarnings {
  totalClaimed: number;
  totalPending: number;
  totalLifetime: number;
}

export interface ClaimResult {
  success: boolean;
  txHash: string;
  amount: number;
  rewardsClaimed: number;
}

export const rewardApi = {
  // Get pending rewards for a user
  async getPendingRewards(walletAddress: string): Promise<PendingRewards> {
    const response = await axios.get(`${API_BASE_URL}/rewards/pending/${walletAddress}`);
    return response.data.rewards;
  },

  // Get reward history
  async getRewardHistory(walletAddress: string, limit = 50): Promise<RewardHistory[]> {
    const response = await axios.get(`${API_BASE_URL}/rewards/history/${walletAddress}`, {
      params: { limit }
    });
    return response.data.history;
  },

  // Get lifetime earnings
  async getLifetimeEarnings(walletAddress: string): Promise<LifetimeEarnings> {
    const response = await axios.get(`${API_BASE_URL}/rewards/lifetime/${walletAddress}`);
    return response.data.earnings;
  },

  // Claim rewards
  async claimRewards(
    walletAddress: string,
    type?: 'ALL' | 'INSTANT_CASHBACK' | 'APY_REWARD' | 'REFERRAL_REWARD',
    rewardIds?: string[]
  ): Promise<ClaimResult> {
    const response = await axios.post(`${API_BASE_URL}/rewards/claim`, {
      walletAddress,
      type: type || 'ALL',
      rewardIds
    });
    return response.data;
  },

  // Sync APY rewards from blockchain
  async syncAPYRewards(walletAddress: string): Promise<{ success: boolean; synced: boolean }> {
    const response = await axios.post(`${API_BASE_URL}/rewards/sync-apy/${walletAddress}`);
    return response.data;
  },

  // Record a claim that happened on-chain (for instant cashback and referral rewards)
  async recordClaim(
    walletAddress: string,
    type: 'INSTANT_CASHBACK' | 'REFERRAL_REWARD' | 'ALL',
    instantAmount: number,
    referralAmount: number,
    txHash: string
  ): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE_URL}/rewards/record-claim`, {
      walletAddress,
      type,
      instantAmount,
      referralAmount,
      txHash
    });
    return response.data;
  }
};

// Export types for convenience

