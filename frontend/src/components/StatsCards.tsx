import { useMemo } from 'react';
import { Icon } from './ui/Icon';
import { PtCard } from './ui/PtCard';
import { useAppStore } from '@/stores';
import { useAgentStatus } from '@/hooks/useApi';

function fmt$(n: number): string {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: 'dollar' | 'trend' | 'chart' | 'users';
  color: string;
  dim?: boolean;
}

function StatCard({ label, value, sub, icon, color, dim }: StatCardProps) {
  return (
    <PtCard style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--pt-text-3)', fontWeight: 500 }}>{label}</span>
        <span style={{ color, opacity: dim ? 0.3 : 0.7 }}><Icon name={icon} size={16} /></span>
      </div>
      <div style={{
        fontFamily: 'var(--pt-mono)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px',
        color: dim ? 'var(--pt-text-3)' : undefined,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: dim ? 'var(--pt-text-3)' : color, fontWeight: 500, marginTop: 2, fontFamily: 'var(--pt-mono)' }}>
        {sub}
      </div>
    </PtCard>
  );
}

interface StatsCardsProps {
  walletMode: 'simulation' | 'real';
}

export function StatsCards({ walletMode }: StatsCardsProps) {
  const { positions, tradeHistoryList, balance: storeBalance } = useAppStore();
  const { data: agentStatus } = useAgentStatus();

  const balance = agentStatus?.balance ?? storeBalance ?? 100;
  const monitoredCount = agentStatus?.topTradersCount ?? 0;
  const tradesExecuted = tradeHistoryList.filter(t => t.status === 'SUCCESS').length;

  const { totalPnl, pnlPct } = useMemo(() => {
    const totalPnl = positions.reduce((a, p) => a + p.pnl, 0);
    const pnlPct   = balance > 0 ? (totalPnl / balance) * 100 : 0;
    return { totalPnl, pnlPct };
  }, [positions, balance]);

  const hasTrades = tradesExecuted > 0;
  const pnlColor  = totalPnl >= 0 ? 'var(--pt-green)' : 'var(--pt-red)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <StatCard
        label="Balance"
        value={fmt$(balance)}
        sub={walletMode === 'simulation' ? 'Paper wallet' : 'Real wallet'}
        icon="dollar"
        color="var(--pt-accent)"
      />
      <StatCard
        label="Profit / Loss"
        value={hasTrades ? fmt$(totalPnl) : '—'}
        sub={hasTrades ? fmtPct(pnlPct) : 'No trades yet'}
        icon="trend"
        color={hasTrades ? pnlColor : 'var(--pt-text-3)'}
        dim={!hasTrades}
      />
      <StatCard
        label="Monitoring"
        value={monitoredCount > 0 ? String(monitoredCount) : '—'}
        sub={monitoredCount > 0 ? 'top traders' : 'Loading…'}
        icon="users"
        color="var(--pt-accent)"
        dim={monitoredCount === 0}
      />
      <StatCard
        label="Trades Executed"
        value={hasTrades ? String(tradesExecuted) : '—'}
        sub={hasTrades ? 'successful trades' : 'Agent watching markets'}
        icon="chart"
        color="var(--pt-green)"
        dim={!hasTrades}
      />
    </div>
  );
}
