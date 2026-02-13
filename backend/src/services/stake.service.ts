import { PrismaClient } from '@prisma/client';
import { RewardService } from './reward.service';

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
        amount: data.amount,
        apy: data.apy,
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
        where: { id: 1 }
      });

      if (config && !config.isPaused) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: user.referredBy }
        });

        if (referrer) {
          // Calculate referral rewards
          const referrerReward = data.amount * (Number(config.referrerPercentage) / 100);
          const referredReward = data.amount * (Number(config.referralPercentage) / 100);

          // Update referral earnings tracking
          await prisma.referral.updateMany({
            where: {
              referrerWallet: referrer.walletAddress,
              referredWallet: normalizedAddress
            },
            data: {
              earnings: { increment: referrerReward }
            }
          });

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
              rewardPercent: Number(config.referrerPercentage)
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
              rewardPercent: Number(config.referralPercentage),
              isBonus: true
            }
          });
        }
      }
    }

    return stake;
  }

  // Get all stakes
  static async getAllStakes() {
    const stakes = await prisma.stake.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    return stakes.map(stake => ({
      id: stake.id,
      stakeId: stake.stakeId,
      wallet: stake.user.walletAddress,
      planVersion: `${stake.planName} v${stake.planVersion}`,
      amount: Number(stake.amount),
      apy: Number(stake.apy),
      startDate: stake.startDate.toISOString(),
      endDate: stake.endDate.toISOString(),
      status: stake.status,
      txHash: stake.txHash
    }));
  }

  // Get stakes for a user
  static async getUserStakes(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    const stakes = await prisma.stake.findMany({
      where: { user: { walletAddress: normalizedAddress } },
      orderBy: { createdAt: 'desc' }
    });

    return stakes.map(stake => ({
      id: stake.id,
      stakeId: stake.stakeId,
      planVersion: `${stake.planName} v${stake.planVersion}`,
      amount: Number(stake.amount),
      apy: Number(stake.apy),
      startDate: stake.startDate.toISOString(),
      endDate: stake.endDate.toISOString(),
      status: stake.status,
      txHash: stake.txHash
    }));
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
    const largeUnlockCount = await prisma.stake.count({
      where: {
        status: 'active',
        amount: {
          gte: 50000
        },
        endDate: {
          gte: now,
          lte: thirtyDaysLater
        }
      }
    });

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
      const reward = Number(stake.amount) * (Number(stake.apy) / 100) * (durationDays / yearInDays);
      estimatedRewardsPaid += reward;
    }

    return {
      expiringStakesCount,
      largeUnlockCount,
      estimatedRewardsPaid: estimatedRewardsPaid.toFixed(2)
    };
  }
}

