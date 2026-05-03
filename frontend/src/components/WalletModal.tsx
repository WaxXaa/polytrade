import React from 'react';
import { Icon } from './ui/Icon';

interface WalletModalProps {
  onClose: () => void;
  onConnect: () => void;
}

const WALLETS = [
  { name: 'MetaMask',        color: '#f6851b' },
  { name: 'WalletConnect',   color: '#3b99fc' },
  { name: 'Coinbase Wallet', color: '#0052ff' },
];

export function WalletModal({ onClose, onConnect }: WalletModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="pt-fade-up"
        style={{
          background: 'var(--pt-surface-1)', border: '1px solid var(--pt-border)',
          borderRadius: 16, padding: 32, width: 400, maxWidth: '90vw',
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Connect Wallet</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--pt-text-3)', cursor: 'pointer' }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Wallet options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WALLETS.map(w => (
            <WalletOption key={w.name} name={w.name} accentColor={w.color} onConnect={onConnect} />
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--pt-text-3)', marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
          Connect your wallet on <strong>Polygon</strong> to enable live trading.
          Simulation mode works without a wallet.
        </p>
      </div>
    </div>
  );
}

interface WalletOptionProps {
  name: string;
  accentColor: string;
  onConnect: () => void;
}

function WalletOption({ name, accentColor, onConnect }: WalletOptionProps) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onConnect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
        fontFamily: 'var(--pt-font)', fontSize: 14, fontWeight: 500,
        color: 'var(--pt-text-1)',
        border: `1px solid ${hov ? accentColor : 'var(--pt-border)'}`,
        background: hov ? 'var(--pt-surface-2)' : 'var(--pt-surface-2)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: accentColor + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentColor,
      }}>
        <Icon name="wallet" size={18} />
      </div>
      {name}
    </button>
  );
}
