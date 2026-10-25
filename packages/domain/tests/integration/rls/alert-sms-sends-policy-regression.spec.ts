// alert_sms_sends — migration 0184 + RLS policy regression (Story 5.11b, Task 1; AC1, AC3; `2026-10-25-404` FS6 (a), FS8 (d),
// FS22). The `claim-suspicion-notice-policy-regression` shape: positive / negative RLS, the connection-level fail-closed probe,
// the FORCE-RLS catalog guard, ⛔ DELETE for `twt_app`, per-command policies, cross-tenant WITH CHECK, the alert FK, the EXACT
// column-narrowed INSERT / UPDATE grants (⛔ table-level), ⭐ the once-per-(alert, member, occasion) UNIQUE, the DB ↔ TS CHECK
// lockstep (EXACT sets), the `detail` grammar pinned to the TS constant, and the finished-row trigger (it binds the superuser).
// Then the domain accessors' row life, each transition run against the trigger and the grants AS `twt_app` (T14): `attempting →
// deferred → attempting → final`, `attempting → final`, the stale-lease finalise, `deferred → error` (the final attempt). Live DB
// only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ALERT_SMS_SEND_DETAIL_PATTERN,
  ALERT_SMS_SEND_LOCALES,
  ALERT_SMS_SEND_MESSAGES,
  ALERT_SMS_SEND_OCCASIONS,
  ALERT_SMS_SEND_OUTCOMES,
} from '../../../src/schema/alert_sms_sends.js';
import {
  ALERT_SMS_SEND_LEASE_MS,
  beginAlertSmsSend,
  countStaleAlertSmsSends,
  finaliseAlertSmsSend,
  finaliseStaleAlertSmsSend,
  giveUpDeferredAlertSmsSend,
  isAlertSmsSendDetail,
  lookupAlertSmsSend,
} from '../../../src/sms-delivery/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedAlert } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'alert_sms_sends';

/** As the superuser: an alert and its IN-FLIGHT day-10 text (`attempting` — 0184 freezes a finished one). */
async function seedSend(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const alertId = await seedAlert(tx, pariwarId);
  const memberId = randomUUID();
  const sendId = randomUUID();
  await client.query(
    `INSERT INTO alert_sms_sends (send_id, pariwar_id, alert_id, member_id, occasion, message, locale, outcome, claim_token)
     VALUES ($1, $2, $3, $4, 'day_10', 'deadline_not_recorded', 'hi', 'attempting', 'job-seed:0')`,
    [sendId, pariwarId, alertId, memberId],
  );
  return { alertId, memberId, sendId };
}

type Seeded = Awaited<ReturnType<typeof seedSend>>;

/** A VALID row on top of the seed (another occasion, so the UNIQUE does ⛔ fire). Only INSERT-granted columns. */
const validRow = (s: Seeded, pariwarId: string = PARIWAR_A): Record<string, unknown> => ({
  pariwar_id: pariwarId,
  alert_id: s.alertId,
  member_id: s.memberId,
  occasion: 'pending_match_escalated',
  message: 'payment_not_confirmed',
  locale: 'en',
  outcome: 'attempting',
  claim_token: 'job-1:0',
});

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
const FROZEN = { code: '23000', message: expect.stringMatching(/finished row/) };

async function grantedColumns(client: Client, privilege: 'INSERT' | 'UPDATE' | 'SELECT'): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.column_privileges
      WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = $2 ORDER BY column_name`,
    [TABLE, privilege],
  );
  return rows.map((r) => r.column_name);
}

async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [conname],
  );
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_:0-9]+)'::text/g)].map((m) => m[1]!).sort();
}

async function rowOf(client: Client, sendId: string) {
  const { rows } = await client.query<{ outcome: string; detail: string | null; attempt_count: number; claim_token: string; provider_message_id: string | null }>(
    `SELECT outcome, detail, attempt_count, claim_token, provider_message_id FROM ${TABLE} WHERE send_id = $1`,
    [sendId],
  );
  return rows[0];
}

describe.skipIf(!hasDatabase)('the alert SMS send record — migration 0184 + RLS policy regression', { timeout: 20000 }, () => {
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

  it('⛔ DELETE for twt_app', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE send_id = $1`, [s.sendId]), DENIED);
  });

  it('the policies are per-command — ⛔ FOR ALL and ⛔ DELETE policy', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string }>(
      `SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`,
      [TABLE],
    );
    expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501)', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(s, PARIWAR_B)), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await insertRow(client, validRow(s, PARIWAR_A))).rowCount).toBe(1);
  });

  it("cross-tenant UPDATE: B's row is INVISIBLE under scope A; the identity cannot be rewritten", async () => {
    const { client } = getTx();
    const a = await seedSend(client, PARIWAR_A);
    const b = await seedSend(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE send_id = $1`, [b.sendId])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE send_id = $1`, [a.sendId])).rowCount).toBe(1);
    // The IDENTITY is (pariwar, alert, member, occasion) + send_id + created_at. `message` / `locale` are NOT identity: the re-claim
    // re-sets them (review 2026-10-25, C1-P1) — see 'a re-claim records THIS attempt's language' below.
    for (const set of [`pariwar_id = '${PARIWAR_B}'`, 'alert_id = alert_id', 'member_id = member_id', `occasion = 'day_10'`, 'created_at = now()', 'send_id = send_id']) {
      await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET ${set} WHERE send_id = $1`, [a.sendId]), DENIED);
    }
    const { rows } = await client.query<{ qual: string | null; with_check: string | null }>(
      `SELECT qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 AND cmd = 'UPDATE'`,
      [TABLE],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.with_check).toBe(rows[0]!.qual);
  });

  it('⭐ EXACT column grants (INSERT, UPDATE); ⛔ table-level INSERT / UPDATE / DELETE / TRUNCATE', async () => {
    const { client } = getTx();
    expect(await grantedColumns(client, 'INSERT')).toEqual(
      ['alert_id', 'claim_token', 'locale', 'member_id', 'message', 'occasion', 'outcome', 'pariwar_id'].sort(),
    );
    expect(await grantedColumns(client, 'UPDATE')).toEqual(
      ['attempt_count', 'claim_token', 'detail', 'locale', 'message', 'outcome', 'provider_message_id', 'updated_at'].sort(),
    );
    const { rows } = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.table_privileges WHERE table_name = $1 AND grantee = 'twt_app' ORDER BY privilege_type`,
      [TABLE],
    );
    expect(rows.map((r) => r.privilege_type)).toEqual(['SELECT']);
  });

  it('INSERT of a column outside the writer\'s set is denied (42501)', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    for (const over of [{ send_id: randomUUID() }, { attempt_count: 2 }, { created_at: new Date() }, { updated_at: new Date() }, { detail: 'rate_limited:x' }, { provider_message_id: 'p' }]) {
      await expectPgError(client, () => insertRow(client, { ...validRow(s), ...over }), DENIED);
    }
  });

  it('the alert FK — an unknown alert is refused (23503)', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, { ...validRow(s), alert_id: randomUUID() }), {
      code: '23503',
      constraint: 'alert_sms_sends_alert_id_fk',
    });
  });

  it('⭐ every named constraint and both indexes exist (pg_constraint / pg_indexes)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('c', 'f', 'u', 'p') ORDER BY conname`,
      [TABLE],
    );
    expect(rows.map((r) => r.conname)).toEqual(
      [
        'alert_sms_sends_accepted_provider_id_check',
        'alert_sms_sends_alert_id_fk',
        'alert_sms_sends_attempt_count_check',
        'alert_sms_sends_claim_token_check',
        'alert_sms_sends_detail_length_check',
        'alert_sms_sends_detail_vocabulary_check',
        'alert_sms_sends_locale_check',
        'alert_sms_sends_message_check',
        'alert_sms_sends_occasion_check',
        'alert_sms_sends_outcome_check',
        'alert_sms_sends_pkey',
      ].sort(),
    );
    const idx = await client.query<{ indexname: string; indexdef: string }>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`, [TABLE]);
    const def = (name: string) => idx.rows.find((r) => r.indexname === name)?.indexdef;
    expect(def('alert_sms_sends_alert_member_occasion_uq')).toMatch(/UNIQUE INDEX .* \(alert_id, member_id, occasion\)$/);
    expect(def('alert_sms_sends_accepted_idx')).toMatch(/\(updated_at\) WHERE \(outcome = 'accepted'::text\)/);
  });

  it('⭐ LOCKSTEP — the occasion, message, locale and outcome CHECKs name EXACTLY the TS vocabularies', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'alert_sms_sends_occasion_check')).toEqual([...ALERT_SMS_SEND_OCCASIONS].sort());
    expect(await checkValues(client, 'alert_sms_sends_message_check')).toEqual([...ALERT_SMS_SEND_MESSAGES].sort());
    expect(await checkValues(client, 'alert_sms_sends_locale_check')).toEqual([...ALERT_SMS_SEND_LOCALES].sort());
    expect(await checkValues(client, 'alert_sms_sends_outcome_check')).toEqual([...ALERT_SMS_SEND_OUTCOMES].sort());
  });

  it('⭐ LOCKSTEP — the vocabulary CHECK carries EXACTLY `ALERT_SMS_SEND_DETAIL_PATTERN`', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'alert_sms_sends_detail_vocabulary_check'`,
    );
    expect(rows[0]!.def.match(/~ '(.*)'::text/)?.[1]).toBe(ALERT_SMS_SEND_DETAIL_PATTERN);
  });

  it('⭐ FS8 (d) — an occasion outside the six literals is refused (a raw mismatch reason cannot mint occasions)', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...validRow(s), ...over });
    for (const occasion of ['day_9', 'mismatch:anything', 'pending_match', 'cycle_open', 'confirmed', 'mismatch:']) {
      await expectPgError(client, ins({ occasion }), CHECK('alert_sms_sends_occasion_check'));
    }
    await expectPgError(client, ins({ message: 'cycle_open' }), CHECK('alert_sms_sends_message_check'));
    await expectPgError(client, ins({ locale: 'mr' }), CHECK('alert_sms_sends_locale_check'));
    await expectPgError(client, ins({ outcome: 'delivered' }), CHECK('alert_sms_sends_outcome_check'));
    await expectPgError(client, ins({ claim_token: '' }), CHECK('alert_sms_sends_claim_token_check'));
    await expectPgError(client, ins({ outcome: 'accepted' }), CHECK('alert_sms_sends_accepted_provider_id_check'));
    for (const occasion of ALERT_SMS_SEND_OCCASIONS.filter((o) => o !== 'day_10')) await expectAccepted(client, ins({ occasion }));
  });

  it('⭐ I1 — ONE row per (alert, member, occasion): a second day-10 row is refused; another member, another occasion land', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, { ...validRow(s), occasion: 'day_10' }), {
      code: '23505',
      constraint: 'alert_sms_sends_alert_member_occasion_uq',
    });
    await expectAccepted(client, () => insertRow(client, { ...validRow(s), occasion: 'day_10', member_id: randomUUID() }));
  });

  it('the `detail` grammar: length first, then the vocabulary (⛔ free text, a space, a bare number)', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    const upd = (detail: string) => () => client.query(`UPDATE ${TABLE} SET outcome = 'error', detail = $2 WHERE send_id = $1`, [s.sendId, detail]);
    await expectPgError(client, upd('x'.repeat(201)), CHECK('alert_sms_sends_detail_length_check'));
    const bad = ['d', 'rate_limited:a b', 'invalid_number:9876543210', 'exhausted:outcome_unknown:auth:x', 'sms_send_in_flight', 'config:dlt_template_id_missing', 'exhausted:', `auth:${'A'.repeat(65)}`];
    for (const detail of bad) {
      expect(isAlertSmsSendDetail(detail), detail).toBe(false);
      await expectPgError(client, upd(detail), CHECK('alert_sms_sends_detail_vocabulary_check'));
    }
    const good = [
      'exhausted:outcome_unknown',
      'exhausted:outcome_unknown:api_unavailable:timeout',
      'exhausted:outcome_unknown:api_unavailable:http_503',
      'exhausted:outcome_unknown:unknown:no_request_id',
      'rate_limited:E429',
      'exhausted:rate_limited:http_429',
      'exhausted:config_unavailable:secret_manager',
      'config:sms_messaging_unavailable',
      'invalid_number:format',
      'carrier_reject:E003',
      'auth:401',
      'dlt_template_not_approved:211',
    ];
    for (const detail of good) {
      expect(isAlertSmsSendDetail(detail), detail).toBe(true);
      await expectAccepted(client, upd(detail));
    }
  });

  it('⭐ the trigger — a FINISHED row is frozen (any column, even the superuser); `deferred` moves only to attempting / error', async () => {
    const { client } = getTx();
    const s = await seedSend(client, PARIWAR_A);
    const upd = (set: string) => () => client.query(`UPDATE ${TABLE} SET ${set} WHERE send_id = $1`, [s.sendId]);
    await client.query(`UPDATE ${TABLE} SET outcome = 'deferred', detail = 'rate_limited:x' WHERE send_id = $1`, [s.sendId]);
    await expectPgError(client, upd(`outcome = 'accepted', provider_message_id = 'p'`), { code: '23000', message: expect.stringMatching(/deferred row/) });
    await expectAccepted(client, upd(`outcome = 'error', detail = 'exhausted:rate_limited:x'`));
    await client.query(`UPDATE ${TABLE} SET outcome = 'attempting' WHERE send_id = $1`, [s.sendId]);
    await client.query(`UPDATE ${TABLE} SET outcome = 'accepted', provider_message_id = 'msg1' WHERE send_id = $1`, [s.sendId]);
    for (const set of ["outcome = 'attempting'", "outcome = 'error'", 'updated_at = now()', "detail = 'auth:x'", "claim_token = 'j:1'"]) {
      await expectPgError(client, upd(set), FROZEN);
    }
    const trg = await client.query<{ tgenabled: string }>(
      `SELECT tgenabled FROM pg_trigger WHERE tgname = 'alert_sms_sends_guard_update' AND tgrelid = $1::regclass`,
      [TABLE],
    );
    expect(trg.rows).toEqual([{ tgenabled: 'O' }]);
  });

  describe('the domain accessors — the row life, as `twt_app` (T14)', () => {
    async function freshKey(client: Client) {
      const { tx } = getTx();
      const alertId = await seedAlert(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      return { pariwarId: PARIWAR_A, alertId, memberId: randomUUID(), occasion: 'day_10' as const };
    }
    const meta = { message: 'deadline_not_recorded' as const, locale: 'hi' as const };

    it('⭐ attempting → deferred → attempting → accepted: the lookup at each step, the re-claim bumps the count and the token', async () => {
      const { client } = getTx();
      const key = await freshKey(client);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'none' });
      const begun = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:0' });
      expect(begun).toMatchObject({ kind: 'begun', attemptCount: 1 });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'in_flight', sendId: begun.sendId });
      // A second begin (another worker) finds the row taken.
      expect(await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'other:0' })).toEqual({ kind: 'taken' });
      // ⛔ another token's finalise.
      expect(await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'other:0', outcome: 'error', detail: 'auth:x' })).toBe(false);
      expect(await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'deferred', detail: 'rate_limited:http_429' })).toBe(true);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'deferred', sendId: begun.sendId, detail: 'rate_limited:http_429' });
      const again = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:1' });
      expect(again).toEqual({ kind: 'begun', sendId: begun.sendId, attemptCount: 2 });
      await expect(
        finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:1', outcome: 'accepted', detail: null }),
      ).rejects.toThrow(/provider request id/);
      expect(
        await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:1', outcome: 'accepted', detail: null, providerMessageId: 'abc123' }),
      ).toBe(true);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'accepted', sendId: begun.sendId });
      expect(await rowOf(client, begun.sendId)).toEqual({ outcome: 'accepted', detail: null, attempt_count: 2, claim_token: 'job:1', provider_message_id: 'abc123' });
      // ⛔ re-claim of a finished row.
      expect(await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:2' })).toEqual({ kind: 'taken' });
    });

    it("⭐ a re-claim records THIS attempt's language and message (the member may have switched since the `rate_limited` attempt) — review C1-P1", async () => {
      const { client } = getTx();
      const key = await freshKey(client);
      const begun = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(
        await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'deferred', detail: 'rate_limited:http_429' }),
      ).toBe(true);
      // attempt 2 sends ANOTHER message in ANOTHER language (hi → en): the row must say so.
      const again = await beginAlertSmsSend(client, { ...key, message: 'payment_not_confirmed', locale: 'en', claimToken: 'job:1' });
      expect(again).toEqual({ kind: 'begun', sendId: begun.sendId, attemptCount: 2 });
      const { rows } = await client.query<{ message: string; locale: string }>(`SELECT message, locale FROM ${TABLE} WHERE send_id = $1`, [begun.sendId]);
      expect(rows).toEqual([{ message: 'payment_not_confirmed', locale: 'en' }]);
      // ⛔ a FINISHED row is never re-claimed, so it never changes language.
      expect(await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:1', outcome: 'accepted', detail: null, providerMessageId: 'abc123' })).toBe(true);
      expect(await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:2' })).toEqual({ kind: 'taken' });
      expect((await client.query<{ locale: string }>(`SELECT locale FROM ${TABLE} WHERE send_id = $1`, [begun.sendId])).rows).toEqual([{ locale: 'en' }]);
    });

    it('attempting → final (rejected) ⇒ the lookup is `final`; a detail outside the grammar is refused BEFORE the statement', async () => {
      const { client } = getTx();
      const key = await freshKey(client);
      const begun = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      await expect(
        finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'error', detail: 'sent to 9876543210' }),
      ).rejects.toThrow(/grammar/);
      expect(
        await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'rejected_invalid_number', detail: 'invalid_number:format' }),
      ).toBe(true);
      expect(await lookupAlertSmsSend(client, key)).toEqual({
        kind: 'final',
        sendId: begun.sendId,
        outcome: 'rejected_invalid_number',
        detail: 'invalid_number:format',
      });
    });

    it('⭐ the stale lease: `attempting` older than the lease ⇒ `stale`; the stale finalise is `error` / `exhausted:outcome_unknown` (⛔ inside the lease)', async () => {
      const { client } = getTx();
      const key = await freshKey(client);
      const begun = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(await finaliseStaleAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId })).toBe(false);
      await client.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - ($2::int * interval '1 millisecond') - interval '1 second' WHERE send_id = $1`, [
        begun.sendId,
        ALERT_SMS_SEND_LEASE_MS,
      ]);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'stale', sendId: begun.sendId });
      expect(await finaliseStaleAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId })).toBe(true);
      expect(await rowOf(client, begun.sendId)).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown' });
      // The original attempt's late finalise is a no-op (⛔ the frozen row is touched).
      expect(
        await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'accepted', detail: null, providerMessageId: 'x1' }),
      ).toBe(false);
    });

    it('deferred → error on the final attempt (giveUp); ⛔ an attempting row', async () => {
      const { client } = getTx();
      const key = await freshKey(client);
      const begun = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(await giveUpDeferredAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, detail: 'exhausted:rate_limited:x' })).toBe(false);
      await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'deferred', detail: 'rate_limited:x' });
      expect(await giveUpDeferredAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, detail: 'exhausted:rate_limited:x' })).toBe(true);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'final', sendId: begun.sendId, outcome: 'error', detail: 'exhausted:rate_limited:x' });
    });

    it('FS22 — the stale count: `attempting` MORE than 1 h before `now`, ⛔ an upper bound (decision C1-D2 (a): a year-2000 clock, so only this test\'s row counts)', async () => {
      const { client } = getTx();
      const s = await seedSend(client, PARIWAR_A);
      const now = new Date('2000-01-10T00:00:00.000Z');
      // ⚠ With NO upper bound the count is GLOBAL over every old `attempting` row — including COMMITTED ones from the other live suites
      // (the correlator suite seeds year-2000 rows). So: a BASELINE first, then deltas (an absolute `toBe(1)` would be flaky).
      const base = await countStaleAlertSmsSends(client, { now }); // the seeded row is present-day: ⛔ counted
      await client.query(`UPDATE ${TABLE} SET updated_at = '2000-01-09T22:00:00Z' WHERE send_id = $1`, [s.sendId]);
      expect(await countStaleAlertSmsSends(client, { now })).toBe(base + 1);
      await client.query(`UPDATE ${TABLE} SET updated_at = '2000-01-09T23:30:00Z' WHERE send_id = $1`, [s.sendId]);
      expect(await countStaleAlertSmsSends(client, { now })).toBe(base); // inside the hour
      await client.query(`UPDATE ${TABLE} SET updated_at = '2000-01-01T00:00:00Z' WHERE send_id = $1`, [s.sendId]);
      expect(await countStaleAlertSmsSends(client, { now })).toBe(base + 1); // 9 days: STILL stuck, STILL counted — a cap would let it go silent
      await client.query(`UPDATE ${TABLE} SET updated_at = '1999-06-01T00:00:00Z' WHERE send_id = $1`, [s.sendId]);
      expect(await countStaleAlertSmsSends(client, { now })).toBe(base + 1); // months
      // The RUNBOOK's step (roster Row 40, annotation): an owner-role UPDATE ends the stuck row, and the daily alarm stops counting it —
      // with no upper bound this UPDATE is the ONLY way a stuck row stops alarming (patch-diff review #18).
      await client.query(`UPDATE ${TABLE} SET outcome = 'error', detail = 'exhausted:outcome_unknown' WHERE send_id = $1`, [s.sendId]);
      expect(await countStaleAlertSmsSends(client, { now })).toBe(base);
    });

    it('⭐ decision C1-D1 (b) — a `deferred` row is re-sendable only while YOUNG: 29 min ⇒ `deferred`, 31 min ⇒ `deferred_expired`; the give-up then freezes it `exhausted:rate_limited:expired`', async () => {
      const { client } = getTx();
      const key = await freshKey(client);
      const begun = await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      await finaliseAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, claimToken: 'job:0', outcome: 'deferred', detail: 'rate_limited:http_429' });
      await client.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - interval '29 minutes' WHERE send_id = $1`, [begun.sendId]);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'deferred', sendId: begun.sendId, detail: 'rate_limited:http_429' });
      await client.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - interval '31 minutes' WHERE send_id = $1`, [begun.sendId]);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'deferred_expired', sendId: begun.sendId, detail: 'rate_limited:http_429' });
      // an EXPIRED row is given up — and a give-up by an attempt that lost the race (the row already moved) reports `false`
      expect(await giveUpDeferredAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, detail: 'exhausted:rate_limited:expired' })).toBe(true);
      expect(await giveUpDeferredAlertSmsSend(client, { pariwarId: PARIWAR_A, sendId: begun.sendId, detail: 'exhausted:rate_limited:expired' })).toBe(false);
      expect(await lookupAlertSmsSend(client, key)).toEqual({ kind: 'final', sendId: begun.sendId, outcome: 'error', detail: 'exhausted:rate_limited:expired' });
      // ⛔ a begin on the frozen row
      expect(await beginAlertSmsSend(client, { ...key, ...meta, claimToken: 'job:1' })).toEqual({ kind: 'taken' });
    });
  });
});
