import { useState } from 'react';
import { Icon } from './ui/Icon';
import { useAppStore, type Trader } from '@/stores';
import { truncateAddress } from '@/lib/utils';
import { useLeaderboard } from '@/hooks/useApi';

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

const RANK_STYLES: Record<number, { bg: string; color: string }> = {
  0: { bg: 'oklch(0.7 0.15 80 / 0.2)',  color: '#fbbf24' },
  1: { bg: 'oklch(0.7 0.03 240 / 0.2)', color: '#94a3b8' },
  2: { bg: 'oklch(0.6 0.1 55 / 0.2)',   color: '#d97706' },
};

interface LeaderboardPanelProps {
  onSelectTrader: (trader: Trader) => void;
}

export function LeaderboardPanel({ onSelectTrader }: LeaderboardPanelProps) {
  const { traders: storeTraders, toggleFollowTrader } = useAppStore();
  const { data: apiTraders } = useLeaderboard(10);

  const traders: Trader[] = apiTraders && apiTraders.length > 0
    ? apiTraders.map((t) => ({
        rank: String(t.rank),
        proxyWallet: t.proxyWallet,
        userName: t.name,
        vol: t.volume,
        pnl: t.pnl,
      }))
    : storeTraders;

  return (
    <div style={{ background: 'var(--pt-surface-1)', border: '1px solid var(--pt-border)', borderRadius: 12, overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--pt-border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="users" size={16} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Top Traders</span>
      </div>

      {/* List */}
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {traders.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--pt-text-3)', fontSize: 13 }}>
            Loading traders…
          </div>
        ) : (
          traders.slice(0, 10).map((t, i) => (
            <TraderRow
              key={t.proxyWallet}
              trader={t}
              rank={i}
              onSelect={() => onSelectTrader(t)}
              onToggleFollow={() => toggleFollowTrader(t.proxyWallet)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TraderRowProps {
  trader: Trader;
  rank: number;
  onSelect: () => void;
  onToggleFollow: () => void;
}

function TraderRow({ trader, rank, onSelect, onToggleFollow }: TraderRowProps) {
  const [hov, setHov] = useState(false);
  const rankStyle = RANK_STYLES[rank] ?? { bg: 'var(--pt-surface-2)', color: 'var(--pt-text-3)' };
  const initials = (trader.userName || truncateAddress(trader.proxyWallet)).slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid var(--pt-border)',
        cursor: 'pointer', transition: 'background 0.15s',
        background: hov ? 'var(--pt-surface-2)' : 'transparent',
      }}
    >
      {/* Rank */}
      <span style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        background: rankStyle.bg, color: rankStyle.color,
      }}>
        {rank + 1}
      </span>

      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `oklch(0.5 0.12 ${(rank * 50) % 360})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
      }}>
        {initials}
      </div>

      {/* Name + stats */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {trader.userName || truncateAddress(trader.proxyWallet)}
          </span>
          {trader.verifiedBadge && <span style={{ color: 'var(--pt-accent)', fontSize: 12 }}>✓</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--pt-text-3)' }}>
          {fmtCompact(trader.vol)} vol
        </div>
      </div>

      {/* PnL + follow */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--pt-mono)', fontWeight: 700, fontSize: 13,
          color: trader.pnl >= 0 ? 'var(--pt-green)' : 'var(--pt-red)',
        }}>
          {trader.pnl >= 0 ? '+' : ''}{fmtCompact(trader.pnl)}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFollow(); }}
          style={{
            marginTop: 2, padding: '2px 10px', borderRadius: 6, border: 'none',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pt-font)',
            background: trader.following ? 'var(--pt-accent-dim)' : 'var(--pt-surface-2)',
            color: trader.following ? 'var(--pt-accent)' : 'var(--pt-text-3)',
            transition: 'all 0.15s',
          }}
        >
          {trader.following ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  );
}
