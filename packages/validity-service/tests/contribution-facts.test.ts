// The PURE contribution-fact derivation — Story 10.24 (Task 3; AC2, AC3, AC5, D5, D6). DB-free.
//
// The Epic-4 determinism spine applies: the derivation is a pure function of (read anchors, pinned
// instant), so it is unit-tested exhaustively and without a database. Three families of assertion:
//
//   · AC2 — the calendar primitives are correct (AI-3-1), pinned at the leap/month boundaries where
//     fixed-ms arithmetic actually breaks. ⚠ These pin `calendar.ts`'s PRIMITIVES; they are no longer
//     the derivation of `months_since_last` — see the OPPORTUNITY block below.
//   · ⚖ OPPORTUNITY — `months_since_last` counts elapsed contribution OPPORTUNITIES, never wall-clock
//     time (ratified 2026-08-05). The block that stops a quiet Pariwar flagging its whole membership.
//   · D6  — un-derivable ≠ zero. The single most dangerous confusion in this file, and (since the
//     round-2 review) the one with a REACHABLE sentinel: no projection coverage ⇒ no facts.
//   · D5  — `missed-closed-cycle-v1` behaves as its documented policy says, including `lapseSince`.

import { contribution } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { addCalendarMonths, calendarMonthsBetween } from '../src/calendar.js';
import {
  CONTRIBUTION_LAPSE_POLICY,
  R7A_RESTORATION_POLICY,
  contributionFactsToBag,
  contributionFactsToSummary,
  deriveContributionFacts,
  deriveRestorationPackage,
} from '../src/producer.js';

const AT = new Date('2026-08-05T00:00:00.000Z');

/** Story 10.25 — opportunity-sequence shorthand. `T` = TAKEN (live-confirmed at `at`), `M` = MISSED. */
const T = true;
const M = false;

/** The PURE `consecutive-opportunity-restoration-v1` reference, pinned to the SQL by a live parity spec. */
const runs = contribution.deriveRestorationRuns;

const R7_A = 'niy.contribution-discipline.r7-a';
const R7_C = 'niy.contribution-discipline.r7-c';
const R7_D = 'niy.contribution-discipline.r7-d';

/** A coverage watermark old enough that `at` is always inside it — the "projection is complete" case. */
const COVERED_FROM = new Date('2020-01-01T00:00:00.000Z');

/**
 * Anchors for a member with a readable, ordinary history in a fully-backfilled Pariwar.
 *
 * ⚠ The three Story-10.25 anchors are REQUIRED, not optional. When 10.25 supplied
 * `contribution.r7a_restorations_used`, every call site here failed to compile — which is the
 * mechanization working: a new fact anchor must be stated for each fixture, never defaulted into
 * existence, because a defaulted `0` restoration count is an affirmative claim about a member.
 */
function inputs(over: Partial<Parameters<typeof deriveContributionFacts>[0]> = {}) {
  return {
    totalCount: 12,
    lastConfirmedAt: new Date('2026-07-05T00:00:00.000Z'),
    skipsCurrentYear: 0,
    earliestSkipClosedAt: null,
    opportunitiesSinceLast: 0,
    coveredFrom: COVERED_FROM,
    completedRestorationEpisodes: 0,
    currentOpenTakenRun: 0,
    // R7(A)'s seeded `restoration.consecutive_required`. Sourced from the CLAUSE DATA on the live path
    // (`facts.ts`'s scalar subquery); stated here as the fixture's registry state, never as a policy
    // constant this module owns.
    r7aConsecutiveRequired: 3,
    // Story 10.26 — the seventh anchor. Defaults to "never asserted", the overwhelmingly common case.
    personalEventAsserted: false,
    ...over,
  };
}

describe('AC2 — months_since_last is CALENDAR-correct (AI-3-1), never a fixed-ms span', () => {
  it('2024-01-31 → 2024-02-29 is exactly 1 month (not 0, not 2)', () => {
    // The canonical month-end + leap-day case. `+30 days` would say 0; naive month-index arithmetic
    // that overflows Jan-31 into Mar-02 before clamping would say 0 as well.
    expect(
      calendarMonthsBetween(new Date('2024-01-31T00:00:00Z'), new Date('2024-02-29T00:00:00Z')),
    ).toBe(1);
  });

  it('a Feb-29 anchor evaluated on Feb-28 of a COMMON year is exactly 12 months — no off-by-one', () => {
    expect(
      calendarMonthsBetween(new Date('2024-02-29T00:00:00Z'), new Date('2025-02-28T00:00:00Z')),
    ).toBe(12);
  });

  it('a month is not whole until its day-of-month anniversary is reached', () => {
    expect(
      calendarMonthsBetween(new Date('2026-01-15T00:00:00Z'), new Date('2026-02-14T23:59:59Z')),
    ).toBe(0);
    expect(
      calendarMonthsBetween(new Date('2026-01-15T00:00:00Z'), new Date('2026-02-15T00:00:00Z')),
    ).toBe(1);
  });

  it('addCalendarMonths clamps to the last day of the target month rather than overflowing', () => {
    expect(addCalendarMonths(new Date('2024-01-31T00:00:00Z'), 1).toISOString()).toBe(
      '2024-02-29T00:00:00.000Z',
    );
    expect(addCalendarMonths(new Date('2025-01-31T00:00:00Z'), 1).toISOString()).toBe(
      '2025-02-28T00:00:00.000Z',
    );
    expect(addCalendarMonths(new Date('2026-03-31T00:00:00Z'), -1).toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    );
  });

  it('never goes negative', () => {
    expect(calendarMonthsBetween(AT, new Date('2020-01-01T00:00:00Z'))).toBe(0);
  });
});

describe('⚖ months_since_last counts OPPORTUNITIES, never elapsed time (ratified 2026-08-05)', () => {
  // ⚠ THE most important block in this file. Ratified by BigDev during the Story 10.24 round-2 code
  // review: "Contribution discipline must always be evaluated against contribution opportunities,
  // never against elapsed time alone."
  //
  // The defect this prevents: contribution is only possible when a death claim freezes a cycle and a
  // pool assigns the member. A Pariwar with no death for six months offers NO opportunity — so a
  // wall-clock derivation trips R7(F) (`>= 6`) for EVERY member who ever contributed, and the clause
  // GENUINELY applies, which means D2's applied-only filter cannot catch it. The entire membership
  // lands on the surface that feeds suspension decisions. Most acute in small or low-mortality
  // Pariwars — i.e. exactly where the product starts.

  it('a member who missed NO opportunity has a ZERO gap, no matter how long ago they last paid', () => {
    // The quiet-Pariwar case, stated as bluntly as it can be: five years since the last confirmation,
    // and not one cycle closed on them in the meantime. They have not drifted; the Pariwar was quiet.
    const facts = deriveContributionFacts(
      inputs({
        lastConfirmedAt: new Date('2021-01-01T00:00:00.000Z'),
        opportunitiesSinceLast: 0,
      }),
      AT,
    );
    expect(facts?.monthsSinceLast).toBe(0);
  });

  it('the gap is the OPPORTUNITY count, not the calendar distance, when the two disagree', () => {
    // 13 wall-clock months elapsed, but only 2 cycles actually closed on this member. A calendar
    // derivation would report 13 and fire R7(C) (`>= 12`); the ratified one reports 2 and fires
    // nothing. The literal 2 is the whole point of the ruling — do not "fix" it to a date span.
    const facts = deriveContributionFacts(
      inputs({ lastConfirmedAt: new Date('2025-07-05T00:00:00.000Z'), opportunitiesSinceLast: 2 }),
      AT,
    );
    expect(facts?.monthsSinceLast).toBe(2);
  });

  it('still crosses the R7(C) boundary when the opportunities genuinely elapsed', () => {
    // The clause is NOT weakened: a member who was assigned to 12 closed cycles and paid none of them
    // reaches 12 and R7(C) applies exactly as before. Opportunity-awareness changes WHICH members
    // qualify, never the threshold.
    expect(deriveContributionFacts(inputs({ opportunitiesSinceLast: 12 }), AT)?.monthsSinceLast).toBe(12);
    expect(deriveContributionFacts(inputs({ opportunitiesSinceLast: 11 }), AT)?.monthsSinceLast).toBe(11);
  });

  it('rejects a structurally impossible opportunity count rather than reporting it', () => {
    expect(deriveContributionFacts(inputs({ opportunitiesSinceLast: -1 }), AT)).toBeNull();
    expect(deriveContributionFacts(inputs({ opportunitiesSinceLast: 2.5 }), AT)).toBeNull();
  });
});

describe('D6 — un-derivable is NOT zero (the never-fabricate rule)', () => {
  it('a readable history with no contributions genuinely derives totalCount 0 — that is DATA', () => {
    const facts = deriveContributionFacts(
      inputs({ totalCount: 0, lastConfirmedAt: null }),
      AT,
    );
    expect(facts).not.toBeNull();
    expect(facts?.totalCount).toBe(0);
    expect(facts?.everContributed).toBe(false);
  });

  it('OMITS months_since_last for a never-contributed member rather than inventing a large number', () => {
    // ⚠ Load-bearing, and the reason is normative rather than aesthetic: a never-contributed member is
    // precisely R7(B)'s population, R7(B) is HELD, and supplying "months since signup" here would fire
    // R7(C)/(F) on them — evaluating R7(B)'s case through a proxy, which prd.md:346 FORBIDS.
    const facts = deriveContributionFacts(inputs({ totalCount: 0, lastConfirmedAt: null }), AT);
    expect(facts?.monthsSinceLast).toBeNull();
    expect(contributionFactsToBag(facts!)).not.toHaveProperty('contribution.months_since_last');
  });

  it('returns null (→ the sentinel) when the Pariwar has NO projection coverage', () => {
    // ⚖ Ratified 2026-08-05: "Unknown projection state must never fabricate a clean member."
    //
    // This is the case the original implementation could not express. Every other `null` branch is a
    // structural impossibility given the SQL feeding it (a count(*) is never negative; a
    // max(confirmed_at) filtered by `confirmed_at <= at` is never in the future), so the sentinel was
    // DEAD CODE — and an un-run backfill rendered as an affirmative clean record for every member in
    // the Pariwar, on the surface that feeds suspension decisions.
    //
    // Note what the un-covered member looks like WITHOUT this guard: totalCount 0, everContributed
    // false, inLapse false — indistinguishable from a genuinely spotless member.
    const unprojected = inputs({ totalCount: 0, lastConfirmedAt: null, coveredFrom: null });
    expect(deriveContributionFacts(unprojected, AT)).toBeNull();
  });

  it('returns null for an `at` BEFORE the coverage watermark — the projection makes no claim there', () => {
    const coveredFrom = new Date('2026-01-01T00:00:00.000Z');
    // `lastConfirmedAt` is pinned BEFORE `coveredFrom` so the only thing separating the two assertions
    // is the coverage boundary itself — with the fixture default (a 2026-07 confirmation) both sides
    // would return null via the future-confirmation check and the test would pass vacuously.
    const atBoundary = inputs({
      coveredFrom,
      lastConfirmedAt: new Date('2025-12-01T00:00:00.000Z'),
    });
    // Exactly ON the watermark derives; one millisecond before it does not. Asserted on both sides so
    // an off-by-one cannot pass.
    expect(deriveContributionFacts(atBoundary, coveredFrom)).not.toBeNull();
    expect(
      deriveContributionFacts(atBoundary, new Date(coveredFrom.getTime() - 1)),
    ).toBeNull();
  });

  it('returns null (→ the sentinel) for STRUCTURALLY INCOHERENT inputs, never a clean-looking zero', () => {
    expect(deriveContributionFacts(inputs({ totalCount: -1 }), AT)).toBeNull();
    expect(deriveContributionFacts(inputs({ totalCount: 1.5 }), AT)).toBeNull();
    expect(deriveContributionFacts(inputs({ skipsCurrentYear: -2 }), AT)).toBeNull();
    // A confirmation in the future of the pinned instant is an as-of impossibility.
    expect(
      deriveContributionFacts(inputs({ lastConfirmedAt: new Date('2027-01-01T00:00:00Z') }), AT),
    ).toBeNull();
    // A positive skip count with no onset instant cannot produce an honest `lapseSince`.
    expect(
      deriveContributionFacts(inputs({ skipsCurrentYear: 1, earliestSkipClosedAt: null }), AT),
    ).toBeNull();
  });
});

describe('D5 — the missed-closed-cycle-v1 lapse policy (RATIFIED 2026-08-05-074)', () => {
  it('is the RATIFIED policy identifier — changing it is a governance change, not a refactor', () => {
    // ⚖ Ratified by BigDev on 2026-08-05 (Decision 2026-08-05-074), on the reasoning that
    // `contribution.in_lapse` is already part of the validity payload contract and no activated clause
    // depends on it yet — making that the lowest-cost moment to pin it. The consequence is that the
    // standard for changing this rule went UP, not down: a future re-pin is a trustee-level governance
    // change requiring a superseding decision-log entry.
    //
    // This assertion is deliberately a bare literal so that a re-pin cannot ride along inside an
    // unrelated refactor — it must be an explicit, reviewed edit to a test that says why.
    expect(CONTRIBUTION_LAPSE_POLICY).toBe('missed-closed-cycle-v1');
  });

  it('in_lapse iff skips_current_year > 0, with lapseSince = the EARLIEST missed close', () => {
    const closed = new Date('2026-03-20T00:00:00.000Z');
    const lapsed = deriveContributionFacts(
      inputs({ skipsCurrentYear: 2, earliestSkipClosedAt: closed }),
      AT,
    );
    expect(lapsed?.inLapse).toBe(true);
    expect(lapsed?.lapseSince).toBe(closed.toISOString());

    const clean = deriveContributionFacts(inputs({ skipsCurrentYear: 0 }), AT);
    expect(clean?.inLapse).toBe(false);
    expect(clean?.lapseSince).toBeNull();
  });

  it('lapseSince is NEVER the evaluation instant — they are different claims (AC5)', () => {
    const facts = deriveContributionFacts(
      inputs({ skipsCurrentYear: 1, earliestSkipClosedAt: new Date('2026-03-20T00:00:00.000Z') }),
      AT,
    );
    expect(facts?.lapseSince).not.toBe(AT.toISOString());
  });
});

describe('AC3/AC5 — the fact bag and the payload ok arm', () => {
  it('emits EXACTLY the seven supplied keys, dotted — none held back', () => {
    const bag = contributionFactsToBag(deriveContributionFacts(inputs(), AT)!);
    expect(Object.keys(bag).sort()).toEqual([
      'contribution.ever_contributed',
      'contribution.in_lapse',
      'contribution.months_since_last',
      'contribution.personal_event_excuse_claimed',
      'contribution.r7a_restorations_used',
      'contribution.skips_current_year',
      'contribution.total_count',
    ]);
    // Story 10.26 — the seventh key is now PRESENT and UNCONDITIONAL. `false` is a real answer about
    // the member (they have never asserted), not an unresolved one, so unlike `months_since_last` and
    // `r7a_restorations_used` it is never omitted from the bag.
    expect(bag).toHaveProperty('contribution.personal_event_excuse_claimed', false);
  });

  it('the ok arm keys facts by the DOTTED keys deriveViolatorFlags filters on, and holds NOTHING', () => {
    const summary = contributionFactsToSummary(deriveContributionFacts(inputs(), AT)!, null);
    expect(summary.status).toBe('ok');
    // The consumer filters with `startsWith('contribution.')` — every key must survive that filter.
    for (const key of Object.keys(summary.facts)) expect(key.startsWith('contribution.')).toBe(true);
    // Story 10.25 discharged the `r7a_restorations_used` half of the 10.24 hold; Story 10.26
    // discharged the other. The honest hold is now EMPTY — every engine key has a producer.
    expect(summary.heldFacts).toEqual([]);
  });
});

// ── Story 10.26 — the SEVENTH fact: an as-of existential, never a fabricated false (AC3; D5) ──────
describe('AC3 — contribution.personal_event_excuse_claimed', () => {
  it('is false for a member who has never asserted', () => {
    const facts = deriveContributionFacts(inputs({ personalEventAsserted: false }), AT)!;
    expect(facts.personalEventAsserted).toBe(false);
    expect(contributionFactsToBag(facts)['contribution.personal_event_excuse_claimed']).toBe(false);
  });

  it('is true once the member has asserted', () => {
    const facts = deriveContributionFacts(inputs({ personalEventAsserted: true }), AT)!;
    expect(facts.personalEventAsserted).toBe(true);
    expect(contributionFactsToBag(facts)['contribution.personal_event_excuse_claimed']).toBe(true);
  });

  it('SEVERAL assertions are still exactly one `true` — a lifetime existential, not a count (D5)', () => {
    // The read is an EXISTS, so "asserted three times" and "asserted once" reach the derivation
    // identically. Pinned so nobody later widens the anchor into a count and changes the wire type:
    // `R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED` is a BOOL and the clause reads
    // `fact_equals … value: true`. Both are frozen wire contract.
    const once = deriveContributionFacts(inputs({ personalEventAsserted: true }), AT)!;
    const thrice = deriveContributionFacts(inputs({ personalEventAsserted: true }), AT)!;
    expect(once.personalEventAsserted).toBe(thrice.personalEventAsserted);
    expect(typeof once.personalEventAsserted).toBe('boolean');
  });

  it('an assertion made AFTER `at` is not visible at `at` — as-of correctness (AC3)', () => {
    // As-of correctness lives in the READ (`hasAssertedPersonalEventAt` filters `occurred_at <= at`);
    // what this pins is that the derivation adds no clock of its own and cannot re-introduce "now".
    // A replay at a historical `at` therefore sees the anchor the read produced for that instant —
    // which is what `apps/jobs/src/assignable-roster.ts`'s `getValidityAt(..., committedAt)` and Epic
    // 4's "Replayable for audit" (prd.md:425) require.
    const before = deriveContributionFacts(inputs({ personalEventAsserted: false }), AT)!;
    const after = deriveContributionFacts(inputs({ personalEventAsserted: true }), AT)!;
    expect(before.personalEventAsserted).toBe(false);
    expect(after.personalEventAsserted).toBe(true);
  });

  it('⭐ NEVER rides alone: an assertion on an UN-DERIVABLE member yields the sentinel, not a lone fact', () => {
    // The coverage gate is respected. `coveredFrom === null` means the Pariwar's projection never ran,
    // and the honest answer is `producer_unavailable` for the WHOLE summary — not a payload carrying
    // one true fact and six missing ones. The assertion's own source (`events_log`) has no backfill
    // horizon, but that does NOT exempt the payload from the gate.
    expect(
      deriveContributionFacts(inputs({ personalEventAsserted: true, coveredFrom: null }), AT),
    ).toBeNull();
    // ... and equally for an `at` that precedes the watermark.
    expect(
      deriveContributionFacts(
        inputs({ personalEventAsserted: true, coveredFrom: new Date('2026-09-01T00:00:00.000Z') }),
        AT,
      ),
    ).toBeNull();
  });
});

// ── Story 10.25 — `consecutive-opportunity-restoration-v1` (AC1, AC2, AC7; D1) ────────────────────
//
// ⚠ These assert the POLICY, which is RATIFIED (Decision 2026-08-06-076) and whose re-pin window is
// CLOSED. Each case below is one a naive reading gets wrong, and each wrong answer lands on a member's
// record on the clause that decides whether their restoration path still exists at all. A change here
// is a superseding decision-log entry, never a fixture update.

describe('AC1 — a restoration is consumed on COMPLETION, and episodes are RUNS', () => {
  it('is the RATIFIED policy identifier — changing it is a governance change, not a refactor', () => {
    // Deliberately a bare literal, for the same reason `CONTRIBUTION_LAPSE_POLICY` is: a re-pin must
    // be an explicit, reviewed edit to a test that says why, never a passenger in a refactor.
    expect(R7A_RESTORATION_POLICY).toBe('consecutive-opportunity-restoration-v1');
  });

  it('SIX consecutive taken after a miss is ONE restoration, not two — episodes are runs', () => {
    // The `floor(run / required)` error. The member restored once and then kept contributing; reading
    // that as two consumed restorations moves them two-thirds of the way to R7(A)'s lifetime cap for
    // the offence of being diligent.
    expect(runs([M, T, T, T, T, T, T], 3).completedEpisodes).toBe(1);
  });

  it('TEN taken from the very first opportunity, never missed, is ZERO — the preceding-MISS gate', () => {
    // The single most damaging way to get this wrong. Without the gate every member who has never
    // missed reads as having burned restorations and is pushed toward R7(B), the HARSHER clause.
    expect(runs([T, T, T, T, T, T, T, T, T, T], 3).completedEpisodes).toBe(0);
    expect(runs([T, T, T, T, T, T, T, T, T, T], 3).currentOpenRun).toBe(0);
  });

  it('a SHORT run then a LONG run counts only the run that completed', () => {
    // MISS, TAKE, TAKE, MISS, TAKE, TAKE, TAKE → the first run is 2, short of 3; only the second one
    // completes the package.
    expect(runs([M, T, T, M, T, T, T], 3).completedEpisodes).toBe(1);
  });

  it('an IN-PROGRESS package is not a consumed one', () => {
    // MISS, TAKE, TAKE → 0 consumed, and 1 contribution still to go (AC4 reads the same run).
    const summary = runs([M, T, T], 3);
    expect(summary.completedEpisodes).toBe(0);
    expect(summary.currentOpenRun).toBe(2);
  });

  it('a MISS mid-run breaks the run — a reversal that turns a TAKEN into a MISS un-completes it', () => {
    // The same seven opportunities, differing only in whether the fourth was live-confirmed AT `at`.
    // A Story 9.5 reversal naming that confirmation flips it to MISSED and the 6-run becomes 3+2.
    expect(runs([M, T, T, T, T, T, T], 3).completedEpisodes).toBe(1);
    expect(runs([M, T, T, T, M, T, T], 3).completedEpisodes).toBe(1); // the first 3 still completed
    expect(runs([M, T, T, M, T, T], 3).completedEpisodes).toBe(0); // neither run reaches 3
  });

  it('an EMPTY opportunity sequence is zero episodes and no open package', () => {
    // A member never assigned to a closed cycle, and a member whose cycles are all still OPEN, both
    // arrive here as an empty sequence: neither had anything to take, so neither missed anything.
    expect(runs([], 3)).toEqual({ completedEpisodes: 0, currentOpenRun: 0 });
  });

  it('respects the clause DATA threshold rather than a hardcoded 3', () => {
    // R7(B)/(C) prescribe FIVE. The same sequence answers differently under a different clause, which
    // is the whole reason `consecutive_required` is read from the registry.
    expect(runs([M, T, T, T], 3).completedEpisodes).toBe(1);
    expect(runs([M, T, T, T], 5).completedEpisodes).toBe(0);
    expect(runs([M, T, T, T, T, T], 5).completedEpisodes).toBe(1);
  });

  it('the count is NOT clamped — `lifetime_max` is clause data, not a producer concern', () => {
    // Four separate completed episodes. A producer that clamped at R7(A)'s `lifetime_max: 2` would
    // make "used 2" and "used 7" indistinguishable and would put a governance threshold in code.
    const sequence = [M, T, T, T, M, T, T, T, M, T, T, T, M, T, T, T];
    expect(runs(sequence, 3).completedEpisodes).toBe(4);
    expect(
      deriveContributionFacts(inputs({ completedRestorationEpisodes: 7 }), AT)?.r7aRestorationsUsed,
    ).toBe(7);
  });
});

describe('AC2 — "consecutive" is an OPPORTUNITY predicate, and in_lapse is the WRONG gate', () => {
  it('a DECEMBER miss cured by three JANUARY takes is a completed restoration', () => {
    // ⚠ THE TRAP. `contribution.in_lapse` is `missed-closed-cycle-v1`, scoped to the CURRENT IST
    // CALENDAR YEAR. Keyed off it, the December miss is invisible from 1 January and this member's
    // completed restoration evaporates on New Year's Day. The episode-opening lapse is a SEQUENCE
    // fact, not a YEAR fact — the two are deliberately different and must never be collapsed.
    const facts = deriveContributionFacts(
      inputs({
        // Evaluated in January: no skip lands in THIS IST year, so `in_lapse` is false …
        skipsCurrentYear: 0,
        earliestSkipClosedAt: null,
        // … and yet the December-miss-then-three-January-takes episode genuinely completed.
        completedRestorationEpisodes: runs([M, T, T, T], 3).completedEpisodes,
        currentOpenTakenRun: runs([M, T, T, T], 3).currentOpenRun,
      }),
      AT,
    );
    expect(facts?.inLapse).toBe(false);
    expect(facts?.r7aRestorationsUsed).toBe(1);
  });
});

describe('AC7 — an un-resolvable threshold is UNKNOWN, never a fabricated zero', () => {
  it('OMITS r7a_restorations_used when R7(A) resolves to no clause version', () => {
    // "We could not resolve how long a restoration is" and "this member has completed none" are
    // different claims. The engine's `hasFact` guard resolves the absent key to a failed condition,
    // which is the honest outcome; a `0` would be an affirmative statement about the member.
    const facts = deriveContributionFacts(inputs({ r7aConsecutiveRequired: null }), AT);
    expect(facts?.r7aRestorationsUsed).toBeNull();
    expect(contributionFactsToBag(facts!)).not.toHaveProperty('contribution.r7a_restorations_used');
  });

  it('treats a corrupt (non-positive / non-integer) threshold as UNRESOLVED, not as "every run counts"', () => {
    for (const bad of [0, -3, 2.5]) {
      expect(
        deriveContributionFacts(inputs({ r7aConsecutiveRequired: bad }), AT)?.r7aRestorationsUsed,
      ).toBeNull();
    }
  });

  it('still returns the sentinel when the Pariwar has NO coverage, threshold or not', () => {
    // Coverage is checked FIRST: the restoration count is only as deep as the backfill horizon, and a
    // restoration completed before `covered_from` is invisible. The sentinel — not a wrong number — is
    // the answer for any `at` in that window (Escalation 5, recorded un-attested).
    expect(deriveContributionFacts(inputs({ coveredFrom: null }), AT)).toBeNull();
  });

  it('rejects a structurally impossible episode / open-run count rather than reporting it', () => {
    expect(deriveContributionFacts(inputs({ completedRestorationEpisodes: -1 }), AT)).toBeNull();
    expect(deriveContributionFacts(inputs({ completedRestorationEpisodes: 1.5 }), AT)).toBeNull();
    expect(deriveContributionFacts(inputs({ currentOpenTakenRun: -1 }), AT)).toBeNull();
  });
});

describe('AC4/D4 — the restoration package is measured against the APPLIED clause', () => {
  const facts = () => deriveContributionFacts(inputs({ currentOpenTakenRun: 2 }), AT)!;

  it('reports { remaining, required } from the applied clause DATA', () => {
    expect(
      deriveRestorationPackage(facts(), { clauseId: R7_C, consecutiveRequired: 5 }),
    ).toEqual({ status: 'ok', remaining: 3, required: 5 });
  });

  it('measures against the APPLIED clause, NOT R7(A) — the two disagree and the member pays', () => {
    // Same member, same two taken contributions. Under R7(C)'s 5-consecutive package they have three
    // to go; measuring them against R7(A)'s 3 would tell them they have one, on the surface that is
    // asking them for money without coverage.
    const underR7c = deriveRestorationPackage(facts(), { clauseId: R7_C, consecutiveRequired: 5 });
    const underR7a = deriveRestorationPackage(facts(), { clauseId: R7_A, consecutiveRequired: 3 });
    expect(underR7c).toEqual({ status: 'ok', remaining: 3, required: 5 });
    expect(underR7a).toEqual({ status: 'ok', remaining: 1, required: 3 });
  });

  it('floors `remaining` at 0 for a package that is already finished', () => {
    const done = deriveContributionFacts(inputs({ currentOpenTakenRun: 9 }), AT)!;
    expect(deriveRestorationPackage(done, { clauseId: R7_C, consecutiveRequired: 5 })).toEqual({
      status: 'ok',
      remaining: 0,
      required: 5,
    });
  });

  it('says `no_consecutive_requirement` for R7(D)/(E)/(F), naming the clause', () => {
    // ⚠ D4. R7(D)/(E)/(F) — the MAJORITY of what is activated today — carry `lock_in_months` +
    // `catch_up_required` / `complete_all` and NO `consecutive_required`. Leaving those members on a
    // sentinel naming a story that has already shipped is exactly the "honest sentinel quietly becomes
    // a lie" failure 10.24's AC9 was written to correct.
    expect(deriveRestorationPackage(facts(), { clauseId: R7_D, consecutiveRequired: null })).toEqual({
      status: 'no_consecutive_requirement',
      clauseId: R7_D,
    });
  });

  it('says `no_consecutive_requirement` with a NULL clause when no R7 clause applied at all', () => {
    // A member in no contribution-discipline restoration path. There is no package to count, and
    // saying so is a different claim from "we cannot tell you" (`package_unavailable`, which the
    // render layer reaches from the summary's own `producer_unavailable` arm).
    expect(deriveRestorationPackage(facts(), null)).toEqual({
      status: 'no_consecutive_requirement',
      clauseId: null,
    });
  });

  it('rides the payload summary, so the presenter needs no second source', () => {
    const summary = contributionFactsToSummary(facts(), {
      clauseId: R7_C,
      consecutiveRequired: 5,
    });
    expect(summary.restorationPackage).toEqual({ status: 'ok', remaining: 3, required: 5 });
  });
});
