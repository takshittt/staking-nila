import api from './axiosConfig';

export interface TreasuryStats {
  contractAddress: string;
  contractBalance: string;
  totalStaked: string;
  availableRewards: string;
  pendingRewards: string;
  surplus: string;
  coverageRatio: number;
  healthStatus: 'healthy' | 'low' | 'critical';
  // USDT fields
  usdtBalance?: string;
  totalUsdtCollected?: string;
  // NILA liability fields
  nilaLiabilities?: string;
  nilaDeficitOrSurplus?: string;
  nilaHasSurplus?: boolean;
}

export interface NILALiabilityStatus {
  totalLiabilities: string;
  nilaBalance: string;
  deficitOrSurplus: string;
  hasSurplus: boolean;
}

export interface USDTBalance {
  balance: string;
  totalCollected: string;
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

  // Get USDT balance in contract
  getUSDTBalance: async (): Promise<USDTBalance> => {
    const response = await api.get('/treasury/usdt-balance');
    return response.data;
  },

  // Withdraw USDT from contract
  withdrawUSDT: async (amount: number): Promise<TransactionResult> => {
    const response = await api.post('/treasury/withdraw-usdt', { amount });
    return response.data;
  },

  // Get NILA liability status
  getNILALiabilityStatus: async (): Promise<NILALiabilityStatus> => {
    const response = await api.get('/treasury/nila-liability-status');
    return response.data;
  },

  // Deposit NILA for liabilities
  depositNILAForLiabilities: async (amount: number): Promise<TransactionResult> => {
    const response = await api.post('/treasury/deposit-nila-liabilities', { amount });
    return response.data;
  },
};
