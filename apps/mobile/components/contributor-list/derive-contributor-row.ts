// The ONE derivation of a rendered contributor row — Story 11b.21 code review (2026-09-19).
//
// Extracted from `PoolContributorList.tsx`'s `renderableRows` so that the component AND its test call the
// SAME function. Before this the AC5 "three rendered rows" test re-implemented the label / a11y logic
// inline and was tied to the component only by source-regex pins: a regression in the component (a row
// mapped to `null`, the placeholder arm removed while the strings stayed) left it green. ⭐ A stub is a
// SECOND source; it must call, never transcribe ([[feedback_stub_must_call_not_transcribe]]).
//
// ⛔ RN-free and hook-free on purpose (there is no RN mount harness in apps/mobile): the `t` it needs is
// PASSED IN, so the component hands it the `useT()` closure and a test hands it the real `t` bound to a
// locale. ⛔ It does not catch — the per-row guard stays in the component, where the drop is logged.

import type { ConfirmedContributorRow } from '@twt/contracts'
import type { BoundTranslate } from '@twt/i18n'
import { deriveContributionRowViewModel } from '@twt/ui'
import type { ContributionRowViewModel } from '@twt/ui'

import { toContributionRowInput } from './contribution-row-input'

export type DerivedContributorRow = { label: string; ariaLabel: string; isPlaceholder: boolean }

export function deriveContributorRow(
  item: ConfirmedContributorRow,
  poolLetterCode: string,
  t: BoundTranslate,
): DerivedContributorRow {
  const vm: ContributionRowViewModel = deriveContributionRowViewModel(
    toContributionRowInput(item, poolLetterCode),
  )
  // ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 (quoted, ⛔ not deleted): *"The JOIN lives here, in the
  //   render layer … the presenter emits name PARTS and never composes them, because the contributor
  //   name FORM is UNRULED"*. The form is RULED (`-189` cl.3) and resolved on the SERVER; the name
  //   renders AS-IS (⛔ no join). A withheld name renders the ruled placeholder, resolved from the
  //   presenter's ref — key AND namespace both (`-224` D1: `sahyog-vivran`, ⛔ not `contribution`).
  const label =
    vm.displayName.kind === 'name'
      ? vm.displayName.name
      : t(vm.displayName.ref.key, undefined, { namespace: vm.displayName.ref.namespace })
  const isPlaceholder = vm.displayName.kind === 'placeholder'
  // The KEY AND ITS NAMESPACE BOTH COME FROM THE PRESENTER'S REF, never guessed here — `t()` defaults to
  // `common` and THROWS on a miss, and the namespace is the THIRD argument (passing it second lands it in
  // the params slot and throws on every call). The `{name}` param is the render layer's, deliberately: the
  // presenter does not fill it.
  // ⭐ `-224` D5 — the placeholder row is labelled by the SAME `row_a11y` string ("A contributor,
  // confirmed contributor"): ⛔ no new copy, and ⛔ nothing that reads as a cause.
  const ariaLabel = t(vm.rowA11y.ref.key, { name: label }, { namespace: vm.rowA11y.ref.namespace })
  return { label, ariaLabel, isPlaceholder }
}
