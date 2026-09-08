// Per-Pariwar DRIVE TARGET — the pure constants + validation (Story 11b.13, Task 2; AC1, AC4).
//
// Governance of record: `2026-09-04-190` **cl.7** (Trustee-ratified — Dhiraj Rahul + Kalpana
// Bharti) · `2026-09-04-191` **cl.4** (it is a RUPEE figure) · `2026-09-04-189` **cl.3**
// (*member ≥ public*) · `2026-09-06-203` (the two keys, the two records).
//
// Split from `drive-target-policy.ts` for the usual reason: the bounds and the predicate must stay
// importable by any surface that validates a target without dragging a database into its graph.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ WHAT THE TARGET IS — AND, MORE IMPORTANTLY, WHAT IT IS ⛔ NOT
// ══════════════════════════════════════════════════════════════════════════════════════════════
// It is a **PRESENTATION DENOMINATOR**: the figure Story 11b.14's progress meter divides
// `amountRaisedInr` by. ⛔ It is ⛔ NOT an obligation, ⛔ not an eligibility input, and ⛔ not a
// benefit gate (AI-10-1, Story 11b.13 AC7).
// ⇒ **A member's obligation is `pools.fixed_amount`, ⛔ never this figure**, and ⛔ nothing may make
// the two interact. A target that silently became an obligation is exactly the shape AI-10-1 exists
// to catch, which is why this module lives beside `fixed-amount.ts` and shares ⛔ nothing with it
// but a validation SHAPE.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ IT IS MONEY. THE PRECEDENT IS `pool_fixed_amount_schedule`, ⛔ NOT `pools.fixed_amount`
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ `pools.fixed_amount` (`schema/pools.ts:193`) is a **bare `integer().notNull()`** — ⛔ no CHECK,
// ⛔ no positivity, ⛔ no ceiling. A dev told to *"mirror `pools.fixed_amount`"* would write **zero**
// constraints. ⇒ the precedent that actually carries the discipline is
// `pool_fixed_amount_schedule` + `fixed-amount.ts`:
//   · `pool_fixed_amount_schedule_amount_positive` — `fixed_amount > 0`
//   · `pool_fixed_amount_schedule_amount_max`      — `<= 10000000`, kept IN SYNC with a NAMED
//                                                    constant (`MAX_POOL_FIXED_AMOUNT_INR`)
//   · `fixed-amount.ts:405`                        — the app-side assert on every write path
//
// ⛔⛔ AND `0` IS ⛔ NOT A LEGAL TARGET — *"non-negative"* WOULD HAVE ADMITTED IT.
// Story 11b.14's meter is `amountRaisedInr / target`. A **₹0** target is a **DIVISION BY ZERO**, and
// D's ruled *"⛔ no target ⇒ ⛔ no bar"* covers **UNSET**, ⛔ not **zero-and-set** — two different
// states that a `>= 0` bound would have collapsed. ⇒ **STRICTLY POSITIVE**, at the contract
// boundary ⛔ and at the DB. ⛔ Never `>= 0`.

/**
 * Guard-rail ceiling on a drive target (10 crore INR).
 *
 * ⚠ A **DATA-SANITY** bound, ⛔ NOT a policy ceiling — no ruling caps what a Pariwar may aim to
 * raise. It exists so a fat-fingered extra zero cannot become a target that makes every drive in a
 * Pariwar look permanently stalled.
 *
 * ⭐ **KEEP IN SYNC** with `pariwar_drive_target_schedule_target_max` in the table declaration and
 * in migration `0115`, and with the `@twt/contracts` wire bound — the
 * `MAX_POOL_FIXED_AMOUNT_INR` ↔ `pool_fixed_amount_schedule_amount_max` discipline, which the
 * schedule table's own comment names as an obligation rather than a nicety.
 *
 * ⚠ Deliberately an order of magnitude ABOVE `MAX_POOL_FIXED_AMOUNT_INR` (1 crore): that bounds
 * what ONE member contributes, this bounds what a WHOLE DRIVE aims to raise. ⛔ Do not "align" them
 * — they bound different quantities and the coincidence would be meaningless.
 */
export const MAX_DRIVE_TARGET_INR = 100_000_000;

/**
 * Guard-rail ceiling on a **DERIVED** drive target (1,000 crore INR) — Story 11b.14, third code
 * review (BigDev, 2026-09-08).
 *
 * ⚠⛔⛔ **IT IS ⛔ NOT {@link MAX_DRIVE_TARGET_INR}, AND THE TWO MUST ⛔ NOT BE "ALIGNED".** That one
 * bounds a figure a **human TYPED** into the admin setter, where an extra zero is the failure mode.
 * This one bounds `assignedCount × pools.fixed_amount` — a **product of two independently
 * legitimate values**, neither of which anyone typed as a target. The per-member cap is
 * `MAX_POOL_FIXED_AMOUNT_INR` (₹1 crore) and assignee counts are **unbounded**, so ordinary
 * configurations cross ₹10 crore easily: 6,485 assignees × ₹20,000 is ₹12.97 crore, and
 * 100,001 × ₹1,000 is ₹10.0001 crore — ⭐ just over, which is the point.
 * ⚠ (Corrected 2026-09-08, FOURTH review pass: this read *"₹10 crore **exactly**"*, which is the
 * product of 100,**000** × ₹1,000. The figure asserted in the test — `100_001_000` — was right.)
 *
 * ⛔⛔ **THE BUG THIS EXISTS TO UNDO:** `resolveDriveTargetForPublic` briefly clamped the derived
 * figure at `MAX_DRIVE_TARGET_INR`, so a legitimately large Pariwar's लक्ष्य rendered **NOTHING**
 * after a `super_admin` switched `reveal_to_public` ON — and the render was **byte-identical to the
 * fail-closed default**, with ⛔ no log and ⛔ no way to tell *"not revealed"* from *"revealed but
 * over ceiling"* (Review finding, 2026-09-08).
 *
 * ⭐ **IT IS STILL A DATA-SANITY BOUND, ⛔ not a policy ceiling** — ⛔ no ruling caps what a Pariwar
 * may expect to raise. Past this the product is an anomaly (an implausible roster × amount), and the
 * ruled silence applies.
 *
 * ⭐⭐ **AND IT IS THE ANCHOR FOR `formatCurrencyShort`'s OVERFLOW ARGUMENT.** That primitive's
 * `amount * 100` must stay inside `Number.MAX_SAFE_INTEGER` (≈9.007e15) ⇒ the amount must stay under
 * ≈9.007e13. ₹1,000 crore is `1e10` — **four orders of magnitude** inside it. ⚠ ⛔ Do ⛔ not raise
 * this without re-checking that bound, which `packages/i18n/src/currency.ts` names by this
 * constant's own name.
 *
 * ⛔ **THERE IS ⛔ NO DB CHECK BEHIND THIS**, and there cannot be: the product is computed at read
 * time from two tables. It is an app-layer sanity bound only — recorded, ⛔ not implied.
 */
export const MAX_DERIVED_DRIVE_TARGET_INR = 10_000_000_000;

/**
 * Is `value` a legal drive target? Whole INR, **strictly positive**, within the ceiling.
 *
 * ⭐ Total over `unknown` so a caller cannot skip the integer check by pre-narrowing to `number`.
 * ⛔ `0` is **false** — see the header: it is a division by zero for the meter, ⛔ not a boundary
 * pass, and ⛔ not a synonym for "unset" (an unset target is the ABSENCE of a schedule row).
 */
export function isValidDriveTargetInr(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_DRIVE_TARGET_INR
  );
}

/**
 * The two INDEPENDENT reveal switches — `2026-09-04-190` **cl.7(c)**.
 *
 * ⭐ Any of the four combinations is *expressible*; exactly one is **REFUSED** — see
 * {@link isRevealCombinationAllowed}. ⛔ They are ⛔ not a single tri-state, and ⛔ not ordered
 * levels: a Pariwar may reveal to members without revealing publicly, which is the ordinary case.
 */
export interface DriveTargetVisibility {
  /** Members of this Pariwar may see the target. */
  readonly revealToMembers: boolean;
  /** The unauthenticated public may see the target. */
  readonly revealToPublic: boolean;
}

/**
 * `member ≥ public` — `2026-09-04-189` **cl.3**, as a total predicate.
 *
 * ⛔⛔ **PUBLIC-REVEALED-WHILE-MEMBER-HIDDEN IS REFUSED.** It would show the unauthenticated public
 * MORE than a member of the Pariwar the figure belongs to, which `-189` cl.3 forbids for this data
 * class (`-195` cl.1). ⚠ **ENFORCED, ⛔ not documented** — this predicate backs the write path, and
 * `pariwar_drive_target_visibility_member_ge_public` backs the DB. ⭐ Two layers is the family-5
 * posture: an app rule on a disclosure boundary owes a constraint that mirrors it.
 *
 * ⚠ The ordering is **ONE-WAY**. Revealing publicly while members are hidden is refused; revealing
 * to members while the public is not is the ordinary case and is ⛔ never refused.
 */
export function isRevealCombinationAllowed(v: DriveTargetVisibility): boolean {
  return !(v.revealToPublic && !v.revealToMembers);
}

/**
 * The RULED default for a Pariwar that has never been configured — `2026-09-04-190` **cl.7(b)**.
 *
 * ⭐⭐ **HIDDEN FROM EVERYONE, AND THIS IS A FAIL-CLOSED DEFAULT** — ⚠ deliberately the OPPOSITE of
 * the nominee-bank masking schedule's `D8-default`, which the Panel ruled **FAIL-OPEN**
 * (`2026-09-02-179` cl.1). ⛔ Do not "align" the two: there the absent row governed data already
 * lawfully published and cl.10(b) forbade the code assuming masking; here cl.7(b) makes invisibility
 * the ruled state and a reveal an affirmative act of the Trust.
 * ⇒ an absent visibility row means **hidden**, and ⛔ a scope failure that yields zero rows lands on
 * the same answer rather than on disclosure.
 *
 * ⭐⭐ **FROZEN, AND THE FREEZE IS LOAD-BEARING** (code review Pass 2). `resolveDriveTargetVisibility`
 * returns **this exact object** on the zero-row path rather than a copy, and `readonly` on the
 * interface is a COMPILE-TIME fiction — it stops `vis.revealToPublic = true` in typed code and stops
 * ⛔ nothing at runtime. Unfrozen, a single mutating caller anywhere in the process flips the default
 * for **every** Pariwar that has no visibility row, process-wide, until restart — turning the
 * fail-closed property this module states ~15 times into **fail-OPEN**, silently, with ⛔ no row
 * anywhere to explain it. `Object.freeze` makes that mutation throw in strict mode instead.
 */
export const DEFAULT_DRIVE_TARGET_VISIBILITY: DriveTargetVisibility = Object.freeze({
  revealToMembers: false,
  revealToPublic: false,
});

/**
 * How far apart two API instances' clocks may be before a backwards `effective_from` stops being
 * **skew** and starts being a **caller error** — code review Pass 2, decision D-B (BigDev, option 2).
 *
 * ⭐ `setDriveTargetSchedule` CLAMPS a new window's start up to the open head's when the incoming
 * instant precedes it, so two instances a second apart in NTP drift cannot produce an inverted
 * window. ⚠⛔ **But the clamp also CLOSES the head at that same instant** — so a backwards write
 * collapses the prior head's **ENTIRE** effective window to zero width, ⛔ not merely the overlap.
 * Past this bound that is ⛔ no longer a reconciliation: it silently rewrites the as-of history of a
 * record whose whole justification is that every prior target survives.
 *
 * ⇒ within the bound, clamp (as before); beyond it, **REFUSE** with
 * {@link DriveTargetEffectiveFromSkewError}. Five minutes is orders of magnitude above real drift
 * between API instances and far below the multi-day writes the domain API otherwise accepts.
 *
 * ⚠⛔ **THIS BOUNDS THE BACKWARDS DIRECTION ONLY.** A **future** `effective_from` on a Pariwar's
 * FIRST write (no head ⇒ no clamp) is ⛔ NOT checkable here: the domain layer has ⛔ no reference
 * clock — `effectiveFrom` **is** the clock it is handed. Closing that needs an injected `now` or a
 * `new Date()` inside the accessor; ⛔ neither is introduced here, and the gap is recorded openly in
 * the story's Pass-2 findings rather than papered over.
 */
export const MAX_DRIVE_TARGET_CLOCK_SKEW_MS = 5 * 60 * 1000;
