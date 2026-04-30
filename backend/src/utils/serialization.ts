/**
 * Serialization/deserialization utilities for TradeRecord and UserConfig.
 *
 * Date fields are stored as ISO 8601 strings in JSON and converted back to
 * Date objects on deserialization. Nullable fields (orderId, failReason,
 * relatedTradeId) are preserved as-is (null stays null).
 */

import type { TradeRecord, UserConfig } from '../models/db-models';

// ─── TradeRecord ──────────────────────────────────────────────────────────────

/**
 * Serialized form of TradeRecord — Date fields become ISO 8601 strings.
 */
interface SerializedTradeRecord {
  id: string;
  timestamp: string;
  market: string;
  conditionId: string;
  direction: 'BUY' | 'SELL';
  amount: number;
  price: number;
  topTraderWallet: string;
  topTraderName: string;
  orderId: string | null;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  failReason: string | null;
  decisionReasoning: string;
  signalMultiplier: number;
  confidenceWeight: number;
}

/**
 * Serializes a TradeRecord to a JSON string.
 * The `timestamp` Date is converted to an ISO 8601 string.
 */
export function serializeTradeRecord(record: TradeRecord): string {
  const serialized: SerializedTradeRecord = {
    id: record.id,
    timestamp: record.timestamp.toISOString(),
    market: record.market,
    conditionId: record.conditionId,
    direction: record.direction,
    amount: record.amount,
    price: record.price,
    topTraderWallet: record.topTraderWallet,
    topTraderName: record.topTraderName,
    orderId: record.orderId,
    status: record.status,
    failReason: record.failReason,
    decisionReasoning: record.decisionReasoning,
    signalMultiplier: record.signalMultiplier,
    confidenceWeight: record.confidenceWeight,
  };
  return JSON.stringify(serialized);
}

/**
 * Deserializes a JSON string back into a TradeRecord.
 * The `timestamp` ISO 8601 string is converted back to a Date object.
 *
 * @throws {Error} if the JSON is malformed or required fields are missing/invalid.
 */
export function deserializeTradeRecord(json: string): TradeRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`deserializeTradeRecord: invalid JSON — ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('deserializeTradeRecord: expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  assertString(obj, 'id');
  assertString(obj, 'timestamp');
  assertString(obj, 'market');
  assertString(obj, 'conditionId');
  assertOneOf(obj, 'direction', ['BUY', 'SELL']);
  assertNumber(obj, 'amount');
  assertNumber(obj, 'price');
  assertString(obj, 'topTraderWallet');
  assertString(obj, 'topTraderName');
  assertNullableString(obj, 'orderId');
  assertOneOf(obj, 'status', ['SUCCESS', 'FAILED', 'REJECTED']);
  assertNullableString(obj, 'failReason');
  assertString(obj, 'decisionReasoning');
  assertNumber(obj, 'signalMultiplier');
  assertNumber(obj, 'confidenceWeight');

  const timestamp = new Date(obj['timestamp'] as string);
  if (isNaN(timestamp.getTime())) {
    throw new Error(`deserializeTradeRecord: invalid timestamp "${obj['timestamp']}"`);
  }

  return {
    id: obj['id'] as string,
    timestamp,
    market: obj['market'] as string,
    conditionId: obj['conditionId'] as string,
    direction: obj['direction'] as 'BUY' | 'SELL',
    amount: obj['amount'] as number,
    price: obj['price'] as number,
    topTraderWallet: obj['topTraderWallet'] as string,
    topTraderName: obj['topTraderName'] as string,
    orderId: obj['orderId'] as string | null,
    status: obj['status'] as 'SUCCESS' | 'FAILED' | 'REJECTED',
    failReason: obj['failReason'] as string | null,
    decisionReasoning: obj['decisionReasoning'] as string,
    signalMultiplier: obj['signalMultiplier'] as number,
    confidenceWeight: obj['confidenceWeight'] as number,
  };
}

// ─── UserConfig ───────────────────────────────────────────────────────────────

/**
 * Serialized form of UserConfig — Date fields become ISO 8601 strings.
 */
interface SerializedUserConfig {
  id: string;
  maxExposurePercent: number;
  stopLossPercent: number;
  maxTradesPerHour: number;
  maxPositionPercent: number;
  updatedAt: string;
}

/**
 * Serializes a UserConfig to a JSON string.
 * The `updatedAt` Date is converted to an ISO 8601 string.
 */
export function serializeUserConfig(config: UserConfig): string {
  const serialized: SerializedUserConfig = {
    id: config.id,
    maxExposurePercent: config.maxExposurePercent,
    stopLossPercent: config.stopLossPercent,
    maxTradesPerHour: config.maxTradesPerHour,
    maxPositionPercent: config.maxPositionPercent,
    updatedAt: config.updatedAt.toISOString(),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserializes a JSON string back into a UserConfig.
 * The `updatedAt` ISO 8601 string is converted back to a Date object.
 *
 * @throws {Error} if the JSON is malformed or required fields are missing/invalid.
 */
export function deserializeUserConfig(json: string): UserConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`deserializeUserConfig: invalid JSON — ${(err as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('deserializeUserConfig: expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  assertString(obj, 'id');
  assertNumber(obj, 'maxExposurePercent');
  assertNumber(obj, 'stopLossPercent');
  assertNumber(obj, 'maxTradesPerHour');
  assertNumber(obj, 'maxPositionPercent');
  assertString(obj, 'updatedAt');

  const updatedAt = new Date(obj['updatedAt'] as string);
  if (isNaN(updatedAt.getTime())) {
    throw new Error(`deserializeUserConfig: invalid updatedAt "${obj['updatedAt']}"`);
  }

  return {
    id: obj['id'] as string,
    maxExposurePercent: obj['maxExposurePercent'] as number,
    stopLossPercent: obj['stopLossPercent'] as number,
    maxTradesPerHour: obj['maxTradesPerHour'] as number,
    maxPositionPercent: obj['maxPositionPercent'] as number,
    updatedAt,
  };
}

// ─── Internal assertion helpers ───────────────────────────────────────────────

function assertString(obj: Record<string, unknown>, key: string): void {
  if (typeof obj[key] !== 'string') {
    throw new Error(`deserialize: field "${key}" must be a string, got ${JSON.stringify(obj[key])}`);
  }
}

function assertNumber(obj: Record<string, unknown>, key: string): void {
  if (typeof obj[key] !== 'number') {
    throw new Error(`deserialize: field "${key}" must be a number, got ${JSON.stringify(obj[key])}`);
  }
}

function assertNullableString(obj: Record<string, unknown>, key: string): void {
  if (obj[key] !== null && typeof obj[key] !== 'string') {
    throw new Error(
      `deserialize: field "${key}" must be a string or null, got ${JSON.stringify(obj[key])}`,
    );
  }
}

function assertOneOf(obj: Record<string, unknown>, key: string, values: string[]): void {
  if (!values.includes(obj[key] as string)) {
    throw new Error(
      `deserialize: field "${key}" must be one of [${values.join(', ')}], got ${JSON.stringify(obj[key])}`,
    );
  }
}

