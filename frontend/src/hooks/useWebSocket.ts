import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAppStore } from '@/stores';
import type {
  TopTrader,
  RiskAlert,
  AgentStatus,
  TradeHistoryItem,
} from '@/types/ws-events';

function mapBackendPosition(pos: {
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
}) {
  return {
    id: pos.id,
    marketId: pos.conditionId,
    marketQuestion: pos.market,
    side: pos.direction,
    size: pos.size,
    entryPrice: pos.entryPrice,
    currentPrice: pos.entryPrice,
    pnl: 0,
    pnlPercent: 0,
    stopLoss: pos.stopLossLevel,
    timestamp: new Date(pos.openedAt).getTime(),
  };
}

function mapTopTrader(t: TopTrader) {
  return {
    rank: String(t.rank),
    proxyWallet: t.proxyWallet,
    userName: t.name,
    vol: t.volume,
    pnl: t.pnl,
  };
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const stores = useAppStore;

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const store = stores.getState();
    store.setWsStatus('connecting');

    socket.on('connect', () => {
      stores.getState().setWsStatus('connected');
      socket.emit('subscribe', { channels: ['leaderboard', 'positions'] });
    });

    socket.on('disconnect', () => {
      stores.getState().setWsStatus('disconnected');
    });

    socket.on('connect_error', () => {
      stores.getState().setWsStatus('disconnected');
    });

    socket.on('agent_status', (data: AgentStatus) => {
      const s = stores.getState();
      s.setAgentStatus(data);
      if (typeof data.balance === 'number') {
        s.setBalance(data.balance);
      }
    });

    socket.on('leaderboard_update', (traders: TopTrader[]) => {
      stores.getState().setTraders(traders.map(mapTopTrader));
    });

    socket.on('position_update', (data: unknown) => {
      const s = stores.getState();
      if (Array.isArray(data)) {
        s.setPositions(data.map(mapBackendPosition));
      } else if (data && typeof data === 'object' && 'position' in data && 'changeType' in data) {
        const { position, changeType } = data as { position: Parameters<typeof mapBackendPosition>[0]; changeType: 'opened' | 'closed' | 'updated' };
        if (changeType === 'opened') {
          s.addPosition(mapBackendPosition(position));
        } else if (changeType === 'closed') {
          s.removePosition(position.id);
        } else if (changeType === 'updated') {
          s.updatePosition(position.id, mapBackendPosition(position));
        }
      }
    });

    socket.on('trade_executed', (data: {
      trade: TradeHistoryItem;
      decision: { reasoning: string; signalMultiplier: number };
      orderResult: { success: boolean };
    }) => {
      const s = stores.getState();
      s.addTradeSignal({
        id: data.trade.id,
        trader: { rank: '', proxyWallet: '', userName: data.trade.topTraderName, vol: 0, pnl: 0 },
        market: { id: '', question: data.trade.market, active: true, closed: false, volumeNum: 0, liquidityNum: 0, bestBid: 0, bestAsk: 0, lastTradePrice: data.trade.price },
        side: data.trade.direction,
        size: data.trade.amount,
        price: data.trade.price,
        timestamp: new Date(data.trade.timestamp).getTime(),
        status: data.orderResult.success ? 'executed' : 'failed',
      });

      const historyItem: TradeHistoryItem = {
        id: data.trade.id,
        timestamp: data.trade.timestamp,
        market: data.trade.market,
        direction: data.trade.direction,
        amount: data.trade.amount,
        price: data.trade.price,
        topTraderName: data.trade.topTraderName,
        status: data.orderResult.success ? 'SUCCESS' : 'FAILED',
        signalMultiplier: data.decision.signalMultiplier,
      };
      s.addTradeHistory(historyItem);
    });

    socket.on('traders_updated', () => {
      // Full re-fetch via API happens automatically via useLeaderboard's refetchInterval
      // This is a supplement for real-time awareness
    });

    socket.on('risk_alert', (alert: RiskAlert) => {
      stores.getState().addRiskAlert(alert);
    });

    socket.on('balance_update', (data: { previousBalance: number; currentBalance: number }) => {
      stores.getState().setBalance(data.currentBalance);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
