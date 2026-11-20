// Story 14.3 (decision `2026-11-20-467` DL6) — the two-way IST helper for `datetime-local` inputs.
// A `datetime-local` value has no zone; staff type IST wall-clock time whatever zone the browser is in. These tests run with the
// process zone set to New York (UTC-5 / -4) so a helper that leaned on the machine's zone would be hours out.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { formatIst, isoToIstLocalInput, istLocalInputToIso } from '../src/modules/correction-chase/ist.js';

const ORIGINAL_TZ = process.env['TZ'];
beforeAll(() => {
  process.env['TZ'] = 'America/New_York';
});
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env['TZ'];
  else process.env['TZ'] = ORIGINAL_TZ;
});

describe('istLocalInputToIso / isoToIstLocalInput', () => {
  it('the test really runs outside IST', () => {
    expect(new Date('2026-11-20T12:00:00.000Z').getTimezoneOffset()).not.toBe(-330);
  });

  it('reads a `datetime-local` value as IST wall-clock time', () => {
    expect(istLocalInputToIso('2026-11-20T14:32')).toBe('2026-11-20T09:02:00.000Z');
    expect(istLocalInputToIso('2026-11-20T00:10')).toBe('2026-11-19T18:40:00.000Z'); // the IST day starts at 18:30 UTC the day before
    expect(istLocalInputToIso('2026-11-20T14:32:45')).toBe('2026-11-20T09:02:45.000Z');
    expect(istLocalInputToIso('2026-12-31T23:59')).toBe('2026-12-31T18:29:00.000Z');
  });

  it('refuses anything that is not a real date and time', () => {
    for (const bad of ['', '   ', '2026-11-20', '14:32', '2026-13-01T10:00', '2026-02-30T10:00', '2026-11-20T24:00', '2026-11-20T10:60', 'tomorrow', '2026-11-20T10:00Z', '2026-11-20T10:00+05:30']) {
      expect(istLocalInputToIso(bad), bad).toBeNull();
    }
  });

  it('writes an instant as the IST `datetime-local` value (minutes; seconds dropped)', () => {
    expect(isoToIstLocalInput('2026-11-20T09:02:00.000Z')).toBe('2026-11-20T14:32');
    expect(isoToIstLocalInput('2026-11-19T18:40:59.999Z')).toBe('2026-11-20T00:10');
    expect(isoToIstLocalInput('2026-11-20T14:32:00+05:30')).toBe('2026-11-20T14:32');
    expect(isoToIstLocalInput('not a date')).toBe('');
  });

  it('round-trips: input → instant → input', () => {
    for (const v of ['2026-11-20T14:32', '2026-01-01T00:00', '2026-06-30T23:59', '2024-02-29T05:29']) {
      expect(isoToIstLocalInput(istLocalInputToIso(v)!)).toBe(v);
    }
  });

  it('agrees with `formatIst` about the wall-clock time', () => {
    const iso = istLocalInputToIso('2026-11-20T14:32')!;
    expect(formatIst(iso)).toMatch(/2:32/);
    expect(formatIst(iso)).toMatch(/20 Nov 2026/);
  });
});
