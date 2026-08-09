// packages/contracts/src/contributions/contribution-history.ts
//
// The Yogdaan Bahi (contribution passbook) read DTO (Story 8.6, Task 3). The response shape for
// `GET /api/v1/member/contribution-history` — the read seam that drives the `<ContributionTimeline>`
// member-facing contribution passbook (UX-DR27). A member's OWN self-view (FR-12A self-visibility):
// it lists the member's own attested contributions, each with an honestly-derived five-state status.
// Presentation only — it reads event-derived state (the member's `contribution.utr-attested` claims +
// Epic 9's reconciliation verdicts, unbuilt → green/red honestly empty today); it mutates nothing.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — pg would leak into the
// RN Metro bundle, [[project_contracts_domain_bundle_boundary]]). Plain `z` + the `_common` primitives
// only. ALL objects `.strict()` (the contributions/ directory README discipline). Consumed via
// `import type … from '@twt/contracts'` in the SDK + the apps/api handler — NO type-shadowing.
//
// ── A SELF-view, member-scoped — the yellow-never-confirmed invariant does NOT bind it (D1) ─────────────
// Unlike 8.3's confirmed-only contributor list (a PUBLIC/aggregate surface where yellow must never render
// as confirmed), this is the member's PRIVATE view of the member's OWN claims — so a `status` enum with a
// yellow member IS correct here. `green` still derives EXCLUSIVELY from a `contribution.confirmed` verdict
// (the structural guard lives in the domain derivation); the contract simply carries the derived tone.
//
// ── PII discipline (AC6 / Story 1.16b), load-bearing ────────────────────────────────────────────────────
// ONLY the member's own data + the DECEASED family's first-name + last-initial cross the wire. There is
// DELIBERATELY NO other-member field, NO UTR, NO `tr`, NO nominee/bank data, NO full names, NO Tier-1
// ciphertext anywhere in this shape. Adding any of them is the one change this contract exists to forbid —
// the `.strict()` shape + the structural no-extra-PII test (contracts/tests) reject them ([[feedback_gate_scope_semantic_coverage]]).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/**
 * The FIVE passbook status tones (AC2; Story 9.5 AC4 added `held`), value-aligned with @twt/domain's
 * `ContributionStatus` union + `CONTRIBUTION_STATUSES` (`deriveContributionStatus`). Re-declared here
 * (contracts cannot import @twt/domain — the browser-bundle rule, [[project_contracts_domain_bundle_boundary]]);
 * the domain is the derivation authority and the two MUST stay in lockstep (the contracts lockstep-guard
 * test asserts the value sets match). The five members:
 *   · `yellow` — attested; told-us-they-paid, still verifying (the only tone that occurs today).
 *   · `green`  — reconciliation-confirmed (`पुष्ट`). Story 9.4 producer.
 *   · `red`    — reconciliation mismatch. Story 9.4 producer.
 *   · `grey`   — on record, cycle closed with no verdict (a NEUTRAL "unreconciled", never a shame state).
 *   · `held`   — a prior confirmation was trustee-walked-back (`reconciliation.confirmation-reversed`,
 *                Story 9.4 D1 / Story 9.8 producer — legitimately empty until 9.8 emits). Dignified/neutral
 *                ("held under review"), NEVER "reversed"/"failed"; a fresh confirmation re-greens it. The
 *                polished 5-state `<StatusPill>` DS component is Story 9.6; this contract only carries the tone.
 */
export const ContributionStatus = z.enum(['yellow', 'green', 'red', 'grey', 'held']);
export type ContributionStatus = z.output<typeof ContributionStatus>;

/**
 * One passbook row (AC1/AC2/AC3) — the member's OWN attested contribution, fully resolved server-side.
 *
 *   · `contributionId`         — the stable row identity (the `contribution.utr-attested` event id).
 *   · `date`                   — the contribution instant (the attestation's `occurred_at`; Gregorian).
 *   · `deceasedFirstName` / `deceasedLastInitial` — the DECEASED member whose family the pool supports
 *                                 (PII-shielded, the SAME subject the My Pool card shows — D6). NOT the nominee.
 *   · `poolLetterCode`         — the member-facing shortform letter ("F" → "Pool F"); the launch fallback.
 *   · `poolName`               — the curated Mahabharata-rooted name when configured; `null` otherwise.
 *   · `poolCanonicalIdentifier`— the audit/system identifier `P-YYYY-MM-###` (a11y / support reference).
 *   · `cycleRef`               — the member-facing cycle reference (the cycle's freeze month, Gregorian).
 *                                 Letter codes repeat across cycles, so this disambiguates which cycle a row is.
 *   · `amountInr`              — the SNAPSHOTTED pool `fixedAmount` (whole INR positive integer).
 *   · `status`                 — the honestly-derived five-state tone (AC2).
 *   · `noteAvailable`          — whether a Contribution Note PDF is generatable for this row yet (AC3/D4).
 *                                 The PDF generator is Story 8.7 (unbuilt) → `false` for every row today; the
 *                                 mobile link affordance still renders on every row (navigating to the reserved
 *                                 Note route/placeholder). 8.7 flips this — no shape change here.
 */
export const ContributionHistoryRow = z
  .object({
    contributionId: z.string().min(1),
    date: Iso8601Datetime,
    deceasedFirstName: z.string().min(1),
    // The last-name INITIAL only (PII shield — never the full surname). `.max(16)` defensively bounds a
    // single grapheme cluster (a Devanagari conjunct + vowel signs can exceed a few UTF-16 code units);
    // empty when the name is a single token. Mirrors the 8.2 `deceasedLastInitial` bound (same producer).
    deceasedLastInitial: z.string().max(16),
    poolLetterCode: z.string().min(1),
    poolName: z.string().min(1).nullable(),
    poolCanonicalIdentifier: z.string().min(1),
    cycleRef: z.string().min(1),
    amountInr: z.number().int().positive(),
    status: ContributionStatus,
    noteAvailable: z.boolean(),
  })
  .strict();
export type ContributionHistoryRow = z.output<typeof ContributionHistoryRow>;

/**
 * The EPISTEMIC state id for a cycle the member was assigned to, that closed, and for which the record
 * holds no matched contribution — Story 10.27 (AC2; D1).
 *
 * ⚠ DELIBERATELY NOT a sixth {@link ContributionStatus} member, and deliberately NOT `grey`.
 * `grey` is already shipped as "on record, cycle closed with no verdict" and applies to a cycle the
 * member DID attest. Reusing it here would collapse *"you told us you paid and we haven't matched it"*
 * into *"we have no record of a contribution from you"* — two materially different statements to a
 * member. The five tones describe an ATTESTED contribution; a missed cycle has no attestation, so it
 * has no tone. The state is carried STRUCTURALLY, by membership in {@link ContributionHistoryResponse}'s
 * separate `missedCycles` array, rather than as a constant repeated on every entry.
 *
 * ⚖ The id names what the RECORD contains, never what the member did — the register
 * `docs/policies/out-of-band-contributions.md` §2 demands of every surface it binds ("statements about
 * what the machine can do, never about the worth of what the member did"). It is also the i18n key
 * stem for the section's copy. `contributions.test.ts` pins it disjoint from `ContributionStatus`.
 */
export const MISSED_CYCLE_STATE = 'no_matched_contribution_recorded' as const;
export type MissedCycleState = typeof MISSED_CYCLE_STATE;

/**
 * ONE cycle in the {@link MISSED_CYCLE_STATE} — Story 10.27 (AC1/AC4/AC6).
 *
 * ── ⛔ THE TWO `cycleRef`s (D4) ────────────────────────────────────────────────────────────────────
 * This shape carries BOTH, under DISTINCT names, because the codebase already has two different things
 * called `cycleRef` and they are not interchangeable:
 *   · `cycleRef` here (and on {@link ContributionHistoryRow}) is a DISPLAY STRING — the cycle's freeze
 *     month, Gregorian. What the member reads.
 *   · `cycleId` is the cycle's UUID — MACHINE provenance. It is what
 *     `PersonalEventAssertionRequest.cycleRef` (typed `UuidString`) requires.
 * Passing the display string into the assertion request is a Zod rejection at best and corrupted
 * provenance at worst, so the UUID is named `cycleId` — never a third field called `cycleRef`.
 *
 * ── What is deliberately ABSENT ───────────────────────────────────────────────────────────────────
 * No amount, no `contributionId`, no attestation date (there is none — that is the whole point), and
 * NO deceased-family identity. The passbook names the family because the row records what the member
 * DID for them; naming a bereaved family beside "no matched contribution recorded" pairs a person with
 * an absence, which is precisely the reading D1 exists to prevent. The member identifies the cycle by
 * its freeze month and pool reference, which is all the R7(G) assertion and a Madad call need.
 *
 * ⚠ NO CAUSE LABEL, ever. The causes are structurally unrecorded and one of them is FENCED against
 * ever being recorded (out-of-band stance 4 + `no-ingest-path.test.ts`). This shape reports the limit
 * of the record; it does not guess at why.
 */
export const MissedCycleEntry = z
  .object({
    /** The cycle's UUID — machine provenance for an R7(G) assertion (D4). NEVER display copy. */
    cycleId: UuidString,
    /** The member-facing cycle reference — the cycle's freeze month, Gregorian (D4). Display only. */
    cycleRef: z.string().min(1),
    /** The member-facing pool shortform ("F" → "Pool F") — the passbook's own presentation. */
    poolLetterCode: z.string().min(1),
    /** The audit/system identifier `P-YYYY-MM-###` — the a11y / Madad support reference. */
    poolCanonicalIdentifier: z.string().min(1),
  })
  .strict();
export type MissedCycleEntry = z.output<typeof MissedCycleEntry>;

/**
 * `GET /api/v1/member/contribution-history` response — the member's passbook. `rows` newest-first
 * (legitimately `[]` for a member who has attested nothing — the dignified empty state); `totalInr` is
 * the running-tally footer sum over the returned rows (whole INR, ≥0). NOT a discriminated union on
 * `assigned` (unlike the card/contributor-list): a self-view has no "unassigned" concept — a member with
 * no contributions gets `{ rows: [], totalInr: 0, missedCycles: [] }`.
 *
 * ── ⚖ `missedCycles` EXTENDS THE RESPONSE, NEVER THE ROW (Story 10.27 D3) ────────────────────────
 * The missed cycles ride this response in their OWN array, rendered as a visually distinct section.
 * {@link ContributionHistoryRow} is NOT widened, for two reasons. (1) A missed cycle has no
 * `contributionId`, no attestation `date` and no amount — making those nullable would weaken the shape
 * for every existing consumer and invite a null-check regression on the shipped rows. (2) The Yogdaan
 * Bahi's identity as *the record of what you contributed* is load-bearing for out-of-band stance 4
 * ("The Yogdaan Bahi reflects matched, attested contributions"); a member's own missed cycles belong
 * BESIDE that record, not inside it.
 *
 * ⚖ Newest-first, and legitimately `[]` — which the renderer must treat as ABSENT, not empty. A member
 * who has missed nothing must not be shown a missed-cycle affordance at all: an empty state saying
 * "no missed cycles" introduces the frame this surface exists to avoid, and a running count is a
 * scoreboard. `[]` is ALSO what a member with no projection coverage gets (D5) — the record supports no
 * statement in either direction, so the surface makes none.
 */
export const ContributionHistoryResponse = z
  .object({
    rows: z.array(ContributionHistoryRow),
    totalInr: z.number().int().nonnegative(),
    missedCycles: z.array(MissedCycleEntry),
  })
  .strict();
export type ContributionHistoryResponse = z.output<typeof ContributionHistoryResponse>;
