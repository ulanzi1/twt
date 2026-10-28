// The alert SMS send record's accessors — the guards that fire BEFORE any statement (Story 5.11b code review 2026-10-25, C1-P2).
// DB-free: each guard throws before `q.query` is reached, so a `q` that fails the test if it is touched proves "no statement".

import { describe, expect, it, vi } from 'vitest';

import {
  finaliseAlertSmsSend,
  giveUpDeferredAlertSmsSend,
  recordLadderDeliveredAlertSmsSend,
} from '../../src/sms-delivery/alert-sms-sends.js';

const PARIWAR = '00000000-0000-4000-8000-0000000000a1';
const SEND = '00000000-0000-4000-8000-0000000000b1';

function untouchedQ() {
  const query = vi.fn(() => Promise.reject(new Error('a guard must fire before any statement')));
  return { q: { query } as never, query };
}

describe('finaliseAlertSmsSend — `deferred` is the ONE re-sendable state, so only a rate_limited answer may put a row there (FS9)', () => {
  const base = { pariwarId: PARIWAR, sendId: SEND, claimToken: 'job:0', outcome: 'deferred' as const };

  it.each([
    ['no detail', null],
    ['an auth class', 'auth:401'],
    ['an exhausted rate_limited (a FINAL word on a re-sendable row)', 'exhausted:rate_limited:http_429'],
    ['the outcome-unknown word', 'exhausted:outcome_unknown'],
  ])('refuses `deferred` with %s — before any statement', async (_name, detail) => {
    const { q, query } = untouchedQ();
    await expect(finaliseAlertSmsSend(q, { ...base, detail })).rejects.toThrow(/deferred needs a rate_limited/);
    expect(query).not.toHaveBeenCalled();
  });

  it('writes a `deferred` row with a `rate_limited:<code>` detail (the statement IS reached)', async () => {
    const query = vi.fn(() => Promise.resolve({ rowCount: 1 }));
    expect(await finaliseAlertSmsSend({ query } as never, { ...base, detail: 'rate_limited:http_429' })).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not apply the deferred guard to the other outcomes (an exhausted rate_limited is a valid FINAL error detail)', async () => {
    const query = vi.fn(() => Promise.resolve({ rowCount: 1 }));
    expect(
      await finaliseAlertSmsSend({ query } as never, { ...base, outcome: 'error', detail: 'exhausted:rate_limited:http_429' }),
    ).toBe(true);
  });
});

describe('giveUpDeferredAlertSmsSend — a give-up is FINAL, so its detail is an exhausted:<…> one', () => {
  it.each(['rate_limited:http_429', 'auth:401', 'config:sms_messaging_unavailable'])(
    'refuses the live-answer detail %s — before any statement',
    async (detail) => {
      const { q, query } = untouchedQ();
      await expect(giveUpDeferredAlertSmsSend(q, { pariwarId: PARIWAR, sendId: SEND, detail })).rejects.toThrow(/exhausted/);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('accepts an exhausted:<…> detail from the grammar and reports whether the deferred row moved', async () => {
    const hit = vi.fn(() => Promise.resolve({ rowCount: 1 }));
    expect(await giveUpDeferredAlertSmsSend({ query: hit } as never, { pariwarId: PARIWAR, sendId: SEND, detail: 'exhausted:config_unavailable:secret_manager' })).toBe(true);
    const miss = vi.fn(() => Promise.resolve({ rowCount: 0 }));
    expect(await giveUpDeferredAlertSmsSend({ query: miss } as never, { pariwarId: PARIWAR, sendId: SEND, detail: 'exhausted:rate_limited:http_429' })).toBe(false);
  });
});

describe('recordLadderDeliveredAlertSmsSend — Story 5.8b code review 2026-10-28 (second pass): the TERMINAL row, written only FINAL', () => {
  const base = {
    pariwarId: PARIWAR,
    alertId: '00000000-0000-4000-8000-0000000000c1',
    memberId: '00000000-0000-4000-8000-0000000000d1',
    occasion: 'cycle_open' as const,
    message: 'cycle_open_bridge' as const,
    locale: 'hi' as const,
    claimToken: 'job:0',
  };

  it.each([
    ['a live-answer word', 'rate_limited:http_429'],
    ['a word outside the grammar', 'ladder_delivered'],
    // Code review 2026-10-28 (third pass): ONLY `exhausted:ladder_delivered` — another FINAL word in the grammar is refused too.
    ['another exhausted word', 'exhausted:rate_limited:ladder_delivered'],
    ['the outcome-unknown word', 'exhausted:outcome_unknown'],
  ])('refuses %s — before any statement', async (_name, detail) => {
    const { q, query } = untouchedQ();
    await expect(recordLadderDeliveredAlertSmsSend(q, { ...base, detail })).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    ['another occasion', { occasion: 'day_10' as const, message: 'deadline_not_recorded' as const }],
    ['the bridge message on another occasion', { occasion: 'day_10' as const }],
    ['another message on the bridge occasion', { message: 'deadline_not_recorded' as const }],
  ])('code review 2026-10-28 (third pass) — refuses %s — before any statement (only the bridge row)', async (_name, change) => {
    const { q, query } = untouchedQ();
    await expect(recordLadderDeliveredAlertSmsSend(q, { ...base, ...change, detail: 'exhausted:ladder_delivered' })).rejects.toThrow(/bridge row/);
    expect(query).not.toHaveBeenCalled();
  });

  it('inserts `attempting` then CAS-es it to `error` on the same claim token (`true`); a conflict inserts nothing and writes nothing (`false`)', async () => {
    const query = vi.fn((sql: string) =>
      Promise.resolve(sql.includes('INSERT') ? { rows: [{ send_id: SEND }], rowCount: 1 } : { rows: [], rowCount: 1 }),
    );
    expect(await recordLadderDeliveredAlertSmsSend({ query } as never, { ...base, detail: 'exhausted:ladder_delivered' })).toBe(true);
    const calls = query.mock.calls as unknown as [string, unknown[]][];
    expect(calls.map(([sql]) => sql.trim().split(/\s+/)[0])).toEqual(['INSERT', 'UPDATE']);
    expect(calls[0]![0]).toContain("'attempting'");
    expect(calls[1]![1]).toEqual([PARIWAR, SEND, 'job:0', 'exhausted:ladder_delivered']);
    const conflict = vi.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));
    expect(await recordLadderDeliveredAlertSmsSend({ query: conflict } as never, { ...base, detail: 'exhausted:ladder_delivered' })).toBe(false);
    expect(conflict).toHaveBeenCalledTimes(1);
  });
});
