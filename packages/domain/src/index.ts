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
  bindScopedDb,
  type CreateDbOptions,
  type CreatedDb,
  type Db,
  type DbSchema,
} from './db.js';
export { resolveConnectionString, resolveSecretValue } from './secrets.js';
// Single canonical-JSON home (DD-1 / Story 1.10). @twt/events re-exports these
// for backward compatibility — see packages/events/src/canonical-json.ts.
export { canonicalJsonStringify } from './canonical-json.js';
export type { CanonicalJsonValue } from './canonical-json.js';
export {
  InvalidPariwarScopeError,
  PariwarScopeMissingError,
  AuthorizationDeniedError,
  AUTHORIZATION_DENIED_CODE,
  type AuthorizationDenial,
  type ErrorResponseShape,
} from './errors.js';
// Tone-review gate (Story 2.2). Surfaced at the top level — mirroring
// `AuthorizationDeniedError` — so the apps/api error-mapping middleware imports the
// error + code from `@twt/domain` directly; the full primitive is also under the
// `toneReview` namespace below.
export {
  ToneReviewRequiredError,
  TONE_REVIEW_REQUIRED_CODE,
  type ToneReviewDenial,
  type ToneReviewDenialReason,
} from './tone-review/errors.js';
// Niyamavali registry conflict error (Story 2.3). Surfaced at the top level —
// mirroring `ToneReviewRequiredError` — so the apps/api error-mapping middleware
// (Story 2.4 admin route) imports the 409 conflict error + code from `@twt/domain`
// directly; the full registry primitive is also under the `niyamavali` namespace.
export {
  ClauseIdConflictError,
  CLAUSE_ID_CONFLICT_CODE,
  ClauseNotFoundError,
  CLAUSE_NOT_FOUND_CODE,
  // Story 2.4 — draft-store typed errors (the 2.4 route maps these to HTTP).
  DraftNotFoundError,
  DRAFT_NOT_FOUND_CODE,
  DraftStateError,
  DRAFT_INVALID_STATE_CODE,
  DraftSelfReviewError,
  DRAFT_SELF_REVIEW_CODE,
} from './niyamavali/errors.js';
export * as schema from './schema/index.js';
export * as encryption from './encryption/index.js';
export * as policies from './policies/index.js';
export * as crossTenant from './cross-tenant/index.js';
export * as audit from './audit/index.js';
export * as idempotency from './idempotency/index.js';
export * as ids from './ids/index.js';
export * as passport from './pariwar-passport/index.js';
export * as niyamavali from './niyamavali/index.js';
export * as rbac from './rbac/index.js';
export * as toneReview from './tone-review/index.js';
export { UUID_REGEX } from './db.js';
