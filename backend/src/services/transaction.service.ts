import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTransactionDto {
  txHash: string;
  walletAddress?: string;
  type: 'STAKE' | 'UNSTAKE' | 'CLAIM_REWARD' | 'DEPOSIT' | 'WITHDRAW' | 'REFERRAL_REWARD' | 'CONFIG_UPDATE';
  amount?: number;
  status?: 'pending' | 'confirmed' | 'failed';
}

export interface UpdateTransactionDto {
  status?: 'pending' | 'confirmed' | 'failed';
  confirmedAt?: Date;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  walletAddress?: string;
  startDate?: Date;
  endDate?: Date;
}

export class TransactionService {
  // Create a new transaction record
  static async createTransaction(data: CreateTransactionDto) {
    return await prisma.transaction.create({
      data: {
        txHash: data.txHash,
        walletAddress: data.walletAddress,
        type: data.type,
        amount: data.amount,
        status: data.status || 'pending',
        confirmedAt: data.status === 'confirmed' ? new Date() : undefined
      }
    });
  }

  // Update transaction status
  static async updateTransaction(txHash: string, data: UpdateTransactionDto) {
    return await prisma.transaction.update({
      where: { txHash },
      data: {
        ...data,
        confirmedAt: data.status === 'confirmed' ? new Date() : undefined
      }
    });
  }

  // Get transaction by hash
  static async getTransactionByHash(txHash: string) {
    return await prisma.transaction.findUnique({
      where: { txHash }
    });
  }

  // Get all transactions with filters
  static async getTransactions(filters: TransactionFilters = {}, page = 1, limit = 50) {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.walletAddress) where.walletAddress = filters.walletAddress;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get transactions by wallet address
  static async getWalletTransactions(walletAddress: string, page = 1, limit = 20) {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transaction.count({ where: { walletAddress } })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get transaction statistics
  static async getTransactionStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalTransactions,
      confirmedTransactions,
      pendingTransactions,
      failedTransactions,
      transactionsByType,
      totalVolume
    ] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.count({ where: { ...where, status: 'confirmed' } }),
      prisma.transaction.count({ where: { ...where, status: 'pending' } }),
      prisma.transaction.count({ where: { ...where, status: 'failed' } }),
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _count: { type: true }
      }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'confirmed', amount: { not: null } },
        _sum: { amount: true }
      })
    ]);

    return {
      total: totalTransactions,
      confirmed: confirmedTransactions,
      pending: pendingTransactions,
      failed: failedTransactions,
      byType: transactionsByType.reduce((acc: Record<string, number>, item: any) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      totalVolume: Number(totalVolume._sum.amount || 0)
    };
  }

  // Get recent transactions
  static async getRecentTransactions(limit = 10) {
    return await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // Delete old transactions (cleanup)
  static async deleteOldTransactions(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.transaction.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['confirmed', 'failed'] }
      }
    });
  }
}
