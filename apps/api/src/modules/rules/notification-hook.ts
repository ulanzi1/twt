// Member-notification scaffolding hook — Story 2.4 (Task 7, AC3 placeholder).
//
// On a successful Niyamavali publish the handler fires this hook. At 2.4 it is a
// SEAM ONLY — a no-op/console placeholder. Epic 5 wires the real `niyamavali.amended`
// push fan-out (resolving `affected_member_scope` → member ids via Epic 4 / FR-12A,
// then delivering pushes). 2.4 ships the seam + the call site, NOT the delivery.
// Mirrors the `deployTrigger` / `toneReviewAuditSink` injectable-seam precedent:
// production wires the console placeholder; tests inject a capturing fake.
//
// ⚠ This MUST NOT resolve scope → members or send anything (seam-clean — that is
// Epic 5 + Epic 4). It carries only the published-amendment coordinates.

import type { schema } from '@twt/domain';

/** The event a successful publish emits (the Epic-5 push fan-out input). */
export interface NiyamavaliAmendedEvent {
  /** The tenant whose Niyamavali changed. */
  readonly pariwarId: string;
  /** The stable clause id that was published. */
  readonly clauseId: string;
  /** The newly-minted immutable version row address. */
  readonly clauseVersionId: string;
  /**
   * The amendment's declared affected-member scope (null for a brand-new clause).
   * Epic 4 resolves this to concrete member ids; 2.4 only forwards the declaration.
   */
  readonly affectedMemberScope: schema.AffectedMemberScope | null;
}

/** The injectable hook seam (a sibling of `DeployTrigger`). Never throws into publish. */
export type NiyamavaliAmendedHook = (event: NiyamavaliAmendedEvent) => void;

/**
 * The default inert hook: one structured `console.info` line (the
 * `consoleToneReviewAuditSink` analogue). Used in production/dev wiring until Epic 5
 * replaces it; tests inject a capturing fake. Never throws.
 */
export const consoleNiyamavaliAmendedHook: NiyamavaliAmendedHook = (event) => {
  try {
    console.info(
      '[niyamavali-amended]',
      JSON.stringify({
        pariwarId: event.pariwarId,
        clauseId: event.clauseId,
        clauseVersionId: event.clauseVersionId,
        affectedMemberScope: event.affectedMemberScope,
      }),
    );
  } catch {
    // A scaffolding hook must never take down the publish path.
  }
};
