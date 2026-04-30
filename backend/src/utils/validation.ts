/**
 * Input validation utilities for Polymarket API responses using Zod.
 *
 * Exports Zod schemas and typed validation functions for:
 *   - Leaderboard API responses
 *   - Trade History API responses
 */

import { z } from 'zod';

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * Zod schema for a single leaderboard entry.
 * Real API fields: rank, proxyWallet, userName, xUsername, verifiedBadge, vol, pnl, profileImage
 */
export const LeaderboardEntrySchema = z.object({
  rank: z.coerce.number().optional().default(0),
  proxyWallet: z.string().optional().default(''),
  address: z.string().optional(),
  userName: z.string().optional().default(''),
  name: z.string().optional().default(''),
  pnl: z.coerce.number().optional().default(0),
  vol: z.coerce.number().optional().default(0),
  volume: z.coerce.number().optional().default(0),
  markets: z.coerce.number().optional().default(0),
}).passthrough().transform((entry) => ({
  name: entry.userName || entry.name || '',
  proxyWallet: entry.proxyWallet || entry.address || '',
  pnl: entry.pnl ?? 0,
  volume: entry.vol ?? entry.volume ?? 0,
  markets: entry.markets ?? 0,
  rank: entry.rank ?? 0,
}));

/**
 * Zod schema for the full leaderboard API response.
 * The real API returns a direct array (not wrapped in { leaderboard: [...] }).
 */
export const LeaderboardResponseSchema = z.union([
  // Direct array (real API)
  z.array(LeaderboardEntrySchema).transform((arr) => ({ leaderboard: arr })),
  // Wrapped object (legacy/docs format)
  z.object({ leaderboard: z.array(LeaderboardEntrySchema) }),
  z.object({ data: z.array(LeaderboardEntrySchema) }).transform((obj) => ({ leaderboard: obj.data })),
]);

export type LeaderboardEntryType = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardResponseType = z.infer<typeof LeaderboardResponseSchema>;

/**
 * Validates an unknown value against the LeaderboardResponseSchema.
 *
 * @returns The typed LeaderboardResponse if valid.
 * @throws {Error} with a descriptive message if validation fails.
 */
export function validateLeaderboardResponse(data: unknown): LeaderboardResponseType {
  // Log raw response for debugging
  console.debug('[validateLeaderboard] Raw response type:', typeof data, Array.isArray(data) ? 'array' : '');
  const result = LeaderboardResponseSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error('[validateLeaderboard] Raw data:', JSON.stringify(data)?.slice(0, 500));
    throw new Error(`Invalid leaderboard response:\n${issues}`);
  }
  return result.data;
}

// ─── Trade History ────────────────────────────────────────────────────────────

/**
 * Zod schema for a single trade history entry.
 * Matches the TradeHistoryEntry interface from db-models.ts.
 * Note: `timestamp` is a string (ISO 8601) as returned by the API.
 */
/**
 * Zod schema for a single trade history entry.
 * Maps the real /activity API response fields to our internal TradeHistoryEntry format.
 * Real API fields: side (BUY/SELL), title, outcome, usdcSize, price, timestamp (unix int), conditionId, asset
 */
export const TradeHistoryEntrySchema = z.object({
  // Real API fields
  side: z.enum(['BUY', 'SELL']).optional(),
  action: z.enum(['BUY', 'SELL']).optional(),
  title: z.string().optional().default(''),
  market: z.string().optional().default(''),
  outcome: z.string().optional().default(''),
  usdcSize: z.coerce.number().optional().default(0),
  amount: z.coerce.number().optional().default(0),
  price: z.coerce.number().optional().default(0),
  timestamp: z.union([z.string(), z.number()]),
  conditionId: z.string().optional().default(''),
  asset: z.string().optional().default(''),
  tokenId: z.string().optional().default(''),
  transactionHash: z.string().optional(),
}).passthrough().transform((entry) => ({
  action: (entry.side ?? entry.action ?? 'BUY') as 'BUY' | 'SELL',
  market: entry.title || entry.market || '',
  outcome: entry.outcome || '',
  amount: entry.usdcSize || entry.amount || 0,
  price: entry.price || 0,
  timestamp: typeof entry.timestamp === 'number'
    ? new Date(entry.timestamp * 1000).toISOString()
    : entry.timestamp,
  conditionId: entry.conditionId || '',
  tokenId: entry.asset || entry.tokenId || '',
}));

/**
 * Zod schema for the full trade history API response.
 * The real API returns a direct array.
 */
export const TradeHistoryResponseSchema = z.union([
  z.array(TradeHistoryEntrySchema).transform((arr) => ({ history: arr })),
  z.object({ history: z.array(TradeHistoryEntrySchema) }),
]);

export type TradeHistoryEntryType = z.infer<typeof TradeHistoryEntrySchema>;
export type TradeHistoryResponseType = z.infer<typeof TradeHistoryResponseSchema>;

/**
 * Validates an unknown value against the TradeHistoryResponseSchema.
 *
 * @returns The typed TradeHistoryResponse if valid.
 * @throws {Error} with a descriptive message if validation fails.
 */
export function validateTradeHistoryResponse(data: unknown): TradeHistoryResponseType {
  const result = TradeHistoryResponseSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid trade history response:\n${issues}`);
  }
  return result.data;
}

// ─── Positions ────────────────────────────────────────────────────────────────

/**
 * Zod schema for a single position entry returned by GET /positions.
 * Matches the PositionEntry interface in polymarket-data-api.ts.
 */
export const PositionEntrySchema = z.object({
  market: z.string(),
  conditionId: z.string(),
  tokenId: z.string(),
  outcome: z.string(),
  size: z.number(),
  avgPrice: z.number(),
});

/**
 * Zod schema for the full positions API response.
 * The endpoint returns a raw array of position entries.
 */
export const PositionsResponseSchema = z.array(PositionEntrySchema);

export type PositionEntryType = z.infer<typeof PositionEntrySchema>;
export type PositionsResponseType = z.infer<typeof PositionsResponseSchema>;

/**
 * Validates an unknown value against the PositionsResponseSchema.
 *
 * @returns The typed array of PositionEntry objects if valid.
 * @throws {Error} with a descriptive message if validation fails.
 */
export function validatePositionsResponse(data: unknown): PositionsResponseType {
  const result = PositionsResponseSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid positions response:\n${issues}`);
  }
  return result.data;
}

