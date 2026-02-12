import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Import contract ABI
const NilaStakingABI = require('../../artifacts/contracts/NilaStaking.sol/NilaStaking.json').abi;

export class BlockchainService {
  private static provider: ethers.JsonRpcProvider;
  private static wallet: ethers.Wallet;
  private static contract: ethers.Contract;

  static initialize() {
    if (!process.env.BSC_TESTNET_RPC) {
      throw new Error('BSC_TESTNET_RPC not configured');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not configured');
    }
    if (!process.env.CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS not configured');
    }

    this.provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      NilaStakingABI,
      this.wallet
    );
  }

  static getContract() {
    if (!this.contract) {
      this.initialize();
    }
    return this.contract;
  }

  static getProvider() {
    if (!this.provider) {
      this.initialize();
    }
    return this.provider;
  }

  // Amount Config Methods
  static async getAmountConfigCount(): Promise<number> {
    const contract = this.getContract();
    const count = await contract.getAmountConfigCount();
    return Number(count);
  }

  static async getAmountConfig(id: number) {
    const contract = this.getContract();
    const config = await contract.amountConfigs(id);
    return {
      id,
      amount: config.amount.toString(),
      instantRewardBps: Number(config.instantRewardBps),
      active: config.active
    };
  }

  static async getAllAmountConfigs() {
    const count = await this.getAmountConfigCount();
    const configs = [];
    
    for (let i = 0; i < count; i++) {
      const config = await this.getAmountConfig(i);
      configs.push(config);
    }
    
    return configs;
  }

  static async addAmountConfig(amount: string, instantRewardBps: number) {
    const contract = this.getContract();
    const tx = await contract.addAmountConfig(amount, instantRewardBps);
    const receipt = await tx.wait();
    
    // Get the new config ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'AmountConfigAdded';
      } catch {
        return false;
      }
    });
    
    let configId = null;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      configId = Number(parsed?.args[0]);
    }
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      configId
    };
  }

  static async updateAmountConfig(id: number, instantRewardBps: number, active: boolean) {
    const contract = this.getContract();
    const tx = await contract.updateAmountConfig(id, instantRewardBps, active);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  // Lock Config Methods
  static async getLockConfigCount(): Promise<number> {
    const contract = this.getContract();
    const count = await contract.getLockConfigCount();
    return Number(count);
  }

  static async getLockConfig(id: number) {
    const contract = this.getContract();
    const config = await contract.lockConfigs(id);
    
    // Convert lockDuration from seconds to days
    const lockDurationSeconds = Number(config.lockDuration);
    const lockDays = Math.floor(lockDurationSeconds / 86400);
    
    return {
      id,
      lockDuration: lockDays,
      apr: Number(config.apr),
      active: config.active
    };
  }

  static async getAllLockConfigs() {
    const count = await this.getLockConfigCount();
    const configs = [];
    
    for (let i = 0; i < count; i++) {
      const config = await this.getLockConfig(i);
      configs.push(config);
    }
    
    return configs;
  }

  static async addLockConfig(lockDays: number, apr: number) {
    const contract = this.getContract();
    const tx = await contract.addLockConfig(lockDays, apr);
    const receipt = await tx.wait();
    
    // Get the new config ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'LockConfigAdded';
      } catch {
        return false;
      }
    });
    
    let configId = null;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      configId = Number(parsed?.args[0]);
    }
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      configId
    };
  }

  static async updateLockConfig(id: number, apr: number, active: boolean) {
    const contract = this.getContract();
    const tx = await contract.updateLockConfig(id, apr, active);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  // Stats Methods
  static async getStakingStats() {
    const contract = this.getContract();
    
    const [totalStaked, uniqueStakers, availableRewards] = await Promise.all([
      contract.totalStaked(),
      contract.getStakerCount(),
      contract.availableRewards()
    ]);
    
    return {
      totalStaked: totalStaked.toString(),
      uniqueStakers: Number(uniqueStakers),
      availableRewards: availableRewards.toString()
    };
  }

  // Referral Config Methods
  static async getReferralConfig() {
    const contract = this.getContract();
    const config = await contract.getReferralConfig();
    
    return {
      referralPercentage: Number(config.referralPercentageBps) / 100, // Convert BPS to percentage
      referrerPercentage: Number(config.referrerPercentageBps) / 100,
      isPaused: config.isPaused
    };
  }

  static async setReferralConfig(
    referralPercentage: number,
    referrerPercentage: number,
    isPaused: boolean
  ) {
    const contract = this.getContract();
    
    // Convert percentage to basis points
    const referralBps = Math.floor(referralPercentage * 100);
    const referrerBps = Math.floor(referrerPercentage * 100);
    
    const tx = await contract.setReferralConfig(referralBps, referrerBps, isPaused);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async setReferralPercentage(percentage: number) {
    const contract = this.getContract();
    const bps = Math.floor(percentage * 100);
    
    const tx = await contract.setReferralPercentage(bps);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async setReferrerPercentage(percentage: number) {
    const contract = this.getContract();
    const bps = Math.floor(percentage * 100);
    
    const tx = await contract.setReferrerPercentage(bps);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async pauseReferrals() {
    const contract = this.getContract();
    const tx = await contract.pauseReferrals();
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async unpauseReferrals() {
    const contract = this.getContract();
    const tx = await contract.unpauseReferrals();
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async getReferralStats(walletAddress: string) {
    const contract = this.getContract();
    const stats = await contract.getReferralStats(walletAddress);
    
    return {
      referrer: stats.referrer,
      referralsMade: Number(stats.referralsMade),
      totalEarnings: stats.totalEarnings.toString()
    };
  }
}
