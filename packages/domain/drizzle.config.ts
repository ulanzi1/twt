// drizzle-kit configuration. Story 1.2 substrate.
//
// drizzle-kit reads this file for `generate` / `migrate` / `check` / `studio`.
// `migrate` is fronted by `scripts/migrate.ts` so Secret Manager resolution
// runs in Node (drizzle-kit's CLI cannot await async credential lookup).
//
// For `generate` / `check`, no DB connection is required — they operate on
// schema files + migration metadata only. The DATABASE_URL fallback below
// keeps `db:studio` workable locally; production paths never load this file.

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env['DATABASE_URL'];

// `db:generate` and `db:check` never open a connection — they work on schema
// files + migration metadata only. `db:studio` and `db:push` do connect, so
// missing DATABASE_URL is a hard failure for those subcommands.
const studioOrPushInvoked = process.argv.some(
  (a) => a.includes('studio') || a.includes('push'),
);

if (studioOrPushInvoked && !databaseUrl) {
  throw new Error(
    '[drizzle.config] DATABASE_URL is required for `db:studio` / `db:push`. ' +
      'Set it in packages/domain/.env (see .env.example).',
  );
}

if (!databaseUrl && !process.env['CI']) {
  // Local-dev signal only; suppressed in CI where db:check runs without DATABASE_URL by design.
  console.warn(
    '[drizzle.config] DATABASE_URL is not set. ' +
      '`db:generate` and `db:check` will work without it; `db:studio` requires it.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './migrations',
  dbCredentials: { url: databaseUrl ?? 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder' },
  verbose: true,
  strict: true,
  migrations: {
    table: '__drizzle_migrations',
    schema: 'drizzle',
  },
});
