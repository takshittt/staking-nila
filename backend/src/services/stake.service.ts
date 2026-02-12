import { PrismaClient } from '@prisma/client';

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
        walletAddress: normalizedAddress,
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

    // Update referral earnings if user was referred
    if (user.referredBy) {
      const config = await prisma.referralConfig.findUnique({
        where: { id: 1 }
      });

      if (config && !config.isPaused) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: user.referredBy }
        });

        if (referrer) {
          const earnings = data.amount * (Number(config.referralPercentage) / 100);
          
          await prisma.referral.updateMany({
            where: {
              referrerWallet: referrer.walletAddress,
              referredWallet: normalizedAddress
            },
            data: {
              earnings: { increment: earnings }
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
      orderBy: { createdAt: 'desc' }
    });

    return stakes.map(stake => ({
      id: stake.id,
      stakeId: stake.stakeId,
      wallet: stake.walletAddress,
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
      where: { walletAddress: normalizedAddress },
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
}
