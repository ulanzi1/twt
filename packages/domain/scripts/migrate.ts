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

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

import { resolveConnectionString } from '../src/secrets.js';

async function main(): Promise<void> {
  const connectionString = await resolveConnectionString();

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  console.log('[migrate] applying migrations from ./migrations …');

  try {
    await migrate(db, {
      migrationsFolder: './migrations',
      migrationsTable: '__drizzle_migrations',
      migrationsSchema: 'drizzle',
    });
    console.log('[migrate] done.');
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
