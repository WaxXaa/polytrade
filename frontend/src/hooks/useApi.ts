import { useQuery, useMutation } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchJSON(url: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

export function useLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchJSON(`/api/leaderboard?limit=${limit}`),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useMarkets(limit: number = 50) {
  return useQuery({
    queryKey: ['markets', limit],
    queryFn: () => fetchJSON(`/api/markets?limit=${limit}`),
    refetchInterval: 30 * 1000,
  });
}

export function useMarketPrices(marketId: string) {
  return useQuery({
    queryKey: ['market-prices', marketId],
    queryFn: () => fetchJSON(`/api/markets/${marketId}/prices`),
    refetchInterval: 10 * 1000,
    enabled: !!marketId,
  });
}

export function useRiskConfig() {
  return useQuery({
    queryKey: ['risk-config'],
    queryFn: () => fetchJSON('/api/config/risk'),
  });
}

export function useUpdateRiskConfig() {
  return useMutation({
    mutationFn: (config: any) => fetchJSON('/api/config/risk', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => fetchJSON('/api/positions'),
  });
}

export function useConnectWallet() {
  return useMutation({
    mutationFn: (data: { address: string; apiCredentials?: any }) => 
      fetchJSON('/api/wallet/connect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useExecuteTrade() {
  return useMutation({
    mutationFn: (data: { tokenId: string; side: string; amount: number; type: string; price?: number }) =>
      fetchJSON('/api/execute', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}