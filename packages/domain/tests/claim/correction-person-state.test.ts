// A person's per-run state — Story 6.19b (AC3, AC5, AC11b "letters" / "retries"; D4, D20, `-269` §4, `-271` §1).
// Pure: the found-dead day and its kind; a delivered letter stops reminders (and ⛔ not before); the state is PER
// NUMBER — a 6.20 correction that CHANGES the number resets it, one that keeps it changes ⛔ nothing.

import { describe, expect, it } from 'vitest';

import {
  correctionNextReminderOn,
  correctionPeopleFromRecords,
  correctionPersonStatus,
} from '../../src/claim/correction-chase-read.js';
import {
  type PersonLetterRow,
  type PersonReminderRow,
  claimShortReference,
  evaluatePersonRunState,
  isEvidentialReminderRow,
  runMatchesMark,
} from '../../src/claim/correction-chase.js';
import {
  type RunFamilyRow,
  type RunLetterRow,
  lastEvidentialAttempt,
  personNumberMayHaveMoved,
} from '../../src/claim/correction-reminder-record.js';

const t = (n: number) => new Date(Date.UTC(2026, 9, 1, 5, 0, n));
const row = (slotDay: number, outcome: PersonReminderRow['outcome'], hash: string | null, at = slotDay): PersonReminderRow => ({
  slotDay,
  sentOn: `2026-10-${String(slotDay + 1).padStart(2, '0')}`,
  outcome,
  recipientVersionId: 'v1',
  recipientNumberHash: hash,
  createdAt: t(at),
});
const letter = (sequence: number, deliveredOn: string | null, at: number): PersonLetterRow => ({
  sequence,
  postedOn: '2026-10-05',
  deliveredOn,
  createdAt: t(at),
});
const familyRow = (r: PersonReminderRow, versionId: string | null = 'v1'): RunFamilyRow => ({
  ...r,
  recipientKey: 'nominee:v1',
  recipientVersionId: versionId,
  late: false,
});

describe('evaluatePersonRunState', () => {
  it('an accepted-only history is ⛔ not letter-eligible', () => {
    const s = evaluatePersonRunState([row(1, 'accepted', 'A'), row(2, 'accepted', 'A')], []);
    expect(s.foundDeadOn).toBeNull();
    expect(s.deadKind).toBeNull();
    expect(s.letterDelivered).toBe(false);
  });

  it('⭐ the FIRST dead outcome is the found-dead day; dead vs unreachable by its class (`-269` §4)', () => {
    expect(evaluatePersonRunState([row(1, 'accepted', 'A'), row(2, 'rejected_invalid_number', 'A')], [])).toMatchObject({
      foundDeadOn: '2026-10-03',
      deadKind: 'dead',
    });
    expect(evaluatePersonRunState([row(3, 'rejected_unreachable', 'A')], [])).toMatchObject({ deadKind: 'unreachable' });
    expect(evaluatePersonRunState([row(4, 'no_target', null)], [])).toMatchObject({ foundDeadOn: '2026-10-05', deadKind: 'unreachable' });
  });

  it('⛔ a skipped or in-flight row is ⛔ an attempt (S2)', () => {
    expect(evaluatePersonRunState([row(1, 'skipped_superseded', null), row(2, 'attempting', null)], []).foundDeadOn).toBeNull();
  });

  it('⭐ reminders stop only on a letter with a RECORDED delivery — ⛔ not on a posted one', () => {
    const rows = [row(1, 'rejected_invalid_number', 'A')];
    expect(evaluatePersonRunState(rows, [letter(1, null, 10)]).letterDelivered).toBe(false);
    const delivered = evaluatePersonRunState(rows, [letter(1, '2026-10-09', 10)]);
    expect(delivered.letterDelivered).toBe(true);
    expect(delivered.firstDeliveredOn).toBe('2026-10-09');
  });

  it('⭐ a correction that CHANGES the number resets the person: the old number\'s death and letter ⛔ silence nothing', () => {
    const rows = [row(1, 'rejected_invalid_number', 'A')];
    const letters = [letter(1, '2026-10-09', 10)];
    const reset = evaluatePersonRunState(rows, letters, 'B');
    expect(reset.reset).toBe(true);
    expect(reset.foundDeadOn).toBeNull();
    expect(reset.letterDelivered).toBe(false);
    // … and once the new number has its own rows, only they count.
    const after = evaluatePersonRunState([...rows, row(5, 'accepted', 'B', 20)], letters);
    expect(after.foundDeadOn).toBeNull();
    expect(after.letterDelivered).toBe(false);
    expect(after.epochRows.map((r) => r.slotDay)).toEqual([5]);
  });

  it('⭐ a correction that KEEPS the same number changes ⛔ nothing', () => {
    const rows = [row(1, 'rejected_invalid_number', 'A')];
    const s = evaluatePersonRunState(rows, [letter(1, '2026-10-09', 10)], 'A');
    expect(s.reset).toBe(false);
    expect(s.foundDeadOn).toBe('2026-10-02');
    expect(s.letterDelivered).toBe(true);
  });
});

describe('evaluatePersonRunState — non-evidential rows (I5), the post-reset epoch, row order', () => {
  it('⭐ a hash-less `error` row (the exhausted-row finaliser) does ⛔ not split the epoch: found-dead + delivered SURVIVE', () => {
    const rows = [row(1, 'rejected_invalid_number', 'A'), row(2, 'error', null, 11)];
    const letters = [letter(1, '2026-10-09', 10)];
    const unknown = evaluatePersonRunState(rows, letters);
    expect(unknown).toMatchObject({ foundDeadOn: '2026-10-02', deadKind: 'dead', letterDelivered: true, reset: false });
    // … and with the CURRENT number known (still A): the error row is ⛔ the "last" row, so ⛔ no reset.
    const known = evaluatePersonRunState(rows, letters, 'A');
    expect(known).toMatchObject({ foundDeadOn: '2026-10-02', letterDelivered: true, reset: false });
    expect(known.epochRows.map((r) => r.slotDay)).toEqual([1]);
  });

  it('a hash-less `error` BETWEEN two attempts of the same number keeps them one epoch', () => {
    const s = evaluatePersonRunState(
      [row(1, 'rejected_unreachable', 'A'), row(2, 'error', null, 2), row(3, 'accepted', 'A', 3)],
      [letter(1, '2026-10-09', 10)],
      'A',
    );
    expect(s).toMatchObject({ foundDeadOn: '2026-10-02', deadKind: 'unreachable', letterDelivered: true, reset: false });
    expect(s.epochRows.map((r) => r.slotDay)).toEqual([1, 3]);
  });

  it('⚠ an `error` row WITH a hash is evidence of its number — a different number still splits', () => {
    const s = evaluatePersonRunState([row(1, 'rejected_invalid_number', 'A'), row(2, 'error', 'B', 2)], []);
    expect(s.foundDeadOn).toBeNull();
    expect(s.epochRows.map((r) => r.slotDay)).toEqual([2]);
  });

  it('⚠ a `no_target` row\'s null hash MEANS "⛔ no sendable number" — it stays evidential and starts its own epoch', () => {
    const s = evaluatePersonRunState([row(1, 'accepted', 'A'), row(2, 'no_target', null, 2)], []);
    expect(s).toMatchObject({ foundDeadOn: '2026-10-03', deadKind: 'unreachable' });
    expect(s.epochRows.map((r) => r.slotDay)).toEqual([2]);
  });

  it('isEvidentialReminderRow — the exact rule', () => {
    expect(isEvidentialReminderRow({ outcome: 'error', recipientNumberHash: null })).toBe(false);
    expect(isEvidentialReminderRow({ outcome: 'error', recipientNumberHash: 'A' })).toBe(true);
    expect(isEvidentialReminderRow({ outcome: 'no_target', recipientNumberHash: null })).toBe(true);
    expect(isEvidentialReminderRow({ outcome: 'skipped_superseded', recipientNumberHash: null })).toBe(false);
    expect(isEvidentialReminderRow({ outcome: 'attempting', recipientNumberHash: null })).toBe(false);
    expect(isEvidentialReminderRow({ outcome: 'accepted', recipientNumberHash: 'A' })).toBe(true);
  });

  it('⭐ AFTER a reset, the new number\'s OWN death and a B-era delivered letter DO set the flags', () => {
    const aEra = [row(1, 'rejected_invalid_number', 'A')];
    const aLetter = letter(1, '2026-10-09', 10);
    const bEra = [row(5, 'accepted', 'B', 20), row(6, 'rejected_invalid_number', 'B', 21)];
    const dead = evaluatePersonRunState([...aEra, ...bEra], [aLetter], 'B');
    expect(dead).toMatchObject({ reset: false, foundDeadOn: '2026-10-07', deadKind: 'dead', letterDelivered: false });
    const bLetter: PersonLetterRow = { sequence: 2, postedOn: '2026-10-08', deliveredOn: '2026-10-20', createdAt: t(30) };
    const lettered = evaluatePersonRunState([...aEra, ...bEra], [aLetter, bLetter], 'B');
    expect(lettered.letterDelivered).toBe(true);
    // ⭐ The A-era letter ⛔ never anchors D21 for B — the first delivery OF THIS EPOCH does.
    expect(lettered.firstDeliveredOn).toBe('2026-10-20');
  });

  it('rows in ANY order: sorted by slot, then by insert time — the epoch is the same', () => {
    const inOrder = [row(1, 'rejected_invalid_number', 'A', 1), row(5, 'accepted', 'B', 20), row(6, 'accepted', 'B', 21)];
    const shuffled = [inOrder[2]!, inOrder[0]!, inOrder[1]!];
    expect(evaluatePersonRunState(shuffled, [])).toEqual(evaluatePersonRunState(inOrder, []));
    expect(evaluatePersonRunState(shuffled, []).epochRows.map((r) => r.slotDay)).toEqual([5, 6]);
    // Two rows on ONE slot (a retry after a reset): the LATER insert is the last.
    const sameSlot = [row(3, 'accepted', 'B', 9), row(3, 'rejected_invalid_number', 'A', 2)];
    expect(evaluatePersonRunState(sameSlot, [], 'B')).toMatchObject({ reset: false, foundDeadOn: null });
  });
});

describe('the child\'s re-check — the pure parts of `readRunPersonStates` (I4)', () => {
  it('⭐ letter delivered on number A, the person now on number B ⇒ ⛔ no `letterDelivered` ⇒ the child sends', () => {
    const s = evaluatePersonRunState([row(1, 'rejected_invalid_number', 'A')], [letter(1, '2026-10-09', 10)], 'B');
    expect(s.reset).toBe(true);
    expect(s.letterDelivered).toBe(false);
  });

  it('the current number is hashed only when the version MOVED — or always for the claimant (no version)', () => {
    const last = familyRow(row(1, 'accepted', 'A'), 'v1');
    expect(personNumberMayHaveMoved({ role: 'nominee', versionId: 'v1' }, last)).toBe(false);
    expect(personNumberMayHaveMoved({ role: 'nominee', versionId: 'v2' }, last)).toBe(true);
    expect(personNumberMayHaveMoved({ role: 'claimant', versionId: null }, familyRow(row(1, 'accepted', 'A'), null))).toBe(true);
    expect(personNumberMayHaveMoved({ role: 'nominee', versionId: 'v2' }, undefined)).toBe(false);
  });

  it('lastEvidentialAttempt skips a trailing hash-less `error`, a skip marker and an in-flight row', () => {
    const rows = [
      familyRow(row(1, 'accepted', 'A', 1), 'v1'),
      familyRow(row(2, 'error', null, 2), 'v2'),
      familyRow(row(3, 'skipped_superseded', null, 3), 'v2'),
      familyRow(row(4, 'attempting', null, 4), 'v2'),
    ];
    expect(lastEvidentialAttempt(rows)?.slotDay).toBe(1);
    expect(lastEvidentialAttempt([...rows].reverse())?.slotDay).toBe(1);
    expect(lastEvidentialAttempt([])).toBeUndefined();
  });

  it('⭐ ≥ 2 evidential rows OUT OF ORDER: the latest slot wins, and on ONE slot the LATER insert wins', () => {
    // Slot 2 twice (a retry after a reset): A inserted at t(5), B at t(9) — B is the last attempt. Slot 1 is older.
    const slot1 = familyRow(row(1, 'accepted', 'A', 1), 'v1');
    const slot2Early = familyRow(row(2, 'rejected_invalid_number', 'A', 5), 'v1');
    const slot2Late = familyRow(row(2, 'accepted', 'B', 9), 'v2');
    const trailingError = familyRow(row(3, 'error', null, 12), 'v3');
    const orders = [
      [slot2Late, slot1, trailingError, slot2Early],
      [slot2Early, trailingError, slot2Late, slot1],
      [trailingError, slot2Late, slot2Early, slot1],
    ];
    for (const rows of orders) {
      const last = lastEvidentialAttempt(rows);
      expect(last).toBe(slot2Late);
      expect(last?.recipientNumberHash).toBe('B');
    }
    // … and with the later insert REMOVED, the earlier one on the same slot is the last (⛔ slot 1).
    expect(lastEvidentialAttempt([slot2Early, slot1])).toBe(slot2Early);
  });
});

describe('correctionPersonStatus (I1)', () => {
  it('⭐ a dead / unreachable fact WINS over "reached" (accepted day 1, carrier-rejected day 3)', () => {
    expect(correctionPersonStatus('dead', 1)).toBe('dead');
    expect(correctionPersonStatus('unreachable', 3)).toBe('unreachable');
    expect(correctionPersonStatus(null, 1)).toBe('reached');
    expect(correctionPersonStatus(null, 0)).toBe('not_yet');
  });

  it('end to end: accepted on day 1, then rejected ⇒ the queue shows it dead (and the letter form is offered)', () => {
    const s = evaluatePersonRunState([row(1, 'accepted', 'A'), row(3, 'rejected_unreachable', 'A')], []);
    const accepted = s.epochRows.filter((r) => r.outcome === 'accepted').length;
    expect(correctionPersonStatus(s.deadKind, accepted)).toBe('unreachable');
    expect(s.foundDeadOn).toBe('2026-10-04');
  });
});

describe('runMatchesMark (the held switch, I10)', () => {
  it('a `family` mark is served by a family OR direction run; a `staff` mark only by a staff run', () => {
    expect(runMatchesMark('family', 'family')).toBe(true);
    expect(runMatchesMark('direction', 'family')).toBe(true);
    expect(runMatchesMark('staff', 'family')).toBe(false);
    expect(runMatchesMark('staff', 'staff')).toBe(true);
    expect(runMatchesMark('family', 'staff')).toBe(false);
    expect(runMatchesMark('direction', 'staff')).toBe(false);
  });
});

describe('claimShortReference (D33)', () => {
  it('the first 8 hex characters of the lower-case id, upper-cased', () => {
    expect(claimShortReference('3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b')).toBe('3F2A9C1E');
    expect(claimShortReference('ABCDEF01-0000-0000-0000-000000000000')).toBe('ABCDEF01');
  });
});

describe('correctionNextReminderOn (J7 — ⛔ no date the sweep will not send)', () => {
  const base = {
    kind: 'family' as const,
    day0: '2026-10-01',
    open: true,
    dayCount: 3,
    resubmitted: false,
    familyPartDone: false,
    cannotRemind: false,
  };

  it('an open family run advertises its next Panel day', () => {
    expect(correctionNextReminderOn(base)).toBe('2026-10-05');
    expect(correctionNextReminderOn({ ...base, kind: 'direction' })).toBe('2026-10-05');
  });

  it('⛔ none once the run ended, or while resubmitted (any kind)', () => {
    expect(correctionNextReminderOn({ ...base, open: false })).toBeNull();
    expect(correctionNextReminderOn({ ...base, resubmitted: true })).toBeNull();
    expect(correctionNextReminderOn({ ...base, kind: 'staff', resubmitted: true })).toBeNull();
  });

  it('⭐ a family / direction run under tier (b) or D30 ⇒ ⛔ none', () => {
    for (const kind of ['family', 'direction'] as const) {
      expect(correctionNextReminderOn({ ...base, kind, familyPartDone: true })).toBeNull();
      expect(correctionNextReminderOn({ ...base, kind, cannotRemind: true })).toBeNull();
    }
  });

  it('⭐ a STAFF run keeps its dates under tier (b) and D30 (the District Admin is still reminded)', () => {
    const staff = { ...base, kind: 'staff' as const };
    const expected = correctionNextReminderOn(staff);
    expect(expected).not.toBeNull();
    expect(correctionNextReminderOn({ ...staff, familyPartDone: true })).toBe(expected);
    expect(correctionNextReminderOn({ ...staff, cannotRemind: true })).toBe(expected);
  });
});

describe('correctionPeopleFromRecords (J6 — the people under D30, from the run\'s own records)', () => {
  const letterRow = (personKey: string, sequence: number, deliveredOn: string | null, at: number): RunLetterRow => ({
    letterId: `l-${personKey}-${String(sequence)}`,
    personKey,
    sequence,
    postedOn: '2026-10-05',
    deliveredOn,
    createdAt: t(at),
    hasScreenshot: deliveredOn !== null,
  });
  const keyed = (r: PersonReminderRow, recipientKey: string): RunFamilyRow => ({ ...familyRow(r), recipientKey });

  it('every person key on a row OR a letter, in first-appearance order, role from the key, rank ⛔ derivable ⇒ null', () => {
    const rows = [keyed(row(1, 'accepted', 'A', 1), 'nominee:v1'), keyed(row(1, 'rejected_invalid_number', 'C', 2), 'claimant')];
    const letters = [letterRow('claimant', 1, '2026-10-09', 10), letterRow('nominee:v9', 1, null, 11)];
    const people = correctionPeopleFromRecords(rows, letters);
    expect(people.map((p) => [p.personKey, p.role, p.rank])).toEqual([
      ['nominee:v1', 'nominee', null],
      ['claimant', 'claimant', null],
      // A person with a letter but ⛔ no row still shows — their letter (and its delivery form) must ⛔ vanish.
      ['nominee:v9', 'nominee', null],
    ]);
    expect(people[1]!.rows).toHaveLength(1);
    expect(people[1]!.letters.map((l) => l.letterId)).toEqual(['l-claimant-1']);
    // The state comes from the pure evaluator (⛔ no crypto): the claimant is dead and lettered.
    expect(evaluatePersonRunState(people[1]!.rows, people[1]!.letters)).toMatchObject({
      deadKind: 'dead',
      letterDelivered: true,
    });
  });

  it('a key of any other format is ⛔ not a person (skipped); ⛔ no records ⇒ ⛔ nobody', () => {
    expect(correctionPeopleFromRecords([keyed(row(1, 'accepted', 'A'), 'staff:u1')], [])).toEqual([]);
    expect(correctionPeopleFromRecords([], [])).toEqual([]);
  });
});
