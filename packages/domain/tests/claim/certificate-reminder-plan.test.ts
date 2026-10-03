// The certificate-run PLANNER — Story 6.19d (AC1, AC2; `2026-10-03-276` CR2–CR5; `-275` Q2–Q4). Pure: every arm of
// `planCertificateRun` — open `rejected` / `missing`; a re-rejection of the SAME upload ⛔ never restarts; a DIFFERENT
// upload restarts and `open` wins over `certificate_received`; missing → first rejection (Q3); received; completed;
// pause outside the window and resume on `reversed` (Q2); pause on an accepted anchor and resume on re-rejection (Q4);
// `completed` while paused; a run opened already past 180 ⇒ open + complete at once (⛔ no send); ⛔ never while filing.

import { describe, expect, it } from 'vitest';

import {
  type CertificatePlanFacts,
  planCertificateRun,
  planCertificateStaffChase,
} from '../../src/claim/certificate-reminder.js';

const TODAY = '2026-10-20';
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const R1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const R2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RUN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** 2026-10-10 10:00 IST. */
const REJECTED_AT = new Date('2026-10-10T04:30:00Z');

function facts(over: Partial<CertificatePlanFacts> = {}): CertificatePlanFacts {
  return {
    claimState: 'verifier_review',
    status: 'rejected',
    currentUploadId: U1,
    currentReview: { reviewId: R1, decidedAt: REJECTED_AT },
    openRun: null,
    runForCurrentUpload: false,
    missingRunExists: false,
    windowEnteredAt: new Date('2026-10-01T04:30:00Z'),
    ...over,
  };
}

const openRejected = { runId: RUN, cause: 'rejected' as const, anchorUploadId: U1, day0: '2026-10-10' };
const openMissing = { runId: RUN, cause: 'missing' as const, anchorUploadId: null, day0: '2026-10-01' };

describe('planCertificateRun — opening (CR2, CR3)', () => {
  it('⭐ a rejected current certificate in the window, ⛔ no run on it ⇒ open `rejected`, anchored on the upload + review, day 0 = the review\'s IST date', () => {
    expect(planCertificateRun(facts(), TODAY)).toEqual({
      kind: 'open',
      cause: 'rejected',
      anchorUploadId: U1,
      anchorReviewId: R1,
      day0: '2026-10-10',
      supersedeRunId: null,
      completeAtOnce: false,
    });
  });

  it('⭐ ⛔ no certificate in the window ⇒ open `missing`, day 0 = the IST date of the earliest `claim.peer_mesh_pinged`', () => {
    const plan = planCertificateRun(
      facts({ status: 'missing', currentUploadId: null, currentReview: null, windowEnteredAt: new Date('2026-09-30T19:00:00Z') }),
      TODAY,
    );
    expect(plan).toEqual({
      kind: 'open',
      cause: 'missing',
      anchorUploadId: null,
      anchorReviewId: null,
      day0: '2026-10-01', // 00:30 IST on 1 October
      supersedeRunId: null,
      completeAtOnce: false,
    });
  });

  it('⛔ a `missing` claim with ⛔ no window-entry event ⇒ ⛔ no run and an alarm (⛔ never a guessed day 0)', () => {
    expect(
      planCertificateRun(facts({ status: 'missing', currentUploadId: null, currentReview: null, windowEnteredAt: null }), TODAY),
    ).toEqual({ kind: 'none', alarm: 'no_window_entry' });
  });

  it('⛔ a second `missing` run is ⛔ never planned (one per claim, ever)', () => {
    expect(
      planCertificateRun(facts({ status: 'missing', currentUploadId: null, currentReview: null, missingRunExists: true }), TODAY),
    ).toEqual({ kind: 'none' });
  });

  it('⛔ while the family is still filing (`intake_converged`, `documents_pending`) ⇒ ⛔ no run (`-259` detail 3)', () => {
    for (const claimState of ['intake_converged', 'documents_pending', 'intake_pending']) {
      expect(planCertificateRun(facts({ claimState }), TODAY)).toEqual({ kind: 'none' });
      expect(planCertificateRun(facts({ claimState, status: 'missing', currentUploadId: null, currentReview: null }), TODAY)).toEqual({
        kind: 'none',
      });
    }
  });

  it('⛔ an awaiting-review or accepted certificate with ⛔ no run ⇒ nothing', () => {
    expect(planCertificateRun(facts({ status: 'awaiting_review', currentReview: null }), TODAY)).toEqual({ kind: 'none' });
    expect(planCertificateRun(facts({ status: 'accepted' }), TODAY)).toEqual({ kind: 'none' });
  });

  it('⭐ Trap 4 — a re-rejection of the SAME upload ⛔ never restarts: the run on it continues, from its OWN day 0', () => {
    const plan = planCertificateRun(
      facts({ currentReview: { reviewId: R2, decidedAt: new Date('2026-10-18T04:30:00Z') }, openRun: openRejected, runForCurrentUpload: true }),
      TODAY,
    );
    expect(plan).toEqual({ kind: 'continue', runId: RUN, runDay: 10 });
  });

  it('⭐ Trap 4 — the same upload\'s run ENDED (e.g. completed) ⇒ ⛔ never a second run on it', () => {
    expect(planCertificateRun(facts({ runForCurrentUpload: true }), TODAY)).toEqual({ kind: 'none' });
  });

  it('⭐ `-260` G5 — a rejection of a DIFFERENT upload ⇒ a NEW run that supersedes the old one; `open` WINS over `certificate_received`', () => {
    const plan = planCertificateRun(
      facts({ currentUploadId: U2, currentReview: { reviewId: R2, decidedAt: new Date('2026-10-19T04:30:00Z') }, openRun: openRejected }),
      TODAY,
    );
    expect(plan).toEqual({
      kind: 'open',
      cause: 'rejected',
      anchorUploadId: U2,
      anchorReviewId: R2,
      day0: '2026-10-19',
      supersedeRunId: RUN,
      completeAtOnce: false,
    });
  });

  it('⭐ Q3 (`-275` A) — a never-sent wait that turns into a FIRST rejection opens its own `rejected` run from the rejection', () => {
    const plan = planCertificateRun(facts({ openRun: openMissing, missingRunExists: true }), TODAY);
    expect(plan).toMatchObject({ kind: 'open', cause: 'rejected', day0: '2026-10-10', supersedeRunId: RUN });
  });

  it('⭐ Q2 (`-275` A) — a run whose day 0 is already past 180 when it would open ⇒ opened AND completed at once (⛔ no send, ⛔ never re-dated)', () => {
    const plan = planCertificateRun(facts({ currentReview: { reviewId: R1, decidedAt: new Date('2026-03-01T04:30:00Z') } }), TODAY);
    expect(plan).toMatchObject({ kind: 'open', day0: '2026-03-01', completeAtOnce: true });
    // Day 180 exactly is ⛔ not past the horizon.
    const at180 = planCertificateRun(facts({ currentReview: { reviewId: R1, decidedAt: new Date('2026-04-23T04:30:00Z') } }), TODAY);
    expect(at180).toMatchObject({ kind: 'open', day0: '2026-04-23', completeAtOnce: false });
  });
});

describe('planCertificateRun — an OPEN run (CR5: open ≻ completed ≻ certificate_received ≻ pause ≻ continue)', () => {
  it('continue — the anchor is still current and rejected, in the window', () => {
    expect(planCertificateRun(facts({ openRun: openRejected, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'continue',
      runId: RUN,
      runDay: 10,
    });
  });

  it('⭐ END `certificate_received` — a new certificate became current (awaiting review), ⛔ no new run due', () => {
    const plan = planCertificateRun(
      facts({ status: 'awaiting_review', currentUploadId: U2, currentReview: null, openRun: openRejected }),
      TODAY,
    );
    expect(plan).toEqual({ kind: 'end', runId: RUN, reason: 'certificate_received' });
  });

  it('⭐ END `certificate_received` — a `missing` run once a certificate arrives (any status)', () => {
    for (const status of ['awaiting_review', 'accepted'] as const) {
      expect(planCertificateRun(facts({ status, openRun: openMissing, missingRunExists: true }), TODAY)).toEqual({
        kind: 'end',
        runId: RUN,
        reason: 'certificate_received',
      });
    }
  });

  it('⭐ END `certificate_received` applies even OUTSIDE the window (the run is ended, ⛔ not paused)', () => {
    const plan = planCertificateRun(
      facts({ claimState: 'denied', status: 'awaiting_review', currentUploadId: U2, currentReview: null, openRun: openRejected }),
      TODAY,
    );
    expect(plan).toEqual({ kind: 'end', runId: RUN, reason: 'certificate_received' });
  });

  it('⭐ END `completed` — run day past 180 (`> 180`); day 180 itself still continues', () => {
    const old = { ...openRejected, day0: '2026-04-22' }; // day 181 on TODAY
    expect(planCertificateRun(facts({ openRun: old, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'end',
      runId: RUN,
      reason: 'completed',
    });
    const at180 = { ...openRejected, day0: '2026-04-23' };
    expect(planCertificateRun(facts({ openRun: at180, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'continue',
      runId: RUN,
      runDay: 180,
    });
  });

  it('⭐ `completed` BEFORE pause — a run paused past day 180 ends', () => {
    const old = { ...openRejected, day0: '2026-01-01' };
    expect(planCertificateRun(facts({ claimState: 'denied', openRun: old, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'end',
      runId: RUN,
      reason: 'completed',
    });
  });

  it('⭐ `completed` BEFORE `certificate_received`', () => {
    const old = { ...openRejected, day0: '2026-01-01' };
    expect(
      planCertificateRun(facts({ status: 'awaiting_review', currentUploadId: U2, currentReview: null, openRun: old }), TODAY),
    ).toEqual({ kind: 'end', runId: RUN, reason: 'completed' });
  });

  it('⭐ Q2 — PAUSE outside the review window (⛔ no send, ⛔ no record), and RESUME on `reversed` counting from its own day 0', () => {
    for (const claimState of ['denied', 'appeal_stage_1', 'state_trustee_approved', 'approved', 'settled']) {
      expect(planCertificateRun(facts({ claimState, openRun: openRejected, runForCurrentUpload: true }), TODAY)).toEqual({
        kind: 'pause',
        runId: RUN,
        runDay: 10,
        reason: 'outside_window',
      });
    }
    expect(planCertificateRun(facts({ claimState: 'reversed', openRun: openRejected, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'continue',
      runId: RUN,
      runDay: 10,
    });
  });

  it('⭐ Q4 — the anchor upload stands ACCEPTED on a re-review ⇒ PAUSE; re-rejected ⇒ continue from its own day 0', () => {
    expect(planCertificateRun(facts({ status: 'accepted', openRun: openRejected, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'pause',
      runId: RUN,
      runDay: 10,
      reason: 'certificate_accepted',
    });
    expect(planCertificateRun(facts({ status: 'rejected', openRun: openRejected, runForCurrentUpload: true }), TODAY)).toEqual({
      kind: 'continue',
      runId: RUN,
      runDay: 10,
    });
  });

  it('a `missing` run outside the window pauses; in the window it continues', () => {
    const m = facts({ status: 'missing', currentUploadId: null, currentReview: null, openRun: openMissing, missingRunExists: true });
    expect(planCertificateRun({ ...m, claimState: 'denied' }, TODAY)).toEqual({
      kind: 'pause',
      runId: RUN,
      runDay: 19,
      reason: 'outside_window',
    });
    expect(planCertificateRun(m, TODAY)).toEqual({ kind: 'continue', runId: RUN, runDay: 19 });
  });

  it('⭐ ⛔ a new run is ⛔ never opened OUTSIDE the window, even with a different rejected upload — the old run ends `certificate_received`', () => {
    const plan = planCertificateRun(
      facts({ claimState: 'denied', currentUploadId: U2, currentReview: { reviewId: R2, decidedAt: REJECTED_AT }, openRun: openRejected }),
      TODAY,
    );
    expect(plan).toEqual({ kind: 'end', runId: RUN, reason: 'certificate_received' });
  });
});

// ── CR10 — the District Admin's letter chase (pure) ─────────────────────────────────────────────────────────────


describe('planCertificateStaffChase (CR10)', () => {
  const CHASE = { first: 7, last: 12, escalation: 13 } as const;
  const eligible = (foundDeadOn: string | null, letter: unknown = null) => ({
    personKey: 'nominee:a',
    track: {
      foundDeadOn,
      deadKind: foundDeadOn === null ? null : ('dead' as const),
      letterDelivered: false,
      firstDeliveredOn: null,
      reset: false,
      epochRows: [],
    },
    letter: letter as never,
    letterEligible: foundDeadOn !== null,
  });
  const base = {
    day0: '2026-10-01',
    districtAdminKey: 'staff:da',
    pariwarAdminKeys: ['staff:pa1', 'staff:pa2'],
    chase: CHASE,
    staffRows: [] as { purpose: string; subjectKey: string; sentOn: string }[],
  };

  it('⛔ nothing before found-dead + 7; the chase on + 7 at its own slot', () => {
    expect(planCertificateStaffChase({ ...base, today: '2026-10-08', people: [eligible('2026-10-02')] })).toEqual([]);
    expect(planCertificateStaffChase({ ...base, today: '2026-10-09', people: [eligible('2026-10-02')] })).toEqual([
      { purpose: 'letter_chase', recipientKey: 'staff:da', subjectKey: 'nominee:a', slotDay: 8, late: false },
    ]);
  });

  it('daily through + 12: yesterday\'s chase does ⛔ not cover today', () => {
    const rows = [{ purpose: 'letter_chase', subjectKey: 'nominee:a', sentOn: '2026-10-09' }];
    expect(planCertificateStaffChase({ ...base, staffRows: rows, today: '2026-10-10', people: [eligible('2026-10-02')] })).toHaveLength(1);
  });

  it('⭐ on + 13 an escalation RECORD naming EVERY Pariwar Admin — ONCE per found-dead epoch', () => {
    const plans = planCertificateStaffChase({
      ...base,
      staffRows: [{ purpose: 'letter_chase', subjectKey: 'nominee:a', sentOn: '2026-10-14' }],
      today: '2026-10-15',
      people: [eligible('2026-10-02')],
    });
    expect(plans).toEqual([
      { purpose: 'letter_escalation', recipientKey: 'staff:pa1', subjectKey: 'nominee:a', slotDay: 14, late: false },
      { purpose: 'letter_escalation', recipientKey: 'staff:pa2', subjectKey: 'nominee:a', slotDay: 14, late: false },
    ]);
    const after = planCertificateStaffChase({
      ...base,
      staffRows: [
        { purpose: 'letter_chase', subjectKey: 'nominee:a', sentOn: '2026-10-14' },
        { purpose: 'letter_escalation', subjectKey: 'nominee:a', sentOn: '2026-10-15' },
      ],
      today: '2026-10-16',
      people: [eligible('2026-10-02')],
    });
    expect(after).toEqual([]);
  });

  it('⭐ a late chase AND a late escalation on ONE morning (catch-up), ⛔ no burst of daily chases', () => {
    const plans = planCertificateStaffChase({ ...base, today: '2026-10-20', people: [eligible('2026-10-02')] });
    expect(plans.map((p) => [p.purpose, p.slotDay, p.late])).toEqual([
      ['letter_chase', 13, true],
      ['letter_escalation', 14, true],
      ['letter_escalation', 14, true],
    ]);
  });

  it('⭐ K2 — a due date BEFORE the run\'s day 0 (a chase carried across runs) is written at TODAY\'s slot, ⛔ never negative', () => {
    const plans = planCertificateStaffChase({ ...base, day0: '2026-10-18', today: '2026-10-20', people: [eligible('2026-10-02')] });
    expect(plans.every((p) => p.slotDay === 2)).toBe(true);
    expect(plans.every((p) => p.slotDay >= 0)).toBe(true);
  });

  it('⛔ a person with a letter on the claim (posted, even undelivered) is ⛔ not chased', () => {
    expect(planCertificateStaffChase({ ...base, today: '2026-10-20', people: [eligible('2026-10-02', { letterId: 'l' })] })).toEqual([]);
  });

  it('⛔ an old epoch\'s rows (on or before the current found-dead day) ⛔ never suppress the new chase', () => {
    const rows = [
      { purpose: 'letter_chase', subjectKey: 'nominee:a', sentOn: '2026-10-12' },
      { purpose: 'letter_escalation', subjectKey: 'nominee:a', sentOn: '2026-10-12' },
    ];
    const plans = planCertificateStaffChase({ ...base, staffRows: rows, today: '2026-10-26', people: [eligible('2026-10-12')] });
    expect(plans.map((p) => p.purpose)).toEqual(['letter_chase', 'letter_escalation', 'letter_escalation']);
  });

  it('⛔ not letter-eligible ⇒ ⛔ nothing', () => {
    expect(planCertificateStaffChase({ ...base, today: '2026-10-20', people: [eligible(null)] })).toEqual([]);
  });
});
