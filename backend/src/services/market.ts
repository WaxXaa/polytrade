import type { Market } from '../types/index.js';

const API_BASE = 'https://clob.polymarket.com';

export class MarketDataService {
  private marketCache: Map<string, Market> = new Map();
  private marketsList: Market[] = [];

  async getMarkets(limit: number = 100): Promise<Market[]> {
    if (this.marketsList.length > 0) {
      return this.marketsList.slice(0, limit);
    }

    try {
      const response = await fetch(`${API_BASE}/markets?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Markets fetch failed: ${response.status}`);
      }

      const data = await response.json();
      this.marketsList = Array.isArray(data) ? data : (data.data || []);
      
      // Cache markets
      for (const market of this.marketsList) {
        this.marketCache.set(market.id, market);
      }

      return this.marketsList.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      throw error;
    }
  }

  async getMarket(marketId: string): Promise<Market | null> {
    // Check cache first
    const cached = this.marketCache.get(marketId);
    if (cached) return cached;

    try {
      const response = await fetch(`${API_BASE}/markets/${marketId}`);
      
      if (!response.ok) {
        return null;
      }

      const market = await response.json();
      this.marketCache.set(marketId, market);
      
      return market;
    } catch (error) {
      console.error(`Failed to fetch market ${marketId}:`, error);
      return null;
    }
  }

  async getMarketPrices(marketId: string): Promise<{ bid: number; ask: number; last: number }> {
    try {
      const market = await this.getMarket(marketId);
      if (!market || !market.clobTokenIds || market.clobTokenIds.length === 0) {
        return { bid: 0, ask: 0, last: 0 };
      }

      // Get order book for first outcome token
      const tokenId = market.clobTokenIds[0];
      const response = await fetch(`${API_BASE}/orderbook?token_id=${tokenId}`);
      
      if (!response.ok) {
        return { bid: 0, ask: 0, last: 0 };
      }

      const orderbook = await response.json();
      
      const bestBid = orderbook.bids?.[0]?.price ? parseFloat(orderbook.bids[0].price) : 0;
      const bestAsk = orderbook.asks?.[0]?.price ? parseFloat(orderbook.asks[0].price) : 0;
      const last = market.lastTradePrice ? parseFloat(market.lastTradePrice) : ((bestBid + bestAsk) / 2);

      return { bid: bestBid, ask: bestAsk, last };
    } catch (error) {
      console.error(`Failed to get prices for market ${marketId}:`, error);
      return { bid: 0, ask: 0, last: 0 };
    }
  }

  getActiveMarkets(): Market[] {
    return this.marketsList.filter(m => m.active && !m.closed);
  }

  getMarketByTokenId(tokenId: string): Market | null {
    return this.marketsList.find(m => 
      m.clobTokenIds?.includes(tokenId) || m.outcomeTokenIds?.includes(tokenId)
    ) || null;
  }

  isMarketAvailable(marketId: string): boolean {
    const market = this.marketCache.get(marketId);
    if (!market) return false;
    return market.active && !market.closed && market.liquidityNum >= 1000;
  }
}

export const marketDataService = new MarketDataService();