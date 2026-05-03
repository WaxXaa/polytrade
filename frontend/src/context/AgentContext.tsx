import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppStore } from '@/stores';
import type { TopTrader, RiskAlert, DailyMetrics, TradeHistoryItem } from '@/types/ws-events';

interface AgentContextValue {
  topTraders: TopTrader[];
  tradeHistory: TradeHistoryItem[];
  riskAlerts: RiskAlert[];
  openPositions: Array<{
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
  }>;
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  usdcBalance: number;
  metrics: DailyMetrics | null;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const wsStatus = useAppStore((s) => s.wsStatus);
  const balance = useAppStore((s) => s.balance);
  const riskAlerts = useAppStore((s) => s.riskAlerts);
  const tradeHistoryList = useAppStore((s) => s.tradeHistoryList);
  const metrics = useAppStore((s) => s.metrics);
  const positions = useAppStore((s) => s.positions);
  const traders = useAppStore((s) => s.traders);

  const value = useMemo<AgentContextValue>(() => ({
    topTraders: traders.map((t) => ({
      name: t.userName,
      proxyWallet: t.proxyWallet,
      pnl: t.pnl,
      volume: t.vol,
      markets: 0,
      rank: parseInt(t.rank, 10) || 0,
      confidenceWeight: 0,
      consecutiveLosses: 0,
      lastUpdated: new Date().toISOString(),
    })),
    tradeHistory: tradeHistoryList,
    riskAlerts,
    openPositions: [],
    wsStatus,
    usdcBalance: balance,
    metrics,
  }), [wsStatus, balance, riskAlerts, tradeHistoryList, metrics, positions, traders]);

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}
