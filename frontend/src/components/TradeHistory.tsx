import { PtBadge } from './ui/PtBadge';
import { useAppStore } from '@/stores';

function fmt$(n: number): string {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function dateStr(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TradeHistory() {
  const { tradeSignals } = useAppStore();
  const executed = tradeSignals.filter(s => s.status === 'executed');

  return (
    <div className="pt-fade-up" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Trade History</h2>
          <span style={{ fontSize: 13, color: 'var(--pt-text-3)' }}>{executed.length} executed trades</span>
        </div>
      </div>

      <div style={{ background: 'var(--pt-surface-1)', border: '1px solid var(--pt-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pt-border)' }}>
                {['Market', 'Side', 'Size', 'Price', 'Status', 'Trader', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11,
                    color: 'var(--pt-text-3)', fontWeight: 600,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {executed.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--pt-text-3)' }}>
                    No executed trades yet
                  </td>
                </tr>
              ) : (
                executed.map(s => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: '1px solid var(--pt-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--pt-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500, maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.market?.question?.slice(0, 35) ?? s.market?.id ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <PtBadge variant={s.side === 'BUY' ? 'buy' : 'sell'}>{s.side}</PtBadge>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--pt-mono)' }}>{fmt$(s.size)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--pt-mono)', color: 'var(--pt-text-2)' }}>
                      {s.price.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <PtBadge variant="success">executed</PtBadge>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--pt-text-2)' }}>
                      {s.trader?.userName ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--pt-text-3)', fontSize: 12 }}>
                      {dateStr(s.timestamp)}
                    </td>
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
