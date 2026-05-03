import { create } from 'zustand';
import type { TradeHistoryItem, RiskAlert, AgentStatus, DailyMetrics } from '@/types/ws-events';

export interface Trader {
  rank: string;
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
  following?: boolean;
}

export interface Market {
  id: string;
  question: string;
  active: boolean;
  closed: boolean;
  volumeNum: number;
  liquidityNum: number;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
}

export interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  timestamp: number;
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

export interface RiskConfig {
  maxRiskPerTrade: number;
  maxDailyRisk: number;
  stopLossPercent: number;
  trailingStop: boolean;
  trailingPercent: number;
  maxTradesPerDay: number;
  minPositionSize: number;
  maxPositionSize: number;
}

interface AppState {
  // Wallet
  walletAddress: string | null;
  walletConnected: boolean;
  setWalletAddress: (address: string | null) => void;
  setWalletConnected: (connected: boolean) => void;

  // WebSocket
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  setWsStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;

  // Balance
  balance: number;
  setBalance: (balance: number) => void;

  // Agent Status
  agentStatus: AgentStatus | null;
  setAgentStatus: (status: AgentStatus | null) => void;

  // Traders
  traders: Trader[];
  setTraders: (traders: Trader[]) => void;
  toggleFollowTrader: (address: string) => void;

  // Markets
  markets: Market[];
  setMarkets: (markets: Market[]) => void;
  updateMarketPrice: (marketId: string, price: number, bid: number, ask: number) => void;

  // Positions
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;

  // Trade Signals
  tradeSignals: TradeSignal[];
  addTradeSignal: (signal: TradeSignal) => void;
  updateTradeSignal: (id: string, updates: Partial<TradeSignal>) => void;

  // Trade History (from backend)
  tradeHistoryList: TradeHistoryItem[];
  addTradeHistory: (item: TradeHistoryItem) => void;
  setTradeHistory: (items: TradeHistoryItem[]) => void;

  // Risk Alerts
  riskAlerts: RiskAlert[];
  addRiskAlert: (alert: RiskAlert) => void;

  // Metrics
  metrics: DailyMetrics | null;
  setMetrics: (metrics: DailyMetrics | null) => void;

  // Risk Config
  riskConfig: RiskConfig;
  setRiskConfig: (config: Partial<RiskConfig>) => void;

  // UI State
  autoExecute: boolean;
  setAutoExecute: (enabled: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Wallet
  walletAddress: null,
  walletConnected: false,
  setWalletAddress: (address) => set({ walletAddress: address }),
  setWalletConnected: (connected) => set({ walletConnected: connected }),

  // WebSocket
  wsStatus: 'disconnected',
  setWsStatus: (wsStatus) => set({ wsStatus }),

  // Balance
  balance: 100,
  setBalance: (balance) => set({ balance }),

  // Agent Status
  agentStatus: null,
  setAgentStatus: (agentStatus) => set({ agentStatus }),

  // Traders
  traders: [],
  setTraders: (traders) => set({ traders }),
  toggleFollowTrader: (address) => set((state) => ({
    traders: state.traders.map((t) =>
      t.proxyWallet === address ? { ...t, following: !t.following } : t
    ),
  })),

  // Markets
  markets: [],
  setMarkets: (markets) => set({ markets }),
  updateMarketPrice: (marketId, price, bid, ask) => set((state) => ({
    markets: state.markets.map((m) =>
      m.id === marketId ? { ...m, lastTradePrice: price, bestBid: bid, bestAsk: ask } : m
    ),
  })),

  // Positions
  positions: [],
  setPositions: (positions) => set({ positions }),
  addPosition: (position) => set((state) => ({
    positions: [...state.positions, position],
  })),
  updatePosition: (id, updates) => set((state) => ({
    positions: state.positions.map((p) => p.id === id ? { ...p, ...updates } : p),
  })),
  removePosition: (id) => set((state) => ({
    positions: state.positions.filter((p) => p.id !== id),
  })),

  // Trade Signals
  tradeSignals: [],
  addTradeSignal: (signal) => set((state) => ({
    tradeSignals: [signal, ...state.tradeSignals].slice(0, 50),
  })),
  updateTradeSignal: (id, updates) => set((state) => ({
    tradeSignals: state.tradeSignals.map((s) => s.id === id ? { ...s, ...updates } : s),
  })),

  // Trade History (from backend)
  tradeHistoryList: [],
  addTradeHistory: (item) => set((state) => ({
    tradeHistoryList: [item, ...state.tradeHistoryList].slice(0, 200),
  })),
  setTradeHistory: (tradeHistoryList) => set({ tradeHistoryList }),

  // Risk Alerts
  riskAlerts: [],
  addRiskAlert: (alert) => set((state) => ({
    riskAlerts: [alert, ...state.riskAlerts].slice(0, 50),
  })),

  // Metrics
  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  // Risk Config
  riskConfig: {
    maxRiskPerTrade: 0.05,
    maxDailyRisk: 0.15,
    stopLossPercent: 0.2,
    trailingStop: true,
    trailingPercent: 0.1,
    maxTradesPerDay: 50,
    minPositionSize: 10,
    maxPositionSize: 10000,
  },
  setRiskConfig: (config) => set((state) => ({
    riskConfig: { ...state.riskConfig, ...config },
  })),

  // UI State
  autoExecute: false,
  setAutoExecute: (enabled) => set({ autoExecute: enabled }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
