import { PtBadge } from './ui/PtBadge';
import { useAppStore } from '@/stores';
import { usePositions } from '@/hooks/useApi';

function fmt$(n: number): string {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface PositionsPanelProps {
  walletMode: 'simulation' | 'real';
}

export function PositionsPanel({ walletMode }: PositionsPanelProps) {
  const { positions: storePositions } = useAppStore();
  const { data: apiPositions } = usePositions();

  const positions = apiPositions && apiPositions.length > 0
    ? apiPositions.map((p) => ({
        id: p.id,
        marketId: p.conditionId,
        marketQuestion: p.market,
        side: p.direction,
        size: p.size,
        entryPrice: p.entryPrice,
        currentPrice: p.entryPrice,
        pnl: 0,
        pnlPercent: 0,
        stopLoss: p.stopLossLevel,
        timestamp: new Date(p.openedAt).getTime(),
      }))
    : storePositions;

  const totalPnl = positions.reduce((a, p) => a + p.pnl, 0);

  return (
    <div className="pt-fade-up" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Positions</h2>
          <span style={{ fontSize: 13, color: 'var(--pt-text-3)' }}>
            {walletMode === 'simulation' ? 'Simulation wallet' : 'Real wallet'} · {positions.length} open
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--pt-text-3)' }}>Unrealized P&L</div>
          <div style={{
            fontFamily: 'var(--pt-mono)', fontSize: 20, fontWeight: 700,
            color: totalPnl >= 0 ? 'var(--pt-green)' : 'var(--pt-red)',
          }}>
            {fmt$(totalPnl)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--pt-surface-1)', border: '1px solid var(--pt-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pt-border)' }}>
                {['Market', 'Side', 'Size', 'Entry', 'Current', 'P&L', 'Trader', 'Opened'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11,
                    color: 'var(--pt-text-3)', fontWeight: 600,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--pt-text-3)' }}>
                    No open positions
                  </td>
                </tr>
              ) : (
                positions.map(p => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--pt-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--pt-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.marketQuestion?.slice(0, 30) ?? p.marketId}…
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <PtBadge variant={p.side === 'BUY' ? 'buy' : 'sell'}>{p.side}</PtBadge>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--pt-mono)' }}>{fmt$(p.size)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--pt-mono)', color: 'var(--pt-text-2)' }}>{p.entryPrice.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--pt-mono)' }}>{p.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--pt-mono)', fontWeight: 600, color: p.pnl >= 0 ? 'var(--pt-green)' : 'var(--pt-red)' }}>
                      {fmt$(p.pnl)} <span style={{ fontSize: 11, opacity: 0.7 }}>({fmtPct(p.pnlPercent)})</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--pt-text-2)' }}>—</td>
                    <td style={{ padding: '12px 16px', color: 'var(--pt-text-3)', fontSize: 12 }}>{timeAgo(p.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
