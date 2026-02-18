import { BrowserProvider, Contract, parseUnits } from 'ethers';

// Contract addresses - these should match your deployed contracts
const STAKING_CONTRACT_ADDRESS = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || '0x4b0f512ACE0239A604AA8f8D5C05bD455248D86E';
const NILA_TOKEN_ADDRESS = import.meta.env.VITE_NILA_TOKEN_ADDRESS || '0xA31fb7667F80306690F5DF0d9A6ea272aBF97926';

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
  'function stake(uint256 amountId, uint256 lockId) external',
  'function stakeWithReferral(uint256 amountId, uint256 lockId, address referrer) external',
  'function claimInstantRewards() external',
  'function claimReferralRewards() external',
  'function claimAllRewards() external',
  'function getClaimableRewards(address user) external view returns (uint256 instantRewards, uint256 referralRewards, uint256 totalClaimable)',
  'function getReferralConfig() external view returns (uint256 referralPercentageBps, uint256 referrerPercentageBps, bool isPaused)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

export interface StakeParams {
  amountConfigId: number;
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
      console.error('Error checking network:', error);
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

  // Check if user has approved the staking contract to spend their tokens
  static async checkAllowance(userAddress: string, amount: string): Promise<boolean> {
    try {
      const tokenContract = await this.getTokenContract();
      const allowance = await tokenContract.allowance(userAddress, STAKING_CONTRACT_ADDRESS);
      const requiredAmount = parseUnits(amount, 18);
      return allowance >= requiredAmount;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  }

  // Approve the staking contract to spend tokens
  static async approveToken(amount: string): Promise<string> {
    try {
      const tokenContract = await this.getTokenContract();
      const amountWei = parseUnits(amount, 18);

      const tx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);
      console.log('Approval transaction sent:', tx.hash);

      await tx.wait();
      console.log('Approval confirmed');

      return tx.hash;
    } catch (error: any) {
      console.error('Error approving token:', error);
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
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  // Stake tokens
  static async stake(params: StakeParams): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();

      let tx;
      if (params.referrerAddress) {
        // Stake with referral
        tx = await stakingContract.stakeWithReferral(
          params.amountConfigId,
          params.lockConfigId,
          params.referrerAddress
        );
      } else {
        // Regular stake
        tx = await stakingContract.stake(
          params.amountConfigId,
          params.lockConfigId
        );
      }

      console.log('Stake transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Stake confirmed:', receipt);

      return tx.hash;
    } catch (error: any) {
      console.error('Error staking:', error);

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
      console.error('Error getting claimable rewards:', error);
      throw new Error(error.message || 'Failed to get claimable rewards');
    }
  }

  // Claim instant cashback rewards
  static async claimInstantRewards(): Promise<string> {
    try {
      const stakingContract = await this.getStakingContract();
      const tx = await stakingContract.claimInstantRewards();

      console.log('Claim instant rewards transaction sent:', tx.hash);
      await tx.wait();
      console.log('Claim confirmed');

      return tx.hash;
    } catch (error: any) {
      console.error('Error claiming instant rewards:', error);

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

      console.log('Claim referral rewards transaction sent:', tx.hash);
      await tx.wait();
      console.log('Claim confirmed');

      return tx.hash;
    } catch (error: any) {
      console.error('Error claiming referral rewards:', error);

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

      console.log('Claim all rewards transaction sent:', tx.hash);
      await tx.wait();
      console.log('Claim confirmed');

      return tx.hash;
    } catch (error: any) {
      console.error('Error claiming all rewards:', error);

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
      console.error('Error getting referral config:', error);
      // Return defaults if fetch fails
      return {
        referralPercent: 5,
        referrerPercent: 3,
        isPaused: false
      };
    }
  }
}
