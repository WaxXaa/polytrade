import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type RiskConfigDto } from '@/lib/api';

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => api.getLeaderboard(limit),
    refetchInterval: 30_000,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => api.getPositions(),
    refetchInterval: 15_000,
  });
}

export function useRiskConfig() {
  return useQuery({
    queryKey: ['riskConfig'],
    queryFn: () => api.getRiskConfig(),
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ['agentStatus'],
    queryFn: () => api.getStatus(),
    refetchInterval: 10_000,
  });
}

export function useUpdateRiskConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<RiskConfigDto>) => api.updateRiskConfig(config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riskConfig'] }),
  });
}

export function useSetMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: 'paper' | 'real') => api.setMode(mode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agentStatus'] }),
  });
}

export function usePauseAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.pauseAgent(),
    onSuccess: (data) => queryClient.setQueryData(['agentStatus'], data),
  });
}

export function useResumeAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.resumeAgent(),
    onSuccess: (data) => queryClient.setQueryData(['agentStatus'], data),
  });
}

export function useApi() {
  return {
    postConfig: (config: Partial<RiskConfigDto>) => api.updateRiskConfig(config),
  };
}
