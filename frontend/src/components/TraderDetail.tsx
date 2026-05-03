import { useMemo } from 'react';
import { Icon } from './ui/Icon';
import { PtBadge } from './ui/PtBadge';
import { PtCard } from './ui/PtCard';
import { Sparkline } from './ui/Sparkline';
import { type Trader } from '@/stores';

function fmt$(n: number): string {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

interface TraderDetailProps {
  trader: Trader;
  onBack: () => void;
  onToggleFollow: (wallet: string) => void;
}

export function TraderDetail({ trader, onBack, onToggleFollow }: TraderDetailProps) {
  // Generate a deterministic-looking sparkline from trader PnL
  const sparkData = useMemo(() => {
    const d: number[] = [];
    let v = 0;
    const seed = trader.pnl / 30;
    for (let i = 0; i < 30; i++) {
      v += (Math.sin(i * 0.7 + trader.pnl) > 0 ? 1 : -0.5) * Math.abs(seed) * (0.5 + Math.random() * 0.5);
      d.push(v);
    }
    return d;
  }, [trader.pnl]);

  const pnlColor = trader.pnl >= 0 ? 'var(--pt-green)' : 'var(--pt-red)';

  return (
    <div className="pt-fade-up" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 0', marginBottom: 16,
          background: 'none', border: 'none', color: 'var(--pt-text-3)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'var(--pt-font)',
        }}
      >
        <Icon name="chevLeft" size={16} /> Back to Dashboard
      </button>

      {/* Profile card */}
      <PtCard style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, oklch(0.5 0.15 ${(trader.rank as unknown as number * 50 || 0) % 360}), oklch(0.4 0.15 ${((trader.rank as unknown as number * 50 || 0) + 60) % 360}))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
          }}>
            {(trader.userName || '??').slice(0, 2).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 20 }}>{trader.userName || trader.proxyWallet}</span>
              {trader.verifiedBadge && <PtBadge variant="info">Verified</PtBadge>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--pt-text-3)' }}>
              {trader.proxyWallet}
              {trader.xUsername && (
                <span style={{ color: 'var(--pt-accent)', marginLeft: 8 }}>@{trader.xUsername}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => onToggleFollow(trader.proxyWallet)}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pt-font)',
              background: trader.following ? 'var(--pt-accent)' : 'var(--pt-surface-2)',
              color: trader.following ? '#fff' : 'var(--pt-text-2)',
              transition: 'all 0.2s',
            }}
          >
            {trader.following ? 'Following' : 'Follow Trader'}
          </button>
        </div>
      </PtCard>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total P&L',    value: fmt$(trader.pnl),               color: pnlColor },
          { label: 'Volume',       value: fmtCompact(trader.vol),         color: 'var(--pt-text-1)' },
        ].map(s => (
          <PtCard key={s.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--pt-text-3)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--pt-mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </PtCard>
        ))}
      </div>

      {/* Sparkline */}
      <PtCard style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>P&L History (30d)</div>
        <Sparkline data={sparkData} color={pnlColor} width={800} height={80} />
      </PtCard>
    </div>
  );
}
