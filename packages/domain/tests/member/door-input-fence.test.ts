// Story 6.38 (DL17, AC13; `2026-10-30-423` Q3 B, `2026-10-31-424` Q1 (a) / (b)) — a fence on the WAYS INTO a lifecycle state
// the claim door refuses. ⛔ DB.
//
// The door (`claim/intake-door.ts` `resolveClaimIntakeDoor`) is keyed on state LABELS, so its meaning can change without its
// code changing: a later story that adds a transition INTO a refused state — e.g. a KYC re-verification that sends a paid
// member back to `pending-kyc` — compiles, passes the door's exhaustive switch, and silently refuses that member's family as
// `not_joined`. This drives the REAL reducer (`memberStateMachine.step`) over every state × every event type × every payload
// variant a reducer arm branches on, collects every edge `from → to` (from ≠ to) whose `to` is a refused state, and pins the
// set EXACTLY. The refused states are READ from the door's own export (`DOOR_REFUSED_LIFECYCLE_STATES`), ⛔ restated here.
// ⚠ Limits, said plainly: a payload branch this file does ⛔ know about is covered only if that story adds its variant here;
// TERMINATED is the moderation overlay (its own invariants), ⛔ a lifecycle state — outside this fence.

import { describe, expect, it } from 'vitest';

import { DOOR_REFUSED_LIFECYCLE_STATES } from '../../src/claim/intake-door.js';
import { MEMBER_EVENT_TYPES } from '../../src/member/events.js';
import { MEMBER_LIFECYCLE_STATES, memberStateMachine, type MemberEventInput, type MemberLifecycleState } from '../../src/member/state.js';

type Step = (from: MemberLifecycleState, event: MemberEventInput) => MemberLifecycleState;

/** Every payload variant a reducer arm branches on (today: `member.lock_in_expired` on `kyc_verified`). */
const PAYLOAD_VARIANTS: Readonly<Record<string, readonly unknown[]>> = {
  'member.lock_in_expired': [{ kyc_verified: true }, { kyc_verified: false }],
};

/** Every edge INTO a refused state, as `from --event--> to`. */
function edgesIntoRefused(step: Step, refused: readonly MemberLifecycleState[]): string[] {
  const out = new Set<string>();
  for (const from of MEMBER_LIFECYCLE_STATES) {
    for (const type of MEMBER_EVENT_TYPES) {
      for (const payload of [{}, ...(PAYLOAD_VARIANTS[type] ?? [])]) {
        const to = step(from, { type, payload });
        if (to !== from && refused.includes(to)) out.add(`${from} --${type}--> ${to}`);
      }
    }
  }
  return [...out].sort();
}

const OTHER_STATES = MEMBER_LIFECYCLE_STATES.filter((s) => s !== 'anonymized');

/** The ratified ways in (`-423` Q3 B; `-424` Q1 (b) B made `pending-fee` a refused state). */
const EXPECTED = [
  // `pending-kyc` ← ⛔ edge: reached only as the replay's INITIAL state (signup).
  'pending-kyc --member.kyc_completed--> pending-fee',
  'pending-kyc --member.kyc_manual_fallback--> pending-fee',
  'active --member.withdrawal_completed--> withdrawn',
  'active-in-grace --member.withdrawal_completed--> withdrawn',
  'lapsed-unpaid --member.withdrawal_completed--> withdrawn',
  ...OTHER_STATES.map((s) => `${s} --member.rtbf_anonymized--> anonymized`),
].sort();

const MESSAGE =
  '`2026-10-30-423` Q3 B / `resolveClaimIntakeDoor` / `-424` Q1 (a): a new way into a state the claim door refuses — decide ' +
  'whether those members\' families may file before changing this list';

describe('Story 6.38 — the ways into a state the claim door refuses (DL17)', () => {
  const step: Step = (from, event) => memberStateMachine.step(from, event);

  it('the refused states are the door\'s own (read from `intake-door.ts`)', () => {
    expect([...DOOR_REFUSED_LIFECYCLE_STATES].sort()).toEqual(['anonymized', 'pending-fee', 'pending-kyc', 'withdrawn']);
    expect(memberStateMachine.initial).toBe('pending-kyc');
  });

  it('the reducer\'s edges into a refused state are EXACTLY the ratified set', () => {
    expect(edgesIntoRefused(step, DOOR_REFUSED_LIFECYCLE_STATES), MESSAGE).toEqual(EXPECTED);
  });

  it('⭐ positive control — a stub reducer with ONE extra edge into `pending-kyc` fails the fence', () => {
    const stub: Step = (from, event) =>
      from === 'active' && event.type === 'member.kyc_completed' ? 'pending-kyc' : memberStateMachine.step(from, event);
    const edges = edgesIntoRefused(stub, DOOR_REFUSED_LIFECYCLE_STATES);
    expect(edges).toContain('active --member.kyc_completed--> pending-kyc');
    expect(() => expect(edges, MESSAGE).toEqual(EXPECTED)).toThrow(/2026-10-30-423/);
  });
});
