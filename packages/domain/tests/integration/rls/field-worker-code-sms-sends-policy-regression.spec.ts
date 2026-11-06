// field_worker_code_sms_sends — migration 0202 + RLS policy regression (Story 13.1b, Task 1.4; AC1 (e), AC4 (g), AC9; AD8). The
// `alert-sms-sends-policy-regression` shape, INVERTED on UPDATE: the twin's `twt_app` may update, here it gets 42501, because the API only
// ever writes `due`. Positive / negative RLS, the connection-level fail-closed probe, the FORCE-RLS catalog guard, ⛔ UPDATE and ⛔ DELETE
// for `twt_app`, per-command policies, cross-tenant WITH CHECK, the composite FK, the EXACT column-narrowed INSERT grant (⛔ table-level),
// the one-row-per-worker UNIQUE, the DB ↔ TS CHECK lockstep (EXACT sets), and the `detail` grammar pinned to the TS constant, the SIX-digit
// bar included. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isFieldWorkerCodeSmsDetail } from '../../../src/field-worker/code-sms.js';
import {
  FIELD_WORKER_CODE_SMS_DETAIL_PATTERN,
  FIELD_WORKER_CODE_SMS_LOCALES,
  FIELD_WORKER_CODE_SMS_OUTCOMES,
} from '../../../src/schema/field_worker_code_sms_sends.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { seedFieldWorker } from '../attribution-code/_fixtures.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'field_worker_code_sms_sends';

/** As the superuser: a worker and their `due` row. */
async function seedSend(client: Client, pariwarId: string) {
  const fieldWorkerId = await seedFieldWorker(client, pariwarId);
  const sendId = randomUUID();
  await client.query(`INSERT INTO ${TABLE} (send_id, pariwar_id, field_worker_id, activated_audit_id) VALUES ($1, $2, $3, $4)`, [
    sendId,
    pariwarId,
    fieldWorkerId,
    randomUUID(),
  ]);
  return { fieldWorkerId, sendId };
}

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(
    `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(v),
  );
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname]);
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_:0-9]+)'::text/g)].map((m) => m[1]!).sort();
}

describe.skipIf(!hasDatabase)('the field-worker code SMS send record — migration 0202 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, and under scope B only B rows', async () => {
    const { client } = getTx();
    await seedSend(client, PARIWAR_A);
    await seedSend(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ row', async () => {
    const { client } = getTx();
    await seedSend(client, PARIWAR_A);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${TABLE}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS: rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [TABLE],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
  });

  it('AC1 (e) — under `twt_app` in the worker’s Pariwar the insert succeeds; UPDATE and DELETE are refused', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    const fresh = await seedFieldWorker(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectAccepted(client, () =>
      insertRow(client, { pariwar_id: PARIWAR_A, field_worker_id: fresh, activated_audit_id: randomUUID() }),
    );
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE send_id = $1`, [s.sendId]), DENIED);
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET outcome = 'attempting', claim_token = 'x' WHERE send_id = $1`, [s.sendId]), DENIED);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE send_id = $1`, [s.sendId]), DENIED);
  });

  it('the policies are per-command — SELECT and INSERT only (⛔ FOR ALL, ⛔ an UPDATE or DELETE policy)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`, [TABLE]);
    expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT']);
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501); A’s own lands', async () => {
    const { client } = getTx();
    const a = await seedFieldWorker(client, PARIWAR_A);
    const b = await seedFieldWorker(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_B, field_worker_id: b, activated_audit_id: randomUUID() }), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    await expectAccepted(client, () => insertRow(client, { pariwar_id: PARIWAR_A, field_worker_id: a, activated_audit_id: randomUUID() }));
  });

  it('⭐ the EXACT column grants: SELECT on the table, INSERT on three columns; ⛔ table-level INSERT / UPDATE / DELETE / TRUNCATE', async () => {
    const { client } = getTx();
    const insert = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = 'INSERT' ORDER BY column_name`,
      [TABLE],
    );
    expect(insert.rows.map((r) => r.column_name)).toEqual(['activated_audit_id', 'field_worker_id', 'pariwar_id']);
    const update = await client.query(
      `SELECT 1 FROM information_schema.column_privileges WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = 'UPDATE'`,
      [TABLE],
    );
    expect(update.rows).toHaveLength(0);
    const { rows } = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.table_privileges WHERE table_name = $1 AND grantee = 'twt_app' ORDER BY privilege_type`,
      [TABLE],
    );
    expect(rows.map((r) => r.privilege_type)).toEqual(['SELECT']);
  });

  it('an INSERT of a column outside the writer’s three is denied (42501): `due` and `attempt_count = 0` are forced by the DEFAULTs', async () => {
    const { client } = getTx();
    const worker = await seedFieldWorker(client, PARIWAR_A);
    const base = { pariwar_id: PARIWAR_A, field_worker_id: worker, activated_audit_id: randomUUID() };
    await enterAppScope(client, PARIWAR_A);
    for (const over of [
      { send_id: randomUUID() },
      { outcome: 'accepted' },
      { attempt_count: 2 },
      { created_at: new Date() },
      { updated_at: new Date() },
      { detail: 'no_code' },
      { provider_message_id: 'abc' },
      { claim_token: 't' },
      { locale: 'hi' },
    ]) {
      await expectPgError(client, () => insertRow(client, { ...base, ...over }), DENIED);
    }
    await expectAccepted(client, () => insertRow(client, base));
  });

  it('the composite FK — a worker of ANOTHER Pariwar and an unknown worker are refused (23503)', async () => {
    const { client } = getTx();
    const other = await seedFieldWorker(client, PARIWAR_B);
    const fk = { code: '23503', constraint: 'field_worker_code_sms_sends_worker_fk' };
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_A, field_worker_id: other, activated_audit_id: randomUUID() }), fk);
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_A, field_worker_id: randomUUID(), activated_audit_id: randomUUID() }), fk);
  });

  it('⭐ every named constraint and the open index exist (pg_constraint / pg_indexes)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('c', 'f', 'u', 'p') ORDER BY conname`,
      [TABLE],
    );
    expect(rows.map((r) => r.conname)).toEqual(
      [
        'field_worker_code_sms_sends_accepted_provider_id_check',
        'field_worker_code_sms_sends_attempt_count_check',
        'field_worker_code_sms_sends_attempting_token_check',
        'field_worker_code_sms_sends_claim_token_check',
        'field_worker_code_sms_sends_detail_length_check',
        'field_worker_code_sms_sends_detail_vocabulary_check',
        'field_worker_code_sms_sends_locale_check',
        'field_worker_code_sms_sends_outcome_check',
        'field_worker_code_sms_sends_pariwar_worker_uq',
        'field_worker_code_sms_sends_pkey',
        'field_worker_code_sms_sends_worker_fk',
      ].sort(),
    );
    const idx = await client.query<{ indexname: string; indexdef: string }>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`, [TABLE]);
    const def = idx.rows.find((r) => r.indexname === 'field_worker_code_sms_sends_open_idx')?.indexdef;
    expect(def).toMatch(/\(updated_at, send_id\) WHERE \(outcome = ANY \(ARRAY\['due'::text, 'attempting'::text\]\)\)/);
  });

  it('⭐ LOCKSTEP — the locale and outcome CHECKs name EXACTLY the TS vocabularies', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'field_worker_code_sms_sends_locale_check')).toEqual([...FIELD_WORKER_CODE_SMS_LOCALES].sort());
    expect(await checkValues(client, 'field_worker_code_sms_sends_outcome_check')).toEqual([...FIELD_WORKER_CODE_SMS_OUTCOMES].sort());
  });

  it('⭐ LOCKSTEP — the vocabulary CHECK carries EXACTLY `FIELD_WORKER_CODE_SMS_DETAIL_PATTERN`', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'field_worker_code_sms_sends_detail_vocabulary_check'`,
    );
    expect(rows[0]!.def.match(/~ '(.*)'::text/)?.[1]).toBe(FIELD_WORKER_CODE_SMS_DETAIL_PATTERN);
  });

  it('every CHECK refuses its own bad value, with a landing control', async () => {
    const { client } = getTx();
    const worker = await seedFieldWorker(client, PARIWAR_A);
    const base = { pariwar_id: PARIWAR_A, field_worker_id: worker, activated_audit_id: randomUUID() };
    const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...base, ...over });
    await expectPgError(client, ins({ outcome: 'delivered' }), CHECK('field_worker_code_sms_sends_outcome_check'));
    await expectPgError(client, ins({ locale: 'mr' }), CHECK('field_worker_code_sms_sends_locale_check'));
    await expectPgError(client, ins({ attempt_count: -1 }), CHECK('field_worker_code_sms_sends_attempt_count_check'));
    await expectPgError(client, ins({ claim_token: '' }), CHECK('field_worker_code_sms_sends_claim_token_check'));
    await expectPgError(client, ins({ claim_token: 'x'.repeat(201) }), CHECK('field_worker_code_sms_sends_claim_token_check'));
    await expectPgError(client, ins({ outcome: 'attempting' }), CHECK('field_worker_code_sms_sends_attempting_token_check'));
    await expectPgError(client, ins({ outcome: 'accepted' }), CHECK('field_worker_code_sms_sends_accepted_provider_id_check'));
    await expectAccepted(client, ins({ outcome: 'attempting', claim_token: 'x'.repeat(200) }));
    await expectAccepted(client, ins({ outcome: 'accepted', provider_message_id: 'abc' }));
  });

  it('I2 — ONE row per worker: a second row is refused; another worker lands', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_A, field_worker_id: s.fieldWorkerId, activated_audit_id: randomUUID() }), {
      code: '23505',
      constraint: 'field_worker_code_sms_sends_pariwar_worker_uq',
    });
    const other = await seedFieldWorker(client, PARIWAR_A);
    await expectAccepted(client, () => insertRow(client, { pariwar_id: PARIWAR_A, field_worker_id: other, activated_audit_id: randomUUID() }));
  });

  const WRITTEN = [
    'exhausted:expired',
    'exhausted:attempts',
    'exhausted:outcome_unknown',
    'exhausted:outcome_unknown:api_unavailable:timeout',
    'exhausted:outcome_unknown:api_unavailable:http_503',
    'exhausted:outcome_unknown:unknown:no_request_id',
    'exhausted:outcome_unknown:unknown:sms_messaging_unavailable',
    'exhausted:outcome_unknown:unknown:unknown',
    'config:dlt_template_id_missing',
    'config:sms_gateway_unconfigured',
    'config:sms_messaging_unavailable',
    'config:pariwar_locale_missing',
    'config:secret_manager_permission_denied',
    'config_unavailable:secret_manager',
    'no_code',
    'identity_unreadable:envelope',
    'identity_unreadable:key_rejected',
    'identity_unreadable:authentication',
    'api_unavailable:kms',
    'api_unavailable:audit',
    'api_unavailable:db',
    'rate_limited:http_429',
    'rate_limited:unknown',
    'invalid_number:bad_length',
    'invalid_number:unknown',
    'carrier_reject:dnd',
    'auth:preflight',
    'dlt_template_not_approved:template_id_malformed',
    'dlt_template_not_approved:values_mismatch',
    'dlt_template_not_approved:preflight_content_mismatch',
    'unknown:NO_DETAIL',
  ];
  const REFUSED = [
    '',
    'free text',
    'error',
    'exhausted:',
    'exhausted:something',
    'exhausted:outcome_unknown:other:x',
    'api_unavailable:http_503', // a gateway word: only the wrapped form may rest
    'api_unavailable:timeout',
    'identity_unreadable:other',
    'config_unavailable:other',
    'rate_limited:',
    'rate_limited:a b',
    '+919812345678',
    'unknown:123456', // ⭐ TR9 — a six-digit run: a code could rest here (the alert grammar bars seven)
    'rate_limited:x123456',
    'exhausted:outcome_unknown:unknown:123456',
    'invalid_number:9812345678',
  ];

  it('⭐ the `detail` grammar: every word the sweep writes lands; free text, a number and a SIX-digit run are refused, in the TS copy too', async () => {
    const { client } = getTx();
    const base = { pariwar_id: PARIWAR_A, field_worker_id: await seedFieldWorker(client, PARIWAR_A), activated_audit_id: randomUUID() };
    for (const detail of WRITTEN) {
      expect(isFieldWorkerCodeSmsDetail(detail), detail).toBe(true);
      await expectAccepted(client, () => insertRow(client, { ...base, detail }));
    }
    for (const detail of REFUSED) {
      expect(isFieldWorkerCodeSmsDetail(detail), detail).toBe(false);
      await expectPgError(client, () => insertRow(client, { ...base, detail }), CHECK('field_worker_code_sms_sends_detail_vocabulary_check'));
    }
    // Five digits are not a code: the bar is exactly six.
    expect(isFieldWorkerCodeSmsDetail('rate_limited:http_12345')).toBe(true);
  });

  it('the `detail` LENGTH is judged first: 201 characters name the length CHECK', async () => {
    const { client } = getTx();
    const base = { pariwar_id: PARIWAR_A, field_worker_id: await seedFieldWorker(client, PARIWAR_A), activated_audit_id: randomUUID() };
    await expectPgError(client, () => insertRow(client, { ...base, detail: 'x'.repeat(201) }), CHECK('field_worker_code_sms_sends_detail_length_check'));
  });
});
