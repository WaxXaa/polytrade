import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { AgentProvider } from '@/context/AgentContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAgentStatus, usePauseAgent, useResumeAgent } from '@/hooks/useApi';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { PositionsPanel } from '@/components/PositionsPanel';
import { TradeHistory } from '@/components/TradeHistory';
import { SettingsPanel } from '@/components/SettingsPanel';
import { WalletModal } from '@/components/WalletModal';
import { NotificationToast } from '@/components/NotificationToast';
import { useAppStore, type Trader } from '@/stores';
import '@/styles/theme.css';

const queryClient = new QueryClient();

function AppInner() {
  const { walletConnected, walletAddress, setWalletConnected, setWalletAddress } = useAppStore();

  const [walletMode,      setWalletMode]      = useState<'simulation' | 'real'>('simulation');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [autoExecute,     setAutoExecute]     = useState(true);
  const [selectedTrader,  setSelectedTrader]  = useState<Trader | null>(null);

  // WebSocket connection
  useWebSocket();

  // Real agent state from backend
  const { data: agentStatus } = useAgentStatus();
  const pauseMutation = usePauseAgent();
  const resumeMutation = useResumeAgent();

  const agentActive = agentStatus ? (agentStatus.running && !agentStatus.paused) : false;
  const setAgentActive = (v: boolean) => {
    if (v) resumeMutation.mutate();
    else pauseMutation.mutate();
  };

  const handleWalletModeChange = (mode: 'simulation' | 'real') => {
    setWalletMode(mode);
    if (mode === 'real' && !walletConnected) {
      setShowWalletModal(true);
    }
  };

  const handleConnect = () => {
    setWalletConnected(true);
    setWalletAddress('0x7a3Fabc123e91B');
    setShowWalletModal(false);
  };

  const handleDisconnect = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletMode('simulation');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header
        walletMode={walletMode}
        onWalletModeChange={handleWalletModeChange}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnectWallet={() => setShowWalletModal(true)}
        onDisconnectWallet={handleDisconnect}
        agentActive={agentActive}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                walletMode={walletMode}
                agentActive={agentActive}
                setAgentActive={setAgentActive}
                autoExecute={autoExecute}
                setAutoExecute={setAutoExecute}
                selectedTrader={selectedTrader}
                setSelectedTrader={setSelectedTrader}
              />
            }
          />
          <Route path="/positions" element={<PositionsPanel walletMode={walletMode} />} />
          <Route path="/history" element={<TradeHistory />} />
          <Route
            path="/settings"
            element={
              <SettingsPanel
                agentActive={agentActive}
                setAgentActive={setAgentActive}
                autoExecute={autoExecute}
                setAutoExecute={setAutoExecute}
              />
            }
          />
        </Routes>
      </div>

      {/* Toast notifications */}
      <NotificationToast />

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AgentProvider>
          <AppInner />
        </AgentProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
