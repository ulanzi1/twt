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

import { Iso8601Datetime } from '../_common/primitives.js';

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
 * `GET /api/v1/member/contribution-history` response — the member's passbook. `rows` newest-first
 * (legitimately `[]` for a member who has attested nothing — the dignified empty state); `totalInr` is
 * the running-tally footer sum over the returned rows (whole INR, ≥0). NOT a discriminated union on
 * `assigned` (unlike the card/contributor-list): a self-view has no "unassigned" concept — a member with
 * no contributions gets `{ rows: [], totalInr: 0 }`.
 */
export const ContributionHistoryResponse = z
  .object({
    rows: z.array(ContributionHistoryRow),
    totalInr: z.number().int().nonnegative(),
  })
  .strict();
export type ContributionHistoryResponse = z.output<typeof ContributionHistoryResponse>;
