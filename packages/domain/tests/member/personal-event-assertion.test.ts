// The personal-event ASSERTION instrument — Story 10.26 (Task 2; AC1, AC2, AC8(f); D1, D2, D3, D7).
// PURE, DB-free.
//
// ── What this instrument IS, and what it deliberately is NOT ─────────────────────────────────────
// `member.personal_event_asserted` records that a member said "a personal event affected my ability
// to contribute". The Niyamavali's answer is already fixed and it is NO: the ratified §3.1
// (`docs/legal/niyamavali.md:81`) says personal events do not excuse a missed contribution, "the
// assertion is recorded on the member's own record but grants no restoration relief and carries no
// consequence of its own", and the seeded R7(G) clause carries `on_pass: no_exemption` with
// `restoration: {never_excuses: true}`.
//
// So this is a ONE-WAY RECORD WITH NO COUNTERPARTY (D1). There is no review, no approval, no denial,
// no status, no state machine, and nothing to reverse. It exists because the member has something to
// say and, until now, nowhere to say it — and because an un-evaluated R7(G) never tells the member
// what the rule actually is.
//
// ── The vocabulary constraint is structural, not cosmetic (AC1) ──────────────────────────────────
// The strongest version of the failure this story can produce is not a copy slip; it is a field named
// `status` or a route named `excuse-requests`, which makes a FALSE PROMISE structural — a member is
// told, in the shape of the API, that something might come of asserting. Nothing will. The tests
// below pin the instrument's shape against that.
//
// ── No free text, ever (D3) ──────────────────────────────────────────────────────────────────────
// A member describing a death or an illness is Tier-1 PII of the most sensitive kind, and `events_log`
// is append-only plaintext JSONB that is never redacted. It would need KMS envelope encryption, an
// RTBF story, a PII-scrape-gate exemption — and it would earn NOTHING, because nothing reads it:
// R7(G) is declarative, there is no reviewer, and the fact is a boolean. A free-text box with no
// reader is a false promise that someone is listening. The Helpdesk (Epic 10.1–10.4) is the surface
// with real humans on the other end.

import {
  MEMBER_EVENT_PAYLOAD_SCHEMAS,
  MEMBER_EVENT_TYPES,
  MEMBER_LIFECYCLE_STATES,
  PERSONAL_EVENT_KINDS,
  PersonalEventAssertedPayloadSchema,
  memberStateMachine,
  type MemberLifecycleState,
} from '../../src/member/index.js';
import { describe, expect, it } from 'vitest';

const ASSERTION_EVENT = 'member.personal_event_asserted';

/** A well-formed payload; `to_state` mirrors `from_state` because this is a NON-TRANSITION marker. */
function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    from_state: 'active',
    to_state: 'active',
    trigger: 'member.personal_event_asserted',
    actor: 'member',
    kind: 'bereavement',
    ...overrides,
  };
}

describe('AC2/D2 — the event is on the MEMBER stream, NOT in the contribution.* namespace', () => {
  it('is registered in the member vocabulary and its name carries no `contribution.` literal', () => {
    expect(MEMBER_EVENT_TYPES).toContain(ASSERTION_EVENT);
    // The 8.10 `no-ingest-path` fence source-scans four roots for a fourth `contribution.*` literal.
    // `packages/events/src` and `packages/domain/src/schema` are both scanned, so the NAME itself is
    // the thing that keeps the fence green — this assertion is that guarantee, stated locally.
    expect(ASSERTION_EVENT.startsWith('member.')).toBe(true);
    expect(ASSERTION_EVENT).not.toContain('contribution.');
  });

  it('binds to its payload schema in the ONE type→schema map', () => {
    expect(MEMBER_EVENT_PAYLOAD_SCHEMAS[ASSERTION_EVENT]).toBe(PersonalEventAssertedPayloadSchema);
  });

  it('the vocabulary is now TWENTY-ONE member.* events (20 + Story 10.23\'s imposition)', () => {
    // The stale-count class Story 10.25 AC6 catalogued: a doc comment that says 19 while the tuple
    // says 20. Pinned as a number so the comment cannot drift silently.
    // ⚠ Story 10.23 took it 20 → 21 with `member.restoration_discipline.imposed` — the SECOND
    // governance overlay's one event (there is deliberately no `…expired` sibling: expiry is derived
    // at read, AC4). This assertion is the SECOND count fixture in the repo; the other lives in
    // `life-events-markers.test.ts`, and BOTH must move together or the pair itself goes stale.
    expect(MEMBER_EVENT_TYPES.length).toBe(22);
    expect(new Set(MEMBER_EVENT_TYPES).size).toBe(22);
  });
});

describe('AC1/D3 — a bounded vocabulary, and NO free text anywhere in the payload', () => {
  it('accepts each of the six bounded kinds', () => {
    expect([...PERSONAL_EVENT_KINDS].sort()).toEqual([
      'bereavement',
      'caregiving',
      'displacement',
      'financial_hardship',
      'illness',
      'other',
    ]);
    for (const kind of PERSONAL_EVENT_KINDS) {
      expect(PersonalEventAssertedPayloadSchema.safeParse(payload({ kind })).success).toBe(true);
    }
  });

  it('retains `other` deliberately — a member whose situation is not listed must not be forced to mis-categorise', () => {
    expect(PERSONAL_EVENT_KINDS).toContain('other');
  });

  it('rejects a kind outside the vocabulary', () => {
    expect(PersonalEventAssertedPayloadSchema.safeParse(payload({ kind: 'bankruptcy' })).success).toBe(false);
    expect(PersonalEventAssertedPayloadSchema.safeParse(payload({ kind: '' })).success).toBe(false);
  });

  it('is .strict() — every free-text-shaped field is REJECTED, not silently dropped', () => {
    for (const field of ['notes', 'note', 'details', 'description', 'reason', 'explanation', 'comment']) {
      const result = PersonalEventAssertedPayloadSchema.safeParse(payload({ [field]: 'my father died' }));
      expect(result.success, `\`${field}\` was accepted — free text must never reach events_log (D3)`).toBe(false);
    }
  });

  it('admits NO field whose name implies a reviewable request (AC1: the false promise, made structural)', () => {
    const shape = Object.keys(PersonalEventAssertedPayloadSchema.shape);
    const FORBIDDEN = ['status', 'approved', 'approval', 'decision', 'review', 'reviewed_by', 'granted', 'waiver', 'exemption', 'request', 'appeal'];
    for (const banned of FORBIDDEN) {
      expect(shape, `payload carries \`${banned}\` — the instrument records; it never adjudicates`).not.toContain(banned);
    }
  });

  it('carries the §1.14 audit shape + actor `member`, and rejects a non-member actor', () => {
    const shape = Object.keys(PersonalEventAssertedPayloadSchema.shape);
    expect(shape).toEqual(expect.arrayContaining(['from_state', 'to_state', 'trigger', 'actor', 'kind']));
    // The assertion is a MEMBER act about their own life. No trustee asserts it on their behalf, and
    // no scheduler infers one — that would be the system putting words in a member's mouth.
    expect(PersonalEventAssertedPayloadSchema.safeParse(payload({ actor: 'trustee' })).success).toBe(false);
    expect(PersonalEventAssertedPayloadSchema.safeParse(payload({ actor: 'system' })).success).toBe(false);
  });
});

describe('D5 — the optional cycle reference is PROVENANCE, and it is optional today for a real reason', () => {
  it('accepts a payload with no cycle_ref at all (no member surface can supply one)', () => {
    expect(PersonalEventAssertedPayloadSchema.safeParse(payload()).success).toBe(true);
  });

  it('accepts an optional cycle_ref when a future surface can name the cycle', () => {
    // Escalation 5: NO member surface lists a MISSED cycle. The Yogdaan Bahi lists ATTESTED
    // contributions — a missed cycle produces no attestation and therefore no row — so there is
    // nowhere for a member to point at the cycle they mean. The field ships unpopulated so a future
    // cycle-scoped surface needs no new event type.
    expect(
      PersonalEventAssertedPayloadSchema.safeParse(payload({ cycle_ref: '11111111-1111-4111-8111-111111111111' })).success,
    ).toBe(true);
    expect(PersonalEventAssertedPayloadSchema.safeParse(payload({ cycle_ref: '' })).success).toBe(false);
  });
});

describe('AC8(f) — the reducer treats the assertion as IDENTITY, from EVERY legal lifecycle state', () => {
  it('leaves members.state unchanged from all nine states (the address_updated / posting_updated precedent)', () => {
    for (const state of MEMBER_LIFECYCLE_STATES) {
      const next = memberStateMachine.step(state as MemberLifecycleState, {
        type: ASSERTION_EVENT,
        payload: payload({ from_state: state, to_state: state }),
      });
      expect(next, `asserting from \`${state}\` moved the member's lifecycle state`).toBe(state);
    }
  });

  it('is identity even when the payload LIES about the transition (the reducer never reads to_state)', () => {
    const next = memberStateMachine.step('active', {
      type: ASSERTION_EVENT,
      payload: payload({ from_state: 'active', to_state: 'withdrawn' }),
    });
    expect(next).toBe('active');
  });
});
