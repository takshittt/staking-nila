import { PrismaClient } from '@prisma/client';
import { RewardService } from './reward.service';

const prisma = new PrismaClient();

// Fixed NILA price in USD
const NILA_PRICE_USD = 0.08;

export class CryptoStakeService {
  /**
   * Calculate NILA amount from USD display amount
   * Formula: USD Amount ÷ 0.08 = NILA Amount
   * Note: USD is just for display. User actually pays with NILA tokens.
   */
  static calculateNilaAmount(usdAmount: number): number {
    return usdAmount / NILA_PRICE_USD;
  }
  
  /**
   * Calculate USD display amount from NILA amount
   * Formula: NILA Amount × 0.08 = USD Amount
   */
  static calculateUsdAmount(nilaAmount: number): number {
    return nilaAmount * NILA_PRICE_USD;
  }

  /**
   * Create a pending crypto stake
   * This is called when user initiates the stake but hasn't sent NILA yet
   * Note: usdAmount is just for display. User will pay with NILA tokens.
   */
  static async createPendingStake(data: {
    walletAddress: string;
    usdAmount: number;
    amountConfigId: number;
    lockConfigId: number;
  }) {
    const normalizedAddress = data.walletAddress.toLowerCase();

    // Calculate NILA amount (user will pay this amount in NILA)
    const nilaAmount = this.calculateNilaAmount(data.usdAmount);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          referralCode
        }
      });
    }

    // Generate stake ID
    const count = await prisma.stake.count();
    const stakeId = `STK-${String(count + 1).padStart(3, '0')}`;

    return {
      stakeId,
      userId: user.id,
      walletAddress: normalizedAddress,
      usdAmount: data.usdAmount,
      nilaAmount,
      amountConfigId: data.amountConfigId,
      lockConfigId: data.lockConfigId
    };
  }

  /**
   * Confirm crypto stake after NILA transaction is successful
   * This is called after user sends NILA tokens and transaction is confirmed
   * Note: User pays with NILA tokens. USD amount is just for display/rewards calculation.
   */
  static async confirmCryptoStake(data: {
    walletAddress: string;
    usdAmount: number;
    nilaAmount: number;
    lockDays: number;
    apr: number;
    instantRewardBps: number;
    txHash: string;
  }) {
    const normalizedAddress = data.walletAddress.toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + data.lockDays);

    // Generate stake ID
    const count = await prisma.stake.count();
    const stakeId = `STK-${String(count + 1).padStart(3, '0')}`;

    // Convert APR from basis points to percentage
    const apyPercent = data.apr / 100;

    // Create stake record
    const stake = await prisma.stake.create({
      data: {
        stakeId,
        userId: user.id,
        planName: 'NILA Staking (Crypto)',
        planVersion: 1,
        amount: data.nilaAmount,
        apy: apyPercent,
        startDate,
        endDate,
        txHash: data.txHash,
        status: 'active'
      }
    });

    // Create instant cashback reward if applicable (crypto only)
    // Reward is calculated based on USD display amount
    if (data.instantRewardBps > 0) {
      const instantRewardPercent = data.instantRewardBps / 100;
      const instantRewardUsd = data.usdAmount * (instantRewardPercent / 100);
      // Convert USD reward to NILA
      const instantRewardNila = this.calculateNilaAmount(instantRewardUsd);

      await RewardService.createPendingReward({
        userId: user.id,
        walletAddress: normalizedAddress,
        type: 'INSTANT_CASHBACK',
        amount: instantRewardNila,
        sourceId: stake.stakeId,
        metadata: {
          stakeAmount: data.nilaAmount,
          usdAmount: data.usdAmount,
          rewardPercent: instantRewardPercent,
          paymentMethod: 'CRYPTO'
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
          // Calculate referral rewards based on USD display amount
          const referrerRewardUsd = data.usdAmount * (Number(config.referrerPercentage) / 100);
          const referredRewardUsd = data.usdAmount * (Number(config.referralPercentage) / 100);
          
          // Convert USD rewards to NILA
          const referrerRewardNila = this.calculateNilaAmount(referrerRewardUsd);
          const referredRewardNila = this.calculateNilaAmount(referredRewardUsd);

          // Update referral earnings tracking (in NILA)
          await prisma.referral.updateMany({
            where: {
              referrerWallet: referrer.walletAddress,
              referredWallet: normalizedAddress
            },
            data: {
              earnings: { increment: referrerRewardNila }
            }
          });

          // Create pending reward for referrer (in NILA)
          await RewardService.createPendingReward({
            userId: referrer.id,
            walletAddress: referrer.walletAddress,
            type: 'REFERRAL_REWARD',
            amount: referrerRewardNila,
            sourceId: stake.stakeId,
            metadata: {
              referredUser: normalizedAddress,
              stakeAmount: data.nilaAmount,
              usdAmount: data.usdAmount,
              rewardPercent: Number(config.referrerPercentage),
              paymentMethod: 'CRYPTO'
            }
          });

          // Create pending reward for referred user (bonus, in NILA)
          await RewardService.createPendingReward({
            userId: user.id,
            walletAddress: normalizedAddress,
            type: 'REFERRAL_REWARD',
            amount: referredRewardNila,
            sourceId: stake.stakeId,
            metadata: {
              referrerUser: referrer.walletAddress,
              stakeAmount: data.nilaAmount,
              usdAmount: data.usdAmount,
              rewardPercent: Number(config.referralPercentage),
              isBonus: true,
              paymentMethod: 'CRYPTO'
            }
          });
        }
      }
    }

    return {
      stake,
      nilaAmount: data.nilaAmount,
      usdAmount: data.usdAmount
    };
  }

  /**
   * Get stake details with USD/NILA breakdown
   */
  static async getStakeDetails(stakeId: string) {
    const stake = await prisma.stake.findUnique({
      where: { stakeId },
      include: { user: true }
    });

    if (!stake) {
      throw new Error('Stake not found');
    }

    // Calculate USD display amount from NILA amount
    const nilaAmount = Number(stake.amount);
    const usdAmount = this.calculateUsdAmount(nilaAmount);

    // Calculate lock days
    const startDate = new Date(stake.startDate);
    const endDate = new Date(stake.endDate);
    const lockDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      stakeId: stake.stakeId,
      walletAddress: stake.user.walletAddress,
      nilaAmount,
      usdAmount,
      apy: Number(stake.apy),
      lockDays,
      startDate: stake.startDate.toISOString(),
      endDate: stake.endDate.toISOString(),
      status: stake.status,
      txHash: stake.txHash
    };
  }

  /**
   * Validate NILA transaction on blockchain
   * This should be called before confirming the stake
   */
  static async validateNilaTransaction(txHash: string, expectedAmount: number, userAddress: string): Promise<boolean> {
    // TODO: Implement blockchain validation
    // This should:
    // 1. Check if transaction exists
    // 2. Verify it's a NILA transfer/stake
    // 3. Verify the amount matches
    // 4. Verify it's sent to the correct contract address
    // 5. Verify it's from the user's address
    
    // For now, return true (implement actual validation later)
    console.log(`Validating NILA transaction: ${txHash} for ${expectedAmount} NILA from ${userAddress}`);
    return true;
  }
}
