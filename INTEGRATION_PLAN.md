# Frontend-Backend Integration Plan

## Current State
- Backend starts on `:3000`, migrations run, health/status APIs work
- Frontend builds, compiles, `pnpm typecheck` passes
- Core problem: **no data flows between backend and frontend** — UI shows empty leaderboard, empty activity feed, $0 balance

---

## Problem 1: Polymarket API returns 404

**File:** `backend/src/api/polymarket-data-api.ts:27`
```
GET https://data-api.polymarket.com/leaderboard?window=monthly&limit=10&offset=0 → 404
```

**Root cause:** Endpoint unknown/inaccessible. `fetchLeaderboard()` throws → leaderboard monitor keeps empty trader list → `getTopTraders()` always `[]`.

**Fix:** Add seed/mock traders when API fails, so the agent has data to work with.

### Implementation (backend/src/api/polymarket-data-api.ts)

```ts
// Add after the existing export, before the class/function that calls it:

const MOCK_TRADERS: TopTrader[] = [
  {
    name: "CryptoWhale",
    proxyWallet: "0x1111111111111111111111111111111111111111",
    pnl: 245000,
    volume: 1200000,
    markets: 34,
    rank: 1,
    confidenceWeight: 0.92,
    consecutiveLosses: 0,
    lastUpdated: new Date(),
  },
  {
    name: "SatoshiNakamoto",
    proxyWallet: "0x2222222222222222222222222222222222222222",
    pnl: 189000,
    volume: 980000,
    markets: 28,
    rank: 2,
    confidenceWeight: 0.87,
    consecutiveLosses: 0,
    lastUpdated: new Date(),
  },
  {
    name: "VitalikFan",
    proxyWallet: "0x3333333333333333333333333333333333333333",
    pnl: 156000,
    volume: 850000,
    markets: 22,
    rank: 3,
    confidenceWeight: 0.81,
    consecutiveLosses: 1,
    lastUpdated: new Date(),
  },
  {
    name: "MoonBoi",
    proxyWallet: "0x4444444444444444444444444444444444444444",
    pnl: 134000,
    volume: 720000,
    markets: 19,
    rank: 4,
    confidenceWeight: 0.75,
    consecutiveLosses: 2,
    lastUpdated: new Date(),
  },
  {
    name: "AlphaLeaker",
    proxyWallet: "0x5555555555555555555555555555555555555555",
    pnl: -45000,
    volume: 1100000,
    markets: 41,
    rank: 5,
    confidenceWeight: 0.45,
    consecutiveLosses: 3,
    lastUpdated: new Date(),
  },
];
```

**Modify `fetchLeaderboard()`:**
```ts
export async function fetchLeaderboard(
  _filter: string,
  limit: number,
  _offset: number
): Promise<TopTrader[]> {
  try {
    const url = `https://data-api.polymarket.com/leaderboard?window=monthly&limit=${limit}&offset=${_offset}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Leaderboard API error: ${response.status}`);
    const data = await response.json();
    return data.map((item: any, index: number) => ({
      name: item.username || item.wallet?.slice(0, 8) || 'Unknown',
      proxyWallet: item.wallet || '',
      pnl: item.pnl || 0,
      volume: item.volume || 0,
      markets: item.markets || 0,
      rank: item.rank || index + 1,
      confidenceWeight: item.confidenceWeight || 0.5,
      consecutiveLosses: item.consecutiveLosses || 0,
      lastUpdated: new Date(),
    }));
  } catch (err) {
    console.warn('[polymarket-data-api] API unavailable, using mock traders:', (err as Error).message);
    return MOCK_TRADERS;
  }
}
```

---

## Problem 2: WebSocket bridge completely disconnected

**Root cause:** `WebSocketServerImpl.broadcast()` iterates `this.clients` which is always empty because `onBroadcast()` (the registration method) is never called. `createWsHandler()` creates Socket.IO but never bridges it to AgentCore's internal event bus.

**Files involved:**
- `backend/src/handlers/websocket.ts` — creates Socket.IO handler, receives `agent: AgentCore`
- `backend/src/ws/websocket-server.ts` — `WebSocketServerImpl` with `broadcast()` and `onBroadcast()` 
- `backend/src/services/agent-core.ts` — calls `this.wsServer.broadcast()`

### Implementation

**Step A: Fix `createWsHandler` in `backend/src/handlers/websocket.ts`**

At the end of `createWsHandler()`, after the Socket.IO setup, bridge the events:

```ts
// Bridge AgentCore internal events to Socket.IO clients
const wsServer = agent['wsServer']; // or expose via a method

wsServer.onBroadcast((event: WSEvent) => {
  const eventName = event.type.replace(/-/g, '_'); // 'trade-executed' → 'trade_executed'
  io.emit(eventName, (event as any).data);
});
```

But `wsServer` is private. Better approach: **add a method to `AgentCore`** that accepts a broadcast listener.

**Add to `AgentCore` class:**
```ts
/** Subscribe to all internal broadcast events (for Socket.IO bridging) */
onBroadcast(listener: (event: WSEvent) => void): void {
  this.wsServer.onBroadcast(listener);
}
```

**Then in `createWsHandler` (websocket.ts):**
```ts
export function createWsHandler(fastify: FastifyInstance, agent: AgentCore): void {
  // ...existing Socket.IO setup...

  // Bridge: forward all AgentCore broadcast events to connected Socket.IO clients
  agent.onBroadcast((event: WSEvent) => {
    const eventName = event.type.replace(/-/g, '_');
    io.emit(eventName, (event as any).data);
  });

  // Update subscription handlers to emit real data:
  io.on('connection', (socket) => {
    socket.on('subscribe', ({ channels }: { channels: string[] }) => {
      if (channels.includes('leaderboard')) {
        socket.emit('leaderboard_update', agent.getTopTraders());
      }
      if (channels.includes('positions')) {
        socket.emit('position_update', agent.getOpenPositions());
      }
    });
  });
}
```

**Step B: Fix the `position_update` event name collision**

Backend emits same event name `position_update` for two different payloads:
1. Subscription response: `Position[]` (array)
2. Live position change: `{ position: Position, changeType: 'opened'|'closed'|'updated', currentPnl?: number }`

**Fix in frontend `useWebSocket.ts`** — handle both shapes:

```ts
socket.on('position_update', (data: any) => {
  const s = stores.getState();
  if (Array.isArray(data)) {
    // Subscription response: Position[]
    s.setPositions(data.map(mapBackendPosition));
  } else if (data?.position && data?.changeType) {
    // Live position change event
    if (data.changeType === 'opened') {
      s.addPosition(mapBackendPosition(data.position));
    } else if (data.changeType === 'closed') {
      s.removePosition(data.position.id);
    } else if (data.changeType === 'updated') {
      s.updatePosition(data.position.id, mapBackendPosition(data.position));
    }
  }
});
```

Remove the separate `position_update_event` listener entirely (it doesn't exist on backend).

**Step C: Ensure `AgentCore` exposes needed methods**

Add to `AgentCore`:
```ts
getTopTraders(): TopTrader[] {
  return this.leaderboardMonitor.getTopTraders();
}

getOpenPositions(): Position[] {
  return [...this.openPositions];
}
```

---

## Problem 3: Paper balance shows 0 instead of 100

**File:** `backend/src/services/agent-core.ts`, `start()` method, line ~156

**Current code:**
```ts
this.walletAddress = walletAddress;
if (!this.paperMode) {
  this.userBalance = initialBalance;
}
this.running = true;
```

**Fix:**
```ts
this.walletAddress = walletAddress;
this.userBalance = initialBalance; // Always set, paper mode defaults to 100 via constructor
this.running = true;
```

The `paperBalance` is already set in the constructor:
```ts
this.tradeExecutor = new PaperTradeExecutorImpl(paperBalance);
```
And `PaperTradeExecutorImpl` tracks its own virtual balance. But `userBalance` (used by `getStatus()` for the `/api/status` response) is never set in paper mode. Always set it.

**Also fix in `getStatus()`** — use the executor's balance in paper mode:

```ts
getStatus(): AgentStatus {
  return {
    running: this.running,
    topTradersCount: this.leaderboardMonitor.getTopTraders().length,
    openPositionsCount: this.openPositions.length,
    tradesLastHour: this.riskManager.getTradesLastHour(),
    lastLeaderboardUpdate: this.lastLeaderboardUpdate,
    lastTradeCheck: this.lastTradeCheck,
    mode: this.paperMode ? 'paper' : 'real',
    balance: this.paperMode
      ? (this.tradeExecutor as PaperTradeExecutorImpl).getBalance?.() ?? this.userBalance
      : this.userBalance,
  };
}
```

---

## Problem 4: Frontend components don't call REST API

**Root cause:** `useLeaderboard()`, `usePositions()`, `useAgentStatus()` hooks exist but are never imported.

### Implementation

**File: `frontend/src/components/LeaderboardPanel.tsx`**

Import and use `useLeaderboard()`:

```tsx
import { useLeaderboard } from '@/hooks/useApi';
```

Inside the component:
```tsx
export function LeaderboardPanel({ onSelectTrader }: LeaderboardPanelProps) {
  const { traders: storeTraders, toggleFollowTrader } = useAppStore();
  const { data: apiTraders } = useLeaderboard(10);

  // Use API data when available, fall back to store (WebSocket data)
  const traders = (apiTraders ?? []).length > 0
    ? apiTraders!.map((t, i) => ({
        rank: String(t.rank),
        proxyWallet: t.proxyWallet,
        userName: t.name,
        vol: t.volume,
        pnl: t.pnl,
      }))
    : storeTraders;

  // ...rest of component unchanged
}
```

**File: `frontend/src/components/StatsCards.tsx`**

Import `useAgentStatus()` and use real balance:
```tsx
import { useAgentStatus } from '@/hooks/useApi';

export function StatsCards({ walletMode }: StatsCardsProps) {
  const { data: agentStatus } = useAgentStatus();
  const { positions, tradeSignals, traders } = useAppStore();
  
  const balance = agentStatus?.balance ?? 100;
  
  // Use real balance instead of hardcoded 12500
  // ...update StatCard for Portfolio Value to use `balance + positions.reduce(...)`
}
```

**File: `frontend/src/components/PositionsPanel.tsx`**

Import `usePositions()` and merge with store:
```tsx
import { usePositions } from '@/hooks/useApi';

export function PositionsPanel({ walletMode }: PositionsPanelProps) {
  const storePositions = useAppStore(s => s.positions);
  const { data: apiPositions } = usePositions();
  
  // API positions from backend, mapped to frontend format
  const positions = (apiPositions ?? []).map(p => ({
    id: p.id,
    marketId: p.conditionId,
    marketQuestion: p.market,
    side: p.direction,
    size: p.size,
    entryPrice: p.entryPrice,
    currentPrice: p.entryPrice, // Backend doesn't track current price yet
    pnl: 0,                     // Backend doesn't track PnL yet
    pnlPercent: 0,
    stopLoss: p.stopLossLevel,
    timestamp: new Date(p.openedAt).getTime(),
  }));
  
  // ...rest of component
}
```

---

## Problem 5: Mock trade generation for demo

With mock traders in the leaderboard, the `TradeMonitor` needs to detect "trades" from these traders to generate activity. Currently `fetchTradeHistory()` also calls the Polymarket API which will also 404.

### Implementation

**File: `backend/src/api/polymarket-data-api.ts`**

Add mock trade history:
```ts
export async function fetchTradeHistory(
  traderWallet: string,
  _limit: number
): Promise<TradeHistoryEntry[]> {
  try {
    const url = `https://data-api.polymarket.com/activity?user=${traderWallet}&limit=${_limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Trade history API error: ${response.status}`);
    const data = await response.json();
    return data.map((item: any) => ({
      id: item.id || crypto.randomUUID(),
      traderWallet: item.user || traderWallet,
      traderName: item.username || traderWallet.slice(0, 8),
      market: item.title || item.market || 'Unknown Market',
      conditionId: item.conditionId || '',
      outcome: item.outcome || 'Yes',
      tokenId: item.tokenId || '',
      action: item.side || (Math.random() > 0.5 ? 'BUY' : 'SELL'),
      amount: item.amount || Math.random() * 500 + 10,
      price: item.price || Math.random() * 0.8 + 0.1,
      timestamp: item.timestamp || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[polymarket-data-api] Trade history API unavailable, using mocks:', (err as Error).message);
    // Generate mock trades for the known mock traders
    const mockMarkets = [
      { title: 'Will BTC reach $150k in 2026?', conditionId: 'cond-btc-150k', outcome: 'Yes', tokenId: 'token-btc-yes' },
      { title: 'Will ETH ETF get approved by July?', conditionId: 'cond-eth-etf', outcome: 'Yes', tokenId: 'token-eth-yes' },
      { title: 'Will the Fed cut rates in Q3 2026?', conditionId: 'cond-fed-cut', outcome: 'No', tokenId: 'token-fed-no' },
      { title: 'Will Polymarket volume exceed $1B?', conditionId: 'cond-poly-vol', outcome: 'Yes', tokenId: 'token-poly-yes' },
    ];
    const market = mockMarkets[Math.floor(Math.random() * mockMarkets.length)]!;
    const action = Math.random() > 0.4 ? 'BUY' : 'SELL';
    const amount = Math.floor(Math.random() * 2000 + 100);
    const price = +(Math.random() * 0.7 + 0.1).toFixed(4);
    
    return [{
      id: crypto.randomUUID(),
      traderWallet,
      traderName: MOCK_TRADERS.find(t => t.proxyWallet === traderWallet)?.name || 'Unknown',
      market: market.title,
      conditionId: market.conditionId,
      outcome: market.outcome,
      tokenId: market.tokenId,
      action,
      amount,
      price,
      timestamp: new Date().toISOString(),
    }];
  }
}
```

**Note:** Adjust the `TradeHistoryEntry` type import. The function needs to return the correct shape matching what `TradeMonitor` expects. Check `backend/src/models/db-models.ts` for the exact interface.

---

## Summary of all files to modify

| File | Change |
|------|--------|
| `backend/src/api/polymarket-data-api.ts` | Add `MOCK_TRADERS` constant; return mocks when API fails for both `fetchLeaderboard()` and `fetchTradeHistory()` |
| `backend/src/services/agent-core.ts` | Add `onBroadcast()`, `getTopTraders()`, `getOpenPositions()` public methods; fix `userBalance` in paper mode; fix `getStatus()` balance |
| `backend/src/handlers/websocket.ts` | Bridge `agent.onBroadcast()` to Socket.IO `io.emit()`; fix subscription handler to emit real data |
| `frontend/src/hooks/useWebSocket.ts` | Fix `position_update` listener to handle both array and single-object payloads; remove `position_update_event` |
| `frontend/src/components/LeaderboardPanel.tsx` | Import `useLeaderboard()`, merge API data with store |
| `frontend/src/components/StatsCards.tsx` | Import `useAgentStatus()`, use real balance |
| `frontend/src/components/PositionsPanel.tsx` | Import `usePositions()`, use API data |
| `frontend/src/components/ActivityFeed.tsx` | No code changes needed — will work once WS bridge is fixed and trades flow |

---

## Verification steps

1. `pnpm dev:backend` — should show: `[LeaderboardMonitor] Poll found 5 top traders` (mock)
2. `pnpm dev:frontend` — dashboard should show 5 traders in leaderboard, live activity feed populating, balance at $100
3. `curl localhost:3000/api/leaderboard` — should return 5 traders
4. `curl localhost:3000/api/status` — should return `balance: 100`
5. Open browser at `:5173` — all panels populated, activity feed scrolling
