/**
 * Polymarket Data API client for leaderboard and trade history endpoints.
 *
 * Base URL: https://data-api.polymarket.com
 * Rate limit: ~30 req/s
 *
 * Implements exponential backoff retry logic for API failures (max 5 min interval).
 * Handles JSON parsing errors by logging the malformed response and throwing.
 */

import { LeaderboardEntry, TradeHistoryEntry } from '../models/db-models';
import {
  validateLeaderboardResponse,
  validateTradeHistoryResponse,
  validatePositionsResponse,
} from '../utils/validation';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://data-api.polymarket.com';

/** Initial retry delay in milliseconds (1 second). */
const INITIAL_RETRY_DELAY_MS = 1_000;

/** Maximum retry delay in milliseconds (5 minutes). */
const MAX_RETRY_DELAY_MS = 300_000;

/** Maximum number of retry attempts. */
const MAX_RETRIES = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Valid time window values for the leaderboard endpoint. */
export type LeaderboardWindow = 'all' | '1d' | '1w' | '1m';

/**
 * Represents a single open position for a wallet as returned by GET /positions.
 */
export interface PositionEntry {
  market: string;
  conditionId: string;
  tokenId: string;
  outcome: string;
  size: number;
  avgPrice: number;
}

// ─── Retry Utilities ──────────────────────────────────────────────────────────

/**
 * Calculates the exponential backoff delay for a given attempt number.
 * Starts at 1s, doubles each retry, capped at 300s (5 minutes).
 *
 * @param attempt - Zero-based attempt index (0 = first retry).
 * @returns Delay in milliseconds.
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Sleeps for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

/**
 * Performs a GET request with exponential backoff retry on failure.
 *
 * Retries on:
 *   - Network errors (fetch throws)
 *   - Non-2xx HTTP responses
 *
 * Does NOT retry on JSON parse errors — those are logged and re-thrown immediately.
 *
 * @param url - Full URL to fetch.
 * @returns Parsed JSON body as `unknown`.
 * @throws {Error} After exhausting all retries, or immediately on malformed JSON.
 */
async function fetchWithRetry(url: string): Promise<unknown> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = calculateBackoffDelay(attempt - 1);
      console.warn(
        `[PolymarketDataAPI] Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms — ${lastError?.message ?? 'unknown error'}`,
      );
      await sleep(delay);
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (networkError) {
      lastError = networkError instanceof Error ? networkError : new Error(String(networkError));
      console.error(`[PolymarketDataAPI] Network error fetching ${url}: ${lastError.message}`);
      continue; // retry
    }

    if (!response.ok) {
      let body = '';
      try {
        body = await response.text();
      } catch {
        // ignore body read errors
      }
      lastError = new Error(
        `HTTP ${response.status} ${response.statusText} from ${url}: ${body}`,
      );
      console.error(`[PolymarketDataAPI] ${lastError.message}`);
      continue; // retry
    }

    // Attempt to parse JSON — do NOT retry on parse errors
    let rawText: string;
    try {
      rawText = await response.text();
    } catch (readError) {
      const err = readError instanceof Error ? readError : new Error(String(readError));
      throw new Error(`[PolymarketDataAPI] Failed to read response body from ${url}: ${err.message}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error(
        `[PolymarketDataAPI] Malformed JSON response from ${url}. Raw content:\n${rawText}`,
      );
      throw new Error(
        `[PolymarketDataAPI] JSON parse error from ${url}. Raw content logged above.`,
      );
    }

    return parsed;
  }

  throw new Error(
    `[PolymarketDataAPI] Exhausted ${MAX_RETRIES} retries for ${url}. Last error: ${lastError?.message ?? 'unknown'}`,
  );
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetches the Polymarket leaderboard from the Data API.
 *
 * Endpoint: GET /leaderboard?window={window}&limit={limit}&offset={offset}
 *
 * @param window - Time window for the leaderboard ('all' | '1d' | '1w' | '1m'). Defaults to 'all'.
 * @param limit  - Number of entries to return. Defaults to 10.
 * @param offset - Pagination offset. Defaults to 0.
 * @returns Array of validated `LeaderboardEntry` objects.
 * @throws {Error} On HTTP failure (after retries), JSON parse error, or validation failure.
 */
export async function fetchLeaderboard(
  window: LeaderboardWindow = 'all',
  limit: number = 10,
  offset: number = 0,
): Promise<LeaderboardEntry[]> {
  // Map old window values to new API timePeriod values
  const timePeriodMap: Record<LeaderboardWindow, string> = {
    all: 'ALL',
    '1d': 'DAY',
    '1w': 'WEEK',
    '1m': 'MONTH',
  };
  const params = new URLSearchParams({
    timePeriod: timePeriodMap[window] ?? 'ALL',
    orderBy: 'PNL',
    limit: String(Math.min(limit, 50)),
    offset: String(offset),
  });
  const url = `${BASE_URL}/v1/leaderboard?${params.toString()}`;

  const data = await fetchWithRetry(url);
  const validated = validateLeaderboardResponse(data);
  return 'leaderboard' in validated ? validated.leaderboard : (validated as { data: LeaderboardEntry[] }).data;
}

/**
 * Fetches the trade history for a given wallet address from the Data API.
 *
 * Endpoint: GET /activity?user={walletAddress}
 *
 * NOTE: This function throws on error. The caller (e.g. TradeMonitor) is
 * responsible for catching errors per-trader so that one trader's failure
 * does not affect monitoring of other traders.
 *
 * @param walletAddress - The proxy wallet address of the trader to query.
 * @returns Array of validated `TradeHistoryEntry` objects.
 * @throws {Error} On HTTP failure (after retries), JSON parse error, or validation failure.
 */
export async function fetchTradeHistory(walletAddress: string): Promise<TradeHistoryEntry[]> {
  const params = new URLSearchParams({ user: walletAddress, type: 'TRADE', limit: '50' });
  const url = `${BASE_URL}/activity?${params.toString()}`;

  const data = await fetchWithRetry(url);
  const validated = validateTradeHistoryResponse(data);
  return validated.history;
}

/**
 * Fetches the open positions for a given wallet address from the Data API.
 *
 * Endpoint: GET /positions?user={walletAddress}
 *
 * NOTE: This function throws on error. The caller (e.g. TradeMonitor) is
 * responsible for catching errors per-trader so that one trader's failure
 * does not affect monitoring of other traders.
 *
 * @param walletAddress - The proxy wallet address of the trader to query.
 * @returns Array of validated `PositionEntry` objects representing open positions.
 * @throws {Error} On HTTP failure (after retries), JSON parse error, or validation failure.
 */
export async function fetchPositions(walletAddress: string): Promise<PositionEntry[]> {
  const params = new URLSearchParams({ address: walletAddress });
  const url = `${BASE_URL}/positions?${params.toString()}`;

  const data = await fetchWithRetry(url);
  return validatePositionsResponse(data);
}

// ─── Client Object ────────────────────────────────────────────────────────────

/**
 * Polymarket Data API client object.
 * Provides typed methods for interacting with data-api.polymarket.com.
 */
export const PolymarketDataApiClient = {
  /**
   * Fetches the leaderboard with optional window, limit, and offset parameters.
   * @see fetchLeaderboard
   */
  fetchLeaderboard,

  /**
   * Fetches trade history for a wallet address.
   * Throws on error — callers must handle per-trader errors in isolation.
   * @see fetchTradeHistory
   */
  fetchTradeHistory,

  /**
   * Fetches open positions for a wallet address.
   * Throws on error — callers must handle per-trader errors in isolation.
   * @see fetchPositions
   */
  fetchPositions,
} as const;

export type PolymarketDataApiClientType = typeof PolymarketDataApiClient;

