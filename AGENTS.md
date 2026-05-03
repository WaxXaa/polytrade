# Polymarket Copy Trading Agent

## Quick Start
```bash
pnpm install          # Install all deps (pnpm, NOT npm)
pnpm dev:backend      # Backend on :3000 (tsx watch, hot reload)
pnpm dev:frontend     # Frontend on :5173 (Vite HMR)
docker compose up -d  # Containerized dev (both services)
```

## Package Manager
**pnpm only.** `pnpm-workspace.yaml` defines workspaces, `package-lock.json` is gone. Use `pnpm --filter <workspace> <cmd>` for scoped commands.

## Commands
| Command | Scope |
|---------|-------|
| `pnpm dev:backend` / `dev:frontend` | Dev servers |
| `pnpm build` | Build both workspaces |
| `pnpm test` / `test:backend` / `test:frontend` | Vitest |
| `pnpm typecheck` | tsc --noEmit both workspaces |
| `pnpm db:generate` | Drizzle migration generation |
| `pnpm db:migrate` | Run migrations against SQLite |
| `pnpm db:seed` | Seed default config |
| `pnpm lint` | tsc --noEmit (no eslint yet) |

## Architecture
```
backend/ (Fastify + Socket.IO, port 3000)
  src/
    index.ts              → Entrypoint: creates AgentCore, registers routes/WS
    services/
      agent-core.ts       → Orchestrator: wires monitors → AI → risk → execution
      leaderboard-monitor → Polls data-api every 15min, emits trader changes
      trade-monitor       → Polls each trader's history every 30s, deduplicates
      ai-decision-engine  → Spread check + convergent signals + losing streaks
      position-calculator → Proportional sizing (pure fn, testable)
      risk-manager        → Stop-loss, exposure limits, hourly rate limiter
      trade-executor      → Real executor (CLOB API via raw HTTP)
      paper-trade-executor→ Simulated executor (instant fills, virtual balance)
      decision-logger     → Persists AI decisions to DB
    api/
      polymarket-data-api → fetchLeaderboard() / fetchTradeHistory()
    handlers/
      rest.ts             → /api/leaderboard, /api/positions, /api/config/risk, /api/mode, /api/status
      websocket.ts        → Socket.IO bridge — forwards WS events from AgentCore to clients
    ws/
      websocket-server.ts → WebSocketServer interface + impl used by AgentCore
    db/
      schema.ts           → Drizzle ORM schema (SQLite via @libsql/client)
      index.ts            → DB client + re-exports
      migrate.ts / seed.ts

frontend/ (React 18, Vite, Tailwind, shadcn/ui, port 5173)
  src/
    App.tsx               → Root: WS hook + API queries → Zustand store → Dashboard
    components/
      Dashboard.tsx        → Layout: Header + StatsCards + grid (leaderboard/activity/positions)
      Header.tsx           → Wallet (wagmi), Paper/Real toggle, Settings trigger
      StatsCards.tsx       → Balance, positions, trades/hour metrics
      LeaderboardPanel.tsx → Top traders list from store
      ActivityFeed.tsx     → Live trade signals feed
      PositionsPanel.tsx   → Open positions with stop-loss levels
      SettingsPanel.tsx    → Modal: auto-execute toggle + risk config inputs
    stores/index.ts        → Zustand: traders, positions, tradeSignals, riskConfig, mode, wallet
    hooks/
      useWebSocket.ts      → Socket.IO client, forwards events to store
      useApi.ts            → React Query hooks for REST endpoints
    lib/
      wagmi.ts             → Wagmi config (Polygon chain, injected connector)
      utils.ts             → cn(), formatCurrency(), truncateAddress(), etc.
```

## Dual Mode: Paper / Real
- **Paper** (default): All trades simulated. Virtual balance starts at 100 USDC (`PAPER_BALANCE` env). No CLOB API calls.
- **Real**: Uses CLOB API + wallet private key. Execute real orders on Polygon.
- Toggle is in the Header. Backend exposes `POST /api/mode { mode: "paper" | "real" }`.
- AgentCore.switchMode() restarts executor. Paper executor tracks virtual balance via PaperTradeExecutorImpl.

## Database
- **SQLite** via `@libsql/client` + Drizzle ORM
- `DB_PATH` env var (default `file:data/agent.db`)
- Tables: trade_history, top_trader_history, user_config, open_position, decision_log
- Migrations live in `backend/drizzle/migrations/`, generated via `drizzle-kit generate`
- In Docker: EFS volume mounted at `/app/data` for persistence

## Env Vars
| Var | Required | Default |
|-----|----------|---------|
| `PORT` | No | 3000 |
| `HOST` | No | 0.0.0.0 |
| `DB_PATH` | No | file:data/agent.db |
| `CLOB_API_KEY` | Real mode | — |
| `CLOB_SECRET` | Real mode | — |
| `CLOB_PASSPHRASE` | Real mode | — |
| `PRIVATE_KEY` | Real mode | — |
| `PAPER_MODE` | No | true |
| `PAPER_BALANCE` | No | 100 |
| `VITE_API_URL` | Frontend build | http://localhost:3000 |
| `VITE_WS_URL` | Frontend build | http://localhost:3000 |

## Testing
- **Vitest** with `globals: true` — no imports needed for describe/it/expect
- Backend tests in `tests/unit/`, `tests/properties/`, `tests/integration/`
- Uses **fast-check** for property-based tests
- Coverage: v8 provider, src/**/*.ts
- Path aliases only in vitest config (`@models`, `@services`, `@api`, `@ws`, `@utils`, `@db`)
- Frontend uses `@/` alias for src/

## Vite Config
- Frontend dev server proxies `/api` and `/socket.io` to `http://localhost:3000`
- Backend does NOT use Vite — runs directly via tsx

## CI/CD
- `.github/workflows/deploy.yml`: Push to main → Docker build → ECR push → CloudFormation deploy → ECS rolling update
- Dockerfiles use multi-stage builds (dev target for local, production for deploy)
- Secrets live in AWS Secrets Manager (`PRIVATE_KEY`, `CLOB_*`), accessed via `startup.ts`

## Design
- Dark cyberpunk aesthetic: dark backgrounds (#0a0a0f range), cyan (#00f0ff) and magenta (#ff00aa) accents
- Glass-morphism panels with thin borders
- JetBrains Mono for data, Inter for UI
- Custom CSS utilities: `.panel`, `.glass`, `.glow-cyan`, `.badge-buy`, `.badge-sell`
