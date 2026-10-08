// Story 6.24a — the pure halves of "a suspicion refusal stands" (`2026-10-07-292` RF1, RF5, RF14). DB-free.
//   · `suspicionAppealWaitState` — the wait table (Task 2.1): not_filed / open / upheld_final / time_limit_passed /
//     a reversed refusal (absent from the read) / several refusals / self excluded.
//   · `suspicionRefusalAppealUntil` + `hasSuspicionRefusalAppealLimitPassed` — the 90-day limit (Task 4b.1, AC2b): IST
//     midnight edges, a refusal at 23:59 IST, a refusal at 00:01 IST.
//   · the gate's REQUIRED `step` — a compile-time pin (AC2).

import { describe, expect, it } from 'vitest';

import {
  CLAIM_LIFECYCLE_STATES,
  CLAIM_NOT_CLOSABLE_STATES,
  claimStateMachine,
  isClaimClosable,
  replayClaimState,
} from '../../src/claim/state.js';
import {
  SUSPICION_REFUSAL_APPEAL_DAYS,
  hasSuspicionRefusalAppealLimitPassed,
  otherStandingSuspicionRefusals,
  standingSuspicionRefusalSql,
  suspicionAppealAdvisoryLockKey,
  suspicionAppealWaitState,
  suspicionRefusalAppealUntil,
  suspicionReversalAdvisoryLockKey,
  type StandingSuspicionRefusal,
} from '../../src/claim/suspicion-refusal.js';
import { CLAIM_TERMINAL_STATES } from '../../src/claim/read.js';
import { CLAIM_EVENT_TYPES } from '../../src/claim/events.js';
import type { ClaimApprovalGateOptions } from '../../src/claim/nominee-name-check.js';
import { claimId, type ClaimId } from '../../src/ids/index.js';

const SELF = claimId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const S1 = claimId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const S2 = claimId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

function refusal(id: ClaimId, appeal: StandingSuspicionRefusal['appeal']): StandingSuspicionRefusal {
  return { claimCaseId: id, createdAt: new Date('2026-09-01T00:00:00Z'), refusedOn: '2026-09-01', appealUntil: '2026-11-30', appeal };
}

describe('suspicionAppealWaitState — RF5 (the FINAL approval waits)', () => {
  it('⛔ no standing refusal ⇒ ⛔ no wait', () => {
    expect(suspicionAppealWaitState([], SELF)).toEqual({ waits: false });
  });
  it('not_filed (within its 90 days) ⇒ waits `appeal_not_filed`', () => {
    expect(suspicionAppealWaitState([refusal(S1, 'not_filed')], SELF)).toEqual({ waits: true, reason: 'appeal_not_filed', heldByClaimCaseId: S1 });
  });
  it('open ⇒ waits `appeal_open`', () => {
    expect(suspicionAppealWaitState([refusal(S1, 'open')], SELF)).toEqual({ waits: true, reason: 'appeal_open', heldByClaimCaseId: S1 });
  });
  it('upheld_final / time_limit_passed ⇒ decided ⇒ ⛔ no wait', () => {
    expect(suspicionAppealWaitState([refusal(S1, 'upheld_final')], SELF)).toEqual({ waits: false });
    expect(suspicionAppealWaitState([refusal(S1, 'time_limit_passed')], SELF)).toEqual({ waits: false });
  });
  it('a REVERSED refusal ⛔ never stands, so the read never returns it ⇒ ⛔ no wait (the claim is closed instead — RF6)', () => {
    expect(suspicionAppealWaitState([], SELF)).toEqual({ waits: false });
  });
  it('several refusals — ANY undecided one holds; an open appeal is reported before a not-filed one', () => {
    expect(suspicionAppealWaitState([refusal(S1, 'upheld_final'), refusal(S2, 'not_filed')], SELF)).toMatchObject({ reason: 'appeal_not_filed', heldByClaimCaseId: S2 });
    expect(suspicionAppealWaitState([refusal(S1, 'not_filed'), refusal(S2, 'open')], SELF)).toMatchObject({ reason: 'appeal_open', heldByClaimCaseId: S2 });
  });
  it('SELF is excluded — a claim never waits on its OWN refusal (in any case)', () => {
    expect(suspicionAppealWaitState([refusal(SELF, 'open')], SELF)).toEqual({ waits: false });
    expect(suspicionAppealWaitState([refusal(SELF, 'not_filed')], SELF.toUpperCase())).toEqual({ waits: false });
    expect(otherStandingSuspicionRefusals([refusal(SELF, 'open'), refusal(S1, 'upheld_final')], SELF).map((r) => r.claimCaseId)).toEqual([S1]);
  });
});

describe('the 90-day limit — RF14 (`-291` Q1 A)', () => {
  // IST = UTC+05:30. 2026-10-01T00:00 IST = 2026-09-30T18:30Z.
  const ist = (date: string, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number) as [number, number];
    return new Date(Date.parse(`${date}T00:00:00Z`) - 330 * 60_000 + (h * 60 + m) * 60_000);
  };
  it('90 days', () => expect(SUSPICION_REFUSAL_APPEAL_DAYS).toBe(90));

  it.each([
    // [refused at (IST date, time), appeal until (IST date)]
    ['2026-10-01', '00:00', '2026-12-30'],
    ['2026-10-01', '00:01', '2026-12-30'],
    ['2026-10-01', '23:59', '2026-12-30'],
    ['2026-12-31', '12:00', '2027-03-31'],
    ['2028-01-01', '09:00', '2028-03-31'], // a leap year — Feb has 29 days
  ])('a refusal at %s %s IST ⇒ appealable until %s', (date, time, until) => {
    expect(suspicionRefusalAppealUntil(ist(date, time))).toBe(until);
  });

  it('a refusal at 23:59 IST belongs to THAT IST date (⛔ not the UTC date)', () => {
    // 23:59 IST on 1 Oct = 18:29Z on 1 Oct; 00:01 IST on 2 Oct = 18:31Z on 1 Oct — same UTC date, different IST dates.
    expect(suspicionRefusalAppealUntil(ist('2026-10-01', '23:59'))).toBe('2026-12-30');
    expect(suspicionRefusalAppealUntil(ist('2026-10-02', '00:01'))).toBe('2026-12-31');
  });

  it('the boundary pair — the LAST instant of D + 90 is inside; 00:00 IST on D + 91 has passed', () => {
    const refused = ist('2026-10-01', '23:59');
    const lastInstantOfDay90 = new Date(ist('2026-12-31', '00:00').getTime() - 1);
    expect(hasSuspicionRefusalAppealLimitPassed(refused, lastInstantOfDay90)).toBe(false);
    expect(hasSuspicionRefusalAppealLimitPassed(refused, ist('2026-12-31', '00:00'))).toBe(true);
    expect(hasSuspicionRefusalAppealLimitPassed(refused, ist('2026-12-31', '00:01'))).toBe(true);
  });

  it('a refusal at 00:01 IST gets the same end as one at 23:59 IST on that date (whole IST days)', () => {
    const early = ist('2026-10-01', '00:01');
    const late = ist('2026-10-01', '23:59');
    for (const clock of [ist('2026-12-30', '23:59'), ist('2026-12-31', '00:00')]) {
      expect(hasSuspicionRefusalAppealLimitPassed(early, clock)).toBe(hasSuspicionRefusalAppealLimitPassed(late, clock));
    }
  });
});

describe('RF1 — the fragment and the keys', () => {
  it('the alias must be a bare identifier (⛔ not an injection seam)', () => {
    expect(() => standingSuspicionRefusalSql('claims')).not.toThrow();
    expect(() => standingSuspicionRefusalSql('sr_s')).not.toThrow();
    expect(() => standingSuspicionRefusalSql('claims; DROP TABLE claims')).toThrow();
    expect(() => standingSuspicionRefusalSql('"claims"')).toThrow();
  });
  it('the per-death keys are distinct namespaces (RF15 and RF6 ⛔ never collide), stable per death', () => {
    const p = '11111111-1111-1111-1111-111111111111';
    const d = '22222222-2222-2222-2222-222222222222';
    expect(suspicionAppealAdvisoryLockKey(p, d)).toBe(suspicionAppealAdvisoryLockKey(p, d));
    expect(suspicionAppealAdvisoryLockKey(p, d)).not.toBe(suspicionReversalAdvisoryLockKey(p, d));
    expect(suspicionAppealAdvisoryLockKey(p, d)).not.toBe(suspicionAppealAdvisoryLockKey(p, p));
  });
});

describe('RF4 — `claim.closed` (the 36th event)', () => {
  const closed = (from: string) => replayClaimStateFrom(from);
  /** Fold `claim.closed` over a claim already in `from` (the reducer is total — inject the start state). */
  function replayClaimStateFrom(from: string): string {
    return claimStateMachine.step(from as never, { type: 'claim.closed', payload: {} }) as string;
  }
  it('moves EVERY closable state to `closed` — `denied`, the three appeal stages and `reversed` included', () => {
    const closable = CLAIM_LIFECYCLE_STATES.filter(isClaimClosable);
    expect(closable).toEqual(expect.arrayContaining(['denied', 'appeal_stage_1', 'appeal_stage_2', 'appeal_stage_3', 'reversed', 'verifier_approved', 'state_trustee_freeze']));
    expect(closable).toHaveLength(CLAIM_LIFECYCLE_STATES.length - CLAIM_NOT_CLOSABLE_STATES.length);
    for (const from of closable) expect(closed(from), from).toBe('closed');
  });
  it('⛔ never moves a claim already finally approved, paid or closed (identity)', () => {
    for (const from of ['state_trustee_approved', 'approved', 'settled', 'closed']) expect(closed(from), from).toBe(from);
  });
  it('⛔ nothing leaves `closed` — EVERY claim event, under every payload shape the reducer branches on (code review round 2)', () => {
    const payloads = [{}, { outcome: 'approved' }, { outcome: 'denied' }, { decision: 'reversed' }, { decision: 'upheld' }, { to_state: 'approved' }];
    expect(CLAIM_EVENT_TYPES.length).toBeGreaterThan(30);
    for (const type of CLAIM_EVENT_TYPES) {
      for (const payload of payloads) {
        expect(claimStateMachine.step('closed', { type, payload } as never), `${type} ${JSON.stringify(payload)}`).toBe('closed');
      }
    }
  });
  it('`closed` is terminal (CLAIM_TERMINAL_STATES) — ⛔ never a convergence candidate', () => {
    expect(CLAIM_TERMINAL_STATES).toContain('closed');
  });
  it('a replayed stream ends `closed`', () => {
    const row = (eventType: string, payload: Record<string, unknown> = {}) => ({ eventType, payload });
    const rows = [row('claim.intake_initiated'), row('claim.intake_converged'), row('claim.closed')];
    expect(replayClaimState(rows as never)).toBe('closed');
  });
});

describe('RF5 — the gate\'s `step` is REQUIRED (a compile-time pin)', () => {
  it('omitting `step` is a type error', () => {
    // @ts-expect-error — `step` is required (Story 6.24a RF5): typecheck finds every approval call site.
    const missing: ClaimApprovalGateOptions = { approvingActorIds: [] };
    const district: ClaimApprovalGateOptions = { approvingActorIds: [], step: 'district_admin' };
    const final: ClaimApprovalGateOptions = { approvingActorIds: [], step: 'final' };
    expect([missing, district, final]).toHaveLength(3);
  });
});
