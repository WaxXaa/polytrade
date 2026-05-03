import { useState, useEffect } from 'react';
import { Icon } from './ui/Icon';

interface LiveMarket {
  id: number;
  question: string;
  yes: number;
  vol: number;
  myPos: boolean;
  trader: string | null;
  delta: number;
}

const INITIAL_MARKETS: LiveMarket[] = [
  { id: 1, question: 'Will Trump win 2028?',        yes: 41, vol: 2841000, myPos: true,  trader: 'WA', delta: +7 },
  { id: 2, question: 'Bitcoin above $150k EOY?',    yes: 51, vol: 1920000, myPos: true,  trader: 'CO', delta: +9 },
  { id: 3, question: 'ETH above $5k by July?',     yes: 67, vol: 1280000, myPos: true,  trader: 'WA', delta: +5 },
  { id: 4, question: 'Fed rate cut June?',          yes: 32, vol: 980000,  myPos: false, trader: null, delta: -3 },
  { id: 5, question: 'S&P 500 above 6000?',        yes: 61, vol: 870000,  myPos: true,  trader: 'CO', delta: +6 },
  { id: 6, question: 'SpaceX IPO 2026?',           yes: 28, vol: 640000,  myPos: false, trader: null, delta: +2 },
  { id: 7, question: 'EU bans TikTok?',            yes: 44, vol: 520000,  myPos: false, trader: null, delta: -1 },
  { id: 8, question: 'AI replaces 50% jobs 2030?', yes: 19, vol: 460000,  myPos: false, trader: null, delta: +1 },
];

function fmtCompact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

interface MarketRowProps {
  market: LiveMarket;
}

function MarketRow({ market }: MarketRowProps) {
  const [prevYes, setPrevYes] = useState(market.yes);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (market.yes !== prevYes) {
      setFlash(market.yes > prevYes ? 'up' : 'down');
      setPrevYes(market.yes);
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [market.yes, prevYes]);

  const flashBg =
    flash === 'up'   ? 'oklch(0.45 0.12 155 / 0.15)' :
    flash === 'down' ? 'oklch(0.55 0.18 15  / 0.15)' : 'transparent';

  return (
    <div style={{
      padding: '10px 16px', borderBottom: '1px solid var(--pt-border)',
      background: flashBg, transition: 'background 0.5s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            {market.myPos && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                background: 'var(--pt-accent)', boxShadow: '0 0 4px var(--pt-accent-dim)',
              }} />
            )}
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: market.myPos ? 'var(--pt-text-1)' : 'var(--pt-text-2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {market.question}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--pt-text-3)', fontFamily: 'var(--pt-mono)' }}>
              Vol: {fmtCompact(market.vol)}
            </span>
            {market.trader && (
              <span style={{ fontSize: 11, color: 'var(--pt-accent)', fontFamily: 'var(--pt-mono)' }}>
                @{market.trader}
              </span>
            )}
          </div>
        </div>

        {/* Price + delta */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontFamily: 'var(--pt-mono)', fontWeight: 700, fontSize: 14,
              color: flash === 'up' ? 'var(--pt-green)' : flash === 'down' ? 'var(--pt-red)' : 'var(--pt-text-1)',
              transition: 'color 0.3s',
            }}>
              {market.yes.toFixed(0)}¢
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: flash === 'up' ? 'var(--pt-green)' : flash === 'down' ? 'var(--pt-red)' : 'var(--pt-text-3)',
              transition: 'color 0.3s',
            }}>
              {market.delta >= 0 ? '▲' : '▼'}{Math.abs(market.delta).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* YES/NO bar */}
      <div style={{ display: 'flex', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${market.yes}%`, background: 'var(--pt-green)',
          opacity: market.myPos ? 1 : 0.5,
          borderRadius: '3px 0 0 3px', transition: 'width 0.8s ease',
        }} />
        <div style={{
          flex: 1, background: 'var(--pt-red)',
          opacity: market.myPos ? 1 : 0.4,
          borderRadius: '0 3px 3px 0',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--pt-green)', fontFamily: 'var(--pt-mono)' }}>
          YES {market.yes.toFixed(0)}%
        </span>
        <span style={{ fontSize: 10, color: 'var(--pt-red)', fontFamily: 'var(--pt-mono)' }}>
          NO {(100 - market.yes).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export function LiveMarketsPanel() {
  const [markets, setMarkets] = useState<LiveMarket[]>(INITIAL_MARKETS);

  // Simulate live odds ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setMarkets(prev =>
        prev.map(m => {
          const drift = (Math.random() - 0.48) * 2.5;
          return {
            ...m,
            yes: +Math.max(2, Math.min(97, m.yes + drift)).toFixed(1),
            delta: +(m.delta + drift * 0.3).toFixed(1),
          };
        })
      );
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: 'var(--pt-surface-1)', border: '1px solid var(--pt-border)', borderRadius: 12, overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--pt-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="globe" size={16} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Live Markets</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--pt-text-3)', fontFamily: 'var(--pt-mono)' }}>
          Polymarket odds
        </span>
      </div>

      {/* Market rows */}
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {markets.map(m => <MarketRow key={m.id} market={m} />)}
      </div>
    </div>
  );
}
