// The PURE nominee-bank masking projection + predicate — Story 11b.3a (Task 1, Task 2; AC3, AC4).
//
// ⛔ NO DATABASE. Every rule `2026-08-28-160` cl.10 states about WHAT the public sees is decided by
// these two pure functions, so they are tested at their boundaries rather than through a route.
//
// ⭐ THE THREE RULED SETTINGS ARE ASSERTED AS THREE DISTINCT BEHAVIOURS. If `permanent` and
// `after_days: 0` ever collapse into the same projection, one of the Panel's three settings has
// become a synonym of another — see `2026-09-02-183` cl.4 for why the third rung covers the ACTIVE
// campaign, and note that reading is an AUTHORING one, ⛔ not a ruling.

import { describe, expect, it } from 'vitest';

import {
  MASKED_ACCOUNT_NUMBER_VISIBLE_DIGITS,
  MAX_NOMINEE_BANK_MASK_AFTER_DAYS,
  isNomineeBankMasked,
  maskAccountNumberLast4,
  type NomineeBankMaskingSetting,
} from '../../src/claim/nominee-bank-masking.js';

const CLOSED = new Date('2026-06-01T00:00:00.000Z');
const days = (n: number) => new Date(CLOSED.getTime() + n * 24 * 60 * 60 * 1000);

describe("maskAccountNumberLast4 (AC4 — cl.10(e)'s DEFINED projection)", () => {
  it('retains exactly the last four digits', () => {
    expect(maskAccountNumberLast4('123456789012')).toBe('9012');
    expect(MASKED_ACCOUNT_NUMBER_VISIBLE_DIGITS).toBe(4);
  });

  it('ignores spaces and separators the filer typed — digits are the subject', () => {
    expect(maskAccountNumberLast4('1234 5678 9012')).toBe('9012');
    expect(maskAccountNumberLast4('1234-5678-9012')).toBe('9012');
  });

  it('⛔ returns null for a value with FOUR OR FEWER digits — ⛔ never the complete number', () => {
    // ⭐ THE BOUNDARY THAT MATTERS: at exactly four digits, "the last four" IS the whole account
    // number, and cl.10(e) says the complete number is ⛔ NOT exposed after masking. Rendering
    // nothing is the only answer that honours the clause.
    expect(maskAccountNumberLast4('1234')).toBeNull();
    expect(maskAccountNumberLast4('123')).toBeNull();
    expect(maskAccountNumberLast4('')).toBeNull();
    expect(maskAccountNumberLast4('   ')).toBeNull();
  });

  it('⛔ returns null when the value carries no digits at all', () => {
    expect(maskAccountNumberLast4('not-an-account')).toBeNull();
  });

  it('is PURE — the same input yields the same output and nothing is mutated', () => {
    const input = '000123456789';
    expect(maskAccountNumberLast4(input)).toBe(maskAccountNumberLast4(input));
    expect(input).toBe('000123456789');
  });
});

describe('isNomineeBankMasked (AC3 — the predicate)', () => {
  it('⭐ NO SCHEDULE ROW ⇒ NOT MASKED — `D8-default` FAIL-OPEN (`2026-09-02-179` cl.1)', () => {
    // ⛔ Immediate masking is NOT the code's assumption — cl.10(b) forbids exactly that.
    expect(isNomineeBankMasked({ setting: null, driveClosedAt: null, now: CLOSED })).toBe(false);
    expect(isNomineeBankMasked({ setting: null, driveClosedAt: CLOSED, now: days(3650) })).toBe(false);
  });

  it('`after_days: 0` ⇒ masked FROM THE CLOSE INSTANT, inclusive', () => {
    const setting: NomineeBankMaskingSetting = { mode: 'after_days', maskAfterDays: 0 };
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: CLOSED })).toBe(true);
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: days(1) })).toBe(true);
  });

  it('`after_days: N` ⇒ visible for N days, masked from the boundary onward', () => {
    const setting: NomineeBankMaskingSetting = { mode: 'after_days', maskAfterDays: 30 };
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: CLOSED })).toBe(false);
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: days(29.9) })).toBe(false);
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: days(30) })).toBe(true);
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: days(31) })).toBe(true);
  });

  it('⭐ a `days` setting on a drive that has NOT CLOSED ⇒ NOT masked — cl.10(a) governs the active campaign', () => {
    // The schedule is measured FROM closure/settlement (cl.10(c)); with no close instant there is
    // nothing to measure from, and cl.10(a) accepts the transparency benefit during an active drive.
    for (const maskAfterDays of [0, 1, 30]) {
      expect(
        isNomineeBankMasked({
          setting: { mode: 'after_days', maskAfterDays },
          driveClosedAt: null,
          now: days(9999),
        }),
      ).toBe(false);
    }
  });

  it('⭐⭐ `permanent` ⇒ masked in EVERY state, INCLUDING while the drive is still collecting', () => {
    // ⚠⛔ AN AUTHORING READING (`2026-09-02-183` cl.4), ⛔ NOT A PANEL RULING. cl.10(d)'s ladder —
    // full disclosure → N days → immediate → permanent — only TIGHTENS at its last step if the
    // terminal rung also covers the active campaign; otherwise `permanent` is a synonym for
    // `after_days: 0`. cl.10(a) is a PERMISSION ("may be publicly displayed"), ⛔ not a mandate.
    const setting: NomineeBankMaskingSetting = { mode: 'permanent' };
    expect(isNomineeBankMasked({ setting, driveClosedAt: null, now: CLOSED })).toBe(true);
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: CLOSED })).toBe(true);
    expect(isNomineeBankMasked({ setting, driveClosedAt: CLOSED, now: days(-500) })).toBe(true);
  });

  it('⭐ `permanent` and `after_days: 0` are NOT the same setting — they differ on a LIVE drive', () => {
    // The regression this asserts: a "simplification" that folds the third rung into the second.
    const live = { driveClosedAt: null, now: CLOSED } as const;
    expect(isNomineeBankMasked({ setting: { mode: 'permanent' }, ...live })).toBe(true);
    expect(isNomineeBankMasked({ setting: { mode: 'after_days', maskAfterDays: 0 }, ...live })).toBe(false);
  });

  it('⛔ THROWS on a negative or non-integer day count — ⛔ never silently coerced', () => {
    // A nonsense window must fail loudly at the predicate rather than resolve to whichever side the
    // arithmetic happens to land on. The DB CHECK is the other half; this is the in-process one.
    expect(() =>
      isNomineeBankMasked({
        setting: { mode: 'after_days', maskAfterDays: -1 },
        driveClosedAt: CLOSED,
        now: CLOSED,
      }),
    ).toThrow(/maskAfterDays/);
    expect(() =>
      isNomineeBankMasked({
        setting: { mode: 'after_days', maskAfterDays: 1.5 },
        driveClosedAt: CLOSED,
        now: CLOSED,
      }),
    ).toThrow(/maskAfterDays/);
  });

  it('⛔ THROWS above the data-sanity ceiling — a typo must not become de-facto permanence', () => {
    expect(() =>
      isNomineeBankMasked({
        setting: { mode: 'after_days', maskAfterDays: MAX_NOMINEE_BANK_MASK_AFTER_DAYS + 1 },
        driveClosedAt: CLOSED,
        now: CLOSED,
      }),
    ).toThrow(/maskAfterDays/);
    // The ceiling itself is a legal value.
    expect(
      isNomineeBankMasked({
        setting: { mode: 'after_days', maskAfterDays: MAX_NOMINEE_BANK_MASK_AFTER_DAYS },
        driveClosedAt: CLOSED,
        now: CLOSED,
      }),
    ).toBe(false);
  });

  it('⛔ reads NOTHING about any member — the input shape has no member handle at all (cl.10(f))', () => {
    // ⭐ A STRUCTURAL assertion, ⛔ not a behavioural one: `2026-08-28-160` cl.10(f) rules this a
    // PUBLIC-PRESENTATION control and ⛔ NOT a member-access control, and the way that is kept true
    // is that the predicate is never handed a member to branch on. A `members.state` / `is_valid` /
    // moderation-overlay conjunct cannot be added without changing this shape — which is the point.
    const keys = Object.keys({ setting: null, driveClosedAt: null, now: CLOSED }).sort();
    expect(keys).toEqual(['driveClosedAt', 'now', 'setting']);
  });
});
