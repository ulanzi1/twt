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
// State-machine framework (relocated from @twt/events at Story 3.1 to break the
// domain↔events cycle — see state-machine.ts header). @twt/events re-exports these
// for backward compatibility; the member lifecycle reducer consumes them locally.
export { StateMachine, defineStateMachine } from './state-machine.js';
export type { StateMachineConfig } from './state-machine.js';
// Forced-pagination clamp (Story 1.14) — the family-(a) domain-accessor invariant
// (enforced by the domain-accessor-invariants CI gate; see docs/domain-accessor-invariants.md).
export { clampLimit, type ClampLimitOptions } from './pagination.js';
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
// T&C registry typed errors (Story 2.6). Surfaced at the top level — mirroring
// the niyamavali errors — so the apps/api error-mapping middleware imports the
// class + code from `@twt/domain` directly; the full primitive is also under the
// `termsAndConditions` namespace below.
export {
  TcVersionNotFoundError,
  TC_VERSION_NOT_FOUND_CODE,
  TcVersionConflictError,
  TC_VERSION_CONFLICT_CODE,
  TcStateError,
  TC_INVALID_STATE_CODE,
  TcPinnedClauseNotFoundError,
  TC_PINNED_CLAUSE_NOT_FOUND_CODE,
} from './terms-and-conditions/errors.js';
// Consent registry typed errors (Story 2.7). Surfaced at the top level — mirroring
// the T&C errors — so the CONSUMER route (Epic 3/6) error-mapping middleware imports
// the class + code constant from `@twt/domain` directly (it matches on the code, not
// the class); the full primitive is also under the `consent` namespace below.
export {
  ConsentNotFoundError,
  CONSENT_NOT_FOUND_CODE,
  ConsentStateError,
  CONSENT_INVALID_STATE_CODE,
} from './consent/errors.js';
// Member lifecycle direct-write rejection (Story 3.1, AC3). Surfaced at the top
// level — mirroring the consent errors — so the apps/api error-mapping middleware
// (Story 3.6 signup route) imports the class + code constant from `@twt/domain`
// directly to map the DB trigger's rejection → HTTP + the P0 audit line; the full
// primitive (reducer, projector, reads, overlay) is also under the `member` namespace.
export {
  MemberStateDirectWriteError,
  MEMBER_STATE_DIRECT_WRITE_CODE,
  isMemberStateDirectWriteError,
} from './member/errors.js';
export * as schema from './schema/index.js';
export * as encryption from './encryption/index.js';
export * as policies from './policies/index.js';
export * as crossTenant from './cross-tenant/index.js';
export * as audit from './audit/index.js';
export * as idempotency from './idempotency/index.js';
export * as ids from './ids/index.js';
export * as passport from './pariwar-passport/index.js';
export * as niyamavali from './niyamavali/index.js';
export * as termsAndConditions from './terms-and-conditions/index.js';
export * as consent from './consent/index.js';
export * as member from './member/index.js';
// Story 3.3a — KYC provider substrate accessors (cert cache + kyc_transactions). The
// DigiLocker provider (apps/api) consumes these; the frozen abstraction itself lives in
// `@twt/contracts/kyc`.
export * as kyc from './kyc/index.js';
// Story 3.4 — member nominee-declaration accessors (the latest-wins replace write + the
// status read). Tenant-scoped; encryption + split derivation are app-layer (the route).
export * as nominee from './nominee/index.js';
export * as rbac from './rbac/index.js';
export * as toneReview from './tone-review/index.js';
export { UUID_REGEX } from './db.js';
