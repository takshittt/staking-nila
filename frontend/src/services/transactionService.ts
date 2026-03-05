import { BrowserProvider } from 'ethers';
import { ERC20Service } from './erc20Service';
import { TronTransactionService } from './tronTransactionService';
import { MultiChainPaymentService } from './multiChainPaymentService';

/**
 * Unified Transaction Service
 * Handles all transaction types across all chains
 */

export type TransactionStatus = 
  | 'idle'
  | 'approving'
  | 'signing'
  | 'sending'
  | 'confirming'
  | 'verifying'
  | 'success'
  | 'error';

export interface TransactionProgress {
  status: TransactionStatus;
  message: string;
  txHash?: string;
  approvalTxHash?: string;
}

export interface SendPaymentParams {
  chain: 'BSC' | 'ETH' | 'TRON';
  token: 'USDT' | 'USDC' | 'NATIVE';
  recipientAddress: string;
  amount: number;
  provider?: BrowserProvider; // For EVM chains
  onProgress?: (progress: TransactionProgress) => void;
}

export interface SendPaymentResult {
  txHash: string;
  approvalTxHash?: string;
}

export class TransactionService {
  /**
   * Send payment on any supported chain
   */
  static async sendPayment(params: SendPaymentParams): Promise<SendPaymentResult> {
    const { chain, token, recipientAddress, amount, provider, onProgress } = params;

    try {
      // TRON Network
      if (chain === 'TRON') {
        // TRON only supports USDT and TRX (NATIVE), not USDC
        const tronToken = token === 'USDC' ? 'USDT' : token;
        return await this.sendTronPayment(tronToken as 'USDT' | 'NATIVE', recipientAddress, amount, onProgress);
      }

      // EVM Networks (BSC, Ethereum)
      if (!provider) {
        throw new Error('Provider is required for EVM chains');
      }

      return await this.sendEvmPayment(
        chain,
        token,
        recipientAddress,
        amount,
        provider,
        onProgress
      );

    } catch (error: any) {
      if (onProgress) {
        onProgress({
          status: 'error',
          message: error.message || 'Transaction failed'
        });
      }
      throw error;
    }
  }

  /**
   * Send payment on EVM chains (BSC, Ethereum)
   */
  private static async sendEvmPayment(
    chain: 'BSC' | 'ETH',
    token: 'USDT' | 'USDC' | 'NATIVE',
    recipientAddress: string,
    amount: number,
    provider: BrowserProvider,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<SendPaymentResult> {
    
    // Native token (BNB, ETH)
    if (token === 'NATIVE') {
      return await this.sendNativeToken(
        recipientAddress,
        amount,
        provider,
        onProgress
      );
    }

    // ERC20 tokens (USDT, USDC)
    console.log(`🔍 Getting token address for ${chain} ${token}`);
    const tokenAddress = MultiChainPaymentService.getTokenAddress(chain, token);
    console.log(`📍 Token address:`, tokenAddress);
    
    if (!tokenAddress) {
      throw new Error(`Token address not configured for ${chain} ${token}. Please check your .env file and restart the dev server.`);
    }

    return await this.sendERC20Token(
      tokenAddress,
      recipientAddress,
      amount,
      provider,
      onProgress
    );
  }

  /**
   * Send ERC20 tokens (USDT, USDC)
   */
  private static async sendERC20Token(
    tokenAddress: string,
    recipientAddress: string,
    amount: number,
    provider: BrowserProvider,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<SendPaymentResult> {
    
    const result = await ERC20Service.sendTokens(
      tokenAddress,
      recipientAddress,
      amount.toString(),
      provider,
      // On approving
      () => {
        if (onProgress) {
          onProgress({
            status: 'approving',
            message: 'Approving token spending...'
          });
        }
      },
      // On sending
      () => {
        if (onProgress) {
          onProgress({
            status: 'sending',
            message: 'Sending payment...'
          });
        }
      }
    );

    if (onProgress) {
      onProgress({
        status: 'confirming',
        message: 'Confirming transaction...',
        txHash: result.txHash,
        approvalTxHash: result.approvalTxHash || undefined
      });
    }

    return {
      txHash: result.txHash,
      approvalTxHash: result.approvalTxHash || undefined
    };
  }

  /**
   * Send native tokens (BNB, ETH)
   */
  private static async sendNativeToken(
    recipientAddress: string,
    amount: number,
    provider: BrowserProvider,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<SendPaymentResult> {
    
    if (onProgress) {
      onProgress({
        status: 'signing',
        message: 'Waiting for signature...'
      });
    }

    const signer = await provider.getSigner();
    
    if (onProgress) {
      onProgress({
        status: 'sending',
        message: 'Sending payment...'
      });
    }

    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: (BigInt(Math.floor(amount * 1e18))).toString()
    });

    if (onProgress) {
      onProgress({
        status: 'confirming',
        message: 'Confirming transaction...',
        txHash: tx.hash
      });
    }

    const receipt = await tx.wait();

    return {
      txHash: receipt!.hash
    };
  }

  /**
   * Send payment on TRON
   */
  private static async sendTronPayment(
    token: 'USDT' | 'NATIVE',
    recipientAddress: string,
    amount: number,
    onProgress?: (progress: TransactionProgress) => void
  ): Promise<SendPaymentResult> {
    
    let txHash: string;

    if (token === 'USDT') {
      // TRC20 USDT
      txHash = await TronTransactionService.sendTRC20(
        recipientAddress,
        amount,
        // On signing
        () => {
          if (onProgress) {
            onProgress({
              status: 'signing',
              message: 'Waiting for signature...'
            });
          }
        },
        // On sending
        () => {
          if (onProgress) {
            onProgress({
              status: 'sending',
              message: 'Sending payment...'
            });
          }
        }
      );
    } else {
      // Native TRX
      txHash = await TronTransactionService.sendTRX(
        recipientAddress,
        amount,
        // On signing
        () => {
          if (onProgress) {
            onProgress({
              status: 'signing',
              message: 'Waiting for signature...'
            });
          }
        },
        // On sending
        () => {
          if (onProgress) {
            onProgress({
              status: 'sending',
              message: 'Sending payment...'
            });
          }
        }
      );
    }

    if (onProgress) {
      onProgress({
        status: 'confirming',
        message: 'Confirming transaction...',
        txHash
      });
    }

    // Wait for confirmation on TRON
    await TronTransactionService.waitForConfirmation(txHash);

    return { txHash };
  }

  /**
   * Get balance for any token on any chain
   */
  static async getBalance(
    chain: 'BSC' | 'ETH' | 'TRON',
    token: 'USDT' | 'USDC' | 'NATIVE',
    userAddress: string,
    provider?: BrowserProvider
  ): Promise<number> {
    
    if (chain === 'TRON') {
      if (token === 'USDT') {
        return await TronTransactionService.getTRC20Balance(userAddress);
      } else {
        return await TronTransactionService.getTRXBalance(userAddress);
      }
    }

    // EVM chains
    if (!provider) {
      throw new Error('Provider required for EVM chains');
    }

    if (token === 'NATIVE') {
      const balance = await provider.getBalance(userAddress);
      return Number(balance) / 1e18;
    }

    // ERC20 tokens
    const tokenAddress = MultiChainPaymentService.getTokenAddress(chain, token);
    if (!tokenAddress) {
      throw new Error(`Token address not found for ${chain} ${token}`);
    }

    const balanceStr = await ERC20Service.getBalance(tokenAddress, userAddress, provider);
    return parseFloat(balanceStr);
  }
}
