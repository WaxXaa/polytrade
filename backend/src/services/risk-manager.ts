/**
 * RiskManager service
 *
 * Manages risk limits, stop-loss evaluation, and operational restrictions:
 *  - Exposure limit: total open position value must not exceed a configured % of user balance
 *  - Stop-loss: close positions when unrealised loss reaches the configured threshold
 *  - Trade rate limit: sliding-window cap on executions per hour
 *
 * Configuration is loaded from the `user_config` DB table (id='default') on
 * construction, falling back to DEFAULT_RISK_CONFIG when no record is found.
 * Runtime updates are supported via `setConfig()`.
 */

import { eq } from 'drizzle-orm';
import { db, userConfig } from '../db/index';
import {
  DEFAULT_RISK_CONFIG,
  type Position,
  type RiskCheck,
  type RiskConfig,
  type StopLossAction,
} from '../models/types';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface RiskManager {
  /** Checks whether a new position of `amount` USDC can be opened. */
  canOpenPosition(amount: number, userBalance: number): RiskCheck;

  /**
   * Evaluates stop-loss for every supplied position.
   * Returns an array of close actions for positions that have breached the
   * configured stop-loss threshold.
   */
  evaluateStopLoss(
    positions: Position[],
    currentPrices: Map<string, number>,
  ): StopLossAction[];

  /** Returns true when the hourly trade limit has not yet been reached. */
  canExecuteTrade(): boolean;

  /** Records a trade execution in the sliding-window counter. */
  recordExecution(): void;

  /** Returns the number of trade executions in the last hour. */
  getExecutionsLastHour(): number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Sliding-window duration in milliseconds (1 hour). */
const ONE_HOUR_MS = 3_600_000;

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Concrete implementation of the RiskManager interface.
 *
 * Usage:
 *   const rm = new RiskManagerImpl();
 *   await rm.loadConfig();          // optional – loads from DB
 *   rm.setOpenPositions(positions); // keep in sync with current state
 */
export class RiskManagerImpl implements RiskManager {
  private config: RiskConfig;
  private openPositions: Position[] = [];

  /**
   * Timestamps (ms since epoch) of recent trade executions.
   * Used as a sliding window to enforce the hourly trade limit.
   */
  private executionTimestamps: number[] = [];

  /**
   * @param config - Optional initial configuration. When omitted the caller
   *   should invoke `loadConfig()` to fetch from the database.
   */
  constructor(config?: RiskConfig) {
    this.config = config ?? { ...DEFAULT_RISK_CONFIG };
  }

  // ─── Config management ──────────────────────────────────────────────────────

  /**
   * Loads risk configuration from the `user_config` table (id='default').
   * Falls back to DEFAULT_RISK_CONFIG when no record is found.
   */
  async loadConfig(): Promise<void> {
    try {
      const rows = await db
        .select()
        .from(userConfig)
        .where(eq(userConfig.id, 'default'))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0]!;
        this.config = {
          maxExposurePercent: row.maxExposurePercent,
          stopLossPercent: row.stopLossPercent,
          maxTradesPerHour: row.maxTradesPerHour,
          maxPositionPercent: row.maxPositionPercent,
          // Fields not stored in DB use defaults
          minTradeAmount: DEFAULT_RISK_CONFIG.minTradeAmount,
          minBalance: DEFAULT_RISK_CONFIG.minBalance,
        };
      }
      // If no row found, keep the current config (default or constructor-supplied)
    } catch (err) {
      // Log and fall back to defaults — DB errors must not crash the service
      console.error('[RiskManager] Failed to load config from DB, using defaults:', err);
      this.config = { ...DEFAULT_RISK_CONFIG };
    }
  }

  /**
   * Replaces the active configuration at runtime (e.g. after a user update).
   */
  setConfig(config: RiskConfig): void {
    this.config = { ...config };
  }

  /** Returns a copy of the current configuration. */
  getConfig(): RiskConfig {
    return { ...this.config };
  }

  // ─── Open positions tracking ────────────────────────────────────────────────

  /**
   * Updates the internal list of open positions used by `canOpenPosition()`.
   * Should be called whenever the set of open positions changes.
   */
  setOpenPositions(positions: Position[]): void {
    this.openPositions = [...positions];
  }

  // ─── RiskManager interface ──────────────────────────────────────────────────

  /**
   * Checks whether a new position of `amount` USDC can be opened without
   * breaching the configured maximum exposure limit.
   *
   * Total exposure = sum of (position.size * position.entryPrice) for all
   * currently open positions.
   *
   * The trade is allowed when:
   *   totalExposure + amount <= userBalance * (maxExposurePercent / 100)
   */
  canOpenPosition(amount: number, userBalance: number): RiskCheck {
    const currentExposure = this.openPositions.reduce(
      (sum, pos) => sum + pos.size * pos.entryPrice,
      0,
    );

    const maxExposure = userBalance * (this.config.maxExposurePercent / 100);

    if (currentExposure + amount > maxExposure) {
      return {
        allowed: false,
        reason: 'Exposure limit reached',
        currentExposure,
        maxExposure,
      };
    }

    return {
      allowed: true,
      currentExposure,
      maxExposure,
    };
  }

  /**
   * Evaluates stop-loss for each supplied position.
   *
   * For each position:
   *   lossPercent = (entryPrice - currentPrice) / entryPrice * 100
   *
   * A close action is generated when lossPercent >= config.stopLossPercent.
   * Positions whose tokenId is not present in `currentPrices` are skipped.
   */
  evaluateStopLoss(
    positions: Position[],
    currentPrices: Map<string, number>,
  ): StopLossAction[] {
    const actions: StopLossAction[] = [];

    for (const position of positions) {
      const currentPrice = currentPrices.get(position.tokenId);

      // Skip positions with no price data
      if (currentPrice === undefined) {
        continue;
      }

      const lossPercent =
        ((position.entryPrice - currentPrice) / position.entryPrice) * 100;

      if (lossPercent >= this.config.stopLossPercent) {
        actions.push({
          positionId: position.id,
          market: position.market,
          currentLossPercent: lossPercent,
          action: 'close',
        });
      }
    }

    return actions;
  }

  /**
   * Returns true when the number of executions recorded in the last hour is
   * strictly below the configured `maxTradesPerHour` limit.
   *
   * Stale timestamps (older than 1 hour) are pruned on every call.
   */
  canExecuteTrade(): boolean {
    this.pruneStaleTimestamps();
    return this.executionTimestamps.length < this.config.maxTradesPerHour;
  }

  /**
   * Records the current moment as a trade execution in the sliding window.
   * Call this immediately after a trade is successfully submitted.
   */
  recordExecution(): void {
    this.executionTimestamps.push(Date.now());
  }

  /**
   * Returns the number of trade executions recorded in the last hour.
   * Prunes stale timestamps before counting.
   */
  getExecutionsLastHour(): number {
    this.pruneStaleTimestamps();
    return this.executionTimestamps.length;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Removes timestamps that fall outside the 1-hour sliding window.
   * Mutates `this.executionTimestamps` in place.
   */
  private pruneStaleTimestamps(): void {
    const cutoff = Date.now() - ONE_HOUR_MS;
    this.executionTimestamps = this.executionTimestamps.filter(
      (ts) => ts > cutoff,
    );
  }
}

