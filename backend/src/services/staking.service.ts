import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';

const prisma = new PrismaClient();

export class StakingService {
  // Amount Config Methods
  static async getAllAmountConfigs() {
    try {
      const configs = await prisma.amountConfig.findMany();
      return configs;
    } catch (error: any) {
      throw new Error(`Failed to fetch amount configs: ${error.message}`);
    }
  }

  static async getAmountConfig(id: number) {
    try {
      const config = await prisma.amountConfig.findUnique({ where: { id } });
      if (!config) {
        throw new Error(`Amount config with id ${id} not found`);
      }
      return config;
    } catch (error: any) {
      throw new Error(`Failed to fetch amount config: ${error.message}`);
    }
  }

  static async createAmountConfig(adminId: number, amount: number, instantRewardPercent: number) {
    // Convert percentage to basis points
    const instantRewardBps = Math.floor(instantRewardPercent * 100);

    // Validate
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (instantRewardBps < 0 || instantRewardBps > 10000) {
      throw new Error('Instant reward must be between 0 and 100%');
    }

    // Convert amount to wei (assuming 18 decimals)
    const amountWei = (BigInt(amount) * BigInt(10 ** 18)).toString();

    try {
      // Find max ID manually to simulate auto-increment
      const lastConfig = await prisma.amountConfig.findFirst({
        orderBy: { id: 'desc' }
      });
      const nextId = lastConfig ? lastConfig.id + 1 : 0;

      // Create in DB
      const result = await prisma.amountConfig.create({
        data: {
          id: nextId,
          amount: amountWei,
          instantRewardBps,
          active: true
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          adminId: adminId.toString(), // assuming adminId is string in DB, or wait, auditLogs use string Admin ID from req.adminId, let's just make sure
          action: 'CREATE_AMOUNT_CONFIG',
          txHash: null // no txHash since it's DB only
        }
      });

      return {
        ...result,
        txHash: null,
        configId: result.id
      };
    } catch (error: any) {
      throw new Error(`Failed to create amount config: ${error.message}`);
    }
  }

  static async updateAmountConfig(
    adminId: number,
    id: number,
    instantRewardPercent: number,
    active: boolean
  ) {
    const instantRewardBps = Math.floor(instantRewardPercent * 100);

    if (instantRewardBps < 0 || instantRewardBps > 10000) {
      throw new Error('Instant reward must be between 0 and 100%');
    }

    try {
      // Update in DB
      const result = await prisma.amountConfig.update({
        where: { id },
        data: {
          instantRewardBps,
          active
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          adminId: adminId.toString(),
          action: 'UPDATE_AMOUNT_CONFIG',
          txHash: null
        }
      });

      return {
        ...result,
        txHash: null
      };
    } catch (error: any) {
      throw new Error(`Failed to update amount config: ${error.message}`);
    }
  }

  // Lock Config Methods
  static async getAllLockConfigs() {
    try {
      const configs = await BlockchainService.getAllLockConfigs();
      return configs;
    } catch (error: any) {
      throw new Error(`Failed to fetch lock configs: ${error.message}`);
    }
  }

  static async getActiveLockConfigs() {
    try {
      const allConfigs = await BlockchainService.getAllLockConfigs();
      return allConfigs.filter(config => config.active);
    } catch (error: any) {
      throw new Error(`Failed to fetch active lock configs: ${error.message}`);
    }
  }

  static async getActiveAmountConfigs() {
    try {
      const allConfigs = await prisma.amountConfig.findMany({
        where: { active: true }
      });
      return allConfigs;
    } catch (error: any) {
      throw new Error(`Failed to fetch active amount configs: ${error.message}`);
    }
  }

  static async getLockConfig(id: number) {
    try {
      const config = await BlockchainService.getLockConfig(id);
      if (!config) {
        throw new Error(`Lock config with id ${id} not found`);
      }
      return config;
    } catch (error: any) {
      throw new Error(`Failed to fetch lock config: ${error.message}`);
    }
  }

  static async createLockConfig(adminId: number, lockDays: number, aprPercent: number) {
    // Convert percentage to basis points
    const aprBps = Math.floor(aprPercent * 100);

    // Validate
    if (lockDays <= 0) {
      throw new Error('Lock duration must be greater than 0');
    }
    if (aprBps < 0 || aprBps > 50000) {
      throw new Error('APR must be between 0 and 500%');
    }

    try {
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId: adminId.toString(),
          action: 'CREATE_LOCK_CONFIG',
          txHash: null
        }
      });

      // Call blockchain
      const result = await BlockchainService.addLockConfig(lockDays, aprBps);

      // Update audit log
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return {
        ...result,
        lockDays,
        aprBps
      };
    } catch (error: any) {
      throw new Error(`Failed to create lock config: ${error.message}`);
    }
  }

  static async updateLockConfig(adminId: number, id: number, aprPercent: number, active: boolean) {
    const aprBps = Math.floor(aprPercent * 100);

    if (aprBps < 0 || aprBps > 50000) {
      throw new Error('APR must be between 0 and 500%');
    }

    try {
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId: adminId.toString(),
          action: 'UPDATE_LOCK_CONFIG',
          txHash: null
        }
      });

      // Call blockchain
      const result = await BlockchainService.updateLockConfig(id, aprBps, active);

      // Update audit log
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return result;
    } catch (error: any) {
      throw new Error(`Failed to update lock config: ${error.message}`);
    }
  }

  // Reward Tier Methods
  static async getAllRewardTiers() {
    try {
      const tiers = await BlockchainService.getAllRewardTiers();
      return tiers;
    } catch (error: any) {
      throw new Error(`Failed to fetch reward tiers: ${error.message}`);
    }
  }

  static async getActiveRewardTiers() {
    try {
      const allTiers = await BlockchainService.getAllRewardTiers();
      return allTiers.filter(tier => tier.active);
    } catch (error: any) {
      throw new Error(`Failed to fetch active reward tiers: ${error.message}`);
    }
  }

  static async getRewardTier(id: number) {
    try {
      const tier = await BlockchainService.getRewardTier(id);
      if (!tier) {
        throw new Error(`Reward tier with id ${id} not found`);
      }
      return tier;
    } catch (error: any) {
      throw new Error(`Failed to fetch reward tier: ${error.message}`);
    }
  }

  static async createRewardTier(
    adminId: number,
    minNilaAmount: number,
    maxNilaAmount: number,
    instantRewardPercent: number
  ) {
    // Convert percentage to basis points
    const instantRewardBps = Math.floor(instantRewardPercent * 100);

    // Validate
    if (minNilaAmount < 0) {
      throw new Error('Minimum amount cannot be negative');
    }
    if (maxNilaAmount < 0) {
      throw new Error('Maximum amount cannot be negative');
    }
    if (maxNilaAmount > 0 && maxNilaAmount <= minNilaAmount) {
      throw new Error('Maximum must be greater than minimum (or 0 for unlimited)');
    }
    if (instantRewardBps < 0 || instantRewardBps > 10000) {
      throw new Error('Instant reward must be between 0 and 100%');
    }

    // Convert amounts to wei (assuming 18 decimals)
    const minNilaAmountWei = (BigInt(Math.floor(minNilaAmount)) * BigInt(10 ** 18)).toString();
    const maxNilaAmountWei = maxNilaAmount === 0 ? '0' : (BigInt(Math.floor(maxNilaAmount)) * BigInt(10 ** 18)).toString();

    try {
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId: adminId.toString(),
          action: 'CREATE_REWARD_TIER',
          txHash: null
        }
      });

      // Call blockchain
      const result = await BlockchainService.addRewardTier(
        minNilaAmountWei,
        maxNilaAmountWei,
        instantRewardBps
      );

      // Update audit log with tx hash
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return {
        ...result,
        minNilaAmount,
        maxNilaAmount,
        instantRewardBps
      };
    } catch (error: any) {
      throw new Error(`Failed to create reward tier: ${error.message}`);
    }
  }

  static async updateRewardTier(
    adminId: number,
    id: number,
    minNilaAmount: number,
    maxNilaAmount: number,
    instantRewardPercent: number,
    active: boolean
  ) {
    const instantRewardBps = Math.floor(instantRewardPercent * 100);

    // Validate
    if (minNilaAmount < 0) {
      throw new Error('Minimum amount cannot be negative');
    }
    if (maxNilaAmount < 0) {
      throw new Error('Maximum amount cannot be negative');
    }
    if (maxNilaAmount > 0 && maxNilaAmount <= minNilaAmount) {
      throw new Error('Maximum must be greater than minimum (or 0 for unlimited)');
    }
    if (instantRewardBps < 0 || instantRewardBps > 10000) {
      throw new Error('Instant reward must be between 0 and 100%');
    }

    // Convert amounts to wei
    const minNilaAmountWei = (BigInt(Math.floor(minNilaAmount)) * BigInt(10 ** 18)).toString();
    const maxNilaAmountWei = maxNilaAmount === 0 ? '0' : (BigInt(Math.floor(maxNilaAmount)) * BigInt(10 ** 18)).toString();

    try {
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId: adminId.toString(),
          action: 'UPDATE_REWARD_TIER',
          txHash: null
        }
      });

      // Call blockchain
      const result = await BlockchainService.updateRewardTier(
        id,
        minNilaAmountWei,
        maxNilaAmountWei,
        instantRewardBps,
        active
      );

      // Update audit log
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return result;
    } catch (error: any) {
      throw new Error(`Failed to update reward tier: ${error.message}`);
    }
  }

  // Stats
  static async getStakingStats() {
    try {
      // Calculate total staked from DB (active stakes only)
      // MongoDB doesn't support aggregate _sum on string fields, fetch and sum manually
      const activeStakes = await prisma.stake.findMany({
        where: { status: 'active' },
        select: { amount: true }
      });

      const totalStakedAmount = activeStakes.reduce((sum, stake) => sum + parseFloat(stake.amount), 0);

      // Calculate unique stakers from DB (active stakes only)
      const uniqueStakersResult = await prisma.stake.groupBy({
        by: ['userId'],
        where: { status: 'active' }
      });

      // Get available rewards from database (claimed + pending)
      const claimedRewards = await prisma.pendingReward.findMany({
        where: { status: 'claimed' },
        select: { amount: true }
      });

      const pendingRewards = await prisma.pendingReward.findMany({
        where: { status: 'pending' },
        select: { amount: true }
      });

      const totalClaimedAmount = claimedRewards.reduce((sum, reward) => sum + parseFloat(reward.amount), 0);
      const totalPendingAmount = pendingRewards.reduce((sum, reward) => sum + parseFloat(reward.amount), 0);
      const totalAvailableRewards = totalClaimedAmount + totalPendingAmount;

      // Convert to Wei strings (matches frontend expectation)
      const totalStakedWei = ethers.parseUnits(totalStakedAmount.toString(), 18).toString();
      const availableRewardsWei = ethers.parseUnits(totalAvailableRewards.toString(), 18).toString();

      return {
        totalStaked: totalStakedWei,
        uniqueStakers: uniqueStakersResult.length,
        availableRewards: availableRewardsWei
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch staking stats: ${error.message}`);
    }
  }

  // Cache Management
  static async getCachedData(key: string) {
    const cached = await prisma.contractCache.findUnique({
      where: { key }
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached.value;
    }

    return null;
  }

  static async setCachedData(key: string, value: any, ttlSeconds: number = 300) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await prisma.contractCache.upsert({
      where: { key },
      create: {
        key,
        value,
        expiresAt
      },
      update: {
        value,
        expiresAt
      }
    });
  }

  static async invalidateCache(key: string) {
    await prisma.contractCache.deleteMany({
      where: { key }
    });
  }
}
