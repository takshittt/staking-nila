// TronLink wallet integration service

// Extend Window interface to include TronLink
declare global {
  interface Window {
    tronWeb?: {
      ready: boolean;
      defaultAddress: {
        base58: string;
        hex: string;
      };
      trx: {
        sendTransaction: (to: string, amount: number) => Promise<any>;
        getBalance: (address: string) => Promise<number>;
        sign: (transaction: any) => Promise<any>;
        sendRawTransaction: (signedTransaction: any) => Promise<any>;
        getTransactionInfo: (txHash: string) => Promise<any>;
      };
      transactionBuilder: {
        triggerSmartContract: (
          contractAddress: string,
          functionSelector: string,
          options: any,
          parameters: any[],
          issuerAddress: string
        ) => Promise<any>;
        sendTrx: (to: string, amount: number, from: string) => Promise<any>;
      };
      toSun: (amount: number) => number;
      fromSun: (amount: number) => number;
      isAddress: (address: string) => boolean;
      contract: () => {
        at: (address: string) => Promise<any>;
      };
    };
    tronLink?: {
      ready: boolean;
      request: (args: { method: string; params?: any }) => Promise<any>;
    };
  }
}

export interface TronWalletState {
  address: string | null;
  isConnected: boolean;
  isInstalled: boolean;
}

export class TronLinkService {
  /**
   * Check if TronLink extension is installed
   */
  static isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for both tronWeb and tronLink objects
    // TronLink injects both, but they might load at different times
    return !!(window.tronWeb || window.tronLink);
  }

  /**
   * Check if TronLink is ready and connected
   */
  static isReady(): boolean {
    return !!(window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress?.base58);
  }

  /**
   * Get TronWeb instance
   */
  static getTronWeb() {
    if (typeof window === 'undefined' || !window.tronWeb) {
      return null;
    }
    return window.tronWeb;
  }

  /**
   * Get current connected TRON address
   */
  static getAddress(): string | null {
    if (this.isReady() && window.tronWeb?.defaultAddress?.base58) {
      return window.tronWeb.defaultAddress.base58;
    }
    return null;
  }

  /**
   * Request connection to TronLink wallet
   */
  static async connect(): Promise<string> {
    if (!this.isInstalled()) {
      throw new Error('TronLink is not installed. Please install TronLink extension.');
    }

    // Wait for TronLink to be ready
    if (!this.isReady()) {
      // Try to trigger connection
      if (window.tronLink) {
        try {
          await window.tronLink.request({ method: 'tron_requestAccounts' });
        } catch (error) {
          throw new Error('User rejected TronLink connection');
        }
      }

      // Wait for tronWeb to be ready (max 5 seconds)
      const maxAttempts = 50;
      for (let i = 0; i < maxAttempts; i++) {
        if (this.isReady()) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!this.isReady()) {
        throw new Error('TronLink connection timeout. Please unlock your wallet and try again.');
      }
    }

    const address = this.getAddress();
    if (!address) {
      throw new Error('Failed to get TRON address from TronLink');
    }

    return address;
  }

  /**
   * Get wallet state
   */
  static getWalletState(): TronWalletState {
    return {
      address: this.getAddress(),
      isConnected: this.isReady(),
      isInstalled: this.isInstalled()
    };
  }

  /**
   * Send TRX (native token)
   */
  static async sendTRX(to: string, amount: number): Promise<string> {
    if (!this.isReady() || !window.tronWeb) {
      throw new Error('TronLink is not connected');
    }

    try {
      const amountInSun = window.tronWeb.toSun(amount);
      const transaction = await window.tronWeb.trx.sendTransaction(to, amountInSun);
      
      if (!transaction || !transaction.txid) {
        throw new Error('Transaction failed');
      }

      return transaction.txid;
    } catch (error: any) {
      if (error.message?.includes('Confirmation declined')) {
        throw new Error('Transaction rejected by user');
      }
      throw new Error(error.message || 'Failed to send TRX');
    }
  }

  /**
   * Send TRC20 token (e.g., USDT)
   */
  static async sendTRC20(
    tokenAddress: string,
    to: string,
    amount: number,
    decimals: number = 6
  ): Promise<string> {
    if (!this.isReady() || !window.tronWeb) {
      throw new Error('TronLink is not connected');
    }

    try {
      // Get contract instance
      const contract = await window.tronWeb.contract().at(tokenAddress);
      
      // Calculate amount with decimals
      const amountWithDecimals = Math.floor(amount * Math.pow(10, decimals));

      // Call transfer function
      const transaction = await contract.transfer(to, amountWithDecimals).send();

      if (!transaction) {
        throw new Error('Transaction failed');
      }

      return transaction;
    } catch (error: any) {
      if (error.message?.includes('Confirmation declined')) {
        throw new Error('Transaction rejected by user');
      }
      throw new Error(error.message || 'Failed to send TRC20 token');
    }
  }

  /**
   * Get TRX balance
   */
  static async getBalance(address?: string): Promise<number> {
    if (!window.tronWeb) {
      throw new Error('TronLink is not available');
    }

    const targetAddress = address || this.getAddress();
    if (!targetAddress) {
      throw new Error('No address provided');
    }

    try {
      const balanceInSun = await window.tronWeb.trx.getBalance(targetAddress);
      return window.tronWeb.fromSun(balanceInSun);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get balance');
    }
  }

  /**
   * Get TRC20 token balance
   */
  static async getTRC20Balance(
    tokenAddress: string,
    userAddress?: string,
    decimals: number = 6
  ): Promise<number> {
    if (!window.tronWeb) {
      throw new Error('TronLink is not available');
    }

    const targetAddress = userAddress || this.getAddress();
    if (!targetAddress) {
      throw new Error('No address provided');
    }

    try {
      const contract = await window.tronWeb.contract().at(tokenAddress);
      const balance = await contract.balanceOf(targetAddress).call();
      return Number(balance) / Math.pow(10, decimals);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get token balance');
    }
  }

  /**
   * Validate TRON address format
   */
  static isValidAddress(address: string): boolean {
    if (!window.tronWeb) {
      // Basic validation without tronWeb
      return /^T[A-Za-z1-9]{33}$/.test(address);
    }
    return window.tronWeb.isAddress(address);
  }

  /**
   * Listen for account changes
   */
  static onAccountChanged(callback: (address: string | null) => void): () => void {
    const checkInterval = setInterval(() => {
      const currentAddress = this.getAddress();
      callback(currentAddress);
    }, 1000);

    return () => clearInterval(checkInterval);
  }

  /**
   * Format TRON address for display
   */
  static formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get TronLink download URL
   */
  static getDownloadUrl(): string {
    return 'https://www.tronlink.org/';
  }
}
