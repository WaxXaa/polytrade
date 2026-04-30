/**
 * Database migration runner.
 * Applies all pending Drizzle migrations to the SQLite database.
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { dirname, join } from 'path';

// In CommonJS, __dirname is available globally
declare const __dirname: string;

const DB_PATH = process.env['DB_PATH'] ?? 'file:data/agent.db';

async function runMigrations(): Promise<void> {
  console.log('[migrate] Connecting to database:', DB_PATH);

  const client = createClient({ url: DB_PATH });
  const db = drizzle(client);

  // __dirname is backend/dist/db/ at runtime, so go up 3 levels to backend/
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

