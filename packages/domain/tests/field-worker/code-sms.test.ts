// The pure half of the code SMS record — Story 13.1b (Task 2.6; AD12; AC10). `deriveFieldWorkerCodeSmsStatus` is TOTAL over the outcomes,
// and each detail form the sweep writes is pinned to its status, so an unknown-outcome word written outside the prefix fails here.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  deriveFieldWorkerCodeSmsStatus,
  getFieldWorkerCodeSmsStatuses,
  isFieldWorkerCodeSmsDetail,
  releaseFieldWorkerCodeSms,
} from '../../src/field-worker/code-sms.js';
import { FIELD_WORKER_CODE_SMS_OUTCOMES, FIELD_WORKER_CODE_SMS_STATUSES } from '../../src/schema/field_worker_code_sms_sends.js';
import { codeOnly } from '../_code-only.js';

const of = (outcome: (typeof FIELD_WORKER_CODE_SMS_OUTCOMES)[number], detail: string | null = null, report: 'delivered' | 'undelivered' | null = null) =>
  deriveFieldWorkerCodeSmsStatus({ outcome, detail, report });

describe('deriveFieldWorkerCodeSmsStatus (AD12)', () => {
  it('no row ⇒ null', () => {
    expect(deriveFieldWorkerCodeSmsStatus(null)).toBeNull();
  });

  it('the table, row by row', () => {
    expect(of('due')).toBe('sending');
    expect(of('due', 'rate_limited:http_429')).toBe('sending');
    expect(of('attempting')).toBe('sending');
    expect(of('accepted')).toBe('sent');
    expect(of('accepted', null, 'delivered')).toBe('delivered');
    expect(of('accepted', null, 'undelivered')).toBe('not_delivered');
    expect(of('rejected_invalid_number', 'invalid_number:bad_length')).toBe('not_delivered');
    expect(of('rejected_unreachable', 'carrier_reject:dnd')).toBe('not_delivered');
    expect(of('skipped_not_active')).toBe('not_delivered');
  });

  it('⭐ total: every outcome answers one of the five words', () => {
    for (const outcome of FIELD_WORKER_CODE_SMS_OUTCOMES) {
      expect(FIELD_WORKER_CODE_SMS_STATUSES).toContain(of(outcome));
    }
  });

  // ⭐ AD12's ONE rule: the prefix. Every form the sweep writes for `error`, each pinned, with the words that decide it.
  const NOT_CONFIRMED = [
    'exhausted:outcome_unknown', // the lease, or a settle that never landed
    'exhausted:outcome_unknown:api_unavailable:timeout',
    'exhausted:outcome_unknown:api_unavailable:http_503',
    'exhausted:outcome_unknown:unknown:http_500',
    'exhausted:outcome_unknown:unknown:no_request_id',
    'exhausted:outcome_unknown:unknown:sms_messaging_unavailable', // the SEND's word: `provider.send` began
    'exhausted:outcome_unknown:unknown:unknown',
  ];
  const NOT_DELIVERED = [
    'exhausted:expired',
    'exhausted:attempts',
    'config:dlt_template_id_missing',
    'config:sms_gateway_unconfigured',
    'config:sms_messaging_unavailable', // PREPARE's word: nothing sent
    'config:pariwar_locale_missing',
    'config:secret_manager_permission_denied',
    'no_code',
    'identity_unreadable:envelope',
    'identity_unreadable:key_rejected',
    'identity_unreadable:authentication',
    'auth:preflight',
    'auth:http_401',
    'dlt_template_not_approved:template_id_malformed',
    'dlt_template_not_approved:preflight_content_mismatch',
  ];

  it.each(NOT_CONFIRMED)('`error` / %s ⇒ not_confirmed: the gateway may have taken it', (detail) => {
    expect(isFieldWorkerCodeSmsDetail(detail)).toBe(true);
    expect(of('error', detail)).toBe('not_confirmed');
  });

  it.each(NOT_DELIVERED)('`error` / %s ⇒ not_delivered: a definite failure', (detail) => {
    expect(isFieldWorkerCodeSmsDetail(detail)).toBe(true);
    expect(of('error', detail)).toBe('not_delivered');
  });

  it('prepare’s and the send’s `sms_messaging_unavailable` read differently (AD12)', () => {
    expect(of('error', 'config:sms_messaging_unavailable')).toBe('not_delivered');
    expect(of('error', 'exhausted:outcome_unknown:unknown:sms_messaging_unavailable')).toBe('not_confirmed');
  });

  it('a report on a row that is not `accepted` changes no status (G18)', () => {
    expect(of('error', 'exhausted:outcome_unknown', 'delivered')).toBe('not_confirmed');
    expect(of('error', 'no_code', 'delivered')).toBe('not_delivered');
  });
});

// Review finding CB6 (AC5): "a failed send never undoes an approval" is proved live for ONE outcome (a gateway 500). This is the standing proof
// for the whole Outcomes table: these accessors are the only writers the sweep has, and they write one table. The worker's state and the event
// log are therefore unreachable from any outcome. A source scan, in the manner of the reach fence's: it fails when a writer is added elsewhere.
describe('AC5 — the send record is the only table these accessors write', () => {
  // Review findings CB17, CB34, CB36: CODE only (the compiler's parser strips comments, so a comment can neither trip nor satisfy it), any case,
  // a quoted or schema-qualified table name, and a row lock (`FOR UPDATE`, `FOR NO KEY UPDATE`) or an upsert (`DO UPDATE SET`) is not a write
  // target. What it cannot see is named below: a write made by code this file CALLS.
  const code = codeOnly(readFileSync(fileURLToPath(new URL('../../src/field-worker/code-sms.ts', import.meta.url)), 'utf-8'));

  it('⭐ every INSERT, UPDATE and DELETE in code-sms.ts names `field_worker_code_sms_sends`', () => {
    const targets = [
      ...code.matchAll(
        /(?:\binsert\s+into|(?<!\bfor\s+)(?<!\bfor\s+no\s+key\s+)(?<!\bdo\s+)\bupdate|\bdelete\s+from)\s+(?:"?[a-z_]+"?\s*\.\s*)?"?([a-z_]+)"?/gi,
      ),
    ].map((m) => m[1]!.toLowerCase());
    expect(targets.length, 'non-vacuity: the enqueue, the claim, the settle, the release and the lapse').toBeGreaterThanOrEqual(5);
    expect(new Set(targets)).toEqual(new Set(['field_worker_code_sms_sends']));
  });

  it('⭐ and it writes by no other route: no query builder, no interpolated table name, no TRUNCATE or MERGE', () => {
    expect(code, 'non-vacuity: the file was read').toContain('claimNextFieldWorkerCodeSms');
    expect(code).not.toMatch(/\.\s*(?:insert|update|delete)\s*\(/);
    expect(code).not.toMatch(/\b(?:into|update|from)\s+\$\{/i);
    expect(code).not.toMatch(/\b(?:truncate|merge\s+into)\b/i);
  });
});

// Review finding CB42 (TR11): the live legs that prove the claim ORDER against a database are WRITTEN, NOT RUN, and the tie-break leg cannot
// always tell (the partial index on `(updated_at, send_id)` may hand tied rows back in `send_id` order whatever the ORDER BY says). This is the
// deterministic complement that needs no database: the claim statement itself.
describe('claimNextFieldWorkerCodeSms — the statement orders by updated_at then send_id (a source pin)', () => {
  it('⭐ ORDER BY updated_at, send_id; ⛔ created_at; FOR UPDATE SKIP LOCKED; LIMIT 1', () => {
    const source = codeOnly(readFileSync(fileURLToPath(new URL('../../src/field-worker/code-sms.ts', import.meta.url)), 'utf-8'));
    const claim = /export async function claimNextFieldWorkerCodeSms[\s\S]*?\n}\n/.exec(source)?.[0] ?? '';
    expect(claim.length, 'non-vacuity: the function was found').toBeGreaterThan(200);
    expect(claim).toMatch(/order\s+by\s+updated_at\s*,\s*send_id\b/i);
    expect(claim).not.toMatch(/order\s+by\s+created_at/i);
    expect(claim).toMatch(/for\s+update\s+skip\s+locked/i);
    expect(claim).toMatch(/\blimit\s+1\b/i);
  });
});

// Review finding CB19 (a): the refusal throws BEFORE any SQL, so it needs no database. The old leg probed four details; widening
// `RELEASE_DETAIL` to let any other class back to `due` would send a row whose text the gateway took a second time.
describe('releaseFieldWorkerCodeSms — only a detail that proves the gateway was not reached', () => {
  const KEY = { pariwarId: 'p', sendId: 's', claimToken: 't' } as const;
  const stub = (rowCount = 1) => {
    const sql: string[] = [];
    const q = {
      query: (text: string) => {
        sql.push(text);
        return Promise.resolve({ rowCount, rows: [] });
      },
    } as never;
    return { q, sql };
  };
  // Every other class the stored grammar allows: the gateway DID or MAY have taken the text, or the row ended for a reason that says nothing.
  const REACHED = [
    'exhausted:outcome_unknown',
    'exhausted:outcome_unknown:api_unavailable:timeout',
    'exhausted:expired',
    'exhausted:attempts',
    'config:dlt_template_id_missing',
    'no_code',
    'identity_unreadable:envelope',
    'auth:http_401',
    'dlt_template_not_approved:template_rejected',
    'invalid_number:bad_length',
    'carrier_reject:dnd',
    'unknown:http_500',
  ];
  const RELEASABLE = [
    'config_unavailable:secret_manager',
    'api_unavailable:kms',
    'api_unavailable:audit',
    'api_unavailable:db',
    'rate_limited:http_429',
  ];

  it.each(REACHED)('refuses %s before any SQL', async (detail) => {
    expect(isFieldWorkerCodeSmsDetail(detail), 'a grammar-valid detail, so only the release set can refuse it').toBe(true);
    const { q, sql } = stub();
    await expect(releaseFieldWorkerCodeSms(q, { ...KEY, detail })).rejects.toThrow(/does not prove/);
    expect(sql).toEqual([]);
  });

  // Review finding CB41 (d): the grammar guard and the release set are two checks. A raw gateway word is refused by BOTH, so it cannot tell them
  // apart; `rate_limited:123456` passes the release set and fails only the grammar (a six-digit run is barred from a stored detail).
  it('refuses a raw gateway word the grammar does not allow, before any SQL, as a grammar fault', async () => {
    const { q, sql } = stub();
    await expect(releaseFieldWorkerCodeSms(q, { ...KEY, detail: 'api_unavailable:timeout' })).rejects.toThrow(/outside the grammar/);
    expect(sql).toEqual([]);
  });

  it('refuses a detail the release set allows but the stored grammar bars (a six-digit run), before any SQL', async () => {
    const { q, sql } = stub();
    await expect(releaseFieldWorkerCodeSms(q, { ...KEY, detail: 'rate_limited:123456' })).rejects.toThrow(/outside the grammar/);
    expect(sql).toEqual([]);
  });

  it('answers false when the claim was lost (the compare-and-set updated no row)', async () => {
    const { q, sql } = stub(0);
    await expect(releaseFieldWorkerCodeSms(q, { ...KEY, detail: 'api_unavailable:kms' })).resolves.toBe(false);
    expect(sql).toHaveLength(1);
  });

  it.each(RELEASABLE)('releases %s, in one statement (the control: the refusals above are not a stub that refuses everything)', async (detail) => {
    const { q, sql } = stub();
    await expect(releaseFieldWorkerCodeSms(q, { ...KEY, detail })).resolves.toBe(true);
    expect(sql).toHaveLength(1);
  });
});

// Review finding CB20: the API leg counts calls to the accessor, which a loop of N queries inside it would also satisfy. This counts the
// statements the accessor sends.
describe('getFieldWorkerCodeSmsStatuses — ONE statement for a page', () => {
  it('⭐ three ids cost one query keyed on the Pariwar and the ids, with a different status each; an empty page costs none', async () => {
    const calls: { text: string; params: unknown[] }[] = [];
    const q = {
      query: (text: string, params: unknown[]) => {
        calls.push({ text, params });
        return Promise.resolve({
          rows: [
            { field_worker_id: 'w1', outcome: 'due', detail: null, delivery_state: null },
            { field_worker_id: 'w2', outcome: 'accepted', detail: null, delivery_state: 'delivered' },
            { field_worker_id: 'w3', outcome: 'error', detail: 'exhausted:outcome_unknown', delivery_state: null },
          ],
          rowCount: 3,
        });
      },
    } as never;
    const map = await getFieldWorkerCodeSmsStatuses(q, 'P', ['w1', 'w2', 'w3']);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toMatch(/ANY\(\$2::uuid\[\]\)/);
    expect(calls[0]!.text).toMatch(/s\.pariwar_id = \$1/);
    expect(calls[0]!.params).toEqual(['P', ['w1', 'w2', 'w3']]);
    expect(Object.fromEntries(map)).toEqual({ w1: 'sending', w2: 'delivered', w3: 'not_confirmed' });
    calls.length = 0;
    expect((await getFieldWorkerCodeSmsStatuses(q, 'P', [])).size).toBe(0);
    expect(calls).toEqual([]);
  });
});
