// `buildSmsReportWebhookAuth` — Story 6.37b (Task 4; AC2; DR1's secret-failure table). One leg per ROW of the table, for
// the current and the next secret NAME: the webhook state, EXACTLY the boot line(s) (secret NAMES only — ⛔ a value), ⛔ a
// throw (the api starts in every row), and the resolver counted (resolved ONCE, at boot). DB-free.

import { describe, expect, it, vi } from 'vitest';

import type { ApiConfig } from '../../src/config.js';
import { buildSmsReportWebhookAuth } from '../../src/deps.js';

const GOOD = 'g'.repeat(32);
const GOOD_NEXT = 'n'.repeat(40);
const SHORT = 's'.repeat(31);

type Value = string | Error;

function harness(opts: {
  nodeEnv?: ApiConfig['nodeEnv'];
  current?: string;
  next?: string;
  values?: Record<string, Value>;
}) {
  const config = {
    nodeEnv: opts.nodeEnv ?? 'production',
    smsReportWebhook: {
      ...(opts.current !== undefined ? { tokenSecretName: opts.current } : {}),
      tokenEnvFallback: 'SMS_REPORT_WEBHOOK_TOKEN',
      ...(opts.next !== undefined ? { nextTokenSecretName: opts.next } : {}),
      nextTokenEnvFallback: 'SMS_REPORT_WEBHOOK_TOKEN_NEXT',
      rateMax: 1200,
    },
  } as Pick<ApiConfig, 'nodeEnv' | 'smsReportWebhook'>;
  const resolveSecret = vi.fn(async (name: string): Promise<string> => {
    const v = opts.values?.[name];
    if (v === undefined) throw new Error(`NOT_FOUND ${name}`);
    if (v instanceof Error) throw v;
    return v;
  });
  const warn: string[] = [];
  const error: string[] = [];
  const log = { warn: (l: string) => warn.push(l), error: (l: string) => error.push(l) };
  const build = () => buildSmsReportWebhookAuth({ config, resolveSecret, log });
  return { build, resolveSecret, warn, error };
}

/** ⛔ A token value in any line. */
function expectNoValue(lines: readonly string[]): void {
  for (const l of lines) for (const v of [GOOD, GOOD_NEXT, SHORT]) expect(l).not.toContain(v);
}

describe('DR1 row 1 — the current token NAME unset ⇒ disabled', () => {
  it('production: ONE warning naming the variable; the resolver ⛔ called', async () => {
    const h = harness({});
    expect(await h.build()).toEqual({ current: null, next: null });
    expect(h.warn).toEqual(['[deps] sms report webhook disabled: SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME unset']);
    expect(h.error).toEqual([]);
    expect(h.resolveSecret).not.toHaveBeenCalled();
  });

  it('production with a next NAME set: the same warning + `(next ignored)`; ⛔ the next resolved', async () => {
    const h = harness({ next: 'next-name', values: { 'next-name': GOOD_NEXT } });
    expect(await h.build()).toEqual({ current: null, next: null });
    expect(h.warn).toEqual(['[deps] sms report webhook disabled: SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME unset (next ignored)']);
    expect(h.resolveSecret).not.toHaveBeenCalled();
  });

  it.each(['development', 'test'] as const)('%s: ⛔ line at all', async (nodeEnv) => {
    const h = harness({ nodeEnv, next: 'next-name' });
    expect(await h.build()).toEqual({ current: null, next: null });
    expect([...h.warn, ...h.error]).toEqual([]);
  });
});

describe('DR1 row 2 — the current NAME set but unusable ⇒ disabled + ONE error (every environment)', () => {
  it.each<[string, Value, string]>([
    ['unreadable (Secret Manager throws)', new Error('PERMISSION_DENIED'), 'unavailable'],
    ['blank', '', 'empty'],
    ['whitespace only (returned, ⛔ thrown)', '   \n ', 'empty'],
    ['31 characters', SHORT, 'too_short'],
    ['31 characters once trimmed', ` ${SHORT} `, 'too_short'],
  ])('%s ⇒ `%s` … class %s', async (_l, value, cls) => {
    for (const nodeEnv of ['production', 'development'] as const) {
      const h = harness({ nodeEnv, current: 'cur-name', next: 'next-name', values: { 'cur-name': value, 'next-name': GOOD_NEXT } });
      expect(await h.build()).toEqual({ current: null, next: null });
      expect(h.error).toEqual([`[deps] sms report webhook disabled: secret 'cur-name' ${cls}`]);
      expect(h.warn).toEqual([]);
      expectNoValue(h.error);
    }
  });
});

describe('DR1 rows 3–5 — the current token usable', () => {
  it('row 3 — ⛔ next NAME ⇒ enabled on the current (TRIMMED) only; ⛔ line; resolved ONCE', async () => {
    const h = harness({ current: 'cur-name', values: { 'cur-name': `  ${GOOD}\n` } });
    expect(await h.build()).toEqual({ current: GOOD, next: null });
    expect([...h.warn, ...h.error]).toEqual([]);
    expect(h.resolveSecret).toHaveBeenCalledTimes(1);
    expect(h.resolveSecret).toHaveBeenCalledWith('cur-name', { envFallback: 'SMS_REPORT_WEBHOOK_TOKEN' });
  });

  it('row 4 — a usable next ⇒ enabled on BOTH; ⛔ line; each resolved once', async () => {
    const h = harness({ current: 'cur-name', next: 'next-name', values: { 'cur-name': GOOD, 'next-name': GOOD_NEXT } });
    expect(await h.build()).toEqual({ current: GOOD, next: GOOD_NEXT });
    expect([...h.warn, ...h.error]).toEqual([]);
    expect(h.resolveSecret).toHaveBeenCalledTimes(2);
    expect(h.resolveSecret).toHaveBeenCalledWith('next-name', { envFallback: 'SMS_REPORT_WEBHOOK_TOKEN_NEXT' });
  });

  it.each<[string, Value, string]>([
    ['unreadable', new Error('NOT_FOUND'), 'unavailable'],
    ['blank', ' ', 'empty'],
    ['31 characters', SHORT, 'too_short'],
  ])('row 5 — a next that is %s ⇒ the CURRENT still works (⛔ disabled) + ONE error naming the next secret (%s, %s)', async (_l, value, cls) => {
    const h = harness({ current: 'cur-name', next: 'next-name', values: { 'cur-name': GOOD, 'next-name': value } });
    expect(await h.build()).toEqual({ current: GOOD, next: null });
    expect(h.error).toEqual([`[deps] sms report webhook next token ignored: secret 'next-name' ${cls}`]);
    expectNoValue(h.error);
  });
});
