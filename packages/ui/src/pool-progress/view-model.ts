// The `<PoolProgressCard>` view-model — Story 9.12 (Task 1; the Story 9.6 `status-pill` sibling). The
// framework-agnostic render contract for the pool-progress surface every consumer shares: apps/mobile RN
// today (the `<ActiveContributionCard>` progress region), the Epic-11b public Sahyog Vivran / Sahyog Drive
// web render later. Produced by the strictly-pure presenter (presenter.ts): NO react/react-native, NO copy,
// NO palette, NO numeral formatting — only structured values + `@twt/tokens` role NAMES + i18n KEYS the
// render layer resolves. This is the ONE source of the confirmed-only meter math (percentage + complete) +
// the amount-raised derivation, so the mobile card and the public card cannot drift.
//
// ── Confirmed-only, by SHAPE (Decision 2, load-bearing — the Story 9.5 canonical-financial-truth invariant)
// The INPUT type carries NO way to express yellow/pending/attested/projected money — there is DELIBERATELY
// no `attestedCount` / `pendingCount` / `yellowCount` / `projectedTotal` / `status` / `utr` field anywhere.
// Yellow (Story 8.4) is intent, not confirmed money, and is STRUCTURALLY unable to reach this meter (the
// amount-analog of the 8.2 `ActiveContributionProgress` "NO attested/pending/yellow field — by design" rule
// + the 8.3 `pool-contributor-list` "confirmed-only as a SHAPE" discipline). Adding such a field is the one
// change this presenter exists to forbid — the anti-widening unit test rejects it (Task 3b).

/**
 * The pool identity block (Story 7.2 dual identifier). Field names are IDENTICAL to the contracts
 * `PoolContributorListPoolIdentity` (letterCode / name / canonicalIdentifier) so the two can never drift —
 * a local structural type (not the contracts DTO import) keeps `@twt/ui` self-contained (Task 1 note).
 *   · `letterCode`          — the member-facing shortform letter ("F" → "Pool F"); the launch fallback.
 *   · `name`                — the curated Mahabharata-rooted name when configured; `null` otherwise.
 *   · `canonicalIdentifier` — the audit/system identifier `P-YYYY-MM-###` (a11y / support reference).
 */
export interface PoolProgressCardPoolIdentity {
  letterCode: string;
  name: string | null;
  canonicalIdentifier: string;
}

/**
 * The presenter INPUT — confirmed-only by SHAPE (Decision 2). EXACTLY these five keys, and DELIBERATELY no
 * yellow/pending/attested/projected operand can enter:
 *   · `pool`          — the pool identity (letter code / curated name / canonical id).
 *   · `confirmedCount` — LIVE (non-reversed) reconciliation-confirmed contributions (Story 9.4 producer,
 *                        Story 9.5 reversal-aware). NON-NEGATIVE INTEGER; `> rosterSize` is an impossible
 *                        state the presenter THROWS on (AC2) — you cannot confirm more than the roster holds.
 *   · `rosterSize`     — the pool's latest-snapshot member count (the meter denominator N). NON-NEGATIVE
 *                        INTEGER. NOT a pending count.
 *   · `fixedAmount`    — the snapshotted `pools.fixed_amount` (whole INR). NON-NEGATIVE INTEGER.
 *   · `daysRemaining`  — the server-computed 15-day window count. NON-NEGATIVE INTEGER.
 * There is NO `attestedCount` / `pendingCount` / `yellowCount` / `projectedTotal` / `status` / `utr` field.
 */
export interface PoolProgressCardInput {
  pool: PoolProgressCardPoolIdentity;
  confirmedCount: number;
  rosterSize: number;
  fixedAmount: number;
  daysRemaining: number;
}

/**
 * The complete render contract (AC4). Structured values + i18n KEYS + a `@twt/tokens` role NAME — no copy,
 * no palette, no formatting (the render layer applies `formatInr` for the amount and Latin numerals for the
 * counts/days/percentage at the display boundary — Story 1.17 / AC5). The card explicitly does NOT expose a
 * yellow-pill count, an unconfirmed/pending count, or a projected/attestation-based total (Decision 2).
 *
 *   · `pool`               — echoed pool identity.
 *   · `confirmedCount` / `rosterSize` — echoed raw meter operands (Latin integers at render).
 *   · `amountRaisedInr`    — the DERIVED `confirmedCount × fixedAmount` (whole INR; Decision 3 — the single
 *                            canonical definition, structurally yellow-proof; `formatInr` at render).
 *   · `fixedAmount`        — echoed per-contribution fixed amount (whole INR).
 *   · `daysRemaining`      — echoed window count.
 *   · `confirmedPercentage`— DERIVED `rosterSize > 0 ? min(100, round(confirmedCount / rosterSize × 100)) : 0`
 *                            (Latin integer 0–100; the `min(100, …)` is rounding-safety only — an over-count
 *                            THROWS upstream and never reaches here).
 *   · `isComplete`         — DERIVED `rosterSize > 0 && confirmedCount >= rosterSize`.
 *   · `meterFillTokenRole` — the `@twt/tokens` `color` role NAME for the meter fill (`'status-confirmed'`,
 *                            the confirmed/green family) — never a hex, NEVER a red/danger tone for a low
 *                            meter (a low-or-zero confirmed meter is honest, not an error; AC5 / Story 2.2).
 *   · `progressLabelKey` / `progressA11yKey` / `amountRaisedLabelKey` / `daysLabelKey` — i18n KEYS
 *                            (`contribution` namespace) the render layer resolves with numeric params it
 *                            builds from the raw fields above.
 */
export interface PoolProgressCardViewModel {
  pool: PoolProgressCardPoolIdentity;
  confirmedCount: number;
  rosterSize: number;
  amountRaisedInr: number;
  fixedAmount: number;
  daysRemaining: number;
  confirmedPercentage: number;
  isComplete: boolean;
  /** The `@twt/tokens` `color` role name the render layer resolves for the meter fill (`'status-confirmed'`). */
  meterFillTokenRole: string;
  /** i18n KEY for the visible meter label (`{confirmed} of {total}` — resolved by the render layer). */
  progressLabelKey: string;
  /** i18n KEY for the meter ARIA label (full-prose, distinct from the terse visible label). */
  progressA11yKey: string;
  /** i18n KEY for the amount-raised label (the amount itself is `formatInr(amountRaisedInr)` at render). */
  amountRaisedLabelKey: string;
  /** i18n KEY for the days-remaining label (`{days}` — resolved by the render layer). */
  daysLabelKey: string;
}
