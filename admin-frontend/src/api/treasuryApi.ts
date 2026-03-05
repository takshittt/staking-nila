import api from './axiosConfig';

export interface TreasuryStats {
  // Contract state
  contractAddress: string;
  contractBalance: string;           // Total NILA in contract
  totalStaked: string;                // User staked tokens (locked)
  availableForRewards: string;        // contractBalance - totalStaked (reward pool)
  
  // Immediate obligations (already calculated, claimable now)
  claimableInstantRewards: string;    // Sum of all claimableInstantRewards[user]
  claimableReferralRewards: string;   // Sum of all claimableReferralRewards[user]
  totalClaimableNow: string;          // instant + referral
  
  // Future obligations (APY accruing over time)
  currentAPYRewards: string;          // All pending APY rewards right now
  projectedAPYDaily: string;          // Estimated APY rewards per day
  projectedAPYWeekly: string;         // Estimated APY rewards per week
  projectedAPYMonthly: string;        // Estimated APY rewards per month
  
  // Total obligations
  totalObligations: string;           // claimableNow + currentAPY
  
  // Financial health
  netPosition: string;                // availableForRewards - totalObligations
  coverageRatio: number;              // availableForRewards / totalObligations
  healthStatus: 'healthy' | 'low' | 'critical';
  
  // Actionable insights
  recommendedDeposit: string;         // To reach 120% coverage
  daysUntilCritical: number;          // Based on APY accrual rate
  bufferForNewStakes: string;         // How much available for new instant/referral rewards
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

  // Get liability statistics
  getLiabilities: async () => {
    const response = await api.get('/treasury/liabilities');
    return response.data;
  },

  // Get detailed liability breakdown
  getLiabilitiesBreakdown: async () => {
    const response = await api.get('/treasury/liabilities/breakdown');
    return response.data;
  },
};
