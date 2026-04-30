/**
 * Frontend type definitions mirroring the backend WSEvent types.
 */

export interface TopTrader {
  name: string;
  proxyWallet: string;
  pnl: number;
  volume: number;
  markets: number;
  rank: number;
  confidenceWeight: number;
  consecutiveLosses: number;
  lastUpdated: string;
}

export interface TraderChange {
  type: 'added' | 'removed';
  trader: TopTrader;
  previousRank?: number;
  timestamp: string;
}

export interface DetectedTrade {
  traderWallet: string;
  traderName: string;
  action: 'BUY' | 'SELL';
  market: string;
  conditionId: string;
  outcome: string;
  tokenId: string;
  amount: number;
  price: number;
  timestamp: string;
  tradeId: string;
}

export interface TradeDecision {
  action: 'execute' | 'postpone' | 'discard';
  adjustedAmount?: number;
  signalMultiplier: number;
  reasoning: string;
  factors: Array<{ name: string; value: number | string; impact: 'positive' | 'negative' | 'neutral' }>;
  postponeUntil?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  executedPrice?: number;
  executedSize?: number;
  error?: string;
  timestamp: string;
}

export interface Position {
  id: string;
  market: string;
  conditionId: string;
  tokenId: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  size: number;
  topTraderWallet: string;
  openedAt: string;
  stopLossLevel: number;
}

export interface RiskAlert {
  type: 'exposure-limit' | 'stop-loss' | 'trade-limit' | 'low-balance';
  message: string;
  severity: 'warning' | 'critical';
  timestamp: string;
}

export interface AgentStatus {
  running: boolean;
  topTradersCount: number;
  openPositionsCount: number;
  tradesLastHour: number;
  lastLeaderboardUpdate: string | null;
  lastTradeCheck: string | null;
}

export type WSEvent =
  | { type: 'trade-executed'; data: { trade: DetectedTrade; decision: TradeDecision; orderResult: OrderResult } }
  | { type: 'traders-updated'; data: TraderChange[] }
  | { type: 'risk-alert'; data: RiskAlert }
  | { type: 'position-update'; data: { position: Position; changeType: 'opened' | 'closed' | 'updated'; currentPnl?: number } }
  | { type: 'balance-update'; data: { previousBalance: number; currentBalance: number; timestamp: string } }
  | { type: 'stop-loss-triggered'; data: { action: { positionId: string; market: string; currentLossPercent: number; action: 'close' }; orderResult: OrderResult } }
  | { type: 'agent-status'; data: AgentStatus };

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

export interface TradeHistoryItem {
  id: string;
  timestamp: string;
  market: string;
  direction: 'BUY' | 'SELL';
  amount: number;
  price: number;
  topTraderName: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  signalMultiplier: number;
}
