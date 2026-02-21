import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Import contract ABI (using upgradeable version)
const NilaStakingABI = require('../../artifacts/contracts/NilaStakingUpgradeable.sol/NilaStakingUpgradeable.json').abi;

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

  // Treasury Management Methods
  static async getTreasuryStats() {
    const contract = this.getContract();
    const provider = this.getProvider();
    
    const [totalStaked, availableRewards] = await Promise.all([
      contract.totalStaked(),
      contract.availableRewards()
    ]);
    
    // Get contract balance
    const nilaTokenAddress = await contract.nila();
    const nilaToken = new ethers.Contract(
      nilaTokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const contractBalance = await nilaToken.balanceOf(process.env.CONTRACT_ADDRESS);
    
    return {
      contractBalance: contractBalance.toString(),
      totalStaked: totalStaked.toString(),
      availableRewards: availableRewards.toString()
    };
  }

  static async depositRewards(amount: string) {
    const contract = this.getContract();
    const wallet = this.wallet;
    
    // Get NILA token contract
    const nilaTokenAddress = await contract.nila();
    const nilaToken = new ethers.Contract(
      nilaTokenAddress,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address) view returns (uint256)'
      ],
      wallet
    );
    
    // Check admin balance
    const adminBalance = await nilaToken.balanceOf(wallet.address);
    if (adminBalance < BigInt(amount)) {
      throw new Error('Insufficient admin balance');
    }
    
    // Transfer tokens to contract
    const transferTx = await nilaToken.transfer(process.env.CONTRACT_ADDRESS, amount);
    const receipt = await transferTx.wait();
    
    // Notify contract of deposit
    try {
      const notifyTx = await contract.notifyRewardDeposit(amount);
      await notifyTx.wait();
    } catch (error) {
      console.warn('Notify deposit failed (non-critical):', error);
    }
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async withdrawRewards(amount: string) {
    const contract = this.getContract();
    
    // Check if contract is paused
    const isPaused = await contract.paused();
    if (!isPaused) {
      throw new Error('Contract must be paused to withdraw rewards');
    }
    
    const tx = await contract.withdrawExcessRewards(amount);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async getUserPendingRewards(walletAddress: string) {
    const contract = this.getContract();
    
    try {
      const stakeCount = await contract.getUserStakeCount(walletAddress);
      const count = Number(stakeCount);
      
      let totalPending = BigInt(0);
      const breakdown = [];
      
      for (let i = 0; i < count; i++) {
        const [pending, details] = await Promise.all([
          contract.pendingReward(walletAddress, i),
          contract.getStakeDetails(walletAddress, i)
        ]);
        
        if (!details.unstaked) {
          totalPending += pending;
          breakdown.push({
            stakeId: i,
            amount: details.amount.toString(),
            pendingReward: pending.toString(),
            apr: Number(details.apr)
          });
        }
      }
      
      return {
        totalPendingRewards: totalPending.toString(),
        activeStakes: breakdown.length,
        breakdown
      };
    } catch (error: any) {
      throw new Error(`Failed to get user pending rewards: ${error.message}`);
    }
  }

  static async pauseContract() {
    const contract = this.getContract();
    const tx = await contract.pause();
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async unpauseContract() {
    const contract = this.getContract();
    const tx = await contract.unpause();
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  static async isContractPaused(): Promise<boolean> {
    const contract = this.getContract();
    return await contract.paused();
  }

  // Transfer rewards from treasury to user wallet
  static async transferRewards(toAddress: string, amount: number) {
    const contract = this.getContract();
    
    // Convert amount to wei (18 decimals)
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    
    // Get NILA token contract
    const nilaTokenAddress = await contract.nila();
    const nilaToken = new ethers.Contract(
      nilaTokenAddress,
      [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address) view returns (uint256)'
      ],
      this.wallet
    );
    
    // Check contract balance
    const contractBalance = await nilaToken.balanceOf(process.env.CONTRACT_ADDRESS);
    if (contractBalance < amountWei) {
      throw new Error('Insufficient contract balance for reward transfer');
    }
    
    // Transfer tokens from contract to user
    // Note: This uses the admin wallet to transfer from contract
    // In production, you might want to use the contract's claim functions instead
    const tx = await nilaToken.transfer(toAddress, amountWei);
    const receipt = await tx.wait();
    
    return receipt.hash;
  }

  // Get claimable rewards from contract
  static async getClaimableRewards(walletAddress: string) {
    const contract = this.getContract();
    
    try {
      const rewards = await contract.getClaimableRewards(walletAddress);
      
      return {
        instantRewards: rewards.instantRewards.toString(),
        referralRewards: rewards.referralRewards.toString(),
        totalClaimable: rewards.totalClaimable.toString()
      };
    } catch (error: any) {
      throw new Error(`Failed to get claimable rewards: ${error.message}`);
    }
  }

  // Claim instant rewards via contract
  static async claimInstantRewards(walletAddress: string) {
    const contract = this.getContract();
    
    try {
      const tx = await contract.claimInstantRewards();
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error: any) {
      throw new Error(`Failed to claim instant rewards: ${error.message}`);
    }
  }

  // Claim referral rewards via contract
  static async claimReferralRewards(walletAddress: string) {
    const contract = this.getContract();
    
    try {
      const tx = await contract.claimReferralRewards();
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error: any) {
      throw new Error(`Failed to claim referral rewards: ${error.message}`);
    }
  }

  // Claim all rewards via contract
  static async claimAllRewards(walletAddress: string) {
    const contract = this.getContract();
    
    try {
      const tx = await contract.claimAllRewards();
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error: any) {
      throw new Error(`Failed to claim all rewards: ${error.message}`);
    }
  }

  // Admin Create Stake (without token transfer)
  static async adminCreateStake(
    userAddress: string,
    amount: string,
    lockDays: number,
    apr: number,
    instantRewardBps: number
  ) {
    const contract = this.getContract();
    
    try {
      const tx = await contract.adminCreateStake(
        userAddress,
        amount,
        lockDays,
        apr,
        instantRewardBps
      );
      const receipt = await tx.wait();
      
      // Get stake ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'Staked';
        } catch {
          return false;
        }
      });
      
      let stakeId = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        stakeId = Number(parsed?.args[1]); // stakeId is second argument
      }
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        stakeId
      };
    } catch (error: any) {
      throw new Error(`Failed to create admin stake: ${error.message}`);
    }
  }

  // Calculate total liabilities (manual stakes not backed by tokens)
  static async calculateLiabilities() {
    const contract = this.getContract();
    
    try {
      // Get contract balance and total staked
      const [contractBalance, totalStaked, availableRewards] = await Promise.all([
        this.getTreasuryStats().then(stats => BigInt(stats.contractBalance)),
        contract.totalStaked(),
        contract.availableRewards()
      ]);
      
      // Liabilities = tokens we owe but don't have
      // This is an approximation - in reality we'd track manual stakes separately
      const liabilities = totalStaked > contractBalance ? totalStaked - contractBalance : BigInt(0);
      
      return {
        totalLiabilities: liabilities.toString(),
        contractBalance: contractBalance.toString(),
        totalStaked: totalStaked.toString(),
        availableRewards: availableRewards.toString()
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate liabilities: ${error.message}`);
    }
  }
}
