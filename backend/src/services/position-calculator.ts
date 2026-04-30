/**
 * PositionCalculator service
 *
 * Calculates proportional trade sizes based on the user's balance relative
 * to the top trader's estimated capital, applying confidence weights and
 * signal multipliers, then enforcing minimum and maximum position limits.
 */

import type { PositionCalcParams, PositionResult } from '../models/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum trade amount in USDC. Trades below this are discarded. */
const MIN_TRADE_AMOUNT_USDC = 1;

/** Maximum position size as a fraction of the user's balance (10%). */
const MAX_POSITION_FRACTION = 0.10;

// ─── Interface ────────────────────────────────────────────────────────────────

export interface PositionCalculator {
  /**
   * Calculates the proportional position size for a copy trade.
   *
   * Formula: tradeAmount * (userBalance / traderEstimatedCapital) * confidenceWeight * signalMultiplier
   *
   * Constraints:
   *  - If the raw amount < 1 USDC → discard the trade.
   *  - If the raw amount > 10% of userBalance → cap at 10% of userBalance.
   */
  calculateProportionalPosition(params: PositionCalcParams): PositionResult;
}

// ─── Standalone function ──────────────────────────────────────────────────────

/**
 * Pure, deterministic function that calculates a proportional position size.
 * Exported for easy unit and property-based testing.
 *
 * Same inputs always produce the same output — no randomness, no side effects.
 */
export function calculateProportionalPosition(params: PositionCalcParams): PositionResult {
  const {
    tradeAmount,
    traderEstimatedCapital,
    userBalance,
    confidenceWeight,
    signalMultiplier,
  } = params;

  // Step 1: Compute the capital ratio
  const ratioCapital = userBalance / traderEstimatedCapital;

  // Step 2: Compute the raw proportional amount
  const rawAmount = tradeAmount * ratioCapital * confidenceWeight * signalMultiplier;

  // Step 3: Discard if below minimum trade amount (1 USDC)
  if (rawAmount < MIN_TRADE_AMOUNT_USDC) {
    return {
      amount: 0,
      wasLimited: false,
      wasDiscarded: true,
      discardReason: 'Amount below minimum (1 USDC)',
      ratioCapital,
    };
  }

  // Step 4: Compute the maximum allowed position (10% of user balance)
  const maxAllowed = userBalance * MAX_POSITION_FRACTION;

  // Step 5: Cap at maximum if needed
  if (rawAmount > maxAllowed) {
    return {
      amount: maxAllowed,
      wasLimited: true,
      wasDiscarded: false,
      ratioCapital,
    };
  }

  // Step 6: Return the uncapped amount
  return {
    amount: rawAmount,
    wasLimited: false,
    wasDiscarded: false,
    ratioCapital,
  };
}

// ─── Class implementation ─────────────────────────────────────────────────────

/**
 * Concrete implementation of the PositionCalculator interface.
 * Delegates to the standalone `calculateProportionalPosition` function.
 */
export class PositionCalculatorImpl implements PositionCalculator {
  calculateProportionalPosition(params: PositionCalcParams): PositionResult {
    return calculateProportionalPosition(params);
  }
}

