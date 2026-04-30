/**
 * AIDecisionEngine service — implements intelligent trading decisions beyond
 * simple copy trading.
 *
 * Implements:
 *  - Convergent signal detection (Property 10 / Requirement 8.1)
 *  - Losing streak tracking with confidence reduction (Property 11 / Requirement 8.2)
 *  - Market spread threshold enforcement (Property 12 / Requirement 8.4)
 *  - Full decision logging for auditability (Requirement 8.5)
 */

import {
  TradeContext,
  TradeDecision,
  DecisionFactor,
} from '../models/types';
import {
  DecisionLogger,
  DecisionTypes,
} from './decision-logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TradeResult = 'WIN' | 'LOSS';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Window in milliseconds for convergent signal detection (5 minutes). */
const CONVERGENT_SIGNAL_WINDOW_MS = 5 * 60 * 1000;

/** Maximum signal multiplier when convergent signals are detected. */
const MAX_SIGNAL_MULTIPLIER = 1.5;

/** Default signal multiplier (no convergence). */
const DEFAULT_SIGNAL_MULTIPLIER = 1.0;

/** Number of consecutive losses that triggers confidence reduction. */
const LOSING_STREAK_THRESHOLD = 3;

/** Confidence adjustment factor applied when a losing streak is detected. */
const LOSING_STREAK_CONFIDENCE_FACTOR = 0.5;

/** Spread percentage above which a trade is postponed. */
const MAX_SPREAD_PERCENT = 5;

/** How long (ms) to postpone a trade when spread is too high (10 minutes). */
const SPREAD_POSTPONE_DURATION_MS = 10 * 60 * 1000;

// ─── Interface ────────────────────────────────────────────────────────────────

export interface AIDecisionEngine {
  /**
   * Evaluates whether to execute, postpone, or discard a detected trade.
   * Returns a TradeDecision with adjusted amount, reasoning, and factors.
   */
  evaluateTrade(context: TradeContext): Promise<TradeDecision>;

  /**
   * Records the outcome of a trade for a given trader wallet.
   * Used to track consecutive losses and adjust confidence weights.
   */
  updateTraderPerformance(wallet: string, tradeResult: TradeResult): void;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class AIDecisionEngineImpl implements AIDecisionEngine {
  /**
   * Internal map tracking consecutive losses per trader wallet.
   * Key: traderWallet, Value: number of consecutive losses.
   */
  private readonly consecutiveLossesMap = new Map<string, number>();

  constructor(private readonly decisionLogger: DecisionLogger) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  async evaluateTrade(context: TradeContext): Promise<TradeDecision> {
    const { detectedTrade, recentSignals, traderProfile, marketSpread } =
      context;

    const factors: DecisionFactor[] = [];

    // ── Step 1: Spread threshold check ──────────────────────────────────────
    if (marketSpread > MAX_SPREAD_PERCENT) {
      const postponeUntil = new Date(
        Date.now() + SPREAD_POSTPONE_DURATION_MS,
      );

      factors.push({
        name: 'market_spread',
        value: `${marketSpread}%`,
        impact: 'negative',
      });

      const decision: TradeDecision = {
        action: 'postpone',
        signalMultiplier: DEFAULT_SIGNAL_MULTIPLIER,
        reasoning: 'Market spread exceeds 5%',
        factors,
        postponeUntil,
      };

      await this.decisionLogger.logDecision({
        decisionType: DecisionTypes.AI_SPREAD_THRESHOLD,
        reasoning: `Market spread of ${marketSpread}% exceeds the 5% threshold. Trade postponed for 10 minutes.`,
        inputData: {
          traderWallet: detectedTrade.traderWallet,
          market: detectedTrade.market,
          marketSpread,
          postponeUntil: postponeUntil.toISOString(),
        },
        outcome: `postpone until ${postponeUntil.toISOString()}`,
      });

      return decision;
    }

    // ── Step 2: Convergent signal detection ──────────────────────────────────
    const signalMultiplier = this.computeSignalMultiplier(context);

    if (signalMultiplier > DEFAULT_SIGNAL_MULTIPLIER) {
      factors.push({
        name: 'convergent_signal',
        value: signalMultiplier,
        impact: 'positive',
      });

      await this.decisionLogger.logDecision({
        decisionType: DecisionTypes.AI_CONVERGENT_SIGNAL,
        reasoning: `Multiple top traders detected trading ${detectedTrade.action} on market ${detectedTrade.market} within 5 minutes. Signal multiplier: ${signalMultiplier}.`,
        inputData: {
          traderWallet: detectedTrade.traderWallet,
          market: detectedTrade.market,
          action: detectedTrade.action,
          signalMultiplier,
          recentSignalCount: recentSignals.length,
        },
        outcome: `signal_multiplier=${signalMultiplier}`,
      });
    } else {
      factors.push({
        name: 'convergent_signal',
        value: signalMultiplier,
        impact: 'neutral',
      });
    }

    // ── Step 3: Losing streak / confidence adjustment ─────────────────────
    const confidenceAdjustment = this.computeConfidenceAdjustment(
      traderProfile.proxyWallet,
      traderProfile.consecutiveLosses,
    );

    if (confidenceAdjustment < 1.0) {
      factors.push({
        name: 'losing_streak_penalty',
        value: confidenceAdjustment,
        impact: 'negative',
      });

      await this.decisionLogger.logDecision({
        decisionType: DecisionTypes.AI_LOSING_STREAK,
        reasoning: `Trader ${traderProfile.proxyWallet} has a losing streak. Confidence weight reduced to ${confidenceAdjustment * 100}%.`,
        inputData: {
          traderWallet: traderProfile.proxyWallet,
          consecutiveLossesProfile: traderProfile.consecutiveLosses,
          consecutiveLossesInternal:
            this.consecutiveLossesMap.get(traderProfile.proxyWallet) ?? 0,
          confidenceAdjustment,
        },
        outcome: `confidence_adjustment=${confidenceAdjustment}`,
      });
    } else {
      factors.push({
        name: 'confidence_weight',
        value: confidenceAdjustment,
        impact: 'neutral',
      });
    }

    // ── Step 4: Compute adjusted amount ──────────────────────────────────────
    const adjustedAmount =
      detectedTrade.amount * signalMultiplier * confidenceAdjustment;

    factors.push({
      name: 'adjusted_amount',
      value: adjustedAmount,
      impact: 'neutral',
    });

    // ── Step 5: Build reasoning string ───────────────────────────────────────
    const reasoningParts: string[] = [];

    if (signalMultiplier > DEFAULT_SIGNAL_MULTIPLIER) {
      reasoningParts.push(
        `Convergent signal detected (multiplier: ${signalMultiplier})`,
      );
    }
    if (confidenceAdjustment < 1.0) {
      reasoningParts.push(
        `Losing streak penalty applied (confidence: ${confidenceAdjustment * 100}%)`,
      );
    }
    if (reasoningParts.length === 0) {
      reasoningParts.push('Standard trade execution');
    }

    const reasoning = reasoningParts.join('; ');

    // ── Step 6: Log the final decision ───────────────────────────────────────
    await this.decisionLogger.logDecision({
      decisionType: DecisionTypes.AI_POSITION_ADJUSTED,
      reasoning,
      inputData: {
        traderWallet: detectedTrade.traderWallet,
        market: detectedTrade.market,
        action: detectedTrade.action,
        originalAmount: detectedTrade.amount,
        signalMultiplier,
        confidenceAdjustment,
        adjustedAmount,
      },
      outcome: `execute with adjustedAmount=${adjustedAmount}`,
    });

    return {
      action: 'execute',
      adjustedAmount,
      signalMultiplier,
      reasoning,
      factors,
    };
  }

  updateTraderPerformance(wallet: string, tradeResult: TradeResult): void {
    if (tradeResult === 'LOSS') {
      const current = this.consecutiveLossesMap.get(wallet) ?? 0;
      this.consecutiveLossesMap.set(wallet, current + 1);
    } else {
      // WIN resets the streak
      this.consecutiveLossesMap.set(wallet, 0);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Counts unique traders (excluding the current trade's trader) who have
   * traded the same market + action within the 5-minute convergence window.
   * Returns 1.5 if 2+ convergent traders are found, otherwise 1.0.
   */
  private computeSignalMultiplier(context: TradeContext): number {
    const { detectedTrade, recentSignals } = context;
    const windowStart = new Date(
      detectedTrade.timestamp.getTime() - CONVERGENT_SIGNAL_WINDOW_MS,
    );

    // Collect unique trader wallets (other than the current trader) that
    // traded the same market + action within the window.
    const convergentTraders = new Set<string>();

    for (const signal of recentSignals) {
      if (
        signal.market === detectedTrade.market &&
        signal.action === detectedTrade.action &&
        signal.timestamp >= windowStart &&
        signal.timestamp <= detectedTrade.timestamp &&
        signal.traderWallet !== detectedTrade.traderWallet
      ) {
        convergentTraders.add(signal.traderWallet);
      }
    }

    // If at least one OTHER trader also traded the same market/direction
    // within the window, we have 2+ total (current + at least one other).
    return convergentTraders.size >= 1
      ? MAX_SIGNAL_MULTIPLIER
      : DEFAULT_SIGNAL_MULTIPLIER;
  }

  /**
   * Returns 0.5 if the trader has 3+ consecutive losses (from either the
   * traderProfile or the internal tracking map), otherwise 1.0.
   */
  private computeConfidenceAdjustment(
    wallet: string,
    profileConsecutiveLosses: number,
  ): number {
    const internalLosses = this.consecutiveLossesMap.get(wallet) ?? 0;
    const effectiveLosses = Math.max(profileConsecutiveLosses, internalLosses);

    return effectiveLosses >= LOSING_STREAK_THRESHOLD
      ? LOSING_STREAK_CONFIDENCE_FACTOR
      : 1.0;
  }
}

