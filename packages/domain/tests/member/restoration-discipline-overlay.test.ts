// The restoration-discipline overlay + imposition predicate — Story 10.23. PURE, DB-free.
//
// Everything here is the pure core of AC2/AC4/AC5: the fold, the episode identity, and the ratified
// imposition predicate. Keeping them DB-free is deliberate — this logic decides whether a member's
// COVERAGE is removed, and it must be exhaustively testable without a live database.

import { describe, expect, it } from 'vitest';

import {
  evaluateRestorationDisciplineOverlay,
  NO_RESTORATION_DISCIPLINE,
  type RestorationDisciplineOverlayEventInput,
} from '../../src/member/restoration-discipline/overlay.js';
import {
  episodeKeyOf,
  hasUnsatisfiableCompletionCondition,
  readLockInMonths,
  shouldImpose,
  UNSATISFIABLE_COMPLETION_KEYS,
} from '../../src/member/restoration-discipline/write.js';
import { RESTORATION_DISCIPLINE_IMPOSED_EVENT } from '../../src/member/restoration-discipline/status.js';

const CLAUSE_VERSION = '0e1c0009-0000-4000-8000-000000000009';
const POLICY_VERSION = '0e1c00ff-0000-4000-8000-0000000000ff';

/**
 * A well-formed imposition event. `months` only labels the payload; `expiresAt` is authoritative.
 * `completionUnsatisfiable` defaults to `true` because most fixtures in this file model R7(D)/(E)/(F)
 * — override to `false` to model a satisfiable (`consecutive_required`) rung.
 */
function imposition(opts: {
  clauseId: string;
  imposedAt: string;
  expiresAt: string;
  episodeKey?: string;
  months?: number;
  completionUnsatisfiable?: boolean;
}): RestorationDisciplineOverlayEventInput {
  return {
    type: RESTORATION_DISCIPLINE_IMPOSED_EVENT,
    occurredAt: new Date(opts.imposedAt),
    payload: {
      from_state: 'active',
      to_state: 'active',
      trigger: 'restoration_discipline.imposed',
      actor: 'system',
      clause_id: opts.clauseId,
      clause_version_id: CLAUSE_VERSION,
      policy_clause_version_id: POLICY_VERSION,
      lock_in_months: opts.months ?? 3,
      concurrency_rule: 'max_over_live',
      imposed_at: opts.imposedAt,
      expires_at: opts.expiresAt,
      episode_key: opts.episodeKey ?? '2026-03-15T00:00:00.000Z|skips:1',
      completion_unsatisfiable: opts.completionUnsatisfiable ?? true,
    },
  };
}

describe('Story 10.23 — the overlay fold is PURE and TOTAL (AC1)', () => {
  const at = new Date('2026-05-01T00:00:00.000Z');

  it('an empty stream folds to the not-imposed verdict', () => {
    expect(evaluateRestorationDisciplineOverlay([], at)).toEqual(NO_RESTORATION_DISCIPLINE);
  });

  it('an UNKNOWN event type is IDENTITY, never a throw — the fold must survive any stream', () => {
    const events: RestorationDisciplineOverlayEventInput[] = [
      { type: 'member.address_updated', occurredAt: at, payload: { anything: true } },
      { type: 'member.restoration_discipline.lifted', occurredAt: at, payload: {} },
    ];
    expect(evaluateRestorationDisciplineOverlay(events, at)).toEqual(NO_RESTORATION_DISCIPLINE);
  });

  it('a MALFORMED payload is IDENTITY — a hand-repaired or future-seeded event cannot crash replay', () => {
    const malformed: RestorationDisciplineOverlayEventInput[] = [
      { type: RESTORATION_DISCIPLINE_IMPOSED_EVENT, occurredAt: at, payload: null },
      { type: RESTORATION_DISCIPLINE_IMPOSED_EVENT, occurredAt: at, payload: 'nonsense' },
      { type: RESTORATION_DISCIPLINE_IMPOSED_EVENT, occurredAt: at, payload: {} },
      // An unparseable expiry must not become an `Invalid Date` that silently compares false.
      {
        type: RESTORATION_DISCIPLINE_IMPOSED_EVENT,
        occurredAt: at,
        payload: { ...(imposition({ clauseId: 'x', imposedAt: at.toISOString(), expiresAt: 'not-a-date' }).payload as object) },
      },
      // `lock_in_months: 0` must not fold as a live imposition (D3 — R7(A) ships exactly that).
      {
        type: RESTORATION_DISCIPLINE_IMPOSED_EVENT,
        occurredAt: at,
        payload: { ...(imposition({ clauseId: 'x', imposedAt: at.toISOString(), expiresAt: '2026-08-01T00:00:00.000Z', months: 0 }).payload as object) },
      },
      // An unrecognized concurrency rule is not a rule this build can honour — skipped, not guessed.
      {
        type: RESTORATION_DISCIPLINE_IMPOSED_EVENT,
        occurredAt: at,
        payload: { ...(imposition({ clauseId: 'x', imposedAt: at.toISOString(), expiresAt: '2026-08-01T00:00:00.000Z' }).payload as object), concurrency_rule: 'sum_of_all' },
      },
      // A non-boolean `completion_unsatisfiable` cannot be trusted to gate the re-imposition bar.
      {
        type: RESTORATION_DISCIPLINE_IMPOSED_EVENT,
        occurredAt: at,
        payload: { ...(imposition({ clauseId: 'x', imposedAt: at.toISOString(), expiresAt: '2026-08-01T00:00:00.000Z' }).payload as object), completion_unsatisfiable: 'yes' },
      },
    ];
    expect(evaluateRestorationDisciplineOverlay(malformed, at)).toEqual(NO_RESTORATION_DISCIPLINE);
  });

  it('replaying the same stream twice yields the same verdict (the determinism P0)', () => {
    const events = [
      imposition({ clauseId: 'r7-d', imposedAt: '2026-04-01T00:00:00.000Z', expiresAt: '2026-07-01T00:00:00.000Z' }),
    ];
    expect(evaluateRestorationDisciplineOverlay(events, at)).toEqual(
      evaluateRestorationDisciplineOverlay(events, at),
    );
  });
});

describe('Story 10.23 — expiry is DERIVED at read, never evented (AC4)', () => {
  const events = [
    imposition({ clauseId: 'r7-d', imposedAt: '2026-04-01T00:00:00.000Z', expiresAt: '2026-07-01T00:00:00.000Z' }),
  ];

  it('is in-lock-in BEFORE the expiry instant', () => {
    const o = evaluateRestorationDisciplineOverlay(events, new Date('2026-06-30T23:59:59.999Z'));
    expect(o.state).toBe('in-lock-in');
    expect(o.expiresAt?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(o.imposedAt?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('the SAME event stream reads as expired once the instant passes — no event, no job', () => {
    // ⭐ The whole of AC4 in one assertion: nothing was appended, nothing ran, and the state flipped.
    const o = evaluateRestorationDisciplineOverlay(events, new Date('2026-07-01T00:00:00.001Z'));
    expect(o.state).toBe('expired');
    expect(o.expiresAt).toBeNull();
  });

  it('the expiry instant ITSELF is already expired — a half-open [imposedAt, expiresAt) window', () => {
    // Matches `projectLockInStatus`'s `now >= unlockDate ? 'unlocked' : 'in-lock-in'` exactly, so a
    // member is never locked one millisecond longer because two instruments disagreed on boundaries.
    expect(evaluateRestorationDisciplineOverlay(events, new Date('2026-07-01T00:00:00.000Z')).state).toBe(
      'expired',
    );
  });

  it('EXPIRED is distinguishable from NEVER-IMPOSED — the history is what the AC2 bar reads', () => {
    const o = evaluateRestorationDisciplineOverlay(events, new Date('2027-01-01T00:00:00.000Z'));
    expect(o.state).toBe('expired');
    expect(o.impositions).toHaveLength(1);
    expect(evaluateRestorationDisciplineOverlay([], at2()).state).toBe('never-imposed');
  });

  function at2() {
    return new Date('2027-01-01T00:00:00.000Z');
  }
});

describe('Story 10.23 — ⭐ AC5: concurrent impositions combine by MAXIMUM (ratified 2026-08-07-088 §1)', () => {
  // Two live impositions with DIFFERENT expiries. §3.1 is silent on combination; the Panel ratified
  // the non-shortening `max` reading, and rejected replacement by name because it would let a member
  // draw a LESSER imposition to discharge a GREATER one already in force.
  const events = [
    imposition({
      clauseId: 'niy.contribution-discipline.r7-e',
      imposedAt: '2026-04-01T00:00:00.000Z',
      expiresAt: '2026-09-01T00:00:00.000Z', // 5 months — the GREATER
      months: 5,
      episodeKey: '2026-03-01T00:00:00.000Z|skips:2',
    }),
    imposition({
      clauseId: 'niy.contribution-discipline.r7-d',
      imposedAt: '2026-05-01T00:00:00.000Z',
      expiresAt: '2026-08-01T00:00:00.000Z', // 3 months — the LESSER, imposed LATER
      months: 3,
      episodeKey: '2026-04-20T00:00:00.000Z|skips:3',
    }),
  ];
  const o = evaluateRestorationDisciplineOverlay(events, new Date('2026-06-01T00:00:00.000Z'));

  it('takes the MAXIMUM expiry — never the minimum, never a replacement, never a sum', () => {
    expect(o.state).toBe('in-lock-in');
    expect(o.expiresAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    // The minimum would SHORTEN a live consequence (contrary to §1d non-subsumption / 2026-08-06-079).
    expect(o.expiresAt?.toISOString()).not.toBe('2026-08-01T00:00:00.000Z');
    // A sum would INVENT a longer consequence than §3.1's per-rung table prescribes (8 months).
    expect(o.expiresAt?.getTime()).toBeLessThan(new Date('2026-11-01T00:00:00.000Z').getTime());
  });

  it('a LATER, LESSER imposition does NOT replace a greater one already in force', () => {
    // Replacement was rejected specifically because of the incentive it creates. The later event is
    // last in stream order, so a naive "last write wins" fold would return the 3-month expiry.
    expect(o.expiresAt?.toISOString()).not.toBe('2026-08-01T00:00:00.000Z');
  });

  it('imposedAt spans the whole period — the EARLIEST live imposition, paired with the MAX expiry', () => {
    expect(o.imposedAt?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('the clocks expire INDEPENDENTLY — the lesser elapsing leaves the greater untouched', () => {
    const later = evaluateRestorationDisciplineOverlay(events, new Date('2026-08-15T00:00:00.000Z'));
    expect(later.state).toBe('in-lock-in');
    expect(later.expiresAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    // And only once BOTH have elapsed is the instrument out of force.
    expect(
      evaluateRestorationDisciplineOverlay(events, new Date('2026-09-01T00:00:00.001Z')).state,
    ).toBe('expired');
  });
});

describe('Story 10.23 — the episode identity (AC2, ratified 2026-08-07-088 §3)', () => {
  it('anchors on the EARLIEST unresolved skip when there is one', () => {
    expect(
      episodeKeyOf({
        earliestSkipClosedAt: new Date('2026-03-15T00:00:00.000Z'),
        lastConfirmedAt: new Date('2026-02-01T00:00:00.000Z'),
        skipsCurrentYear: 1,
      }),
    ).toBe('2026-03-15T00:00:00.000Z|skips:1');
  });

  it('falls back to the last confirmation for a GAP rung (R7(C)/(F): no skip, only absence)', () => {
    expect(
      episodeKeyOf({
        earliestSkipClosedAt: null,
        lastConfirmedAt: new Date('2025-06-01T00:00:00.000Z'),
        skipsCurrentYear: 0,
      }),
    ).toBe('2025-06-01T00:00:00.000Z|skips:0');
  });

  it('a member with NO contribution record at all still has a stable key', () => {
    expect(
      episodeKeyOf({ earliestSkipClosedAt: null, lastConfirmedAt: null, skipsCurrentYear: 0 }),
    ).toBe('no-record|skips:0');
  });

  it('a NEW skip changes the key; mere TIME PASSING does not', () => {
    const base = {
      earliestSkipClosedAt: new Date('2026-03-15T00:00:00.000Z'),
      lastConfirmedAt: new Date('2026-02-01T00:00:00.000Z'),
    };
    const one = episodeKeyOf({ ...base, skipsCurrentYear: 1 });
    // Same facts re-read a year later — identical. This is what makes the bar bite.
    expect(episodeKeyOf({ ...base, skipsCurrentYear: 1 })).toBe(one);
    // A genuinely new missed cycle — different episode, imposes normally.
    expect(episodeKeyOf({ ...base, skipsCurrentYear: 2 })).not.toBe(one);
  });

  it('every key matches the strict payload schema shape (no free text on the event stream)', () => {
    const shape = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z|no-record)\|skips:\d+$/;
    expect(episodeKeyOf({ earliestSkipClosedAt: new Date('2026-03-15T10:20:30.400Z'), lastConfirmedAt: null, skipsCurrentYear: 4 })).toMatch(shape);
    expect(episodeKeyOf({ earliestSkipClosedAt: null, lastConfirmedAt: null, skipsCurrentYear: 0 })).toMatch(shape);
  });
});

describe('Story 10.23 — the clause-payload predicates (D3, D8)', () => {
  it('⛔ R7(A) contributes NO lock-in duration — `lock_in_months: 0` prescribes nothing (D3)', () => {
    // The single easiest mistake in this story: `imposesRestorationObligation` returns TRUE for
    // R7(A) (it has `consecutive_required: 3`), so a trigger reading only that predicate would give
    // every R7(A) member a zero-length lock-in.
    expect(readLockInMonths({ restoration: { consecutive_required: 3, lock_in_months: 0 } })).toBeNull();
    expect(readLockInMonths({ restoration: { lock_in_months: 3, catch_up_required: true } })).toBe(3);
    expect(readLockInMonths({ restoration: {} })).toBeNull();
    expect(readLockInMonths({})).toBeNull();
    expect(readLockInMonths({ restoration: { lock_in_months: -1 } })).toBeNull();
    expect(readLockInMonths({ restoration: { lock_in_months: 2.5 } })).toBeNull();
  });

  it('names catch_up_required / complete_all as the UNSATISFIABLE completion conditions (D8)', () => {
    // These two ARE the Escalation-6 gap: no ratified workflow can discharge either today.
    expect([...UNSATISFIABLE_COMPLETION_KEYS].sort()).toEqual(['catch_up_required', 'complete_all']);
    expect(hasUnsatisfiableCompletionCondition({ restoration: { lock_in_months: 3, catch_up_required: true } })).toBe(true);
    expect(hasUnsatisfiableCompletionCondition({ restoration: { lock_in_months: 5, complete_all: true } })).toBe(true);
    // R7(B)/(C)'s consecutive-contribution package IS completable through ordinary contribution.
    expect(hasUnsatisfiableCompletionCondition({ restoration: { lock_in_months: 3, consecutive_required: 5 } })).toBe(false);
    // `false` prescribes nothing — presence is not prescription.
    expect(hasUnsatisfiableCompletionCondition({ restoration: { complete_all: false } })).toBe(false);
  });
});

describe('Story 10.23 — ⛔ the imposition predicate, incl. the ratified re-imposition bar (AC2, matching mechanism corrected by Decision 2026-08-08-091)', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');
  const R7D = 'niy.contribution-discipline.r7-d';
  const r7dPayload = { restoration: { lock_in_months: 3, catch_up_required: true } };
  const r7cPayload = { restoration: { lock_in_months: 3, consecutive_required: 5 } };
  const EPISODE = '2026-03-15T00:00:00.000Z|skips:1';

  const overlayOf = (events: RestorationDisciplineOverlayEventInput[]) =>
    evaluateRestorationDisciplineOverlay(events, now);

  it('imposes on a clean member whose clause prescribes a positive lock-in', () => {
    expect(shouldImpose(overlayOf([]), R7D, r7dPayload, now)).toEqual({ impose: true });
  });

  it('refuses when the clause prescribes NO lock-in duration (R7(A)) — D3', () => {
    expect(
      shouldImpose(overlayOf([]), 'niy.contribution-discipline.r7-a', { restoration: { consecutive_required: 3, lock_in_months: 0 } }, now),
    ).toEqual({ impose: false, reason: 'no-lock-in-duration' });
  });

  it('is IDEMPOTENT while a lock-in for the same clause is LIVE', () => {
    const live = overlayOf([
      imposition({ clauseId: R7D, imposedAt: '2026-05-01T00:00:00.000Z', expiresAt: '2026-08-01T00:00:00.000Z', episodeKey: EPISODE }),
    ]);
    expect(shouldImpose(live, R7D, r7dPayload, now)).toEqual({
      impose: false,
      reason: 'already-live-for-clause',
    });
  });

  it('⛔ does NOT re-impose after expiry while the SAME unresolved episode stays unsatisfiable', () => {
    // ⭐ THE RATIFIED RULE (Decision 2026-08-07-088 clause 3). Without it, a member under R7(D) whose
    // skip cannot be cleared — because no catch-up channel exists — would be re-locked on every scan
    // until the skip aged out at the IST year boundary: a bounded consequence turned into a
    // machine-imposed permanent coverage removal, which is structurally Story 10.17's failure
    // arriving through a different door.
    const expired = overlayOf([
      imposition({ clauseId: R7D, imposedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-04-01T00:00:00.000Z', episodeKey: EPISODE }),
    ]);
    expect(expired.state).toBe('expired');
    expect(shouldImpose(expired, R7D, r7dPayload, now)).toEqual({
      impose: false,
      reason: 'same-unresolved-episode',
    });
  });

  it('⭐ REGRESSION PIN (Decision 2026-08-08-091): a FRESH skip / IST-year rollover while still unsatisfiable does NOT start a new episode', () => {
    // ⛔ THE BUG THIS DECISION FIXED. `skipsCurrentYear` is IST-CALENDAR-YEAR scoped, so it — and the
    // anchor instant paired with it — moves at the year boundary and on every further missed cycle,
    // REGARDLESS of member action. For R7(D)/(E)/(F) (Escalation 6: no catch-up channel exists) that
    // further skip is mechanical and guaranteed, not a choice: the roster keeps assigning the member
    // (AC6) and they remain unable to pay. Matching on the freshly-computed `episode_key` therefore
    // reproduced, through skip-count drift, exactly the "de-facto permanent, machine-imposed coverage
    // removal" the ratified rule bars. A round-2 review of this story caught it before the AC14
    // rollout flag (default OFF) could ever make it reachable in production.
    const expired = overlayOf([
      imposition({ clauseId: R7D, imposedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-04-01T00:00:00.000Z', episodeKey: EPISODE }),
    ]);
    // A fresh `episode_key` (a further skip, or a year rollover) is passed to `episodeKeyOf` by the
    // caller for AUDIT purposes only — `shouldImpose` no longer takes it, and no longer cares.
    expect(shouldImpose(expired, R7D, r7dPayload, now)).toEqual({
      impose: false,
      reason: 'same-unresolved-episode',
    });
  });

  it('the bar LIFTS automatically once the clause is no longer unsatisfiable — the documented discharge path, no backfill', () => {
    // Simulates Escalation 6 being discharged (`UNSATISFIABLE_COMPLETION_KEYS` shrinking, or a later
    // clause version dropping `catch_up_required`/`complete_all`). The CURRENT candidate's payload
    // governs the outer gate, so the bar releases with NO rewrite of the already-written historical
    // row — exactly what `write.ts`'s `UNSATISFIABLE_COMPLETION_KEYS` doc comment promises.
    const expired = overlayOf([
      imposition({ clauseId: R7D, imposedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-04-01T00:00:00.000Z', episodeKey: EPISODE }),
    ]);
    const dischargedPayload = { restoration: { lock_in_months: 3, consecutive_required: 5 } };
    expect(shouldImpose(expired, R7D, dischargedPayload, now)).toEqual({ impose: true });
  });

  it('DOES re-impose for the same episode when the package IS satisfiable — the bar is conditional', () => {
    // "…while the same unresolved episode's completion condition remains UNSATISFIABLE." A member
    // under a consecutive-contribution package can act, so §3.1's bounded-consequence logic is not
    // violated and the bar does not reach them. The historical imposition itself was also satisfiable
    // (`completionUnsatisfiable: false`) — a realistic R7(C) row — though the outer gate on the
    // CURRENT payload alone already decides this.
    const expired = overlayOf([
      imposition({
        clauseId: 'niy.contribution-discipline.r7-c',
        imposedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-04-01T00:00:00.000Z',
        episodeKey: EPISODE,
        completionUnsatisfiable: false,
      }),
    ]);
    expect(shouldImpose(expired, 'niy.contribution-discipline.r7-c', r7cPayload, now)).toEqual({
      impose: true,
    });
  });

  it('⭐ the bar does NOT block a CONCURRENT rung in the same episode — that is AC5\'s job, not this leg\'s', () => {
    // ⚠ REGRESSION PIN for an over-application caught in self-review. The ratified rule bars an
    // **EXPIRED** imposition from re-imposing; it says nothing about two rungs applying at once.
    // Testing every imposition regardless of liveness under-imposes: within one scan where R7(D)
    // (3 months) and R7(F) (5 months) both apply to a single episode, ascending clause-id order
    // writes R7(D) first, and a liveness-blind check would then refuse R7(F) — leaving the member
    // with 3 months where §3.1 prescribes 5. Concurrency is resolved by AC5's MAXIMUM, which is the
    // §3.1-faithful answer; this leg only stops a member being RE-locked after a period elapsed.
    const liveR7D = overlayOf([
      imposition({
        clauseId: R7D,
        imposedAt: '2026-05-01T00:00:00.000Z',
        expiresAt: '2026-08-01T00:00:00.000Z', // still LIVE at `now`
        episodeKey: EPISODE,
      }),
    ]);
    expect(liveR7D.state).toBe('in-lock-in');
    expect(
      shouldImpose(
        liveR7D,
        'niy.contribution-discipline.r7-f',
        { restoration: { lock_in_months: 5, complete_all: true } },
        now,
      ),
    ).toEqual({ impose: true });
  });

  it('the bar is CROSS-CLAUSE, not episode-key-scoped — a gap member drifting F→C (both unsatisfiable) is not re-locked', () => {
    // A member who drifts from R7(F) (6–11mo) into R7(C)-as-gap (≥12mo) has taken no new action and
    // resolved nothing. Matching on `completionUnsatisfiable` rather than clause id or episode key
    // catches this exactly as the original episode-scoped design intended.
    const expiredF = overlayOf([
      imposition({ clauseId: 'niy.contribution-discipline.r7-f', imposedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-04-01T00:00:00.000Z', episodeKey: '2025-06-01T00:00:00.000Z|skips:0' }),
    ]);
    expect(
      shouldImpose(expiredF, 'niy.contribution-discipline.r7-c', { restoration: { lock_in_months: 3, complete_all: true } }, now),
    ).toEqual({ impose: false, reason: 'same-unresolved-episode' });
  });
});
