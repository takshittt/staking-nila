import { ethers, BrowserProvider } from 'ethers';

/**
 * ERC20 Token Service
 * Handles ERC20 token interactions (USDT, USDC) on EVM chains (BSC, Ethereum)
 */

// Standard ERC20 ABI - only functions we need
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

export class ERC20Service {
  /**
   * Get token contract instance
   */
  static getTokenContract(
    tokenAddress: string,
    provider: BrowserProvider
  ): any {
    return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  }

  /**
   * Get token balance for an address
   */
  static async getBalance(
    tokenAddress: string,
    userAddress: string,
    provider: BrowserProvider
  ): Promise<string> {
    const contract = this.getTokenContract(tokenAddress, provider);
    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get token decimals with fallback
   */
  static async getDecimals(
    tokenAddress: string,
    provider: BrowserProvider
  ): Promise<number> {
    try {
      const contract = this.getTokenContract(tokenAddress, provider);
      const decimals = await contract.decimals();
      return Number(decimals);
    } catch (error) {
      console.warn('Failed to get decimals, using default 18:', error);
      // Default to 18 decimals if call fails (common for ERC20)
      return 18;
    }
  }

  /**
   * Check allowance
   */
  static async getAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: BrowserProvider
  ): Promise<bigint> {
    const contract = this.getTokenContract(tokenAddress, provider);
    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Approve token spending
   */
  static async approve(
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    provider: BrowserProvider
  ): Promise<string> {
    const signer = await provider.getSigner();
    const contract = this.getTokenContract(tokenAddress, provider).connect(signer);
    
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    const tx = await contract.approve(spenderAddress, amountWei);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Transfer tokens
   */
  static async transfer(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    provider: BrowserProvider
  ): Promise<string> {
    const signer = await provider.getSigner();
    const contract = this.getTokenContract(tokenAddress, provider).connect(signer);
    
    const decimals = await this.getDecimals(tokenAddress, provider);
    const amountWei = ethers.parseUnits(amount, decimals);

    const tx = await contract.transfer(recipientAddress, amountWei);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Check if approval is needed and approve if necessary
   * Returns approval transaction hash if approval was needed, null otherwise
   */
  static async ensureApproval(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    amount: string,
    provider: BrowserProvider,
    onApproving?: () => void
  ): Promise<string | null> {
    const contract = this.getTokenContract(tokenAddress, provider);
    const decimals = await this.getDecimals(tokenAddress, provider);
    const amountWei = ethers.parseUnits(amount, decimals);

    const allowance = await this.getAllowance(
      tokenAddress,
      ownerAddress,
      spenderAddress,
      provider
    );

    // If allowance is sufficient, no approval needed
    if (allowance >= amountWei) {
      return null;
    }

    // Need approval
    if (onApproving) {
      onApproving();
    }

    // Approve max amount to avoid future approvals
    const maxAmount = ethers.MaxUint256;
    const signer = await provider.getSigner();
    const contractWithSigner = contract.connect(signer);

    const tx = await contractWithSigner.approve(spenderAddress, maxAmount);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Send ERC20 tokens with automatic approval if needed
   */
  static async sendTokens(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    provider: BrowserProvider,
    onApproving?: () => void,
    onSending?: () => void
  ): Promise<{ txHash: string; approvalTxHash: string | null }> {
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    const contract = this.getTokenContract(tokenAddress, provider);
    const decimals = await contract.decimals();

    // Check if this is a non-standard token (like some test tokens)
    // that doesn't support approve/transferFrom pattern
    let approvalTxHash: string | null = null;
    
    try {
      // Step 1: Try to ensure approval (if needed)
      approvalTxHash = await this.ensureApproval(
        tokenAddress,
        userAddress,
        recipientAddress,
        amount,
        provider,
        onApproving
      );
    } catch (error: any) {
      console.warn('Approval check/execution failed, will try direct transfer:', error.message);
      // Some tokens don't support approve, continue to transfer
    }

    // Step 2: Transfer tokens
    if (onSending) {
      onSending();
    }

    const amountWei = ethers.parseUnits(amount, decimals);
    const contractWithSigner = contract.connect(signer);

    const tx = await contractWithSigner.transfer(recipientAddress, amountWei);
    const receipt = await tx.wait();

    return { txHash: receipt.hash, approvalTxHash };
  }
}
