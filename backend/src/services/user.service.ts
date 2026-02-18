import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {
  // Generate unique referral code
  static generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // Connect wallet - create or update user
  static async connectWallet(walletAddress: string, referralCode?: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    try {
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (user) {
        // Update last seen
        user = await prisma.user.update({
          where: { id: user.id },
          data: { lastSeenAt: new Date() }
        });
        return user;
      }

      // Create new user
      const newReferralCode = this.generateReferralCode();

      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          referralCode: newReferralCode,
          referredBy: referralCode || null
        }
      });

      // Create referral record if referred
      if (referralCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode }
        });

        if (referrer) {
          await prisma.referral.create({
            data: {
              referrerWallet: referrer.walletAddress,
              referredWallet: normalizedAddress,
              earnings: 0 // Will be updated when they stake
            }
          });
        }
      }

      return user;
      return user;
    } catch (error: any) {
      // Handle race condition - if user was created between check and create
      if (error.code === 'P2002') {
        // User was created by another request, fetch and return it
        const user = await prisma.user.findUnique({
          where: { walletAddress: normalizedAddress }
        });
        if (user) {
          return user;
        }
      }
      throw error;
    }
  }

  // Set referrer for a user
  static async setReferrer(walletAddress: string, referralCode: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) throw new Error('User not found');
    if (user.referredBy) throw new Error('User already has a referrer');
    if (user.referralCode === referralCode) throw new Error('Cannot refer yourself');

    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) throw new Error('Invalid referral code');

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { referredBy: referralCode }
    });

    // Create referral record
    await prisma.referral.create({
      data: {
        referrerWallet: referrer.walletAddress,
        referredWallet: normalizedAddress,
        earnings: 0
      }
    });

    return { success: true };
  }

  // Skip referral for a user
  static async skipReferral(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) throw new Error('User not found');
    if (user.referredBy) throw new Error('User already has a referrer');

    await prisma.user.update({
      where: { id: user.id },
      data: { isReferralSkipped: true }
    });

    return { success: true };
  }

  // Get all users with calculated stats
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      include: {
        stakes: {
          where: { status: 'active' }
        }
      },
      orderBy: { firstConnectedAt: 'desc' }
    });

    // Calculate stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalStaked = user.stakes.reduce(
          (sum, stake) => sum + Number(stake.amount),
          0
        );

        const activeStakes = user.stakes.length;

        // Get completed stakes for rewards claimed
        const completedStakes = await prisma.stake.findMany({
          where: {
            userId: user.id,
            status: 'completed'
          }
        });

        const rewardsClaimed = completedStakes.reduce((sum, stake) => {
          const duration = (new Date(stake.endDate).getTime() - new Date(stake.startDate).getTime()) / (1000 * 60 * 60 * 24);
          const reward = Number(stake.amount) * (Number(stake.apy) / 100) * (duration / 365);
          return sum + reward;
        }, 0);

        // Get referral earnings
        const referralEarnings = await prisma.referral.aggregate({
          where: { referrerWallet: user.walletAddress },
          _sum: { earnings: true }
        });

        return {
          id: user.id,
          walletAddress: user.walletAddress,
          totalStaked,
          activeStakes,
          rewardsClaimed: Math.round(rewardsClaimed),
          referralEarnings: Number(referralEarnings._sum.earnings || 0),
          status: user.status,
          joinDate: user.firstConnectedAt.toISOString()
        };
      })
    );

    return usersWithStats;
  }

  // Get single user with stats
  static async getUserByWallet(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
      include: {
        stakes: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get referrer wallet if exists
    let referrerWallet = null;
    if (user.referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: user.referredBy }
      });
      if (referrer) {
        referrerWallet = referrer.walletAddress;
      }
    }

    const activeStakes = user.stakes.filter(s => s.status === 'active');
    const completedStakes = user.stakes.filter(s => s.status === 'completed');

    const totalStaked = activeStakes.reduce(
      (sum, stake) => sum + Number(stake.amount),
      0
    );

    const rewardsClaimed = completedStakes.reduce((sum, stake) => {
      const duration = (new Date(stake.endDate).getTime() - new Date(stake.startDate).getTime()) / (1000 * 60 * 60 * 24);
      const reward = Number(stake.amount) * (Number(stake.apy) / 100) * (duration / 365);
      return sum + reward;
    }, 0);

    const referralEarnings = await prisma.referral.aggregate({
      where: { referrerWallet: user.walletAddress },
      _sum: { earnings: true }
    });

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referrerWallet,
      isReferralSkipped: user.isReferralSkipped,
      totalStaked,
      activeStakes: activeStakes.length,
      rewardsClaimed: Math.round(rewardsClaimed),
      referralEarnings: Number(referralEarnings._sum.earnings || 0),
      referralCount: await prisma.referral.count({
        where: { referrerWallet: user.walletAddress }
      }),
      status: user.status,
      joinDate: user.firstConnectedAt.toISOString()
    };
  }

  // Update user status
  static async updateUserStatus(walletAddress: string, status: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    return await prisma.user.update({
      where: { walletAddress: normalizedAddress },
      data: { status }
    });
  }
}
