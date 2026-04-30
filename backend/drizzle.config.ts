import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env['DB_PATH'] ?? 'file:data/agent.db',
  },
  verbose: true,
  strict: true,
});
