import { useLocation, Link } from 'react-router-dom';
import { Icon } from './ui/Icon';
import { StatusDot } from './ui/StatusDot';
import { PtBadge } from './ui/PtBadge';
import { TabBar } from './ui/TabBar';
import { WsStatusIndicator } from './WsStatusIndicator';

interface HeaderProps {
  walletMode: 'simulation' | 'real';
  onWalletModeChange: (mode: 'simulation' | 'real') => void;
  walletConnected: boolean;
  walletAddress: string | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  agentActive: boolean;
}

const NAV = [
  { id: '/' as string, label: 'Dashboard', icon: 'chart' as const },
  { id: '/positions', label: 'Positions',  icon: 'briefcase' as const },
  { id: '/history',   label: 'History',   icon: 'history' as const },
  { id: '/settings',  label: 'Settings',  icon: 'settings' as const },
];

export function Header({
  walletMode, onWalletModeChange,
  walletConnected, walletAddress,
  onConnectWallet, onDisconnectWallet,
  agentActive,
}: HeaderProps) {
  const location = useLocation();
  const currentPath = location.pathname === '/' ? '/' : location.pathname;

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 56, flexShrink: 0, zIndex: 10,
      borderBottom: '1px solid var(--pt-border)',
      background: 'var(--pt-surface-1)',
      gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, fontWeight: 700, fontSize: 15,
          background: 'linear-gradient(135deg, var(--pt-accent), oklch(0.55 0.2 280))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>P</div>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>polytrade</span>
        <PtBadge variant="info" style={{ marginLeft: 4, gap: 5 }}>
          <StatusDot status={agentActive ? 'live' : 'off'} size={6} />
          {agentActive ? 'Agent Live' : 'Paused'}
        </PtBadge>
        <WsStatusIndicator />
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 2 }}>
        {NAV.map(n => (
          <Link
            key={n.id}
            to={n.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--pt-font)',
              background: currentPath === n.id ? 'var(--pt-accent-dim)' : 'transparent',
              color: currentPath === n.id ? 'var(--pt-accent)' : 'var(--pt-text-3)',
              transition: 'all 0.15s',
              textDecoration: 'none',
            }}
          >
            <Icon name={n.icon} size={15} />
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TabBar
          tabs={[{ id: 'simulation', label: 'Sim' }, { id: 'real', label: 'Real' }]}
          active={walletMode}
          onChange={(m) => onWalletModeChange(m as 'simulation' | 'real')}
        />

        {walletConnected && walletAddress ? (
          <button
            onClick={onDisconnectWallet}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 8, border: '1px solid var(--pt-green)',
              background: 'oklch(0.45 0.12 155 / 0.1)', color: 'var(--pt-green)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pt-font)',
            }}
          >
            <Icon name="wallet" size={14} />
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </button>
        ) : (
          <button
            onClick={onConnectWallet}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 8, border: '1px solid var(--pt-border)',
              background: 'var(--pt-surface-2)', color: 'var(--pt-text-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pt-font)',
              transition: 'all 0.15s',
            }}
          >
            <Icon name="wallet" size={14} />
            Connect
          </button>
        )}
      </div>
    </header>
  );
}
