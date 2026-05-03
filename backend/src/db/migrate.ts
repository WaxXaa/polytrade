/**
 * Database migration runner.
 * Applies all pending Drizzle migrations to the SQLite database.
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env['DB_PATH'] ?? 'file:data/agent.db';

async function runMigrations(): Promise<void> {
  console.log('[migrate] Connecting to database:', DB_PATH);

  const client = createClient({ url: DB_PATH });
  const db = drizzle(client);

  // __dirname is backend/src/db/ in dev (tsx) or backend/dist/db/ in prod
  // Go up 2 levels to backend/
  const migrationsFolder = join(__dirname, '..', '..', 'drizzle', 'migrations');

  console.log('[migrate] Running migrations from:', migrationsFolder);

  await migrate(db, { migrationsFolder });

  console.log('[migrate] Migrations applied successfully.');
  client.close();
}

runMigrations()
  .then(() => {
    console.log('[migrate] Done.');
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error('[migrate] Error:', err);
    process.exit(1);
  });

