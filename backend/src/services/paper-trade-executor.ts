/**
 * PaperTradeExecutor — simulates trade execution without touching the CLOB API.
 *
 * All orders are "executed" instantly at the requested price.
 * Tracks a virtual balance that decreases on BUY and increases on SELL.
 * Spread is simulated as a small random value (0.5–3%).
 */

import type { OrderParams, OrderResult } from '../models/types';
import type { TradeExecutor, ApprovalStatus } from './trade-executor';
import { randomUUID } from 'node:crypto';

export class PaperTradeExecutorImpl implements TradeExecutor {
  private virtualBalance: number;
  private totalPnl = 0;
  private tradeCount = 0;

  constructor(initialBalance: number = 100) {
    this.virtualBalance = initialBalance;
    console.info(`[PaperTradeExecutor] Paper trading mode — starting balance: $${initialBalance} USDC`);
  }

  getVirtualBalance(): number {
    return this.virtualBalance;
  }

  getTotalPnl(): number {
    return this.totalPnl;
  }

  getTradeCount(): number {
    return this.tradeCount;
  }

  async initialize(_walletAddress: string): Promise<void> {
    console.info('[PaperTradeExecutor] Initialize — no-op in paper mode.');
  }

  stop(): void {
    console.info('[PaperTradeExecutor] Stopped.');
  }

  async executeOrder(order: OrderParams): Promise<OrderResult> {
    const timestamp = new Date();

    // Check if we have enough balance for BUY
    if (order.side === 'BUY' && order.size > this.virtualBalance) {
      console.info(`[PaperTradeExecutor] Insufficient balance: need $${order.size.toFixed(2)}, have $${this.virtualBalance.toFixed(2)}`);
      return {
        success: false,
        error: `Insufficient paper balance: $${this.virtualBalance.toFixed(2)} < $${order.size.toFixed(2)}`,
        timestamp,
      };
    }

    // Simulate small slippage (0.1–0.5%)
    const slippage = 1 + (Math.random() * 0.004 + 0.001) * (order.side === 'BUY' ? 1 : -1);
    const executedPrice = order.price * slippage;

    // Update virtual balance
    if (order.side === 'BUY') {
      this.virtualBalance -= order.size;
    } else {
      this.virtualBalance += order.size;
    }

    this.tradeCount++;

    console.info(
      `[PaperTradeExecutor] 📝 ${order.side} $${order.size.toFixed(2)} @ ${executedPrice.toFixed(4)} — balance: $${this.virtualBalance.toFixed(2)}`,
    );

    return {
      success: true,
      orderId: `paper-${randomUUID().slice(0, 8)}`,
      executedPrice,
      executedSize: order.size,
      timestamp,
    };
  }

  async checkApprovals(_wallet: string): Promise<ApprovalStatus> {
    // Paper mode — always approved
    return {
      usdcApproved: true,
      conditionalTokenApproved: true,
      allApproved: true,
    };
  }

  async getMarketSpread(_tokenId: string): Promise<number> {
    // Simulate realistic spread: 0.5–3%
    return 0.5 + Math.random() * 2.5;
  }
}
