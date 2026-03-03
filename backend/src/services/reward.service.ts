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
      // Get all pending rewards from database (synced data)
      const pendingRewards = await prisma.pendingReward.findMany({
        where: {
          walletAddress: normalizedAddress,
          status: 'pending'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate totals by type
      const instantCashback = pendingRewards
        .filter(r => r.type === 'INSTANT_CASHBACK')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const stakingRewards = pendingRewards
        .filter(r => r.type === 'APY_REWARD')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const referralRewards = pendingRewards
        .filter(r => r.type === 'REFERRAL_REWARD')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const totalClaimable = instantCashback + stakingRewards + referralRewards;

      // Build breakdown from database records
      const breakdown = pendingRewards.map(r => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        createdAt: r.createdAt,
        sourceId: r.sourceId,
        metadata: r.metadata
      }));

      return {
        instantCashback,
        stakingRewards,
        referralRewards,
        totalClaimable,
        breakdown
      };
    } catch (error: any) {
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

      // Mark pending instant cashback rewards as claimed (up to the claimed amount)
      if ((data.type === 'INSTANT_CASHBACK' || data.type === 'ALL') && data.instantAmount && data.instantAmount > 0) {
        // Find pending instant cashback rewards for this user
        const pendingInstantRewards = await prisma.pendingReward.findMany({
          where: {
            walletAddress: normalizedAddress,
            type: 'INSTANT_CASHBACK',
            status: 'pending'
          },
          orderBy: {
            createdAt: 'asc' // Claim oldest first (FIFO)
          }
        });

        // Mark rewards as claimed up to the claimed amount
        let remainingAmount = data.instantAmount;
        const rewardsToUpdate: string[] = [];

        for (const reward of pendingInstantRewards) {
          if (remainingAmount <= 0) break;

          const rewardAmount = parseFloat(reward.amount);
          
          if (rewardAmount <= remainingAmount) {
            // Claim the entire reward
            rewardsToUpdate.push(reward.id);
            remainingAmount -= rewardAmount;
          } else {
            // Partial claim: split the reward
            // Update the existing reward to reduce its amount
            await prisma.pendingReward.update({
              where: { id: reward.id },
              data: {
                amount: (rewardAmount - remainingAmount).toString()
              }
            });

            // Create a new claimed reward for the claimed portion
            await prisma.pendingReward.create({
              data: {
                userId: reward.userId,
                walletAddress: normalizedAddress,
                type: 'INSTANT_CASHBACK',
                amount: remainingAmount.toString(),
                status: 'claimed',
                claimedAt: new Date(),
                txHash: data.txHash,
                sourceId: reward.sourceId,
                metadata: reward.metadata
              }
            });

            remainingAmount = 0;
            break;
          }
        }

        // Mark the selected rewards as claimed
        if (rewardsToUpdate.length > 0) {
          await prisma.pendingReward.updateMany({
            where: {
              id: { in: rewardsToUpdate }
            },
            data: {
              status: 'claimed',
              claimedAt: new Date(),
              txHash: data.txHash
            }
          });
        }
      }

      // Mark pending referral rewards as claimed (up to the claimed amount)
      if ((data.type === 'REFERRAL_REWARD' || data.type === 'ALL') && data.referralAmount && data.referralAmount > 0) {
        // Find pending referral rewards for this user
        const pendingReferralRewards = await prisma.pendingReward.findMany({
          where: {
            walletAddress: normalizedAddress,
            type: 'REFERRAL_REWARD',
            status: 'pending'
          },
          orderBy: {
            createdAt: 'asc' // Claim oldest first (FIFO)
          }
        });

        // Mark rewards as claimed up to the claimed amount
        let remainingAmount = data.referralAmount;
        const rewardsToUpdate: string[] = [];

        for (const reward of pendingReferralRewards) {
          if (remainingAmount <= 0) break;

          const rewardAmount = parseFloat(reward.amount);
          
          if (rewardAmount <= remainingAmount) {
            // Claim the entire reward
            rewardsToUpdate.push(reward.id);
            remainingAmount -= rewardAmount;
          } else {
            // Partial claim: split the reward
            // Update the existing reward to reduce its amount
            await prisma.pendingReward.update({
              where: { id: reward.id },
              data: {
                amount: (rewardAmount - remainingAmount).toString()
              }
            });

            // Create a new claimed reward for the claimed portion
            await prisma.pendingReward.create({
              data: {
                userId: reward.userId,
                walletAddress: normalizedAddress,
                type: 'REFERRAL_REWARD',
                amount: remainingAmount.toString(),
                status: 'claimed',
                claimedAt: new Date(),
                txHash: data.txHash,
                sourceId: reward.sourceId,
                metadata: reward.metadata
              }
            });

            remainingAmount = 0;
            break;
          }
        }

        // Mark the selected rewards as claimed
        if (rewardsToUpdate.length > 0) {
          await prisma.pendingReward.updateMany({
            where: {
              id: { in: rewardsToUpdate }
            },
            data: {
              status: 'claimed',
              claimedAt: new Date(),
              txHash: data.txHash
            }
          });
        }
      }

      return { success: true };
    } catch (error: any) {
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
        // Claim APY rewards via contract
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
        
        // Claim all APY rewards via smart contract
        txHash = await BlockchainService.claimAllAPYRewards(normalizedAddress);

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
        // Claim ALL rewards (instant + referral + APY in one transaction)
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

        // Claim all rewards (instant + referral + APY) in one transaction
        txHash = await BlockchainService.claimAllRewards(normalizedAddress);
        rewardsClaimed = (instantAmount > 0 ? 1 : 0) + (referralAmount > 0 ? 1 : 0);

        // Mark APY rewards as claimed in database
        if (apyAmount > 0 && apyRewards.length > 0) {
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
