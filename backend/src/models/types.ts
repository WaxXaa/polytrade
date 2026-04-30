/**
 * Core TypeScript domain interfaces and types for the Polymarket Copy Trading Agent.
 */

// ─── Leaderboard & Trader ────────────────────────────────────────────────────

export interface TopTrader {
  name: string;
  proxyWallet: string;
  pnl: number;
  volume: number;
  markets: number;
  rank: number;
  /** Weight based on recent performance (0–1) */
  confidenceWeight: number;
  /** Consecutive losing streak */
  consecutiveLosses: number;
  lastUpdated: Date;
}

export interface TraderChange {
  type: 'added' | 'removed';
  trader: TopTrader;
  previousRank?: number;
  timestamp: Date;
}

// ─── Trade Detection ─────────────────────────────────────────────────────────

export interface DetectedTrade {
  traderWallet: string;
  traderName: string;
  action: 'BUY' | 'SELL';
  market: string;
  conditionId: string;
  outcome: string;
  tokenId: string;
  /** Amount in USDC */
  amount: number;
  price: number;
  timestamp: Date;
  /** Unique ID for deduplication */
  tradeId: string;
}

// ─── Position Calculator ─────────────────────────────────────────────────────

export interface PositionCalcParams {
  /** Amount of the top trader's operation */
  tradeAmount: number;
  /** Estimated capital of the top trader */
  traderEstimatedCapital: number;
  /** User's USDC balance */
  userBalance: number;
  /** Trader confidence weight (0–1) */
  confidenceWeight: number;
  /** Multiplier for convergent signal (1.0–1.5) */
  signalMultiplier: number;
}

export interface PositionResult {
  /** Final amount in USDC */
  amount: number;
  /** Whether the 10% cap was applied */
  wasLimited: boolean;
  /** Whether the trade was discarded (< 1 USDC) */
  wasDiscarded: boolean;
  discardReason?: string;
  /** Capital ratio used in the calculation */
  ratioCapital: number;
}

// ─── AI Decision Engine ──────────────────────────────────────────────────────

export interface TradeContext {
  detectedTrade: DetectedTrade;
  /** Recent trades in the same market */
  recentSignals: DetectedTrade[];
  traderProfile: TopTrader;
  marketSpread: number;
  userBalance: number;
  openPositions: Position[];
  riskLimits: RiskConfig;
}

export interface TradeDecision {
  action: 'execute' | 'postpone' | 'discard';
  adjustedAmount?: number;
  signalMultiplier: number;
  reasoning: string;
  factors: DecisionFactor[];
  postponeUntil?: Date;
}

export interface DecisionFactor {
  name: string;
  value: number | string;
  impact: 'positive' | 'negative' | 'neutral';
}

// ─── Risk Management ─────────────────────────────────────────────────────────

export interface RiskConfig {
  /** Default: 50 */
  maxExposurePercent: number;
  /** Default: 15 */
  stopLossPercent: number;
  /** Default: 20 */
  maxTradesPerHour: number;
  /** Default: 10 */
  maxPositionPercent: number;
  /** Default: 1 USDC */
  minTradeAmount: number;
  /** Default: 5 USDC */
  minBalance: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxExposurePercent: 50,
  stopLossPercent: 15,
  maxTradesPerHour: 20,
  maxPositionPercent: 10,
  minTradeAmount: 1,
  minBalance: 5,
};

export interface RiskCheck {
  allowed: boolean;
  reason?: string;
  currentExposure: number;
  maxExposure: number;
}

export interface StopLossAction {
  positionId: string;
  market: string;
  currentLossPercent: number;
  action: 'close';
}

// ─── Trade Execution ─────────────────────────────────────────────────────────

export interface OrderParams {
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  conditionId: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedSize?: number;
  error?: string;
  timestamp: Date;
}

// ─── Position (referenced by TradeContext) ───────────────────────────────────

export interface Position {
  id: string;
  market: string;
  conditionId: string;
  tokenId: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  size: number;
  topTraderWallet: string;
  openedAt: Date;
  stopLossLevel: number;
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export interface TradeExecutionEvent {
  trade: DetectedTrade;
  decision: TradeDecision;
  orderResult: OrderResult;
}

export interface RiskAlert {
  type: 'exposure-limit' | 'stop-loss' | 'trade-limit' | 'low-balance';
  message: string;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export interface PositionUpdate {
  position: Position;
  changeType: 'opened' | 'closed' | 'updated';
  currentPnl?: number;
}

export interface BalanceUpdate {
  previousBalance: number;
  currentBalance: number;
  timestamp: Date;
}

export interface StopLossEvent {
  action: StopLossAction;
  orderResult: OrderResult;
}

export interface AgentStatus {
  running: boolean;
  topTradersCount: number;
  openPositionsCount: number;
  tradesLastHour: number;
  lastLeaderboardUpdate: Date | null;
  lastTradeCheck: Date | null;
}

export type WSEvent =
  | { type: 'trade-executed'; data: TradeExecutionEvent }
  | { type: 'traders-updated'; data: TraderChange[] }
  | { type: 'risk-alert'; data: RiskAlert }
  | { type: 'position-update'; data: PositionUpdate }
  | { type: 'balance-update'; data: BalanceUpdate }
  | { type: 'stop-loss-triggered'; data: StopLossEvent }
  | { type: 'agent-status'; data: AgentStatus };

