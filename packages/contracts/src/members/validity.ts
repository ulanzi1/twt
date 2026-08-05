// packages/contracts/src/members/validity.ts
//
// The FR-12A Member Validity + admin member-search transport contracts (Story 4.7, Task 4). The wire
// DTOs for:
//   · GET  /api/v1/member/validity                            — the member's own (redacted) validity payload
//   · GET  /api/v1/p/:pariwarId/admin/members/:memberId/validity — an admin's (scope-gated, audited) read
//   · POST /api/v1/p/:pariwarId/admin/members/search             — the AR-65 compound-read-model search
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So this mirrors the
// `@twt/validity-service` payload SHAPE with plain Zod + the `_common` `Iso8601Datetime`/`UuidString`
// primitives, and REUSES `MemberLifecycleStateWire` (kyc/signup.ts). ALL objects `.strict()`.
//
// ── Wire naming = camelCase (matches the shipped substrate) ─────────────────────────────────────────
// The `@twt/validity-service` header aspirationally says wire keys become snake_case, but the ACTUAL
// shipped convention in this repo is camelCase JSON (lock-in.ts `enteredAt`/`unlockDate`, auth.ts
// `memberId`/`pariwarId`, and every apps/api handler returns camelCase directly). This DTO follows the
// real substrate — camelCase field names identical to the service payload — so the apps/api boundary is
// a pure pass-through (`redactForCaller` output → parse) with NO key remapping. Recorded in the Dev
// Agent Record as a factual correction to the story's "snake_case mapping" wording.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { MemberLifecycleStateWire } from '../kyc/signup.js';

// ── Validity payload sub-objects (mirror packages/validity-service/src/types.ts) ─────────────────────

export const LockInStatusDto = z
  .object({
    daysAtJoin: z.number().int().nullable(),
    unlockDate: Iso8601Datetime.nullable(),
    state: z.enum(['in-lock-in', 'unlocked', 'never-entered']),
  })
  .strict();

export const VyawasthaShulkStatusDto = z
  .object({
    paidThrough: Iso8601Datetime.nullable(),
    daysUntilLapse: z.number().int().nullable(),
    inRenewalGrace: z.boolean(),
    graceRemainingDays: z.number().int().nullable(),
  })
  .strict();

/**
 * D2 typed sentinel — an honest per-member contribution-history gap; NEVER a fabricated zero.
 *
 * Story 10.24 re-pointed `producer` from `'epic-8-9'` to `'story-10-24'` (the rename Story 10.11 owed
 * forward): `epic-8-9` named a producer that was never a unit of work, which is exactly how the gap
 * survived two epic retrospectives unowned. The status LITERAL is unchanged — `violator-flags.ts`'s
 * short-circuit and the sentinel-lockstep test both depend on `'producer_unavailable'`.
 *
 * The sentinel remains REACHABLE after 10.24 (D6): a per-member gap can still be genuine (no projected
 * history; a historical `at` before the projection's coverage; an incomplete backfill).
 *
 * ── `producer` widened to add `'niyamavali-registry'` (2026-08-06 finding) ────────────────────────
 * A SECOND, distinct gap reuses this same sentinel: no activated R7(C)–(F) clause version is
 * provisioned for the Pariwar at the evaluated instant (the RULES, not the FACTS, are missing). The
 * literal tells an operator which subsystem to debug — see `CONTRIBUTION_R7_REGISTRY_UNAVAILABLE`
 * (`@twt/validity-service/payload.ts`).
 */
export const ContributionHistoryUnavailableDto = z
  .object({
    status: z.literal('producer_unavailable'),
    producer: z.enum(['story-10-24', 'niyamavali-registry']),
  })
  .strict();

/**
 * Story 10.24 — the PRODUCED contribution history.
 *
 * `facts` is an open record keyed by the DOTTED `contribution.*` fact keys (`contribution.total_count`,
 * …). It is deliberately NOT `.strict()`-enumerated: the key set grows as Stories 10.25/10.26 supply
 * the two held facts, and the consumer (`deriveViolatorFlags`) filters by `startsWith('contribution.')`
 * rather than by a fixed field list. `heldFacts` puts the omission ON THE WIRE, so a client can say
 * WHAT is missing and WHO owns it instead of silently rendering a partial picture.
 */
export const ContributionHistoryAvailableDto = z
  .object({
    status: z.literal('ok'),
    facts: z.record(z.string(), z.union([z.number(), z.boolean()])),
    lapseSince: Iso8601Datetime.nullable(),
    // `.readonly()` mirrors the service type's `readonly [...]`, so the apps/api boundary stays a pure
    // pass-through with no defensive copy (the DTO IS the service payload's shape, not a re-modelling).
    heldFacts: z.array(z.object({ key: z.string(), producer: z.string() }).strict()).readonly(),
  })
  .strict();

/** The contribution-history sub-object: produced, or the honest typed gap. */
export const ContributionHistorySummaryDto = z.union([
  ContributionHistoryAvailableDto,
  ContributionHistoryUnavailableDto,
]);

export const MedicalDisclosureFlagsDto = z
  .object({
    hasDisclosureOnRecord: z.boolean(),
    declaredConditionCount: z.number().int().nullable(),
    imaListVersion: z.string().nullable(),
    /** State-Trustee-scope-only; already forced `false` by service redaction for narrower callers. */
    pendingConcealmentFlag: z.boolean(),
  })
  .strict();

export const RetirementCoverageDto = z
  .object({
    isRetired: z.boolean(),
    yearsOfCoverageEarned: z.number(),
    coverageThrough: Iso8601Datetime.nullable(),
    daysRemaining: z.number().int().nullable(),
    active: z.boolean(),
  })
  .strict();

export const RetirementCoverageUnavailableDto = z
  .object({ status: z.literal('clause_unavailable') })
  .strict();

/** retirement_coverage is either the projected object OR the typed `clause_unavailable` gap. */
export const RetirementCoverageUnionDto = z.union([
  RetirementCoverageDto,
  RetirementCoverageUnavailableDto,
]);

export const ApplicableClauseDto = z
  .object({
    clauseId: z.string().min(1),
    clauseVersionId: z.string().min(1),
    outcome: z.string(),
    reasonCode: z.string(),
  })
  .strict();

export const ProvenanceEntryDto = z
  .object({
    clauseId: z.string().min(1),
    clauseVersionId: z.string().min(1),
    payloadHash: z.string().min(1),
    evaluatedAt: Iso8601Datetime,
    benefitMechanism: z.enum(['pool', 'reserve']),
  })
  .strict();

/**
 * The canonical Member Validity payload as it crosses the wire — the redacted-or-full
 * `@twt/validity-service` `MemberValidityPayload`. The panel renders this WITHOUT any additional query
 * (Story 4.6 AC3). The `validityPayloadHash` is over the FULL pre-redaction payload, so a redacted
 * payload still carries the canonical hash for audit correlation.
 *
 * ⚠ `isValid` and `isAssignable` answer DIFFERENT questions and are free to diverge (Story 10.17).
 * A consumer must know which one it means before reading either:
 *   · `isValid`      — COVERAGE: "is this member covered for support if death today?"
 *   · `isAssignable` — ROSTER:   "should this member be assigned to a contribution pool?"
 * A SUSPENDED member is `isValid: false, isAssignable: true` — a suspension removes the entitlement
 * to RECEIVE support, never the obligation to CONTRIBUTE while completing a restoration path
 * (Niyamavali §3.3). A TERMINATED member is false on both.
 */
export const MemberValidityPayloadDto = z
  .object({
    memberId: UuidString,
    evaluatedAt: Iso8601Datetime,
    ruleRegistryVersion: z.string(),
    isValid: z.boolean(),
    isActive: z.boolean(),
    /** ROSTER eligibility (Story 10.17) — NOT coverage. A suspended member is `true` here, `false` on `isValid`. */
    isAssignable: z.boolean(),
    lockInStatus: LockInStatusDto,
    vyawasthaShulkStatus: VyawasthaShulkStatusDto,
    contributionHistorySummary: ContributionHistorySummaryDto,
    medicalDisclosureFlags: MedicalDisclosureFlagsDto,
    retirementCoverage: RetirementCoverageUnionDto,
    specialFlags: z.array(z.string()),
    applicableNiyamavaliClauses: z.array(ApplicableClauseDto),
    provenanceTrace: z.array(ProvenanceEntryDto),
    validityPayloadHash: z.string().min(1),
  })
  .strict();
export type MemberValidityPayloadDto = z.output<typeof MemberValidityPayloadDto>;

/** `GET /api/v1/member/validity` + `GET /api/v1/admin/members/:memberId/validity` response. */
export const MemberValidityResponse = z.object({ validity: MemberValidityPayloadDto }).strict();
export type MemberValidityResponse = z.output<typeof MemberValidityResponse>;

// ── Admin member-search (the AR-65 compound read model) ──────────────────────────────────────────────

/** The D2 producer-unavailability sentinel, as it crosses the wire (contribution / claim sections). */
export const ProducerUnavailableSectionDto = z
  .object({
    status: z.literal('producer_unavailable'),
    // Story 10.24 (AC8): 'epic-8-9' → 'story-10-24'. The admin member-search projection keeps its
    // SENTINEL — populating `contribution_section` with real facts is DEFERRED (deferred-work.md);
    // this only re-points the label so it names a story that exists rather than an unowned epic pair.
    producer: z.enum(['epic-6', 'story-10-24']),
  })
  .strict();

/** Non-PII nominee summary entry (count/split/relationship only — NEVER the encrypted name/mobile). */
export const NomineeSummaryEntryDto = z
  .object({
    rank: z.number().int(),
    relationship: z.string(),
    splitPct: z.number().int(),
  })
  .strict();

/**
 * One admin member-search result: the projection's non-PII sections PLUS the decrypted-for-display
 * identity fields (the handler decrypts under the admin's scope). `name` is the resolved display name
 * (null for pending-KYC / anonymized handled by the display-name seam); `maskedMobile` is the last-4
 * masked form (NEVER the plaintext); `aadhaarMasked` is the already-masked last-4 (a DISPLAY field, not
 * a v1 search key — D3 refinement v).
 */
export const MemberSearchResultItem = z
  .object({
    memberId: UuidString,
    state: MemberLifecycleStateWire,
    name: z.string().nullable(),
    maskedMobile: z.string().nullable(),
    aadhaarMasked: z.string().nullable(),
    verificationStrength: z.enum(['aadhaar_kyc', 'self_declared', 'unverified']).nullable(),
    nomineeSummary: z.array(NomineeSummaryEntryDto),
    contributionSection: ProducerUnavailableSectionDto,
    claimSection: ProducerUnavailableSectionDto,
  })
  .strict();
export type MemberSearchResultItem = z.output<typeof MemberSearchResultItem>;

/**
 * `POST /api/v1/admin/members/search` request. Exactly one exact-match dimension (D3-A): `memberId`,
 * `mobile` (a raw mobile the server blind-indexes), or `pariwar` (browse the active scope). Prefix/fuzzy
 * and name/Aadhaar search are OUT OF SCOPE (deferred; D3). Pagination is server-clamped.
 */
export const MemberSearchRequest = z
  .object({
    by: z.enum(['memberId', 'mobile', 'pariwar']),
    value: z.string().min(1).optional(),
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((v) => v.by === 'pariwar' || (v.value !== undefined && v.value.length > 0), {
    message: 'value is required for by=memberId and by=mobile (exact-match search)',
    path: ['value'],
  });
export type MemberSearchRequest = z.output<typeof MemberSearchRequest>;

/** `POST /api/v1/admin/members/search` response — the page of compound-read-model results. */
export const MemberSearchResponse = z
  .object({ results: z.array(MemberSearchResultItem) })
  .strict();
export type MemberSearchResponse = z.output<typeof MemberSearchResponse>;
