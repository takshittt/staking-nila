import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';

const prisma = new PrismaClient();

export class StakingService {
  // Amount Config Methods
  static async getAllAmountConfigs() {
    try {
      const configs = await BlockchainService.getAllAmountConfigs();
      return configs;
    } catch (error: any) {
      throw new Error(`Failed to fetch amount configs: ${error.message}`);
    }
  }

  static async getAmountConfig(id: number) {
    try {
      const config = await BlockchainService.getAmountConfig(id);
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
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'CREATE_AMOUNT_CONFIG',
          txHash: null
        }
      });

      // Call blockchain
      const result = await BlockchainService.addAmountConfig(amountWei, instantRewardBps);

      // Update audit log with tx hash
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return {
        ...result,
        amount,
        instantRewardBps
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
      // Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'UPDATE_AMOUNT_CONFIG',
          txHash: null
        }
      });

      // Call blockchain
      const result = await BlockchainService.updateAmountConfig(id, instantRewardBps, active);

      // Update audit log
      await prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { txHash: result.txHash }
      });

      return result;
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

  static async getLockConfig(id: number) {
    try {
      const config = await BlockchainService.getLockConfig(id);
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
          adminId,
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
          adminId,
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

  // Stats
  static async getStakingStats() {
    try {
      // Get available rewards from blockchain
      const blockchainStats = await BlockchainService.getStakingStats();

      // Calculate total staked from DB (active stakes only)
      const totalStakedResult = await prisma.stake.aggregate({
        where: { status: 'active' },
        _sum: { amount: true }
      });

      const totalStakedAmount = totalStakedResult._sum.amount || 0;

      // Calculate unique stakers from DB (active stakes only)
      const uniqueStakersResult = await prisma.stake.groupBy({
        by: ['userId'],
        where: { status: 'active' }
      });

      // Convert total staked to Wei string (matches frontend expectation)
      const totalStakedWei = ethers.parseUnits(totalStakedAmount.toString(), 18).toString();

      return {
        totalStaked: totalStakedWei,
        uniqueStakers: uniqueStakersResult.length,
        availableRewards: blockchainStats.availableRewards
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
