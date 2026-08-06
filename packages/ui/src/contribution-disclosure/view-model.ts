// The contribution-during-suspension disclosure view-model — Story 10.16 (Task 1; the Story 9.6
// `status-pill` / Story 9.12 `pool-progress` sibling shape).
//
// The framework-agnostic render contract for the disclosure the payment surface owes a member who is
// being asked to contribute WITHOUT coverage. Produced by the strictly-pure presenter (presenter.ts):
// NO react/react-native, NO resolved copy, NO I/O, NO clock — only i18n KEYS the render layer resolves
// and structured state it renders.
//
// ── What this exists to prevent ─────────────────────────────────────────────────────────────────────
// A member under a suspension that still permits contribution is asked for money while their
// contribution buys them NO beneficiary entitlement for a death during the suspension. Story 10.17
// unblocks that ask (it puts suspended members back on the donor roster); this view-model is the
// disclosure that makes the ask honest. Every field below is load-bearing to that honesty — the
// disclosure must say what the payment DOES (restores standing), what it does NOT buy (no entitlement
// for a death in the suspension period), and how many contributions remain in the restoration package.
//
// ⚖ Story 10.25 lit the last of those: `restorationPackage` reaches its `ok` arm with a real
// `{ remaining, required }`, measured against the APPLIED R7 clause's own `consecutive_required`.

/**
 * The instrument under which the member is contributing without coverage. A DISCRIMINATED UNION
 * (AC2) — each arm carries its OWN copy key set, so the two disclosures cannot drift into one
 * another's wording:
 *   · `suspension`          — an active moderation suspension (Story 10.10's `suspended_per_<code>`).
 *                             LIVE today (structurally; reachable once 10.17 ships).
 *   · `restoration_lock_in` — the Story 10.23 restoration-discipline lock-in overlay. STRUCTURALLY
 *                             COMPLETE, NOT IN FORCE — 10.23 has not shipped, so nothing can set it.
 *                             It is deliberately NOT the JOIN lock-in (`payload.lockInStatus`): a
 *                             member in the join `lock-in` lifecycle state IS covered (`VALID_STATES`
 *                             at validity-service `payload.ts:56-60`), so telling them their
 *                             contribution buys no entitlement would be a FALSE statement about their
 *                             own coverage — the precise harm this story exists to prevent (D3).
 */
export type ContributionDisclosureInstrument = 'suspension' | 'restoration_lock_in';

/**
 * AC1(c)'s "how many contributions remain in the restoration package" — a FIRST-CLASS degraded state,
 * never a fabricated number (10.16 AC4 / the ratified D1-B; widened by Story 10.25 AC4 / D4).
 *
 * THREE arms, each a genuinely different claim about the member, and all three REACHABLE:
 *
 *   · `ok`                        — LIVE since Story 10.25. The member's applied R7 clause prescribes
 *                                   `restoration.consecutive_required`, and this is their progress
 *                                   against it. `required` comes from the CLAUSE DATA, never a code
 *                                   constant, and it is the APPLIED clause's — not R7(A)'s.
 *   · `no_consecutive_requirement`— NEW in Story 10.25. This member's restoration package is not
 *                                   measured in consecutive contributions, or they are in no
 *                                   restoration path at all. `clauseId` names the applied clause when
 *                                   one applied and is `null` when none did.
 *   · `package_unavailable`       — the facts THEMSELVES are un-derivable (no projection coverage for
 *                                   the Pariwar, or an `at` before the watermark). `producer` NAMES
 *                                   the owning story in the `ContributionHistoryUnavailable` house
 *                                   style — an honest gap, not a silent zero.
 *
 * ── ⚠ Why the third arm exists (Story 10.25 D4) ───────────────────────────────────────────────────
 * `{ remaining, required }` only describes a package measured in CONSECUTIVE CONTRIBUTIONS, and only
 * three of the seven R7 clauses have one: R7(A) 3, R7(B) 5, R7(C) 5. R7(D), R7(E) and R7(F) — the
 * MAJORITY of what is activated today — prescribe `lock_in_months` + `catch_up_required` /
 * `complete_all` instead. Leaving those members on `package_unavailable` after Story 10.25 shipped
 * would repeat exactly the failure 10.24's AC9 corrected: an honest sentinel that has quietly become a
 * lie, naming a story that shipped and did not close their case. `no_consecutive_requirement` says the
 * true thing instead. The lock-in-shaped disclosure belongs to Story 10.23, where the overlay lives.
 *
 * ⚖ Ownership of the count was CONFIRMED for Story 10.25 by BigDev on 2026-08-05 (Decision
 * 2026-08-05-074). It is no longer an open scope question, and 10.25 delivered it.
 *
 * `package_unavailable` STAYS, and stays reachable: it is a DIFFERENT claim from the other two, and
 * its `producer` literal stays `'story-10-25'` because this story genuinely is its producer — a
 * per-member gap in a SHIPPED producer is honest (10.24 D6). It is NOT `0` and NOT absent: on a
 * disclosure surface a silent omission reads as "there is nothing more to know", and a `0` would tell
 * a member they have completed a restoration package they may not have started.
 */
export type RestorationPackageState =
  | { readonly status: 'package_unavailable'; readonly producer: 'story-10-25' }
  | { readonly status: 'no_consecutive_requirement'; readonly clauseId: string | null }
  | { readonly status: 'ok'; readonly remaining: number; readonly required: number };

/**
 * The complete disclosure render contract (AC1). i18n KEYS + structured state — no copy, no colour, no
 * numeral formatting (the render layer resolves keys through `@twt/i18n` and renders any count as a
 * Latin operational numeral, amendment-A2 / AC6).
 *
 *   · `instrument`           — which arm fired (AC2's discriminant).
 *   · `titleKey`             — the block heading. Per-arm, so 10.23's arm needs no render change.
 *   · `whatItDoesKey`        — AC1(a): what the payment DOES (it counts toward restoring standing).
 *   · `whatItDoesNotBuyKey`  — AC1(b): what it does NOT buy (no beneficiary entitlement for a death
 *                              occurring during the suspension period).
 *   · `restorationPackage`   — AC1(c) / AC4. LIVE since Story 10.25; degraded-and-honest when it
 *                              cannot be counted.
 *   · `reasonLabelKey`       — the ONLY cause attribution the disclosure may carry (AC5): the
 *                              trustee-recorded reason code rendered as its catalogued LABEL, via the
 *                              shared `moderationReasonLabelKey` (never the raw code, never a
 *                              sentence of this module's own authorship). `null` when the instrument
 *                              carries no recorded reason code.
 *   · `a11yLabelKey`         — the announced summary (AC6): a screen-reader user must HEAR the
 *                              disclosure, not merely have it on screen.
 *
 * There is DELIBERATELY no `severity` / `tone` / `colorToken` field: AC6 requires the meaning to live
 * in the words, not in a red border, and AC5 forbids the copy from characterising the member's
 * standing as a moral failing. A tone field is how that discipline would erode.
 */
export interface ContributionDisclosureViewModel {
  readonly instrument: ContributionDisclosureInstrument;
  readonly titleKey: string;
  readonly whatItDoesKey: string;
  readonly whatItDoesNotBuyKey: string;
  readonly restorationPackage: RestorationPackageState;
  readonly reasonLabelKey: string | null;
  readonly a11yLabelKey: string;
}
