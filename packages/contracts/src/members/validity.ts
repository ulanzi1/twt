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

/** D2 typed sentinel — the contribution producer is Epic 8/9; NEVER an empty array. */
export const ContributionHistoryUnavailableDto = z
  .object({ status: z.literal('producer_unavailable'), producer: z.literal('epic-8-9') })
  .strict();

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
    contributionHistorySummary: ContributionHistoryUnavailableDto,
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
    producer: z.enum(['epic-6', 'epic-8-9']),
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
