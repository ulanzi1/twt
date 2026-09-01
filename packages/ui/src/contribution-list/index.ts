// @twt/ui `<ContributionList>` shared logic — Story 11b.2 (the sixth presenter module; the Story 9.12
// `pool-progress` sibling).
//
// The framework-agnostic confirmed-contributor ROW presenter (pure view-model builder) every contributor
// surface shares: the Story 11b.2b mobile `<PoolContributorList>` + Nominee Console today, a Story 11b.3
// Astro render layer later. NO react/react-native/astro here — only the pure `(row) → view-model` function +
// its types + the i18n REF catalogue. Confirmed-only is enforced STRUCTURALLY at the input boundary (D2(a)):
// no yellow/pending/attested/projected/utr/status operand can enter, and there is deliberately no per-row
// status field to hang a pill on.
//
// ⛔ PER-ROW, NEVER PER-LIST (Trap 1): virtualization is a render-layer property. This module owns the row's
// CONTENT CONTRACT; the render layers own the WINDOWING.
// ⛔ NAME PARTS ONLY, NEVER JOINED (D9(a)): the contributor name FORM is UNRULED and routed to the Trustee
// Panel, so composing the parts here would rule it.
// ⚠ THE PRESENTER THROWS on an unresolvable name (D8(a)) — every consumer owes a try/catch (Trap 4).

export { deriveContributionRowViewModel } from './presenter.js';
export { CONTRIBUTION_LIST_I18N_REFS } from './i18n-keys.js';
export type {
  ContributionListI18nRef,
  ContributionRowDisplayName,
  ContributionRowInput,
  ContributionRowViewModel,
} from './view-model.js';
