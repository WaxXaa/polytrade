import { useAppStore } from '@/stores';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Briefcase } from 'lucide-react';

export function PositionsPanel() {
  const { positions } = useAppStore();

  const totalPnL = positions.reduce((acc, p) => acc + p.pnl, 0);
  const totalValue = positions.reduce((acc, p) => acc + p.size, 0);

  return (
    <div className="cyber-border rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-magenta-500" />
          POSITIONS
        </h2>
        <span className="text-xs text-muted-foreground">
          {positions.length} active
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-lg bg-card/50">
        <div>
          <div className="text-xs text-muted-foreground">Total Value</div>
          <div className="font-mono font-bold">{formatCurrency(totalValue)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total P&L</div>
          <div className={cn(
            "font-mono font-bold",
            totalPnL >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {formatCurrency(totalPnL)}
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No open positions
            </p>
          </div>
        ) : (
          positions.map((position) => (
            <div
              key={position.id}
              className="p-3 rounded-lg border border-white/10 bg-card/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold",
                  position.side === 'BUY' 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-red-500/20 text-red-400"
                )}>
                  {position.side}
                </span>
                <span className={cn(
                  "font-mono text-sm",
                  position.pnl >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercent(position.pnlPercent)}
                </span>
              </div>
              
              <div className="text-sm truncate mb-1">
                {position.marketQuestion?.slice(0, 25)}...
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Entry: {position.entryPrice.toFixed(2)}</span>
                <span>Current: {position.currentPrice.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}