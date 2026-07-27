// packages/contracts/src/contributions/active-contribution-card.ts
//
// The My Pool home-screen card read DTO (Story 8.2, Task 1). The response shape for
// `GET /api/v1/member/active-contribution` — the read seam that drives the topmost home-screen
// `<ActiveContributionCard>` (the first `[SURFACE]` of Epic 8, the first live consumer of Story
// 8.1's `alerts.current_state='live'` projection). Presentation only: it reads existing
// event-derived state (member `active` × `live` alert × assigned pool × claim deceased-member
// name × snapshotted fixed_amount × days-remaining × confirmed progress); it models NO
// contribution write/intent lifecycle (those land 9.x — see the directory README).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So this uses the
// `_common` `Iso8601Datetime` primitive + plain `string`/`number`. ALL objects `.strict()` (the
// contributions/ directory README discipline). Consumed via `import type … from '@twt/contracts'`
// in the SDK + the apps/api handler — NO type-shadowing (README anti-pattern #2).
//
// ── Server-authoritative + self-suppressing (AC1/D2) ────────────────────────────────────────────────
// The card is a DISCRIMINATED UNION on `assigned`. `{ assigned: false }` is the first-class ABSENCE
// signal (not `active`, no assigned pool, no `live` alert, or a fail-soft degrade) — the client
// renders `null`. Everything the assigned card shows is resolved SERVER-SIDE and handed over as flat
// data; the client resolves nothing about eligibility/policy (the `member-home` lock-in precedent).
//
// ── PII-shielded (AC2 / Story 1.16b) ────────────────────────────────────────────────────────────────
// Only the DECEASED member's `firstName + lastInitial` crosses the wire (the family being supported —
// NOT the nominee, NOT the beneficiary). NO Tier-1 ciphertext, NO full names, NO nominee/bank data.
//
// ── Confirmed-only progress (AC4, load-bearing) ─────────────────────────────────────────────────────
// `progress` carries `confirmedCount` (reconciliation-confirmed contributions — Story 9.4 shipped the
// `contribution.confirmed` producer; Story 9.5 wired this card's count to the live read) and
// `rosterSize` (the pool roster N). There
// is DELIBERATELY NO attested/pending/yellow count field: yellow (Story 8.4) is intent, not confirmed
// money, and must be STRUCTURALLY unable to reach the meter (epics.md:2912,2939-2941). Adding such a
// field here is the one change this contract exists to forbid.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';
import { ContributionMismatchReasonCode } from './self-verify.js';
import { MyContributionStatus } from './upi-intent.js';

/**
 * The confirmed-only progress meter data (AC4). `confirmedCount` is the count of LIVE (non-reversed)
 * reconciliation-confirmed contributions for the pool (Story 9.4 producer, Story 9.5 reversal-aware);
 * `rosterSize` is the pool's latest-snapshot member count (the denominator N). Both non-negative
 * integers. NO yellow/attested/pending field exists — by design (the load-bearing invariant).
 */
export const ActiveContributionProgress = z
  .object({
    confirmedCount: z.number().int().nonnegative(),
    rosterSize: z.number().int().nonnegative(),
  })
  .strict();
export type ActiveContributionProgress = z.output<typeof ActiveContributionProgress>;

/**
 * The Story 7.5 fixed-amount UPCOMING transition (AC6) — a future scheduled change surfaced gently
 * in-card ("from [date], contribution becomes ₹X"). `newAmount` is a whole-INR positive integer;
 * `effectiveFrom` is the change's start instant. `null` on the response when no future change exists.
 * The card's CURRENT amount always stays the snapshotted `fixedAmount` (D3) — this is additive context.
 */
export const UpcomingAmountChange = z
  .object({
    effectiveFrom: Iso8601Datetime,
    newAmount: z.number().int().positive(),
  })
  .strict();
export type UpcomingAmountChange = z.output<typeof UpcomingAmountChange>;

/**
 * The fully-resolved assigned-card model (AC1/AC2/AC4/AC6). Present ONLY when the authenticated
 * member is `active` AND assigned to a pool whose cycle's alert is `live`.
 *
 *   · `poolLetterCode`          — the member-facing shortform letter (e.g. "F" → "Pool F"); the
 *                                 committed launch fallback when the `pool_names` registry is empty.
 *   · `poolName`                — the curated Mahabharata-rooted name when the Pariwar has configured
 *                                 its registry; `null` otherwise (TWT-Bihar launch → letter code).
 *   · `poolCanonicalIdentifier` — the audit/system identifier `P-YYYY-MM-###` (surfaced for a11y /
 *                                 support reference; the shortform is what the card headlines).
 *   · `deceasedFirstName` / `deceasedLastInitial` — the DECEASED member whose family is supported
 *                                 (AC2 UX-spec resolution: the family-parichay subject, NOT the nominee).
 *   · `fixedAmount`             — the SNAPSHOTTED `pools.fixed_amount` (whole INR; D3 — never a live
 *                                 recompute).
 *   · `daysRemaining`           — the server-computed 15-day window count (D5 seam; int ≥0).
 *   · `progress`                — confirmed-only meter data (AC4).
 *   · `upcomingAmountChange`    — the AC6 future-transition line, or `null`.
 */
export const AssignedContributionCard = z
  .object({
    assigned: z.literal(true),
    // (Story 9.7) The member's own live pool id — the key the `<SelfVerifySurface>` recovery entry carries
    // to `GET/POST /member/self-verify/:poolId`. Not PII (the same pool id already rides the
    // `contributions/:pool_id` push deep-link grammar); the member's own pool, member-scoped.
    poolId: z.string().uuid(),
    poolLetterCode: z.string().min(1),
    poolName: z.string().min(1).nullable(),
    poolCanonicalIdentifier: z.string().min(1),
    deceasedFirstName: z.string().min(1),
    // The last-name INITIAL only (PII shield — never the full surname). `.max(16)` defensively bounds a
    // single grapheme cluster (base + combining marks) — a Devanagari conjunct (e.g. क्ष, ज्ञ, त्र) plus
    // vowel signs can exceed a few UTF-16 code units, so the bound must not be tighter than the widest
    // real single-grapheme output of `firstGrapheme()` (name.ts); empty when the name is a single token
    // (no surname to initialize) so the card shows just the first name — never a full-name leak.
    deceasedLastInitial: z.string().max(16),
    fixedAmount: z.number().int().positive(),
    daysRemaining: z.number().int().nonnegative(),
    progress: ActiveContributionProgress,
    upcomingAmountChange: UpcomingAmountChange.nullable(),
    // (Story 8.4, AC4 / Story 9.7 AC1) The MEMBER'S OWN contribution state — `none` (contribute CTA) →
    // `attested` (yellow pill: told-us-they-paid, still verifying) → `mismatch` (RED: the 9.4 matcher
    // rejected a found deposit; the card flips to <StatusPill status="red"> and links the <SelfVerifySurface>
    // recovery entry). A PER-MEMBER self-state, NOT an aggregate: it is DELIBERATELY separate from `progress`
    // (which stays confirmed-only — `{ confirmedCount, rosterSize }`). Never add a yellow/red/attested count
    // to `progress`; that is the one change this contract exists to forbid.
    myContribution: MyContributionStatus,
    // (Story 9.7 AC1) The machine reason-code when `myContribution === 'mismatch'` — the surface maps it to
    // dignified empathy copy for the Journey-1 entry; `null` in every non-mismatch state. Carrying ONLY the
    // tone + reason here (not the whole surface state) keeps the card the single entry without a second
    // round-trip (Decision D5); the `<SelfVerifySurface>` reads its full default/uploaded/resolved state from
    // its own `GET /api/v1/member/self-verify/:poolId`.
    mismatchReason: ContributionMismatchReasonCode.nullable(),
  })
  .strict();
export type AssignedContributionCard = z.output<typeof AssignedContributionCard>;

/**
 * The first-class ABSENCE signal (AC1): not `active`, no assigned pool, no `live` alert, or a
 * fail-soft degrade (loading/error/malformed input). The client renders `null` — the card
 * self-suppresses, leaving the home content below untouched.
 */
export const UnassignedContributionCard = z.object({ assigned: z.literal(false) }).strict();
export type UnassignedContributionCard = z.output<typeof UnassignedContributionCard>;

/**
 * `GET /api/v1/member/active-contribution` response — the discriminated union on `assigned`.
 * The client guards with `if (!data.assigned) return null` (the `member-home` `{ assigned:false }`
 * / `lockIn:null` self-suppression posture).
 */
export const ActiveContributionCardResponse = z.discriminatedUnion('assigned', [
  AssignedContributionCard,
  UnassignedContributionCard,
]);
export type ActiveContributionCardResponse = z.output<typeof ActiveContributionCardResponse>;
