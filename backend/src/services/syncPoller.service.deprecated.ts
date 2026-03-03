import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';
import { StakeService } from './stake.service';
import { RewardService } from './reward.service';
import { ReferralService } from './referral.service';
import { UserService } from './user.service';

const prisma = new (require('@prisma/client').PrismaClient)();

const BLOCK_CHUNK_SIZE = 100; // Smaller chunks to avoid rate limits
const DELAY_BETWEEN_CHUNKS = 1000; // 1 second delay between chunks
const DELAY_BETWEEN_QUERIES = 500; // 500ms delay between different query types
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // Start with 2 seconds

async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await queryFn();
  } catch (error: any) {
    const isRateLimit = error.code === 'BAD_DATA' || 
                        error.code === 'UNKNOWN_ERROR' ||
                        (error.error && error.error.code === -32005);
    
    if (isRateLimit && retries > 0) {
      console.log(`⏳ Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return queryWithRetry(queryFn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

export class SyncPollerService {

  static async syncUserData(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();

    try {
      console.log(`[User Sync] Syncing data for ${normalizedAddress}`);

      const provider = BlockchainService.getProvider();
      const currentBlock = await provider.getBlockNumber();

      let user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (!user) {
        user = await UserService.connectWallet(normalizedAddress);
      }

      const fromBlock = user.lastSyncedBlock || currentBlock - 10000;

      await prisma.user.update({
        where: { walletAddress: normalizedAddress },
        data: { syncStatus: 'SYNCING' }
      });

      const contract = BlockchainService.getContract();

      // Process in chunks to avoid rate limits
      const totalBlocks = currentBlock - fromBlock;
      console.log(`[User Sync] Processing ${totalBlocks} blocks in chunks of ${BLOCK_CHUNK_SIZE}`);

      for (let start = fromBlock; start <= currentBlock; start += BLOCK_CHUNK_SIZE) {
        const end = Math.min(start + BLOCK_CHUNK_SIZE - 1, currentBlock);
        
        const stakedFilter = contract.filters.Staked(normalizedAddress);
        const stakedEvents = await queryWithRetry(() => 
          contract.queryFilter(stakedFilter, start, end)
        );

        for (const event of stakedEvents) {
          const args = event.args;
          if (!args) continue;

          const amount = args[2];
          const lockId = args[3];
          const txHash = event.transactionHash;

          const existingStake = await prisma.stake.findFirst({
            where: { txHash }
          });

          if (existingStake) continue;

          const lockConfig = await BlockchainService.getLockConfig(Number(lockId));
          const amountInEther = ethers.formatEther(amount);
          const lockDays = Number(lockConfig.lockDays);
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + lockDays * 24 * 60 * 60 * 1000);

          await StakeService.createStake({
            walletAddress: normalizedAddress,
            planName: `${lockDays} Days Lock`,
            planVersion: 1,
            amount: amountInEther,
            apy: lockConfig.apr.toString(),
            startDate,
            endDate,
            txHash
          });
        }

        // Delay between event types
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_QUERIES));

        const rewardFilter = contract.filters.RewardClaimed(normalizedAddress);
        const rewardEvents = await queryWithRetry(() =>
          contract.queryFilter(rewardFilter, start, end)
        );

        for (const event of rewardEvents) {
          const args = event.args;
          if (!args) continue;

          const reward = args[2];
          const txHash = event.transactionHash;

          const existing = await prisma.transaction.findUnique({
            where: { txHash }
          });

          if (existing) continue;

          const rewardAmount = ethers.formatEther(reward);

          await RewardService.recordClaim({
            walletAddress: normalizedAddress,
            type: 'APY_REWARD',
            amount: rewardAmount,
            txHash
          });
        }

        // Delay between chunks
        if (end < currentBlock) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
        }
      }

      await prisma.user.update({
        where: { walletAddress: normalizedAddress },
        data: {
          lastSyncedBlock: currentBlock,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED'
        }
      });

      console.log(`✅ [User Sync] Completed for ${normalizedAddress}`);

    } catch (error: any) {
      await prisma.user.update({
        where: { walletAddress: normalizedAddress },
        data: { syncStatus: 'ERROR' }
      });
      console.error(`[User Sync Error] ${normalizedAddress}:`, error.message);
      throw error;
    }
  }
}
