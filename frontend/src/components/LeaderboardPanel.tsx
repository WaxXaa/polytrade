import { useAppStore, type Trader } from '@/stores';
import { formatCompactNumber, formatPercent, truncateAddress } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function LeaderboardPanel() {
  const { traders, toggleFollowTrader } = useAppStore();

  return (
    <div className="cyber-border rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          TOP 10 TRADERS
        </h2>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {traders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading traders...
          </div>
        ) : (
          traders.slice(0, 10).map((trader, index) => (
            <div
              key={trader.proxyWallet}
              className={cn(
                "group p-3 rounded-lg border transition-all",
                trader.following
                  ? "border-cyan-500/50 bg-cyan-500/5"
                  : "border-white/5 hover:border-white/20 bg-card/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 && "bg-yellow-500/20 text-yellow-400",
                    index === 1 && "bg-gray-400/20 text-gray-300",
                    index === 2 && "bg-amber-600/20 text-amber-500",
                    index > 2 && "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {trader.userName || truncateAddress(trader.proxyWallet)}
                      {trader.verifiedBadge && (
                        <span className="text-cyan-400 text-xs">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trader.xUsername && `@${trader.xUsername}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "font-mono font-bold",
                    trader.pnl >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {trader.pnl >= 0 ? '+' : ''}{formatCompactNumber(trader.pnl)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vol: {formatCompactNumber(trader.vol)}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant={trader.following ? "default" : "outline"}
                  className={cn(
                    "text-xs h-7 px-3",
                    trader.following && "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                  )}
                  onClick={() => toggleFollowTrader(trader.proxyWallet)}
                >
                  {trader.following ? 'Following' : 'Follow'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}