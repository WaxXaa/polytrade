/**
 * Database client and schema exports for the Polymarket Copy Trading Agent.
 * Uses @libsql/client with Drizzle ORM for SQLite access.
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// ─── Database file path ───────────────────────────────────────────────────────

const DB_PATH = process.env['DB_PATH'] ?? 'file:data/agent.db';

// ─── LibSQL client ────────────────────────────────────────────────────────────

const client = createClient({ url: DB_PATH });

// ─── Drizzle ORM instance ─────────────────────────────────────────────────────

export const db = drizzle(client, { schema });

// ─── Re-export schema ─────────────────────────────────────────────────────────

export * from './schema';

// ─── Export client for migrations ─────────────────────────────────────────────

export { client };

