import { PrismaClient } from '@prisma/client';
import { RewardService } from './reward.service';
import { BlockchainService } from './blockchain.service';
import { ethers } from 'ethers';
import { REFERRAL_CONFIG_ID } from '../utils/mongodb-constants';
import { DecimalHelper } from '../utils/decimal-helpers';

const prisma = new PrismaClient();

export class StakeService {
  // Generate unique stake ID
  static async generateStakeId(): Promise<string> {
    const count = await prisma.stake.count();
    return `STK-${String(count + 1).padStart(3, '0')}`;
  }

  // Create stake record
  static async createStake(data: {
    walletAddress: string;
    planName: string;
    planVersion: number;
    amount: number;
    apy: number;
    lockDays: number;
    instantRewardPercent?: number;
    txHash?: string;
  }) {
    const normalizedAddress = data.walletAddress.toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      // Auto-create user if they stake without connecting first
      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          referralCode
        }
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + data.lockDays);

    // Generate stake ID
    const stakeId = await this.generateStakeId();

    // Create stake
    const stake = await prisma.stake.create({
      data: {
        stakeId,
        userId: user.id,
        planName: data.planName,
        planVersion: data.planVersion,
        amount: DecimalHelper.toString(data.amount),
        apy: DecimalHelper.toString(data.apy),
        startDate,
        endDate,
        txHash: data.txHash,
        status: 'active'
      }
    });

    // Create instant cashback reward if applicable
    if (data.instantRewardPercent && data.instantRewardPercent > 0) {
      const instantReward = data.amount * (data.instantRewardPercent / 100);

      await RewardService.createPendingReward({
        userId: user.id,
        walletAddress: normalizedAddress,
        type: 'INSTANT_CASHBACK',
        amount: instantReward,
        sourceId: stake.stakeId,
        metadata: {
          stakeAmount: data.amount,
          rewardPercent: data.instantRewardPercent
        }
      });
    }

    // Handle referral rewards
    if (user.referredBy) {
      const config = await prisma.referralConfig.findUnique({
        where: { id: REFERRAL_CONFIG_ID }
      });

      if (config && !config.isPaused) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: user.referredBy }
        });

        if (referrer) {
          // Calculate referral rewards
          const referrerReward = data.amount * (parseFloat(config.referrerPercentage) / 100);
          const referredReward = data.amount * (parseFloat(config.referralPercentage) / 100);

          // Get existing referral or create new one
          const existingReferral = await prisma.referral.findFirst({
            where: {
              referrerWallet: referrer.walletAddress,
              referredWallet: normalizedAddress
            }
          });

          if (existingReferral) {
            // Update existing referral earnings
            const currentEarnings = parseFloat(existingReferral.earnings);
            await prisma.referral.update({
              where: { id: existingReferral.id },
              data: {
                earnings: DecimalHelper.toString(currentEarnings + referrerReward)
              }
            });
          } else {
            // Create new referral record
            await prisma.referral.create({
              data: {
                referrerWallet: referrer.walletAddress,
                referredWallet: normalizedAddress,
                earnings: DecimalHelper.toString(referrerReward)
              }
            });
          }

          // Create pending reward for referrer
          await RewardService.createPendingReward({
            userId: referrer.id,
            walletAddress: referrer.walletAddress,
            type: 'REFERRAL_REWARD',
            amount: referrerReward,
            sourceId: stake.stakeId,
            metadata: {
              referredUser: normalizedAddress,
              stakeAmount: data.amount,
              rewardPercent: parseFloat(config.referrerPercentage)
            }
          });

          // Create pending reward for referred user (bonus)
          await RewardService.createPendingReward({
            userId: user.id,
            walletAddress: normalizedAddress,
            type: 'REFERRAL_REWARD',
            amount: referredReward,
            sourceId: stake.stakeId,
            metadata: {
              referrerUser: referrer.walletAddress,
              stakeAmount: data.amount,
              rewardPercent: parseFloat(config.referralPercentage),
              isBonus: true
            }
          });
        }
      }
    }

    return stake;
  }

  // Create manual stake on-chain (admin only)
  static async createManualStakeOnChain(data: {
    walletAddress: string;
    amount: number;
    lockDays: number;
    apy: number;
    instantRewardPercent?: number;
  }) {
    const normalizedAddress = data.walletAddress.toLowerCase();

    // Convert amount to wei
    const amountWei = ethers.parseUnits(data.amount.toString(), 18).toString();
    
    // Convert APY percentage to basis points (e.g., 10% = 1000 bps)
    const aprBps = Math.floor(data.apy * 100);
    
    // Convert instant reward percentage to basis points
    const instantRewardBps = data.instantRewardPercent 
      ? Math.floor(data.instantRewardPercent * 100) 
      : 0;

    // Call smart contract to create stake
    const result = await BlockchainService.adminCreateStake(
      normalizedAddress,
      amountWei,
      data.lockDays,
      aprBps,
      instantRewardBps
    );

    // Create database record
    const stake = await this.createStake({
      walletAddress: normalizedAddress,
      planName: 'Manual Assignment',
      planVersion: 1,
      amount: data.amount,
      apy: data.apy,
      lockDays: data.lockDays,
      instantRewardPercent: data.instantRewardPercent,
      txHash: result.txHash
    });

    return {
      stake,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      onChainStakeId: result.stakeId
    };
  }

  // Get all stakes
  static async getAllStakes() {
    const stakes = await prisma.stake.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    return stakes.map(stake => {
      // Calculate lock days from start and end dates
      const startDate = new Date(stake.startDate);
      const endDate = new Date(stake.endDate);
      const lockDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: stake.id,
        stakeId: stake.stakeId,
        wallet: stake.user.walletAddress,
        planName: stake.planName,
        planVersion: stake.planVersion,
        amount: Number(stake.amount),
        apy: Number(stake.apy),
        lockDays,
        startDate: stake.startDate.toISOString(),
        endDate: stake.endDate.toISOString(),
        status: stake.status,
        txHash: stake.txHash
      };
    });
  }

  // Get stakes for a user
  static async getUserStakes(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    const stakes = await prisma.stake.findMany({
      where: { user: { walletAddress: normalizedAddress } },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    return stakes.map(stake => {
      // Calculate lock days from start and end dates
      const startDate = new Date(stake.startDate);
      const endDate = new Date(stake.endDate);
      const lockDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: stake.id,
        stakeId: stake.stakeId,
        walletAddress: stake.user.walletAddress,
        planName: stake.planName,
        planVersion: stake.planVersion,
        amount: Number(stake.amount),
        apy: Number(stake.apy),
        lockDays,
        startDate: stake.startDate.toISOString(),
        endDate: stake.endDate.toISOString(),
        status: stake.status,
        txHash: stake.txHash
      };
    });
  }

  // Complete stake (when lock period ends)
  static async completeStake(stakeId: string) {
    return await prisma.stake.update({
      where: { stakeId },
      data: { status: 'completed' }
    });
  }

  // Get stake statistics
  static async getStakeStats() {
    const totalStakes = await prisma.stake.count();
    const activeStakes = await prisma.stake.count({
      where: { status: 'active' }
    });
    const completedStakes = await prisma.stake.count({
      where: { status: 'completed' }
    });

    return {
      totalStakes,
      activeStakes,
      completedStakes
    };
  }
  // Get risk statistics for overview
  static async getRiskStats() {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Expiring Stakes (in next 7 days)
    const expiringStakesCount = await prisma.stake.count({
      where: {
        status: 'active',
        endDate: {
          gte: now,
          lte: oneWeekLater
        }
      }
    });

    // 2. Large Unlock Events (> 50,000 NILA in next 30 days)
    // MongoDB with Prisma: string comparisons don't work with gte/lte
    // We need to fetch and filter in memory
    const allActiveStakes = await prisma.stake.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: now,
          lte: thirtyDaysLater
        }
      },
      select: {
        amount: true
      }
    });

    const largeUnlockCount = allActiveStakes.filter(
      stake => parseFloat(stake.amount) >= 50000
    ).length;

    // 3. Estimated Rewards Paid (Completed stakes * APY * duration)
    // Fetch all completed stakes
    const completedStakes = await prisma.stake.findMany({
      where: {
        status: 'completed'
      },
      select: {
        amount: true,
        apy: true,
        startDate: true,
        endDate: true
      }
    });

    let estimatedRewardsPaid = 0;

    for (const stake of completedStakes) {
      const durationMs = stake.endDate.getTime() - stake.startDate.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      const yearInDays = 365;

      // Formula: Principal * (APY/100) * (Duration/365)
      const reward = parseFloat(stake.amount) * (parseFloat(stake.apy) / 100) * (durationDays / yearInDays);
      estimatedRewardsPaid += reward;
    }

    // NEW: Add claimed rewards (INSTANT and REFERRAL) from DB
    // MongoDB aggregate doesn't support _sum on string fields, so we fetch and sum manually
    const claimedRewards = await prisma.pendingReward.findMany({
      where: {
        status: 'claimed',
        type: {
          in: ['INSTANT_CASHBACK', 'REFERRAL_REWARD']
        }
      },
      select: {
        amount: true
      }
    });

    const claimedAmount = claimedRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    estimatedRewardsPaid += claimedAmount;

    return {
      expiringStakesCount,
      largeUnlockCount,
      estimatedRewardsPaid: estimatedRewardsPaid.toFixed(2)
    };
  }
}

