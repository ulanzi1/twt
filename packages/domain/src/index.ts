// @twt/domain — Drizzle schema + RLS policies + tenant rules + validators +
// shared domain types. Story 1.2 substrate.
//
// Architecture canonical location per §Workspace Layout line 406 + §Complete
// project directory structure line 4341-4356. See README.md for layout.

export {
  createDb,
  setPariwarScope,
  assertPariwarScopeSet,
  withPariwarScope,
  type CreateDbOptions,
  type CreatedDb,
  type Db,
  type DbSchema,
} from './db.js';
export { resolveConnectionString } from './secrets.js';
export { InvalidPariwarScopeError, PariwarScopeMissingError } from './errors.js';
export * as schema from './schema/index.js';
export * as encryption from './encryption/index.js';
export * as policies from './policies/index.js';
export * as crossTenant from './cross-tenant/index.js';
export * as ids from './ids/index.js';
export * as passport from './pariwar-passport/index.js';
export { UUID_REGEX } from './db.js';
