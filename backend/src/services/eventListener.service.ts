import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';
import { StakeService } from './stake.service';
import { RewardService } from './reward.service';
import { ReferralService } from './referral.service';
import { UserService } from './user.service';

const prisma = new (require('@prisma/client').PrismaClient)();

/**
 * Event-Driven Sync Architecture
 * 
 * This service listens to real-time blockchain events and updates the database automatically.
 * No historical scanning or polling needed - events are processed as they happen.
 * 
 * Benefits:
 * - No RPC rate limits from scanning blocks
 * - Instant updates when transactions occur
 * - Minimal blockchain queries
 * - Scales efficiently
 * 
 * Events handled:
 * - Staked: Creates stake records when users stake
 * - RewardClaimed: Records reward claims
 * - ReferralRewardPaid: Tracks referral earnings
 * - Unstaked: Marks stakes as completed
 * - Config updates: Syncs staking/referral configurations
 */

export class EventListenerService {
  private static isListening = false;
  private static listeners: any[] = [];

  static async startListening() {
    if (this.isListening) {
      console.log('Event listeners already running');
      return;
    }

    try {
      const contract = BlockchainService.getContract();
      const provider = BlockchainService.getProvider();

      console.log('Starting blockchain event listeners...');

      const stakedListener = contract.on('Staked', async (user, stakeId, amount, lockId, event) => {
        try {
          console.log(`[Event] Staked: user=${user}, stakeId=${stakeId}, amount=${amount}`);
          await this.handleStakedEvent(user, stakeId, amount, lockId, event);
        } catch (error: any) {
          console.error('[Event Error] Staked:', error.message);
        }
      });

      const rewardClaimedListener = contract.on('RewardClaimed', async (user, stakeId, reward, event) => {
        try {
          console.log(`[Event] RewardClaimed: user=${user}, stakeId=${stakeId}, reward=${reward}`);
          await this.handleRewardClaimedEvent(user, stakeId, reward, event);
        } catch (error: any) {
          console.error('[Event Error] RewardClaimed:', error.message);
        }
      });

      const referralRewardListener = contract.on('ReferralRewardPaid', async (referrer, referred, amount, event) => {
        try {
          console.log(`[Event] ReferralRewardPaid: referrer=${referrer}, referred=${referred}, amount=${amount}`);
          await this.handleReferralRewardEvent(referrer, referred, amount, event);
        } catch (error: any) {
          console.error('[Event Error] ReferralRewardPaid:', error.message);
        }
      });

      const unstakedListener = contract.on('Unstaked', async (user, stakeId, amount, event) => {
        try {
          console.log(`[Event] Unstaked: user=${user}, stakeId=${stakeId}, amount=${amount}`);
          await this.handleUnstakedEvent(user, stakeId, amount, event);
        } catch (error: any) {
          console.error('[Event Error] Unstaked:', error.message);
        }
      });

      const amountConfigAddedListener = contract.on('AmountConfigAdded', async (id, amount, instantRewardBps, event) => {
        try {
          console.log(`[Event] AmountConfigAdded: id=${id}`);
        } catch (error: any) {
          console.error('[Event Error] AmountConfigAdded:', error.message);
        }
      });

      const lockConfigAddedListener = contract.on('LockConfigAdded', async (id, lockDays, apr, event) => {
        try {
          console.log(`[Event] LockConfigAdded: id=${id}`);
        } catch (error: any) {
          console.error('[Event Error] LockConfigAdded:', error.message);
        }
      });

      const referralConfigUpdatedListener = contract.on('ReferralConfigUpdated', async (referralPercentage, referrerPercentage, event) => {
        try {
          console.log(`[Event] ReferralConfigUpdated`);
          await ReferralService.syncWithBlockchain();
        } catch (error: any) {
          console.error('[Event Error] ReferralConfigUpdated:', error.message);
        }
      });

      this.listeners = [
        stakedListener,
        rewardClaimedListener,
        referralRewardListener,
        unstakedListener,
        amountConfigAddedListener,
        lockConfigAddedListener,
        referralConfigUpdatedListener
      ];

      this.isListening = true;
      console.log('✅ Event listeners started successfully');

    } catch (error: any) {
      console.error('Failed to start event listeners:', error.message);
      throw error;
    }
  }

  static async stopListening() {
    if (!this.isListening) {
      return;
    }

    try {
      const contract = BlockchainService.getContract();
      contract.removeAllListeners();
      this.listeners = [];
      this.isListening = false;
      console.log('Event listeners stopped');
    } catch (error: any) {
      console.error('Error stopping listeners:', error.message);
    }
  }

  private static async handleStakedEvent(
    userAddress: string,
    stakeId: bigint,
    amount: bigint,
    lockId: bigint,
    event: any
  ) {
    const normalizedAddress = userAddress.toLowerCase();
    const txHash = event.log.transactionHash;

    const existingStake = await prisma.stake.findFirst({
      where: { txHash }
    });

    if (existingStake) {
      console.log(`Stake already exists for txHash: ${txHash}`);
      return;
    }

    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      user = await UserService.connectWallet(normalizedAddress);
    }

    const lockConfig = await BlockchainService.getLockConfig(Number(lockId));
    const amountInEther = parseFloat(ethers.formatEther(amount));
    const lockDays = Number(lockConfig.lockDuration);

    await StakeService.createStake({
      walletAddress: normalizedAddress,
      planName: `${lockDays} Days Lock`,
      planVersion: 1,
      amount: amountInEther,
      apy: lockConfig.apr,
      lockDays: lockDays,
      txHash
    });

    console.log(`✅ Stake created for ${normalizedAddress}: ${amountInEther} NILA`);
  }

  private static async handleRewardClaimedEvent(
    userAddress: string,
    stakeId: bigint,
    reward: bigint,
    event: any
  ) {
    const normalizedAddress = userAddress.toLowerCase();
    const txHash = event.log.transactionHash;
    const rewardAmount = parseFloat(ethers.formatEther(reward));

    // Record as APY reward claim (using ALL type with instantAmount)
    await RewardService.recordClaim({
      walletAddress: normalizedAddress,
      type: 'ALL',
      instantAmount: rewardAmount,
      txHash
    });

    console.log(`✅ Reward claimed for ${normalizedAddress}: ${rewardAmount} NILA`);
  }

  private static async handleReferralRewardEvent(
    referrerAddress: string,
    referredAddress: string,
    amount: bigint,
    event: any
  ) {
    const normalizedReferrer = referrerAddress.toLowerCase();
    const normalizedReferred = referredAddress.toLowerCase();
    const txHash = event.log.transactionHash;
    const rewardAmount = parseFloat(ethers.formatEther(amount));

    await RewardService.recordClaim({
      walletAddress: normalizedReferrer,
      type: 'REFERRAL_REWARD',
      referralAmount: rewardAmount,
      txHash
    });

    console.log(`✅ Referral reward paid to ${normalizedReferrer}: ${rewardAmount} NILA`);
  }

  private static async handleUnstakedEvent(
    userAddress: string,
    stakeId: bigint,
    amount: bigint,
    event: any
  ) {
    const normalizedAddress = userAddress.toLowerCase();
    const txHash = event.log.transactionHash;

    const stake = await prisma.stake.findFirst({
      where: {
        user: { walletAddress: normalizedAddress },
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (stake) {
      await prisma.stake.update({
        where: { id: stake.id },
        data: { status: 'completed' }
      });
      console.log(`✅ Stake completed for ${normalizedAddress}`);
    }
  }
}
