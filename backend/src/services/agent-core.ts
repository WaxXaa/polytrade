import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { LeaderboardMonitorImpl, type LeaderboardMonitor } from './leaderboard-monitor';
import { TradeMonitorImpl, type TradeMonitor } from './trade-monitor';
import { AIDecisionEngineImpl, type AIDecisionEngine } from './ai-decision-engine';
import { PositionCalculatorImpl } from './position-calculator';
import { RiskManagerImpl, type RiskManager } from './risk-manager';
import { DecisionLoggerImpl } from './decision-logger';
import { TradeExecutorImpl, type TradeExecutor } from './trade-executor';
import { PaperTradeExecutorImpl } from './paper-trade-executor';
import { WebSocketServerImpl, type WebSocketServer } from '../ws/websocket-server';

import { db, tradeHistory, openPosition } from '../db/index';

import type {
  DetectedTrade,
  TraderChange,
  Position,
  RiskConfig,
  WSEvent,
  AgentStatus,
  RiskAlert,
} from '../models/types';

const STOP_LOSS_INTERVAL_MS = 30_000;
const MAX_SIGNAL_CACHE = 50;
const MAX_SEEN_TRADE_IDS = 10_000;

export interface AgentCoreConfig {
  wsPort: number;
  clobApiKey: string;
  clobSecret: string;
  clobPassphrase: string;
  privateKey?: string;
  wsServer?: WebSocketServer;
  traderEstimatedCapital?: number;
  paperMode?: boolean;
  paperBalance?: number;
}

export class AgentCore {
  private readonly leaderboardMonitor: LeaderboardMonitor;
  private readonly tradeMonitor: TradeMonitor;
  private readonly aiEngine: AIDecisionEngine;
  private readonly positionCalculator: PositionCalculatorImpl;
  private readonly riskManager: RiskManagerImpl;
  private tradeExecutor: TradeExecutor;
  private readonly wsServer: WebSocketServer;

  private openPositions: Position[] = [];
  private userBalance = 0;
  private walletAddress = '';
  private running = false;
  private paused = false;
  private lastLeaderboardUpdate: Date | null = null;
  private lastTradeCheck: Date | null = null;
  private stopLossInterval: ReturnType<typeof setInterval> | null = null;

  private readonly traderEstimatedCapital: number;
  private paperMode: boolean;
  private recentSignals: DetectedTrade[] = [];

  constructor(private readonly config: AgentCoreConfig) {
    this.traderEstimatedCapital = config.traderEstimatedCapital ?? 10_000;
    this.paperMode = config.paperMode ?? false;

    const decisionLogger = new DecisionLoggerImpl();

    this.leaderboardMonitor = new LeaderboardMonitorImpl();
    this.tradeMonitor = new TradeMonitorImpl(this.leaderboardMonitor);
    this.aiEngine = new AIDecisionEngineImpl(decisionLogger);
    this.positionCalculator = new PositionCalculatorImpl();
    this.riskManager = new RiskManagerImpl();

    if (this.paperMode) {
      const paperBalance = config.paperBalance ?? 100;
      this.tradeExecutor = new PaperTradeExecutorImpl(paperBalance);
      console.info(`[AgentCore] PAPER TRADING MODE — $${paperBalance} virtual balance`);
    } else {
      this.tradeExecutor = new TradeExecutorImpl(
        config.clobApiKey,
        config.clobSecret,
        config.clobPassphrase,
        config.privateKey,
      );
    }

    this.wsServer = config.wsServer ?? new WebSocketServerImpl();
  }

  // ─── Public getters ──────────────────────────────────────────────────────────

  getTopTraders() {
    return this.leaderboardMonitor.getTopTraders();
  }

  getOpenPositions() {
    return this.openPositions;
  }

  onBroadcast(listener: (event: WSEvent) => void): () => void {
    return this.wsServer.onBroadcast(listener);
  }

  getRiskConfig(): RiskConfig {
    return this.riskManager.getConfig();
  }

  isPaperMode() {
    return this.paperMode;
  }

  pause(): void {
    this.paused = true;
    console.info('[AgentCore] Paused — trade execution suspended.');
    this.broadcastStatus();
  }

  resume(): void {
    this.paused = false;
    console.info('[AgentCore] Resumed — trade execution active.');
    this.broadcastStatus();
  }

  isPaused(): boolean {
    return this.paused;
  }

  getStatus(): AgentStatus {
    const traders = this.leaderboardMonitor.getTopTraders();
    return {
      running: this.running,
      paused: this.paused,
      topTradersCount: traders.length,
      openPositionsCount: this.openPositions.length,
      tradesLastHour: this.riskManager.getExecutionsLastHour(),
      lastLeaderboardUpdate: this.lastLeaderboardUpdate,
      lastTradeCheck: this.lastTradeCheck,
      mode: this.paperMode ? 'paper' : 'real',
      balance: this.paperMode
        ? (this.tradeExecutor as PaperTradeExecutorImpl).getVirtualBalance()
        : this.userBalance,
    };
  }

  async switchMode(mode: 'paper' | 'real'): Promise<void> {
    if (mode === 'paper' && !this.paperMode) {
      this.tradeExecutor.stop?.();
      const paperBalance = this.config.paperBalance ?? 100;
      this.tradeExecutor = new PaperTradeExecutorImpl(paperBalance);
      this.userBalance = paperBalance;
      this.paperMode = true;
    } else if (mode === 'real' && this.paperMode) {
      this.tradeExecutor.stop?.();
      this.tradeExecutor = new TradeExecutorImpl(
        this.config.clobApiKey,
        this.config.clobSecret,
        this.config.clobPassphrase,
        this.config.privateKey,
      );
      if (this.running && this.walletAddress) {
        await this.tradeExecutor.initialize?.(this.walletAddress);
      }
      this.userBalance = 0;
      this.paperMode = false;
    }
    this.broadcastStatus();
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async start(walletAddress: string, initialBalance: number): Promise<void> {
    if (this.running) {
      console.warn('[AgentCore] Already running.');
      return;
    }

    this.walletAddress = walletAddress;
    this.userBalance = initialBalance;
    this.running = true;

    console.info(`[AgentCore] Starting in ${this.paperMode ? 'paper' : 'real'} mode...`);

    if (!this.config.wsServer) {
      this.wsServer.start(this.config.wsPort);
    }

    await this.restoreState();
    await this.riskManager.loadConfig();
    this.riskManager.setOpenPositions(this.openPositions);

    this.leaderboardMonitor.on('traders-updated', (changes: TraderChange[]) => {
      this.lastLeaderboardUpdate = new Date();
      this.broadcast({ type: 'traders-updated', data: changes });
    });

    this.tradeMonitor.on('new-trade', (trade: DetectedTrade) => {
      this.lastTradeCheck = new Date();
      void this.handleNewTrade(trade);
    });

    void this.leaderboardMonitor.start();
    void this.tradeMonitor.start();

    this.stopLossInterval = setInterval(() => {
      void this.evaluateStopLossPeriodic();
    }, STOP_LOSS_INTERVAL_MS);

    if (!this.paperMode && walletAddress) {
      await this.tradeExecutor.initialize?.(walletAddress);
    }

    this.broadcastStatus();
    console.info('[AgentCore] Started.');
  }

  stop(): void {
    if (!this.running) return;

    this.leaderboardMonitor.stop();
    this.tradeMonitor.stop();
    this.wsServer.stop();
    if (this.stopLossInterval) {
      clearInterval(this.stopLossInterval);
      this.stopLossInterval = null;
    }
    this.tradeExecutor.stop?.();
    this.running = false;

    console.info('[AgentCore] Stopped.');
  }

  // ─── Balance / config updates ────────────────────────────────────────────────

  updateBalance(newBalance: number): void {
    const previous = this.userBalance;
    this.userBalance = newBalance;

    this.broadcast({
      type: 'balance-update',
      data: { previousBalance: previous, currentBalance: newBalance, timestamp: new Date() },
    });

    if (newBalance < 5) {
      this.broadcastRiskAlert('low-balance', 'User balance below 5 USDC — trades paused.', 'critical');
    }
  }

  updateRiskConfig(config: RiskConfig): void {
    this.riskManager.setConfig(config);
  }

  // ─── Core trade flow ─────────────────────────────────────────────────────────

  private async handleNewTrade(trade: DetectedTrade): Promise<void> {
    if (this.paused) {
      console.info('[AgentCore] Paused — skipping trade.');
      return;
    }

    if (this.userBalance < 5) {
      console.info('[AgentCore] Balance < 5 USDC — skipping trade.');
      return;
    }

    if (!this.riskManager.canExecuteTrade()) {
      this.broadcastRiskAlert('trade-limit', 'Hourly trade limit reached — trade skipped.', 'warning');
      return;
    }

    const marketSpread = await this.tradeExecutor.getMarketSpread(trade.tokenId);

    const traders = this.leaderboardMonitor.getTopTraders();
    const traderProfile = traders.find((t) => t.proxyWallet === trade.traderWallet);
    if (!traderProfile) return;

    const context = {
      detectedTrade: trade,
      recentSignals: this.recentSignals,
      traderProfile,
      marketSpread,
      userBalance: this.userBalance,
      openPositions: this.openPositions,
      riskLimits: this.riskManager.getConfig(),
    };

    const decision = await this.aiEngine.evaluateTrade(context);

    if (decision.action !== 'execute') {
      this.recentSignals.push(trade);
      if (this.recentSignals.length > MAX_SIGNAL_CACHE) {
        this.recentSignals = this.recentSignals.slice(-MAX_SIGNAL_CACHE);
      }
      return;
    }

    const posResult = this.positionCalculator.calculateProportionalPosition({
      tradeAmount: decision.adjustedAmount ?? trade.amount,
      traderEstimatedCapital: this.traderEstimatedCapital,
      userBalance: this.userBalance,
      confidenceWeight: traderProfile.confidenceWeight,
      signalMultiplier: decision.signalMultiplier,
    });

    if (posResult.wasDiscarded) {
      console.info(`[AgentCore] Trade discarded: ${posResult.discardReason}`);
      return;
    }

    const riskCheck = this.riskManager.canOpenPosition(posResult.amount, this.userBalance);
    if (!riskCheck.allowed) {
      this.broadcastRiskAlert('exposure-limit', riskCheck.reason ?? 'Exposure limit reached', 'warning');
      return;
    }

    const orderResult = await this.tradeExecutor.executeOrder({
      tokenId: trade.tokenId,
      side: trade.action,
      price: trade.price,
      size: posResult.amount,
      conditionId: trade.conditionId,
    });

    if (orderResult.success) {
      this.riskManager.recordExecution();

      if (this.paperMode) {
        const paperExec = this.tradeExecutor as PaperTradeExecutorImpl;
        if (typeof paperExec.getVirtualBalance === 'function') {
          this.updateBalance(paperExec.getVirtualBalance());
        }
      }
    }

    const tradeId = randomUUID();
    try {
      await db.insert(tradeHistory).values({
        id: tradeId,
        timestamp: new Date().toISOString(),
        market: trade.market,
        conditionId: trade.conditionId,
        direction: trade.action,
        amount: posResult.amount,
        price: orderResult.executedPrice ?? trade.price,
        topTraderWallet: trade.traderWallet,
        topTraderName: trade.traderName,
        orderId: orderResult.orderId ?? null,
        status: orderResult.success ? 'SUCCESS' : 'FAILED',
        failReason: orderResult.error ?? null,
        decisionReasoning: decision.reasoning,
        signalMultiplier: decision.signalMultiplier,
        confidenceWeight: traderProfile.confidenceWeight,
      });
    } catch (err) {
      console.error('[AgentCore] Failed to persist trade to DB:', err);
    }

    if (orderResult.success && trade.action === 'BUY') {
      const pos: Position = {
        id: tradeId,
        market: trade.market,
        conditionId: trade.conditionId,
        tokenId: trade.tokenId,
        direction: trade.action,
        entryPrice: orderResult.executedPrice ?? trade.price,
        size: posResult.amount,
        topTraderWallet: trade.traderWallet,
        openedAt: new Date(),
        stopLossLevel: (orderResult.executedPrice ?? trade.price) * (1 - this.riskManager.getConfig().stopLossPercent / 100),
      };

      this.openPositions.push(pos);
      this.riskManager.setOpenPositions(this.openPositions);

      try {
        await db.insert(openPosition).values({
          id: pos.id,
          market: pos.market,
          conditionId: pos.conditionId,
          tokenId: pos.tokenId,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          size: pos.size,
          topTraderWallet: pos.topTraderWallet,
          openedAt: pos.openedAt.toISOString(),
          stopLossLevel: pos.stopLossLevel,
        });
      } catch (err) {
        console.error('[AgentCore] Failed to persist open position to DB:', err);
      }

      this.broadcast({
        type: 'position-update',
        data: { position: pos, changeType: 'opened' },
      });
    }

    this.broadcast({
      type: 'trade-executed',
      data: { trade, decision, orderResult },
    });

    this.recentSignals.push(trade);
    if (this.recentSignals.length > MAX_SIGNAL_CACHE) {
      this.recentSignals = this.recentSignals.slice(-MAX_SIGNAL_CACHE);
    }

    this.broadcastStatus();
  }

  // ─── Stop-loss ───────────────────────────────────────────────────────────────

  private async evaluateStopLossPeriodic(): Promise<void> {
    if (this.openPositions.length === 0) return;

    const currentPrices = new Map<string, number>();
    for (const pos of this.openPositions) {
      try {
        const spread = await this.tradeExecutor.getMarketSpread(pos.tokenId);
        currentPrices.set(pos.tokenId, pos.entryPrice * (1 - spread / 100));
      } catch {
        // skip positions with no price data
      }
    }

    const actions = this.riskManager.evaluateStopLoss(this.openPositions, currentPrices);

    for (const action of actions) {
      const pos = this.openPositions.find((p) => p.id === action.positionId);
      if (!pos) continue;

      const orderResult = await this.tradeExecutor.executeOrder({
        tokenId: pos.tokenId,
        side: 'SELL',
        price: currentPrices.get(pos.tokenId) ?? pos.entryPrice,
        size: pos.size,
        conditionId: pos.conditionId,
      });

      this.openPositions = this.openPositions.filter((p) => p.id !== action.positionId);
      this.riskManager.setOpenPositions(this.openPositions);

      try {
        await db.delete(openPosition).where(eq(openPosition.id, action.positionId));
      } catch (err) {
        console.error('[AgentCore] Failed to remove closed position from DB:', err);
      }

      this.broadcast({
        type: 'stop-loss-triggered',
        data: { action, orderResult },
      });

      this.broadcast({
        type: 'position-update',
        data: { position: pos, changeType: 'closed' },
      });
    }
  }

  // ─── State restoration ───────────────────────────────────────────────────────

  private async restoreState(): Promise<void> {
    try {
      const rows = await db.select().from(openPosition);
      this.openPositions = rows.map((row) => ({
        id: row.id,
        market: row.market,
        conditionId: row.conditionId,
        tokenId: row.tokenId,
        direction: row.direction as 'BUY' | 'SELL',
        entryPrice: row.entryPrice,
        size: row.size,
        topTraderWallet: row.topTraderWallet,
        openedAt: new Date(row.openedAt),
        stopLossLevel: row.stopLossLevel,
      }));
      console.info(`[AgentCore] Restored ${this.openPositions.length} open positions from DB.`);
    } catch (err) {
      console.error('[AgentCore] Failed to restore state from DB:', err);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private broadcast(event: WSEvent): void {
    this.wsServer.broadcast(event);
  }

  private broadcastStatus(): void {
    this.broadcast({ type: 'agent-status', data: this.getStatus() });
  }

  private broadcastRiskAlert(
    type: RiskAlert['type'],
    message: string,
    severity: RiskAlert['severity'],
  ): void {
    this.broadcast({
      type: 'risk-alert',
      data: { type, message, severity, timestamp: new Date() },
    });
  }
}
