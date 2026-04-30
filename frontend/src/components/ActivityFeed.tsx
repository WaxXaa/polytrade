import { useAppStore, type TradeSignal } from '@/stores';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowUpDown, Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

function TradeItem({ signal }: { signal: TradeSignal }) {
  const statusIcons = {
    pending: <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />,
    executed: <CheckCircle className="w-4 h-4 text-green-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    skipped: <XCircle className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      signal.status === 'executed' && "border-green-500/30 bg-green-500/5",
      signal.status === 'pending' && "border-yellow-500/30 bg-yellow-500/5",
      signal.status === 'failed' && "border-red-500/30 bg-red-500/5",
      signal.status === 'skipped' && "border-gray-500/30 bg-gray-500/5"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {timeAgo(signal.timestamp)}
          </span>
          <span className="font-medium text-sm">{signal.trader?.userName || 'Unknown'}</span>
        </div>
        {statusIcons[signal.status]}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-bold",
            signal.side === 'BUY' 
              ? "bg-green-500/20 text-green-400" 
              : "bg-red-500/20 text-red-400"
          )}>
            {signal.side}
          </span>
          <span className="text-sm text-muted-foreground">
            {signal.market?.question?.slice(0, 30) || signal.market?.id}...
          </span>
        </div>

        <div className="text-right">
          <div className="font-mono text-sm">{formatCurrency(signal.size)}</div>
          <div className="text-xs text-muted-foreground">
            @ {formatNumber(signal.price, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const { tradeSignals } = useAppStore();

  return (
    <div className="cyber-border rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          LIVE ACTIVITY
        </h2>
        <span className="text-xs text-muted-foreground">
          {tradeSignals.length} signals
        </span>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {tradeSignals.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpDown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No trade signals yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Follow traders to receive signals
            </p>
          </div>
        ) : (
          tradeSignals.map((signal) => (
            <TradeItem key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </div>
  );
}