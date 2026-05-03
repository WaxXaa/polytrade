const DATA_API_BASE = 'https://data-api.polymarket.com';

export interface LeaderboardEntry {
  name: string;
  proxyWallet: string;
  pnl: number;
  volume: number;
  markets: number;
}

export interface TradeHistoryEntry {
  action: 'BUY' | 'SELL';
  market: string;
  outcome: string;
  amount: number;
  price: number;
  timestamp: string;
  conditionId: string;
  tokenId: string;
}

const MOCK_LEADERS: LeaderboardEntry[] = [
  { name: 'CryptoWhale',    proxyWallet: '0x1111111111111111111111111111111111111111', pnl: 245000, volume: 1200000, markets: 34 },
  { name: 'SatoshiNakamoto',proxyWallet: '0x2222222222222222222222222222222222222222', pnl: 189000, volume:  980000, markets: 28 },
  { name: 'VitalikFan',     proxyWallet: '0x3333333333333333333333333333333333333333', pnl: 156000, volume:  850000, markets: 22 },
  { name: 'MoonBoi',        proxyWallet: '0x4444444444444444444444444444444444444444', pnl: 134000, volume:  720000, markets: 19 },
  { name: 'AlphaLeaker',    proxyWallet: '0x5555555555555555555555555555555555555555', pnl: -45000, volume: 1100000, markets: 41 },
  { name: 'DeltaNeutral',   proxyWallet: '0x6666666666666666666666666666666666666666', pnl: 112000, volume:  640000, markets: 17 },
  { name: 'GigaBrain',      proxyWallet: '0x7777777777777777777777777777777777777777', pnl:  98000, volume:  590000, markets: 15 },
  { name: 'PolyKing',       proxyWallet: '0x8888888888888888888888888888888888888888', pnl:  74000, volume:  480000, markets: 12 },
  { name: 'EdgeFinder',     proxyWallet: '0x9999999999999999999999999999999999999999', pnl:  61000, volume:  410000, markets: 10 },
  { name: 'ProbabilityPro', proxyWallet: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', pnl:  38000, volume:  320000, markets:  8 },
];

const MOCK_MARKETS = [
  { title: 'Will BTC reach $150k in 2026?', conditionId: 'cond-btc-150k', outcome: 'Yes', tokenId: 'token-btc-yes' },
  { title: 'Will ETH ETF get approved by July?', conditionId: 'cond-eth-etf', outcome: 'Yes', tokenId: 'token-eth-yes' },
  { title: 'Will the Fed cut rates in Q3 2026?', conditionId: 'cond-fed-cut', outcome: 'No', tokenId: 'token-fed-no' },
  { title: 'Will Polymarket volume exceed $1B?', conditionId: 'cond-poly-vol', outcome: 'Yes', tokenId: 'token-poly-yes' },
];

export async function fetchLeaderboard(
  _filter: string,
  limit: number,
  offset: number,
): Promise<LeaderboardEntry[]> {
  try {
    const url = `${DATA_API_BASE}/leaderboard?window=monthly&limit=${limit}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Leaderboard API error: ${response.status}`);
    const data = (await response.json()) as unknown;
    if (Array.isArray(data)) return data as LeaderboardEntry[];
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown[] }).data)) {
      return (data as { data: LeaderboardEntry[] }).data;
    }
    return [];
  } catch (err) {
    console.warn('[polymarket-data-api] Leaderboard API unavailable, using mock traders:', (err as Error).message);
    return MOCK_LEADERS.slice(0, limit);
  }
}

export async function fetchTradeHistory(
  walletAddress: string,
): Promise<TradeHistoryEntry[]> {
  try {
    const url = `${DATA_API_BASE}/trades?address=${encodeURIComponent(walletAddress)}&limit=20`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Trade history API error: ${response.status}`);
    const data = (await response.json()) as unknown;
    if (Array.isArray(data)) return data as TradeHistoryEntry[];
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown[] }).data)) {
      return (data as { data: TradeHistoryEntry[] }).data;
    }
    return [];
  } catch (err) {
    console.warn('[polymarket-data-api] Trade history API unavailable, using mock trades:', (err as Error).message);
    const market = MOCK_MARKETS[Math.floor(Math.random() * MOCK_MARKETS.length)]!;
    const action: 'BUY' | 'SELL' = Math.random() > 0.4 ? 'BUY' : 'SELL';
    return [{
      action,
      market: market.title,
      outcome: market.outcome,
      amount: Math.floor(Math.random() * 2000 + 100),
      price: +(Math.random() * 0.7 + 0.1).toFixed(4),
      timestamp: new Date().toISOString(),
      conditionId: market.conditionId,
      tokenId: market.tokenId,
    }];
  }
}
