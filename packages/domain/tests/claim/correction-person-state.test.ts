// A person's per-run state — Story 6.19b (AC3, AC5, AC11b "letters" / "retries"; D4, D20, `-269` §4, `-271` §1).
// Pure: the found-dead day and its kind; a delivered letter stops reminders (and ⛔ not before); the state is PER
// NUMBER — a 6.20 correction that CHANGES the number resets it, one that keeps it changes ⛔ nothing.

import { describe, expect, it } from 'vitest';

import {
  type PersonLetterRow,
  type PersonReminderRow,
  claimShortReference,
  evaluatePersonRunState,
} from '../../src/claim/correction-chase.js';

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

describe('claimShortReference (D33)', () => {
  it('the first 8 hex characters of the lower-case id, upper-cased', () => {
    expect(claimShortReference('3f2a9c1e-0b4d-4e6f-8a1b-2c3d4e5f6a7b')).toBe('3F2A9C1E');
    expect(claimShortReference('ABCDEF01-0000-0000-0000-000000000000')).toBe('ABCDEF01');
  });
});
