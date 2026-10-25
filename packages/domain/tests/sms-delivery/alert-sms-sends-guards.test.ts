// The alert SMS send record's accessors — the guards that fire BEFORE any statement (Story 5.11b code review 2026-10-25, C1-P2).
// DB-free: each guard throws before `q.query` is reached, so a `q` that fails the test if it is touched proves "no statement".

import { describe, expect, it, vi } from 'vitest';

import {
  finaliseAlertSmsSend,
  giveUpDeferredAlertSmsSend,
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
