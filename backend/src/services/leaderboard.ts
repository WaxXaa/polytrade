import type { Trader } from '../types/index.js';

const CLOB_HOST = 'https://clob.polymarket.com';
const API_BASE = 'https://clob.polymarket.com';

export class LeaderboardService {
  private cachedLeaderboard: Trader[] = [];
  private lastFetch: number = 0;
  private fetchInterval: number = 5 * 60 * 1000; // 5 minutes

  async getTopTraders(limit: number = 10): Promise<Trader[]> {
    const now = Date.now();
    
    // Return cached if still fresh
    if (this.cachedLeaderboard.length > 0 && now - this.lastFetch < this.fetchInterval) {
      return this.cachedLeaderboard.slice(0, limit);
    }

    try {
      const response = await fetch(`${API_BASE}/leaderboard?window=monthly&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Leaderboard fetch failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the response - Polymarket returns data differently
      let traders: Trader[] = [];
      
      if (Array.isArray(data)) {
        traders = data;
      } else if (data.data && Array.isArray(data.data)) {
        traders = data.data;
      } else if (data.traders && Array.isArray(data.traders)) {
        traders = data.traders;
      }

      this.cachedLeaderboard = traders;
      this.lastFetch = now;

      return traders.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      
      // Return cached on error
      if (this.cachedLeaderboard.length > 0) {
        return this.cachedLeaderboard.slice(0, limit);
      }
      
      throw error;
    }
  }

  async getTraderByAddress(address: string): Promise<Trader | null> {
    const traders = await this.getTopTraders(50);
    return traders.find(t => t.proxyWallet.toLowerCase() === address.toLowerCase()) || null;
  }

  getTrackedTraders(): Trader[] {
    return this.cachedLeaderboard;
  }

  forceRefresh(): void {
    this.lastFetch = 0;
  }
}

export const leaderboardService = new LeaderboardService();