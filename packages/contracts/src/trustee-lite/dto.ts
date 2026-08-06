// Trustee-Lite transport DTOs — Story 10.11 (Task 3; AC1/AC4/AC6/AC8).
//
// The FR-57 trustee worklist: one aggregated list + signals view over six trustee-attention sources
// plus the R7 violator arm. Pure Zod — NO `@twt/domain` import in any shipped file (the RN Metro
// bundle boundary); `tests/trustee-lite.test.ts` is the only place the domain tuples are imported,
// as a sync-guard, and tests never ship. `.strict()` throughout.
//
// ── ID + non-PII summary surface only (AC8) ───────────────────────────────────────────────────
// Every field below is an identifier, a machine CODE, a derived instant, or a controlled non-PII
// display snapshot. NO ciphertext crosses this contract, no name and no mobile: each row cross-links
// to a canonical surface that already authorizes and decrypts on its own. Contrast the 9.8
// reconciliation DETAIL response, which does decrypt — because it is the detail.
//
// ── Every section key is OPTIONAL, and that is load-bearing (AC6) ─────────────────────────────
// A section the caller cannot act on is ABSENT from the response, not present-and-empty. An empty
// `r9_voting` array would tell an actor without `claim.r9_vote` that there are zero R9 cases — an
// existence oracle. `.optional()` here is the wire half of that guarantee; the handler's per-section
// grant filter is the other half.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/**
 * The seven trustee-attention categories (AC1). Mirror of the domain `TRUSTEE_SIGNAL_CATEGORIES`
 * (`trustee-lite/types.ts`); the tests/trustee-lite.test.ts sync-guard asserts the two tuples never
 * drift, INCLUDING their order (the domain order is the AC2 tie-break's first key).
 */
export const TRUSTEE_SIGNAL_CATEGORIES = [
  'cycle_freeze',
  'r9_voting',
  'concealment',
  'appeal',
  'reconciliation',
  'moderation',
  'violator_flag',
] as const;
export const TrusteeSignalCategory = z.enum(TRUSTEE_SIGNAL_CATEGORIES);
export type TrusteeSignalCategory = z.output<typeof TrusteeSignalCategory>;

/**
 * The derived severity band (AC3) — the Story 10.4 helpdesk vocabulary reused, not a second severity
 * language. Present ONLY on the two dated categories; `null` everywhere else, and STRUCTURALLY null
 * on `moderation` / `violator_flag` (`epics.md:3587`: a severity score on a moderation row would
 * itself be a recommendation).
 */
export const TRUSTEE_SIGNAL_SEVERITIES = ['breached', 'due_soon', 'on_track'] as const;
export const TrusteeSignalSeverity = z.enum(TRUSTEE_SIGNAL_SEVERITIES);
export type TrusteeSignalSeverity = z.output<typeof TrusteeSignalSeverity>;

/** Which canonical surface a row links to (AC7). The href derivation is the admin app's. */
export const TRUSTEE_CROSS_LINK_KINDS = [
  'cycle_freeze',
  'r9_voting',
  'claim_verify',
  'reconciliation_review',
  'member_record',
] as const;
export const TrusteeCrossLinkKind = z.enum(TRUSTEE_CROSS_LINK_KINDS);
export type TrusteeCrossLinkKind = z.output<typeof TrusteeCrossLinkKind>;

/**
 * ONE normalized trustee-attention row (AC1).
 *
 * `deadline_at`, `raised_at` and `age_ms` are nullable ON PURPOSE (AC2). Only reconciliation ships a
 * deadline and only appeals derive one; cycle-freeze, R9 voting and concealment carry no temporal
 * field at all. `null` renders as an EXPLICIT "no deadline" / "age not on record" affordance — never
 * a fabricated date, never a blank cell that reads as "due now", never a silently dropped row.
 */
export const TrusteeSignalRow = z
  .object({
    category: TrusteeSignalCategory,
    /** Stable, category-local key for the SOURCE row (a claim appears in two sections — D6). */
    source_key: z.string().min(1).max(256),
    /** The resource the cross-link addresses: a claim_case_id, member_id or pool_id. */
    resource_id: UuidString,
    /** The claim this row concerns, when it concerns one; null for member-/pool-scoped rows. */
    claim_case_id: UuidString.nullable(),
    /** A short NON-PII summary: states, machine codes, controlled display snapshots (AC8). */
    label: z.string().min(1).max(512),
    /** `now - raised_at` in ms; null exactly when `raised_at` is null. Never negative. */
    age_ms: z.number().int().nonnegative().nullable(),
    raised_at: Iso8601Datetime.nullable(),
    deadline_at: Iso8601Datetime.nullable(),
    severity: TrusteeSignalSeverity.nullable(),
    cross_link_kind: TrusteeCrossLinkKind,
  })
  .strict();
export type TrusteeSignalRow = z.output<typeof TrusteeSignalRow>;

// ── The R7 violator arm (AC4) ─────────────────────────────────────────────────────────────────

/** One evaluated `contribution.*` fact establishing a clause. */
export const ViolatorFlagFact = z
  .object({
    key: z.string().min(1).max(128),
    value: z.union([z.string().max(256), z.number(), z.boolean(), z.null()]),
  })
  .strict();
export type ViolatorFlagFact = z.output<typeof ViolatorFlagFact>;

/**
 * ONE R7 violator flag — a FROZEN key set (AC4).
 *
 * Exactly four keys: `clause_id`, `clause_label`, `facts_establishing[]`, `holding_since`. There is
 * NO recommended action, NO suggested outcome, NO severity, NO priority, NO rank, NO score and NO
 * ordering by inferred urgency (`epics.md:3582-3587`, `prd.md:879`). The trustee decides; this
 * surface only reports what was observed.
 *
 * `tests/trustee-lite.test.ts` pins this two ways: the parsed key set must equal the permitted set
 * EXACTLY, and no key may match `/recommend|suggest|advis|severit|urgen|priorit|rank|score/i` — so a
 * future field cannot smuggle a recommendation in under a different name.
 *
 * `holding_since` is nullable and is NOT back-filled from the evaluation instant: "the clause applies
 * as of this evaluation" and "the member has been in violation since this date" are different claims.
 */
export const ViolatorFlag = z
  .object({
    clause_id: z.string().min(1).max(128),
    clause_label: z.string().min(1).max(256),
    facts_establishing: z.array(ViolatorFlagFact).max(32),
    holding_since: Iso8601Datetime.nullable(),
  })
  .strict();
export type ViolatorFlag = z.output<typeof ViolatorFlag>;

/** One member's flags within an evaluated violator section. */
export const ViolatorFlagMember = z
  .object({
    member_id: UuidString,
    flags: z.array(ViolatorFlag).min(1).max(16),
  })
  .strict();
export type ViolatorFlagMember = z.output<typeof ViolatorFlagMember>;

/**
 * The violator section (AC4, D1-B). A DISCRIMINATED union — never a bare list — because an empty
 * violator list on a governance surface reads as *"no members are in violation"*, a false all-clear.
 *
 * `detection_unavailable` NAMES the missing producer, so the surface can say what is absent instead
 * of showing a bare gap.
 *
 * ⚠ It is NO LONGER the everyday answer. That sentence described the 10.11 state, when
 * `validity-service/payload.ts` hardcoded the contribution-history sentinel and no R7 clause could
 * apply to anyone. Stories 10.24/10.25/10.26 built the fact producer (all seven keys) and activated
 * R7(C)–(G), so this arm now means what it says: a GENUINE per-member or per-Pariwar gap — no
 * projected history, an instant before the coverage watermark, or an unprovisioned R7 registry.
 */
export const ViolatorFlagsSection = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('detection_unavailable'),
      /** The raw producer sentinel; the console maps it to admin-facing copy. */
      producer: z.string().min(1).max(64),
    })
    .strict(),
  z
    .object({
      status: z.literal('ok'),
      members: z.array(ViolatorFlagMember).max(500),
    })
    .strict(),
]);
export type ViolatorFlagsSection = z.output<typeof ViolatorFlagsSection>;

// ── The response (AC6) ────────────────────────────────────────────────────────────────────────

/**
 * The Trustee-Lite aggregate (AC1/AC6). EVERY section key is optional: an ABSENT key means the
 * caller does not hold that section's permission key, while a PRESENT-and-empty array means "you may
 * see this section and there is genuinely nothing in it". The console renders those two as visibly
 * different states (AC9) and never collapses them.
 *
 * A caller holding NONE of the six keys gets a structured 403, not a 200 with an empty body.
 */
export const TrusteeLiteResponse = z
  .object({
    /** The instant the aggregate was derived — every `age_ms` is relative to this. */
    evaluated_at: Iso8601Datetime,
    cycle_freeze: z.array(TrusteeSignalRow).optional(),
    r9_voting: z.array(TrusteeSignalRow).optional(),
    concealment: z.array(TrusteeSignalRow).optional(),
    appeal: z.array(TrusteeSignalRow).optional(),
    reconciliation: z.array(TrusteeSignalRow).optional(),
    moderation: z.array(TrusteeSignalRow).optional(),
    violator_flags: ViolatorFlagsSection.optional(),
  })
  .strict();
export type TrusteeLiteResponse = z.output<typeof TrusteeLiteResponse>;

/** The permitted `ViolatorFlag` key set — exported so the frozen-key test cannot drift from the DTO. */
export const VIOLATOR_FLAG_PERMITTED_KEYS = [
  'clause_id',
  'clause_label',
  'facts_establishing',
  'holding_since',
] as const;

/** Keys that would turn an observation into a recommendation. Nothing on the flag may match this. */
export const VIOLATOR_FLAG_FORBIDDEN_KEY_PATTERN = /recommend|suggest|advis|severit|urgen|priorit|rank|score/i;
