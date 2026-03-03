import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';

const prisma = new (require('@prisma/client').PrismaClient)();

/**
 * Lightweight blockchain query service for on-demand data fetching
 * No historical scanning - just current state queries
 */
export class BlockchainQueryService {

  /**
   * Get current active stakes directly from blockchain (no event scanning)
   */
  static async getCurrentStakes(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    try {
      const contract = BlockchainService.getContract();
      
      // Query current stakes from contract state
      const stakeCount = await contract.getUserStakeCount(normalizedAddress);
      const stakes = [];

      // Fetch each stake details
      for (let i = 0; i < Number(stakeCount); i++) {
        const details = await contract.getStakeDetails(normalizedAddress, i);
        
        stakes.push({
          stakeId: i,
          amount: ethers.formatEther(details.amount),
          apr: Number(details.apr),
          startTime: new Date(Number(details.startTime) * 1000),
          endTime: new Date(Number(details.endTime) * 1000),
          isActive: !details.unstaked,
          unstaked: details.unstaked
        });
      }

      return stakes;
    } catch (error: any) {
      console.error(`Error fetching stakes for ${normalizedAddress}:`, error.message);
      return [];
    }
  }

  /**
   * Get current claimable rewards (single contract call)
   */
  static async getClaimableRewards(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    try {
      const result = await BlockchainService.getClaimableRewards(normalizedAddress);
      return {
        instantRewards: parseFloat(ethers.formatEther(result.instantRewards)),
        referralRewards: parseFloat(ethers.formatEther(result.referralRewards)),
        totalClaimable: parseFloat(ethers.formatEther(result.totalClaimable))
      };
    } catch (error: any) {
      console.error(`Error fetching rewards for ${normalizedAddress}:`, error.message);
      return {
        instantRewards: 0,
        referralRewards: 0,
        totalClaimable: 0
      };
    }
  }

  /**
   * Get referral stats (single contract call)
   */
  static async getReferralStats(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    try {
      const stats = await BlockchainService.getReferralStats(normalizedAddress);
      return {
        referralsMade: Number(stats.referralsMade),
        totalEarnings: parseFloat(ethers.formatEther(stats.totalEarnings))
      };
    } catch (error: any) {
      console.error(`Error fetching referral stats for ${normalizedAddress}:`, error.message);
      return {
        referralsMade: 0,
        totalEarnings: 0
      };
    }
  }

  /**
   * Sync database with current blockchain state (lightweight)
   * Only updates what's different, no historical scanning
   */
  static async syncCurrentState(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    try {
      console.log(`[Sync] Fetching current state for ${normalizedAddress}`);
      
      // Get current stakes from blockchain
      const blockchainStakes = await this.getCurrentStakes(normalizedAddress);
      
      // Get database stakes
      const dbStakes = await prisma.stake.findMany({
        where: { 
          user: { walletAddress: normalizedAddress },
          status: 'active'
        }
      });

      // Mark stakes as completed if they're no longer active on-chain
      for (const dbStake of dbStakes) {
        const existsOnChain = blockchainStakes.some(
          bs => bs.stakeId === dbStake.stakeId && bs.isActive
        );
        
        if (!existsOnChain) {
          await prisma.stake.update({
            where: { id: dbStake.id },
            data: { status: 'completed' }
          });
          console.log(`[Sync] Marked stake ${dbStake.stakeId} as completed`);
        }
      }

      console.log(`✅ [Sync] Current state synced for ${normalizedAddress}`);
      
      return {
        activeStakes: blockchainStakes.filter(s => s.isActive).length,
        synced: true
      };
    } catch (error: any) {
      console.error(`[Sync Error] ${normalizedAddress}:`, error.message);
      throw error;
    }
  }
}
