import axios from 'axios';

const NILA_BUY_BACKEND_URL = import.meta.env.VITE_NILA_BUY_BACKEND_URL || 'http://localhost:3001';

export interface CreateOrderRequest {
  wallet: string;
  pyrandAmount: number;
  network: 'BSC_USDT' | 'BSC_USDC' | 'BSC' | 'ETH_USDT' | 'ETH_USDC' | 'ETH' | 'TRC20' | 'TRX';
  trcWallet?: string; // Required for TRON networks
  lockDays?: number; // Lock duration in days
  apr?: number; // APR in basis points (e.g., 1200 = 12%)
}

export interface CreateOrderResponse {
  orderId: string;
  network: string;
  recipient: string;
  stableAmount?: number; // For stablecoin payments
  cryptoAmount?: number; // For native token payments
}

export interface VerifyTransactionRequest {
  orderId: string;
  txHash: string;
  network: string;
}

export interface VerifyTransactionResponse {
  success: boolean;
  pyrandSent: number;
  tokenTx: string;
}

export interface OrderStatusResponse {
  orderId: string;
  recipient: string;
  network: string;
  pyrandAmount: number;
  stableAmount?: number;
  cryptoAmount?: number;
  status: 'PENDING_PAYMENT' | 'PAID';
  createdAt: string;
}

export class MultiChainPaymentService {
  /**
   * Step 1: Create an order on the backend
   * Backend calculates the amount to pay based on current NILA price
   */
  static async createOrder(params: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await axios.post<CreateOrderResponse>(
        `${NILA_BUY_BACKEND_URL}/create-order`,
        params
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create order');
    }
  }

  /**
   * Step 2: Get order details (for displaying payment info)
   */
  static async getOrder(orderId: string): Promise<OrderStatusResponse> {
    try {
      const response = await axios.get<OrderStatusResponse>(
        `${NILA_BUY_BACKEND_URL}/order/${orderId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch order');
    }
  }

  /**
   * Step 3: Verify transaction after user sends payment
   * Backend will:
   * - Verify payment on-chain
   * - Transfer NILA to staking contract
   * - Call adminCreateStake
   */
  static async verifyTransaction(params: VerifyTransactionRequest): Promise<VerifyTransactionResponse> {
    try {
      const response = await axios.post<VerifyTransactionResponse>(
        `${NILA_BUY_BACKEND_URL}/verify-transaction`,
        params
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to verify transaction');
    }
  }

  /**
   * Poll order status until it's paid or timeout
   */
  static async pollOrderStatus(
    orderId: string,
    maxAttempts: number = 60,
    intervalMs: number = 3000
  ): Promise<OrderStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const order = await this.getOrder(orderId);
      
      if (order.status === 'PAID') {
        return order;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Order verification timeout. Please contact support if payment was sent.');
  }

  /**
   * Map frontend chain/token selection to backend network format
   */
  static getNetworkCode(
    chain: 'BSC' | 'ETH' | 'TRON',
    token: 'USDT' | 'USDC' | 'NATIVE'
  ): CreateOrderRequest['network'] {
    if (chain === 'BSC') {
      if (token === 'USDT') return 'BSC_USDT';
      if (token === 'USDC') return 'BSC_USDC';
      return 'BSC'; // BNB
    }

    if (chain === 'ETH') {
      if (token === 'USDT') return 'ETH_USDT';
      if (token === 'USDC') return 'ETH_USDC';
      return 'ETH';
    }

    if (chain === 'TRON') {
      if (token === 'USDT') return 'TRC20';
      return 'TRX';
    }

    throw new Error('Unsupported chain/token combination');
  }

  /**
   * Get token contract address for approval (if needed)
   */
  static getTokenAddress(chain: 'BSC' | 'ETH' | 'TRON', token: 'USDT' | 'USDC'): string | null {
    let address: string | undefined;

    // BSC Mainnet
    if (chain === 'BSC') {
      if (token === 'USDT') address = import.meta.env.VITE_BSC_USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
      if (token === 'USDC') address = import.meta.env.VITE_BSC_USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
    }

    // Ethereum Mainnet
    if (chain === 'ETH') {
      if (token === 'USDT') address = import.meta.env.VITE_ETH_USDT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7';
      if (token === 'USDC') address = import.meta.env.VITE_ETH_USDC_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    }

    // TRON Mainnet
    if (chain === 'TRON') {
      if (token === 'USDT') address = import.meta.env.VITE_TRON_USDT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    }

    if (!address) {
      console.error(`Token address not configured for ${chain} ${token}`);
      console.error('Available env vars:', {
        VITE_BSC_USDT_ADDRESS: import.meta.env.VITE_BSC_USDT_ADDRESS,
        VITE_BSC_USDC_ADDRESS: import.meta.env.VITE_BSC_USDC_ADDRESS,
        VITE_ETH_USDT_ADDRESS: import.meta.env.VITE_ETH_USDT_ADDRESS,
        VITE_ETH_USDC_ADDRESS: import.meta.env.VITE_ETH_USDC_ADDRESS,
        VITE_TRON_USDT_ADDRESS: import.meta.env.VITE_TRON_USDT_ADDRESS,
      });
      return null;
    }

    return address;
  }
}
