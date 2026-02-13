const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Transaction {
  id: string;
  txHash: string;
  walletAddress?: string;
  type: 'STAKE' | 'UNSTAKE' | 'CLAIM_REWARD' | 'DEPOSIT' | 'WITHDRAW' | 'REFERRAL_REWARD' | 'CONFIG_UPDATE';
  amount?: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  confirmedAt?: string;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  walletAddress?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const transactionApi = {
  // Get transactions for a specific wallet (public endpoint)
  getWalletTransactions: async (
    walletAddress: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: Transaction[]; pagination: any }> => {
    try {
      const response = await fetch(
        `${API_URL}/transactions/wallet/${walletAddress}?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      return {
        transactions: data.transactions || [],
        pagination: data.pagination || { page: 1, limit, total: 0, totalPages: 0 }
      };
    } catch (error) {
      console.error('Failed to fetch wallet transactions:', error);
      return {
        transactions: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 }
      };
    }
  },

  // Get transaction by hash (public endpoint)
  getTransactionByHash: async (txHash: string): Promise<Transaction | null> => {
    try {
      const response = await fetch(`${API_URL}/transactions/hash/${txHash}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.transaction;
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      return null;
    }
  },

  // Create transaction record (public endpoint - called after blockchain tx)
  createTransaction: async (data: {
    txHash: string;
    walletAddress?: string;
    type: string;
    amount?: number;
    status?: 'pending' | 'confirmed' | 'failed';
  }): Promise<Transaction | null> => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction record');
      }

      const result = await response.json();
      return result.transaction;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      return null;
    }
  }
};
