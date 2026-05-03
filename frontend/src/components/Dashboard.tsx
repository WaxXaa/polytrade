import { AgentStatus }       from './AgentStatus';
import { StatsCards }        from './StatsCards';
import { ActivityFeed }      from './ActivityFeed';
import { LeaderboardPanel }  from './LeaderboardPanel';
import { LiveMarketsPanel }  from './LiveMarketsPanel';
import { TraderDetail }      from './TraderDetail';
import type { Trader } from '@/stores';

interface DashboardProps {
  walletMode: 'simulation' | 'real';
  agentActive: boolean;
  setAgentActive: (v: boolean) => void;
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
  selectedTrader: Trader | null;
  setSelectedTrader: (t: Trader | null) => void;
}

export function Dashboard({
  walletMode,
  agentActive,
  setAgentActive,
  selectedTrader,
  setSelectedTrader,
}: DashboardProps) {
  if (selectedTrader) {
    return (
      <TraderDetail
        trader={selectedTrader}
        onBack={() => setSelectedTrader(null)}
        onToggleFollow={() => {}}
      />
    );
  }

  return (
    <MainDashboard
      walletMode={walletMode}
      agentActive={agentActive}
      setAgentActive={setAgentActive}
      onSelectTrader={setSelectedTrader}
    />
  );
}

// ── Main dashboard layout ──────────────────────────────────────────────────
interface MainDashboardProps {
  walletMode: 'simulation' | 'real';
  agentActive: boolean;
  setAgentActive: (v: boolean) => void;
  onSelectTrader: (t: Trader) => void;
}

function MainDashboard({ walletMode, agentActive, setAgentActive, onSelectTrader }: MainDashboardProps) {
  return (
    <div className="pt-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      {/* Agent status bar */}
      <AgentStatus
        active={agentActive}
        onToggle={() => setAgentActive(!agentActive)}
        walletMode={walletMode}
      />

      {/* Stats row */}
      <StatsCards walletMode={walletMode} />

      {/* 3-column grid: Activity | Leaderboard | Markets */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr', gap: 16 }}>
        <ActivityFeed />
        <LeaderboardPanel onSelectTrader={onSelectTrader} />
        <LiveMarketsPanel />
      </div>
    </div>
  );
}
