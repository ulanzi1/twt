// drizzle-kit migrate wrapper.
//
// Resolves the connection string via Secret Manager (or local DATABASE_URL
// fallback) before invoking the drizzle-orm/node-postgres migrator. Exists
// because drizzle-kit's CLI cannot await async credential lookup; this
// wrapper closes that gap.
//
// Invoked by `pnpm --filter @twt/domain db:migrate` (and the root
// `pnpm db:migrate` shortcut). Idempotent: re-running after a successful
// apply is a no-op (drizzle-kit consults __drizzle_migrations).

import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDb } from '../src/db.js';
import { resolveConnectionString } from '../src/secrets.js';

async function main(): Promise<void> {
  const connectionString = await resolveConnectionString();

  // max: 1 — migrations run serially; a single connection prevents concurrent
  // apply. logger: false — never emit DDL via the query logger, even when
  // DRIZZLE_LOG_QUERIES=1, to avoid leaking schema details from migration runs.
  const { db, pool } = createDb(connectionString, { max: 1, logger: false });

  // Surface in-flight pool errors during migration as fatal: the default
  // createDb handler only logs, which can leave a partially-applied migration
  // looking like a success. Override here before migrate() begins.
  pool.on('error', (err) => {
    console.error('[migrate] pool error during migration:', err.code, err.message);
    process.exit(1);
  });

  console.log('[migrate] applying migrations from ./migrations …');

  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
      migrationsTable: '__drizzle_migrations',
      migrationsSchema: 'drizzle',
    });
    console.log('[migrate] done.');
  } finally {
    // Don't let a pool.end() failure (idle-client teardown race) mask a
    // successful migrate() — log and continue.
    await pool.end().catch((e: unknown) => {
      console.warn('[migrate] pool.end() warning:', e);
    });
  }
}

main().catch((err: unknown) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
