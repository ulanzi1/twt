// packages/contracts/src/contributions/active-contribution-card.ts
//
// The My Pool home-screen card read DTO (Story 8.2, Task 1). The response shape for
// `GET /api/v1/member/active-contribution` — the read seam that drives the topmost home-screen
// `<ActiveContributionCard>` (the first `[SURFACE]` of Epic 8, the first live consumer of Story
// 8.1's `alerts.current_state='live'` projection). Presentation only: it reads existing
// event-derived state (member `active` × `live` alert × assigned pool × claim deceased-member
// name × snapshotted fixed_amount × days-remaining × confirmed progress × the staged fixed-amount
// transition of Story 8.15); it models NO contribution write/intent lifecycle (those land 9.x — see
// the directory README).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So this uses plain
// `string`/`number` and the `claims/` calendar-date check (Story 8.15). ALL objects `.strict()` (the
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

import { isRealCalendarDate } from '../claims/contact-ladder.js';
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

/** An IST calendar date, `YYYY-MM-DD` — real dates only (`2027-02-30` is rejected). The
 *  `claims/contact-ladder.ts` `IsoDate` shape; ⛔ never an instant (Story 8.15 Trap 6 — a device outside
 *  IST would print the day before). */
const CalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'a calendar date, YYYY-MM-DD')
  .refine(isRealCalendarDate, 'not a real calendar date');

/**
 * ⭐ STORY 8.15 — the staged fixed-amount transition (UX-DR25), RESOLVED SERVER-SIDE into one stage.
 * Replaces the Story 8.2 `upcomingAmountChange` instant the client used to format (the 8.16 precedent:
 * one resolved field replacing what the client assembled). `null` = no transition line.
 *
 *   · `scheduled`   — "from {date}, the contribution will be ₹{newAmount}" (≥ 2 IST months away, or
 *                     later this month; also every future-dated EMERGENCY change).
 *   · `next_month`  — "from next month …" (the change falls in the next IST calendar month; STANDARD
 *                     changes only — an emergency gives no notice, Decision `2026-10-22-383`).
 *   · `next_cycle`  — the amount in force now differs from this pool's snapshot: a change that took effect
 *                     after the pool was spawned, or a backdated emergency written after it (in force from
 *                     before C). Names the amount in force now — or, when the member is already in a
 *                     later live cycle (their next one), THAT pool's amount, and only if it differs.
 *   · `first_cycle` — this pool is the first at the new amount (the amount renders above the note).
 *
 * `effectiveOn` is an IST CALENDAR DATE, ⛔ never an instant. `newAmount` is whole INR. The card's
 * CURRENT amount always stays the snapshotted `fixedAmount` (8.2 D3) — this is context, never the ask.
 */
export const AmountTransition = z.discriminatedUnion('stage', [
  z
    .object({
      stage: z.literal('scheduled'),
      effectiveOn: CalendarDate,
      newAmount: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      stage: z.literal('next_month'),
      effectiveOn: CalendarDate,
      newAmount: z.number().int().positive(),
    })
    .strict(),
  z.object({ stage: z.literal('next_cycle'), newAmount: z.number().int().positive() }).strict(),
  z.object({ stage: z.literal('first_cycle') }).strict(),
]);
export type AmountTransition = z.output<typeof AmountTransition>;

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
 *   · `deceasedDisplayName`    — the DECEASED member whose family is supported (AC2 UX-spec
 *                                 resolution: the family-parichay subject, NOT the nominee), ALREADY
 *                                 RESOLVED into the Pariwar's chosen name form (Story 8.16).
 *   · `fixedAmount`             — the SNAPSHOTTED `pools.fixed_amount` (whole INR; D3 — never a live
 *                                 recompute).
 *   · `daysRemaining`           — the server-computed 15-day window count (D5 seam; int ≥0).
 *   · `progress`                — confirmed-only meter data (AC4).
 *   · `amountTransition`        — the staged fixed-amount transition line (Story 8.15), or `null`.
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
    /**
     * ⭐⭐ THE DRIVE'S PUBLIC ADDRESS TOKEN — Story 11b.10 (AC4, D4).
     *
     * ⭐ THE **ONE** NEW FIELD ON A QUERY THAT ALREADY RUNS, and that is the whole API change this
     * story makes to the member app. It exists so the My Pool tab can offer an entry into the
     * drive's PUBLIC Sahyog Vivran page: `2026-09-03-184` **(A)** ratified that a `live` drive
     * should be publicly REACHABLE, and **(B)** removed the only way there was to address one.
     *
     * ⛔⛔ **SERVER-RETURNED, ⛔ NEVER CLIENT-DERIVED.** `apps/mobile/lib/public-site.ts` already
     * states this discipline for `clauseId` in terms — *"SERVER-returned … never hardcoded in the
     * widget"* — and here it is load-bearing rather than tidy: the client building an address from
     * `poolId` or `poolCanonicalIdentifier` would re-create D2's guessability INSIDE the client,
     * where nothing on the server side could ever bound it.
     *
     * ⛔ IT IS ⛔ NOT A CREDENTIAL AND ⛔ NOT A SESSION TOKEN. It bounds DISCOVERY, ⛔ not
     * AUTHORISATION (D1): the page it addresses answers 200 to anyone holding a valid address, with
     * ⛔ no session and ⛔ no branch on the reader's membership standing. ⚠ Its price, carried
     * rather than hidden: a forwarded link is permanent public access to that drive until the token
     * is ROTATED.
     *
     * ⚠ REQUIRED, ⛔ not nullable — and that is a deliberate contract choice. `pools.public_token`
     * is `NOT NULL` with every pre-existing row backfilled (migration 0114), so a `live` pool
     * ALWAYS has one. ⇒ if the read cannot produce it, the handler fail-softs the WHOLE card to
     * `{ assigned: false }` exactly as it does for an unresolvable identity — which keeps the entry
     * and the card suppressing in LOCK-STEP instead of leaving a dead link behind a live card.
     */
    sahyogVivranToken: z.string().min(1),
    // ⭐ STORY 8.16 (AC2/AC3) — ONE RESOLVED DISPLAY FIELD, replacing the `deceasedFirstName` /
    // `deceasedLastInitial` PAIR this contract used to carry.
    //
    // The form is resolved SERVER-SIDE from the Pariwar's stored `public_name_presentation_mode`
    // (`2026-09-02-181`), so the card, the Yogdaan Bahi, the Contribution Note PDF and the push all
    // render the same string for the same pool — "one identity everywhere" (`2026-09-02-180` cl.1) as
    // a property of the contract rather than four call sites joining parts consistently by convention.
    //
    // ⛔ The client NEVER re-joins or re-forms this value, and the parts are NOT carried alongside it.
    // ⚠ In the DEFAULT `full_name` mode this is a full legal name — a real widening of what the member
    // app shows, and the decision of `2026-09-02-180`, not a side effect.
    //
    // `.max(128)` bounds a stored legal name defensively; the old `.max(16)` bounded ONE Devanagari
    // grapheme cluster and would now reject the very values this field exists to carry.
    deceasedDisplayName: z.string().min(1).max(128),
    fixedAmount: z.number().int().positive(),
    daysRemaining: z.number().int().nonnegative(),
    progress: ActiveContributionProgress,
    amountTransition: AmountTransition.nullable(),
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
