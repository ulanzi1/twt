// Story 10.10 (Task 1; AC3, AC10) — the reason-code registry.
//
// The `appliesTo` metadata is what makes this a REGISTRY rather than a bare enum: it is what
// rejects a restore code offered to justify a termination (a typed 422). These tests pin that
// property in both directions and pin the frozen vocabulary itself, so a code cannot be quietly
// renamed (the wire value is a governance term, and the contracts sync-guard mirrors it).

import { describe, expect, it } from 'vitest';

import {
  ALL_REASON_CODES,
  MODERATION_REASON_CODES,
  REASON_CODE_REGISTRY,
  RESTORE_REASON_CODES,
  isReasonCode,
  listReasonCodeMeta,
  reasonCodeAppliesTo,
  reasonCodeMeta,
  reasonCodesForAction,
} from '../../src/member/moderation/reason-codes.js';
import { ModerationReasonCodeInvalidError } from '../../src/member/moderation/errors.js';
import { MODERATION_ACTIONS } from '../../src/member/moderation/status.js';
import { moderateMember } from '../../src/member/moderation/write.js';

describe('the frozen vocabulary', () => {
  it('declares the seven PRD/epic-anchored moderation grounds, in order', () => {
    expect(MODERATION_REASON_CODES).toEqual([
      'r7-contribution-discipline',
      'r14-forgery',
      'r10a-parallel-org-office',
      'concealment-confirmed',
      'helpdesk-escalated-abuse',
      'regulator-action',
      'voluntary-pending-review',
    ]);
  });

  it('declares the three restore grounds (prd.md:853)', () => {
    expect(RESTORE_REASON_CODES).toEqual(['rule-clearance', 'trustee-discretion', 'moderation-error']);
  });

  it('has registry metadata for every declared code, and no orphan entries', () => {
    expect(Object.keys(REASON_CODE_REGISTRY).sort()).toEqual([...ALL_REASON_CODES].sort());
  });

  it('anchors every code to a Niyamavali rule or FR (provenance, not policy)', () => {
    for (const code of ALL_REASON_CODES) {
      expect(REASON_CODE_REGISTRY[code].niyamavaliRef.length).toBeGreaterThan(0);
      expect(REASON_CODE_REGISTRY[code].label.length).toBeGreaterThan(0);
    }
  });
});

describe('appliesTo — the guard that makes this a registry', () => {
  it('a RESTORE code can never justify a suspension or a termination (AC3)', () => {
    for (const code of RESTORE_REASON_CODES) {
      expect(reasonCodeAppliesTo(code, 'suspend')).toBe(false);
      expect(reasonCodeAppliesTo(code, 'terminate')).toBe(false);
      expect(reasonCodeAppliesTo(code, 'restore')).toBe(true);
    }
  });

  it('a MODERATION code can never justify a restore', () => {
    for (const code of MODERATION_REASON_CODES) {
      expect(reasonCodeAppliesTo(code, 'suspend')).toBe(true);
      expect(reasonCodeAppliesTo(code, 'terminate')).toBe(true);
      expect(reasonCodeAppliesTo(code, 'restore')).toBe(false);
    }
  });

  it('an UNDECLARED code applies to nothing (untrusted input never falls through)', () => {
    for (const action of MODERATION_ACTIONS) {
      expect(reasonCodeAppliesTo('not-a-real-code', action)).toBe(false);
      expect(reasonCodeAppliesTo('', action)).toBe(false);
      // Prototype keys must not resolve through the registry's own object.
      expect(reasonCodeAppliesTo('toString', action)).toBe(false);
      expect(reasonCodeAppliesTo('constructor', action)).toBe(false);
    }
  });

  it('isReasonCode / reasonCodeMeta agree with the registry', () => {
    expect(isReasonCode('r14-forgery')).toBe(true);
    expect(isReasonCode('nope')).toBe(false);
    expect(reasonCodeMeta('r14-forgery')?.niyamavaliRef).toBe('R14');
    expect(reasonCodeMeta('nope')).toBeNull();
  });
});

describe('reasonCodesForAction — what the admin dropdown filters on (AC9)', () => {
  it('every action has at least one code that can justify it', () => {
    // The value-level complement of the compile-time `satisfies` exhaustiveness: an action whose
    // code set is empty would render an un-submittable dropdown.
    for (const action of MODERATION_ACTIONS) {
      expect(reasonCodesForAction(action).length).toBeGreaterThan(0);
    }
  });

  it('partitions the vocabulary exactly: moderation codes ∪ restore codes, no overlap', () => {
    expect(reasonCodesForAction('suspend')).toEqual([...MODERATION_REASON_CODES]);
    expect(reasonCodesForAction('terminate')).toEqual([...MODERATION_REASON_CODES]);
    expect(reasonCodesForAction('restore')).toEqual([...RESTORE_REASON_CODES]);
  });
});

// ── REVERT-SANITY: the write path's USE of the guard, with DB-free teeth (AC10) ──────────────────
//
// The suite above gives the PREDICATE teeth: gut `reasonCodeAppliesTo` and these tests go red.
// It gives the CALL SITE none. Deleting the `assertReasonCodeAppliesTo(...)` line from
// `moderateMember` left every DB-free test green — the pgEnum spans both code families, so an
// unguarded write persists cleanly and only the live-DB integration cases would have caught it.
// AC10 asks for teeth on this guard, and a guard whose removal is invisible without a database is
// not meaningfully guarded.
//
// These tests drive the real `moderateMember` with a client that THROWS on any query. That makes
// two properties provable without Postgres:
//   (1) an inapplicable reason code raises the typed 422, and
//   (2) it raises it BEFORE touching the database at all (AC3's "rejected before any write").
// Remove the call from `write.ts` and both flip: the client's sentinel error surfaces instead.
describe('moderateMember — the appliesTo guard fires before any DB access (revert-sanity)', () => {
  const NO_DB_SENTINEL = 'DB_TOUCHED — the guard did not run first';

  /** A pg.PoolClient stand-in whose every query is a test failure. */
  function refusingClient(): never_touched {
    return {
      query: () => {
        throw new Error(NO_DB_SENTINEL);
      },
    } as unknown as never_touched;
  }
  type never_touched = Parameters<typeof moderateMember>[0];

  const BASE = {
    memberId: '11111111-1111-4111-8111-111111111111' as never,
    pariwarId: '22222222-2222-4222-8222-222222222222' as never,
    decisionNoteCiphertext: 'enc:v1:not-a-real-envelope',
    actorId: '33333333-3333-4333-8333-333333333333',
    actorDisplay: 'Trustee Name',
    now: new Date('2026-08-03T00:00:00.000Z'),
  };

  it('a RESTORE code offered to justify a TERMINATION is a typed 422, with no query issued', async () => {
    await expect(
      moderateMember(refusingClient(), {
        ...BASE,
        action: 'terminate',
        reasonCode: 'moderation-error', // a restore-family code
      }),
    ).rejects.toBeInstanceOf(ModerationReasonCodeInvalidError);
  });

  it('a MODERATION code offered to justify a RESTORE is a typed 422, with no query issued', async () => {
    await expect(
      moderateMember(refusingClient(), {
        ...BASE,
        action: 'restore',
        reasonCode: 'r14-forgery', // a moderation-family code
      }),
    ).rejects.toBeInstanceOf(ModerationReasonCodeInvalidError);
  });

  it('an UNDECLARED code is a typed 422 for every action, with no query issued', async () => {
    for (const action of MODERATION_ACTIONS) {
      await expect(
        moderateMember(refusingClient(), { ...BASE, action, reasonCode: 'invented-ground' }),
      ).rejects.toBeInstanceOf(ModerationReasonCodeInvalidError);
    }
  });

  it('a VALID pair gets PAST the guard and reaches the DB — the teeth are not vacuous', async () => {
    // Without this, the three tests above would all still pass if `moderateMember` simply threw
    // ModerationReasonCodeInvalidError unconditionally. A valid (code, action) pair must therefore
    // fail DIFFERENTLY: it gets to the database, where the refusing client makes it blow up.
    //
    // The assertion is "not the 422", not a specific message: Drizzle wraps the client rather than
    // calling `query` directly, so the surfaced error is its own. What matters is that the guard
    // let this pair through — which is exactly what a deleted guard could not fake.
    await expect(
      moderateMember(refusingClient(), {
        ...BASE,
        action: 'suspend',
        reasonCode: 'r14-forgery',
      }),
    ).rejects.not.toBeInstanceOf(ModerationReasonCodeInvalidError);
  });
});


// ── Story 10.20 (Task 8; AC10, WS-F) — the `ordinarilyResultsIn` GUIDANCE ────────────────────────
describe('ordinarilyResultsIn — ratified guidance, never policy (AC10)', () => {
  it('⚖ carries the Q6-RATIFIED values: `suspend` for all seven grounds, `null` for all three restores', () => {
    // ⛔ These are governance data (Decision `2026-08-12-099`), not an implementation default. A dev
    // agent may not substitute its own — which is precisely why they are asserted literally here
    // rather than derived from `appliesTo`.
    for (const code of MODERATION_REASON_CODES) {
      expect(REASON_CODE_REGISTRY[code].ordinarilyResultsIn, code).toBe('suspend');
    }
    for (const code of RESTORE_REASON_CODES) {
      expect(REASON_CODE_REGISTRY[code].ordinarilyResultsIn, code).toBeNull();
    }
  });

  it('⭐ every moderation ground says `suspend` even though each may equally justify a TERMINATION', () => {
    // §8.6 principle 2: *"a reason code does not itself terminate a member; the Trustee Panel
    // decides whether the actual case warrants suspension or termination."* The Panel escalates by
    // RECORDING WHY (the two-part escalation test), not by the registry pre-empting it. A registry
    // that guided toward termination would move the decision — FR-57's prohibition is a prohibition
    // on the decision moving.
    for (const code of MODERATION_REASON_CODES) {
      expect(REASON_CODE_REGISTRY[code].appliesTo).toContain('terminate');
      expect(REASON_CODE_REGISTRY[code].ordinarilyResultsIn).not.toBe('terminate');
    }
  });

  it('⛔ the field is present on EVERY code — required, so a ground cannot ship without guidance', () => {
    // The `satisfies Record<ReasonCode, ReasonCodeMeta>` makes this a COMPILE error, but the value
    // half needs a runtime pin: an OPTIONAL field would let a new moderation ground ship with no
    // guidance silently, which is the exact discipline this AC invokes.
    for (const m of listReasonCodeMeta()) {
      expect(m, m.code).toHaveProperty('ordinarilyResultsIn');
    }
  });

  it('⛔ WS-F does NOT reopen the vocabulary boundary — `appliesTo` is unchanged', () => {
    // `epics.md:3866` forbids narrowing `appliesTo`. A dev agent that "satisfies FR-56" by narrowing
    // `MODERATION_APPLIES_TO` has violated the epic AC and pre-empted the Panel — the enumeration
    // lives in Niyamavali §8.5 (governance text), not in this registry.
    for (const code of MODERATION_REASON_CODES) {
      expect([...REASON_CODE_REGISTRY[code].appliesTo]).toEqual(['suspend', 'terminate']);
    }
    for (const code of RESTORE_REASON_CODES) {
      expect([...REASON_CODE_REGISTRY[code].appliesTo]).toEqual(['restore']);
    }
    // And the vocabulary itself is frozen at TEN — no code added, none removed.
    expect(ALL_REASON_CODES).toHaveLength(10);
  });
});
