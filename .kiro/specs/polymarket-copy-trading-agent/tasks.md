# Implementation Plan: Polymarket Copy Trading Agent

## Overview

This plan implements a copy trading agent for Polymarket that monitors top traders from the leaderboard, detects their trades, calculates proportional positions, applies AI-driven decision logic, manages risk, and executes orders via the CLOB API. A React frontend with a futuristic dark theme displays real-time activity via WebSocket. The implementation follows an incremental approach: data models and shared utilities first, then core backend components, API integration, WebSocket layer, frontend, and finally wiring everything together.

## Tasks

- [x] 1. Project setup and data models
  - [x] 1.1 Initialize project structure with TypeScript, Vitest, and fast-check
    - Create monorepo or workspace structure with `backend/` and `frontend/` directories
    - Initialize `package.json` with TypeScript, Vitest, fast-check, and ts-node
    - Configure `tsconfig.json` for both backend and frontend
    - Set up Vitest config with property test support
    - Create directory structure: `src/models/`, `src/services/`, `src/api/`, `src/ws/`, `tests/properties/`, `tests/unit/`, `tests/integration/`, `tests/generators/`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3_

  - [x] 1.2 Define core TypeScript domain interfaces and types
    - Create `src/models/types.ts` with all domain interfaces: `TopTrader`, `TraderChange`, `DetectedTrade`, `PositionCalcParams`, `PositionResult`, `TradeContext`, `TradeDecision`, `DecisionFactor`, `RiskConfig`, `RiskCheck`, `StopLossAction`, `OrderParams`, `OrderResult`, `WSEvent`
    - Create `src/models/db-models.ts` with database entity types: `TradeRecord`, `UserConfig`, `Position`, `DailyMetrics`, `LeaderboardEntry`, `TradeHistoryEntry`, `DecisionLog`
    - Define default values for `RiskConfig` (50% exposure, 15% stop-loss, 20 trades/hour, 10% max position, 1 USDC min trade, 5 USDC min balance)
    - _Requirements: 3.1, 5.1, 5.3, 5.5, 10.1, 10.2, 10.3_

  - [x] 1.3 Set up SQLite database with ORM schema and migrations
    - Install and configure Drizzle ORM with SQLite driver (better-sqlite3)
    - Create schema definitions for all tables: `trade_history`, `top_trader_history`, `user_config`, `open_position`, `daily_metrics`, `decision_log`
    - Generate and run initial migration
    - Implement seed function for default `UserConfig` values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 1.4 Implement serialization/deserialization utilities
    - Create `src/utils/serialization.ts` with `serializeTradeRecord`, `deserializeTradeRecord`, `serializeUserConfig`, `deserializeUserConfig` functions
    - Handle Date objects, numeric precision, and nullable fields correctly during JSON round-trips
    - Create `src/utils/validation.ts` with input validation for API responses (JSON schema or Zod)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 1.5 Write property test for TradeRecord round-trip serialization
    - **Property 13: Round-trip de serialización de objetos de operación**
    - Create generator for valid `TradeRecord` objects in `tests/generators/trade.generators.ts`
    - Verify that `deserialize(serialize(tradeRecord))` produces an equivalent object for all valid inputs
    - **Validates: Requirements 10.1, 10.2, 10.4**

  - [ ]* 1.6 Write property test for UserConfig round-trip serialization
    - **Property 14: Round-trip de serialización de configuración**
    - Create generator for valid `UserConfig` objects in `tests/generators/config.generators.ts`
    - Verify that `deserialize(serialize(userConfig))` produces an equivalent object for all valid inputs
    - **Validates: Requirements 10.3, 10.5, 9.3**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Leaderboard Monitor
  - [x] 3.1 Create Polymarket Data API client for leaderboard
    - Create `src/api/polymarket-data-api.ts` with typed HTTP client (using fetch or axios)
    - Implement `fetchLeaderboard(window, limit, offset)` calling `GET /leaderboard` on `data-api.polymarket.com`
    - Implement exponential backoff retry logic (max 5 min interval) for API failures
    - Handle JSON parsing errors gracefully, logging malformed responses
    - _Requirements: 1.1, 1.5, 10.2, 10.6_

  - [x] 3.2 Implement LeaderboardMonitor service
    - Create `src/services/leaderboard-monitor.ts` implementing the `LeaderboardMonitor` interface
    - Implement 15-minute polling interval with `start()` and `stop()` methods
    - Implement reconciliation logic: compare previous and new snapshots, emit `traders-updated` events for additions and removals
    - Maintain active trader list matching top 10 from latest snapshot
    - On API failure, retain last valid list and apply exponential backoff
    - Persist trader changes to `top_trader_history` table via DB layer
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.2_

  - [ ]* 3.3 Write property test for leaderboard reconciliation
    - **Property 1: Reconciliación del Leaderboard**
    - Create generator for pairs of consecutive leaderboard snapshots in `tests/generators/trader.generators.ts`
    - Verify that after reconciliation, the active trader list matches exactly the top 10 of the new snapshot
    - Verify removed traders are no longer in the active list and new traders are added
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 3.4 Write unit tests for LeaderboardMonitor
    - Test API failure handling: verify last valid list is retained
    - Test exponential backoff timing
    - Test trader addition and removal event emission
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Implement Trade Monitor
  - [x] 4.1 Create Polymarket Data API client for trade history and positions
    - Add `fetchTradeHistory(walletAddress)` calling `GET /activity?user={address}` to the data API client
    - Add `fetchPositions(walletAddress)` calling `GET /positions?user={address}`
    - Handle per-trader API errors in isolation (one trader's error doesn't affect others)
    - _Requirements: 2.1, 2.4, 10.2, 10.6_

  - [x] 4.2 Implement TradeMonitor service
    - Create `src/services/trade-monitor.ts` implementing the `TradeMonitor` interface
    - Implement 30-second polling interval per tracked trader
    - Implement trade deduplication using `tradeId` (hash of trader+market+timestamp+amount)
    - Emit `new-trade` events with fully populated `DetectedTrade` objects
    - Validate all required fields are present before emitting (timestamp, market, direction, price, amount)
    - On per-trader API error, log and continue monitoring other traders
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.3 Write property test for trade data completeness
    - **Property 2: Completitud de datos en detección de trades**
    - Create generator for valid API trade history responses in `tests/generators/trade.generators.ts`
    - Verify that every detected trade contains all required fields (timestamp, market, direction, price, amount) with no null values
    - **Validates: Requirements 2.2**

  - [ ]* 4.4 Write property test for trade deduplication idempotency
    - **Property 3: Idempotencia en deduplicación de trades**
    - Generate random trades with repeated tradeIds
    - Verify processing the same trade twice produces exactly one record and no duplicate side effects
    - **Validates: Requirements 2.3**

- [x] 5. Implement Position Calculator
  - [x] 5.1 Implement PositionCalculator service
    - Create `src/services/position-calculator.ts` implementing the `PositionCalculator` interface
    - Implement proportional calculation: `tradeAmount * (userBalance / traderEstimatedCapital) * confidenceWeight * signalMultiplier`
    - Enforce minimum trade amount (< 1 USDC → discard with reason)
    - Enforce maximum position size (> 10% of user balance → cap at 10%)
    - Return `PositionResult` with `wasLimited`, `wasDiscarded`, `discardReason`, and `ratioCapital` fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 5.2 Write property test for proportional position calculation correctness
    - **Property 4: Corrección del cálculo de posición proporcional**
    - Create generator for valid `PositionCalcParams` tuples in `tests/generators/position.generators.ts`
    - Verify determinism: calculating twice with same inputs produces identical results
    - Verify formula correctness: result equals `tradeAmount * (userBalance / traderEstimatedCapital) * confidenceWeight * signalMultiplier` (before capping/discarding)
    - **Validates: Requirements 3.1, 3.6**

  - [ ]* 5.3 Write property test for position invariants
    - **Property 5: Invariantes del cálculo de posición**
    - Verify that results < 1 USDC are discarded (`wasDiscarded === true`)
    - Verify that results never exceed 10% of user balance (`wasLimited === true` when capped)
    - **Validates: Requirements 3.3, 3.4**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Risk Manager
  - [x] 7.1 Implement RiskManager service
    - Create `src/services/risk-manager.ts` implementing the `RiskManager` interface
    - Implement `canOpenPosition()`: check total exposure against configured max exposure percent
    - Implement `evaluateStopLoss()`: compare current prices against entry prices, trigger close when loss >= stop-loss percent
    - Implement `canExecuteTrade()` and `recordExecution()`: track trades per hour using a sliding window of timestamps
    - Load risk configuration from database, use defaults if not found
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 7.2 Implement DecisionLogger for risk and AI decisions
    - Create `src/services/decision-logger.ts` for persisting decision records
    - Log all risk decisions (position limited, stop-loss triggered, operations paused) with: decision type, reasoning, input data, outcome, timestamp
    - Store in `decision_log` table with reference to related trade if applicable
    - _Requirements: 5.7, 8.5_

  - [ ]* 7.3 Write property test for exposure limit enforcement
    - **Property 6: Enforcement del límite de exposición**
    - Create generator for sets of open positions plus a proposed new trade
    - Verify that if total exposure + new trade > max exposure percent, the trade is rejected
    - Verify total exposed capital never exceeds the configured limit
    - **Validates: Requirements 5.2**

  - [ ]* 7.4 Write property test for stop-loss evaluation
    - **Property 7: Evaluación correcta de Stop-Loss**
    - Create generator for positions with random entry prices and current prices
    - Verify that when `(entryPrice - currentPrice) / entryPrice * 100 >= stopLossPercent`, a close action is generated
    - Verify that when loss is below threshold, no action is generated
    - **Validates: Requirements 5.4**

  - [ ]* 7.5 Write property test for hourly trade limit enforcement
    - **Property 8: Enforcement del límite de operaciones por hora**
    - Create generator for sequences of execution timestamps within a 1-hour window
    - Verify that when count >= limit, new trades are rejected; when below limit, trades are allowed
    - **Validates: Requirements 5.6**

  - [ ]* 7.6 Write property test for decision log completeness
    - **Property 9: Completitud del registro de decisiones**
    - Create generator for random risk and AI decisions
    - Verify every logged decision contains all required fields: decision type, reasoning, input data, outcome, timestamp
    - **Validates: Requirements 5.7, 8.5**

- [x] 8. Implement AI Decision Engine
  - [x] 8.1 Implement AIDecisionEngine service
    - Create `src/services/ai-decision-engine.ts` implementing the `AIDecisionEngine` interface
    - Implement convergent signal detection: if 2+ top traders trade same market/direction within 5 minutes, apply multiplier (1.0 < multiplier <= 1.5)
    - Implement losing streak tracking: if a trader has 3+ consecutive losses, reduce confidence weight to 50%
    - Implement spread threshold check: if market spread > 5%, postpone trade (discard after 10 min wait)
    - Implement `evaluateTrade()` returning `TradeDecision` with action, adjusted amount, reasoning, and factors
    - Implement `updateTraderPerformance()` to track win/loss sequences per trader
    - Log all intelligent decisions via DecisionLogger
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.2 Write property test for convergent signal multiplier
    - **Property 10: Multiplicador de señal convergente**
    - Create generator for sets of trades with varying timestamps, markets, and directions
    - Verify: 2+ convergent trades in same market/direction within 5 min → multiplier > 1.0 and <= 1.5
    - Verify: single trade → multiplier === 1.0
    - **Validates: Requirements 8.1**

  - [ ]* 8.3 Write property test for losing streak confidence reduction
    - **Property 11: Reducción de confianza por racha perdedora**
    - Create generator for sequences of win/loss results per trader
    - Verify: 3+ consecutive losses → confidence weight reduced to 50% of base
    - Verify: after a win following losses → confidence weight restored
    - **Validates: Requirements 8.2**

  - [ ]* 8.4 Write property test for spread threshold enforcement
    - **Property 12: Enforcement del umbral de spread**
    - Create generator for random spread values (0-100%)
    - Verify: spread > 5% → trade postponed or discarded
    - Verify: spread <= 5% → trade proceeds normally
    - **Validates: Requirements 8.4**

- [x] 9. Implement Trade Executor
  - [x] 9.1 Implement TradeExecutor service with CLOB API integration
    - Create `src/services/trade-executor.ts` implementing the `TradeExecutor` interface
    - Integrate `@polymarket/clob-client-v2` SDK for order signing (EIP-712) and L1→L2 credential derivation
    - Implement `executeOrder()`: send order to CLOB API, return `OrderResult` with success/failure details
    - Implement `checkApprovals()`: verify USDC and conditional token approvals on Polygon
    - Implement `getMarketSpread()`: fetch order book spread from CLOB API (`GET /book`, `GET /spread`)
    - Handle CLOB API rejections: log reason, do not auto-retry
    - Handle CLOB API timeouts: log error, mark trade as failed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 9.2 Write unit tests for TradeExecutor
    - Test order execution success flow with mocked CLOB client
    - Test CLOB API rejection handling (log reason, no retry)
    - Test CLOB API timeout handling (mark as failed)
    - Test approval checking logic
    - Test market spread retrieval
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement WebSocket Server and Agent Core
  - [x] 11.1 Implement WebSocket Server
    - Create `src/ws/websocket-server.ts` implementing the `WebSocketServer` interface
    - Use `ws` or `Socket.io` library for WebSocket connections
    - Implement `broadcast()` to send typed `WSEvent` messages to all connected clients
    - Handle client connection/disconnection gracefully
    - Ensure event transmission latency < 2 seconds
    - _Requirements: 7.1, 7.2, 7.7_

  - [x] 11.2 Implement Agent Core orchestrator
    - Create `src/services/agent-core.ts` that wires all components together
    - Initialize and start LeaderboardMonitor, TradeMonitor
    - On `new-trade` event: run AIDecisionEngine.evaluateTrade() → PositionCalculator → RiskManager checks → TradeExecutor.executeOrder()
    - Broadcast all events (trade executed, traders updated, risk alerts, position updates, balance updates, stop-loss triggered, agent status) via WebSocket Server
    - Persist all trade results to database
    - Implement agent start/stop lifecycle with graceful shutdown
    - On startup, restore state from database (open positions, config)
    - Implement balance check: pause operations if user balance < 5 USDC
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 3.5, 4.1, 5.2, 5.6, 7.2, 9.5_

  - [ ]* 11.3 Write unit tests for Agent Core orchestration
    - Test full trade flow: detected trade → decision → calculation → risk check → execution → broadcast
    - Test agent pauses when balance < 5 USDC
    - Test state restoration on startup
    - _Requirements: 3.5, 9.5_

- [x] 12. Implement React Frontend
  - [x] 12.1 Initialize React frontend with dark futuristic theme
    - Set up React project with TypeScript (Vite)
    - Install dependencies: wagmi, ethers.js, Socket.io-client (or native WebSocket)
    - Create global dark theme with futuristic styling (CSS variables, dark backgrounds, neon accents, smooth animations)
    - Set up component directory structure: `components/`, `hooks/`, `context/`, `types/`
    - _Requirements: 7.8_

  - [x] 12.2 Implement wallet connection with MetaMask
    - Create `WalletConnector` component using wagmi hooks
    - Implement connect/disconnect flow with MetaMask on Polygon network
    - Display truncated wallet address and USDC balance when connected
    - Handle connection rejection with retry option
    - Prompt network switch if not on Polygon
    - Check wallet connection status every 30 seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 12.3 Implement WebSocket client and real-time state management
    - Create WebSocket client hook that connects to backend WebSocket Server on app load
    - Handle all `WSEvent` types and update React state accordingly
    - Implement reconnection with exponential backoff (max 30s)
    - Show connection/disconnection indicator in UI
    - _Requirements: 7.1, 7.2, 7.7_

  - [x] 12.4 Implement main dashboard layout and sections
    - Create Dashboard component with sections: Top Traders list, Open Positions, Trade History, Wallet Balance, Performance Metrics
    - Top Traders section: show name/address, accumulated profit, replicated trades count, active/inactive status per trader
    - Open Positions section: show market, direction, entry price, current price, unrealized P&L (USDC and %), stop-loss level
    - Trade History section: show recent operations with details
    - Performance Metrics section: show daily P&L, win rate, total trades
    - _Requirements: 7.3, 7.5, 7.6_

  - [x] 12.5 Implement trade notifications and risk alert UI
    - Create notification system for new trade executions (market, direction, amount, reference top trader)
    - Create risk alert notifications (exposure limit reached, stop-loss triggered, operations paused)
    - Add visual animations for new events
    - _Requirements: 7.4, 5.2, 5.6_

  - [x] 12.6 Implement risk configuration panel
    - Create settings panel for user to configure: max exposure %, stop-loss %, max trades per hour, max position %
    - Send updated config to backend via API/WebSocket
    - Display current config values with defaults
    - _Requirements: 5.1, 5.3, 5.5_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integration and wiring
  - [x] 14.1 Wire backend API endpoints for frontend communication
    - Create Express/Fastify HTTP server for REST endpoints alongside WebSocket
    - Implement `GET /api/status` for agent status
    - Implement `GET /api/positions` for open positions
    - Implement `GET /api/history` for trade history
    - Implement `GET /api/metrics` for daily metrics
    - Implement `POST /api/config` for updating risk configuration
    - Implement `POST /api/agent/start` and `POST /api/agent/stop` for agent lifecycle control
    - _Requirements: 7.3, 9.1, 9.3, 9.4_

  - [x] 14.2 Connect frontend to backend REST and WebSocket endpoints
    - Create API client service in frontend for REST calls
    - Wire dashboard components to fetch initial data from REST endpoints on load
    - Wire real-time updates from WebSocket to update dashboard state
    - Wire risk config panel to POST updated config
    - Wire wallet connection to pass address and balance to backend
    - _Requirements: 7.1, 7.2, 7.3, 6.2, 6.3_

  - [ ]* 14.3 Write integration tests for end-to-end flows
    - Test WebSocket event transmission latency (< 2 seconds)
    - Test database persistence and restoration cycle
    - Test full trade detection → decision → execution → notification flow with mocked APIs
    - _Requirements: 7.2, 9.5_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breakpoints
- Property tests validate the 14 universal correctness properties defined in the design document
- Unit tests validate specific examples, edge cases, and error handling scenarios
- The backend uses TypeScript with Node.js, SQLite via Drizzle ORM, and @polymarket/clob-client-v2 SDK
- The frontend uses React with TypeScript, wagmi for wallet connection, and WebSocket for real-time updates
- All Polymarket API interactions use polling (not WebSocket) since Polymarket does not expose public WebSocket for third-party trade monitoring
