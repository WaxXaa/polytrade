import { Server as SocketIOServer } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { leaderboardService } from '../services/leaderboard.js';
import { marketDataService } from '../services/market.js';
import { riskManagementService } from '../services/risk.js';
import type { Trader, TradeSignal, UserPosition, WalletState } from '../types/index.js';

export class WebSocketHandler {
  private io: SocketIOServer | null = null;
  private leaderboardInterval: NodeJS.Timeout | null = null;
  private marketUpdateInterval: NodeJS.Timeout | null = null;
  private tradeMonitorInterval: NodeJS.Timeout | null = null;

  initialize(fastify: FastifyInstance): void {
    this.io = new SocketIOServer(fastify.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle subscription requests
      socket.on('subscribe', (data: { channels: string[] }) => {
        console.log(`Client ${socket.id} subscribed to:`, data.channels);
        
        if (data.channels.includes('leaderboard')) {
          this.sendLeaderboardUpdate();
        }
      });

      // Handle trader following
      socket.on('follow_trader', (data: { address: string }) => {
        console.log(`Client ${socket.id} following trader:`, data.address);
        this.startMonitoringTrader(data.address);
      });

      // Handle trade execution request
      socket.on('execute_trade', async (data: TradeSignal) => {
        console.log(`Trade execution requested:`, data);
        // Process trade through risk management and execute
        const result = await this.processTradeSignal(data);
        socket.emit('trade_result', result);
      });

      // Handle configuration updates
      socket.on('update_config', (config: any) => {
        riskManagementService.updateConfig(config);
        socket.emit('config_updated', riskManagementService.getConfig());
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Start periodic broadcasts
    this.startPeriodicUpdates();
  }

  private startPeriodicUpdates(): void {
    // Update leaderboard every 5 minutes
    this.leaderboardInterval = setInterval(async () => {
      try {
        await leaderboardService.getTopTraders();
        this.sendLeaderboardUpdate();
      } catch (error) {
        console.error('Leaderboard refresh failed:', error);
      }
    }, 5 * 60 * 1000);

    // Update market prices every 10 seconds
    this.marketUpdateInterval = setInterval(() => {
      this.broadcastMarketUpdates();
    }, 10 * 1000);

    // Check positions for stop loss every 30 seconds
    this.marketUpdateInterval = setInterval(() => {
      this.checkStopLosses();
    }, 30 * 1000);
  }

  private sendLeaderboardUpdate(): void {
    if (!this.io) return;
    
    const traders = leaderboardService.getTrackedTraders();
    this.io.emit('leaderboard_update', traders);
  }

  private broadcastMarketUpdates(): void {
    if (!this.io) return;

    const markets = marketDataService.getActiveMarkets().slice(0, 20);
    
    for (const market of markets) {
      marketDataService.getMarketPrices(market.id).then(prices => {
        this.io?.emit('market_update', {
          marketId: market.id,
          question: market.question,
          ...prices,
        });
      });
    }
  }

  private checkStopLosses(): void {
    if (!this.io) return;

    const positions = riskManagementService.getPositions();
    
    for (const position of positions) {
      const check = riskManagementService.checkStopLoss(position);
      
      if (check.shouldClose) {
        this.io.emit('stop_loss_trigger', {
          positionId: position.id,
          reason: check.reason,
          pnl: check.pnl,
        });
      }
    }
  }

  private startMonitoringTrader(address: string): void {
    // In a real implementation, this would subscribe to the trader's
    // real-time trade feed via Polymarket's WebSocket or polling
    console.log(`Started monitoring trader: ${address}`);
  }

  private async processTradeSignal(signal: TradeSignal): Promise<any> {
    // Validate market availability
    const market = await marketDataService.getMarket(signal.market.id);
    if (!market) {
      return { success: false, error: 'Market not found' };
    }

    const marketCheck = riskManagementService.validateMarketAvailable(
      market.liquidityNum,
      market.active,
      market.closed
    );

    if (!marketCheck.available) {
      return { success: false, error: marketCheck.warnings.join(', ') };
    }

    // Check risk limits (mock - would need user capital)
    const riskCheck = riskManagementService.canTrade(signal.size);
    if (!riskCheck.allowed) {
      return { success: false, error: riskCheck.reason };
    }

    // Record the trade
    riskManagementService.recordTrade(signal.size);

    return { success: true, signal };
  }

  // Broadcast methods for use by other services
  broadcastTradeSignal(signal: TradeSignal): void {
    this.io?.emit('trade_signal', signal);
  }

  broadcastPositionUpdate(position: UserPosition): void {
    this.io?.emit('position_update', position);
  }

  broadcastWalletUpdate(wallet: WalletState): void {
    this.io?.emit('wallet_update', wallet);
  }

  shutdown(): void {
    if (this.leaderboardInterval) clearInterval(this.leaderboardInterval);
    if (this.marketUpdateInterval) clearInterval(this.marketUpdateInterval);
    if (this.tradeMonitorInterval) clearInterval(this.tradeMonitorInterval);
    this.io?.close();
  }
}

export const wsHandler = new WebSocketHandler();