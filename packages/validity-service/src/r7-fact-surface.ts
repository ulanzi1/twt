// The cross-family R7 supplied-fact surface — Story 10.23 (Task 1; AC9 / D7).
//
// ── Why this is its OWN leaf module and not a constant in `rules.ts` ────────────────────────────
// It was written in `rules.ts` first, and that broke `@twt/jobs` at runtime with
// `ReferenceError: R7_SUPPLIED_FACT_KEYS is not defined` (rules.ts module body) — a MODULE
// INITIALIZATION ORDER hazard, not a type error, so `tsc` and the validity-service's own suite both
// stayed green and only the cross-package import path failed.
//
// The cause: `rules.ts` held `import type { AppliedRestorationRequirement } from './producer.js'` —
// TYPE-ONLY, therefore fully ERASED at runtime. Adding a VALUE import of `R7_SUPPLIED_FACT_KEYS`
// materialized a real runtime edge into an import graph (`payload.ts → rules.ts`, and the barrel
// re-exporting both) where the erased edge had been keeping the evaluation order safe. A top-level
// spread then read a binding still in its temporal dead zone.
//
// This module has NO importer inside the package except the barrel and the gate's own test, and it
// imports only two leaves. It cannot participate in a cycle, so the union can be evaluated eagerly.
// (`member/audit-shape.ts` in @twt/domain exists for the same class of reason — hoist the shared
// value to a leaf rather than letting two modules import each other.)
//
// ⚠ KEEP `rules.ts`'s producer import TYPE-ONLY. Re-introducing a value import there re-introduces
// the hazard, and it will again pass `typecheck`, `lint` and the package's own unit tests.

import { R7_SUPPLIED_MEMBER_FACT_KEYS } from './member-facts.js';
import { R7_SUPPLIED_FACT_KEYS } from './producer.js';

/**
 * The supplied-fact surface the falsifiable-hold gate checks `R7HeldClause.blockedBy` against,
 * spanning EVERY R7 fact family rather than one producer's.
 *
 * ── ⭐ Why the single-family set was not enough ──────────────────────────────────────────────────
 * `r7-activation-totality.test.ts` asserts that every held clause's `blockedBy` names a key no
 * producer supplies. Until this story it checked against `R7_SUPPLIED_FACT_KEYS` — the
 * `contribution.*` producer's key set. R7(A)/(B) are held on `member.joining_discipline_state`, a
 * `member.*` fact that can NEVER enter that set, so the assertion was VACUOUSLY green and would have
 * STAYED green at the exact moment Story 10.23 satisfied the hold's stated reason — certifying a
 * decorative hold as honest.
 *
 * That is [[feedback_gate_scope_semantic_coverage]] in its literal form: *a gate scoped to the wrong
 * package still misses the target.* The mechanization had been half-scoped since Story 10.24 and
 * nobody noticed, because the second fact family did not exist until now.
 *
 * ⚠ ADD EVERY NEW R7 FACT FAMILY HERE. A family that supplies facts without joining this union
 * re-creates exactly that blindness — the gate would keep certifying holds it cannot see.
 */
export const R7_SUPPLIED_FACT_KEYS_ALL_FAMILIES: readonly string[] = [
  ...R7_SUPPLIED_FACT_KEYS,
  ...R7_SUPPLIED_MEMBER_FACT_KEYS,
];
