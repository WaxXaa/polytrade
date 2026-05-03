import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AgentCore } from '../services/agent-core.js';
import type { RiskConfig } from '../models/types.js';

export function createRestRoutes(agent: AgentCore) {
  return async function restRoutes(fastify: FastifyInstance): Promise<void> {

    fastify.get('/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
      return { status: 'ok', timestamp: Date.now(), mode: agent.isPaperMode() ? 'paper' : 'real' };
    });

    fastify.get('/api/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string>;
      const limit = parseInt(query['limit'] || '10');
      const traders = agent.getTopTraders().slice(0, limit);
      return { success: true, data: traders };
    });

    fastify.get('/api/positions', async (_request: FastifyRequest, _reply: FastifyReply) => {
      const positions = agent.getOpenPositions();
      return { success: true, data: positions };
    });

    fastify.get('/api/config/risk', async (_request: FastifyRequest, _reply: FastifyReply) => {
      return { success: true, data: agent.getRiskConfig() };
    });

    fastify.post('/api/config/risk', async (request: FastifyRequest, reply: FastifyReply) => {
      const config = request.body as RiskConfig;
      agent.updateRiskConfig(config);
      return { success: true, data: agent.getRiskConfig() };
    });

    fastify.post('/api/mode', async (request: FastifyRequest, reply: FastifyReply) => {
      const { mode } = request.body as { mode: 'paper' | 'real' };
      if (mode !== 'paper' && mode !== 'real') {
        return reply.code(400).send({ success: false, error: 'Mode must be paper or real' });
      }
      await agent.switchMode(mode);
      return { success: true, data: { mode } };
    });

    fastify.get('/api/status', async (_request: FastifyRequest, _reply: FastifyReply) => {
      return { success: true, data: agent.getStatus() };
    });

    fastify.post('/api/pause', async (_request: FastifyRequest, _reply: FastifyReply) => {
      agent.pause();
      return { success: true, data: agent.getStatus() };
    });

    fastify.post('/api/resume', async (_request: FastifyRequest, _reply: FastifyReply) => {
      agent.resume();
      return { success: true, data: agent.getStatus() };
    });
  };
}
