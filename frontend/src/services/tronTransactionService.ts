import { TronLinkService } from './tronLinkService';

/**
 * TRON Transaction Service
 * Handles TRC20 (USDT) and native TRX transactions
 */

// TRC20 USDT contract address on TRON mainnet
const TRON_USDT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export class TronTransactionService {
  /**
   * Send TRC20 tokens (USDT)
   */
  static async sendTRC20(
    recipientAddress: string,
    amount: number,
    onSigning?: () => void,
    onSending?: () => void
  ): Promise<string> {
    const tronWeb = TronLinkService.getTronWeb();
    if (!tronWeb) {
      throw new Error('TronLink not available');
    }

    const userAddress = tronWeb.defaultAddress.base58;
    if (!userAddress) {
      throw new Error('TronLink not connected');
    }

    try {
      // Convert amount to Sun (6 decimals for USDT)
      const amountInSun = Math.floor(amount * 1_000_000);

      if (onSigning) {
        onSigning();
      }

      // Build transaction
      const parameter = [
        { type: 'address', value: recipientAddress },
        { type: 'uint256', value: amountInSun }
      ];

      const tx = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT_ADDRESS,
        'transfer(address,uint256)',
        {
          feeLimit: 100_000_000, // 100 TRX fee limit
          callValue: 0
        },
        parameter,
        userAddress
      );

      if (!tx.result || !tx.result.result) {
        throw new Error('Failed to build transaction');
      }

      // Sign transaction
      const signedTx = await tronWeb.trx.sign(tx.transaction);

      if (onSending) {
        onSending();
      }

      // Broadcast transaction
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!result.result) {
        throw new Error(result.message || 'Transaction failed');
      }

      return result.txid || result.transaction.txID;

    } catch (error: any) {
      console.error('TRC20 transfer error:', error);
      
      if (error.message?.includes('Confirmation declined')) {
        throw new Error('Transaction rejected by user');
      }
      
      throw new Error(error.message || 'Failed to send TRC20 tokens');
    }
  }

  /**
   * Send native TRX
   */
  static async sendTRX(
    recipientAddress: string,
    amount: number,
    onSigning?: () => void,
    onSending?: () => void
  ): Promise<string> {
    const tronWeb = TronLinkService.getTronWeb();
    if (!tronWeb) {
      throw new Error('TronLink not available');
    }

    const userAddress = tronWeb.defaultAddress.base58;
    if (!userAddress) {
      throw new Error('TronLink not connected');
    }

    try {
      // Convert amount to Sun (1 TRX = 1,000,000 Sun)
      const amountInSun = Math.floor(amount * 1_000_000);

      if (onSigning) {
        onSigning();
      }

      // Build transaction
      const tx = await tronWeb.transactionBuilder.sendTrx(
        recipientAddress,
        amountInSun,
        userAddress
      );

      // Sign transaction
      const signedTx = await tronWeb.trx.sign(tx);

      if (onSending) {
        onSending();
      }

      // Broadcast transaction
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!result.result) {
        throw new Error(result.message || 'Transaction failed');
      }

      return result.txid || result.transaction.txID;

    } catch (error: any) {
      console.error('TRX transfer error:', error);
      
      if (error.message?.includes('Confirmation declined')) {
        throw new Error('Transaction rejected by user');
      }
      
      throw new Error(error.message || 'Failed to send TRX');
    }
  }

  /**
   * Get TRC20 token balance
   */
  static async getTRC20Balance(userAddress: string): Promise<number> {
    const tronWeb = TronLinkService.getTronWeb();
    if (!tronWeb) {
      throw new Error('TronLink not available');
    }

    try {
      const contract = await tronWeb.contract().at(TRON_USDT_ADDRESS);
      const balance = await contract.balanceOf(userAddress).call();
      
      // Convert from Sun to USDT (6 decimals)
      return Number(balance) / 1_000_000;
    } catch (error) {
      console.error('Failed to get TRC20 balance:', error);
      return 0;
    }
  }

  /**
   * Get native TRX balance
   */
  static async getTRXBalance(userAddress: string): Promise<number> {
    const tronWeb = TronLinkService.getTronWeb();
    if (!tronWeb) {
      throw new Error('TronLink not available');
    }

    try {
      const balance = await tronWeb.trx.getBalance(userAddress);
      
      // Convert from Sun to TRX
      return balance / 1_000_000;
    } catch (error) {
      console.error('Failed to get TRX balance:', error);
      return 0;
    }
  }

  /**
   * Wait for transaction confirmation on TRON
   */
  static async waitForConfirmation(
    txHash: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<boolean> {
    const tronWeb = TronLinkService.getTronWeb();
    if (!tronWeb) {
      throw new Error('TronLink not available');
    }

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
        
        if (txInfo && txInfo.id && txInfo.receipt?.result === 'SUCCESS') {
          return true;
        }
      } catch (error) {
        // Transaction not found yet, continue polling
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Transaction confirmation timeout');
  }
}
