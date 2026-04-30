import { ClobClient, Side, OrderType } from '@polymarket/clob-client-v2';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { UserConfig } from '../types/index.js';

const CHAIN_ID = 137;
const CLOB_HOST = 'https://clob.polymarket.com';

export interface TradeExecutionResult {
  success: boolean;
  orderId?: string;
  txHash?: string;
  error?: string;
  filledSize?: number;
  avgPrice?: number;
}

export interface ExecutorConfig {
  userAddress: string;
  privateKey?: string; // Only for server-side execution
  signer?: any; // Or wagmi signer for client-side
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
}

export class TradeExecutorService {
  private client: ClobClient | null = null;
  private config: ExecutorConfig | null = null;
  private signatureType: number = 0; // EOA

  async initialize(config: ExecutorConfig): Promise<void> {
    this.config = config;

    // If we have a private key (server-side), use it directly
    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: { id: CHAIN_ID, name: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: { default: { http: ['https://polygon-rpc.com'] } } },
        transport: http()
      });

      const tempClient = new ClobClient({
        host: CLOB_HOST,
        chain: CHAIN_ID,
        signer: walletClient as any,
      });

      // Derive API credentials
      const apiCreds = await tempClient.createOrDeriveApiKey();

      this.client = new ClobClient({
        host: CLOB_HOST,
        chain: CHAIN_ID,
        signer: walletClient as any,
        creds: apiCreds,
        signatureType: 0, // EOA
        funderAddress: config.userAddress,
      });

      this.signatureType = 0;
    }
    // If we have external signer (from frontend via wagmi)
    else if (config.signer && config.apiCredentials) {
      this.client = new ClobClient({
        host: CLOB_HOST,
        chain: CHAIN_ID,
        signer: config.signer,
        creds: config.apiCredentials,
        signatureType: this.signatureType,
        funderAddress: config.userAddress,
      });
    }
  }

  async executeMarketOrder(
    tokenId: string,
    side: 'BUY' | 'SELL',
    amount: number,
    maxSlippage: number = 0.05
  ): Promise<TradeExecutionResult> {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const clobSide = side === 'BUY' ? Side.BUY : Side.SELL;
      
      // Calculate worst price (slippage protection)
      const worstPrice = side === 'BUY' ? (1 + maxSlippage) : (1 - maxSlippage);
      
      // Create market order with FOK (Fill or Kill)
      const order = await this.client.createMarketOrder(
        {
          tokenID: tokenId,
          side: clobSide,
          amount: amount,
          price: worstPrice,
        },
        { tickSize: '0.01', negRisk: false }
      );

      const result = await this.client.postOrder(order, OrderType.FOK);

      return {
        success: true,
        orderId: result.orderID || result.order?.orderID,
        txHash: result.transactionHash || result.txHash,
        filledSize: amount,
        avgPrice: worstPrice,
      };
    } catch (error: any) {
      console.error('Trade execution failed:', error);
      return {
        success: false,
        error: error.message || 'Trade execution failed',
      };
    }
  }

  async executeLimitOrder(
    tokenId: string,
    side: 'BUY' | 'SELL',
    amount: number,
    price: number
  ): Promise<TradeExecutionResult> {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const clobSide = side === 'BUY' ? Side.BUY : Side.SELL;

      const order = await this.client.createAndPostOrder({
        tokenID: tokenId,
        side: clobSide,
        price: price,
        size: amount,
        orderType: OrderType.GTC,
      });

      return {
        success: true,
        orderId: order.orderID,
        filledSize: 0, // Limit orders start unfilled
        avgPrice: price,
      };
    } catch (error: any) {
      console.error('Limit order failed:', error);
      return {
        success: false,
        error: error.message || 'Limit order failed',
      };
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.cancelOrder(orderId);
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }

  async getOrderStatus(orderId: string): Promise<{ filled: number; status: string } | null> {
    if (!this.client) {
      return null;
    }

    try {
      const orders = await this.client.getOrders();
      const order = orders.find(o => o.orderID === orderId);
      
      if (!order) return null;

      return {
        filled: order.size - order.remainingSize,
        status: order.status || 'unknown',
      };
    } catch (error) {
      console.error('Failed to get order status:', error);
      return null;
    }
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  disconnect(): void {
    this.client = null;
    this.config = null;
  }
}

export const tradeExecutor = new TradeExecutorService();