import { PrismaClient } from '@prisma/client';
import { BlockchainService } from './blockchain.service';

const prisma = new PrismaClient();

export class TreasuryService {
  // Get comprehensive treasury stats
  static async getTreasuryStats() {
    try {
      const { ethers } = require('ethers');

      // Get total staked from database (active stakes only)
      const activeStakes = await prisma.stake.findMany({
        where: { status: 'active' },
        select: { amount: true }
      });

      const totalStakedAmount = activeStakes.reduce((sum: number, stake: any) => sum + parseFloat(stake.amount), 0);
      const totalStakedWei = ethers.parseUnits(totalStakedAmount.toString(), 18).toString();

      // Get all pending rewards from database
      const allPendingRewards = await this.calculateAllPendingRewards();

      // Get all claimed rewards from database (for available rewards calculation)
      const claimedRewards = await prisma.pendingReward.findMany({
        where: { status: 'claimed' },
        select: { amount: true }
      });

      const totalClaimedAmount = claimedRewards.reduce((sum: number, reward: any) => sum + parseFloat(reward.amount), 0);
      const totalClaimedWei = ethers.parseUnits(totalClaimedAmount.toString(), 18).toString();

      // Calculate contract balance (total staked + available rewards)
      const contractBalance = (BigInt(totalStakedWei) + BigInt(totalClaimedWei)).toString();

      // Calculate available rewards (claimed + pending)
      const availableRewards = (BigInt(totalClaimedWei) + BigInt(ethers.parseUnits(allPendingRewards, 18).toString())).toString();

      const pendingRewardsBigInt = BigInt(ethers.parseUnits(allPendingRewards, 18).toString());
      const availableRewardsBigInt = BigInt(availableRewards);

      const surplus = availableRewardsBigInt - pendingRewardsBigInt;
      const coverageRatio = pendingRewardsBigInt > 0n
        ? Number(availableRewardsBigInt) / Number(pendingRewardsBigInt)
        : 999; // Infinite coverage if no pending rewards

      let healthStatus: 'healthy' | 'low' | 'critical';
      if (coverageRatio < 1) healthStatus = 'critical';
      else if (coverageRatio < 1.2) healthStatus = 'low';
      else healthStatus = 'healthy';

      return {
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        contractBalance,
        totalStaked: totalStakedWei,
        availableRewards,
        pendingRewards: ethers.parseUnits(allPendingRewards, 18).toString(),
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

      // Get all pending rewards from database (all types)
      const dbPendingRewards = await prisma.pendingReward.findMany({
        where: {
          status: 'pending'
        },
        select: {
          amount: true
        }
      });

      // Sum all pending rewards
      const totalPendingAmount = dbPendingRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      
      // Convert to Wei string
      const totalPendingWei = (BigInt(Math.floor(totalPendingAmount * 1e18))).toString();

      // Cache for 5 minutes
      await this.cachePendingRewards(totalPendingWei, 300);

      return totalPendingWei;
    } catch (error: any) {
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
        (sum, stake) => sum + parseFloat(stake.amount),
        0
      );

      // Calculate instant rewards owed for manual stakes
      // MongoDB doesn't support aggregate _sum on string fields, fetch and sum manually
      const instantRewards = await prisma.pendingReward.findMany({
        where: {
          status: 'pending',
          type: 'INSTANT_CASHBACK',
          sourceId: {
            in: manualStakes.map(s => s.stakeId)
          }
        },
        select: {
          amount: true
        }
      });

      const instantRewardsSum = instantRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);

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
        instantRewardsOwed: instantRewardsSum.toString(),
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

  // ============================================
  // USDT MANAGEMENT
  // ============================================

  // Get USDT balance in contract
  static async getUSDTBalance() {
    try {
      const result = await BlockchainService.getUSDTBalance();
      return result;
    } catch (error: any) {
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
  }

  // Withdraw USDT from contract
  static async withdrawUSDT(adminId: number, amount: number) {
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
          action: 'WITHDRAW_USDT',
          txHash: null
        }
      });

      // Execute withdrawal
      const result = await BlockchainService.withdrawUSDT(amountWei);

      // Update audit log
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return {
        ...result,
        amount: amount.toString()
      };
    } catch (error: any) {
      throw new Error(`Failed to withdraw USDT: ${error.message}`);
    }
  }

  // ============================================
  // NILA LIABILITY MANAGEMENT
  // ============================================

  // Get NILA liability status
  static async getNILALiabilityStatus() {
    try {
      const result = await BlockchainService.getNILALiabilityStatus();
      return result;
    } catch (error: any) {
      throw new Error(`Failed to get NILA liability status: ${error.message}`);
    }
  }

  // Deposit NILA for liabilities
  static async depositNILAForLiabilities(adminId: number, amount: number) {
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
          action: 'DEPOSIT_NILA_LIABILITIES',
          txHash: null
        }
      });

      // Execute deposit
      const result = await BlockchainService.depositNILAForLiabilities(amountWei);

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
      throw new Error(`Failed to deposit NILA for liabilities: ${error.message}`);
    }
  }
}
