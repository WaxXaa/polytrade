import Fastify from 'fastify';
import cors from '@fastify/cors';
import ws from '@fastify/websocket';
import { AgentCore } from './services/agent-core.js';
import { createRestRoutes } from './handlers/rest.js';
import { createWsHandler } from './handlers/websocket.js';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

const agent = new AgentCore({
  wsPort: parseInt(process.env.WS_PORT || '3001'),
  clobApiKey: process.env.CLOB_API_KEY || '',
  clobSecret: process.env.CLOB_SECRET || '',
  clobPassphrase: process.env.CLOB_PASSPHRASE || '',
  paperMode: (process.env.PAPER_MODE || 'true') === 'true',
  paperBalance: parseInt(process.env.PAPER_BALANCE || '100'),
});

async function start() {
  try {
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    });
    await fastify.register(ws);

    await fastify.register(createRestRoutes(agent));
    createWsHandler(fastify, agent);

    await agent.start('0x0000000000000000000000000000000000000000', agent.isPaperMode() ? 100 : 0);

    await fastify.listen({ port: PORT, host: HOST });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Polymarket AI Agent — Backend                              ║
║  Server: http://${HOST}:${PORT}                                ║
║  Mode: ${agent.isPaperMode() ? 'PAPER (simulation)' : 'REAL'}                         ║
║  API: /api/leaderboard, /api/positions, /api/config/risk    ║
╚═══════════════════════════════════════════════════════════════╝
`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  agent.stop();
  await fastify.close();
  process.exit(0);
});

start();
