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
  // Story 11a.4 — the publish-time naked-PII backstop (AC3a).
  ClausePayloadPiiError,
  CLAUSE_PAYLOAD_PII_CODE,
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
// Story 11b.13 — the per-Pariwar DRIVE TARGET typed errors. Surfaced at the top level for one
// specific reason: `apps/api/src/middleware/error-mapping/index.ts` matches on the CLASS, and every
// one of these MUST be registered there.
// ⛔⛔ THAT IS NOT HYGIENE. `2026-09-05-201` cl.4 rules the version conflict must be a 409 with its
// own REGISTERED code — ⛔ never a bare 23505 and ⛔ never the opaque 500 that
// `UngovernedNomineeBankMaskingChangeError` reaches the wire as on the precedent module (Story
// 11b.3a chunk G2's finding). ⛔ Do not add a drive-target throw without registering it.
export {
  DriveTargetEffectiveFromSkewError,
  DriveTargetInvalidError,
  DriveTargetVersionConflictError,
  DriveTargetVisibilityInvalidError,
  UngovernedDriveTargetChangeError,
  DRIVE_TARGET_EFFECTIVE_FROM_SKEW_CODE,
  DRIVE_TARGET_INVALID_CODE,
  DRIVE_TARGET_UNGOVERNED_CODE,
  DRIVE_TARGET_VERSION_CONFLICT_CODE,
  DRIVE_TARGET_VISIBILITY_INVALID_CODE,
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
// Story 1.19 — member→geo attribution over Story 1.18's tree: `resolveMemberGeoNode` reads the
// member's newest posting district and LIFTS it through the in-force tree, with EVERY level
// independently TYPED-ABSENT ({available:false, reason}) rather than guessed or null-collapsed.
// ⛔ `block` is PERMANENTLY absent — a posting supplies a district and ancestry walks UP. ⛔ This
// root is DELIBERATELY NOT on governance_boundary.yaml's prohibited list; see the module barrel for
// the recorded reason and the standing re-trigger.
export * as memberGeo from './member-geo/index.js';
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
// EXCLUSIVELY from `contribution.confirmed` event-derived state (live since Story 9.4's matcher) + the pure
// pending-aggregate. NOTE THE TWO DISTINCT PRODUCERS: the `contribution.confirmed` EVENT producer exists;
// the contribution-FACT producer that supplies `contribution.*` keys to the validity payload does not —
// that is Story 10.24, which is why R7 contribution-discipline clauses remain only partially evaluable
// despite Epic 9's completed contribution matcher. A READ, never a producer — it never confirms/promotes/
// mutates contribution state. Read by Epic 8's <PoolContributorList> surface; the confirmed-only guard is structural.
export * as contribution from './contribution/index.js';
// Story 9.2 — the [P0] canonical normalized bank-statement row schema (BankStatementEntry) + the
// BankCode authority + the money/deterministic-id helpers every bank parser shares. The single shape
// every `@twt/bank-parsers` parser emits and the Story 9.4 UTR matcher replays. Pure, DB-free, no
// producer here — the parsers (bank-parsers) fill it; the matcher (9.4) consumes it.
export * as bankStatement from './bank-statement/index.js';
// Story 9.3 — the FIRST `reconciliation.*` event vocabulary (Decision D6): the statement-upload
// heartbeat/provenance event + the "padh lenge" manual-transcription-request fallback event. A NEW
// namespace, deliberately NOT `contribution.*` (Story 8.10's exactly-three-types fence). The Story 9.4
// matcher reads land here later.
export * as reconciliation from './reconciliation/index.js';
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
// Story 10.21 AC-R2 — the recorded, staff-executed correction process (⛔ a record, not a write path).
export * as memberDataRights from './member-data-rights/index.js';
export * as rbac from './rbac/index.js';
// Story 1.18 — the geo-tree scope resolver behind `rbac.scopeContains`' injectable seam. A PURE,
// synchronous resolver (`hasPermission` is a pure predicate — ADR-0008 Decision 8) over a versioned
// per-Pariwar tree document loaded ONCE PER REQUEST by `loadGeoTree`. ⭐ There is NO code default
// geography: a Pariwar with no published tree loads `null`, the caller passes no resolver, and
// `denyDeeperGeoResolver` applies — today's behaviour, byte-identical (ADR-0038).
// ⛔ Lives OUTSIDE `rbac/` so that prohibited root gains no DB-reading module; this root is itself
// admitted to `governance_boundary.yaml`'s prohibited list under the same prohibition (d).
export * as geoTree from './geo-tree/index.js';
export * as toneReview from './tone-review/index.js';
// Story 7.8 — the close-of-cycle template-driven framing policy: the pure
// `selectCloseOfCycleFraming` (outcome → canonical `close-of-cycle` template keys +
// required interpolation params; exhaustive `never`; the under_funded branch STRUCTURALLY
// cannot return a comparison template) + the target-quarantining `classifyCycleOutcome`
// (expected/delivered totals in → `CycleFundingOutcome` enum out; the numbers never reach
// the copy path). A [GOVERNANCE] primitive — Epic 8/11b/8.9 render it; no live call site here.
export * as closeOfCycle from './close-of-cycle/index.js';
// Story 8.9 — the calendar-aware close-of-cycle SUBSTRATE (UX-DR77): the per-Pariwar
// `pariwar_holiday_calendar` accessors + the PURE, IST-fixed-offset holiday resolver
// (`isHolidayDate` / `nextNonHolidayDate` / `reconciliationTailDeadline`). Governs the
// post-close RECONCILIATION TAIL only — FR-22's hard Day-15 contribution close is
// untouched (epics.md:3022's window-extension prose is a ratified drafting error). No
// live caller: Epic 9's matcher-tail scheduler + Epic 11b Story 11b.3's Sahyog Vivran
// publish gate are the first consumers.
export * as cycleCalendar from './cycle-calendar/index.js';
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
// Story 8.8 (Task 1; D4) — the notification COMPOSITION substrate: the four per-member delivery-target
// resolvers (push/WA/SMS/Telegram), the shared per-pool member-facing identity join, and the isolated
// push-token invalidation write. Relocated from apps/api so the live fan-out in apps/jobs (the stack's
// first `dispatch()` caller) reaches them without an app→app dependency; apps/api re-exports each from
// its original module, so no apps/api call site changed. Holds NO policy and NO transport — the frozen
// @twt/channels primitives stay untouched and the composition that sequences them lives in apps/jobs.
export * as notifications from './notifications/index.js';
// Story 9.1 (the FIRST Epic-9 story) — the nominee-console domain module. Homes ONLY the PURE
// staff-takeover-by-day-N derivation (`computeStaffTakeover` + `DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS`):
// a total, replay-deterministic `fn({ lastEngagedAt, poolOpenAt, thresholdDays, now }) -> verdict` with
// no wall-clock read inside. The clock runs from `poolOpenAt` while the Story 9.3 engagement writer is
// unbuilt (`lastEngagedAt ?? poolOpenAt`), and the `takeoverEligible` verdict IS the reserved-seam shape
// the Story 9.8 reconciliation review queue consumes (no event emitted, no live consumer today). Consumed
// by the apps/api nominee-console read seam, which resolves `poolOpenAt` off events_log.
export * as nomineeConsole from './nominee-console/index.js';
// Story 10.1 (the FIRST Epic-10 story) — the Helpdesk primitive: the FIFTH event-derived-state
// primitive (helpdesk_tickets + the complete ticket-state reducer + projector-only current_state) +
// the PURE deterministic routing resolver (resolveRoute — the Story 4.6 rule-order determinism analog)
// + the versioned per-Pariwar routing-policy registry (default v1 code seed + create/amend + in-force
// resolve, the clause_versions immutability posture). Consumed by the apps/api create-ticket route;
// the member/operator/admin surfaces are Stories 10.2/10.3/10.4.
export * as helpdesk from './helpdesk/index.js';
// Story 10.5 — the News/Blog `[SURFACE]` workflow module: a mutable-`status` post lifecycle
// (Decision 1 — NOT event-derived-state) wired to the shipped tone-review gate (approve), the
// Story 1.10 audit, and the `alert_published` dispatch fan-out (publish). Full module under the
// `newsBlog` namespace.
export * as newsBlog from './news-blog/index.js';
// News/Blog typed errors surfaced at the top level — mirroring the niyamavali/T&C errors — so the
// apps/api error-mapping middleware imports the class + code constant from `@twt/domain` directly.
export {
  NewsPostNotFoundError,
  NEWS_POST_NOT_FOUND_CODE,
  NewsPostStateError,
  NEWS_POST_INVALID_STATE_CODE,
  NewsPostAuthorReviewerError,
  NEWS_POST_AUTHOR_REVIEWER_CODE,
  NewsPostBilingualRequiredError,
  NEWS_POST_BILINGUAL_REQUIRED_CODE,
  NewsPostScheduleInPastError,
  NEWS_POST_SCHEDULE_IN_PAST_CODE,
} from './news-blog/errors.js';
// Story 10.9 — the Banner/Popup `[SURFACE]` module: a mutable-`status` banner lifecycle (Decision 1
// — NOT event-derived-state) with a pure read-time visibility window (Decision 2 — no scheduler, no
// worker, no queue), a pure total-order collision resolver (Decision 3), a read-time audience
// predicate (Decision 4), and one unified edit whose CONTENT HASH decides re-review + the
// dismissal-invalidating `revision` bump (Decision 5). Full module under the `banners` namespace.
export * as banners from './banners/index.js';
// Banner typed errors surfaced at the top level — mirroring the news-blog/niyamavali errors — so the
// apps/api error-mapping middleware imports the class + code constant from `@twt/domain` directly.
// ⚠ Every one of these MUST have an arm in the middleware; an unmapped domain error becomes a 500.
export {
  BannerNotFoundError,
  BANNER_NOT_FOUND_CODE,
  BannerStateError,
  BANNER_INVALID_STATE_CODE,
  BannerPopupMustBeDismissibleError,
  BANNER_POPUP_MUST_BE_DISMISSIBLE_CODE,
  BannerBilingualRequiredError,
  BANNER_BILINGUAL_REQUIRED_CODE,
  BannerWindowInvalidError,
  BANNER_WINDOW_INVALID_CODE,
} from './banners/errors.js';
// Story 10.15 — the Survey/Poll `[SURFACE]` module: a mutable-`status` survey lifecycle (LBD-2 — NOT
// event-derived-state) with a pure read-time response window (AC2 — no scheduler, no sweep), a
// bounded three-type question vocabulary (LBD-4), a questionnaire FROZEN at publish (LBD-5),
// one-response-per-member on a composite PK (LBD-6), and an aggregate projection structurally
// incapable of carrying a member id (LBD-3). Full module under the `surveys` namespace.
// ⚠ A survey is ADVISORY and has no governance effect (LBD-1) — `response_threshold` gates nothing.
// ⚠ Its audience predicate's `public` arm DENIES — the OPPOSITE polarity to `banners` above (LBD-7).
export * as surveys from './surveys/index.js';
// Survey typed errors surfaced at the top level — mirroring the banners/news-blog errors — so the
// apps/api error-mapping middleware imports the class + code constant from `@twt/domain` directly.
// ⚠ Every one of these MUST have an arm in the middleware; an unmapped domain error becomes a 500.
export {
  SurveyNotFoundError,
  SURVEY_NOT_FOUND_CODE,
  SurveyStateError,
  SURVEY_INVALID_STATE_CODE,
  SurveyFrozenFieldError,
  SURVEY_FROZEN_FIELD_CODE,
  SurveyWindowInvalidError,
  SURVEY_WINDOW_INVALID_CODE,
  SurveyBilingualRequiredError,
  SURVEY_BILINGUAL_REQUIRED_CODE,
  SurveyQuestionnaireInvalidError,
  SURVEY_QUESTIONNAIRE_INVALID_CODE,
  SurveyAnswerInvalidError,
  SURVEY_ANSWER_INVALID_CODE,
  SurveyAlreadyRespondedError,
  SURVEY_ALREADY_RESPONDED_CODE,
  SurveyAudienceUnsupportedError,
  SURVEY_AUDIENCE_UNSUPPORTED_CODE,
  SurveyAudienceValueRequiredError,
  SURVEY_AUDIENCE_VALUE_REQUIRED_CODE,
} from './surveys/errors.js';
// Story 10.10 — member-moderation typed errors surfaced at the top level (the banners/news-blog
// pattern) so the apps/api error-mapping middleware imports the class + code constant from
// `@twt/domain` directly. The MODULE itself is namespaced under `member.moderation` (not a top-level
// namespace) because it is a second, ORTHOGONAL state machine on the member's own stream — keeping
// it under `member.` makes that relationship visible at every call site.
// ⚠ Every one of these MUST have an arm in the middleware; an unmapped domain error becomes a 500
// (the Story 10.8 Pass-3 finding).
export {
  ModerationStateError,
  MODERATION_INVALID_STATE_CODE,
  ModerationReasonCodeInvalidError,
  MODERATION_REASON_CODE_INVALID_CODE,
  ModerationRationaleRequiredError,
  MODERATION_RATIONALE_REQUIRED_CODE,
  // Story 10.20 (WS-A/WS-C) — the record model's typed refusals. All four are 422s about the
  // request's shape AS A GOVERNANCE RECORD, deliberately distinct from the 409 above about the
  // member's state; a trustee must be able to tell "this is not a valid record" from "this action
  // is not legal right now".
  ModerationEscalationRequiredError,
  MODERATION_ESCALATION_REQUIRED_CODE,
  ModerationEscalationNotApplicableError,
  MODERATION_ESCALATION_NOT_APPLICABLE_CODE,
  ModerationEscalationRestatementError,
  MODERATION_ESCALATION_RESTATEMENT_CODE,
  ModerationEvidenceRefInvalidError,
  MODERATION_EVIDENCE_REF_INVALID_CODE,
  // Story 10.20 (WS-D) — the dwell precondition. ⚠ The two differ in KIND, not merely in severity:
  // `dwell_not_elapsed` is a 409 a trustee resolves by waiting or by invoking the immediate
  // exception; `dwell_policy_unprovisioned` is a 503 no amount of waiting resolves.
  ModerationDwellNotElapsedError,
  MODERATION_DWELL_NOT_ELAPSED_CODE,
  ModerationDwellPolicyUnprovisionedError,
  MODERATION_DWELL_UNPROVISIONED_CODE,
  // Story 10.20 (WS-E) — the append-only grounds.
  ModerationActionNotFoundError,
  MODERATION_ACTION_NOT_FOUND_CODE,
  ModerationGroundNotFoundError,
  MODERATION_GROUND_NOT_FOUND_CODE,
  ModerationPrimaryGroundImmutableError,
  MODERATION_PRIMARY_GROUND_IMMUTABLE_CODE,
  ModerationGroundAlreadySupersededError,
  MODERATION_GROUND_ALREADY_SUPERSEDED_CODE,
  // Story 10.22 (Niyamavali §8.8, Decision `2026-08-15-121`) — the moderation appeal's five typed
  // refusals. ⚠ Note the DELIBERATE status split, which a reader must not flatten:
  //   · `appeal_not_appealable`      422 — the request is not coherent (no act to appeal against);
  //   · `appeal_already_open`        409 — a state objection, and ⛔ NOT an exhaustion: §8.8 permits
  //                                        a further appeal once the open one is determined;
  //   · `appeal_already_decided`     409 — §8.8 gives one review; a determination is immutable;
  //   · `appeal_adjudicator_excluded`409 — ⛔ NEVER 403. The actor HOLDS the key and may decide other
  //                                        appeals; what is refused is their relationship to THIS
  //                                        case. A 403 would tell an operator they lack a capability
  //                                        they in fact hold, with nothing naming the real cause;
  //   · `appeal_not_found`           404 — ⛔ not 403, so an ownership read cannot reveal that a
  //                                        record exists in another tenant.
  ModerationAppealNotAppealableError,
  MODERATION_APPEAL_NOT_APPEALABLE_CODE,
  ModerationAppealAlreadyOpenError,
  MODERATION_APPEAL_ALREADY_OPEN_CODE,
  ModerationAppealAlreadyDecidedError,
  MODERATION_APPEAL_ALREADY_DECIDED_CODE,
  ModerationAppealAdjudicatorExcludedError,
  MODERATION_APPEAL_ADJUDICATOR_EXCLUDED_CODE,
  ModerationAppealNotFoundError,
  MODERATION_APPEAL_NOT_FOUND_CODE,
} from './member/moderation/errors.js';
// Story 10.6 — the bulk operations `[PRIMITIVE]`: a single `bulkExecute` harness (dry-run flag),
// the `BulkOperation` contract, an empty registry (operations are surface-owned — 10.10/10.12/the
// notification family register their own), the 5k-item-per-batch cap, per-item RBAC scope-check
// reuse (`checkPermission`), an injected audit seam, and the dry-run parity invariant: preview and
// execute share ONE evaluator code path, so "looked fine in preview, silently failed in execute" is
// structurally impossible. No new RBAC key, no events, no migration — see the Scope Boundary.
export * as bulkOperations from './bulk-operations/index.js';
// Story 10.7 — the Reports & Exports library [SURFACE]: the report-template registry + Open/Closed
// assembly harness (never branches on reportType), scope-as-predicate queries (Decision 3), mask-by-
// default PII posture (Decision 2, Tier-1 NEVER decrypted in v1), per-template RBAC (Decision 6), the
// report_exports lifecycle accessors, and the CSV(reused toCsv)/JSON serializer. The admin analog of
// 3.11 (dataExport) — scope-respecting + PII-masked because the requestor is an admin reading OTHER
// members' rows. No events, no projector (reports read state) — see the Scope Boundary.
export * as reports from './reports/index.js';
// Story 10.8 — the feature-flag `[PRIMITIVE]`: the versioned registry (code-default v1 + three-tier
// override ≻ global ≻ default resolution + the immutable flip write), the PURE first-match cohort
// evaluator (no clock/IO/async, never throws — fails closed to the flag's fallbackDefault), the
// capability-bar loader (governance_boundary.yaml), the Story 4.8-posture lookup cache with the
// audit/access layer OUTSIDE the cached core, and the declared-absent FlagHealthSignal port.
// ⚠ The `governance-boundary` CI gate FAILS the build on any import of this namespace inside
// packages/domain/src/{audit,rbac,consent,contribution}, packages/validity-service/src, or scripts/.
// That is the mechanized governance boundary — see governance_boundary.yaml.
export * as featureFlags from './feature-flags/index.js';
// Story 10.11 — the Trustee-Lite `[SURFACE]` aggregator's PURE core. Owns NO state: no table, no
// migration, no event type, no projector, no permission key. Normalizes six heterogeneous
// trustee-attention sources into ONE `TrusteeSignalRow`, applies the two-tier deadline/age order
// (four of the six sources carry no deadline at all — the order generalizes the epic's moderation
// carve-out rather than special-casing it), derives severity ONLY where a source defines one (and
// structurally NEVER on a moderation or violator row), and derives the DETECTION-ONLY R7 violator
// flags off the Story 4.6 validity payload. Every accessor is DB-free and clock-injected; the six
// reads themselves live in `apps/api/src/modules/trustee-lite/`.
export * as trusteeLite from './trustee-lite/index.js';
// Story 10.12 — the per-Pariwar custom-fields `[PRIMITIVE]` (FR-54, architecture §1.7): the
// append-only VERSIONED definitions registry, the FIXED type vocabulary, the three frozen JSONB limit
// classes, the hand-written validators (NO runtime Zod — story D3), the validated
// `members.custom_fields` write path, and ⭐ the FROZEN-GOVERNANCE FENCE.
// ⚠ The fence is the load-bearing half. epics.md:3605 cites Story 1.16c (`schema-diff`) as rejecting
// a `payout_destinations` custom field; that citation is unenforceable — a custom field is a JSONB key
// authored at runtime, and `schema-diff` scans committed migrations, route literals and Zod exports.
// This namespace supplies the enforcement that citation assumed existed, in three layers: the runtime
// fence here, the 0095 CHECK constraint, and the `custom-field-governance` CI gate.
// ⚠ It is also a DECLARED DEVIATION from §1.7, which names a code file as the definition medium. See
// ADR-0037 and ESCALATION 1 — architecture is amended by proposal, never by a story's convenience.
export * as customFields from './custom-fields/index.js';
export { UUID_REGEX } from './db.js';
