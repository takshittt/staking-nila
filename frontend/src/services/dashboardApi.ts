const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UserStake {
  id: string;
  stakeId: string | number;
  walletAddress: string;
  planName: string;
  planVersion: number;
  amount: string;
  apy: number;
  lockDays: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  txHash?: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalStaked: string;
  totalRewardsEarned: string;
  referralRewards: string;
  activeStakesCount: number;
  nextRewardDate?: string;
}

export interface StakeWithRewards extends UserStake {
  rewards: string;
  progress: number;
  cashback: string;
  cashbackPercentage: string;
  cashbackClaimed: boolean;
}

export const dashboardApi = {
  // Get user's dashboard statistics
  getDashboardStats: async (walletAddress: string): Promise<DashboardStats> => {
    try {
      // Fetch data from available public endpoints
      const [stakesRes, lifetimeRes, pendingRes] = await Promise.all([
        fetch(`${API_URL}/stakes/user/${walletAddress}`),
        fetch(`${API_URL}/rewards/lifetime/${walletAddress}`),
        fetch(`${API_URL}/rewards/pending/${walletAddress}`)
      ]);

      const stakesData = stakesRes.ok ? await stakesRes.json() : { stakes: [] };
      const lifetimeData = lifetimeRes.ok ? await lifetimeRes.json() : { earnings: { totalClaimed: 0 } };
      const pendingData = pendingRes.ok ? await pendingRes.json() : { rewards: { referralRewards: 0 } };

      const stakes = stakesData.stakes || [];
      const activeStakes = stakes.filter((s: UserStake) => s.status === 'active');

      // Calculate total staked
      const totalStaked = activeStakes.reduce((sum: number, stake: UserStake) => {
        return sum + parseFloat(stake.amount);
      }, 0);

      // Find next reward date (earliest end date of active stakes)
      let nextRewardDate: string | undefined;
      if (activeStakes.length > 0) {
        const sortedByEndDate = [...activeStakes].sort((a, b) =>
          new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        );
        nextRewardDate = sortedByEndDate[0].endDate;
      }

      return {
        totalStaked: totalStaked.toString(),
        totalRewardsEarned: lifetimeData.earnings.totalClaimed.toString(),
        referralRewards: pendingData.rewards.referralRewards?.toString() || '0',
        activeStakesCount: activeStakes.length,
        nextRewardDate
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },

  // Get user's active stakes with calculated rewards
  getActiveStakes: async (walletAddress: string): Promise<StakeWithRewards[]> => {
    try {
      const [stakesRes, pendingRes] = await Promise.all([
        fetch(`${API_URL}/stakes/user/${walletAddress}`),
        fetch(`${API_URL}/rewards/pending/${walletAddress}`)
      ]);

      if (!stakesRes.ok) {
        throw new Error('Failed to fetch stakes');
      }

      const stakesData = await stakesRes.json();
      const pendingData = pendingRes.ok ? await pendingRes.json() : { rewards: { breakdown: [] } };

      const stakes = stakesData.stakes || [];
      const activeStakes = stakes.filter((s: UserStake) => s.status === 'active');
      const rewardBreakdown = pendingData.rewards?.breakdown || [];

      // Map stakes with rewards and progress
      return activeStakes.map((stake: UserStake) => {
        const startDate = new Date(stake.startDate);
        const endDate = new Date(stake.endDate);
        const now = new Date();

        // Calculate progress percentage
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

        // Find APY reward for this stake from backend data
        const apyReward = rewardBreakdown.find(
          (r: any) => r.type === 'APY_REWARD' && String(r.sourceId) === String(stake.stakeId)
        );

        let expectedRewards = 0;

        if (apyReward) {
          // Use the value from backend which is synced from contract
          expectedRewards = apyReward.amount;
        } else {
          // Fallback to local calculation only if no backend data
          // This handles cases where sync might not have happened yet
          const amount = parseFloat(stake.amount);
          const apy = stake.apy / 10000; // Convert basis points to decimal
          const daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
          expectedRewards = (amount * apy * daysElapsed) / 365;
        }

        // Find instant cashback reward for this stake
        const cashbackReward = rewardBreakdown.find(
          (r: any) => r.type === 'INSTANT_CASHBACK' && r.sourceId === stake.stakeId
        );

        // Get cashback amount and percentage from reward data
        let cashbackAmount = 0;
        let cashbackPercentage = 0;

        if (cashbackReward) {
          cashbackAmount = cashbackReward.amount;
          // Try to get percentage from metadata
          if (cashbackReward.metadata?.rewardPercent) {
            cashbackPercentage = cashbackReward.metadata.rewardPercent;
          } else {
            // Calculate percentage from amount
            cashbackPercentage = (cashbackAmount / parseFloat(stake.amount)) * 100;
          }
        }

        return {
          ...stake,
          rewards: expectedRewards.toFixed(2),
          progress: Math.round(progress),
          cashback: cashbackAmount.toFixed(2),
          cashbackPercentage: cashbackPercentage.toFixed(1),
          cashbackClaimed: cashbackReward?.claimedAt != null
        };
      });
    } catch (error) {
      console.error('Failed to fetch active stakes:', error);
      throw error;
    }
  },

  // Get detailed stake information
  getStakeDetails: async (walletAddress: string, stakeId: string): Promise<StakeWithRewards | null> => {
    try {
      const stakes = await dashboardApi.getActiveStakes(walletAddress);
      return stakes.find(s => s.id === stakeId) || null;
    } catch (error) {
      console.error('Failed to fetch stake details:', error);
      return null;
    }
  }
};
