import { PrismaClient } from '@prisma/client';
import { BlockchainService } from './blockchain.service';

const prisma = new PrismaClient();

export class ReferralService {
  // Get referral configuration (hybrid: blockchain + database)
  static async getConfig() {
    let config = await prisma.referralConfig.findUnique({
      where: { id: 1 }
    });

    // Create default config if doesn't exist
    if (!config) {
      config = await prisma.referralConfig.create({
        data: {
          id: 1,
          referralPercentage: 5.0,
          referrerPercentage: 2.0,
          isPaused: false
        }
      });
    }

    return {
      referralPercentage: Number(config.referralPercentage),
      referrerPercentage: Number(config.referrerPercentage),
      isPaused: config.isPaused
    };
  }

  // Get blockchain configuration
  static async getBlockchainConfig() {
    try {
      const config = await BlockchainService.getReferralConfig();
      return config;
    } catch (error: any) {
      console.error('Failed to get blockchain config:', error);
      throw new Error('Failed to fetch blockchain configuration');
    }
  }

  // Sync database with blockchain
  static async syncWithBlockchain() {
    try {
      const blockchainConfig = await BlockchainService.getReferralConfig();
      
      // Update database to match blockchain
      const updated = await prisma.referralConfig.upsert({
        where: { id: 1 },
        update: {
          referralPercentage: blockchainConfig.referralPercentage,
          referrerPercentage: blockchainConfig.referrerPercentage,
          isPaused: blockchainConfig.isPaused
        },
        create: {
          id: 1,
          referralPercentage: blockchainConfig.referralPercentage,
          referrerPercentage: blockchainConfig.referrerPercentage,
          isPaused: blockchainConfig.isPaused
        }
      });

      return {
        referralPercentage: Number(updated.referralPercentage),
        referrerPercentage: Number(updated.referrerPercentage),
        isPaused: updated.isPaused,
        synced: true
      };
    } catch (error: any) {
      console.error('Sync failed:', error);
      throw new Error('Failed to sync with blockchain');
    }
  }

  // Update referral configuration (updates both blockchain and database)
  static async updateConfig(data: {
    referralPercentage?: number;
    referrerPercentage?: number;
    isPaused?: boolean;
  }) {
    // Ensure config exists
    await this.getConfig();

    // Get current config
    const currentConfig = await prisma.referralConfig.findUnique({
      where: { id: 1 }
    });

    if (!currentConfig) {
      throw new Error('Config not found');
    }

    const newReferralPercentage = data.referralPercentage ?? Number(currentConfig.referralPercentage);
    const newReferrerPercentage = data.referrerPercentage ?? Number(currentConfig.referrerPercentage);
    const newIsPaused = data.isPaused ?? currentConfig.isPaused;

    // Update blockchain first
    try {
      await BlockchainService.setReferralConfig(
        newReferralPercentage,
        newReferrerPercentage,
        newIsPaused
      );
    } catch (error: any) {
      console.error('Blockchain update failed:', error);
      throw new Error('Failed to update blockchain configuration');
    }

    // Update database
    const updated = await prisma.referralConfig.update({
      where: { id: 1 },
      data: {
        referralPercentage: newReferralPercentage,
        referrerPercentage: newReferrerPercentage,
        isPaused: newIsPaused
      }
    });

    return {
      referralPercentage: Number(updated.referralPercentage),
      referrerPercentage: Number(updated.referrerPercentage),
      isPaused: updated.isPaused
    };
  }

  // Get referral stats
  static async getStats() {
    const config = await this.getConfig();

    // Total referrals
    const totalReferrals = await prisma.referral.count();

    // Total earnings
    const earnings = await prisma.referral.aggregate({
      _sum: { earnings: true }
    });

    return {
      referralPercentage: config.referralPercentage,
      referrerPercentage: config.referrerPercentage,
      totalReferrals,
      totalEarnings: Number(earnings._sum.earnings || 0),
      isPaused: config.isPaused
    };
  }

  // Get referrals for a specific wallet
  static async getReferralsByWallet(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();

    const referrals = await prisma.referral.findMany({
      where: { referrerWallet: normalizedAddress },
      orderBy: { createdAt: 'desc' }
    });

    return referrals.map(ref => ({
      id: ref.id,
      referredWallet: ref.referredWallet,
      earnings: Number(ref.earnings),
      createdAt: ref.createdAt.toISOString()
    }));
  }
}
