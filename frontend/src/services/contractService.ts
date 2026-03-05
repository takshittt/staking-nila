import { BrowserProvider, Contract, parseUnits } from 'ethers';

// Contract addresses - these should match your deployed contracts
const STAKING_CONTRACT_ADDRESS = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || '0x06a38fb94a1A35dCE9A5f2e6a640B9c559F34333';
const NILA_TOKEN_ADDRESS = import.meta.env.VITE_NILA_TOKEN_ADDRESS || '0xA31fb7667F80306690F5DF0d9A6ea272aBF97926';
const USDT_TOKEN_ADDRESS = '0xef4f8bdeDad6829817F802a957b8a5232644e1bC'; // BSC Testnet USDT

// Price constant
const NILA_PRICE_USDT = 0.08; // 1 NILA = 0.08 USDT

// BSC Testnet Chain ID
const BSC_TESTNET_CHAIN_ID = '0x61'; // 97 in decimal
const BSC_TESTNET_PARAMS = {
  chainId: BSC_TESTNET_CHAIN_ID,
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/']
};

// Minimal ABI for the functions we need
const STAKING_ABI = [
  // Staking functions
  'function stake(uint256 amount, uint256 lockId)',
  'function stakeWithReferral(uint256 amount, uint256 lockId, address referrer)',
  'function stakeWithAmountConfig(uint256 amountId, uint256 lockId)',
  'function stakeWithAmountConfigAndReferral(uint256 amountId, uint256 lockId, address referrer)',
  // USDT staking functions
  'function buyAndStakeWithUSDT(uint256 usdtAmount, uint256 lockId)',
  'function buyAndStakeWithUSDTAndReferral(uint256 usdtAmount, uint256 lockId, address referrer)',
  // Unstaking functions
  'function unstake(uint256 index)',
  // Claiming functions
  'function claimInstantRewards()',
  'function claimReferralRewards()',
  'function claimAllRewards()',
  'function claimAllAPYRewards()',
  'function claimInstantRewardsUSDT()',
  'function claimReferralRewardsUSDT()',
  'function claimAllUSDTRewards()',
  // View functions
  'function getClaimableRewards(address user) view returns (uint256 instantRewards, uint256 referralRewards, uint256 totalClaimable)',
  'function getClaimableRewardsDetailed(address user) view returns (uint256 instantRewardsNILA, uint256 referralRewardsNILA, uint256 instantRewardsUSDT, uint256 referralRewardsUSDT, uint256 apyRewardsNILA)',
  'function getReferralConfig() view returns (uint256 referralPercentageBps, uint256 referrerPercentageBps, bool isPaused)',
  'function getUserStakes(address user) view returns (tuple(uint256 amount, uint256 usdtPaid, uint256 startTime, uint256 lastClaimTime, uint256 unlockTime, uint256 aprSnapshot, uint256 instantRewardSnapshot, bool unstaked, bool isUsdtStake)[])',
  'function getNILALiabilityStatus() view returns (uint256 totalLiabilities, uint256 nilaBalance, uint256 deficitOrSurplus, bool hasSurplus)',
  'function getUSDTBalance() view returns (uint256)',
  'function pendingReward(address user, uint256 index) view returns (uint256)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

export interface StakeParams {
  amount: string; // Amount in NILA tokens (will be converted to wei)
  lockConfigId: number;
  referrerAddress?: string;
}

export interface BuyAndStakeParams {
  amountConfigId: number;
  lockConfigId: number;
  referrerAddress?: string;
}

export interface BuyAndStakeWithUSDTParams {
  usdtAmount: string; // Amount in USDT (will be converted to wei)
  lockConfigId: number;
  referrerAddress?: string;
}

export class ContractService {
  // Check if user is on BSC Testnet
  static async checkNetwork(): Promise<boolean> {
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId === BSC_TESTNET_CHAIN_ID;
    } catch (error) {
      return false;
    }
  }

  // Switch to BSC Testnet
  static async switchToBscTestnet(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    try {
      // Try to switch to BSC Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET_PARAMS],
          });
        } catch (addError) {
          throw new Error('Failed to add BSC Testnet to wallet');
        }
      } else {
        throw new Error('Failed to switch to BSC Testnet');
      }
    }
  }

  // Ensure user is on correct network before proceeding
  static async ensureCorrectNetwork(): Promise<void> {
    const isCorrectNetwork = await this.checkNetwork();
    if (!isCorrectNetwork) {
      await this.switchToBscTestnet();
      // Wait a bit for network switch to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  static async getProvider() {
    if (!window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
    }
    return new BrowserProvider(window.ethereum as any);
  }

  static async getSigner() {
    const provider = await this.getProvider();
    return await provider.getSigner();
  }

  static async getStakingContract() {
    const signer = await this.getSigner();
    return new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);
  }

  static async getTokenContract() {
    const signer = await this.getSigner();
    return new Contract(NILA_TOKEN_ADDRESS, ERC20_ABI, signer);
  }

  static async getUSDTContract() {
    const signer = await this.getSigner();
    return new Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, signer);
  }

  // Check if user has approved the staking contract to spend their tokens
  static async checkAllowance(userAddress: string, amount: string): Promise<boolean> {
    try {
      const tokenContract = await this.getTokenContract();
      const allowance = await tokenContract.allowance(userAddress, STAKING_CONTRACT_ADDRESS);
      const requiredAmount = parseUnits(amount, 18);
      return allowance >= requiredAmount;
    } catch (error) {
      return false;
    }
  }

  // Approve the staking contract to spend tokens
  static async approveToken(amount: string): Promise<string> {
    try {
      const tokenContract = await this.getTokenContract();
      const amountWei = parseUnits(amount, 18);

      const tx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);

      await tx.wait();

      return tx.hash;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve token');
    }
  }

  // Check user's NILA token balance
  static async getTokenBalance(userAddress: string): Promise<string> {
    try {
      const tokenContract = await this.getTokenContract();
      const balance = await tokenContract.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      return '0';
    }
  }

  // Check user's USDT token balance
  static async getUSDTBalance(userAddress: string): Promise<string> {
    try {
      const usdtContract = await this.getUSDTContract();
      const balance = await usdtContract.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      return '0';
    }
  }

  // Check if user has approved the staking contract to spend their USDT
  static async checkUSDTAllowance(userAddress: string, amount: string): Promise<boolean> {
    try {
      const usdtContract = await this.getUSDTContract();
      const allowance = await usdtContract.allowance(userAddress, STAKING_CONTRACT_ADDRESS);
      const requiredAmount = parseUnits(amount, 18);
      return allowance >= requiredAmount;
    } catch (error) {
      return false;
    }
  }

  // Approve the staking contract to spend USDT
  static async approveUSDT(amount: string): Promise<string> {
    try {
      const usdtContract = await this.getUSDTContract();
      const amountWei = parseUnits(amount, 18);

      const tx = await usdtContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);

      await tx.wait();

      return tx.hash;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve USDT');
    }
  }

  // Stake tokens with flexible amount (direct staking - no instant rewards)
  static async stake(params: StakeParams): Promise<{ txHash: string; stakeIndex: number | null }> {
    try {
      const stakingContract = await this.getStakingContract();
      const amountWei = parseUnits(params.amount, 18);

      console.log('Staking with params:', {
        amount: params.amount,
        amountWei: amountWei.toString(),
        lockConfigId: params.lockConfigId,
        referrerAddress: params.referrerAddress
      });

      let tx;
      if (params.referrerAddress) {
        // Stake with referral
        console.log('Calling stakeWithReferral...');
        tx = await stakingContract.stakeWithReferral(
          amountWei,
          params.lockConfigId,
          params.referrerAddress
        );
      } else {
        // Regular stake
        console.log('Calling stake...');
        tx = await stakingContract.stake(
          amountWei,
          params.lockConfigId
        );
      }

      console.log('Transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Extract stake index from Staked event
      let stakeIndex: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingContract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          if (parsed && parsed.name === 'Staked') {
            stakeIndex = Number(parsed.args[1]); // stakeId is second argument
            console.log('Extracted stake index from event:', stakeIndex);
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      return { txHash: tx.hash, stakeIndex };
    } catch (error: any) {
      console.error('Stake error:', error);

      // Parse common errors
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for transaction');
      } else if (error.message?.includes('insufficient allowance')) {
        throw new Error('Insufficient token allowance. Please try approving again.');
      } else if (error.message?.includes('Amount below minimum')) {
        throw new Error('Amount must be at least 100 NILA');
      } else if (error.message?.includes('Invalid lock config') || error.message?.includes('Invalid lockId')) {
        throw new Error('Invalid lock duration selected');
      } else if (error.message?.includes('Invalid amountId')) {
        throw new Error('Invalid staking configuration. Please contact support.');
      }

      throw new Error(error.message || 'Failed to stake tokens');
    }
  }

  // Stake tokens with amount config (Buy & Stake - includes instant rewards)
  static async stakeWithAmountConfig(params: BuyAndStakeParams): Promise<{ txHash: string; stakeIndex: number | null }> {
    try {
      const stakingContract = await this.getStakingContract();

      let tx;
      if (params.referrerAddress) {
        // Stake with referral
        tx = await stakingContract.stakeWithAmountConfigAndReferral(
          params.amountConfigId,
          params.lockConfigId,
          params.referrerAddress
        );
      } else {
        // Regular stake
        tx = await stakingContract.stakeWithAmountConfig(
          params.amountConfigId,
          params.lockConfigId
        );
      }

      // Wait for confirmation
      const receipt = await tx.wait();

      // Extract stake index from Staked event
      let stakeIndex: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingContract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          if (parsed && parsed.name === 'Staked') {
            stakeIndex = Number(parsed.args[1]); // stakeId is second argument
            console.log('Extracted stake index from event:', stakeIndex);
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      return { txHash: tx.hash, stakeIndex };
    } catch (error: any) {

      // Parse common errors
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for transaction');
      } else if (error.message?.includes('Invalid amount config')) {
        throw new Error('Invalid staking package selected');
      } else if (error.message?.includes('Invalid lock config')) {
        throw new Error('Invalid lock duration selected');
      }

      throw new Error(error.message || 'Failed to stake tokens');
    }
  }

  // Buy NILA with USDT and stake (with instant rewards in USDT)
  static async buyAndStakeWithUSDT(params: BuyAndStakeWithUSDTParams): Promise<{ txHash: string; stakeIndex: number | null }> {
    try {
      const stakingContract = await this.getStakingContract();
      const usdtAmountWei = parseUnits(params.usdtAmount, 18);

      console.log('Buying and staking with USDT:', {
        usdtAmount: params.usdtAmount,
        usdtAmountWei: usdtAmountWei.toString(),
        nilaEquivalent: (parseFloat(params.usdtAmount) / NILA_PRICE_USDT).toFixed(2),
        lockConfigId: params.lockConfigId,
        referrerAddress: params.referrerAddress
      });

      let tx;
      if (params.referrerAddress) {
        // Buy and stake with referral
        console.log('Calling buyAndStakeWithUSDTAndReferral...');
        tx = await stakingContract.buyAndStakeWithUSDTAndReferral(
          usdtAmountWei,
          params.lockConfigId,
          params.referrerAddress
        );
      } else {
        // Regular buy and stake
        console.log('Calling buyAndStakeWithUSDT...');
        tx = await stakingContract.buyAndStakeWithUSDT(
          usdtAmountWei,
          params.lockConfigId
        );
      }

      console.log('Transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Extract stake index from Staked event
      let stakeIndex: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = stakingContract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          if (parsed && parsed.name === 'Staked') {
            stakeIndex = Number(parsed.args[1]); // stakeId is second argument
            console.log('Extracted stake index from event:', stakeIndex);
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      return { txHash: tx.hash, stakeIndex };
    } catch (error: any) {
      console.error('Buy and stake error:', error);

      // Parse common errors
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient USDT balance for transaction');
      } else if (error.message?.includes('insufficient allowance')) {
        throw new Error('Insufficient USDT allowance. Please try approving again.');
      } else if (error.message?.includes('Minimum 10 USDT required')) {
        throw new Error('Minimum purchase amount is 10 USDT');
      } else if (error.message?.includes('Invalid lock config') || error.message?.includes('Invalid lockId')) {
        throw new Error('Invalid lock duration selected');
      }

      throw new Error(error.message || 'Failed to buy and stake with USDT');
    }
  }

  // Get claimable rewards from contract
  static async getClaimableRewards(userAddress: string): Promise<{
    instantRewards: string;
    referralRewards: string;
    totalClaimable: string;
  }> {
    try {
      const stakingContract = await this.getStakingContract();
      const rewards = await stakingContract.getClaimableRewards(userAddress);

      return {
        instantRewards: rewards.instantRewards.toString(),
        referralRewards: rewards.referralRewards.toString(),
        totalClaimable: rewards.totalClaimable.toString()
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get claimable rewards');
    }
  }

  // Claim instant cashback rewards
  static async claimInstantRewards(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimInstantRewards();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {

      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No instant rewards to claim')) {
        throw new Error('No instant rewards available to claim');
      } else if (error.message?.includes('Insufficient reward pool')) {
        throw new Error('Something went wrong. The reward pool is temporarily insufficient. Please wait a moment and try again, or contact support if the issue persists.');
      }

      throw new Error(error.message || 'Failed to claim instant rewards');
    }
  }

  // Claim referral rewards
  static async claimReferralRewards(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimReferralRewards();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {

      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No referral rewards to claim')) {
        throw new Error('No referral rewards available to claim');
      } else if (error.message?.includes('Insufficient reward pool')) {
        throw new Error('Something went wrong. The reward pool is temporarily insufficient. Please wait a moment and try again, or contact support if the issue persists.');
      }

      throw new Error(error.message || 'Failed to claim referral rewards');
    }
  }

  // Claim all rewards (instant + referral)
  static async claimAllRewards(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimAllRewards();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {

      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No rewards to claim')) {
        throw new Error('No rewards available to claim');
      } else if (error.message?.includes('Insufficient reward pool')) {
        throw new Error('Something went wrong. The reward pool is temporarily insufficient. Please wait a moment and try again, or contact support if the issue persists.');
      }

      throw new Error(error.message || 'Failed to claim all rewards');
    }
  }

  // Claim all APY rewards
  static async claimAPYRewards(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimAllAPYRewards();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {

      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No APY rewards to claim')) {
        throw new Error('No APY rewards available to claim');
      } else if (error.message?.includes('Insufficient reward pool')) {
        throw new Error('Something went wrong. The reward pool is temporarily insufficient. Please wait a moment and try again, or contact support if the issue persists.');
      }

      throw new Error(error.message || 'Failed to claim APY rewards');
    }
  }

  // Unstake tokens (automatically claims pending APY rewards)
  static async unstake(stakeIndex: number): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.unstake(stakeIndex);

      await tx.wait();

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('Already unstaked')) {
        throw new Error('This stake has already been unstaked');
      } else if (error.message?.includes('Lock active')) {
        throw new Error('Cannot unstake yet. The lock period is still active.');
      } else if (error.message?.includes('Insufficient reward pool')) {
        throw new Error('Insufficient reward pool to pay out your rewards. Please contact support.');
      }

      throw new Error(error.message || 'Failed to unstake');
    }
  }

  // Get referral configuration
  static async getReferralConfig(): Promise<{
    referralPercent: number;
    referrerPercent: number;
    isPaused: boolean;
  }> {
    try {
      // Use a read-only provider if no wallet connected, otherwise signer
      const provider = window.ethereum ? await this.getProvider() : new BrowserProvider(window.ethereum as any);
      // Note: In a real app, you might want a fallback JSON-RPC provider if window.ethereum is missing

      const stakingContract = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);
      const config = await stakingContract.getReferralConfig();

      return {
        referralPercent: Number(config.referralPercentageBps) / 100,
        referrerPercent: Number(config.referrerPercentageBps) / 100,
        isPaused: config.isPaused
      };
    } catch (error: any) {
      // Return defaults if fetch fails
      return {
        referralPercent: 5,
        referrerPercent: 3,
        isPaused: false
      };
    }
  }

  // Claim instant rewards in USDT
  static async claimInstantRewardsUSDT(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimInstantRewardsUSDT();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No USDT instant rewards to claim')) {
        throw new Error('No USDT instant rewards available to claim');
      } else if (error.message?.includes('Insufficient USDT balance')) {
        throw new Error('Insufficient USDT in contract. Please contact support.');
      }

      throw new Error(error.message || 'Failed to claim USDT instant rewards');
    }
  }

  // Claim referral rewards in USDT
  static async claimReferralRewardsUSDT(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimReferralRewardsUSDT();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No USDT referral rewards to claim')) {
        throw new Error('No USDT referral rewards available to claim');
      } else if (error.message?.includes('Insufficient USDT balance')) {
        throw new Error('Insufficient USDT in contract. Please contact support.');
      }

      throw new Error(error.message || 'Failed to claim USDT referral rewards');
    }
  }

  // Claim all USDT rewards (instant + referral)
  static async claimAllUSDTRewards(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimAllUSDTRewards();

      await tx.wait();

      return tx.hash;
    } catch (error: any) {
      if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      } else if (error.message?.includes('No USDT rewards to claim')) {
        throw new Error('No USDT rewards available to claim');
      } else if (error.message?.includes('Insufficient USDT balance')) {
        throw new Error('Insufficient USDT in contract. Please contact support.');
      }

      throw new Error(error.message || 'Failed to claim all USDT rewards');
    }
  }

  // Get detailed claimable rewards (NILA and USDT)
  static async getClaimableRewardsDetailed(userAddress: string): Promise<{
    instantRewardsNILA: string;
    referralRewardsNILA: string;
    instantRewardsUSDT: string;
    referralRewardsUSDT: string;
    apyRewardsNILA: string;
  }> {
    try {
      const stakingContract = await this.getStakingContract();
      const rewards = await stakingContract.getClaimableRewardsDetailed(userAddress);

      return {
        instantRewardsNILA: rewards.instantRewardsNILA.toString(),
        referralRewardsNILA: rewards.referralRewardsNILA.toString(),
        instantRewardsUSDT: rewards.instantRewardsUSDT.toString(),
        referralRewardsUSDT: rewards.referralRewardsUSDT.toString(),
        apyRewardsNILA: rewards.apyRewardsNILA.toString()
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get detailed claimable rewards');
    }
  }
}
