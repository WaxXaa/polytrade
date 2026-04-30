import Fastify from 'fastify';
import cors from '@fastify/cors';
import ws from '@fastify/websocket';
import { restRoutes } from './handlers/rest.js';
import { wsHandler } from './handlers/websocket.js';
import { leaderboardService } from './services/leaderboard.js';
import { marketDataService } from './services/market.js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    });

    await fastify.register(ws);

    // Initialize services
    console.log('Initializing services...');
    
    // Pre-load leaderboard and markets
    try {
      await leaderboardService.getTopTraders();
      await marketDataService.getMarkets();
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.warn('Initial data load failed, will retry:', error);
    }

    // Register routes
    await fastify.register(restRoutes);

    // Initialize WebSocket
    wsHandler.initialize(fastify);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🤖 Polymarket AI Agent - Backend Server                      ║
║                                                               ║
║  Server running on http://${HOST}:${PORT}                       ║
║  WebSocket available at ws://${HOST}:${PORT}                    ║
║                                                               ║
║  API Endpoints:                                               ║
║  - GET  /health              - Health check                    ║
║  - GET  /api/leaderboard   - Top traders                     ║
║  - GET  /api/markets       - Active markets                  ║
║  - GET  /api/positions     - User positions                 ║
║  - POST /api/wallet/connect - Connect wallet                 ║
║  - POST /api/execute       - Execute trade                   ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  wsHandler.shutdown();
  await fastify.close();
  process.exit(0);
});

start();