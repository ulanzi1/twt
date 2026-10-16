// The selection's anchor and the posting run — pure, DB-free unit tests (Story 6.36, Task 3; AC4, AC5; 6.36a SW19, SW21).
//
// The cut is the START (IST) of the claim's FILING day — computed in ONE function. The run (SW21 word for word): the
// latest consecutive postings of the same kind counted back from the latest; an "isn't listed" row BETWEEN two rows of
// the current workplace ⛔ breaks it; a district-only row is skipped. The previous workplace counts when the current
// run's `started_on` is less than 90 days before the filing date (89 ⇒ counts, 90 ⇒ ⛔).

import { describe, expect, it } from 'vitest';

import { addCalendarDays } from '../../src/cycle-calendar/holiday-resolver.js';
import {
  derivePeerMeshPostingRun,
  peerMeshFilingCut,
  peerMeshPostingKind,
  peerMeshPreviousWorkplaceCounts,
  type PeerMeshPostingRow,
} from '../../src/claim/peer-mesh-read.js';

const FILING = '2026-10-16';
const at = (iso: string) => new Date(iso);
let seq = 0;

function row(o: Partial<PeerMeshPostingRow> & { createdAt: Date }): PeerMeshPostingRow {
  seq += 1;
  return {
    postingId: `p${String(seq).padStart(4, '0')}`,
    workplaceId: null,
    workplaceRequestId: null,
    isRetirement: false,
    startedOn: null,
    ...o,
  };
}
const W = (workplaceId: string, startedOn: string, createdAt: string) => row({ workplaceId, startedOn, createdAt: at(createdAt) });
const NL = (startedOn: string, createdAt: string) => row({ workplaceRequestId: 'req', startedOn, createdAt: at(createdAt) });
const RET = (startedOn: string, createdAt: string) => row({ isRetirement: true, startedOn, createdAt: at(createdAt) });
const DO = (createdAt: string) => row({ createdAt: at(createdAt) });

describe('peerMeshFilingCut — the ONE anchor (AC4)', () => {
  it('a claim created at 23:59 IST cuts at that day\'s 00:00 IST', () => {
    // 2026-10-16 23:59 IST = 18:29 UTC
    const c = peerMeshFilingCut(at('2026-10-16T18:29:00.000Z'));
    expect(c.filingDate).toBe('2026-10-16');
    expect(c.cut.toISOString()).toBe('2026-10-15T18:30:00.000Z');
    expect(c.recentFrom.toISOString()).toBe('2026-07-17T18:30:00.000Z');
    expect(c.cut.getTime() - c.recentFrom.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('a claim created at 00:00 IST cuts at that same instant; one at 05:29 UTC is the same IST day', () => {
    expect(peerMeshFilingCut(at('2026-10-15T18:30:00.000Z')).cut.toISOString()).toBe('2026-10-15T18:30:00.000Z');
    expect(peerMeshFilingCut(at('2026-10-16T05:29:00.000Z')).filingDate).toBe('2026-10-16');
    // 18:29:59 UTC on the 15th is still the 15th in IST
    expect(peerMeshFilingCut(at('2026-10-15T18:29:59.999Z')).filingDate).toBe('2026-10-15');
  });
});

describe('derivePeerMeshPostingRun — SW21 (AC5)', () => {
  it('the row kinds as shipped', () => {
    expect(peerMeshPostingKind(W('a', FILING, '2026-01-01T00:00:00Z'))).toBe('workplace');
    expect(peerMeshPostingKind(NL(FILING, '2026-01-01T00:00:00Z'))).toBe('not_listed');
    expect(peerMeshPostingKind(RET(FILING, '2026-01-01T00:00:00Z'))).toBe('retirement');
    expect(peerMeshPostingKind(DO('2026-01-01T00:00:00Z'))).toBe('district_only');
  });

  it('⛔ postings ⇒ ⛔ current, ⛔ previous, ⛔ run', () => {
    expect(derivePeerMeshPostingRun([])).toEqual({ currentWorkplaceId: null, previousWorkplaceId: null, runStartedOn: null, runRecordedAt: null, latestRecordedAt: null });
  });

  it('A → B: B is current, A previous; the run starts at B', () => {
    const r = derivePeerMeshPostingRun([W('B', '2026-08-01', '2026-08-02T00:00:00Z'), W('A', '2010-01-01', '2020-01-01T00:00:00Z')]);
    expect(r).toMatchObject({ currentWorkplaceId: 'B', previousWorkplaceId: 'A', runStartedOn: '2026-08-01' });
    expect(r.runRecordedAt?.toISOString()).toBe('2026-08-02T00:00:00.000Z');
  });

  it('A → B (120 days) → "isn\'t listed" → B (20 days): the NL row BETWEEN two B rows ⛔ breaks the run — it starts 120 days back', () => {
    const r = derivePeerMeshPostingRun([
      W('B', addCalendarDays(FILING, -20), '2026-09-26T00:00:00Z'),
      NL(addCalendarDays(FILING, -60), '2026-08-17T00:00:00Z'),
      W('B', addCalendarDays(FILING, -120), '2026-06-18T00:00:00Z'),
      W('A', '2015-01-01', '2020-01-01T00:00:00Z'),
    ]);
    expect(r).toMatchObject({ currentWorkplaceId: 'B', previousWorkplaceId: 'A', runStartedOn: addCalendarDays(FILING, -120) });
    expect(peerMeshPreviousWorkplaceCounts(r, FILING)).toBe(false);
  });

  it('A → an unconfirmed "isn\'t listed" (20 days): ⛔ current; A is the previous and counts', () => {
    const r = derivePeerMeshPostingRun([NL(addCalendarDays(FILING, -20), '2026-09-26T00:00:00Z'), W('A', '2015-01-01', '2020-01-01T00:00:00Z')]);
    expect(r).toMatchObject({ currentWorkplaceId: null, previousWorkplaceId: 'A', runStartedOn: addCalendarDays(FILING, -20) });
    expect(peerMeshPreviousWorkplaceCounts(r, FILING)).toBe(true);
  });

  it('school A → "isn\'t listed" → confirmed B (60 days): the trailing NL is ⛔ part of B\'s run; A counts', () => {
    const r = derivePeerMeshPostingRun([
      W('B', addCalendarDays(FILING, -60), '2026-08-20T00:00:00Z'),
      NL(addCalendarDays(FILING, -60), '2026-08-17T00:00:00Z'),
      W('A', '2015-01-01', '2020-01-01T00:00:00Z'),
    ]);
    expect(r).toMatchObject({ currentWorkplaceId: 'B', previousWorkplaceId: 'A', runStartedOn: addCalendarDays(FILING, -60) });
    expect(r.runRecordedAt?.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    expect(peerMeshPreviousWorkplaceCounts(r, FILING)).toBe(true);
  });

  it('a retirement 30 days before: ⛔ current, the previous counts; retiring twice ⛔ re-arms', () => {
    const once = derivePeerMeshPostingRun([RET(addCalendarDays(FILING, -30), '2026-09-16T00:00:00Z'), W('A', '2015-01-01', '2020-01-01T00:00:00Z')]);
    expect(once).toMatchObject({ currentWorkplaceId: null, previousWorkplaceId: 'A' });
    expect(peerMeshPreviousWorkplaceCounts(once, FILING)).toBe(true);
    const twice = derivePeerMeshPostingRun([
      RET(addCalendarDays(FILING, -10), '2026-10-06T00:00:00Z'),
      RET(addCalendarDays(FILING, -400), '2025-09-01T00:00:00Z'),
      W('A', '2015-01-01', '2020-01-01T00:00:00Z'),
    ]);
    expect(twice.runStartedOn).toBe(addCalendarDays(FILING, -400));
    expect(peerMeshPreviousWorkplaceCounts(twice, FILING)).toBe(false);
  });

  it('re-declaring the same workplace ⛔ re-arms the old one', () => {
    const r = derivePeerMeshPostingRun([
      W('B', addCalendarDays(FILING, -5), '2026-10-10T00:00:00Z'),
      W('B', addCalendarDays(FILING, -300), '2026-01-01T00:00:00Z'),
      W('A', '2015-01-01', '2020-01-01T00:00:00Z'),
    ]);
    expect(r.runStartedOn).toBe(addCalendarDays(FILING, -300));
    expect(peerMeshPreviousWorkplaceCounts(r, FILING)).toBe(false);
  });

  it('the 90-day boundary on started_on: 89 days ⇒ the previous counts; 90 ⇒ ⛔', () => {
    const run = (d: number) => derivePeerMeshPostingRun([W('B', addCalendarDays(FILING, -d), '2026-09-01T00:00:00Z'), W('A', '2015-01-01', '2020-01-01T00:00:00Z')]);
    expect(peerMeshPreviousWorkplaceCounts(run(89), FILING)).toBe(true);
    expect(peerMeshPreviousWorkplaceCounts(run(90), FILING)).toBe(false);
  });

  it('a deceased whose only rows are district-only ⇒ ⛔ workplace at all', () => {
    const r = derivePeerMeshPostingRun([DO('2025-01-01T00:00:00Z'), DO('2020-01-01T00:00:00Z')]);
    expect(r).toMatchObject({ currentWorkplaceId: null, previousWorkplaceId: null, runStartedOn: null });
    expect(peerMeshPreviousWorkplaceCounts(r, FILING)).toBe(false);
  });

  it('a district-only row ⛔ breaks a run (vacuous today) and a NULL-start run is treated as recent (unreachable)', () => {
    const r = derivePeerMeshPostingRun([
      W('B', addCalendarDays(FILING, -10), '2026-10-06T00:00:00Z'),
      DO('2026-09-01T00:00:00Z'),
      W('B', addCalendarDays(FILING, -200), '2026-03-01T00:00:00Z'),
      W('A', '2015-01-01', '2020-01-01T00:00:00Z'),
    ]);
    expect(r.runStartedOn).toBe(addCalendarDays(FILING, -200));
    expect(peerMeshPreviousWorkplaceCounts({ ...r, runStartedOn: null }, FILING)).toBe(true);
  });

  it('a different workplace or a retirement ENDS the run; the previous skips "isn\'t listed" and retirement rows', () => {
    const r = derivePeerMeshPostingRun([
      W('C', addCalendarDays(FILING, -10), '2026-10-06T00:00:00Z'),
      RET(addCalendarDays(FILING, -50), '2026-08-27T00:00:00Z'),
      NL(addCalendarDays(FILING, -70), '2026-08-07T00:00:00Z'),
      W('A', '2015-01-01', '2020-01-01T00:00:00Z'),
    ]);
    expect(r).toMatchObject({ currentWorkplaceId: 'C', previousWorkplaceId: 'A', runStartedOn: addCalendarDays(FILING, -10) });
  });
});
