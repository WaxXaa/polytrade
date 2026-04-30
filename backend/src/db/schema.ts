/**
 * Drizzle ORM schema definitions for the Polymarket Copy Trading Agent.
 * Uses @libsql/client (pure-JS SQLite) as the database driver.
 */

import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ─── Trade History ────────────────────────────────────────────────────────────

export const tradeHistory = sqliteTable('trade_history', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  market: text('market').notNull(),
  conditionId: text('condition_id').notNull(),
  direction: text('direction', { enum: ['BUY', 'SELL'] }).notNull(),
  amount: real('amount').notNull(),
  price: real('price').notNull(),
  topTraderWallet: text('top_trader_wallet').notNull(),
  topTraderName: text('top_trader_name').notNull(),
  orderId: text('order_id'),
  status: text('status', { enum: ['SUCCESS', 'FAILED', 'REJECTED'] }).notNull(),
  failReason: text('fail_reason'),
  decisionReasoning: text('decision_reasoning').notNull(),
  signalMultiplier: real('signal_multiplier').notNull(),
  confidenceWeight: real('confidence_weight').notNull(),
});

// ─── Top Trader History ───────────────────────────────────────────────────────

export const topTraderHistory = sqliteTable('top_trader_history', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  traderWallet: text('trader_wallet').notNull(),
  traderName: text('trader_name').notNull(),
  changeType: text('change_type', { enum: ['ADDED', 'REMOVED'] }).notNull(),
  previousRank: integer('previous_rank'),
  newRank: integer('new_rank'),
});

// ─── User Config ──────────────────────────────────────────────────────────────

export const userConfig = sqliteTable('user_config', {
  id: text('id').primaryKey(),
  maxExposurePercent: real('max_exposure_percent').notNull(),
  stopLossPercent: real('stop_loss_percent').notNull(),
  maxTradesPerHour: integer('max_trades_per_hour').notNull(),
  maxPositionPercent: real('max_position_percent').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─── Open Position ────────────────────────────────────────────────────────────

export const openPosition = sqliteTable('open_position', {
  id: text('id').primaryKey(),
  market: text('market').notNull(),
  conditionId: text('condition_id').notNull(),
  tokenId: text('token_id').notNull(),
  direction: text('direction', { enum: ['BUY', 'SELL'] }).notNull(),
  entryPrice: real('entry_price').notNull(),
  size: real('size').notNull(),
  topTraderWallet: text('top_trader_wallet').notNull(),
  openedAt: text('opened_at').notNull(),
  stopLossLevel: real('stop_loss_level').notNull(),
});

// ─── Daily Metrics ────────────────────────────────────────────────────────────

export const dailyMetrics = sqliteTable(
  'daily_metrics',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    totalPnl: real('total_pnl').notNull(),
    totalTrades: integer('total_trades').notNull(),
    winningTrades: integer('winning_trades').notNull(),
    losingTrades: integer('losing_trades').notNull(),
    winRate: real('win_rate').notNull(),
    avgExposure: real('avg_exposure').notNull(),
  },
  (table) => ({
    dateUniqueIdx: uniqueIndex('daily_metrics_date_unique').on(table.date),
  }),
);

// ─── Decision Log ─────────────────────────────────────────────────────────────

export const decisionLog = sqliteTable('decision_log', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  decisionType: text('decision_type').notNull(),
  reasoning: text('reasoning').notNull(),
  inputData: text('input_data').notNull(),
  outcome: text('outcome').notNull(),
  relatedTradeId: text('related_trade_id'),
});

// ─── Schema export ────────────────────────────────────────────────────────────

export const schema = {
  tradeHistory,
  topTraderHistory,
  userConfig,
  openPosition,
  dailyMetrics,
  decisionLog,
};

// ─── Inferred types ───────────────────────────────────────────────────────────

export type TradeHistoryInsert = typeof tradeHistory.$inferInsert;
export type TradeHistorySelect = typeof tradeHistory.$inferSelect;

export type TopTraderHistoryInsert = typeof topTraderHistory.$inferInsert;
export type TopTraderHistorySelect = typeof topTraderHistory.$inferSelect;

export type UserConfigInsert = typeof userConfig.$inferInsert;
export type UserConfigSelect = typeof userConfig.$inferSelect;

export type OpenPositionInsert = typeof openPosition.$inferInsert;
export type OpenPositionSelect = typeof openPosition.$inferSelect;

export type DailyMetricsInsert = typeof dailyMetrics.$inferInsert;
export type DailyMetricsSelect = typeof dailyMetrics.$inferSelect;

export type DecisionLogInsert = typeof decisionLog.$inferInsert;
export type DecisionLogSelect = typeof decisionLog.$inferSelect;

// Re-export sql helper for use in queries
export { sql };

