import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { leaderboardService } from '../services/leaderboard.js';
import { marketDataService } from '../services/market.js';
import { riskManagementService } from '../services/risk.js';
import { tradeExecutor } from '../services/executor.js';

export async function restRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Leaderboard endpoints
  fastify.get('/api/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const limit = parseInt(request.query['limit'] as string) || 10;
    const traders = await leaderboardService.getTopTraders(limit);
    return { success: true, data: traders };
  });

  fastify.get('/api/traders/:address', async (request: FastifyRequest<{ Params: { address: string } }>, reply: FastifyReply) => {
    const trader = await leaderboardService.getTraderByAddress(request.params.address);
    if (!trader) {
      return reply.code(404).send({ success: false, error: 'Trader not found' });
    }
    return { success: true, data: trader };
  });

  // Market endpoints
  fastify.get('/api/markets', async (request: FastifyRequest, reply: FastifyReply) => {
    const limit = parseInt(request.query['limit'] as string) || 50;
    const markets = await marketDataService.getMarkets(limit);
    return { success: true, data: markets };
  });

  fastify.get('/api/markets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const market = await marketDataService.getMarket(request.params.id);
    if (!market) {
      return reply.code(404).send({ success: false, error: 'Market not found' });
    }
    return { success: true, data: market };
  });

  fastify.get('/api/markets/:id/prices', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const prices = await marketDataService.getMarketPrices(request.params.id);
    return { success: true, data: prices };
  });

  // Risk management config endpoints
  fastify.get('/api/config/risk', async (request: FastifyRequest, reply: FastifyReply) => {
    return { success: true, data: riskManagementService.getConfig() };
  });

  fastify.post('/api/config/risk', async (request: FastifyRequest, reply: FastifyReply) => {
    const config = request.body as any;
    riskManagementService.updateConfig(config);
    return { success: true, data: riskManagementService.getConfig() };
  });

  // Positions endpoints
  fastify.get('/api/positions', async (request: FastifyRequest, reply: FastifyReply) => {
    const positions = riskManagementService.getPositions();
    return { success: true, data: positions };
  });

  // Trade execution endpoints (for manual trading or testing)
  fastify.post('/api/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tokenId, side, amount, type, price } = request.body as any;
    
    if (!tradeExecutor.isInitialized()) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Executor not initialized. Please connect wallet first.' 
      });
    }

    let result;
    if (type === 'market') {
      result = await tradeExecutor.executeMarketOrder(tokenId, side, amount);
    } else if (type === 'limit' && price) {
      result = await tradeExecutor.executeLimitOrder(tokenId, side, amount, price);
    } else {
      return reply.code(400).send({ 
        success: false, 
        error: 'Invalid trade parameters' 
      });
    }

    return { success: result.success, data: result };
  });

  // Wallet connection (initialize executor)
  fastify.post('/api/wallet/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { address, privateKey, signer, apiCredentials } = request.body as any;
    
    try {
      await tradeExecutor.initialize({
        userAddress: address,
        privateKey,
        signer,
        apiCredentials,
      });
      
      return { success: true, data: { connected: true, address } };
    } catch (error: any) {
      return reply.code(400).send({ 
        success: false, 
        error: error.message || 'Failed to connect wallet' 
      });
    }
  });

  fastify.post('/api/wallet/disconnect', async (request: FastifyRequest, reply: FastifyReply) => {
    tradeExecutor.disconnect();
    return { success: true, data: { connected: false } };
  });
}