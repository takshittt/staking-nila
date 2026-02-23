import api from './axiosConfig';

export type StakingStats = {
  totalStaked: string;
  uniqueStakers: number;
  availableRewards: string;
}

export type StakeStats = {
  totalStakes: number;
  activeStakes: number;
  completedStakes: number;
}

export type TreasuryStats = {
  contractBalance: string;
  totalStaked: string;
  availableRewards: string;
  pendingRewards: string;
  surplus: string;
  coverageRatio: number;
  healthStatus: 'healthy' | 'low' | 'critical';
}

export type ReferralStats = {
  referralPercentage: number;
  referrerPercentage: number;
  totalReferrals: number;
  totalEarnings: number;
  isPaused: boolean;
}

export type RiskStats = {
  expiringStakesCount: number;
  largeUnlockCount: number;
  estimatedRewardsPaid: string;
}

export type OverviewStats = {
  staking: StakingStats;
  stakes: StakeStats;
  treasury: TreasuryStats;
  referral: ReferralStats;
  risks: RiskStats;
}

export const overviewApi = {
  // Get all overview statistics
  getStats: async (): Promise<OverviewStats> => {
    const [staking, stakes, treasury, referral, riskStats] = await Promise.all([
      api.get('/staking/stats'),
      api.get('/stakes/stats'),
      api.get('/treasury/stats'),
      api.get('/referrals/stats'),
      api.get('/stakes/risk-stats'),
    ]);

    return {
      staking: staking.data,
      stakes: stakes.data.stats || stakes.data,
      treasury: treasury.data,
      referral: referral.data.stats || referral.data, // Handle wrapped response
      risks: riskStats.data.stats || riskStats.data,
    };
  },
};
