/**
 * AgentContext — simplified global state for the copy trading agent.
 * Uses existing hooks from useWebSocket and useAppStore.
 */

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react';
import { useAppStore, type Trader, type Market, type Position, type TradeSignal } from '@/stores';

interface AgentState {
  topTraders: Trader[];
  openPositions: Position[];
  tradeHistory: TradeSignal[];
  wsStatus: 'connecting' | 'connected' | 'disconnected';
}

interface AgentContextValue extends AgentState {
  dismissAlert: (index: number) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { 
    traders, 
    positions, 
    tradeSignals,
    walletConnected 
  } = useAppStore();

  const state: AgentState = {
    topTraders: traders,
    openPositions: positions,
    tradeHistory: tradeSignals,
    wsStatus: walletConnected ? 'connected' : 'disconnected',
  };

  const dismissAlert = useCallback((index: number) => {
    void index;
  }, []);

  return (
    <AgentContext.Provider value={{ ...state, dismissAlert }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}