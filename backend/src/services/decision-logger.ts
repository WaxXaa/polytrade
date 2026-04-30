/**
 * DecisionLogger service for persisting risk and AI decision records.
 * Logs all significant decisions (risk limits, stop-loss, AI signals) to the
 * decision_log table for auditability and debugging.
 */

import { randomUUID } from 'crypto';
import { db, decisionLog } from '../db/index';

// ─── Decision Type Constants ──────────────────────────────────────────────────

export const DecisionTypes = {
  EXPOSURE_LIMIT: 'EXPOSURE_LIMIT',
  STOP_LOSS_TRIGGERED: 'STOP_LOSS_TRIGGERED',
  TRADE_LIMIT_PAUSED: 'TRADE_LIMIT_PAUSED',
  LOW_BALANCE_PAUSED: 'LOW_BALANCE_PAUSED',
  AI_CONVERGENT_SIGNAL: 'AI_CONVERGENT_SIGNAL',
  AI_LOSING_STREAK: 'AI_LOSING_STREAK',
  AI_SPREAD_THRESHOLD: 'AI_SPREAD_THRESHOLD',
  AI_POSITION_ADJUSTED: 'AI_POSITION_ADJUSTED',
} as const;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LogDecisionParams {
  /** Decision category, e.g. 'EXPOSURE_LIMIT', 'STOP_LOSS_TRIGGERED' */
  decisionType: string;
  /** Human-readable explanation of why this decision was made */
  reasoning: string;
  /** The data that led to this decision — will be JSON.stringify'd */
  inputData: unknown;
  /** What happened as a result of this decision */
  outcome: string;
  /** Optional reference to a trade in trade_history */
  relatedTradeId?: string;
}

export interface DecisionLogger {
  logDecision(params: LogDecisionParams): Promise<void>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class DecisionLoggerImpl implements DecisionLogger {
  /**
   * Persists a decision record to the decision_log table.
   *
   * DB errors are caught and logged to console — logging failures must never
   * crash the agent.
   */
  async logDecision(params: LogDecisionParams): Promise<void> {
    const { decisionType, reasoning, inputData, outcome, relatedTradeId } =
      params;

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const inputDataJson = JSON.stringify(inputData);

    try {
      await db.insert(decisionLog).values({
        id,
        timestamp,
        decisionType,
        reasoning,
        inputData: inputDataJson,
        outcome,
        relatedTradeId: relatedTradeId ?? null,
      });
    } catch (error) {
      // Logging failures must not crash the agent — only log to console.
      console.error('[DecisionLogger] Failed to persist decision record:', {
        decisionType,
        error,
      });
    }
  }
}

