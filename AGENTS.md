# Polymarket Copy Trading Agent

## Project Structure
- **Monorepo** with `backend` and `frontend` workspaces (npm workspaces)
- Root `package.json` scripts: `dev:backend`, `dev:frontend`, `build`, `test`

## Tech Stack
- **Backend**: Node.js + TypeScript + Fastify
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **State**: Zustand (already installed)
- **Blockchain**: viem + wagmi for Polygon/MetaMask
- **Testing**: vitest
- **WebSocket**: Socket.IO

## Architecture
- AI agent copies top 10 Polymarket traders in real-time
- Wallet connection via MetaMask (signature type 0 = EOA)
- Trade execution on Polygon (chain ID: 137, USDC)
- WebSocket for real-time data (leaderboard, trades, prices)

## Key Commands
- `npm run dev:backend` — Start backend dev server
- `npm run dev:frontend` — Start frontend dev server
- `npm run build` — Build all workspaces
- `npm test` — Run backend tests

## Important References
- Polymarket CLOB API: https://docs.polymarket.com
- Polygon RPC: `https://polygon-rpc.com` (or use Infura/Alchemy)
- USDC on Polygon: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

## Conventions
- Start with backend first (services, API, WebSocket)
- Then frontend (React UI with futuristic design)
- Risk management: position sizing, stop loss, daily limits required

## Key Dependencies (already installed)
- @polymarket/clob-client-v2, viem, wagmi, zustand, socket.io