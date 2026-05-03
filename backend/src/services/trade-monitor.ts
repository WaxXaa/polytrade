/**
 * TradeMonitor service for the Polymarket Copy Trading Agent.
 *
 * Polls the Polymarket Data API every 30 seconds for each top trader's trade history.
 * Deduplicates trades using a SHA-256 hash of {traderWallet}:{market}:{timestamp}:{amount}.
 * Emits 'new-trade' events with fully populated DetectedTrade objects.
 *
 * Per-trader error isolation: if one trader's API call fails, the error is logged
 * and monitoring continues for all other traders.
 */

import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { fetchTradeHistory } from '../api/polymarket-data-api';
import type { LeaderboardMonitor } from './leaderboard-monitor';
import type { DetectedTrade } from '../models/types';
import type { TradeHistoryEntry } from '../models/db-models';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Polling interval: 30 seconds in milliseconds. */
const POLL_INTERVAL_MS = 30_000;

// ─── Interface ────────────────────────────────────────────────────────────────

export interface TradeMonitor {
  start(): Promise<void>;
  stop(): void;
  on(event: 'new-trade', handler: (trade: DetectedTrade) => void): void;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class TradeMonitorImpl extends EventEmitter implements TradeMonitor {
  private readonly leaderboardMonitor: LeaderboardMonitor;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /** In-memory set of seen tradeIds for deduplication. Trimmed to MAX_SEEN. */
  private readonly seenTradeIds = new Set<string>();
  private static readonly MAX_SEEN = 10_000;

  constructor(leaderboardMonitor: LeaderboardMonitor) {
    super();
    this.leaderboardMonitor = leaderboardMonitor;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Starts the trade monitor.
   * Performs an immediate first poll, then sets up a 30-second interval.
   */
  async start(): Promise<void> {
    if (this.intervalHandle !== null) {
      console.warn('[TradeMonitor] Already running — ignoring start() call.');
      return;
    }

    console.info('[TradeMonitor] Starting — performing initial poll.');
    await this.poll();

    this.intervalHandle = setInterval(() => {
      void this.poll();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stops the trade monitor and cancels the polling interval.
   */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    console.info('[TradeMonitor] Stopped.');
  }

  // ─── Polling ─────────────────────────────────────────────────────────────────

  /**
   * Performs a single poll cycle over all current top traders.
   * Each trader's fetch is wrapped in a try/catch for error isolation.
   */
  private async poll(): Promise<void> {
    const traders = this.leaderboardMonitor.getTopTraders();

    if (traders.length === 0) {
      console.info('[TradeMonitor] No top traders to monitor — skipping poll.');
      return;
    }

    await Promise.all(
      traders.map(async (trader) => {
        try {
          const entries = await fetchTradeHistory(trader.proxyWallet);
          this.processEntries(trader.proxyWallet, trader.name, entries);
        } catch (error) {
          console.error(
            `[TradeMonitor] Error fetching trade history for trader ${trader.name} ` +
              `(${trader.proxyWallet}): ` +
              `${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue monitoring other traders — error is isolated per trader
        }
      }),
    );
  }

  // ─── Trade Processing ─────────────────────────────────────────────────────────

  /**
   * Processes a list of trade history entries for a given trader.
   * Deduplicates, validates, and emits 'new-trade' for each new valid trade.
   *
   * @param traderWallet - The proxy wallet address of the trader.
   * @param traderName   - The display name of the trader.
   * @param entries      - Raw trade history entries from the API.
   */
  private processEntries(
    traderWallet: string,
    traderName: string,
    entries: TradeHistoryEntry[],
  ): void {
    for (const entry of entries) {
      const tradeId = computeTradeId(traderWallet, entry);

      // Skip already-seen trades
      if (this.seenTradeIds.has(tradeId)) {
        continue;
      }

      // Trim oldest entries when Set grows too large
      if (this.seenTradeIds.size > TradeMonitorImpl.MAX_SEEN) {
        const it = this.seenTradeIds.values();
        for (let i = 0; i < this.seenTradeIds.size - TradeMonitorImpl.MAX_SEEN / 2; i++) {
          this.seenTradeIds.delete(it.next().value!);
        }
      }

      // Mark as seen before validation to avoid re-processing invalid entries
      this.seenTradeIds.add(tradeId);

      // Validate all required fields
      if (!isValidEntry(entry)) {
        console.warn(
          `[TradeMonitor] Skipping trade with missing required fields for trader ` +
            `${traderName} (${traderWallet}). Entry: ${JSON.stringify(entry)}`,
        );
        continue;
      }

      const detectedTrade: DetectedTrade = {
        traderWallet,
        traderName,
        action: entry.action,
        market: entry.market,
        conditionId: entry.conditionId,
        outcome: entry.outcome,
        tokenId: entry.tokenId,
        amount: entry.amount,
        price: entry.price,
        timestamp: new Date(entry.timestamp),
        tradeId,
      };

      this.emit('new-trade', detectedTrade);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Computes a SHA-256 hash of `{traderWallet}:{market}:{timestamp}:{amount}`
 * to serve as a unique, stable trade identifier for deduplication.
 *
 * @param traderWallet - The proxy wallet address of the trader.
 * @param entry        - The raw trade history entry.
 * @returns Hex-encoded SHA-256 hash string.
 */
export function computeTradeId(traderWallet: string, entry: TradeHistoryEntry): string {
  const raw = `${traderWallet}:${entry.market}:${entry.timestamp}:${entry.amount}`;
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Validates that all required fields of a TradeHistoryEntry are present and non-empty.
 *
 * Required fields: timestamp, market, action, price, amount.
 * Additionally, conditionId, outcome, and tokenId must be present.
 *
 * @param entry - The raw trade history entry to validate.
 * @returns `true` if all required fields are present and non-empty; `false` otherwise.
 */
export function isValidEntry(entry: TradeHistoryEntry): boolean {
  if (!entry.timestamp || typeof entry.timestamp !== 'string' || entry.timestamp.trim() === '') {
    return false;
  }
  if (!entry.market || typeof entry.market !== 'string' || entry.market.trim() === '') {
    return false;
  }
  if (!entry.action || (entry.action !== 'BUY' && entry.action !== 'SELL')) {
    return false;
  }
  if (entry.price === null || entry.price === undefined || typeof entry.price !== 'number') {
    return false;
  }
  if (entry.amount === null || entry.amount === undefined || typeof entry.amount !== 'number') {
    return false;
  }
  return true;
}

