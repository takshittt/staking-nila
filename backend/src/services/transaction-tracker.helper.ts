/**
 * Transaction Tracker Helper
 * 
 * Utility functions to easily integrate transaction tracking
 * into existing blockchain operations.
 */

import { TransactionService, CreateTransactionDto } from './transaction.service';

export class TransactionTracker {
  /**
   * Track a stake transaction
   */
  static async trackStake(
    txHash: string,
    walletAddress: string,
    amount: number
  ) {
    return await TransactionService.createTransaction({
      txHash,
      walletAddress,
      type: 'STAKE',
      amount
    });
  }

  /**
   * Track an unstake transaction
   */
  static async trackUnstake(
    txHash: string,
    walletAddress: string,
    amount: number
  ) {
    return await TransactionService.createTransaction({
      txHash,
      walletAddress,
      type: 'UNSTAKE',
      amount
    });
  }

  /**
   * Track a reward claim transaction
   */
  static async trackRewardClaim(
    txHash: string,
    walletAddress: string,
    amount: number
  ) {
    return await TransactionService.createTransaction({
      txHash,
      walletAddress,
      type: 'CLAIM_REWARD',
      amount
    });
  }

  /**
   * Track a treasury deposit transaction
   */
  static async trackDeposit(
    txHash: string,
    amount: number
  ) {
    return await TransactionService.createTransaction({
      txHash,
      type: 'DEPOSIT',
      amount
    });
  }

  /**
   * Track a treasury withdrawal transaction
   */
  static async trackWithdraw(
    txHash: string,
    amount: number
  ) {
    return await TransactionService.createTransaction({
      txHash,
      type: 'WITHDRAW',
      amount
    });
  }

  /**
   * Track a referral reward transaction
   */
  static async trackReferralReward(
    txHash: string,
    walletAddress: string,
    amount: number
  ) {
    return await TransactionService.createTransaction({
      txHash,
      walletAddress,
      type: 'REFERRAL_REWARD',
      amount
    });
  }

  /**
   * Track a configuration update transaction
   */
  static async trackConfigUpdate(
    txHash: string
  ) {
    return await TransactionService.createTransaction({
      txHash,
      type: 'CONFIG_UPDATE'
    });
  }

  /**
   * Update transaction status after blockchain confirmation
   */
  static async confirmTransaction(
    txHash: string
  ) {
    return await TransactionService.updateTransaction(txHash, {
      status: 'confirmed'
    });
  }

  /**
   * Mark transaction as failed
   */
  static async failTransaction(
    txHash: string,
    errorMessage?: string
  ) {
    return await TransactionService.updateTransaction(txHash, {
      status: 'failed'
    });
  }

  /**
   * Track any custom transaction
   */
  static async trackCustom(data: CreateTransactionDto) {
    return await TransactionService.createTransaction(data);
  }

  /**
   * Batch track multiple transactions
   */
  static async trackBatch(transactions: CreateTransactionDto[]) {
    const results = await Promise.allSettled(
      transactions.map(tx => TransactionService.createTransaction(tx))
    );

    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results
    };
  }
}

/**
 * Example Usage:
 * 
 * // In your stake service
 * import { TransactionTracker } from './transaction-tracker.helper';
 * 
 * // After successful stake
 * await TransactionTracker.trackStake(
 *   txHash,
 *   walletAddress,
 *   amount,
 *   stakeId,
 *   { planName: 'Gold', lockDays: 30 }
 * );
 * 
 * // After blockchain confirmation
 * await TransactionTracker.confirmTransaction(
 *   txHash,
 *   blockNumber,
 *   gasUsed,
 *   gasPrice
 * );
 */
