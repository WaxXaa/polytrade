import type { TopTrader, Position, AgentStatus } from '../types/ws-events';

const BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data as T;
}

export interface RiskConfigDto {
  maxExposurePercent: number;
  stopLossPercent: number;
  maxTradesPerHour: number;
  maxPositionPercent: number;
  minTradeAmount: number;
  minBalance: number;
}

export const api = {
  getLeaderboard: (limit = 10) =>
    request<TopTrader[]>(`/leaderboard?limit=${limit}`),

  getPositions: () =>
    request<Position[]>('/positions'),

  getRiskConfig: () =>
    request<RiskConfigDto>('/config/risk'),

  updateRiskConfig: (config: Partial<RiskConfigDto>) =>
    request<RiskConfigDto>('/config/risk', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  setMode: (mode: 'paper' | 'real') =>
    request<{ mode: string }>('/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),

  getStatus: () =>
    request<AgentStatus>('/status'),

  pauseAgent: () =>
    request<AgentStatus>('/pause', { method: 'POST' }),

  resumeAgent: () =>
    request<AgentStatus>('/resume', { method: 'POST' }),
};
