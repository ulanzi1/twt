// The moderation status machine — Story 10.10 (Task 1; AC2).
//
// A SECOND, ORTHOGONAL state machine on the member's own `events_log` stream (Decision 1). It is
// NOT the member lifecycle machine: `members.state` is never touched, no `member_lifecycle_state`
// enum label is added, and all three `member.moderation.*` events fold through
// `memberStateMachine` as IDENTITY by construction (its `default: return state` arm).
//
// ── PURE + TOTAL (the `nextTicketState` / `nextBannerStatus` discipline) ─────────────────────────
// `nextModerationStatus(status, action)` returns the next status, or `null` for an ILLEGAL
// transition. The route maps `null` → a typed 409 BEFORE any write — a no-op never returns 200,
// and re-suspending an already-suspended member is a 409, not a silent second event.
//
// ── Why `none --terminate--> terminated` is ILLEGAL (Decision 2) ─────────────────────────────────
// PRD FR-56 (`prd.md:849`) draws `active ↔ suspended → terminated`: the arrow into `terminated`
// ORIGINATES at `suspended`, not at the unmoderated state. Encoding that literally means the
// harshest, rejoin-locking action can never be a single click — a trustee must first suspend
// (itself notified, audited and appealable) and only then terminate. Even the harshest ground
// (R14 forgery) is listed by the PRD as a SUSPENSION reason, so it too enters through suspension.

/** The derived moderation standing. `none` = not under moderation (the default for every member). */
export const MODERATION_STATUSES = ['none', 'suspended', 'terminated'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** The three moderation actions a `member.moderate` holder may request. */
export const MODERATION_ACTIONS = ['suspend', 'terminate', 'restore'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/**
 * The legality reducer: the next status for `(status, action)`, or `null` when the transition is
 * illegal. EXACTLY four legal arms (AC2) — everything else is `null`, including:
 *   · `none --terminate-->`      (Decision 2 — termination routes through suspension)
 *   · `suspended --suspend-->`   (a re-suspend is a 409, not a silent second event)
 *   · `terminated --suspend-->`  (terminated is terminal until restored)
 *   · `terminated --terminate-->`, `none --restore-->`  (no-ops)
 */
export function nextModerationStatus(
  status: ModerationStatus,
  action: ModerationAction,
): ModerationStatus | null {
  switch (status) {
    case 'none':
      return action === 'suspend' ? 'suspended' : null;
    case 'suspended':
      if (action === 'terminate') return 'terminated';
      if (action === 'restore') return 'none';
      return null;
    case 'terminated':
      return action === 'restore' ? 'none' : null;
    default: {
      // Exhaustiveness guard — a new ModerationStatus without an arm is a compile error.
      const never: never = status;
      return never;
    }
  }
}

/** Convenience predicate over `nextModerationStatus` (the `isLegalBannerTransition` mirror). */
export function isLegalModerationTransition(
  status: ModerationStatus,
  action: ModerationAction,
): boolean {
  return nextModerationStatus(status, action) !== null;
}

/** The `member.moderation.*` event type each action appends (the AC1 spellings, verbatim). */
export const MODERATION_ACTION_EVENT_TYPES = {
  suspend: 'member.moderation.suspended',
  terminate: 'member.moderation.terminated',
  restore: 'member.moderation.restored',
} as const satisfies Record<ModerationAction, string>;

/** The dotted `member.moderation.*` event-type literal union (the three AC1 events). */
export type ModerationEventType =
  (typeof MODERATION_ACTION_EVENT_TYPES)[keyof typeof MODERATION_ACTION_EVENT_TYPES];

/** The three moderation event types, as a tuple (the overlay's `inArray` filter + the registry). */
export const MODERATION_EVENT_TYPES = [
  MODERATION_ACTION_EVENT_TYPES.suspend,
  MODERATION_ACTION_EVENT_TYPES.terminate,
  MODERATION_ACTION_EVENT_TYPES.restore,
] as const;

/** The inverse map: `member.moderation.*` event type → the action that produced it. */
export const MODERATION_EVENT_TYPE_ACTIONS = {
  'member.moderation.suspended': 'suspend',
  'member.moderation.terminated': 'terminate',
  'member.moderation.restored': 'restore',
} as const satisfies Record<ModerationEventType, ModerationAction>;

/** Narrow an arbitrary event-type string to a moderation action, or `null` if it is not one. */
export function moderationActionForEventType(eventType: string): ModerationAction | null {
  return (
    (MODERATION_EVENT_TYPE_ACTIONS as Readonly<Record<string, ModerationAction | undefined>>)[
      eventType
    ] ?? null
  );
}
