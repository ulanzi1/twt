// ALERT_CLOSED_EVENT_TYPES ↔ isAlertClosedState lockstep — Story 10.24 (Task 3; AC4). PURE.
//
// `skips_current_year` asks "was the cycle CLOSED at `at`?". That question cannot be answered from
// `alerts.current_state`, which is a NOW cache — it is answered from the alert stream's own
// `alert.closed` / `alert.settled` event `occurred_at`. So the fact reader needs an EVENT-level mirror
// of the state-level predicate `isAlertClosedState` owns.
//
// A mirror that nobody checks is a second definition waiting to drift — the exact class of bug this
// codebase keeps paying for. This test pins the two together in BOTH directions:
//
//   · every `ALERT_CLOSED_EVENT_TYPES` entry must name a state `isAlertClosedState` ACCEPTS, and
//   · every state `isAlertClosedState` accepts must have a corresponding event type.
//
// Adding a sixth alert lifecycle state that means "closed" without adding its event type would
// silently UNDER-COUNT skips — every member assigned to a cycle that reached that state would look
// like they had not missed anything. That failure is invisible in production and shows up here.
//
// The IST offset is pinned in the same spirit: `facts.ts` re-declares it locally (rather than
// importing `cycleCalendar`, keeping the module dependency-free), so the copy is held equal to the
// canonical constant here.

import { describe, expect, it } from 'vitest';

import {
  ALERT_CLOSED_EVENT_TYPES,
  IST_UTC_OFFSET_MS as FACTS_IST_UTC_OFFSET_MS,
} from '../../src/contribution/facts.js';
import { isAlertClosedState } from '../../src/contribution/history.js';
import { IST_UTC_OFFSET_MS as CANONICAL_IST_UTC_OFFSET_MS } from '../../src/cycle-calendar/holiday-resolver.js';
import { ALERT_LIFECYCLE_STATES } from '../../src/schema/alerts.js';

/** `alert.closed` → the `closed` state, `alert.settled` → `settled` — the event/state naming rule. */
function stateForEventType(eventType: string): string {
  return eventType.replace(/^alert\./, '');
}

describe('ALERT_CLOSED_EVENT_TYPES is the event-level mirror of isAlertClosedState', () => {
  it('every closed-event type maps to a state isAlertClosedState ACCEPTS', () => {
    for (const eventType of ALERT_CLOSED_EVENT_TYPES) {
      const state = stateForEventType(eventType);
      expect(
        ALERT_LIFECYCLE_STATES.includes(state as (typeof ALERT_LIFECYCLE_STATES)[number]),
        `${eventType} maps to "${state}", which is not an alert lifecycle state at all`,
      ).toBe(true);
      expect(
        isAlertClosedState(state as (typeof ALERT_LIFECYCLE_STATES)[number]),
        `${eventType} maps to "${state}", which isAlertClosedState does NOT consider closed`,
      ).toBe(true);
    }
  });

  it('every state isAlertClosedState accepts HAS a closed-event type — the direction that under-counts', () => {
    const covered = new Set(ALERT_CLOSED_EVENT_TYPES.map(stateForEventType));
    for (const state of ALERT_LIFECYCLE_STATES) {
      if (!isAlertClosedState(state)) continue;
      expect(
        covered.has(state),
        `isAlertClosedState accepts "${state}" but ALERT_CLOSED_EVENT_TYPES has no matching event type — every member assigned to a cycle that reached "${state}" would silently NOT be counted as having missed it.`,
      ).toBe(true);
    }
  });

  it('does NOT treat any pre-live / live state as closed (an open cycle is never a skip)', () => {
    for (const state of ALERT_LIFECYCLE_STATES) {
      if (isAlertClosedState(state)) continue;
      expect(ALERT_CLOSED_EVENT_TYPES).not.toContain(`alert.${state}`);
    }
  });
});

describe("facts.ts's local IST offset matches the canonical cycle-calendar constant", () => {
  it('facts.ts\'s re-declared copy equals the canonical constant — DIRECTLY, not each independently against a literal', () => {
    // `facts.ts` keeps its own copy so the module stays free of a cycle-calendar import. Asserting each
    // constant against a hardcoded literal independently (the previous form of this test) proves neither
    // copy against the OTHER — a typo in `facts.ts`'s copy alone would go undetected as long as it still
    // matched the literal here. Comparing the two imports directly is what actually holds them in
    // lockstep (code review, 2026-08-05).
    expect(FACTS_IST_UTC_OFFSET_MS).toBe(CANONICAL_IST_UTC_OFFSET_MS);
  });

  it('the canonical constant is exactly +05:30 in ms (sanity pin, not the lockstep itself)', () => {
    expect(CANONICAL_IST_UTC_OFFSET_MS).toBe(5 * 60 * 60 * 1000 + 30 * 60 * 1000);
  });
});
