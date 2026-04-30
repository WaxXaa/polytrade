import type { UserConfig, UserPosition, TradeSignal } from '../types/index.js';

export interface RiskConfig {
  maxRiskPerTrade: number;      // % of capital per trade (default: 5%)
  maxDailyRisk: number;         // % max daily risk (default: 15%)
  stopLossPercent: number;      // % stop loss from entry (default: 20%)
  trailingStop: boolean;
  trailingPercent: number;      // % trailing stop (default: 10%)
  maxTradesPerDay: number;
  minPositionSize: number;       // min USDC per trade
  maxPositionSize: number;      // max USDC per trade
}

const DEFAULT_CONFIG: RiskConfig = {
  maxRiskPerTrade: 0.05,
  maxDailyRisk: 0.15,
  stopLossPercent: 0.20,
  trailingStop: true,
  trailingPercent: 0.10,
  maxTradesPerDay: 50,
  minPositionSize: 10,
  maxPositionSize: 10000,
};

export class RiskManagementService {
  private config: RiskConfig = { ...DEFAULT_CONFIG };
  private todayTrades: number = 0;
  private dailyVolume: number = 0;
  private lastReset: number = Date.now();
  private positions: Map<string, UserPosition> = new Map();

  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RiskConfig {
    return { ...this.config };
  }

  calculatePositionSize(
    originalSize: number,
    traderCapital: number,
    userCapital: number
  ): number {
    if (traderCapital <= 0 || userCapital <= 0) {
      return this.config.minPositionSize;
    }

    // Proportional scaling based on capital ratio
    const capitalRatio = userCapital / traderCapital;
    let scaledSize = originalSize * capitalRatio;

    // Apply max risk limit
    const maxRiskAmount = userCapital * this.config.maxRiskPerTrade;
    scaledSize = Math.min(scaledSize, maxRiskAmount);

    // Apply config limits
    scaledSize = Math.max(
      this.config.minPositionSize,
      Math.min(scaledSize, this.config.maxPositionSize)
    );

    return Math.round(scaledSize * 100) / 100;
  }

  canTrade(size: number): { allowed: boolean; reason?: string } {
    this.checkDailyReset();

    // Check max daily trades
    if (this.todayTrades >= this.config.maxTradesPerDay) {
      return { allowed: false, reason: 'max_daily_trades_reached' };
    }

    // Check max daily volume
    if (this.dailyVolume + size > this.config.maxPositionSize * this.config.maxTradesPerDay) {
      return { allowed: false, reason: 'max_daily_volume_exceeded' };
    }

    // Check min position size
    if (size < this.config.minPositionSize) {
      return { allowed: false, reason: 'position_too_small' };
    }

    // Check max position size
    if (size > this.config.maxPositionSize) {
      return { allowed: false, reason: 'position_too_large' };
    }

    return { allowed: true };
  }

  recordTrade(size: number): void {
    this.todayTrades++;
    this.dailyVolume += size;
  }

  checkStopLoss(position: UserPosition): { shouldClose: boolean; reason: string; pnl: number } {
    const currentLoss = -position.pnlPercent / 100;
    const entryPrice = position.entryPrice;
    const currentPrice = position.currentPrice;
    const peakValue = Math.max(entryPrice, currentPrice);
    const currentProfit = (currentPrice - entryPrice) / entryPrice;

    // Check fixed stop loss
    if (currentLoss >= this.config.stopLossPercent) {
      return {
        shouldClose: true,
        reason: 'stop_loss_hit',
        pnl: position.pnl
      };
    }

    // Check trailing stop if enabled
    if (this.config.trailingStop && currentProfit > this.config.trailingPercent) {
      const distanceFromPeak = (peakValue - currentPrice) / peakValue;
      if (distanceFromPeak >= this.config.trailingPercent) {
        return {
          shouldClose: true,
          reason: 'trailing_stop_hit',
          pnl: position.pnl
        };
      }
    }

    return { shouldClose: false, reason: '', pnl: 0 };
  }

  addPosition(position: UserPosition): void {
    this.positions.set(position.id, position);
  }

  updatePosition(positionId: string, updates: Partial<UserPosition>): void {
    const position = this.positions.get(positionId);
    if (position) {
      this.positions.set(positionId, { ...position, ...updates });
    }
  }

  removePosition(positionId: string): void {
    this.positions.delete(positionId);
  }

  getPositions(): UserPosition[] {
    return Array.from(this.positions.values());
  }

  private checkDailyReset(): void {
    const now = new Date();
    const resetTime = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
    
    if (now >= resetTime && this.lastReset < resetTime.getTime()) {
      this.todayTrades = 0;
      this.dailyVolume = 0;
      this.lastReset = now.getTime();
    }
  }

  validateMarketAvailable(liquidity: number, active: boolean, closed: boolean): {
    available: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!active || closed) {
      return { available: false, warnings: ['Market is inactive or closed'] };
    }

    if (liquidity < 1000) {
      return { available: false, warnings: ['Insufficient liquidity'] };
    }

    if (liquidity < 5000) {
      warnings.push('Low liquidity - may cause slippage');
    }

    return { available: true, warnings };
  }
}

export const riskManagementService = new RiskManagementService();