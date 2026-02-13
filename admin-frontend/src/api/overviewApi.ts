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
