import { useAgent } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function PerformanceMetrics() {
  const { metrics, tradeHistory, usdcBalance } = useAgent();

  const totalTrades = metrics?.totalTrades ?? tradeHistory.length;
  const winRate = metrics?.winRate
    ? (metrics.winRate * 100).toFixed(1)
    : totalTrades > 0
    ? ((tradeHistory.filter((t) => t.status === 'SUCCESS').length / totalTrades) * 100).toFixed(1)
    : '0.0';
  const totalPnl = metrics?.totalPnl ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Daily P&L"
            value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} USDC`}
          />
          <StatCard label="Win Rate" value={`${winRate}%`} />
          <Separator className="col-span-2" />
          <StatCard label="Total Trades" value={String(totalTrades)} />
          <StatCard label="Balance" value={`${usdcBalance.toFixed(2)} USDC`} />
        </div>
      </CardContent>
    </Card>
  );
}
