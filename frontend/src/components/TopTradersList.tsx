import { useAgent } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

export function TopTradersList() {
  const { topTraders, wsStatus } = useAgent();
  const loading = wsStatus === 'connecting' && topTraders.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Traders</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : topTraders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No traders loaded yet. Agent is starting...
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {topTraders.map((trader) => (
              <div
                key={trader.proxyWallet}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <span className="text-muted-foreground text-sm font-mono w-6 shrink-0">
                  #{trader.rank}
                </span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate text-sm">
                    {trader.name || `${trader.proxyWallet.slice(0, 8)}...`}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {trader.proxyWallet.slice(0, 6)}...{trader.proxyWallet.slice(-4)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-semibold ${trader.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trader.pnl >= 0 ? '+' : ''}${(trader.pnl / 1_000_000).toFixed(2)}M
                  </span>
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
