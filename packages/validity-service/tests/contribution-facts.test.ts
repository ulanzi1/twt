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

import { describe, expect, it } from 'vitest';

import { addCalendarMonths, calendarMonthsBetween } from '../src/calendar.js';
import {
  CONTRIBUTION_LAPSE_POLICY,
  contributionFactsToBag,
  contributionFactsToSummary,
  deriveContributionFacts,
} from '../src/producer.js';

const AT = new Date('2026-08-05T00:00:00.000Z');

/** A coverage watermark old enough that `at` is always inside it — the "projection is complete" case. */
const COVERED_FROM = new Date('2020-01-01T00:00:00.000Z');

/** Anchors for a member with a readable, ordinary history in a fully-backfilled Pariwar. */
function inputs(over: Partial<Parameters<typeof deriveContributionFacts>[0]> = {}) {
  return {
    totalCount: 12,
    lastConfirmedAt: new Date('2026-07-05T00:00:00.000Z'),
    skipsCurrentYear: 0,
    earliestSkipClosedAt: null,
    opportunitiesSinceLast: 0,
    coveredFrom: COVERED_FROM,
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
  it('emits EXACTLY the supplied keys, dotted, and never the two held keys', () => {
    const bag = contributionFactsToBag(deriveContributionFacts(inputs(), AT)!);
    expect(Object.keys(bag).sort()).toEqual([
      'contribution.ever_contributed',
      'contribution.in_lapse',
      'contribution.months_since_last',
      'contribution.skips_current_year',
      'contribution.total_count',
    ]);
    expect(bag).not.toHaveProperty('contribution.r7a_restorations_used');
    expect(bag).not.toHaveProperty('contribution.personal_event_excuse_claimed');
  });

  it('the ok arm keys facts by the DOTTED keys deriveViolatorFlags filters on, and names its holds', () => {
    const summary = contributionFactsToSummary(deriveContributionFacts(inputs(), AT)!);
    expect(summary.status).toBe('ok');
    // The consumer filters with `startsWith('contribution.')` — every key must survive that filter.
    for (const key of Object.keys(summary.facts)) expect(key.startsWith('contribution.')).toBe(true);
    expect(summary.heldFacts.map((f) => f.key).sort()).toEqual([
      'contribution.personal_event_excuse_claimed',
      'contribution.r7a_restorations_used',
    ]);
    // The hold names an OWNER, so a reader can act on it rather than merely noticing a gap.
    for (const held of summary.heldFacts) expect(held.producer).toMatch(/^story-10-2[56]$/);
  });
});
