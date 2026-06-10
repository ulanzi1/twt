// @twt/domain — Drizzle schema + RLS policies + tenant rules + validators +
// shared domain types. Story 1.2 substrate.
//
// Architecture canonical location per §Workspace Layout line 406 + §Complete
// project directory structure line 4341-4356. See README.md for layout.

export { createDb, type CreateDbOptions, type CreatedDb, type Db, type DbSchema } from './db.js';
export { resolveConnectionString } from './secrets.js';
export * as schema from './schema/index.js';
export * as encryption from './encryption/index.js';
