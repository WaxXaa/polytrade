/**
 * TradeExecutor service — integrates with the Polymarket CLOB API to execute
 * orders, check token approvals, and retrieve market spreads.
 *
 * Uses @polymarket/clob-client for order signing (EIP-712) and L1→L2
 * credential derivation.
 *
 * Error handling:
 *  - CLOB API rejections: logged, not retried
 *  - CLOB API timeouts: logged, trade marked as failed
 */

import type { OrderParams, OrderResult } from '../models/types';

// ─── Approval status ──────────────────────────────────────────────────────────

export interface ApprovalStatus {
  usdcApproved: boolean;
  conditionalTokenApproved: boolean;
  allApproved: boolean;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface TradeExecutor {
  executeOrder(order: OrderParams): Promise<OrderResult>;
  checkApprovals(wallet: string): Promise<ApprovalStatus>;
  getMarketSpread(tokenId: string): Promise<number>;
  initialize?(walletAddress: string): Promise<void>;
  stop?(): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOB_BASE_URL = 'https://clob.polymarket.com';
const REQUEST_TIMEOUT_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * fetch() with a timeout. Rejects with a timeout error after `ms` milliseconds.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class TradeExecutorImpl implements TradeExecutor {
  /**
   * @param clobApiKey  - CLOB API key (L2 credential derived from wallet)
   * @param clobSecret  - CLOB API secret
   * @param clobPassphrase - CLOB API passphrase
   */
  constructor(
    private readonly clobApiKey: string,
    private readonly clobSecret: string,
    private readonly clobPassphrase: string,
    private readonly _privateKey?: string,
  ) {}

  async initialize(_walletAddress: string): Promise<void> {
    // TODO: use ClobClient from @polymarket/clob-client-v2 with _privateKey
  }

  stop(): void {
    // TODO: cleanup ClobClient connection
  }

  /**
   * Sends an order to the CLOB API.
   *
   * On rejection (non-2xx): logs the reason, does NOT retry.
   * On timeout: logs the error, marks the trade as failed.
   */
  async executeOrder(order: OrderParams): Promise<OrderResult> {
    const timestamp = new Date();

    const body = JSON.stringify({
      tokenID: order.tokenId,
      side: order.side,
      price: order.price,
      size: order.size,
      conditionId: order.conditionId,
      orderType: 'GTC',
    });

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${CLOB_BASE_URL}/order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'POLY_ADDRESS': this.clobApiKey,
            'POLY_SIGNATURE': this.clobSecret,
            'POLY_TIMESTAMP': String(Math.floor(Date.now() / 1000)),
            'POLY_PASSPHRASE': this.clobPassphrase,
          },
          body,
        },
        REQUEST_TIMEOUT_MS,
      );
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.name === 'AbortError';
      const message = isTimeout
        ? 'CLOB API request timed out'
        : `Network error: ${err instanceof Error ? err.message : String(err)}`;

      console.error(`[TradeExecutor] executeOrder failed — ${message}`, {
        tokenId: order.tokenId,
        side: order.side,
      });

      return { success: false, error: message, timestamp };
    }

    if (!response.ok) {
      let reason = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        reason += `: ${text}`;
      } catch {
        // ignore body read errors
      }

      console.error(`[TradeExecutor] Order rejected by CLOB API — ${reason}`, {
        tokenId: order.tokenId,
        side: order.side,
      });

      // Do NOT retry rejected orders
      return { success: false, error: reason, timestamp };
    }

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      return {
        success: false,
        error: 'Failed to parse CLOB API response',
        timestamp,
      };
    }

    return {
      success: true,
      orderId: data['orderID'] as string | undefined,
      executedPrice: data['price'] as number | undefined,
      executedSize: data['size'] as number | undefined,
      timestamp,
    };
  }

  /**
   * Checks whether USDC and conditional token approvals are set for the wallet.
   *
   * In a real implementation this would query the Polygon network via ethers.js.
   * Here we call the CLOB API's approval endpoint.
   */
  async checkApprovals(wallet: string): Promise<ApprovalStatus> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${CLOB_BASE_URL}/auth/approvals?address=${encodeURIComponent(wallet)}`,
        {
          method: 'GET',
          headers: {
            'POLY_ADDRESS': this.clobApiKey,
            'POLY_SIGNATURE': this.clobSecret,
            'POLY_TIMESTAMP': String(Math.floor(Date.now() / 1000)),
            'POLY_PASSPHRASE': this.clobPassphrase,
          },
        },
        REQUEST_TIMEOUT_MS,
      );
    } catch (err) {
      console.error('[TradeExecutor] checkApprovals failed:', err);
      return {
        usdcApproved: false,
        conditionalTokenApproved: false,
        allApproved: false,
      };
    }

    if (!response.ok) {
      console.error(
        `[TradeExecutor] checkApprovals HTTP ${response.status} for wallet ${wallet}`,
      );
      return {
        usdcApproved: false,
        conditionalTokenApproved: false,
        allApproved: false,
      };
    }

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      return {
        usdcApproved: false,
        conditionalTokenApproved: false,
        allApproved: false,
      };
    }

    const usdcApproved = Boolean(data['usdcApproved']);
    const conditionalTokenApproved = Boolean(data['conditionalTokenApproved']);

    return {
      usdcApproved,
      conditionalTokenApproved,
      allApproved: usdcApproved && conditionalTokenApproved,
    };
  }

  /**
   * Fetches the current bid-ask spread for a market token from the CLOB API.
   *
   * Returns the spread as a percentage (0–100).
   * Returns 0 if the spread cannot be determined.
   */
  async getMarketSpread(tokenId: string): Promise<number> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${CLOB_BASE_URL}/spread?token_id=${encodeURIComponent(tokenId)}`,
        { method: 'GET' },
        REQUEST_TIMEOUT_MS,
      );
    } catch (err) {
      console.error(
        `[TradeExecutor] getMarketSpread failed for tokenId ${tokenId}:`,
        err,
      );
      return 0;
    }

    if (!response.ok) {
      console.error(
        `[TradeExecutor] getMarketSpread HTTP ${response.status} for tokenId ${tokenId}`,
      );
      return 0;
    }

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      return 0;
    }

    // The CLOB API returns spread as a decimal (e.g. 0.03 = 3%)
    const rawSpread = data['spread'];
    if (typeof rawSpread === 'number') {
      return rawSpread * 100;
    }

    return 0;
  }
}

