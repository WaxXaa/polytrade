import { Header } from './Header';
import { StatsCards } from './StatsCards';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ActivityFeed } from './ActivityFeed';
import { PositionsPanel } from './PositionsPanel';
import { SettingsPanel } from './SettingsPanel';

export function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 lg:p-6 space-y-4">
        {/* Stats Overview */}
        <StatsCards />
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Leaderboard - Left Side */}
          <div className="lg:col-span-4 xl:col-span-3">
            <LeaderboardPanel />
          </div>
          
          {/* Activity Feed - Center */}
          <div className="lg:col-span-4 xl:col-span-6">
            <ActivityFeed />
          </div>
          
          {/* Positions - Right Side */}
          <div className="lg:col-span-4 xl:col-span-3">
            <PositionsPanel />
          </div>
        </div>
      </main>
      
      {/* Settings Modal would go here */}
    </div>
  );
}