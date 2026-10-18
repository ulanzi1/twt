// The DELIVERY LADDER's pure rules — Story 6.37c (Task 4.1; AC1–AC4, AC6; LD3–LD9; I3, I4; `-360` PQ1–PQ3 A).
// The read-time B1 mapping (one copy, epoch-scoped, ⛔ a row multiplied), LD7's MIN found-dead date, the start, the
// step dates, the ends, the step gate, the cap-aware ask. Pure — ⛔ DB, ⛔ clock, ⛔ crypto.

import { describe, expect, it } from 'vitest';

import {
  CONTACT_LADDER_SCAN_DAYS,
  type ConcludedLadderFact,
  type LadderCallFact,
  type LadderStartFact,
  type LadderViewFact,
  applyConcludedLadderMapping,
  dueLadderStep,
  ladderAsk,
  ladderEndReason,
  ladderFirstDueOn,
  ladderStepGate,
  ladderWhatsappStep,
  nextLadderStepDate,
  pendingLadderAsk,
  planLadderStart,
  reachedCallSince,
} from '../../src/claim/contact-ladder.js';
import { type PersonReminderRow, evaluatePersonRunState } from '../../src/claim/correction-chase.js';

const t = (n: number) => new Date(Date.UTC(2026, 9, 1, 5, 0, 0, n));
const date = (day: number) => `2026-10-${String(day).padStart(2, '0')}`;

type Row = PersonReminderRow & {
  readonly reminderId?: string;
  readonly runId: string;
  readonly recipientKey: string;
  readonly deliveryState?: 'delivered' | 'undelivered' | null;
};

/** A send row on IST day `day` (created in day order), to `hash`, reported `delivery`. */
function row(
  id: string,
  day: number,
  outcome: PersonReminderRow['outcome'],
  hash: string | null,
  delivery: 'delivered' | 'undelivered' | null = null,
  over: Partial<Row> = {},
): Row {
  return {
    reminderId: id,
    runId: 'run-1',
    recipientKey: 'claimant',
    slotDay: day,
    sentOn: date(day),
    outcome,
    recipientVersionId: null,
    recipientNumberHash: hash,
    createdAt: t(day * 10),
    deliveryState: delivery,
    ...over,
  };
}

const concluded = (originRowId: string, concludedOn: string, over: Partial<ConcludedLadderFact> = {}): ConcludedLadderFact => ({
  personKey: 'claimant',
  recipientNumberHash: 'A',
  originRowId,
  concludedOn,
  ...over,
});

const outcomes = (rows: readonly Row[]) => rows.map((r) => [r.reminderId, r.outcome, r.deadOn ?? null, r.concluded ?? null]);

// ── applyConcludedLadderMapping (LD6, I3, I4) ─────────────────────────────────────────────────────────────────

describe('applyConcludedLadderMapping (LD6)', () => {
  it('⭐ maps EVERY accepted + undelivered row of that person / number in the origin\'s epoch — earlier, the origin, later', () => {
    const rows = [
      row('e', 1, 'accepted', 'A', 'undelivered'),
      row('o', 3, 'accepted', 'A', 'undelivered'),
      row('l', 5, 'accepted', 'A', 'undelivered'),
    ];
    expect(outcomes(applyConcludedLadderMapping(rows, [concluded('o', '2026-10-11')]))).toEqual([
      ['e', 'rejected_unreachable', '2026-10-11', true],
      ['o', 'rejected_unreachable', '2026-10-11', true],
      ['l', 'rejected_unreachable', '2026-10-11', true],
    ]);
  });

  it('an accepted row with ⛔ report and a `delivered` row read AS STORED (`-351` 1 A)', () => {
    const rows = [
      row('o', 3, 'accepted', 'A', 'undelivered'),
      row('silent', 5, 'accepted', 'A', null),
      row('dlv', 7, 'accepted', 'A', 'delivered'),
    ];
    expect(outcomes(applyConcludedLadderMapping(rows, [concluded('o', '2026-10-11')]))).toEqual([
      ['o', 'rejected_unreachable', '2026-10-11', true],
      ['silent', 'accepted', null, null],
      ['dlv', 'accepted', null, null],
    ]);
  });

  it('another person and another number are ⛔ touched', () => {
    const rows = [
      row('o', 3, 'accepted', 'A', 'undelivered'),
      row('other', 3, 'accepted', 'A', 'undelivered', { recipientKey: 'nominee:x' }),
    ];
    const out = applyConcludedLadderMapping(rows, [concluded('o', '2026-10-11')]);
    expect(outcomes(out)).toEqual([
      ['o', 'rejected_unreachable', '2026-10-11', true],
      ['other', 'accepted', null, null],
    ]);
    // A row on number B after A's epoch: its own (B) epoch has ⛔ concluded ladder.
    const ab = [row('o', 3, 'accepted', 'A', 'undelivered'), row('b', 5, 'accepted', 'B', 'undelivered')];
    expect(outcomes(applyConcludedLadderMapping(ab, [concluded('o', '2026-10-11')]))[1]).toEqual(['b', 'accepted', null, null]);
  });

  it('⭐ I4 — ⛔ concluded ladder (a running / ended one is ⛔ passed) ⇒ every row as stored, a copy', () => {
    const rows = [row('o', 3, 'accepted', 'A', 'undelivered')];
    const out = applyConcludedLadderMapping(rows, []);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
  });

  it('⭐ A→B→A with a concluded ladder in EACH A epoch: every row ONCE, in input order, each by its OWN epoch\'s ladder', () => {
    const rows = [
      row('a1', 1, 'accepted', 'A', 'undelivered'),
      row('a2', 2, 'accepted', 'A', 'undelivered'),
      row('b1', 4, 'accepted', 'B', 'undelivered'),
      row('a3', 6, 'accepted', 'A', 'undelivered'),
      row('a4', 7, 'accepted', 'A', null),
    ];
    const out = applyConcludedLadderMapping(rows, [concluded('a1', '2026-10-09'), concluded('a3', '2026-10-15')]);
    expect(out).toHaveLength(rows.length);
    expect(outcomes(out)).toEqual([
      ['a1', 'rejected_unreachable', '2026-10-09', true],
      ['a2', 'rejected_unreachable', '2026-10-09', true],
      ['b1', 'accepted', null, null],
      ['a3', 'rejected_unreachable', '2026-10-15', true],
      ['a4', 'accepted', null, null],
    ]);
    expect(out.filter((r) => r.outcome === 'accepted')).toHaveLength(2);
  });

  it('two concluded ladders in one epoch ⇒ the EARLIEST conclusion date', () => {
    const rows = [row('o1', 1, 'accepted', 'A', 'undelivered'), row('o2', 9, 'accepted', 'A', 'undelivered')];
    const out = applyConcludedLadderMapping(rows, [concluded('o2', '2026-10-17'), concluded('o1', '2026-10-09')]);
    expect(out.map((r) => r.deadOn)).toEqual(['2026-10-09', '2026-10-09']);
  });

  it('a ladder whose origin is ⛔ among the rows maps nothing; a row with ⛔ reminderId never anchors one', () => {
    const rows = [row('o', 3, 'accepted', 'A', 'undelivered')];
    expect(outcomes(applyConcludedLadderMapping(rows, [concluded('missing', '2026-10-11')]))).toEqual([['o', 'accepted', null, null]]);
    const noId = [{ ...row('o', 3, 'accepted', 'A', 'undelivered'), reminderId: undefined }];
    expect(applyConcludedLadderMapping(noId, [concluded('o', '2026-10-11')])[0]!.outcome).toBe('accepted');
  });

  it('non-evidential rows (attempting / skipped_superseded / a hash-less error) are unchanged and ⛔ split the epoch', () => {
    const rows = [
      row('o', 1, 'accepted', 'A', 'undelivered'),
      row('att', 2, 'attempting', null),
      row('skp', 3, 'skipped_superseded', null),
      row('err', 4, 'error', null),
      row('l', 5, 'accepted', 'A', 'undelivered'),
    ];
    expect(outcomes(applyConcludedLadderMapping(rows, [concluded('o', '2026-10-09')]))).toEqual([
      ['o', 'rejected_unreachable', '2026-10-09', true],
      ['att', 'attempting', null, null],
      ['skp', 'skipped_superseded', null, null],
      ['err', 'error', null, null],
      ['l', 'rejected_unreachable', '2026-10-09', true],
    ]);
  });

  it('⛔ an input row mutated (I2 — the mapping is a read-time view)', () => {
    const rows = [row('o', 3, 'accepted', 'A', 'undelivered'), row('l', 5, 'accepted', 'A', 'undelivered')];
    const before = structuredClone(rows);
    applyConcludedLadderMapping(rows, [concluded('o', '2026-10-11')]);
    expect(rows).toEqual(before);
  });
});

// ── evaluatePersonRunState — LD7 ──────────────────────────────────────────────────────────────────────────────

describe('evaluatePersonRunState — LD7 (the MIN found-dead date, `not_delivered`)', () => {
  it('with ⛔ `deadOn` anywhere it is today\'s result: the first dead row\'s date and kind', () => {
    const a = evaluatePersonRunState([row('1', 1, 'accepted', 'A'), row('2', 3, 'rejected_invalid_number', 'A'), row('3', 5, 'rejected_unreachable', 'A')], []);
    expect([a.foundDeadOn, a.deadKind]).toEqual(['2026-10-03', 'dead']);
    const b = evaluatePersonRunState([row('1', 2, 'no_target', null), row('2', 4, 'rejected_invalid_number', null)], []);
    expect([b.foundDeadOn, b.deadKind]).toEqual(['2026-10-02', 'unreachable']);
  });

  it('only a concluded row ⇒ found dead on its conclusion date, `not_delivered`', () => {
    const [r] = applyConcludedLadderMapping([row('o', 1, 'accepted', 'A', 'undelivered')], [concluded('o', '2026-10-09')]);
    const s = evaluatePersonRunState([r!], []);
    expect([s.foundDeadOn, s.deadKind]).toEqual(['2026-10-09', 'not_delivered']);
  });

  it('⭐ a concluded origin sent BEFORE a send-time refusal but dated after it ⇒ the refusal\'s date and kind (the MIN)', () => {
    const rows = applyConcludedLadderMapping(
      [row('o', 1, 'accepted', 'A', 'undelivered'), row('r', 5, 'rejected_invalid_number', 'A')],
      [concluded('o', '2026-10-09')],
    );
    const s = evaluatePersonRunState(rows, []);
    expect([s.foundDeadOn, s.deadKind]).toEqual(['2026-10-05', 'dead']);
  });

  it('a concluded row dead LATER than an earlier send-time refusal ⇒ the refusal', () => {
    const rows = applyConcludedLadderMapping(
      [row('r', 1, 'rejected_unreachable', 'A'), row('o', 3, 'accepted', 'A', 'undelivered')],
      [concluded('o', '2026-10-11')],
    );
    const s = evaluatePersonRunState(rows, []);
    expect([s.foundDeadOn, s.deadKind]).toEqual(['2026-10-01', 'unreachable']);
  });

  it('⭐ the tie-break — a concluded row and a refusal on the SAME date: the EARLIER row in time order gives the kind (both orders)', () => {
    // (a) the concluded origin (sent day 1, dead 2026-10-09) is EARLIER in time than the day-9 refusal.
    const a = evaluatePersonRunState(
      applyConcludedLadderMapping([row('o', 1, 'accepted', 'A', 'undelivered'), row('r', 9, 'rejected_invalid_number', 'A')], [concluded('o', '2026-10-09')]),
      [],
    );
    expect([a.foundDeadOn, a.deadKind]).toEqual(['2026-10-09', 'not_delivered']);
    // (b) the refusal (sent day 2) is EARLIER in time than the concluded row (sent day 4); both are dead on 2026-10-02.
    const b = evaluatePersonRunState(
      applyConcludedLadderMapping(
        [row('r', 2, 'rejected_invalid_number', 'A'), row('o', 4, 'accepted', 'A', 'undelivered')],
        [concluded('o', '2026-10-02')],
      ),
      [],
    );
    expect([b.foundDeadOn, b.deadKind]).toEqual(['2026-10-02', 'dead']);
  });

  it('the reset is unaffected — a concluded row on an OLD number changes ⛔ the current number\'s facts', () => {
    const rows = applyConcludedLadderMapping([row('o', 1, 'accepted', 'A', 'undelivered'), row('b', 4, 'accepted', 'B')], [concluded('o', '2026-10-09')]);
    const s = evaluatePersonRunState(rows, []);
    expect([s.foundDeadOn, s.deadKind]).toEqual([null, null]);
    const reset = evaluatePersonRunState(rows, [], 'C');
    expect(reset.reset).toBe(true);
    expect(reset.foundDeadOn).toBeNull();
  });
});

// ── planLadderStart (LD5) ─────────────────────────────────────────────────────────────────────────────────────

const TODAY = date(10);
type StartInput = Parameters<typeof planLadderStart>[0];
const start = (over: Partial<StartInput> & Pick<StartInput, 'rows'>): ReturnType<typeof planLadderStart> =>
  planLadderStart({ today: TODAY, ladderRows: [], currentNumberHash: 'A', ladders: [], calls: [], stopOfRun: () => null, ...over });
const ladder = (
  originRowId: string,
  state: LadderStartFact['state'],
  originAt: number,
  endedAt: number | null,
  recipientNumberHash = 'A',
): LadderStartFact => ({
  state,
  originRowId,
  originCreatedAt: t(originAt),
  endedAt: endedAt === null ? null : t(endedAt),
  recipientNumberHash,
});
const call = (calledOn: string, outcome: LadderCallFact['outcome'] = 'reached'): LadderCallFact => ({ outcome, calledOn, createdAt: t(500) });

describe('planLadderStart (LD5)', () => {
  it('accepted + undelivered ⇒ that row; ⛔ report / delivered ⇒ ⛔', () => {
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered')] })?.reminderId).toBe('o');
    expect(start({ rows: [row('o', 5, 'accepted', 'A', null)] })).toBeNull();
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'delivered')] })).toBeNull();
  });

  it('an OLD-number row ⇒ ⛔ (not the current hash, or not the current epoch); a ⛔ sendable number ⇒ ⛔', () => {
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered')], currentNumberHash: 'B' })).toBeNull();
    // A then B: the current epoch is B's; the A row is history.
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered'), row('b', 6, 'accepted', 'B')], currentNumberHash: 'B' })).toBeNull();
    // A → B → A: the first-A-epoch row is ⛔ the current epoch.
    expect(
      start({ rows: [row('o', 4, 'accepted', 'A', 'undelivered'), row('b', 5, 'accepted', 'B'), row('a', 6, 'accepted', 'A')] }),
    ).toBeNull();
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered')], currentNumberHash: null })).toBeNull();
  });

  it('a RUNNING ladder for the person ⇒ ⛔ (I5)', () => {
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered')], ladders: [ladder('x', 'running', 1, null)] })).toBeNull();
  });

  it('a later row of the same number reported `delivered` (a family or a ladder SMS) ⇒ ⛔ (4 A — already reached)', () => {
    expect(start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered'), row('d', 7, 'accepted', 'A', 'delivered')] })).toBeNull();
    expect(
      start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered')], ladderRows: [{ recipientNumberHash: 'A', createdAt: t(70), deliveryState: 'delivered' }] }),
    ).toBeNull();
    // A delivered row on ANOTHER number blocks nothing.
    expect(
      start({ rows: [row('o', 5, 'accepted', 'A', 'undelivered')], ladderRows: [{ recipientNumberHash: 'B', createdAt: t(70), deliveryState: 'delivered' }] })
        ?.reminderId,
    ).toBe('o');
  });

  it('a reached call on/after the row\'s date ⇒ ⛔; an earlier one, or a `not_reached` one, starts', () => {
    const rows = [row('o', 5, 'accepted', 'A', 'undelivered')];
    expect(start({ rows, calls: [call(date(5))] })).toBeNull();
    expect(start({ rows, calls: [call(date(6))] })).toBeNull();
    expect(start({ rows, calls: [call(date(4))] })?.reminderId).toBe('o');
    expect(start({ rows, calls: [call(date(6), 'not_reached')] })?.reminderId).toBe('o');
  });

  it('⚠ the no-restart rule — a ladder CONCLUDED on this number in the current epoch ⇒ ⛔', () => {
    const rows = [row('c', 2, 'accepted', 'A', 'undelivered'), row('o', 5, 'accepted', 'A', 'undelivered')];
    expect(start({ rows, ladders: [ladder('c', 'concluded_undelivered', 20, 25)] })).toBeNull();
  });

  it('an ENDED (delivered) ladder, then a NEW failure created after its end ⇒ starts; the old origin never restarts', () => {
    const rows = [row('c', 2, 'accepted', 'A', 'undelivered'), row('n', 6, 'accepted', 'A', 'undelivered')];
    expect(start({ rows, ladders: [ladder('c', 'ended_delivered', 20, 30)] })?.reminderId).toBe('n');
    expect(start({ rows: [rows[0]!], ladders: [ladder('c', 'ended_delivered', 20, 30)] })).toBeNull();
  });

  it('a row COVERED by a stopped ladder (created between its origin and its end) ⇒ ⛔; one created after the end starts', () => {
    const rows = [row('c', 2, 'accepted', 'A', 'undelivered'), row('cov', 4, 'accepted', 'A', 'undelivered'), row('n', 8, 'accepted', 'A', 'undelivered')];
    expect(start({ rows: rows.slice(0, 2), ladders: [ladder('c', 'ended_stopped', 20, 50)] })).toBeNull();
    expect(start({ rows, ladders: [ladder('c', 'ended_stopped', 20, 50)] })?.reminderId).toBe('n');
  });

  // Review round 2 P1 — a ladder covers only rows to ITS number.
  it('⭐ a failed text to a NEW number inside an old-number ladder\'s window ⇒ ⛔ covered — it starts; on the SAME number it is covered', () => {
    // The person moved A → B; the 10:00 chase sweep texted B (t(40)) BEFORE the ladder sweep ended A's ladder (t(50)).
    const rows = [row('c', 2, 'accepted', 'A', 'undelivered'), row('b', 4, 'accepted', 'B', 'undelivered')];
    expect(start({ rows, currentNumberHash: 'B', ladders: [ladder('c', 'ended_number_changed', 20, 50, 'A')] })?.reminderId).toBe('b');
    // The control: a ladder on B over the same window DOES cover the row.
    expect(start({ rows, currentNumberHash: 'B', ladders: [ladder('x', 'ended_stopped', 20, 50, 'B')] })).toBeNull();
  });

  // Review round 2 P33 — AC4's A→B→A leg after a conclusion on the FIRST A epoch.
  it('⭐ A→B→A after a conclusion on A: the new A epoch\'s report is ⛔ mapped by the old ladder, and it STARTS a ladder', () => {
    const rows = [
      row('a1', 2, 'accepted', 'A', 'undelivered'),
      row('b', 3, 'accepted', 'B'),
      row('a2', 5, 'accepted', 'A', 'undelivered'),
    ];
    expect(outcomes(applyConcludedLadderMapping(rows, [concluded('a1', date(9))]))).toEqual([
      ['a1', 'rejected_unreachable', date(9), true],
      ['b', 'accepted', null, null],
      ['a2', 'accepted', null, null],
    ]);
    // The no-restart rule keys on the CURRENT epoch (a2's) — a1's conclusion is history; its window ended before a2.
    expect(start({ rows, ladders: [ladder('a1', 'concluded_undelivered', 20, 25)] })?.reminderId).toBe('a2');
  });

  it('a row sent more than CONTACT_LADDER_SCAN_DAYS ago ⇒ ⛔', () => {
    expect(CONTACT_LADDER_SCAN_DAYS).toBe(14);
    const old = row('o', 1, 'accepted', 'A', 'undelivered', { sentOn: '2026-09-25' });
    expect(start({ rows: [old] })).toBeNull();
    const edge = row('o', 1, 'accepted', 'A', 'undelivered', { sentOn: '2026-09-26' });
    expect(start({ rows: [edge] })?.reminderId).toBe('o');
  });

  it('a row whose run\'s stop is non-null is skipped — the next eligible LATER row starts; the EARLIEST passing row wins', () => {
    const rows = [
      row('s', 3, 'accepted', 'A', 'undelivered', { runId: 'run-stopped' }),
      row('p1', 5, 'accepted', 'A', 'undelivered'),
      row('p2', 7, 'accepted', 'A', 'undelivered'),
    ];
    expect(start({ rows, stopOfRun: (r) => (r === 'run-stopped' ? 'run_ended' : null) })?.reminderId).toBe('p1');
    expect(start({ rows })?.reminderId).toBe('s');
  });
});

// ── The step dates (LD3) ──────────────────────────────────────────────────────────────────────────────────────

describe('the step dates (LD3)', () => {
  it('ladderFirstDueOn — D + 2; a PASSED date ⇒ tomorrow; D + 2 = today ⇒ today', () => {
    expect(ladderFirstDueOn('2026-10-05', '2026-10-06')).toBe('2026-10-07');
    expect(ladderFirstDueOn('2026-10-05', '2026-10-07')).toBe('2026-10-07');
    expect(ladderFirstDueOn('2026-10-05', '2026-10-09')).toBe('2026-10-10');
  });

  it('nextLadderStepDate — anchor + gap, ⛔ earlier than tomorrow', () => {
    expect(nextLadderStepDate('2026-10-07', 2, '2026-10-07')).toBe('2026-10-09');
    expect(nextLadderStepDate('2026-10-09', 4, '2026-10-09')).toBe('2026-10-13');
    expect(nextLadderStepDate('2026-10-07', 2, '2026-10-12')).toBe('2026-10-13');
  });

  const l = (over: Partial<Parameters<typeof dueLadderStep>[0]> = {}): Parameters<typeof dueLadderStep>[0] => ({
    state: 'running',
    sms2DueOn: '2026-10-07',
    sms2State: 'pending',
    sms3DueOn: null,
    sms3State: 'pending',
    concludeOn: null,
    ...over,
  });

  it('dueLadderStep — ONE step per run, in order, ⛔ before its date', () => {
    expect(dueLadderStep(l(), '2026-10-06')).toBeNull();
    expect(dueLadderStep(l(), '2026-10-07')).toBe(2);
    expect(dueLadderStep(l(), '2026-10-20')).toBe(2);
    const after2 = l({ sms2State: 'sent', sms3DueOn: '2026-10-09' });
    expect(dueLadderStep(after2, '2026-10-08')).toBeNull();
    expect(dueLadderStep(after2, '2026-10-09')).toBe(3);
    const after3 = l({ sms2State: 'satisfied', sms3DueOn: '2026-10-09', sms3State: 'skipped:past_horizon', concludeOn: '2026-10-13' });
    expect(dueLadderStep(after3, '2026-10-12')).toBeNull();
    expect(dueLadderStep(after3, '2026-10-13')).toBe('conclude');
    // SMS 3 is ⛔ due while SMS 2 is still pending, even with a date.
    expect(dueLadderStep(l({ sms3DueOn: '2026-10-01' }), '2026-10-06')).toBeNull();
  });

  // Review P9 — the step columns alone are ⛔ enough: an ENDED ladder whose sms2/sms3 columns still read `pending`
  // (it ended before reaching that step) must never read as having a step due.
  it('dueLadderStep — a non-`running` ladder is NEVER due, even with a due step column', () => {
    for (const state of ['ended_delivered', 'ended_call', 'ended_number_changed', 'ended_stopped', 'concluded_undelivered'] as const) {
      expect(dueLadderStep(l({ state }), '2026-10-07')).toBeNull();
      expect(dueLadderStep(l({ state, sms2State: 'sent', sms3DueOn: '2026-10-09' }), '2026-10-09')).toBeNull();
    }
  });
});

// ── ladderEndReason (AC3) ─────────────────────────────────────────────────────────────────────────────────────

describe('ladderEndReason (AC3)', () => {
  type EndInput = Parameters<typeof ladderEndReason>[0];
  const end = (over: Partial<EndInput>) =>
    ladderEndReason({
      ladder: { originSentOn: date(5), recipientNumberHash: 'A' },
      originCreatedAt: t(50),
      rows: [],
      satisfyingRows: [],
      calls: [],
      currentNumberHash: 'A',
      stop: null,
      ...over,
    });
  const r = (at: number, hash: string, deliveryState: 'delivered' | 'undelivered' | null) => ({ recipientNumberHash: hash, createdAt: t(at), deliveryState });

  it.each<[string, Partial<EndInput>, ReturnType<typeof ladderEndReason>]>([
    ['delivered on a later row of the number', { rows: [r(70, 'A', 'delivered')] }, { state: 'ended_delivered', detail: 'delivered' }],
    ['delivered on a row created BEFORE the origin', { rows: [r(30, 'A', 'delivered')] }, null],
    ['delivered on ANOTHER number', { rows: [r(70, 'B', 'delivered')] }, null],
    ['delivered on a SATISFYING row', { satisfyingRows: [{ deliveryState: 'delivered' }] }, { state: 'ended_delivered', detail: 'delivered' }],
    ['a reached call on the origin date', { calls: [call(date(5))] }, { state: 'ended_call', detail: 'call_reached' }],
    ['a reached call before the origin', { calls: [call(date(4))] }, null],
    ['a `not_reached` call', { calls: [call(date(6), 'not_reached')] }, null],
    ['a known DIFFERENT current number', { currentNumberHash: 'B' }, { state: 'ended_number_changed', detail: 'number_changed' }],
    ['⛔ sendable number now', { currentNumberHash: null }, { state: 'ended_number_changed', detail: 'number_changed' }],
    ['an UNKNOWN current number', { currentNumberHash: undefined }, null],
    ['a stop', { stop: 'not_a_recipient' }, { state: 'ended_stopped', detail: 'stopped:not_a_recipient' }],
    ['PQ1 A — a silent ladder SMS', { rows: [r(70, 'A', null)] }, null],
    ['an `undelivered` ladder SMS', { rows: [r(70, 'A', 'undelivered')] }, null],
  ])('%s', (_label, over, expected) => {
    expect(end(over)).toEqual(expected);
  });

  it('precedence: delivered ≻ call ≻ number change ≻ stop', () => {
    const all = { rows: [r(70, 'A', 'delivered')], calls: [call(date(6))], currentNumberHash: 'B', stop: 'run_ended' } as const;
    expect(end(all)?.state).toBe('ended_delivered');
    expect(end({ ...all, rows: [] })?.state).toBe('ended_call');
    expect(end({ ...all, rows: [], calls: [] })?.state).toBe('ended_number_changed');
    expect(end({ ...all, rows: [], calls: [], currentNumberHash: 'A' })?.state).toBe('ended_stopped');
  });
});

// ── ladderStepGate (LD3, LD4, PQ3 A) ──────────────────────────────────────────────────────────────────────────

describe('ladderStepGate', () => {
  const g = (over: Partial<Parameters<typeof ladderStepGate>[0]>) =>
    ladderStepGate({ chase: 'correction', runDay: 10, paused: false, scheduledToday: false, sentToNumberToday: false, ...over });
  it.each<[Partial<Parameters<typeof ladderStepGate>[0]>, string]>([
    [{ runDay: 89 }, 'send'],
    [{ runDay: 90 }, 'skipped:past_horizon'],
    [{ chase: 'certificate', runDay: 180 }, 'send'],
    [{ chase: 'certificate', runDay: 181 }, 'skipped:past_horizon'],
    [{ chase: 'certificate', paused: true }, 'skipped:paused'],
    [{ chase: 'certificate', runDay: 181, paused: true }, 'skipped:past_horizon'],
    [{ scheduledToday: true }, 'satisfied'],
    [{ sentToNumberToday: true }, 'satisfied'],
    [{ runDay: 90, scheduledToday: true }, 'skipped:past_horizon'],
  ])('%j ⇒ %s', (over, expected) => {
    expect(g(over)).toBe(expected);
  });
});

// ── ladderAsk (LD9, LD11) ─────────────────────────────────────────────────────────────────────────────────────

describe('ladderAsk (LD9 — cap-aware; LD11 — nominee calls)', () => {
  it.each<['nominee' | 'claimant', boolean, boolean, string]>([
    ['claimant', false, false, 'call_or_letter'],
    ['claimant', true, false, 'call'],
    ['nominee', false, false, 'letter'],
    ['nominee', true, false, 'none'],
    ['nominee', false, true, 'call_or_letter'],
    ['nominee', true, true, 'call'],
  ])('%s, at cap %s, nominee calls cleared %s ⇒ %s', (role, letterCapReached, nomineeCallsCleared, expected) => {
    expect(ladderAsk({ role, letterCapReached, nomineeCallsCleared })).toBe(expected);
  });
});

describe('reachedCallSince / pendingLadderAsk / ladderWhatsappStep', () => {
  // `2026-10-18-363` decision 1 — ONE rule: a reached call answers iff it was MADE on/after the ladder's origin date.
  const calls: LadderCallFact[] = [
    { outcome: 'reached', calledOn: '2026-10-08', createdAt: t(80) },
    { outcome: 'reached', calledOn: '2026-10-06', createdAt: t(90) },
    { outcome: 'not_reached', calledOn: '2026-10-07', createdAt: t(95) },
    { outcome: 'reached', calledOn: '2026-10-01', createdAt: t(10) },
  ];

  it('the EARLIEST reached call MADE on/after the origin date; ⛔ not_reached; ⛔ one made before; ⛔ origin ⇒ null', () => {
    expect(reachedCallSince(calls, '2026-10-05')).toBe('2026-10-06');
    expect(reachedCallSince(calls, '2026-10-06')).toBe('2026-10-06'); // the origin's own day counts (a date-only record)
    expect(reachedCallSince(calls, '2026-10-01')).toBe('2026-10-01');
    expect(reachedCallSince(calls, '2026-10-09')).toBeNull();
    expect(reachedCallSince(calls, null)).toBeNull();
    expect(reachedCallSince([], '2026-10-01')).toBeNull();
  });

  it('⭐ RECORDED time is irrelevant: a call logged LATE but made after the origin answers; one made before it never does', () => {
    const lateLogged: LadderCallFact = { outcome: 'reached', calledOn: '2026-10-06', createdAt: t(10_000) };
    const earlierLadderCall: LadderCallFact = { outcome: 'reached', calledOn: '2026-10-03', createdAt: t(10_000) };
    expect(reachedCallSince([earlierLadderCall], '2026-10-05')).toBeNull();
    expect(reachedCallSince([earlierLadderCall, lateLogged], '2026-10-05')).toBe('2026-10-06');
  });

  const view = (over: Partial<LadderViewFact> = {}): LadderViewFact => ({
    state: 'concluded_undelivered',
    createdAt: t(100),
    endedAt: t(900),
    originSentOn: '2026-10-05',
    sms2DueOn: '2026-10-07',
    sms2State: 'sent',
    sms3DueOn: '2026-10-09',
    sms3State: 'sent',
    concludeOn: '2026-10-13',
    concludedOn: '2026-10-13',
    ...over,
  });
  const ask = (c: readonly LadderCallFact[], letterRecordedAt: readonly Date[] = []) =>
    pendingLadderAsk({ ladders: [view()], calls: c, letterRecordedAt, role: 'claimant', letterCapReached: false, nomineeCallsCleared: false });

  it('⭐ pendingLadderAsk uses the SAME rule — a call before the origin leaves the ask open; a late-logged one after it closes it', () => {
    expect(ask([])).toBe('call_or_letter');
    // A call that ended an EARLIER ladder (made before this origin), even if RECORDED after the conclusion ⇒ still open.
    expect(ask([{ outcome: 'reached', calledOn: '2026-10-03', createdAt: t(2_000) }])).toBe('call_or_letter');
    // Made between the failure and the conclusion, logged after it ⇒ answered.
    expect(ask([{ outcome: 'reached', calledOn: '2026-10-10', createdAt: t(2_000) }])).toBeNull();
    // Made after the conclusion ⇒ answered; `not_reached` ⇒ ⛔.
    expect(ask([{ outcome: 'reached', calledOn: '2026-10-14', createdAt: t(2_000) }])).toBeNull();
    expect(ask([{ outcome: 'not_reached', calledOn: '2026-10-14', createdAt: t(2_000) }])).toBe('call_or_letter');
    // A letter recorded after the conclusion still answers it.
    expect(ask([], [t(1_000)])).toBeNull();
  });

  it('LD1 / `-356` — a nominee\'s WhatsApp step is ⛔ ever built; a claimant\'s waits for 6-37d', () => {
    expect(ladderWhatsappStep('nominee')).toBe('skipped:nominee_no_whatsapp');
    expect(ladderWhatsappStep('claimant')).toBe('skipped:whatsapp_not_built');
  });
});
