/**
 * Database entity types for the Polymarket Copy Trading Agent.
 * These types map directly to the database schema tables.
 */

// ─── Trade History ────────────────────────────────────────────────────────────

export interface TradeRecord {
  id: string;
  timestamp: Date;
  market: string;
  conditionId: string;
  direction: 'BUY' | 'SELL';
  amount: number;
  price: number;
  topTraderWallet: string;
  topTraderName: string;
  orderId: string | null;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  failReason: string | null;
  decisionReasoning: string;
  signalMultiplier: number;
  confidenceWeight: number;
}

// ─── User Configuration ───────────────────────────────────────────────────────

export interface UserConfig {
  id: string;
  maxExposurePercent: number;
  stopLossPercent: number;
  maxTradesPerHour: number;
  maxPositionPercent: number;
  updatedAt: Date;
}

// ─── Open Positions ───────────────────────────────────────────────────────────

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

// ─── Daily Metrics ────────────────────────────────────────────────────────────

export interface DailyMetrics {
  id: string;
  date: string;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgExposure: number;
}

// ─── Leaderboard API Response ─────────────────────────────────────────────────

export interface LeaderboardEntry {
  name: string;
  proxyWallet: string;
  pnl: number;
  volume: number;
  markets: number;
}

// ─── Trade History API Response ───────────────────────────────────────────────

export interface TradeHistoryEntry {
  action: 'BUY' | 'SELL';
  market: string;
  outcome: string;
  amount: number;
  price: number;
  timestamp: string;
  conditionId: string;
  tokenId: string;
}

// ─── Decision Log ─────────────────────────────────────────────────────────────

export interface DecisionLog {
  id: string;
  timestamp: Date;
  decisionType: string;
  reasoning: string;
  inputData: string;
  outcome: string;
  relatedTradeId: string | null;
}

