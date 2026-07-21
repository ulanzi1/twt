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
// Member WA opt-in typed errors (Story 5.4). Surfaced at the top level — mirroring the consent errors — so
// the apps/api member opt-in route error-mapping imports the class + code constant directly; the full
// primitive is also under the `waOptIn` namespace below.
export {
  WaOptInNotFoundError,
  WA_OPT_IN_NOT_FOUND_CODE,
  WaOptInPendingExistsError,
  WA_OPT_IN_PENDING_EXISTS_CODE,
  WaOptInStateError,
  WA_OPT_IN_INVALID_STATE_CODE,
} from './wa-opt-in/errors.js';
// Member Telegram opt-in typed errors (Story 5.5). Surfaced at the top level — mirroring the WA opt-in
// errors — so the apps/api member opt-in route error-mapping imports the class + code constant directly; the
// full primitive is also under the `telegramOptIn` namespace below.
export {
  TelegramOptInNotFoundError,
  TELEGRAM_OPT_IN_NOT_FOUND_CODE,
  TelegramOptInPendingExistsError,
  TELEGRAM_OPT_IN_PENDING_EXISTS_CODE,
  TelegramOptInStateError,
  TELEGRAM_OPT_IN_INVALID_STATE_CODE,
} from './telegram-opt-in/errors.js';
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
// Claim lifecycle direct-write rejection (Story 6.1, AC3). Surfaced at the top level —
// mirroring the member errors — so the apps/api error-mapping middleware (Story 6.2
// intake route) imports the class + code constant from `@twt/domain` directly to map
// the DB trigger's rejection → HTTP + the P0 audit line; the full primitive (reducer,
// projector, reads, events) is also under the `claim` namespace.
export {
  ClaimStateDirectWriteError,
  CLAIM_STATE_DIRECT_WRITE_CODE,
  isClaimStateDirectWriteError,
} from './claim/errors.js';
// Pool lifecycle direct-write rejection (Story 7.1, AC5). Surfaced at the top level —
// mirroring the member/claim errors — so a future apps/api error-mapping middleware
// (Story 7.3 spawn saga) imports the class + code constant from `@twt/domain` directly
// to map the DB trigger's rejection → HTTP + the P0 audit line; the full primitive
// (reducer, projector, events) is also under the `pool` namespace.
export {
  PoolStateDirectWriteError,
  POOL_STATE_DIRECT_WRITE_CODE,
  isPoolStateDirectWriteError,
} from './pool/errors.js';
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
// Story 6.1 — claim case lifecycle primitive (claims table + claim.* state machine +
// pure reducer + single-writer projector + time-travel reads). Twin of `member`.
export * as claim from './claim/index.js';
// Story 7.1 — pool lifecycle primitive (pools table + pool.* state machine + pure
// reducer + single-writer projector). The THIRD event-derived-state primitive; twin
// of `claim` + `member`. Consumed by the Story 7.3 spawn saga + Epic 7/9 downstream.
export * as pool from './pool/index.js';
// Story 8.1 — alert lifecycle primitive (alerts table + alert.* state machine + pure
// reducer + single-writer projector + deterministic alert_id + the cycle-open mint driver).
// The FOURTH event-derived-state primitive; twin of `pool`/`claim`/`member`. Consumes Epic 7's
// `cycle.frozen` (the cycle-open trigger, apps/jobs) and is read by Epic 8's contribution surfaces.
export * as alert from './alert/index.js';
// Story 8.3 — confirmed-contributor read primitive (the Live Contributor List's read model). Sources
// EXCLUSIVELY from `contribution.confirmed` event-derived state (Epic 9's producer, unbuilt → honestly
// empty today) + the pure pending-aggregate. A READ, never a producer — it never confirms/promotes/mutates
// contribution state. Read by Epic 8's <PoolContributorList> surface; the confirmed-only guard is structural.
export * as contribution from './contribution/index.js';
// Story 7.1 (Task 6) — pool-snapshot migration adapters (§1.6 read-through-adapters).
// The FIRST real adapter (pool v1); selected by `format_version` via readPoolSnapshot.
export * as snapshotAdapters from './snapshot-adapters/index.js';
// Story 3.3a — KYC provider substrate accessors (cert cache + kyc_transactions). The
// DigiLocker provider (apps/api) consumes these; the frozen abstraction itself lives in
// `@twt/contracts/kyc`.
export * as kyc from './kyc/index.js';
// Story 3.4 — member nominee-declaration accessors (the latest-wins replace write + the
// status read). Tenant-scoped; encryption + split derivation are app-layer (the route).
export * as nominee from './nominee/index.js';
// Story 3.5 — member medical-disclosure accessors (the append-only history write + reads) +
// the registry-backed IMA-list resolver (`resolveImaList` wraps niyamavali.resolveByClauseId).
// Tenant-scoped; encryption + clause/consent/audit orchestration are app-layer (the route).
export * as medical from './medical/index.js';
// Story 3.6b — signup ₹110 Vyawastha Shulk receipt accessors (the always-persisted AR-67 receipt
// write + status/idempotency reads) + the Reference Code port-seam capture (D2). Tenant-scoped;
// the lock-in gate + projector emission + audit orchestration are app-layer (the route).
export * as payment from './payment/index.js';
// Story 3.11 — member data-export section-assembly core (the DPDPA data-portability ZIP gathering
// logic; decrypts Tier-1 PII — the member is the legitimate audience). The apps/jobs build worker
// consumes `assembleMemberExport`; the ZIP/encrypt/persist orchestration is the thin job runtime.
export * as dataExport from './data-export/index.js';
export * as rbac from './rbac/index.js';
export * as toneReview from './tone-review/index.js';
// Story 7.8 — the close-of-cycle template-driven framing policy: the pure
// `selectCloseOfCycleFraming` (outcome → canonical `close-of-cycle` template keys +
// required interpolation params; exhaustive `never`; the under_funded branch STRUCTURALLY
// cannot return a comparison template) + the target-quarantining `classifyCycleOutcome`
// (expected/delivered totals in → `CycleFundingOutcome` enum out; the numbers never reach
// the copy path). A [GOVERNANCE] primitive — Epic 8/11b/8.9 render it; no live call site here.
export * as closeOfCycle from './close-of-cycle/index.js';
// Story 4.8 — the FR-12A per-cohort validity cache substrate: cheap key resolution + low-level
// member_validity_cache access + the cohort_invalidation_epochs bump/read + the GC sweep. The
// cache-aside orchestration (getValidityCached) lives in @twt/validity-service.
export * as validityCache from './validity-cache/index.js';
// Story 5.2 — the push device-token registration substrate: the app-open-rebuild upsert, the active-token
// read (delivery resolver), the AC5 invalidation write, and the Class C stale/invalid cleanup prune.
// Tenant-scoped; encryption + blind-index + audit orchestration are app-layer (the registration route).
export * as deviceToken from './device-token/index.js';
// Story 5.3 — the per-Pariwar WhatsApp Business config substrate accessors: config singleton read/write
// (getWaConfig/upsertWaConfig), per-category UTILITY template registry (listWaTemplates/upsertWaTemplate),
// and the delivery-gate resolveApprovedTemplate (null ⇒ category not WA-eligible). Tenant-scoped; the
// access-token NAME is a pointer resolved by the composition layer, never here.
export * as channelConfig from './channel-config/index.js';
// Story 5.4 — member WA opt-in state-machine accessors: the five-state operational lifecycle transitions
// (createPendingOptIn/activateOptIn/revokeOptIn), the match/status reads (matchPendingOptIn/isOptInActive/
// getOptInForMember), the §3.11 webhook-queue seam (persistInboundWebhookEvent/claimUnprocessedWebhookEvents/
// markWebhookEventProcessed), and the verification-phrase generate/extract helpers. Tenant-scoped; audit
// linkage is the consumer route/worker's obligation (audit-or-throw).
export * as waOptIn from './wa-opt-in/index.js';
// Story 5.5 — member Telegram opt-in state-machine accessors: the five-state operational lifecycle
// transitions (createPendingOptIn/activateOptIn/revokeOptIn), the match/status reads (matchPendingOptIn/
// isOptInActive/getOptInForMember/getChatIdForMember/getActiveOptInByChatId), the §3.11 webhook-queue seam
// (persistInboundWebhookEvent/claimUnprocessedWebhookEvents/markWebhookEventProcessed), and the
// verification-code generate/extract helpers. Tenant-scoped; audit linkage is the consumer route/worker's
// obligation (audit-or-throw).
export * as telegramOptIn from './telegram-opt-in/index.js';
// Story 5.6 — per-member transactional-SMS send rate-limit accessor: the atomic `sms_rate_buckets`
// check-and-consume (checkAndConsumeSmsBudget) + the expiry vacuum (deleteExpiredSmsRateBuckets). A
// dedicated budget SEPARATE from the OTP send buckets so an alert-SMS flood can't drain the OTP budget.
export * as smsRateLimit from './sms-rate-limit/index.js';
// Story 5.8 — the per-Pariwar degraded-mode declaration accessors: declareDegradedMode (advisory-locked,
// auto-revoke-then-insert — enforces single-active-per-Pariwar), revokeDegradedMode (idempotent manual
// revocation), and getActiveDegradedMode (the computed-active read: revoked_at IS NULL AND
// effective_from<=at AND (expires_at IS NULL OR expires_at>at)). Tenant-scoped; audit linkage is the
// consumer route's obligation. Backs the AR-20 cycle-open SMS bridge.
export * as degradedMode from './degraded-mode/index.js';
export { UUID_REGEX } from './db.js';
