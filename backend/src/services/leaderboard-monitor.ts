/**
 * LeaderboardMonitor service for the Polymarket Copy Trading Agent.
 *
 * Polls the Polymarket Data API every 15 minutes to maintain the top 10 trader list.
 * Emits 'traders-updated' events when the list changes, and persists changes to the DB.
 *
 * On API failure: retains the last valid list and applies exponential backoff.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { fetchLeaderboard } from '../api/polymarket-data-api';
import { db, topTraderHistory } from '../db/index';
import type { TopTrader, TraderChange } from '../models/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Polling interval: 15 minutes in milliseconds. */
const POLL_INTERVAL_MS = 900_000;

/** Initial backoff delay on API failure: 1 second. */
const INITIAL_BACKOFF_MS = 1_000;

/** Maximum backoff delay on API failure: 5 minutes. */
const MAX_BACKOFF_MS = 300_000;

// ─── Interface ────────────────────────────────────────────────────────────────

export interface LeaderboardMonitor {
  start(): Promise<void>;
  stop(): void;
  getTopTraders(): TopTrader[];
  on(event: 'traders-updated', handler: (changes: TraderChange[]) => void): void;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class LeaderboardMonitorImpl extends EventEmitter implements LeaderboardMonitor {
  private topTraders: TopTrader[] = [];
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private consecutiveFailures = 0;
  private backoffHandle: ReturnType<typeof setTimeout> | null = null;

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Starts the leaderboard monitor.
   * Performs an immediate first poll, then sets up a 15-minute interval.
   */
  async start(): Promise<void> {
    if (this.intervalHandle !== null) {
      console.warn('[LeaderboardMonitor] Already running — ignoring start() call.');
      return;
    }

    console.info('[LeaderboardMonitor] Starting — performing initial poll.');
    await this.poll();

    this.intervalHandle = setInterval(() => {
      void this.poll();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stops the leaderboard monitor and cancels any pending timers.
   */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.backoffHandle !== null) {
      clearTimeout(this.backoffHandle);
      this.backoffHandle = null;
    }
    console.info('[LeaderboardMonitor] Stopped.');
  }

  /**
   * Returns the current list of top traders (snapshot of the last successful poll).
   */
  getTopTraders(): TopTrader[] {
    return [...this.topTraders];
  }

  // ─── Polling ─────────────────────────────────────────────────────────────────

  /**
   * Performs a single leaderboard poll.
   * On success: reconciles the new snapshot with the previous one.
   * On failure: retains the last valid list and schedules a backoff retry.
   */
  private async poll(): Promise<void> {
    try {
      const entries = await fetchLeaderboard('all', 10, 0);

      const now = new Date();
      const newSnapshot: TopTrader[] = entries.map((entry, index) => ({
        name: entry.name,
        proxyWallet: entry.proxyWallet,
        pnl: entry.pnl,
        volume: entry.volume,
        markets: entry.markets,
        rank: index + 1,
        confidenceWeight: 1.0,
        consecutiveLosses: 0,
        lastUpdated: now,
      }));

      await this.reconcile(newSnapshot);

      // Reset failure counter on success
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures++;
      const delay = Math.min(
        INITIAL_BACKOFF_MS * Math.pow(2, this.consecutiveFailures - 1),
        MAX_BACKOFF_MS,
      );

      console.error(
        `[LeaderboardMonitor] Poll failed (attempt ${this.consecutiveFailures}). ` +
          `Retaining last valid list. Backoff retry in ${delay}ms. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Schedule a backoff retry (in addition to the regular interval)
      if (this.backoffHandle !== null) {
        clearTimeout(this.backoffHandle);
      }
      this.backoffHandle = setTimeout(() => {
        this.backoffHandle = null;
        void this.poll();
      }, delay);
    }
  }

  // ─── Reconciliation ──────────────────────────────────────────────────────────

  /**
   * Compares the new snapshot with the previous one.
   * Emits 'traders-updated' with the list of changes (additions and removals).
   * Persists each change to the top_trader_history table.
   */
  private async reconcile(newSnapshot: TopTrader[]): Promise<void> {
    const previous = this.topTraders;

    const previousByWallet = new Map<string, TopTrader>(
      previous.map((t) => [t.proxyWallet, t]),
    );
    const newByWallet = new Map<string, TopTrader>(
      newSnapshot.map((t) => [t.proxyWallet, t]),
    );

    const changes: TraderChange[] = [];
    const now = new Date();

    // Detect additions: traders in new snapshot but not in previous
    for (const [wallet, trader] of newByWallet) {
      if (!previousByWallet.has(wallet)) {
        changes.push({
          type: 'added',
          trader,
          timestamp: now,
        });
      }
    }

    // Detect removals: traders in previous snapshot but not in new
    for (const [wallet, trader] of previousByWallet) {
      if (!newByWallet.has(wallet)) {
        changes.push({
          type: 'removed',
          trader,
          previousRank: trader.rank,
          timestamp: now,
        });
      }
    }

    // Update the active trader list to match the new snapshot
    this.topTraders = newSnapshot;

    // Persist changes to DB and emit event only if there are changes
    if (changes.length > 0) {
      await this.persistChanges(changes, now);
      this.emit('traders-updated', changes);
    }
  }

  // ─── DB Persistence ──────────────────────────────────────────────────────────

  /**
   * Persists each TraderChange to the top_trader_history table.
   */
  private async persistChanges(changes: TraderChange[], now: Date): Promise<void> {
    const timestamp = now.toISOString();

    for (const change of changes) {
      try {
        await db.insert(topTraderHistory).values({
          id: randomUUID(),
          timestamp,
          traderWallet: change.trader.proxyWallet,
          traderName: change.trader.name,
          changeType: change.type === 'added' ? 'ADDED' : 'REMOVED',
          previousRank: change.type === 'removed' ? (change.previousRank ?? null) : null,
          newRank: change.type === 'added' ? change.trader.rank : null,
        });
      } catch (dbError) {
        console.error(
          `[LeaderboardMonitor] Failed to persist trader change for wallet ${change.trader.proxyWallet}: ` +
            `${dbError instanceof Error ? dbError.message : String(dbError)}`,
        );
        // Log and continue — DB errors should not block the in-memory state update or event emission
      }
    }
  }
}

