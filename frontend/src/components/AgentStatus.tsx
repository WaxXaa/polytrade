import { Icon } from './ui/Icon';
import { useAgentStatus } from '@/hooks/useApi';

interface AgentStatusProps {
  active: boolean;
  onToggle: () => void;
  walletMode: 'simulation' | 'real';
}

function AgentPulse({ active, size = 48 }: { active: boolean; size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {active && (
        <>
          <div style={{ position: 'absolute', inset: 0,  borderRadius: '50%', border: '1px solid var(--pt-accent-dim)', animation: 'pt-agent-ring 2.5s ease-out infinite',      opacity: 0 }} />
          <div style={{ position: 'absolute', inset: 6,  borderRadius: '50%', border: '1px solid var(--pt-accent-dim)', animation: 'pt-agent-ring 2.5s ease-out infinite 0.5s', opacity: 0 }} />
          <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '1px solid var(--pt-accent-dim)', animation: 'pt-agent-ring 2.5s ease-out infinite 1s',   opacity: 0 }} />
        </>
      )}
      <div style={{
        width: size * 0.45, height: size * 0.45, borderRadius: '50%',
        background: active ? 'var(--pt-accent)' : 'var(--pt-surface-3)',
        boxShadow: active ? '0 0 16px var(--pt-accent-dim), 0 0 32px var(--pt-accent-dim)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: active ? 'pt-agent-breathe 3s ease-in-out infinite' : 'none',
        color: active ? '#fff' : 'var(--pt-text-3)',
      }}>
        <Icon name="bot" size={size * 0.22} />
      </div>
    </div>
  );
}

export function AgentStatus({ active, onToggle, walletMode }: AgentStatusProps) {
  const { data: agentStatus } = useAgentStatus();

  const topTradersCount = agentStatus?.topTradersCount ?? 0;
  const tradesLastHour  = agentStatus?.tradesLastHour ?? 0;

  let statusLine = '';
  if (!agentStatus) {
    statusLine = 'Connecting to backend…';
  } else if (!agentStatus.running) {
    statusLine = 'Backend not running — start the server to activate the agent';
  } else if (agentStatus.paused) {
    statusLine = `Paused · monitoring ${topTradersCount} traders · ${tradesLastHour} trades last hour`;
  } else {
    statusLine = `Scanning trades of ${topTradersCount} top traders · ${tradesLastHour} copies executed last hour`;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px', borderRadius: 12,
      background: 'var(--pt-surface-1)', border: '1px solid var(--pt-border)',
    }}>
      <AgentPulse active={active} size={48} />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Copy Trading Agent</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: active ? 'oklch(0.45 0.12 155 / 0.15)' : 'var(--pt-surface-2)',
            color: active ? 'var(--pt-green)' : 'var(--pt-text-3)',
            border: active ? '1px solid oklch(0.45 0.12 155 / 0.25)' : '1px solid transparent',
          }}>
            {active ? 'Running' : agentStatus?.paused ? 'Paused' : 'Stopped'}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'oklch(0.6 0.12 230 / 0.15)', color: 'var(--pt-accent)',
            border: '1px solid oklch(0.6 0.12 230 / 0.25)',
          }}>
            {walletMode === 'simulation' ? 'Paper mode' : 'Live trading'}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--pt-text-3)' }}>
          {statusLine}
        </span>
      </div>

      <button
        onClick={onToggle}
        disabled={!agentStatus?.running}
        title={!agentStatus?.running ? 'Start the backend server first' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
          cursor: agentStatus?.running ? 'pointer' : 'not-allowed',
          opacity: agentStatus?.running ? 1 : 0.4,
          fontFamily: 'var(--pt-font)',
          background: active ? 'oklch(0.55 0.18 15 / 0.1)' : 'oklch(0.45 0.12 155 / 0.1)',
          color: active ? 'var(--pt-red)' : 'var(--pt-green)',
          borderWidth: 1, borderStyle: 'solid',
          borderColor: active ? 'var(--pt-red)' : 'var(--pt-green)',
        }}
      >
        <Icon name={active ? 'pause' : 'play'} size={14} />
        {active ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}
