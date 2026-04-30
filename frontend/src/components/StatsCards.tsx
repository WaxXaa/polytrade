import { useMemo } from 'react';
import { DollarSign, TrendingUp, Activity, Zap } from 'lucide-react';
import { useAppStore } from '@/stores';
import { formatCurrency, formatPercent, formatCompactNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, change, icon, trend = 'neutral' }: StatCardProps) {
  return (
    <div className="cyber-border rounded-xl p-4 lg:p-6 hover:glow-cyan transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="text-cyan-400">{icon}</div>
      </div>
      <div className="text-2xl lg:text-3xl font-bold font-mono">{value}</div>
      {change && (
        <div className={cn(
          "text-sm font-medium mt-1",
          trend === 'up' && "text-green-400",
          trend === 'down' && "text-red-400",
          trend === 'neutral' && "text-muted-foreground"
        )}>
          {change}
        </div>
      )}
    </div>
  );
}

export function StatsCards() {
  const { positions, tradeSignals, traders, walletConnected, walletAddress } = useAppStore();

  // Calculate stats from positions
  const stats = useMemo(() => {
    const totalValue = positions.reduce((acc, p) => acc + p.size, 0);
    const totalPnL = positions.reduce((acc, p) => acc + p.pnl, 0);
    const pnlPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;
    const tradesToday = tradeSignals.filter(s => {
      const today = new Date().toDateString();
      return new Date(s.timestamp).toDateString() === today;
    }).length;
    const activeTraders = traders.filter(t => t.following).length;

    return {
      balance: 12500, // Would come from wallet
      pnl: totalPnL,
      pnlPercent,
      tradesToday,
      activeTraders,
    };
  }, [positions, tradeSignals, traders]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Wallet Balance"
        value={formatCurrency(stats.balance)}
        icon={<DollarSign className="w-5 h-5" />}
      />
      <StatCard
        title="Total P&L"
        value={formatCurrency(stats.pnl)}
        change={formatPercent(stats.pnlPercent)}
        icon={<TrendingUp className="w-5 h-5" />}
        trend={stats.pnlPercent >= 0 ? 'up' : 'down'}
      />
      <StatCard
        title="Trades Today"
        value={stats.tradesToday.toString()}
        icon={<Activity className="w-5 h-5" />}
      />
      <StatCard
        title="Active Traders"
        value={stats.activeTraders.toString()}
        change={walletConnected ? 'Connected' : 'Not connected'}
        icon={<Zap className="w-5 h-5" />}
        trend={walletConnected ? 'up' : 'neutral'}
      />
    </div>
  );
}