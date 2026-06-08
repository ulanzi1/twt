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

const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './migrations',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
  migrations: {
    table: '__drizzle_migrations',
    schema: 'drizzle',
  },
});
