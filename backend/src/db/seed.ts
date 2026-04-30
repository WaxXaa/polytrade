/**
 * Seed function for default database values.
 * Inserts the default UserConfig record if it doesn't already exist.
 */

import { eq } from 'drizzle-orm';
import { db, userConfig } from './index';

// ─── Default UserConfig values ────────────────────────────────────────────────

const DEFAULT_USER_CONFIG = {
  id: 'default',
  maxExposurePercent: 50,
  stopLossPercent: 15,
  maxTradesPerHour: 20,
  maxPositionPercent: 10,
  updatedAt: new Date().toISOString(),
} as const;

// ─── Seed function ────────────────────────────────────────────────────────────

/**
 * Seeds the database with default values.
 * Safe to call multiple times — uses upsert semantics for UserConfig.
 */
export async function seed(): Promise<void> {
  console.log('[seed] Seeding default UserConfig...');

  const existing = await db
    .select()
    .from(userConfig)
    .where(eq(userConfig.id, DEFAULT_USER_CONFIG.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userConfig).values(DEFAULT_USER_CONFIG);
    console.log('[seed] Default UserConfig inserted.');
  } else {
    console.log('[seed] Default UserConfig already exists, skipping.');
  }
}

// ─── Allow running directly ───────────────────────────────────────────────────

// Run seed when executed directly: node dist/db/seed.js
import { dirname } from 'path';

// In CommonJS, __dirname is available globally
declare const __dirname: string;

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('seed.js') ||
    process.argv[1].endsWith('seed.ts'));

if (isMain) {
  seed()
    .then(() => {
      console.log('[seed] Done.');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}

