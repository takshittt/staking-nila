import { PrismaClient } from '@prisma/client';
import { BlockchainService } from './blockchain.service';

const prisma = new PrismaClient();

export class RewardService {
  // Create pending reward
  static async createPendingReward(data: {
    userId: string;
    walletAddress: string;
    type: 'INSTANT_CASHBACK' | 'APY_REWARD' | 'REFERRAL_REWARD';
    amount: number;
    sourceId?: string;
    metadata?: any;
  }) {
    const reward = await prisma.pendingReward.create({
      data: {
        userId: data.userId,
        walletAddress: data.walletAddress.toLowerCase(),
        type: data.type,
        amount: data.amount.toString(),
        sourceId: data.sourceId,
        metadata: data.metadata || {}
      }
    });

    return reward;
  }

  // Get all pending rewards for a user
  static async getUserPendingRewards(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    try {
      // Get claimable rewards from smart contract
      const contractRewards = await BlockchainService.getClaimableRewards(normalizedAddress);

      const instantCashback = Number(contractRewards.instantRewards) / 1e18;
      const referralRewards = Number(contractRewards.referralRewards) / 1e18;

      // Get APY rewards from database (these are synced separately)
      let apyRewards = await prisma.pendingReward.findMany({
        where: {
          walletAddress: normalizedAddress,
          type: 'APY_REWARD',
          status: 'pending'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Auto-sync if no APY rewards found but user has active stakes
      if (apyRewards.length === 0) {
        const activeStakesCount = await prisma.stake.count({
          where: {
            user: { walletAddress: normalizedAddress },
            status: 'active'
          }
        });

        if (activeStakesCount > 0) {
          // Trigger sync
          await this.syncAPYRewards(normalizedAddress);

          // Refetch rewards
          apyRewards = await prisma.pendingReward.findMany({
            where: {
              walletAddress: normalizedAddress,
              type: 'APY_REWARD',
              status: 'pending'
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
        }
      }

      // Get pending instant cashback from database (with sourceId for stake association)
      const pendingInstantCashback = await prisma.pendingReward.findMany({
        where: {
          walletAddress: normalizedAddress,
          type: 'INSTANT_CASHBACK',
          status: 'pending'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get claimed instant cashback and referral rewards from database
      const claimedRewards = await prisma.pendingReward.findMany({
        where: {
          walletAddress: normalizedAddress,
          type: { in: ['INSTANT_CASHBACK', 'REFERRAL_REWARD'] },
          status: 'claimed'
        },
        orderBy: {
          claimedAt: 'desc'
        }
      });

      const stakingRewards = apyRewards.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalClaimable = instantCashback + stakingRewards + referralRewards;

      // Combine contract rewards with database APY rewards
      const breakdown = [
        ...apyRewards.map(r => ({
          id: r.id,
          type: r.type,
          amount: Number(r.amount),
          createdAt: r.createdAt,
          sourceId: r.sourceId,
          metadata: r.metadata
        }))
      ];

      // Add pending instant cashback from database (these have sourceIds)
      breakdown.push(...pendingInstantCashback.map(r => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        createdAt: r.createdAt,
        sourceId: r.sourceId,
        metadata: r.metadata
      })));

      // Add claimed instant cashback and referral rewards to breakdown
      breakdown.push(...claimedRewards.map(r => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        createdAt: r.createdAt,
        claimedAt: r.claimedAt,
        sourceId: r.sourceId,
        metadata: r.metadata
      })));

      // Only add contract instant cashback if no database records exist (fallback)
      // This handles cases where rewards might be claimed on-chain but not tracked in DB
      if (instantCashback > 0 && pendingInstantCashback.length === 0) {
        breakdown.push({
          id: 'contract-instant',
          type: 'INSTANT_CASHBACK' as const,
          amount: instantCashback,
          createdAt: new Date(),
          sourceId: null,
          metadata: { fromContract: true }
        });
      }

      // Add referral rewards if available
      if (referralRewards > 0) {
        breakdown.push({
          id: 'contract-referral',
          type: 'REFERRAL_REWARD' as const,
          amount: referralRewards,
          createdAt: new Date(),
          sourceId: null,
          metadata: { fromContract: true }
        });
      }

      return {
        instantCashback,
        stakingRewards,
        referralRewards,
        totalClaimable,
        breakdown
      };
    } catch (error: any) {
      console.error('Error getting pending rewards:', error);
      throw new Error(`Failed to get pending rewards: ${error.message}`);
    }
  }

  // Get reward history (claimed rewards)
  static async getUserRewardHistory(walletAddress: string, limit = 50) {
    const normalizedAddress = walletAddress.toLowerCase();

    const history = await prisma.pendingReward.findMany({
      where: {
        walletAddress: normalizedAddress,
        status: 'claimed'
      },
      orderBy: {
        claimedAt: 'desc'
      },
      take: limit
    });

    return history.map(r => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      createdAt: r.createdAt,
      claimedAt: r.claimedAt,
      txHash: r.txHash,
      sourceId: r.sourceId
    }));
  }

  // Get lifetime earnings
  static async getUserLifetimeEarnings(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    // MongoDB doesn't support aggregate _sum on string fields, fetch and sum manually
    const claimedRewards = await prisma.pendingReward.findMany({
      where: {
        walletAddress: normalizedAddress,
        status: 'claimed'
      },
      select: {
        amount: true
      }
    });

    const pendingRewards = await prisma.pendingReward.findMany({
      where: {
        walletAddress: normalizedAddress,
        status: 'pending'
      },
      select: {
        amount: true
      }
    });

    const totalClaimed = claimedRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalPending = pendingRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return {
      totalClaimed,
      totalPending,
      totalLifetime: totalClaimed
    };
  }

  // Record a claim that happened on-chain (for instant cashback and referral rewards)
  static async recordClaim(data: {
    walletAddress: string;
    type: 'INSTANT_CASHBACK' | 'REFERRAL_REWARD' | 'ALL';
    instantAmount?: number;
    referralAmount?: number;
    txHash: string;
  }) {
    const normalizedAddress = data.walletAddress.toLowerCase();

    try {
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress: normalizedAddress
          }
        });
      }

      // Mark existing pending instant cashback rewards as claimed
      if ((data.type === 'INSTANT_CASHBACK' || data.type === 'ALL') && data.instantAmount && data.instantAmount > 0) {
        // Find all pending instant cashback rewards for this user
        await prisma.pendingReward.updateMany({
          where: {
            walletAddress: normalizedAddress,
            type: 'INSTANT_CASHBACK',
            status: 'pending'
          },
          data: {
            status: 'claimed',
            claimedAt: new Date(),
            txHash: data.txHash
          }
        });
      }

      // Mark existing pending referral rewards as claimed  
      if ((data.type === 'REFERRAL_REWARD' || data.type === 'ALL') && data.referralAmount && data.referralAmount > 0) {
        // Find all pending referral rewards for this user
        await prisma.pendingReward.updateMany({
          where: {
            walletAddress: normalizedAddress,
            type: 'REFERRAL_REWARD',
            status: 'pending'
          },
          data: {
            status: 'claimed',
            claimedAt: new Date(),
            txHash: data.txHash
          }
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error recording claim:', error);
      throw new Error(`Failed to record claim: ${error.message}`);
    }
  }

  // Claim rewards
  static async claimRewards(data: {
    walletAddress: string;
    type?: 'ALL' | 'INSTANT_CASHBACK' | 'APY_REWARD' | 'REFERRAL_REWARD';
    rewardIds?: string[];
  }) {
    const normalizedAddress = data.walletAddress.toLowerCase();

    try {
      let txHash: string = '';
      let amount = 0;
      let rewardsClaimed = 0;

      if (data.type === 'INSTANT_CASHBACK') {
        // Claim instant rewards from contract
        const contractRewards = await BlockchainService.getClaimableRewards(normalizedAddress);
        amount = Number(contractRewards.instantRewards) / 1e18;

        if (amount === 0) {
          throw new Error('No instant rewards to claim');
        }

        txHash = await BlockchainService.claimInstantRewards(normalizedAddress);
        rewardsClaimed = 1;

      } else if (data.type === 'REFERRAL_REWARD') {
        // Claim referral rewards from contract
        const contractRewards = await BlockchainService.getClaimableRewards(normalizedAddress);
        amount = Number(contractRewards.referralRewards) / 1e18;

        if (amount === 0) {
          throw new Error('No referral rewards to claim');
        }

        txHash = await BlockchainService.claimReferralRewards(normalizedAddress);
        rewardsClaimed = 1;

      } else if (data.type === 'APY_REWARD') {
        // Claim APY rewards from database (these are managed separately)
        const apyRewards = await prisma.pendingReward.findMany({
          where: {
            walletAddress: normalizedAddress,
            type: 'APY_REWARD',
            status: 'pending'
          }
        });

        if (apyRewards.length === 0) {
          throw new Error('No APY rewards to claim');
        }

        amount = apyRewards.reduce((sum, r) => sum + Number(r.amount), 0);
        txHash = await BlockchainService.transferRewards(normalizedAddress, amount);

        // Mark as claimed
        await prisma.pendingReward.updateMany({
          where: {
            id: { in: apyRewards.map(r => r.id) }
          },
          data: {
            status: 'claimed',
            claimedAt: new Date(),
            txHash
          }
        });

        rewardsClaimed = apyRewards.length;

      } else {
        // Claim ALL rewards
        const contractRewards = await BlockchainService.getClaimableRewards(normalizedAddress);
        const instantAmount = Number(contractRewards.instantRewards) / 1e18;
        const referralAmount = Number(contractRewards.referralRewards) / 1e18;

        const apyRewards = await prisma.pendingReward.findMany({
          where: {
            walletAddress: normalizedAddress,
            type: 'APY_REWARD',
            status: 'pending'
          }
        });

        const apyAmount = apyRewards.reduce((sum, r) => sum + Number(r.amount), 0);
        amount = instantAmount + referralAmount + apyAmount;

        if (amount === 0) {
          throw new Error('No rewards to claim');
        }

        // Claim instant + referral from contract
        if (instantAmount > 0 || referralAmount > 0) {
          txHash = await BlockchainService.claimAllRewards(normalizedAddress);
          rewardsClaimed += (instantAmount > 0 ? 1 : 0) + (referralAmount > 0 ? 1 : 0);
        }

        // Claim APY rewards separately if any
        if (apyAmount > 0) {
          const apyTxHash = await BlockchainService.transferRewards(normalizedAddress, apyAmount);
          txHash = txHash || apyTxHash;

          await prisma.pendingReward.updateMany({
            where: {
              id: { in: apyRewards.map(r => r.id) }
            },
            data: {
              status: 'claimed',
              claimedAt: new Date(),
              txHash: apyTxHash
            }
          });

          rewardsClaimed += apyRewards.length;
        }
      }

      return {
        success: true,
        txHash: txHash!,
        amount,
        rewardsClaimed
      };
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      throw new Error(`Failed to claim rewards: ${error.message}`);
    }
  }

  // Sync APY rewards from blockchain
  static async syncAPYRewards(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get pending rewards from blockchain
      const blockchainRewards = await BlockchainService.getUserPendingRewards(normalizedAddress);

      // Get active stakes
      const activeStakes = await prisma.stake.findMany({
        where: {
          user: { walletAddress: normalizedAddress },
          status: 'active'
        }
      });

      // Create pending rewards for each stake with rewards
      for (const stakeData of blockchainRewards.breakdown) {
        const stake = activeStakes.find(s => s.stakeId === stakeData.stakeId.toString());

        if (stake && Number(stakeData.pendingReward) > 0) {
          // Check if reward already exists
          const existing = await prisma.pendingReward.findFirst({
            where: {
              userId: user.id,
              type: 'APY_REWARD',
              sourceId: stake.stakeId,
              status: 'pending'
            }
          });

          const rewardAmount = Number(stakeData.pendingReward) / 1e18; // Convert from wei

          if (!existing) {
            // Create new reward
            await this.createPendingReward({
              userId: user.id,
              walletAddress: normalizedAddress,
              type: 'APY_REWARD',
              amount: rewardAmount,
              sourceId: stake.stakeId,
              metadata: {
                stakeAmount: Number(stakeData.amount),
                apr: stakeData.apr
              }
            });
          } else {
            // Update existing reward amount
            await prisma.pendingReward.update({
              where: { id: existing.id },
              data: { amount: rewardAmount.toString() }
            });
          }
        }
      }

      return { success: true, synced: true };
    } catch (error: any) {
      console.error('Error syncing APY rewards:', error);
      throw new Error(`Failed to sync APY rewards: ${error.message}`);
    }
  }

  // Get all pending rewards across all users (for admin)
  static async getAllPendingRewards() {
    // MongoDB doesn't support groupBy with _sum on string fields
    // Fetch all rewards and group manually
    const rewards = await prisma.pendingReward.findMany({
      select: {
        type: true,
        status: true,
        amount: true
      }
    });

    // Group by type and status
    const grouped = rewards.reduce((acc, reward) => {
      const key = `${reward.type}-${reward.status}`;
      if (!acc[key]) {
        acc[key] = {
          type: reward.type,
          status: reward.status,
          totalAmount: 0,
          count: 0
        };
      }
      acc[key].totalAmount += parseFloat(reward.amount);
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { type: string; status: string; totalAmount: number; count: number }>);

    return Object.values(grouped);
  }
}
