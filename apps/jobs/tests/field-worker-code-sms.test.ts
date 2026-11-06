// The field-worker code SMS sweep, with fakes — Story 13.1b (Task 5.6; AC3–AC8, AC13; the Outcomes table). The send row, the scope, the audit
// wrapper and the gateway answer are in-memory; `prepareDltSms`, the templates through the real `t()`, the decrypt and the fake KMS are REAL.
// ⭐ ORDER is proved with ONE shared call log, ⛔ separate spies (TR3). A "not called" assertion here reads that log, and the success leg
// proves each entry can appear. The timing of the backoff is the domain spec's: a fake claim proves nothing about it. The connection
// held across the decrypt is the live leg's: a plain object has no `totalCount`. No real SMS can run: the gateway is faked.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { canonicalJsonStringify, encryption, fieldWorker } from '@twt/domain';
import type { SmsAppClient } from '@twt/channels';
import { QUEUE_NAMES } from '@twt/queue';
import type pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ALERT_SMS_FINALISE_BACKOFF_MS } from '../src/scheduler/alert-sms-send.js';
import { CORRECTION_SEND_TIMEOUT_MS, type ClaimCorrectionSmsResult } from '../src/scheduler/claim-dlt-sms-send.js';
import { buildJobsEncryptionDeps } from '../src/deps.js';
import { FIELD_WORKER_CODE_SMS_TEMPLATES } from '../src/scheduler/field-worker-code-sms-templates.js';
import { codeOnly } from './_code-only.js';
import {
  DEFAULT_FIELD_WORKER_CODE_SMS_CRON,
  FIELD_WORKER_CODE_SMS_AUDIT_ACTION,
  FIELD_WORKER_CODE_SMS_TICK_MAX,
  FIELD_WORKER_CODE_SMS_TZ,
  registerFieldWorkerCodeSmsCron,
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

/** A Secret Manager fault whose message holds BOTH sentinels. gRPC 14 is a transient; 7 (PERMISSION_DENIED) is a final config fault. */
const secretFault = (code: number): Partial<FieldWorkerCodeSmsDeps> => ({
  resolveConfig: () => Promise.reject(Object.assign(new Error(`bound value ${MOBILE} ${CODE}`), { code })),
});

/** A KMS whose `decryptDek` is unavailable (gRPC 14), its message holding BOTH sentinels. */
const kmsDown = (): Partial<FieldWorkerCodeSmsDeps> => ({
  encryption: {
    kekRef: enc.kekRef,
    kms: new Proxy(enc.kms, {
      get(t, prop) {
        if (prop === 'decryptDek') return () => Promise.reject(Object.assign(new Error(`bound value ${MOBILE} ${CODE}`), { code: 14 }));
        const value: unknown = Reflect.get(t, prop, t);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    }),
  },
});

/**
 * A source file's CODE (review findings CB17 and CB34): comments removed by the compiler's parser, types erased, layout normalised. The first
 * version used two regexes, and a line comment holding `/*` deleted real code; see `_code-only.ts`. The layout is the printer's, so every pin
 * that reads this is whitespace-tolerant.
 */
function codeOf(relativeToTests: string): string {
  return codeOnly(readFileSync(fileURLToPath(new URL(relativeToTests, import.meta.url)), 'utf-8'));
}

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
    // Review finding CB13: the hash is of the ids and of nothing else (AD5). A digest of the mobile or of the six-digit code would also be 64 hex
    // characters, and a six-digit code's digest can be recovered offline, so the shape alone proves nothing.
    const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
    const idsOnly = sha256(canonicalJsonStringify({ field_worker_id: row.fieldWorkerId, send_id: row.sendId }));
    expect(h.auditLines).toEqual([
      {
        pariwarId: PARIWAR,
        actorId: null,
        actorRole: 'system',
        action: FIELD_WORKER_CODE_SMS_AUDIT_ACTION,
        resourceLocator: `field_worker/${row.fieldWorkerId}`,
        requestPayloadHash: idsOnly,
        traceId: null,
      },
    ]);
    for (const secret of [MOBILE, CODE, canonicalJsonStringify({ mobile: MOBILE }), canonicalJsonStringify({ code: CODE })]) {
      expect(h.auditLines[0]!['requestPayloadHash'], 'not a digest of the mobile or the code').not.toBe(sha256(secret));
    }
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

  // Review finding CB21 (e): the fake claim below only ever picks `due` rows, so this leg cannot fail on a regression in the REAL claim's
  // `WHERE outcome = 'due'`. That is proved live (`field-worker-code-sms-live.test.ts`, AC3 (a) and (b): reactivate, tick, the row stays
  // `skipped_not_active`) and by the domain claim legs. What this leg does show is that the sweep never revives a finished row itself.
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
    expect(entries('release')).toEqual(['release']);
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
    expect(entries('release')).toEqual(['release']); // the fake files a released row under `released`, so `detail` alone cannot say it was released (CB21)
    expect(entries('gateway')).toEqual([]);
    expect(entries('audit')).toEqual(['audit', 'audit:rolled_back']);
  });

  it('a Secret Manager transient goes back to `due`, ⛔ audit line', async () => {
    const row = await seed();
    await runFieldWorkerCodeSmsTick(deps({ resolveConfig: () => Promise.reject(Object.assign(new Error('x'), { code: 14 })) }).deps);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'config_unavailable:secret_manager' });
    expect(entries('release')).toEqual(['release']);
    expect(entries('audit')).toEqual([]);
  });

  it('⭐ AC4 (l) — a database fault in the read goes back to `due` (`api_unavailable:db`): its NAME and the send id are logged, ⛔ its message', async () => {
    const row = await seed();
    h.faults.read = new Error('connection to 10.0.0.1 failed');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(h.rows.find((r) => r.sendId === row.sendId)).toMatchObject({ detail: 'api_unavailable:db' });
    expect(entries('release')).toEqual(['release']);
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

// Review finding CB18 (a): "any release ends the tick" has five call sites in the sweep, and only the rate limit and the ceiling seeded a SECOND
// row, so `await release(...); return 'next'` at any other site was green. A spec rationale is behind it: a KMS or Secret Manager outage would
// otherwise cost one decrypt and one audit line per row, twenty a tick.
describe('Outcomes — any release ends the tick, at every call site', () => {
  const CASES = [
    {
      label: 'a failed audit write',
      detail: 'api_unavailable:audit',
      arrange: (): Partial<FieldWorkerCodeSmsDeps> => {
        h.faults.audit = new Error('audit log down');
        return {};
      },
    },
    { label: 'a KMS transient', detail: 'api_unavailable:kms', arrange: kmsDown },
    { label: 'a Secret Manager transient', detail: 'config_unavailable:secret_manager', arrange: () => secretFault(14) },
    {
      label: 'a database fault in the read',
      detail: 'api_unavailable:db',
      arrange: (): Partial<FieldWorkerCodeSmsDeps> => {
        h.faults.read = new Error('down');
        return {};
      },
    },
    {
      label: 'a gateway rate limit',
      detail: 'rate_limited:http_429',
      arrange: (): Partial<FieldWorkerCodeSmsDeps> => {
        h.answer = () => Promise.resolve(transient('rate_limited:http_429'));
        return {};
      },
    },
  ];

  it.each(CASES)('$label releases the row, ends the tick, and leaves the next row untouched', async ({ detail, arrange }) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const first = await seed();
    const later = await seed();
    const { deps: d } = deps(arrange());
    const result = await runFieldWorkerCodeSmsTick(d);
    expect(entries('release')).toEqual(['release']);
    expect(first).toMatchObject({ outcome: 'due', detail });
    expect(later).toMatchObject({ outcome: 'due', attemptCount: 0 });
    expect(result.claimed).toBe(1);
  });
});

// Review finding CB18 (b): these two ends go on to the next row (Outcomes, "What ends the tick"). Each leg above seeded ONE row, so
// `return 'end_tick'` at either site was green.
describe('Outcomes — the ends that go on to the next row', () => {
  it('a Pariwar with no passport row ends `config:pariwar_locale_missing` for each row, and the tick goes on', async () => {
    const a = await seed();
    const b = await seed();
    h.faults.localeMissing = true;
    const result = await runFieldWorkerCodeSmsTick(deps().deps);
    expect(a).toMatchObject({ outcome: 'error', detail: 'config:pariwar_locale_missing' });
    expect(b).toMatchObject({ outcome: 'error', detail: 'config:pariwar_locale_missing' });
    expect(result.claimed).toBe(2);
  });

  it('a worker who is not active ends `skipped_not_active`, and the next row is sent', async () => {
    const a = await seed({ workerState: 'suspended' });
    const b = await seed();
    const result = await runFieldWorkerCodeSmsTick(deps().deps);
    expect(a.outcome).toBe('skipped_not_active');
    expect(b.outcome).toBe('accepted');
    expect(result.claimed).toBe(2);
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

  // Review finding CB15: the leg above passes `tickMax` and the constant is only compared to 20, so `deps.tickMax ?? TICK_MAX` could become
  // `?? Infinity` and a backlog would run unbounded decrypts and audit lines in one tick, green.
  it('⭐ with NO `tickMax` a backlog still stops at the default', async () => {
    for (let i = 0; i < FIELD_WORKER_CODE_SMS_TICK_MAX + 1; i += 1) await seed();
    const result = await runFieldWorkerCodeSmsTick(deps().deps);
    expect(result.claimed).toBe(FIELD_WORKER_CODE_SMS_TICK_MAX);
    expect(h.rows.filter((r) => r.outcome === 'accepted')).toHaveLength(FIELD_WORKER_CODE_SMS_TICK_MAX);
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

  // Review finding CB18 (d): every leg above passes `[0, 0]`, so the branch that actually waits was never run.
  it('⭐ the pause between tries is really waited: a throw, then a 1 ms timer, and the second try lands', async () => {
    const row = await seed();
    h.faults.settleThrows = 1;
    // Review finding CB41 (a): without this, deleting the wait left the test green. The spy calls through; `afterEach` restores it.
    const timers = vi.spyOn(globalThis, 'setTimeout');
    const { deps: d, alarms } = deps({ finaliseBackoffMs: [1, 1] });
    await runFieldWorkerCodeSmsTick(d);
    expect(timers.mock.calls.some(([handler, ms]) => typeof handler === 'function' && ms === 1), 'a 1 ms timer was set for the pause').toBe(true);
    expect(entries('settle')).toEqual(['settle:accepted', 'settle:accepted']);
    expect(row.outcome).toBe('accepted');
    expect(alarms).toEqual([]);
  });

  // The source comment in `record()` says why `say` sits outside the `try`: the compare-and-set has COMPLETED, so a throwing alarm sink must not
  // make the loop retry it. Moving `say` inside the `try` would run the settle three times.
  it('⭐ an alarm sink that throws, after a settle that lost, ⛔ re-runs the settle; the tick still resolves', async () => {
    const row = await seed();
    h.faults.settleMovedOn = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { deps: d } = deps({
      onAlarm: () => {
        throw new Error('the sink is down');
      },
    });
    await expect(runFieldWorkerCodeSmsTick(d)).resolves.toMatchObject({ claimed: 1 });
    expect(entries('settle')).toEqual(['settle:accepted']);
    expect(row.outcome).toBe('attempting');
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

  // Review finding CB18 (c), AD10: "it is never texted in the other language". The harness's Pariwar language is `en`; only the `hi` id is set.
  it('⭐ a language whose template id is unset is ⛔ texted in the other: the row ends `config:dlt_template_id_missing`', async () => {
    const row = await seed();
    const hiOnly = FIELD_WORKER_CODE_SMS_TEMPLATES.hi.dltTemplateIdConfigKey;
    const { deps: d, alarms } = deps({ resolveConfig: (key) => Promise.resolve(key === hiOnly ? TEMPLATE_ID : null) });
    await runFieldWorkerCodeSmsTick(d);
    expect(row).toMatchObject({ outcome: 'error', detail: 'config:dlt_template_id_missing', locale: 'en' });
    expect(entries('gateway')).toEqual([]);
    expect(alarms).toHaveLength(1);
  });

  // Review finding CB41 (e): like "a final row is ⛔ claimed", this leg runs on the FAKE claim, which only ever picks `due` rows, so it cannot
  // fail on a regression in the real claim's `WHERE outcome = 'due'`. The real proof is the live reactivation legs (AC3 (a), (b)) and the
  // domain claim legs; what this leg shows is that the SWEEP never revives a finished row itself.
  it('⭐ later provisioning the id sends nothing for that row: it is ⛔ claimable', async () => {
    const row = await seed();
    await runFieldWorkerCodeSmsTick(deps({ resolveConfig: () => Promise.resolve(null) }).deps);
    h.log.length = 0;
    await runFieldWorkerCodeSmsTick(deps().deps);
    expect(row.outcome).toBe('error');
    expect(entries('gateway')).toEqual([]);
  });

  it('⭐ the sweep does not name the fixture provider: prepare is the only route (TR7)', () => {
    const source = codeOf('../src/scheduler/field-worker-code-sms.ts');
    expect(source).not.toContain('createSmsProvider');
    expect(source).toContain('await prepareDltSms(');
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

  // Review finding CB19 (b): the sweep's token limit is its own constant, tied to the stored grammar's {1,64} only by this test. Widening it makes
  // `assertDetail` throw, the settle is swallowed three times, and a definite failure ends up read as "may have arrived".
  it('⭐ a gateway token is kept at 64 characters and replaced at 65, and the kept one is inside the stored grammar', () => {
    const at64 = 'a'.repeat(64);
    const at65 = 'a'.repeat(65);
    expect(settleSend(finalError(`auth:${at64}`))).toMatchObject({ detail: `auth:${at64}` });
    expect(fieldWorker.isFieldWorkerCodeSmsDetail(`auth:${at64}`)).toBe(true);
    expect(settleSend(finalError(`auth:${at65}`))).toMatchObject({ detail: 'auth:unknown' });
    expect(fieldWorker.isFieldWorkerCodeSmsDetail(`auth:${at65}`)).toBe(false);
    expect(settleSend(transient(`rate_limited:${at65}`))).toEqual({ kind: 'release', detail: 'rate_limited:unknown' });
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
  /** A scenario arranges the faults on the seeded row, and may hand back deps to override. */
  type Arrange = (row: FakeRow) => void | Partial<FieldWorkerCodeSmsDeps> | Promise<void | Partial<FieldWorkerCodeSmsDeps>>;
  /**
   * Review findings CB6 and CB41: EVERY scenario names the seeded row's end, and the type makes the third element required, so a scenario that
   * omits it does not compile. Without an end a scenario that no longer produces its fault would still pass the sentinel check, because a run
   * that does nothing leaks nothing.
   */
  type Ends = { readonly outcome: string; readonly detail: string | RegExp | null };
  const UNKNOWN = 'exhausted:outcome_unknown';
  const word = (outcome: 'rejected_invalid_number' | 'rejected_unreachable', detail: string): ClaimCorrectionSmsResult => ({
    kind: 'final',
    outcome,
    providerMessageId: null,
    detail,
    alarm: false,
  });
  // Review finding CB16: EVERY scenario names the seeded row's end. A crash or a lost settle leaves the row `attempting` for the lease; a release
  // files it `due`; a claim fault never touches it.
  const SCENARIOS: readonly (readonly [string, Arrange, Ends])[] = [
    ['accepted', () => undefined, { outcome: 'accepted', detail: null }],
    [
      'a timeout',
      () => { h.answer = () => Promise.resolve(transient('api_unavailable:timeout')); },
      { outcome: 'error', detail: `${UNKNOWN}:api_unavailable:timeout` },
    ],
    [
      'a gateway word holding the code',
      () => { h.answer = () => Promise.resolve(finalError(`auth:${CODE}`)); },
      { outcome: 'error', detail: 'auth:unknown' },
    ],
    [
      'an unknown word holding the mobile',
      () => { h.answer = () => Promise.resolve(finalError(`unknown:${MOBILE}`)); },
      { outcome: 'error', detail: `${UNKNOWN}:unknown:unknown` },
    ],
    [
      'a rate limit',
      () => { h.answer = () => Promise.resolve(transient('rate_limited:http_429')); },
      { outcome: 'due', detail: 'rate_limited:http_429' },
    ],
    [
      'a read fault',
      () => { h.faults.read = new Error(`bound value ${MOBILE} ${CODE}`); },
      { outcome: 'due', detail: 'api_unavailable:db' },
    ],
    [
      'an audit fault',
      () => { h.faults.audit = new Error(`bound value ${MOBILE} ${CODE}`); },
      { outcome: 'due', detail: 'api_unavailable:audit' },
    ],
    ['a render crash', () => { h.faults.renderThrows = true; }, { outcome: 'attempting', detail: null }],
    [
      'a send crash',
      () => { h.answer = () => Promise.reject(new Error(`bound value ${MOBILE} ${CODE}`)); },
      { outcome: 'attempting', detail: null },
    ],
    ['a settle that always throws', () => { h.faults.settleThrows = 9; }, { outcome: 'attempting', detail: null }],
    ['a settle that lost', () => { h.faults.settleMovedOn = true; }, { outcome: 'attempting', detail: null }],
    [
      'a claim fault',
      () => { h.faults.claim = new Error(`bound value ${MOBILE} ${CODE}`); },
      { outcome: 'due', detail: null },
    ],
    // ── CB6: the end states the sentinel sweep did not run through the tick ──
    ['a worker who is not active', (row) => { row.workerState = 'suspended'; }, { outcome: 'skipped_not_active', detail: null }],
    ['no worker row', (row) => { row.workerState = null; }, { outcome: 'error', detail: 'no_code' }],
    ['no code row', (row) => { row.code = null; }, { outcome: 'error', detail: 'no_code' }],
    ['a Pariwar with no passport row', () => { h.faults.localeMissing = true; }, { outcome: 'error', detail: 'config:pariwar_locale_missing' }],
    ['a stored mobile that is not an envelope', (row) => { row.mobileCiphertext = 'not an envelope'; }, { outcome: 'error', detail: 'identity_unreadable:envelope' }],
    [
      'a tampered stored mobile',
      async (row) => {
        row.mobileCiphertext = await tampered(MOBILE);
      },
      { outcome: 'error', detail: 'identity_unreadable:authentication' },
    ],
    ['a KMS transient, its message holding both', () => kmsDown(), { outcome: 'due', detail: 'api_unavailable:kms' }],
    ['a Secret Manager transient, its message holding both', () => secretFault(14), { outcome: 'due', detail: 'config_unavailable:secret_manager' }],
    ['a final Secret Manager fault, its message holding both', () => secretFault(7), { outcome: 'error', detail: /^config:secret_manager_[a-z_]+$/ }],
    ['no template id', () => ({ resolveConfig: () => Promise.resolve(null) }), { outcome: 'error', detail: 'config:dlt_template_id_missing' }],
    [
      'a template refusal word holding the code',
      () => { h.answer = () => Promise.resolve(finalError(`dlt_template_not_approved:${CODE}`)); },
      { outcome: 'error', detail: 'dlt_template_not_approved:unknown' },
    ],
    [
      'the send’s messaging failure',
      () => { h.answer = () => Promise.resolve(finalError('config:sms_messaging_unavailable')); },
      { outcome: 'error', detail: `${UNKNOWN}:unknown:sms_messaging_unavailable` },
    ],
    [
      'an accept with no request id',
      () => { h.answer = () => Promise.resolve({ kind: 'final', outcome: 'accepted', providerMessageId: null, detail: null } as ClaimCorrectionSmsResult); },
      { outcome: 'error', detail: `${UNKNOWN}:unknown:no_request_id` },
    ],
    [
      'an invalid-number word holding the code',
      () => { h.answer = () => Promise.resolve(word('rejected_invalid_number', `invalid_number:${CODE}`)); },
      { outcome: 'rejected_invalid_number', detail: 'invalid_number:unknown' },
    ],
    [
      'a carrier-reject word holding the mobile',
      () => { h.answer = () => Promise.resolve(word('rejected_unreachable', `carrier_reject:${MOBILE}`)); },
      { outcome: 'rejected_unreachable', detail: 'carrier_reject:unknown' },
    ],
    [
      'the ceiling: a release on the last attempt',
      (row) => {
        row.attemptCount = fieldWorker.FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS - 1;
        h.answer = () => Promise.resolve(transient('rate_limited:http_429'));
      },
      { outcome: 'error', detail: 'exhausted:attempts' },
    ],
    [
      'a lapse of two rows (the seeded row is unaffected and goes on to be sent)',
      () => {
        h.lapsed = [
          { sendId: 'send-lapsed-a', pariwarId: PARIWAR, detail: UNKNOWN },
          { sendId: 'send-lapsed-b', pariwarId: PARIWAR, detail: 'exhausted:expired' },
        ];
      },
      { outcome: 'accepted', detail: null },
    ],
  ];

  // Objects rather than tuples, so the case names interpolate `$label`.
  const CASES = SCENARIOS.map(([label, arrange, ends]) => ({ label, arrange, ends }));

  // Review findings CB12 and CB35: `JSON.stringify(new Error('x'))` is `{}` (message and stack are not enumerable), so an Error passed to a
  // console method would carry its message past this check. A replacer that kept only name, message and stack fixed that and opened another
  // hole: it dropped what the default had kept (own enumerable properties such as pg's `detail`) and never saw `cause` or an AggregateError's
  // `errors`. This writes out EVERY own property of an Error, enumerable or not, wherever the Error sits; the nested Errors it reaches go
  // through the same replacer. It takes its arguments as a tuple because the key is not needed (the lint config allows no unused
  // parameters). The canary tests below feed it a sentinel in each shape.
  const errorsInFull = (...kv: [string, unknown]): unknown => {
    const v = kv[1];
    if (!(v instanceof Error)) return v;
    const own: Record<string, unknown> = { name: v.name };
    for (const key of Object.getOwnPropertyNames(v)) own[key] = (v as unknown as Record<string, unknown>)[key];
    return own;
  };
  const everything = (parts: unknown): string => JSON.stringify(parts, errorsInFull);

  it.each(CASES)('⭐ $label: neither sentinel in any console line, alarm, audit field or row', async ({ label, arrange, ends }) => {
    const captured: unknown[][] = [];
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void captured.push(a));
    }
    const seeded = await seed();
    const override = await arrange(seeded);
    const { deps: d, alarms } = deps(override ?? {});
    let thrown: unknown = null;
    await runFieldWorkerCodeSmsTick(d).catch((e: unknown) => {
      thrown = e;
    });
    // The fake's own columns for the worker's sealed mobile and code row are not the send row's: blanked, the rest is asserted.
    const rows = h.rows.map((r) => ({ ...r, mobileCiphertext: '', code: '' }));
    const out = everything({ captured, alarms, audit: h.auditLines, rows, thrown: String(thrown) });
    expect(out).not.toContain(CODE);
    expect(out).not.toContain(MOBILE);
    expect(out).not.toContain(MOBILE.slice(1));
    // Non-vacuity: the capture saw the run, and a scenario that names an end reached it.
    expect(h.log).toContain('guard');
    for (const lapsed of h.lapsed) expect(alarms.join(' '), `${label}: the lapse alarm names ${lapsed.sendId}`).toContain(lapsed.sendId);
    expect(seeded.outcome, `${label}: the row's outcome`).toBe(ends.outcome);
    if (ends.detail instanceof RegExp) expect(seeded.detail ?? '', `${label}: the row's detail`).toMatch(ends.detail);
    else expect(seeded.detail, `${label}: the row's detail`).toBe(ends.detail);
  });

  // Review finding CB35: the check is only as good as what it can SEE. Each shape below carries the sentinel, and the check must find it.
  it.each([
    { label: 'an Error’s message', make: (s: string): unknown => new Error(`bound ${s}`) },
    { label: 'an Error’s cause (an Error)', make: (s: string): unknown => new Error('x', { cause: new Error(s) }) },
    { label: 'an Error’s cause (a string)', make: (s: string): unknown => new Error('x', { cause: s }) },
    { label: 'an AggregateError’s errors', make: (s: string): unknown => new AggregateError([new Error(s)], 'x') },
    { label: 'an own property of an Error (pg’s `detail`)', make: (s: string): unknown => Object.assign(new Error('duplicate key'), { code: '23505', detail: s }) },
    { label: 'an Error inside an object inside an array', make: (s: string): unknown => [{ failed: new Error(s) }] },
  ])('⭐ canary: the sentinel check sees the sentinel in $label', ({ make }) => {
    expect(everything([make(CODE)])).toContain(CODE);
    expect(everything([make(MOBILE)])).toContain(MOBILE);
  });

  it('⭐ canary control: an Error without a sentinel is not reported', () => {
    expect(everything([new Error('x', { cause: new Error('y') }), Object.assign(new Error('z'), { detail: 'q' })])).not.toContain(CODE);
  });
});

// Review findings CB6 and CB36 (AC5): the live leg proves "state and events_log unchanged, `GET .../code` still 200" for ONE outcome (a gateway
// 500). For the rest of the Outcomes table this is a standing SOURCE pin, and it proves exactly this and no more: the sweep takes only these
// names from `@twt/domain` (the import list is pinned, so a new module is a visible change); it never aliases, destructures or reaches a
// namespace through `?.` or `[`; it never calls a write method on the handles of its scope; and its code names no event writer. A write made by
// code the sweep CALLS (the domain half's concern, which pins that its accessors write one table) is not seen here, and neither is a write
// through a module this scan does not know: a new import fails the first test and is then reviewed.
describe('AC5 — the sweep has no write path to a worker’s state or the event log', () => {
  // CODE only (CB17, CB34): the header comment names `activateFieldWorker` (the approval, which writes the row) and says so.
  const source = codeOf('../src/scheduler/field-worker-code-sms.ts');
  // The import statements are removed before the bare-name checks; the first test pins the import itself.
  const body = source.replace(/^import\b[^;]*;/gm, '');
  const domainImport = /import\s*\{([^}]*)\}\s*from\s*['"]@twt\/domain['"]/.exec(source)?.[1] ?? '';
  const imported = domainImport
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '' && !s.startsWith('type '))
    .sort();
  const membersOf = (ns: string): Set<string> => new Set([...body.matchAll(new RegExp(`\\b${ns}\\s*\\.\\s*([A-Za-z_]+)`, 'g'))].map((m) => m[1]!));

  /** Every member of every `@twt/domain` namespace the sweep may touch. A new one is a decision: this list changes in the same commit. */
  const SURFACE: Readonly<Record<string, readonly string[]>> = {
    fieldWorker: [
      'claimNextFieldWorkerCodeSms',
      'lapseFieldWorkerCodeSms',
      'settleFieldWorkerCodeSms',
      'releaseFieldWorkerCodeSms',
      'getFieldWorkerForCodeSms',
      'decryptFieldWorkerField',
      'FieldWorkerDecryptDeps',
      'FieldWorkerIdentityUnreadableError',
      'FieldWorkerDecryptUnavailableError',
      'ClaimedFieldWorkerCodeSms',
      'LapsedFieldWorkerCodeSms',
      'FieldWorkerCodeSmsFinalOutcome',
      'FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS',
      'FIELD_WORKER_CODE_SMS_OUTCOME_UNKNOWN_PREFIX',
    ],
    attributionCode: ['readAttributionCodeForFieldWorker'], // READS only: the header says so, and this makes it so (CB17)
    claim: ['resolvePariwarDefaultLocale', 'PeerRequestLocaleMissingError'],
    smsDelivery: ['canReadAcrossPariwars'],
    audit: ['withCompensatingAudit'],
    ids: ['pariwarId', 'fieldWorkerId'], // pure brand constructors (CB36: they were not in the list)
  };

  it('⭐ it takes exactly these names from `@twt/domain`, and a namespace is never aliased, destructured, optional-chained or indexed', () => {
    expect(imported, 'non-vacuity: the import was read').toEqual(
      ['attributionCode', 'audit', 'canonicalJsonStringify', 'claim', 'fieldWorker', 'ids', 'smsDelivery', 'withPariwarScope'].sort(),
    );
    for (const ns of ['fieldWorker', 'attributionCode', 'smsDelivery']) {
      expect(body.match(new RegExp(`\\b${ns}\\b(?!\\s*\\.)`, 'g')) ?? [], `${ns} used bare (aliased or destructured)`).toEqual([]);
    }
    // `claim` and `audit` are ordinary words in the log strings, so look for the shapes an alias or a pass-on takes.
    expect(body).not.toMatch(/[=(,]\s*(?:claim|audit)\s*[;,)]/);
    // Optional chaining and computed access hide a member name from the scan; none is used on any namespace (CB36).
    expect(body).not.toMatch(/\b(?:fieldWorker|attributionCode|claim|smsDelivery|audit|ids)\s*(?:\?\.|\[)/);
  });

  it.each(Object.entries(SURFACE).map(([ns, members]) => ({ ns, members })))(
    '⭐ $ns: the sweep names only its allowed members, and each reaches the call it is there for',
    ({ ns, members }) => {
      const used = membersOf(ns);
      expect([...used].filter((m) => !members.includes(m))).toEqual([]);
      // Non-vacuity: the scan sees real uses, so a clean answer is not an empty one.
      const mustUse: Record<string, string[]> = {
        fieldWorker: ['claimNextFieldWorkerCodeSms', 'lapseFieldWorkerCodeSms', 'settleFieldWorkerCodeSms', 'releaseFieldWorkerCodeSms'],
        attributionCode: ['readAttributionCodeForFieldWorker'],
        claim: ['resolvePariwarDefaultLocale'],
        smsDelivery: ['canReadAcrossPariwars'],
        audit: ['withCompensatingAudit'],
        ids: ['pariwarId', 'fieldWorkerId'],
      };
      for (const m of mustUse[ns] ?? []) expect(used.has(m), `${ns}.${m} is called`).toBe(true);
    },
  );

  it('⭐ it calls no write method on the handles of its scope or its pool (CB36)', () => {
    expect(body, 'non-vacuity: the scope is opened').toContain('withPariwarScope(');
    expect(body).not.toMatch(/\b(?:db|client|pool)\s*\??\.\s*(?:insert|update|delete|execute|query|connect|transaction)\b/);
  });

  it('⭐ it names no event writer and no transition, in any case', () => {
    expect(source, 'non-vacuity: the file was read').toContain('runFieldWorkerCodeSmsTick');
    expect(source).not.toMatch(
      /events_log|eventsLog|appendEvent|runLockedTransition|activateFieldWorker|\binsert\s+into|\bupdate\s+"?(?:public\.)?"?field_workers|\bdelete\s+from|\btruncate\b|\bmerge\s+into/i,
    );
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

  // Review finding CB15: AD3 says 24 hours. "Greater than 8.5 hours" let it drift to days (a burst of stale texts after an outage) or to a
  // few hours (rows expiring inside the ten-attempt window) unseen.
  it('the max age is exactly AD3’s 24 hours', () => {
    expect(fieldWorker.FIELD_WORKER_CODE_SMS_MAX_AGE_MS).toBe(24 * 3_600_000);
  });
});

// Review finding CB1 (2026-11-06) — Task 5.4's registration and `boot.ts` wiring were pinned by nothing; this is the shape of its twin's pins
// (`module-activation.test.ts`, "registration and pool"). The live legs inject their own pool and never reach `boot.ts` (TR10).
describe('Task 5.4 — registration and boot wiring', () => {
  it('⭐ creates the queue, works it ONE tick at a time, schedules every minute in IST, and a job under an RLS-bound login answers `refused`', async () => {
    const createQueue = vi.fn<(name: string) => Promise<void>>(() => Promise.resolve());
    const work = vi.fn<(name: string, opts: unknown, handler: unknown) => Promise<string>>(() => Promise.resolve('worker-id'));
    const schedule = vi.fn<(name: string, cron: string, data: unknown, opts: unknown) => Promise<void>>(() => Promise.resolve());
    const boss = { createQueue, work, schedule } as unknown as Parameters<typeof registerFieldWorkerCodeSmsCron>[0];
    await registerFieldWorkerCodeSmsCron(boss, deps().deps);
    expect(DEFAULT_FIELD_WORKER_CODE_SMS_CRON).toBe('* * * * *');
    expect(FIELD_WORKER_CODE_SMS_TZ).toBe('Asia/Kolkata');
    expect(QUEUE_NAMES.FIELD_WORKER_CODE_SMS).toBe('field_worker.code_sms');
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_CODE_SMS);
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_CODE_SMS, { localConcurrency: 1 }, expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_CODE_SMS, '* * * * *', {}, { tz: 'Asia/Kolkata' });
    // The handler is the tick, not a stub: under an RLS-bound login it answers `refused`, with the pg-boss ARRAY of jobs counted.
    const handler = work.mock.calls[0]![2] as (jobs: unknown[]) => Promise<unknown>;
    h.faults.guard = false;
    await expect(handler([{}])).resolves.toEqual({ jobs: 1, refused: true, lapsed: 0, claimed: 0 });
    expect(entries('guard')).toEqual(['guard']);
  });

  // Review finding CB41 (b): the leg above reaches only the refused path (`claimed: 0`, one job). This one opens the guard, has a due row, and
  // delivers TWO jobs: the handler runs ONE real tick and counts both jobs (`jobs.length`, not a literal 1).
  it('⭐ a delivered batch of two jobs runs ONE real tick: the due row is sent and both jobs are counted', async () => {
    const row = await seed();
    const work = vi.fn<(name: string, opts: unknown, handler: unknown) => Promise<string>>(() => Promise.resolve('worker-id'));
    const boss = {
      createQueue: vi.fn<(name: string) => Promise<void>>(() => Promise.resolve()),
      work,
      schedule: vi.fn<(name: string, cron: string, data: unknown, opts: unknown) => Promise<void>>(() => Promise.resolve()),
    } as unknown as Parameters<typeof registerFieldWorkerCodeSmsCron>[0];
    await registerFieldWorkerCodeSmsCron(boss, deps().deps);
    const handler = work.mock.calls[0]![2] as (jobs: unknown[]) => Promise<unknown>;
    await expect(handler([{}, {}])).resolves.toEqual({ jobs: 2, refused: false, lapsed: 0, claimed: 1 });
    expect(row.outcome).toBe('accepted');
  });

  it('⭐ boot.ts gives the sweep its OWN max:3 pool (⛔ the shared max:2 pool), ends it at BOTH shutdown sites, registers it AFTER the pre-flight is built with the alert seam’s deps, and checks the cron shape', () => {
    // CODE only, whitespace-normalised (CB17, CB34): a comment can neither satisfy these nor trip them, and a reformat that keeps the tokens
    // does not break them. The `createDb` pin needs its options as written, and `.end()` is counted, not named by site.
    const boot = codeOf('../src/boot.ts').replace(/\s+/g, ' ');
    expect(boot).toMatch(/const \{ pool: fieldWorkerCodeSmsPool \} = createDb\( ?connectionString, \{ max: 3, logger: false \} ?\)/);
    expect(boot.match(/fieldWorkerCodeSmsPool ?\.end\(\)/g)).toHaveLength(2);
    expect(boot).toMatch(/FIELD_WORKER_CODE_SMS_CRON must be a 5-field cron expression/);
    // CB41 (e): the env var must be READ into the constant that reaches the schedule (the `cron:` part below pins the other end).
    expect(boot).toMatch(/const FIELD_WORKER_CODE_SMS_CRON = process\.env\[['"]FIELD_WORKER_CODE_SMS_CRON['"]\] \?\? DEFAULT_FIELD_WORKER_CODE_SMS_CRON/);
    const preflightAt = boot.indexOf('const smsPreflight =');
    const at = boot.indexOf('await registerFieldWorkerCodeSmsCron(');
    expect(preflightAt, 'the pre-flight is built in boot').toBeGreaterThan(-1);
    expect(at, 'the cron is registered in boot').toBeGreaterThan(-1);
    expect(at, 'registered AFTER smsPreflight exists (G15), not beside registerModuleActivationCron').toBeGreaterThan(preflightAt);
    const tzAt = boot.indexOf('tz: FIELD_WORKER_CODE_SMS_TZ', at);
    expect(tzAt, 'the registration call is delimited by its options').toBeGreaterThan(at);
    const call = boot.slice(at, tzAt + 'tz: FIELD_WORKER_CODE_SMS_TZ'.length);
    for (const part of [
      'pool: fieldWorkerCodeSmsPool',
      'encryption: jobsEncryption',
      'smsAppClient: contributionProviders.smsAppClient',
      'resolveConfig: resolveSmsDltConfig',
      '...(smsPreflight !== undefined ? { smsPreflight } : {})',
      // CB17 (e): the env var must actually reach the schedule, and so must the zone.
      'cron: FIELD_WORKER_CODE_SMS_CRON',
      'tz: FIELD_WORKER_CODE_SMS_TZ',
    ]) {
      expect(call, part).toContain(part);
    }
  });

  it('⭐ the options a caller passes reach the schedule: a cron and a zone other than the defaults are used as given', async () => {
    const schedule = vi.fn<(name: string, cron: string, data: unknown, opts: unknown) => Promise<void>>(() => Promise.resolve());
    const boss = {
      createQueue: vi.fn<(name: string) => Promise<void>>(() => Promise.resolve()),
      work: vi.fn<(name: string, opts: unknown, handler: unknown) => Promise<string>>(() => Promise.resolve('worker-id')),
      schedule,
    } as unknown as Parameters<typeof registerFieldWorkerCodeSmsCron>[0];
    await registerFieldWorkerCodeSmsCron(boss, deps().deps, { cron: '*/5 * * * *', tz: 'UTC' });
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.FIELD_WORKER_CODE_SMS, '*/5 * * * *', {}, { tz: 'UTC' });
  });
});
