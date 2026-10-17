// The SMS correlation id (MSG91's `CRQID`) — DB-free unit tests (Story 6.37b, Task 1.1; DR3).

import { describe, expect, it } from 'vitest';

import {
  SMS_CORRELATION_ID_PATTERN,
  SMS_CORRELATION_KINDS,
  formatSmsCorrelationId,
  isSmsCorrelationId,
  parseSmsCorrelationId,
} from '../../src/sms-delivery/correlation.js';
import { SMS_SEND_KINDS } from '../../src/schema/sms_send_deliveries.js';

const ROW = '0F1E2D3C-4B5A-4978-8695-a4b3c2d1e0f9';
const HEX = '0f1e2d3c4b5a49788695a4b3c2d1e0f9';

describe('formatSmsCorrelationId', () => {
  it('is the kind + the row uuid, lower-case, without dashes (34 characters)', () => {
    for (const kind of SMS_CORRELATION_KINDS) {
      const id = formatSmsCorrelationId({ kind, rowId: ROW });
      expect(id).toBe(`${kind}${HEX}`);
      expect(id).toHaveLength(34);
      expect(id).toMatch(SMS_CORRELATION_ID_PATTERN);
    }
  });

  it('fits both of MSG91 documented limits (alphanumeric; ≤ 52 — F7)', () => {
    const id = formatSmsCorrelationId({ kind: 'pm', rowId: ROW });
    expect(id).toMatch(/^[A-Za-z0-9]{1,52}$/);
  });

  it.each([
    ['not a uuid', 'abc'],
    ['empty', ''],
    ['uuid without dashes', HEX],
    ['uuid with a trailing space', `${ROW} `],
    ['uuid with braces', `{${ROW}}`],
  ])('throws on a row id that is %s', (_label, rowId) => {
    expect(() => formatSmsCorrelationId({ kind: 'cr', rowId })).toThrow(/sms correlation/);
  });

  it('throws on a kind outside the grammar', () => {
    expect(() => formatSmsCorrelationId({ kind: 'xx' as never, rowId: ROW })).toThrow(/sms correlation/);
  });

  it('never puts the rejected value in the error message', () => {
    try {
      formatSmsCorrelationId({ kind: 'cr', rowId: 'leaky-value-123' });
      expect.unreachable();
    } catch (err) {
      expect(String((err as Error).message)).not.toContain('leaky-value-123');
    }
  });
});

describe('parseSmsCorrelationId', () => {
  it('round-trips every kind back to its dashed, lower-case row id', () => {
    for (const kind of SMS_CORRELATION_KINDS) {
      const parsed = parseSmsCorrelationId(formatSmsCorrelationId({ kind, rowId: ROW }));
      expect(parsed).toEqual({ kind, rowId: ROW.toLowerCase() });
    }
  });

  it.each([
    ['MSG91 "none" (T7)', '0'],
    ['empty', ''],
    ['upper-case hex', `cr${HEX.toUpperCase()}`],
    ['an unknown kind', `xx${HEX}`],
    ['too short', `cr${HEX.slice(1)}`],
    ['too long', `cr${HEX}0`],
    ['dashed', `cr${ROW.toLowerCase()}`],
    ['a panel test value', 'Beta1'],
  ])('returns null for %s', (_label, value) => {
    expect(parseSmsCorrelationId(value)).toBeNull();
    expect(isSmsCorrelationId(value)).toBe(false);
  });

  it('accepts exactly the grammar ^(cr|ce|sn|pm|ot)[0-9a-f]{32}$', () => {
    expect(SMS_CORRELATION_ID_PATTERN.source).toBe('^(cr|ce|sn|pm|ot)[0-9a-f]{32}$');
    expect(isSmsCorrelationId(`ot${HEX}`)).toBe(true);
  });
});

describe('LOCKSTEP — the send kinds (code review round 2)', () => {
  it('the delivery table\'s kinds are EXACTLY the correlation kinds but the login code\'s `ot` (a new kind must reach both)', () => {
    expect([...SMS_SEND_KINDS].sort()).toEqual(SMS_CORRELATION_KINDS.filter((k) => k !== 'ot').sort());
  });
});
