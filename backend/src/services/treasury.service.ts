import { PrismaClient } from '@prisma/client';
import { BlockchainService } from './blockchain.service';

const prisma = new PrismaClient();

export class TreasuryService {
  // Get comprehensive treasury stats
  static async getTreasuryStats() {
    try {
      const stats = await BlockchainService.getTreasuryStats();
      const allPendingRewards = await this.calculateAllPendingRewards();

      const contractBalance = BigInt(stats.contractBalance);
      const availableRewards = BigInt(stats.availableRewards);
      const pendingRewards = BigInt(allPendingRewards);

      const surplus = availableRewards - pendingRewards;
      const coverageRatio = pendingRewards > 0
        ? Number(availableRewards) / Number(pendingRewards)
        : 999; // Infinite coverage if no pending rewards

      let healthStatus: 'healthy' | 'low' | 'critical';
      if (coverageRatio < 1) healthStatus = 'critical';
      else if (coverageRatio < 1.2) healthStatus = 'low';
      else healthStatus = 'healthy';

      return {
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        contractBalance: stats.contractBalance,
        totalStaked: stats.totalStaked,
        availableRewards: stats.availableRewards,
        pendingRewards: allPendingRewards,
        surplus: surplus.toString(),
        coverageRatio: Math.min(coverageRatio, 999), // Cap at 999 for display
        healthStatus
      };
    } catch (error: any) {
      throw new Error(`Failed to get treasury stats: ${error.message}`);
    }
  }

  // Calculate total pending rewards from all users
  static async calculateAllPendingRewards(): Promise<string> {
    try {
      // Check cache first
      const cached = await this.getCachedPendingRewards();
      if (cached) return cached;

      // Get all unique wallet addresses with active stakes
      const activeStakes = await prisma.stake.findMany({
        where: { status: 'active' },
        select: {
          user: {
            select: { walletAddress: true }
          }
        },
        distinct: ['userId']
      });

      let totalPending = BigInt(0);

      // Calculate pending rewards for each user
      for (const stake of activeStakes) {
        try {
          const userRewards = await BlockchainService.getUserPendingRewards(
            stake.user.walletAddress
          );
          totalPending += BigInt(userRewards.totalPendingRewards);
        } catch (error) {
          console.error(
            `Error calculating pending for ${stake.user.walletAddress}:`,
            error
          );
          // Continue with other users even if one fails
        }
      }

      const result = totalPending.toString();

      // NEW: Add pending INSTANT and REFERRAL rewards from DB
      // These may not be on-chain yet if they are pending admin approval or similar, 
      // or if we just want to include all pending types.
      const dbPendingRewards = await prisma.pendingReward.aggregate({
        where: {
          status: 'pending',
          type: {
            in: ['INSTANT_CASHBACK', 'REFERRAL_REWARD']
          }
        },
        _sum: {
          amount: true
        }
      });

      const dbPendingAmount = BigInt(Number(dbPendingRewards._sum.amount || 0) * 1e18);
      const totalWithDb = BigInt(result) + dbPendingAmount;
      const finalResult = totalWithDb.toString();

      // Cache for 5 minutes
      await this.cachePendingRewards(finalResult, 300);

      return finalResult;
    } catch (error: any) {
      console.error('Error calculating all pending rewards:', error);
      // Return 0 if calculation fails to prevent blocking
      return '0';
    }
  }

  // Get pending rewards for a specific user
  static async getUserPendingRewards(walletAddress: string) {
    try {
      const result = await BlockchainService.getUserPendingRewards(walletAddress);

      return {
        walletAddress,
        ...result
      };
    } catch (error: any) {
      throw new Error(`Failed to get user pending rewards: ${error.message}`);
    }
  }

  // Deposit rewards to contract
  static async depositRewards(adminId: number, amount: number) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Convert to wei (18 decimals)
    const amountWei = (BigInt(Math.floor(amount * 1e8)) * BigInt(10 ** 10)).toString();

    try {
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'DEPOSIT_REWARDS',
          txHash: null
        }
      });

      // Execute deposit
      const result = await BlockchainService.depositRewards(amountWei);

      // Update audit log with tx hash
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      // Invalidate cache
      await this.invalidateCache();

      return {
        ...result,
        amount: amount.toString()
      };
    } catch (error: any) {
      throw new Error(`Failed to deposit rewards: ${error.message}`);
    }
  }

  // Withdraw excess rewards from contract
  static async withdrawRewards(adminId: number, amount: number) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Convert to wei (18 decimals)
    const amountWei = (BigInt(Math.floor(amount * 1e8)) * BigInt(10 ** 10)).toString();

    try {
      // Check if contract is paused
      const isPaused = await BlockchainService.isContractPaused();
      if (!isPaused) {
        throw new Error('Contract must be paused to withdraw rewards');
      }

      // Verify sufficient excess rewards
      const stats = await BlockchainService.getTreasuryStats();
      const availableRewards = BigInt(stats.availableRewards);

      if (BigInt(amountWei) > availableRewards) {
        throw new Error('Amount exceeds available rewards');
      }

      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'WITHDRAW_REWARDS',
          txHash: null
        }
      });

      // Execute withdrawal
      const result = await BlockchainService.withdrawRewards(amountWei);

      // Update audit log
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      // Invalidate cache
      await this.invalidateCache();

      return {
        ...result,
        amount: amount.toString()
      };
    } catch (error: any) {
      throw new Error(`Failed to withdraw rewards: ${error.message}`);
    }
  }

  // Pause contract (required for withdrawals)
  static async pauseContract(adminId: number) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'PAUSE_CONTRACT',
          txHash: null
        }
      });

      const result = await BlockchainService.pauseContract();

      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return result;
    } catch (error: any) {
      throw new Error(`Failed to pause contract: ${error.message}`);
    }
  }

  // Unpause contract
  static async unpauseContract(adminId: number) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'UNPAUSE_CONTRACT',
          txHash: null
        }
      });

      const result = await BlockchainService.unpauseContract();

      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return result;
    } catch (error: any) {
      throw new Error(`Failed to unpause contract: ${error.message}`);
    }
  }

  // Get contract pause status
  static async getContractStatus() {
    try {
      const isPaused = await BlockchainService.isContractPaused();
      return { isPaused };
    } catch (error: any) {
      throw new Error(`Failed to get contract status: ${error.message}`);
    }
  }

  // Cache helpers
  private static async getCachedPendingRewards(): Promise<string | null> {
    const cached = await prisma.contractCache.findUnique({
      where: { key: 'total_pending_rewards' }
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached.value as string;
    }

    return null;
  }

  private static async cachePendingRewards(value: string, ttlSeconds: number) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await prisma.contractCache.upsert({
      where: { key: 'total_pending_rewards' },
      create: {
        key: 'total_pending_rewards',
        value,
        expiresAt
      },
      update: {
        value,
        expiresAt
      }
    });
  }

  private static async invalidateCache() {
    await prisma.contractCache.deleteMany({
      where: {
        key: {
          in: ['total_pending_rewards', 'treasury_stats']
        }
      }
    });
  }

  // Get liability statistics
  static async getLiabilityStats() {
    try {
      const liabilities = await BlockchainService.calculateLiabilities();
      
      // Get manual stakes from database (stakes without actual token backing)
      const manualStakes = await prisma.stake.findMany({
        where: {
          planName: 'Manual Assignment',
          status: 'active'
        },
        include: {
          user: true
        }
      });

      const totalManualStakeAmount = manualStakes.reduce(
        (sum, stake) => sum + Number(stake.amount),
        0
      );

      // Calculate instant rewards owed for manual stakes
      const instantRewardsOwed = await prisma.pendingReward.aggregate({
        where: {
          status: 'pending',
          type: 'INSTANT_CASHBACK',
          sourceId: {
            in: manualStakes.map(s => s.stakeId)
          }
        },
        _sum: {
          amount: true
        }
      });

      const liabilitiesWei = BigInt(liabilities.totalLiabilities);
      const contractBalanceWei = BigInt(liabilities.contractBalance);
      const availableRewardsWei = BigInt(liabilities.availableRewards);

      // Calculate coverage ratio
      const coverageRatio = liabilitiesWei > 0
        ? Number(availableRewardsWei) / Number(liabilitiesWei)
        : 999;

      let healthStatus: 'healthy' | 'warning' | 'critical';
      if (coverageRatio < 0.5) healthStatus = 'critical';
      else if (coverageRatio < 1) healthStatus = 'warning';
      else healthStatus = 'healthy';

      return {
        totalLiabilities: liabilities.totalLiabilities,
        totalManualStakes: manualStakes.length,
        totalManualStakeAmount: totalManualStakeAmount.toString(),
        instantRewardsOwed: (Number(instantRewardsOwed._sum.amount || 0)).toString(),
        contractBalance: liabilities.contractBalance,
        availableRewards: liabilities.availableRewards,
        coverageRatio: Math.min(coverageRatio, 999),
        healthStatus
      };
    } catch (error: any) {
      throw new Error(`Failed to get liability stats: ${error.message}`);
    }
  }

  // Get detailed liability breakdown
  static async getLiabilityBreakdown() {
    try {
      const manualStakes = await prisma.stake.findMany({
        where: {
          planName: 'Manual Assignment',
          status: 'active'
        },
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const breakdown = await Promise.all(
        manualStakes.map(async (stake) => {
          // Get pending rewards for this stake
          const pendingRewards = await prisma.pendingReward.findMany({
            where: {
              sourceId: stake.stakeId,
              status: 'pending'
            }
          });

          const totalRewardsOwed = pendingRewards.reduce(
            (sum, reward) => sum + Number(reward.amount),
            0
          );

          return {
            stakeId: stake.stakeId,
            walletAddress: stake.user.walletAddress,
            amount: Number(stake.amount),
            apy: Number(stake.apy),
            lockDays: Math.round(
              (stake.endDate.getTime() - stake.startDate.getTime()) / (1000 * 60 * 60 * 24)
            ),
            startDate: stake.startDate.toISOString(),
            endDate: stake.endDate.toISOString(),
            rewardsOwed: totalRewardsOwed,
            txHash: stake.txHash,
            createdAt: stake.createdAt.toISOString()
          };
        })
      );

      return {
        manualStakes: breakdown,
        totalCount: breakdown.length,
        totalAmount: breakdown.reduce((sum, s) => sum + s.amount, 0),
        totalRewardsOwed: breakdown.reduce((sum, s) => sum + s.rewardsOwed, 0)
      };
    } catch (error: any) {
      throw new Error(`Failed to get liability breakdown: ${error.message}`);
    }
  }
}
