// The `<ContributionList>` ROW view-model — Story 11b.2 (Task 1; the sixth `@twt/ui` presenter module, on the
// Story 9.12 `pool-progress` shape). The framework-agnostic render contract for ONE confirmed-contributor row,
// shared by every surface that lists confirmed contributors: the Story 11b.2b mobile `<PoolContributorList>`
// today, a Story 11b.3 Astro render layer later. Produced by the strictly-pure per-row presenter
// (presenter.ts): NO react/react-native/astro, NO copy (i18n KEYS only), NO palette, NO numeral formatting,
// and NO `@twt/domain` import.
//
// ── PER-ROW BY SHAPE (Trap 1) ────────────────────────────────────────────────────────────────────────────
// There is deliberately NO list-level function in this module and no type describing a row SET:
// virtualization is a render-layer property (it needs a scroll container, a viewport and a mount lifecycle,
// none of which a pure `(input) → view-model` function has). This module owns the row's CONTENT CONTRACT;
// 11b.2b and a future Astro layer own the WINDOWING.
// ⚠⚠ CORRECTED (combined review, 2026-09-01): this block used to open "because the consumer is a WINDOWING
// render layer … ONCE PER VISIBLE ROW, ON EVERY SCROLL FRAME". ⛔ The shipped consumer does ⛔ NOT do that —
// it derives EAGERLY over the whole list inside a memo (`contribution-row-input.ts` records this, and
// `presenter.ts`'s header now carries the full correction). ⭐ The per-row shape requirement is unaffected;
// only the reason given for it was wrong.
//
// ── Confirmed-only, by SHAPE (Stories 8.3 + 9.5; D2(a)) ─────────────────────────────────────────────────
// The INPUT type carries NO way to express yellow/pending/attested/projected/utr/status — a row's mere
// presence means confirmed (pool-contributor-list.ts:39-40). Adding such a field is the one change this
// module exists to forbid, and the three-half anti-widening test rejects it top-level, at runtime, AND
// through nesting or rename (AC4).

/** An i18n key plus the namespace it resolves in. `t()` defaults to `common` and THROWS on a miss
 *  (resolver.ts:55, :63-64), so a BARE key forces the render layer to guess.
 *  ⚠ Every key this module emits lives in `contribution` (contribution.json:30-39). The namespace is
 *  carried per-REF anyway — 11b.2b's AC6 reads this record, and 11b.3 may add a second namespace.
 *  ⛔ Do NOT collapse this to a module-level constant (D12-refscope(a)).
 *  ⚠⛔ CALL SHAPE: t(key, params, { namespace }) — the namespace is the THIRD argument. */
export interface ContributionListI18nRef {
  readonly key: string;
  /** ⚠ WIDENED 2026-09-19 by Story 11b.21 (`#decision-2026-09-19-224` D1) to carry EXACTLY ONE foreign
   *  ref: the ruled placeholder word lives in `sahyog-vivran` (`value.contributor_unnamed`), and
   *  `2026-09-18-222` cl.2 forbids a second key. Every other ref stays in `contribution`. */
  readonly namespace: 'contribution' | 'sahyog-vivran';
}

/** Confirmed-only, by SHAPE (Stories 8.3 + 9.5). The INPUT carries NO way to express
 *  yellow/pending/attested/projected/utr/status — a row's mere presence means confirmed
 *  (pool-contributor-list.ts:39-40). Adding such a field is the one change this module exists to forbid.
 *  ⛔ Local KIND-TAG mirror of @twt/domain's MemberDisplayName — NOT imported (Trap 3).
 *  ⚠ It mirrors a SUBSET of the discriminants, and the omission is DELIBERATE: domain has
 *  'name' | 'unknown' | 'anonymized'; this has only 'name' | 'unknown', because 11b.2a's D5 omits an
 *  RTBF'd contributor's ROW ENTIRELY ⇒ no producer can hand this presenter an 'anonymized' operand
 *  (11b.2a D6(a): "the contributor row has exactly ONE kind, everywhere"). NOT drift.
 *  ⚠ D5's placeholder prohibition is SUPERSEDED on this surface by `2026-09-18-222` (the member list
 *  renders `A contributor` / `एक सहकर्मी` too); until story `11b-21` builds it, the row-omission above
 *  is still the SHIPPED behaviour — a gap against a ruling, ⛔ no longer the ruling itself.
 *
 *  ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 (`#decision-2026-09-19-224` D2) — the input is now
 *  `name | unnamed`. The wire row is `{ name: string | null }`: `name` is the server-resolved,
 *  mode-resolved string (the member-side name resolver, server), and `unnamed` is a confirmed contributor
 *  whose name cannot be shown — KEPT in position and rendered as the ruled placeholder (`-222` cl.1).
 *  ⛔ It carries ⛔ no cause: erasure and every other withheld cause are the same `unnamed` (`-222` cl.2).
 *  ⚠ `-169` cl.8's "exactly ONE kind, everywhere" is superseded in part here (presenter + render layer). */
export type ContributionRowDisplayName =
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'unnamed' };

export interface ContributionRowInput {
  readonly displayName: ContributionRowDisplayName;
  readonly poolLetterCode: string;
}

export interface ContributionRowViewModel {
  /** Name PARTS, and ONLY name parts. The presenter NEVER joins firstName + lastInitial: the
   *  contributor name FORM is UNRULED (D7-nameform(a)), AC6 item (iii) routes it to the Panel, and
   *  joining it here would RULE it. D9(a). Single-arm by D11-outputshape(a) — the 'literal' and
   *  'i18n' arms were dropped once D6(a) left them with zero possible emitters.
   *
   *  ⚠⛔ AMENDED 2026-09-15 (Story 11b.3b, AC11(d)) — ⛔ THE PREMISE ABOVE IS SPENT. It is KEPT as the
   *  record and ⛔ not rewritten ([[feedback_supersede_never_reinterpret]]).
   *  ⭐ THE FORM IS RULED: `2026-09-02-174` (Trustee Panel) ruled the contributor name renders at the
   *  `public` tier in the FULL NAME form, and `-175` made it UNCONDITIONAL. ⇒ "the form is unruled" is
   *  ⛔ no longer why this type is two-part.
   *  ⭐⭐ THE TWO-ARM SHAPE IS DELIBERATELY KEPT ANYWAY, AND THIS IS THE LIVE REASON:
   *    · it is the MEMBER surface's shape — `member-pool/handlers.ts` splits to firstName +
   *      lastInitial and 11b.2b's shipped mobile row consumes exactly these parts;
   *    · a THIRD arm would break that consumer's exhaustiveness branch BY DESIGN (see presenter.ts).
   *  ⛔⛔ SO THE PUBLIC FULL-NAME SURFACE DOES ⛔ NOT GO THROUGH THIS PRESENTER'S `displayName`.
   *  Story 11b.3b's AC3 renders ONE resolved string from `resolvePublicMemberName` and consumes this
   *  module only for its NON-name outputs. ⛔ Do ⛔ NOT widen this type to carry a full name, and
   *  ⛔ NEVER feed a public full name through `splitFirstNameLastInitial` to fit it — that ships the
   *  SHIELDED form on a surface ruled FULL NAME, with every test still green.
   *  ⚠ The member/public divergence this creates is NOT compliant with `-195` cl.1. It was carried
   *  under `2026-09-02-177` cl.2 (D9-inversion), ⛔ which is SUPERSEDED by `-189` cl.3 — a breach of a
   *  STANDING ruling, ⛔ not an accepted trade (`2026-09-18-221` cl.2). Stated at 11b.3b's AC10;
   *  discharged by the member-surface story `11b-21`.
   *
   *  ⚠⛔ SUPERSEDED 2026-09-19 by Story 11b.21 (`#decision-2026-09-19-224` D2/D3) — ⛔ the paragraphs
   *  above are KEPT as the record, ⛔ not deleted. The `nameParts` arm is GONE, and *"⛔ Do ⛔ NOT widen
   *  this type to carry a full name"* no longer holds: the member wire now carries ONE server-resolved
   *  string, mode-resolved at parity with the public page (`-189` cl.3), so the `name` arm carries it
   *  unchanged — full name, `Firstname L.` or a mononym, whatever the stored mode yields. The presenter
   *  still composes ⛔ nothing. The `placeholder` arm is the ruled word for a withheld name (`-222`),
   *  from ONE existing key (`-224` D1). ⛔ Name resolution stays on the server. */
  readonly displayName:
    | { readonly kind: 'name'; readonly name: string }
    | {
        readonly kind: 'placeholder';
        readonly ref: { readonly key: 'value.contributor_unnamed'; readonly namespace: 'sahyog-vivran' };
      };
  readonly poolLetterCode: string;
  /** `contributor_list.row_a11y` = "{name}, confirmed contributor" — takes a `{name}` param the
   *  presenter does NOT fill. The consumer resolves in TWO steps, in this order:
   *    1. resolve `displayName` — join .firstName + .lastInitial per the ruled form
   *       [⚠ SUPERSEDED 2026-09-19, Story 11b.21: `.name` as-is, or `t()` of the placeholder ref]
   *    2. t(rowA11y.ref.key, { name: <step 1> }, { namespace: rowA11y.ref.namespace })
   *  ⚠⛔ t(key, params, options) — the NAMESPACE IS THE THIRD ARGUMENT (resolver.ts:53). Passing it
   *     second puts it in the params slot, silently falls back to the 'common' namespace, and THROWS
   *     (resolver.ts:55, :63-64). The {name} value is a PARAM and belongs in the second slot.
   *  ⛔ The presenter composes neither string. */
  readonly rowA11y: { readonly ref: ContributionListI18nRef };
}
