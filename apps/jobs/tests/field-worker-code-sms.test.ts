// The field-worker code SMS sweep, with fakes — Story 13.1b (Task 5.6; AC3–AC8, AC13; the Outcomes table). The send row, the scope, the audit
// wrapper and the gateway answer are in-memory; `prepareDltSms`, the templates through the real `t()`, the decrypt and the fake KMS are REAL.
// ⭐ ORDER is proved with ONE shared call log, ⛔ separate spies (TR3). A "not called" assertion here reads that log, and the success leg
// proves each entry can appear. The timing of the backoff is the domain spec's: a fake claim proves nothing about it. The connection
// held across the decrypt is the live leg's: a plain object has no `totalCount`. No real SMS can run: the gateway is faked.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { encryption, fieldWorker } from '@twt/domain';
import type { SmsAppClient } from '@twt/channels';
import type pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ALERT_SMS_FINALISE_BACKOFF_MS } from '../src/scheduler/alert-sms-send.js';
import { CORRECTION_SEND_TIMEOUT_MS, type ClaimCorrectionSmsResult } from '../src/scheduler/claim-dlt-sms-send.js';
import { buildJobsEncryptionDeps } from '../src/deps.js';
import { FIELD_WORKER_CODE_SMS_TEMPLATES } from '../src/scheduler/field-worker-code-sms-templates.js';
import {
  FIELD_WORKER_CODE_SMS_AUDIT_ACTION,
  FIELD_WORKER_CODE_SMS_TICK_MAX,
  runFieldWorkerCodeSmsTick,
  settleSend,
  type FieldWorkerCodeSmsDeps,
} from '../src/scheduler/field-worker-code-sms.js';

interface FakeRow {
  sendId: string;
  pariwarId: string;
  fieldWorkerId: string;
  outcome: string;
  detail: string | null;
  attemptCount: number;
  claimToken: string | null;
  locale: string | null;
  providerMessageId: string | null;
  workerState: string | null;
  code: string | null;
  mobileCiphertext: string;
}

const h = vi.hoisted(() => ({
  rows: [] as FakeRow[],
  log: [] as string[],
  auditLines: [] as Record<string, unknown>[],
  faults: {} as {
    guard?: boolean | Error;
    lapse?: Error;
    claim?: Error;
    read?: Error;
    localeMissing?: boolean;
    audit?: Error;
    settleThrows?: number;
    settleMovedOn?: boolean;
    renderThrows?: boolean;
  },
  lapsed: [] as { sendId: string; pariwarId: string; detail: string }[],
  answer: (() => Promise.reject(new Error('no answer'))) as () => Promise<unknown>,
  sendInputs: [] as { e164: string; correlation: { kind: string; rowId: string } }[],
}));

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const take = (input: { pariwarId: string; sendId: string; claimToken: string }): FakeRow | null => {
    if ((h.faults.settleThrows ?? 0) > 0) {
      h.faults.settleThrows! -= 1;
      throw new Error('the settle write failed');
    }
    if (h.faults.settleMovedOn) return null;
    const r = h.rows.find((x) => x.sendId === input.sendId && x.claimToken === input.claimToken && x.outcome === 'attempting');
    return r ?? null;
  };
  return {
    ...actual,
    withPariwarScope: async (_pool: unknown, _pariwarId: string, fn: (db: unknown, client: unknown) => Promise<unknown>) => {
      h.log.push('scope:open');
      try {
        return await fn({ fake: 'db' }, { fake: 'client' });
      } finally {
        h.log.push('scope:close');
      }
    },
    smsDelivery: {
      ...actual.smsDelivery,
      canReadAcrossPariwars: () => {
        h.log.push('guard');
        if (h.faults.guard instanceof Error) return Promise.reject(h.faults.guard);
        return Promise.resolve(h.faults.guard ?? true);
      },
    },
    audit: {
      ...actual.audit,
      // The wrapper's contract: the intent line FIRST; `mutate`; on a throw, the `_rolled_back` line, then the same throw.
      withCompensatingAudit: async (_pool: unknown, args: { auditIntent: Record<string, unknown>; mutate: (i: { auditId: string }) => Promise<unknown> }) => {
        if (h.faults.audit) throw h.faults.audit;
        h.log.push('audit');
        h.auditLines.push(args.auditIntent);
        try {
          return await args.mutate({ auditId: 'audit-1' });
        } catch (err) {
          h.log.push('audit:rolled_back');
          h.auditLines.push({ ...args.auditIntent, action: `${String(args.auditIntent['action'])}_rolled_back` });
          throw err;
        }
      },
    },
    attributionCode: {
      ...actual.attributionCode,
      readAttributionCodeForFieldWorker: (_client: unknown, input: { fieldWorkerId: string }) => {
        h.log.push('read:code');
        const code = h.rows.find((r) => r.fieldWorkerId === input.fieldWorkerId)?.code ?? null;
        return Promise.resolve(code === null ? null : { code, allocatedAt: new Date() });
      },
    },
    claim: {
      ...actual.claim,
      resolvePariwarDefaultLocale: (_db: unknown, pariwarId: string) => {
        h.log.push('read:locale');
        if (h.faults.localeMissing) return Promise.reject(new actual.claim.PeerRequestLocaleMissingError(actual.ids.pariwarId(pariwarId)));
        return Promise.resolve('en');
      },
    },
    fieldWorker: {
      ...actual.fieldWorker,
      lapseFieldWorkerCodeSms: () => {
        h.log.push('lapse');
        if (h.faults.lapse) return Promise.reject(h.faults.lapse);
        return Promise.resolve(h.lapsed);
      },
      claimNextFieldWorkerCodeSms: (_q: unknown, input: { claimToken: string }) => {
        if (h.faults.claim) return Promise.reject(h.faults.claim);
        const r = h.rows.find((x) => x.outcome === 'due');
        if (r === undefined) return Promise.resolve(null);
        h.log.push(`claim:${r.sendId}`);
        r.outcome = 'attempting';
        r.claimToken = input.claimToken;
        r.attemptCount += 1;
        return Promise.resolve({ sendId: r.sendId, pariwarId: r.pariwarId, fieldWorkerId: r.fieldWorkerId, attemptCount: r.attemptCount });
      },
      getFieldWorkerForCodeSms: (_db: unknown, _p: string, id: string) => {
        h.log.push('read:state');
        if (h.faults.read) return Promise.reject(h.faults.read);
        const r = h.rows.find((x) => x.fieldWorkerId === id);
        if (r === undefined || r.workerState === null) return Promise.resolve(null);
        return Promise.resolve({ currentState: r.workerState, mobileCiphertext: r.mobileCiphertext });
      },
      settleFieldWorkerCodeSms: (_c: unknown, input: { pariwarId: string; sendId: string; claimToken: string; outcome: string; detail: string | null; providerMessageId?: string; locale?: string }) => {
        h.log.push(`settle:${input.outcome}`);
        if (input.detail !== null && !actual.fieldWorker.isFieldWorkerCodeSmsDetail(input.detail)) throw new Error('a detail outside the grammar');
        const r = take(input);
        if (r === null) return Promise.resolve(false);
        Object.assign(r, { outcome: input.outcome, detail: input.detail, providerMessageId: input.providerMessageId ?? null, locale: input.locale ?? null });
        return Promise.resolve(true);
      },
      releaseFieldWorkerCodeSms: (_c: unknown, input: { pariwarId: string; sendId: string; claimToken: string; detail: string }) => {
        h.log.push('release');
        const r = take(input);
        if (r === null) return Promise.resolve(false);
        Object.assign(r, { outcome: 'due', detail: input.detail });
        // Behind every waiting row, as `updated_at` puts it, and ⛔ due again this tick (the claim's backoff): the fake hides it.
        h.rows.splice(h.rows.indexOf(r), 1);
        h.rows.push({ ...r, outcome: 'released' });
        return Promise.resolve(true);
      },
    },
  };
});

vi.mock('../src/scheduler/claim-dlt-sms-send.js', async (importActual) => {
  const actual = await importActual<typeof import('../src/scheduler/claim-dlt-sms-send.js')>();
  return {
    ...actual,
    sendPreparedDltSms: async (_deps: unknown, _prepared: unknown, input: { e164: string; correlation: { kind: string; rowId: string } }) => {
      h.log.push('gateway');
      h.sendInputs.push(input);
      return h.answer();
    },
  };
});

vi.mock('../src/scheduler/field-worker-code-sms-templates.js', async (importActual) => {
  const actual = await importActual<typeof import('../src/scheduler/field-worker-code-sms-templates.js')>();
  return {
    ...actual,
    renderFieldWorkerCodeSms: (locale: 'hi' | 'en', code: string) => {
      if (h.faults.renderThrows) throw new Error('a missing copy key');
      return actual.renderFieldWorkerCodeSms(locale, code);
    },
  };
});

const CODE = '837261';
const MOBILE = '+919812345678';
const PARIWAR = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '64b0c0ffee0123456789abcd';
const enc = buildJobsEncryptionDeps('field-worker-code-sms-unit-pepper');

async function seal(value: string, pariwarId = PARIWAR): Promise<string> {
  return encryption.serializeEnvelope(
    await encryption.encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId, fieldClass: 'field_worker' }, enc.kms, enc.kekRef),
  );
}

/** A well-formed envelope whose ciphertext was altered: the key unwraps, AES-GCM fails. */
async function tampered(value: string): Promise<string> {
  const sealed = await seal(value);
  const body = JSON.parse(Buffer.from(sealed.slice('enc:v1:'.length), 'base64').toString('utf-8')) as Record<string, string>;
  const ct = Buffer.from(body['ciphertext']!, 'base64');
  ct[0] = ct[0]! ^ 0x01;
  return 'enc:v1:' + Buffer.from(JSON.stringify({ ...body, ciphertext: ct.toString('base64') }), 'utf-8').toString('base64');
}

let n = 0;
async function seed(over: Partial<FakeRow> = {}): Promise<FakeRow> {
  n += 1;
  const tail = String(n).padStart(12, '0');
  const row: FakeRow = {
    sendId: `00000000-0000-4000-8000-${tail}`,
    pariwarId: PARIWAR,
    fieldWorkerId: `aaaaaaaa-0000-4000-8000-${tail}`,
    outcome: 'due',
    detail: null,
    attemptCount: 0,
    claimToken: null,
    locale: null,
    providerMessageId: null,
    workerState: 'active',
    code: CODE,
    mobileCiphertext: await seal(MOBILE),
    ...over,
  };
  h.rows.push(row);
  return row;
}

const accepted = (id = 'req1'): ClaimCorrectionSmsResult => ({ kind: 'final', outcome: 'accepted', providerMessageId: id, detail: null });
const finalError = (detail: string): ClaimCorrectionSmsResult => ({ kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true });
const transient = (detail: string): ClaimCorrectionSmsResult => ({ kind: 'transient', detail });

interface Run {
  alarms: string[];
  deps: FieldWorkerCodeSmsDeps;
}

function deps(over: Partial<FieldWorkerCodeSmsDeps> = {}): Run {
  const alarms: string[] = [];
  const client: SmsAppClient = { isConfigured: () => true, messaging: () => ({ send: () => Promise.resolve('never-called') }) };
  return {
    alarms,
    deps: {
      pool: {} as pg.Pool,
      encryption: enc,
      smsAppClient: client,
      resolveConfig: () => {
        h.log.push('config');
        return Promise.resolve(TEMPLATE_ID);
      },
      onAlarm: (m) => alarms.push(m),
      finaliseBackoffMs: [0, 0],
      ...over,
    },
  };
}

/** Log entries of `what`, by prefix. */
const entries = (what: string): string[] => h.log.filter((e) => e.startsWith(what));

beforeEach(() => {
  h.rows.length = 0;
  h.log.length = 0;
  h.auditLines.length = 0;
  h.sendInputs.length = 0;
  h.lapsed = [];
  h.faults = {};
  h.answer = () => Promise.resolve(accepted());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AC7 — one successful attempt, in order', () => {
  it('⭐ claim, the read in its order inside ONE closed scope, the config, the audit line, the gateway, the settle', async () => {
    const row = await seed();
    const { deps: d, alarms } = deps();
    const result = await runFieldWorkerCodeSmsTick(d);
    expect(h.log).toEqual([
      'guard',
      'lapse',
      `claim:${row.sendId}`,
      'scope:open',
      'read:state',
      'read:code',
      'read:locale',
      'scope:close',
      'config',
      'audit',
      'gateway',
      'scope:open',
      'settle:accepted',
      'scope:close',
    ]);
    expect(result).toEqual({ refused: false, lapsed: 0, claimed: 1 });
    expect(alarms).toEqual([]);
    expect(row).toMatchObject({ outcome: 'accepted', detail: null, providerMessageId: 'req1', locale: 'en', attemptCount: 1 });
  });

  it('⭐ the decrypt happens between the audit line and the gateway, and the gateway gets the E.164 and the `fw` CRQID', async () => {
    const order: string[] = [];
    const kms = new Proxy(enc.kms, {
      get(t, prop) {
        const value: unknown = Reflect.get(t, prop, t);
        if (prop === 'decryptDek' && typeof value === 'function') {
          return (...args: unknown[]) => {
            order.push(`kms after ${String(h.log.at(-1))}`);
            return (value as (...a: unknown[]) => unknown).apply(t, args);
          };
        }
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
    const row = await seed();
    await runFieldWorkerCodeSmsTick(deps({ encryption: { kms, kekRef: enc.kekRef } }).deps);
    expect(order).toEqual(['kms after audit']);
    expect(h.sendInputs).toEqual([{ e164: MOBILE, correlation: { kind: 'fw', rowId: row.sendId } }]);
  });

  it('⭐ exactly ONE audit line: the system, the locator, a hash over ids only, ⛔ a trace', async () => {
    const row = await seed();
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(h.auditLines).toEqual([
      {
        pariwarId: PARIWAR,
        actorId: null,
        actorRole: 'system',
        action: FIELD_WORKER_CODE_SMS_AUDIT_ACTION,
        resourceLocator: `field_worker/${row.fieldWorkerId}`,
        requestPayloadHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        traceId: null,
      },
    ]);
    expect(FIELD_WORKER_CODE_SMS_AUDIT_ACTION).toBe('field_worker.code_sms_mobile_decrypted');
  });

  it('a failed audit write: ⛔ decrypt, ⛔ gateway, back to `due` (`api_unavailable:audit`)', async () => {
    const row = await seed();
    h.faults.audit = new Error('audit log down');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(entries('gateway')).toEqual([]);
    expect(entries('audit')).toEqual([]);
    expect(entries('release')).toEqual(['release']);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'api_unavailable:audit' });
    expect(spy.mock.calls.flat().join(' ')).not.toContain('audit log down');
  });

  it('⭐ a send failure writes ⛔ `_rolled_back`: the decrypt succeeded', async () => {
    await seed();
    h.answer = () => Promise.resolve(finalError('auth:http_401'));
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(entries('audit')).toEqual(['audit']);
  });

  it('a decrypt failure writes its `_rolled_back` twin', async () => {
    await seed({ mobileCiphertext: 'not an envelope' });
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(entries('audit')).toEqual(['audit', 'audit:rolled_back']);
    expect(h.auditLines.map((l) => l['action'])).toEqual([FIELD_WORKER_CODE_SMS_AUDIT_ACTION, `${FIELD_WORKER_CODE_SMS_AUDIT_ACTION}_rolled_back`]);
  });

  it('`render` runs before the decrypt: a config refusal costs ⛔ audit line and ⛔ KMS', async () => {
    await seed();
    await runFieldWorkerCodeSmsTick(deps({ resolveConfig: () => Promise.resolve(null) }).deps);
    expect(entries('audit')).toEqual([]);
    expect(entries('gateway')).toEqual([]);
  });

  it('the language is the Pariwar’s: the template id is the one for that locale', async () => {
    await seed();
    const asked: string[] = [];
    await runFieldWorkerCodeSmsTick(
      deps({
        resolveConfig: (key) => {
          asked.push(key);
          return Promise.resolve(TEMPLATE_ID);
        },
      }).deps,
    );
    expect(asked).toEqual([FIELD_WORKER_CODE_SMS_TEMPLATES.en.dltTemplateIdConfigKey]);
  });
});

describe('AC3 — never to the wrong person', () => {
  it.each(['suspended', 'terminated', 'pending_kyc'])('a %s worker ends `skipped_not_active`: ⛔ code or locale read, ⛔ audit, ⛔ decrypt, ⛔ gateway, ⛔ alarm', async (workerState) => {
    const row = await seed({ workerState });
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'skipped_not_active', detail: null });
    expect(entries('read:')).toEqual(['read:state']);
    expect(entries('audit')).toEqual([]);
    expect(entries('gateway')).toEqual([]);
    expect(alarms).toEqual([]);
  });

  it('a final row is ⛔ claimed: a later reactivation sends nothing', async () => {
    const row = await seed({ outcome: 'skipped_not_active', workerState: 'active' });
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(row.outcome).toBe('skipped_not_active');
    expect(entries('gateway')).toEqual([]);
  });
});

describe('the Outcomes table', () => {
  const FAILS_UNKNOWN = [
    ['a timeout', transient('api_unavailable:timeout'), 'exhausted:outcome_unknown:api_unavailable:timeout'],
    ['a 5xx', transient('api_unavailable:http_503'), 'exhausted:outcome_unknown:api_unavailable:http_503'],
    ['an unknown word', finalError('unknown:http_500'), 'exhausted:outcome_unknown:unknown:http_500'],
    ['an unclassified word', finalError('odd:word'), 'exhausted:outcome_unknown:unknown:word'],
    ['no detail at all', finalError('unknown:NO_DETAIL'), 'exhausted:outcome_unknown:unknown:NO_DETAIL'],
    ['the send’s messaging failure', finalError('config:sms_messaging_unavailable'), 'exhausted:outcome_unknown:unknown:sms_messaging_unavailable'],
    ['an accept with ⛔ request id', { kind: 'final', outcome: 'accepted', providerMessageId: null, detail: null } as ClaimCorrectionSmsResult, 'exhausted:outcome_unknown:unknown:no_request_id'],
  ] as const;

  it.each(FAILS_UNKNOWN)('⭐ AC4 (c), (n) — %s is FINAL, unknown, alarmed, ⛔ re-sent, and ends the tick', async (_l, answer, detail) => {
    const row = await seed();
    const later = await seed();
    h.answer = () => Promise.resolve(answer);
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'error', detail });
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain(row.sendId);
    expect(later.outcome).toBe('due');
    expect(entries('gateway')).toEqual(['gateway']);
    expect(fieldWorker.deriveFieldWorkerCodeSmsStatus({ outcome: 'error', detail, report: null })).toBe('not_confirmed');
  });

  it.each([
    ['auth:http_401', 'auth:http_401'],
    ['dlt_template_not_approved:template_rejected', 'dlt_template_not_approved:template_rejected'],
  ])('⭐ AC4 (n) — a final %s is `error`, definite, alarmed, and ends the tick: the next row would fare the same', async (word, detail) => {
    const row = await seed();
    const later = await seed();
    h.answer = () => Promise.resolve(finalError(word));
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'error', detail });
    expect(alarms).toHaveLength(1);
    expect(later.outcome).toBe('due');
    expect(fieldWorker.deriveFieldWorkerCodeSmsStatus({ outcome: 'error', detail, report: null })).toBe('not_delivered');
  });

  it.each([
    ['rejected_invalid_number', 'invalid_number:bad_length', 'rejected_invalid_number'],
    ['rejected_unreachable', 'carrier_reject:dnd', 'rejected_unreachable'],
  ] as const)('%s: the gateway’s word, ⛔ alarm, and the next row runs', async (outcome, detail, expected) => {
    const row = await seed();
    const later = await seed();
    let i = 0;
    h.answer = () => Promise.resolve(i++ === 0 ? ({ kind: 'final', outcome, providerMessageId: null, detail, alarm: false } as ClaimCorrectionSmsResult) : accepted());
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: expected, detail });
    expect(alarms).toEqual([]);
    expect(later.outcome).toBe('accepted');
  });

  it('⭐ AC4 (d), (i) — `rate_limited:*` goes back to `due` and ends the tick: one gateway call, one audit line', async () => {
    const row = await seed();
    const later = await seed();
    h.answer = () => Promise.resolve(transient('rate_limited:http_429'));
    const { deps: d, alarms } = deps();
    const result = await runFieldWorkerCodeSmsTick(d);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'rate_limited:http_429', attemptCount: 1 });
    expect(result.claimed).toBe(1);
    expect(later.outcome).toBe('due');
    expect(entries('gateway')).toEqual(['gateway']);
    expect(h.auditLines).toHaveLength(1);
    expect(alarms).toEqual([]);
  });

  it('⭐ AC4 (e) — a KMS transient goes back to `due` (`api_unavailable:kms`), the gateway ⛔ called', async () => {
    const row = await seed();
    const kms = new Proxy(enc.kms, {
      get(t, prop) {
        if (prop === 'decryptDek') return () => Promise.reject(Object.assign(new Error('unavailable'), { code: 14 }));
        const value: unknown = Reflect.get(t, prop, t);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
    await runFieldWorkerCodeSmsTick(deps({ encryption: { kms, kekRef: enc.kekRef } }).deps);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'api_unavailable:kms' });
    expect(entries('gateway')).toEqual([]);
    expect(entries('audit')).toEqual(['audit', 'audit:rolled_back']);
  });

  it('a Secret Manager transient goes back to `due`, ⛔ audit line', async () => {
    const row = await seed();
    await runFieldWorkerCodeSmsTick(deps({ resolveConfig: () => Promise.reject(Object.assign(new Error('x'), { code: 14 })) }).deps);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'config_unavailable:secret_manager' });
    expect(entries('audit')).toEqual([]);
  });

  it('⭐ AC4 (l) — a database fault in the read goes back to `due` (`api_unavailable:db`): its NAME and the send id are logged, ⛔ its message', async () => {
    const row = await seed();
    h.faults.read = new Error('connection to 10.0.0.1 failed');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'api_unavailable:db' });
    const logged = spy.mock.calls.flat().join(' ');
    expect(logged).toContain(row.sendId);
    expect(logged).toContain('Error');
    expect(logged).not.toContain('10.0.0.1');
  });

  it('no worker row, and no code row for an `active` worker, end `no_code`, alarmed, ⛔ audit, and the next row runs', async () => {
    const a = await seed({ workerState: null });
    const b = await seed({ code: null });
    const c = await seed();
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(a).toMatchObject({ outcome: 'error', detail: 'no_code' });
    expect(b).toMatchObject({ outcome: 'error', detail: 'no_code' });
    expect(c.outcome).toBe('accepted');
    expect(alarms).toHaveLength(2);
    expect(h.auditLines).toHaveLength(1);
  });

  it('a Pariwar with no passport row ends `config:pariwar_locale_missing`, alarmed', async () => {
    const row = await seed();
    h.faults.localeMissing = true;
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'error', detail: 'config:pariwar_locale_missing' });
    expect(alarms).toHaveLength(1);
  });

  it.each(['envelope', 'authentication'] as const)('`identity_unreadable:%s` is final and alarmed, and the next row runs', async (stage) => {
    const mobileCiphertext = stage === 'envelope' ? 'not an envelope' : await tampered(MOBILE);
    const row = await seed({ mobileCiphertext });
    const later = await seed();
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'error', detail: `identity_unreadable:${stage}` });
    expect(alarms).toHaveLength(1);
    expect(later.outcome).toBe('accepted');
  });

  it('a proven pre-flight fault is refused by prepare: final, ⛔ audit; an unproven one sends, with ONE alarm in the twin’s words', async () => {
    const memo = (ok: boolean, reason: string) => ({ memo: { get: () => Promise.resolve(ok ? { ok: true } : { ok: false, transient: false, reason }) } as never, readsWithSendKey: true });
    const proven = await seed();
    let run = deps({ smsPreflight: memo(false, 'auth') });
    await runFieldWorkerCodeSmsTick(run.deps);
    expect(proven).toMatchObject({ outcome: 'error', detail: 'auth:preflight' });
    expect(entries('audit')).toEqual([]);
    h.log.length = 0;
    const unproven = await seed();
    run = deps({ smsPreflight: memo(false, 'content_mismatch') });
    await runFieldWorkerCodeSmsTick(run.deps);
    expect(unproven.outcome).toBe('accepted');
    expect(run.alarms).toEqual([expect.stringMatching(/pre-flight unproven \(dlt_template_not_approved:preflight_content_mismatch\).*sending is permitted/)]);
    expect(run.alarms[0]).not.toContain('SENT');
  });
});

describe('AC4 (k) — the ceiling', () => {
  it('⭐ a release on attempt MAX_ATTEMPTS is final `exhausted:attempts`, ONE alarm, and ends the tick', async () => {
    const row = await seed({ attemptCount: fieldWorker.FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS - 1 });
    const later = await seed();
    h.answer = () => Promise.resolve(transient('rate_limited:http_429'));
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'error', detail: 'exhausted:attempts', attemptCount: 10, locale: 'en' });
    expect(entries('release')).toEqual([]);
    expect(alarms).toEqual([expect.stringContaining('exhausted:attempts')]);
    expect(later.outcome).toBe('due');
    expect(fieldWorker.deriveFieldWorkerCodeSmsStatus({ outcome: 'error', detail: 'exhausted:attempts', report: null })).toBe('not_delivered');
  });

  it('attempt nine still releases', async () => {
    const row = await seed({ attemptCount: fieldWorker.FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS - 2 });
    h.faults.read = new Error('down');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ attemptCount: 9, detail: 'api_unavailable:db' });
  });
});

describe('AC4 (h), (m) — the loop', () => {
  it('⭐ it stops at `tickMax`, and the default is 20', async () => {
    expect(FIELD_WORKER_CODE_SMS_TICK_MAX).toBe(20);
    for (let i = 0; i < 4; i += 1) await seed();
    const result = await runFieldWorkerCodeSmsTick(deps({ tickMax: 3 }).deps);
    expect(result.claimed).toBe(3);
    expect(h.rows.filter((r) => r.outcome === 'accepted')).toHaveLength(3);
    expect(h.rows.filter((r) => r.outcome === 'due')).toHaveLength(1);
  });

  it('⭐ a throw from `render`: ⛔ audit, ⛔ gateway, the tick RESOLVES, ⛔ later row touched, the row stays `attempting` for the lease; its NAME and id logged', async () => {
    const row = await seed();
    const later = await seed();
    h.faults.renderThrows = true;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { deps: d, alarms } = deps();
    await expect(runFieldWorkerCodeSmsTick(d)).resolves.toMatchObject({ claimed: 1 });
    expect(row.outcome).toBe('attempting');
    expect(later.outcome).toBe('due');
    expect(entries('audit')).toEqual([]);
    expect(entries('gateway')).toEqual([]);
    expect(alarms).toEqual([]);
    const logged = spy.mock.calls.flat().join(' ');
    expect(logged).toContain(row.sendId);
    expect(logged).not.toContain('a missing copy key');
  });

  it('a throw from the send (a bad CRQID) is the same crash: the row stays `attempting`, the tick resolves', async () => {
    const row = await seed();
    h.answer = () => Promise.reject(new Error('sms correlation: outside the grammar'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(runFieldWorkerCodeSmsTick(deps().deps)).resolves.toMatchObject({ claimed: 1 });
    expect(row.outcome).toBe('attempting');
  });

  it('the lapse raises ONE alarm per row, naming it', async () => {
    h.lapsed = [
      { sendId: 'send-a', pariwarId: PARIWAR, detail: 'exhausted:outcome_unknown' },
      { sendId: 'send-b', pariwarId: PARIWAR, detail: 'exhausted:expired' },
    ];
    const { deps: d, alarms } = deps();
    const result = await runFieldWorkerCodeSmsTick(d);
    expect(result.lapsed).toBe(2);
    expect(alarms).toEqual([expect.stringContaining('send-a'), expect.stringContaining('send-b')]);
  });

  it.each([
    ['the role guard', 'guard'],
    ['the lapse', 'lapse'],
    ['the claim', 'claim'],
  ] as const)('⭐ a throw from %s raises ONE `sweep_failed:<error name>` alarm and the tick resolves', async (_l, where) => {
    await seed();
    h.faults[where] = Object.assign(new TypeError('secret bound value'), { code: '42501' });
    const { deps: d, alarms } = deps();
    await expect(runFieldWorkerCodeSmsTick(d)).resolves.toMatchObject({ refused: false, claimed: 0 });
    expect(alarms).toEqual([expect.stringContaining('field_worker_code_sms.sweep_failed:TypeError [code:42501]')]);
    expect(alarms[0]).not.toContain('secret bound value');
    expect(entries('gateway')).toEqual([]);
  });
});

describe('AC13 — the role guard', () => {
  it('⭐ an RLS-bound login: ONE `rls_bound_role` alarm, nothing lapsed, nothing claimed', async () => {
    const row = await seed();
    h.faults.guard = false;
    const { deps: d, alarms } = deps();
    expect(await runFieldWorkerCodeSmsTick(d)).toEqual({ refused: true, lapsed: 0, claimed: 0 });
    expect(alarms).toEqual([expect.stringContaining('field_worker_code_sms.rls_bound_role')]);
    expect(row.outcome).toBe('due');
    expect(h.log).toEqual(['guard']);
  });
});

describe('AC4 (o) — settle', () => {
  it('⭐ a throw is retried; the second try lands; ⛔ alarm', async () => {
    const row = await seed();
    h.faults.settleThrows = 1;
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(entries('settle')).toEqual(['settle:accepted', 'settle:accepted']);
    expect(row.outcome).toBe('accepted');
    expect(alarms).toEqual([]);
  });

  it('⭐ a `false` is ⛔ retried, and alarms by id: "already moved on"', async () => {
    const row = await seed();
    h.faults.settleMovedOn = true;
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(entries('settle')).toEqual(['settle:accepted']);
    expect(alarms).toEqual([expect.stringContaining('the row had already moved on')]);
    expect(alarms[0]).toContain(row.sendId);
    expect(alarms[0]).toContain('gateway request req1');
  });

  it('⭐ a `false` after an earlier throw is worded as UNCONFIRMED: that try may have committed', async () => {
    await seed();
    h.faults.settleThrows = 1;
    h.faults.settleMovedOn = true;
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(entries('settle')).toEqual(['settle:accepted', 'settle:accepted']);
    expect(alarms).toEqual([expect.stringContaining('whether OUR write landed is unconfirmed')]);
  });

  it('⭐ when every try throws after an accept, the alarm carries the send id and the gateway’s request id; the row is left to its lease', async () => {
    const row = await seed();
    h.faults.settleThrows = 9;
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(entries('settle')).toHaveLength(3);
    expect(row.outcome).toBe('attempting');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain(row.sendId);
    expect(alarms[0]).toContain('gateway request req1');
  });

  it('a release uses the same loop: every try throwing leaves the row to its lease, with one alarm', async () => {
    const row = await seed();
    h.faults.settleThrows = 9;
    h.answer = () => Promise.resolve(transient('rate_limited:http_429'));
    const { deps: d, alarms } = deps();
    await runFieldWorkerCodeSmsTick(d);
    expect(entries('release')).toHaveLength(3);
    expect(row.outcome).toBe('attempting');
    expect(alarms).toEqual([expect.stringContaining('could not be written')]);
  });
});

describe('AC6 — dark is honest', () => {
  it('⭐ no template id: every due row ends `config:dlt_template_id_missing`, one alarm a row, ⛔ audit, ⛔ decrypt, ⛔ gateway, ⛔ retry, and the tick goes on', async () => {
    const a = await seed();
    const b = await seed();
    const { deps: d, alarms } = deps({ resolveConfig: () => Promise.resolve(null) });
    await runFieldWorkerCodeSmsTick(d);
    for (const row of [a, b]) expect(row).toMatchObject({ outcome: 'error', detail: 'config:dlt_template_id_missing', locale: 'en', providerMessageId: null });
    expect(alarms).toHaveLength(2);
    expect(entries('audit')).toEqual([]);
    expect(entries('gateway')).toEqual([]);
    expect(entries('release')).toEqual([]);
  });

  it('⭐ later provisioning the id sends nothing for that row: it is ⛔ claimable', async () => {
    const row = await seed();
    await runFieldWorkerCodeSmsTick(deps({ resolveConfig: () => Promise.resolve(null) }).deps);
    h.log.length = 0;
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(row.outcome).toBe('error');
    expect(entries('gateway')).toEqual([]);
  });

  it('⭐ the sweep does not name the fixture provider: prepare is the only route (TR7)', () => {
    const source = readFileSync(fileURLToPath(new URL('../src/scheduler/field-worker-code-sms.ts', import.meta.url)), 'utf-8');
    expect(source).not.toContain('createSmsProvider');
    expect(source).toContain('prepareDltSms');
  });
});

describe('settleSend — classify first, sanitise second', () => {
  it.each([
    ['rate_limited:bad code', { kind: 'release', detail: 'rate_limited:unknown' }],
    ['rate_limited:x123456', { kind: 'release', detail: 'rate_limited:unknown' }],
    ['rate_limited:', { kind: 'release', detail: 'rate_limited:unknown' }],
  ])('a transient %s keeps its class: still released', (detail, expected) => {
    expect(settleSend(transient(detail))).toEqual(expected);
  });

  it('`api_unavailable:<six digits>` keeps its `exhausted:` word', () => {
    expect(settleSend(transient('api_unavailable:123456'))).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown:api_unavailable:unknown' });
  });

  it('⭐ AC8 — a word holding a six-digit run cannot be stored: its token becomes `unknown`, its class is kept', () => {
    expect(settleSend({ kind: 'final', outcome: 'rejected_invalid_number', providerMessageId: null, detail: `invalid_number:${CODE}`, alarm: false })).toMatchObject({
      outcome: 'rejected_invalid_number',
      detail: 'invalid_number:unknown',
    });
    expect(settleSend({ kind: 'final', outcome: 'rejected_unreachable', providerMessageId: null, detail: `carrier_reject:${MOBILE}`, alarm: false })).toMatchObject({
      outcome: 'rejected_unreachable',
      detail: 'carrier_reject:unknown',
    });
    expect(settleSend(finalError(`auth:${CODE}`))).toMatchObject({ detail: 'auth:unknown' });
    expect(settleSend(finalError(`unknown:${CODE}`))).toMatchObject({ detail: 'exhausted:outcome_unknown:unknown:unknown' });
  });

  it('every word it writes is inside the grammar', () => {
    for (const core of [
      transient('rate_limited:http_429'),
      transient('api_unavailable:timeout'),
      finalError('auth:x'),
      finalError('dlt_template_not_approved:y'),
      finalError('config:sms_messaging_unavailable'),
      finalError('no colon at all'),
      accepted(),
    ]) {
      const s = settleSend(core);
      if (s.detail !== null) expect(fieldWorker.isFieldWorkerCodeSmsDetail(s.detail), s.detail).toBe(true);
    }
  });
});

describe('AC8 — nothing leaks', () => {
  const SCENARIOS: readonly (readonly [string, () => void])[] = [
    ['accepted', () => undefined],
    ['a timeout', () => { h.answer = () => Promise.resolve(transient('api_unavailable:timeout')); }],
    ['a gateway word holding the code', () => { h.answer = () => Promise.resolve(finalError(`auth:${CODE}`)); }],
    ['an unknown word holding the mobile', () => { h.answer = () => Promise.resolve(finalError(`unknown:${MOBILE}`)); }],
    ['a rate limit', () => { h.answer = () => Promise.resolve(transient('rate_limited:http_429')); }],
    ['a read fault', () => { h.faults.read = new Error(`bound value ${MOBILE} ${CODE}`); }],
    ['an audit fault', () => { h.faults.audit = new Error(`bound value ${MOBILE} ${CODE}`); }],
    ['a render crash', () => { h.faults.renderThrows = true; }],
    ['a send crash', () => { h.answer = () => Promise.reject(new Error(`bound value ${MOBILE} ${CODE}`)); }],
    ['a settle that always throws', () => { h.faults.settleThrows = 9; }],
    ['a settle that lost', () => { h.faults.settleMovedOn = true; }],
    ['a claim fault', () => { h.faults.claim = new Error(`bound value ${MOBILE} ${CODE}`); }],
  ];

  it.each(SCENARIOS)('⭐ %s: neither sentinel in any console line, alarm, audit field or row', async (_label, arrange) => {
    const captured: unknown[][] = [];
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void captured.push(a));
    }
    await seed();
    arrange();
    const { deps: d, alarms } = deps();
    let thrown: unknown = null;
    await runFieldWorkerCodeSmsTick(d).catch((e: unknown) => {
      thrown = e;
    });
    // The fake's own columns for the worker's sealed mobile and code row are not the send row's: blanked, the rest is asserted.
    const rows = h.rows.map((r) => ({ ...r, mobileCiphertext: '', code: '' }));
    const out = JSON.stringify({ captured, alarms, audit: h.auditLines, rows, thrown: String(thrown) });
    expect(out).not.toContain(CODE);
    expect(out).not.toContain(MOBILE);
    expect(out).not.toContain(MOBILE.slice(1));
    // Non-vacuity: the capture saw the run.
    expect(h.log).toContain('guard');
  });
});

describe('AD3 — the lease', () => {
  it('⭐ it stands above the sum of the bounded terms (read connect 10, Secret Manager 10, pre-flight 9, audit connect 10, send 10, settle 31)', () => {
    const CONNECT_MS = 10_000;
    const settle = (ALERT_SMS_FINALISE_BACKOFF_MS.length + 1) * CONNECT_MS + ALERT_SMS_FINALISE_BACKOFF_MS.reduce((a, b) => a + b, 0);
    const sum = CONNECT_MS + 10_000 + 9_000 + CONNECT_MS + CORRECTION_SEND_TIMEOUT_MS + settle;
    expect(sum).toBeLessThan(fieldWorker.FIELD_WORKER_CODE_SMS_LEASE_MS);
    expect(fieldWorker.FIELD_WORKER_CODE_SMS_LEASE_MS).toBe(300_000);
    expect(sum).toBeGreaterThan(80_000);
    expect(sum).toBeLessThan(82_000);
  });

  it('the ten attempts span about 8.5 hours, inside the max age', () => {
    let waited = 0;
    for (let attempt = 1; attempt < fieldWorker.FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS; attempt += 1) waited += 2 ** (attempt - 1);
    expect(waited).toBe(511);
    expect(waited * 60_000).toBeLessThan(fieldWorker.FIELD_WORKER_CODE_SMS_MAX_AGE_MS);
  });
});
