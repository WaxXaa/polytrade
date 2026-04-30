export interface Trader {
  rank: string;
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
}

export interface Market {
  id: string;
  question: string;
  description?: string;
  active: boolean;
  closed: boolean;
  startDate: string;
  endDate: string;
  outcomeTokenIds: string[];
  clobTokenIds: string[];
  volume: string;
  volumeNum: number;
  liquidityNum: number;
  lastTradePrice: string;
  bestBid: string;
  bestAsk: string;
  lastUpdate: string;
}

export interface TradeSignal {
  id: string;
  trader: Trader;
  market: Market;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'executed' | 'failed' | 'skipped';
}

export interface UserPosition {
  id: string;
  marketId: string;
  marketQuestion: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  timestamp: number;
}

export interface UserConfig {
  userAddress: string;
  maxRiskPerTrade: number;
  maxDailyRisk: number;
  stopLossPercent: number;
  trailingStop: boolean;
  trailingPercent: number;
  maxTradesPerDay: number;
  minPositionSize: number;
  maxPositionSize: number;
  followedTraders: string[];
  autoExecute: boolean;
}

export interface WalletState {
  address: string;
  balanceUSDC: number;
  balancePOL: number;
  connected: boolean;
}

export interface WebSocketEvents {
  leaderboard: Trader[];
  trade_signal: TradeSignal;
  market_update: { marketId: string; price: number; bid: number; ask: number };
  position_update: UserPosition;
  wallet_update: WalletState;
  order_status: { orderId: string; status: string; filled: number };
}