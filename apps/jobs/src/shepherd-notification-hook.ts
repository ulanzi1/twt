// Shepherd-assigned member-notification hook — Story 6.12 (Task 7, AC7 seam; R4).
//
// At assignment AND reassignment the shepherd-assign worker (and the R6 manual apps/api route) fires this
// hook post-commit — the future Story-5.1 `claim-status-change` push fan-out's forward seam. At 6.12 it is
// a SEAM ONLY: production wires the console placeholder; tests inject a capturing fake. It carries NON-PII
// COORDINATES ONLY (pariwarId, claimCaseId, shepherd_actor_id, claimant_actor_id, assignment_reason).
//
// ⚠ This MUST NOT resolve targets or send bytes. `packages/channels` `dispatch()` is a `[PRIMITIVE]` with
// NO live call site through Story 5.4 — 6.12 must NOT become its first live caller (R4). The
// correctness-mandatory member-facing surface is the pull-based <ShepherdContactCard> (AC3); this push is
// best-effort and never blocks or fails the assignment (a throw here is swallowed).
//
// ── ONE definition, both call sites (RATIFIED correction iii) ──────────────────────────────
// Assignment originates in the jobs worker, so the hook lives in the apps/jobs deps graph. The R6 manual
// apps/api reassignment route imports this SAME hook from the @twt/jobs barrel and fires it post-commit —
// one definition, three call paths (auto / fallback / manual) notify identically.

/** The event a shepherd assignment/reassignment emits (the Epic-5 push fan-out input). NON-PII only. */
export interface ShepherdAssignedEvent {
  /** The tenant whose claim gained/changed a shepherd. */
  readonly pariwarId: string;
  /** The claim the shepherd is assigned to (the events_log stream id). */
  readonly claimCaseId: string;
  /** The newly-assigned shepherd (users.id — an actor id, not a name). */
  readonly shepherdActorId: string;
  /** The claim's filer/claimant (the push recipient the Epic-5 fan-out resolves; null when trustee-filed). */
  readonly claimantActorId: string | null;
  /** initial (auto) | reassignment (admin-initiated, R6) | fallback (AR-61, AC4). */
  readonly assignmentReason: 'initial' | 'reassignment' | 'fallback';
}

/** The injectable hook seam (a sibling of `NiyamavaliAmendedHook`). Never throws into the assignment. */
export type ShepherdAssignedNotificationHook = (event: ShepherdAssignedEvent) => void;

/**
 * The default inert hook: one structured `console.info` line (the `consoleNiyamavaliAmendedHook` analogue).
 * Used in production/dev wiring until Epic 5 replaces it with the real push fan-out; tests inject a
 * capturing fake. NON-PII coordinates only. Never throws.
 */
export const consoleShepherdAssignedNotificationHook: ShepherdAssignedNotificationHook = (event) => {
  try {
    console.info(
      '[shepherd-assigned]',
      JSON.stringify({
        pariwarId: event.pariwarId,
        claimCaseId: event.claimCaseId,
        shepherdActorId: event.shepherdActorId,
        claimantActorId: event.claimantActorId,
        assignmentReason: event.assignmentReason,
      }),
    );
  } catch {
    // A best-effort notification seam must never take down the assignment path.
  }
};

/** A capturing fake for tests — records every fired event; never throws. */
export interface CapturingShepherdAssignedHook {
  readonly hook: ShepherdAssignedNotificationHook;
  readonly events: ShepherdAssignedEvent[];
}

export function createCapturingShepherdAssignedHook(): CapturingShepherdAssignedHook {
  const events: ShepherdAssignedEvent[] = [];
  return {
    events,
    hook: (event) => {
      events.push(event);
    },
  };
}
