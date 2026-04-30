import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useLeaderboard, useMarkets, usePositions } from '@/hooks/useApi';
import { useAppStore } from '@/stores';
import { Dashboard } from '@/components/Dashboard';

function App() {
  const { setTraders, setMarkets, setPositions } = useAppStore();
  
  // Initialize WebSocket connection
  useWebSocket();
  
  // Fetch initial data
  const { data: leaderboardData } = useLeaderboard(10);
  const { data: marketsData } = useMarkets(50);
  const { data: positionsData } = usePositions();

  // Update store when data arrives
  useEffect(() => {
    if (leaderboardData?.data) {
      setTraders(leaderboardData.data);
    }
  }, [leaderboardData, setTraders]);

  useEffect(() => {
    if (marketsData?.data) {
      setMarkets(marketsData.data);
    }
  }, [marketsData, setMarkets]);

  useEffect(() => {
    if (positionsData?.data) {
      setPositions(positionsData.data);
    }
  }, [positionsData, setPositions]);

  return (
    <div className="min-h-screen matrix-bg">
      <Dashboard />
    </div>
  );
}

export default App;