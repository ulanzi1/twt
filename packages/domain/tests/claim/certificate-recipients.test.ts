// The certificate reminder's RECIPIENTS and a person's STATE — Story 6.19d (AC3; `2026-10-03-276` CR6, CR8). Pure:
// `chainHeadOf` on a linear chain, a fork (the highest `version_no` AMONG THE CHAIN'S DESCENDANTS — ⛔ never the
// member's), a version with no descendant, a cycle; and the person-state adapter onto 6.19b's evaluator: the found-dead
// day (letter-eligibility), the delivered-letter stop PER NUMBER (a letter to A stops B at the same number), a number
// change resetting it, and the recorded-day set (this run, ANY outcome).

import { describe, expect, it } from 'vitest';

import {
  type CertificateFamilyRow,
  type CertificateLetterFact,
  type CertificateNumberHash,
  type ChainVersion,
  certificateRecordedDays,
  chainHeadOf,
  evaluateCertificatePersonStates,
} from '../../src/claim/certificate-reminder.js';

const v = (versionId: string, correctsVersionId: string | null, versionNo: number): ChainVersion => ({
  versionId,
  correctsVersionId,
  versionNo,
});

describe('chainHeadOf', () => {
  it('a linear chain v1 ← v2 ← v3 ⇒ v3 from any member of it', () => {
    const versions = [v('v1', null, 1), v('v2', 'v1', 2), v('v3', 'v2', 3)];
    expect(chainHeadOf('v1', versions)).toBe('v3');
    expect(chainHeadOf('v2', versions)).toBe('v3');
    expect(chainHeadOf('v3', versions)).toBe('v3');
  });

  it('a version with ⛔ no descendant is its own head', () => {
    expect(chainHeadOf('v1', [v('v1', null, 1)])).toBe('v1');
    expect(chainHeadOf('lonely', [])).toBe('lonely');
  });

  it('⭐ a FORK ⇒ the highest `version_no` AMONG THAT CHAIN\'S DESCENDANTS — ⛔ never the member\'s highest', () => {
    // v1 ← v2 (no 2), v1 ← v4 (no 4); another person's chain w1 ← w9 has the member's highest number (9).
    const versions = [v('v1', null, 1), v('v2', 'v1', 2), v('v4', 'v1', 4), v('w1', null, 3), v('w9', 'w1', 9)];
    expect(chainHeadOf('v1', versions)).toBe('v4');
    expect(chainHeadOf('w1', versions)).toBe('w9');
  });

  it('a fork whose higher branch continues ⇒ that branch\'s leaf', () => {
    const versions = [v('v1', null, 1), v('v2', 'v1', 2), v('v3', 'v1', 3), v('v5', 'v2', 5)];
    expect(chainHeadOf('v1', versions)).toBe('v5');
  });

  it('a cycle (impossible by construction) is cut, ⛔ never looped on', () => {
    const versions = [v('a', 'b', 1), v('b', 'a', 2)];
    expect(['a', 'b']).toContain(chainHeadOf('a', versions));
  });
});

const RUN1 = 'run-1';
const RUN2 = 'run-2';
let seq = 0;
function row(over: Partial<CertificateFamilyRow> & Pick<CertificateFamilyRow, 'recipientKey' | 'slotDay' | 'sentOn' | 'outcome'>): CertificateFamilyRow {
  seq += 1;
  return {
    runId: RUN1,
    recipientVersionId: null,
    recipientNumberHash: 'H1',
    createdAt: new Date(Date.parse(`${over.sentOn}T04:30:00Z`) + seq),
    late: false,
    ...over,
  };
}
function letter(personKey: string, deliveredOn: string | null, postedOn = '2026-10-12'): CertificateLetterFact {
  seq += 1;
  return {
    letterId: `l-${String(seq)}`,
    runId: RUN1,
    personKey,
    postedOn,
    deliveredOn,
    createdAt: new Date(Date.parse(`${postedOn}T06:00:00Z`) + seq),
    hasScreenshot: deliveredOn !== null,
  };
}
const hashes = (m: Record<string, string | null | 'failed'>): Map<string, CertificateNumberHash> =>
  new Map(Object.entries(m).map(([k, h]) => [k, h === 'failed' ? { failed: true as const } : { hash: h }]));

describe('evaluateCertificatePersonStates (CR8 — 6.19b\'s evaluator, adapted)', () => {
  it('⭐ letter-eligible from the first dead / unreachable / no-target outcome of the CURRENT number', () => {
    const rows = [
      row({ recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'accepted' }),
      row({ recipientKey: 'nominee:a', slotDay: 2, sentOn: '2026-10-03', outcome: 'rejected_unreachable' }),
    ];
    const [s] = evaluateCertificatePersonStates([{ personKey: 'nominee:a' }], rows, [], hashes({ 'nominee:a': 'H1' }));
    expect(s!.letterEligible).toBe(true);
    expect(s!.track.foundDeadOn).toBe('2026-10-03');
    expect(s!.numberLetterDelivered).toBe(false);
  });

  it('⭐ a 6.20 number change resets eligibility (`-271` §1 / `-272` §2(b))', () => {
    const rows = [row({ recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'rejected_invalid_number' })];
    const [s] = evaluateCertificatePersonStates([{ personKey: 'nominee:a' }], rows, [], hashes({ 'nominee:a': 'H2' }));
    expect(s!.track.reset).toBe(true);
    expect(s!.letterEligible).toBe(false);
    expect(s!.numberHash).toBe('H2');
  });

  it('⭐ a delivered letter stops the person\'s SMS — across runs, ordered by TIME (⛔ by slot)', () => {
    const rows = [
      row({ runId: RUN1, recipientKey: 'nominee:a', slotDay: 3, sentOn: '2026-10-04', outcome: 'rejected_invalid_number' }),
      row({ runId: RUN2, recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-11-02', outcome: 'skipped_superseded' }),
    ];
    const [s] = evaluateCertificatePersonStates(
      [{ personKey: 'nominee:a' }],
      rows,
      [letter('nominee:a', '2026-10-20')],
      hashes({ 'nominee:a': 'H1' }),
    );
    expect(s!.track.letterDelivered).toBe(true);
    expect(s!.numberLetterDelivered).toBe(true);
    expect(s!.letter?.deliveredOn).toBe('2026-10-20');
  });

  it('⭐ CR6 — the delivered-letter stop is per NUMBER: a letter delivered to A stops B at the SAME number', () => {
    const rows = [row({ recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'rejected_invalid_number', recipientNumberHash: 'SAME' })];
    const states = evaluateCertificatePersonStates(
      [{ personKey: 'nominee:a' }, { personKey: 'nominee:b' }, { personKey: 'claimant' }],
      rows,
      [letter('nominee:a', '2026-10-15')],
      hashes({ 'nominee:a': 'SAME', 'nominee:b': 'SAME', claimant: 'OTHER' }),
    );
    const by = new Map(states.map((s) => [s.personKey, s]));
    expect(by.get('nominee:a')!.numberLetterDelivered).toBe(true);
    expect(by.get('nominee:b')!.numberLetterDelivered).toBe(true);
    expect(by.get('nominee:b')!.track.letterDelivered).toBe(false);
    expect(by.get('claimant')!.numberLetterDelivered).toBe(false);
  });

  it('a POSTED but undelivered letter stops ⛔ nothing', () => {
    const rows = [row({ recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'rejected_invalid_number' })];
    const [s] = evaluateCertificatePersonStates([{ personKey: 'nominee:a' }], rows, [letter('nominee:a', null)], hashes({ 'nominee:a': 'H1' }));
    expect(s!.numberLetterDelivered).toBe(false);
    expect(s!.letter).not.toBeNull();
  });

  it('a failed hash ⇒ the latest row\'s number stands (⛔ never a reset over a KMS blip)', () => {
    const rows = [row({ recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'rejected_invalid_number', recipientNumberHash: 'H1' })];
    const [s] = evaluateCertificatePersonStates([{ personKey: 'nominee:a' }], rows, [letter('nominee:a', '2026-10-10')], hashes({ 'nominee:a': 'failed' }));
    expect(s!.track.reset).toBe(false);
    expect(s!.numberHash).toBe('H1');
    expect(s!.numberLetterDelivered).toBe(true);
  });

  it('⭐ a hash-less `error` row (`exhausted:hash_failed`) is ⛔ not evidential — it splits ⛔ no epoch', () => {
    const rows = [
      row({ recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'rejected_invalid_number', recipientNumberHash: 'H1' }),
      row({ recipientKey: 'nominee:a', slotDay: 2, sentOn: '2026-10-03', outcome: 'error', recipientNumberHash: null }),
    ];
    const [s] = evaluateCertificatePersonStates([{ personKey: 'nominee:a' }], rows, [], hashes({}));
    expect(s!.track.foundDeadOn).toBe('2026-10-02');
    expect(s!.numberHash).toBe('H1');
  });
});

describe('certificateRecordedDays — THIS run\'s rows of the person, ANY outcome (⛔ never `epochRows`)', () => {
  it('counts skipped and attempting rows, and ⛔ another run\'s rows', () => {
    const rows = [
      row({ runId: RUN1, recipientKey: 'nominee:a', slotDay: 1, sentOn: '2026-10-02', outcome: 'skipped_superseded' }),
      row({ runId: RUN1, recipientKey: 'nominee:a', slotDay: 2, sentOn: '2026-10-03', outcome: 'attempting' }),
      row({ runId: RUN2, recipientKey: 'nominee:a', slotDay: 3, sentOn: '2026-11-03', outcome: 'accepted' }),
      row({ runId: RUN1, recipientKey: 'nominee:b', slotDay: 4, sentOn: '2026-10-05', outcome: 'accepted' }),
    ];
    expect([...certificateRecordedDays(rows, RUN1, 'nominee:a')].sort()).toEqual([1, 2]);
  });
});
