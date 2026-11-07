// The field-worker code SMS sweep, LIVE — Story 13.1b (Task 5.6; AC2, AC3, AC4, AC5, AC6, AC7, AC13; I1, I2, I6). Real database, real domain
// commands, real `withPariwarScope` (its `assertTxBoundScope` is what proves the reach fence's Pariwar source), real audit lines, the real DLT
// core, the fake KMS (`buildJobsEncryptionDeps`), and a RECORDING gateway double in place of MSG91: no real SMS can run here. `apps/jobs`
// cannot import `apps/api`'s harness, so a "real approval" is the domain command `activateFieldWorker` in a real transaction.
//
// ⚠ `integration-tests` runs one package at a time and `apps/jobs` sets `fileParallelism: false`, so `beforeAll` may finalise foreign open
// rows; ⛔ copy that into `packages/domain`, whose forks run in parallel. A tick sweeps the WHOLE shared database, so every assertion names
// its own ids, and `settled` ticks with a bound until its own row is final: a foreign row or a release can end a tick first.
// ⚠ TR18: the approval helper stays INSIDE this `.test.ts`: `rbac.authorize` in a new `_helper.ts` fails the `authorize(` fence.

import { randomUUID } from 'node:crypto';

import type { SmsAppClient, SmsGatewayMessage } from '@twt/channels';
import { SmsSendError } from '@twt/channels';
import { encryption, fieldWorker, ids, rbac, withPariwarScope } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { FIELD_WORKER_CODE_SMS_TEMPLATES, renderFieldWorkerCodeSms } from '../src/scheduler/field-worker-code-sms-templates.js';
import { runFieldWorkerCodeSmsTick, type FieldWorkerCodeSmsDeps } from '../src/scheduler/field-worker-code-sms.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const enc = buildJobsEncryptionDeps('field-worker-code-sms-live-pepper');
const ACTOR = randomUUID();
const TEMPLATE_HI = '64b0c0ffee0123456789abc1';
const TEMPLATE_EN = '64b0c0ffee0123456789abc2';
const MOBILE = '+919812345678';
const TABLE = 'field_worker_code_sms_sends';
const LOCALE_OF: Readonly<Record<string, string>> = {
  [FIELD_WORKER_CODE_SMS_TEMPLATES.hi.dltTemplateIdConfigKey]: TEMPLATE_HI,
  [FIELD_WORKER_CODE_SMS_TEMPLATES.en.dltTemplateIdConfigKey]: TEMPLATE_EN,
};

const hex = (uuid: string): string => uuid.replace(/-/g, '');

function gateway(answer: (m: SmsGatewayMessage) => Promise<string> = () => Promise.resolve('req1')) {
  const calls: SmsGatewayMessage[] = [];
  const client: SmsAppClient = {
    isConfigured: () => true,
    messaging: () => ({
      send: (m) => {
        calls.push(m);
        return answer(m);
      },
    }),
  };
  return { client, calls, mine: (sendId: string) => calls.filter((m) => m.correlationId === `fw${hex(sendId)}`) };
}

describe.skipIf(!hasDatabase)('Story 13.1b — the code SMS sweep (live DB, own-committing)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    await pool.query(`UPDATE ${TABLE} SET outcome = 'error', detail = 'no_code' WHERE outcome IN ('due', 'attempting')`);
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`DELETE FROM ${TABLE} WHERE pariwar_id::text = ANY($1)`, [pariwars]);
      await c.query('DELETE FROM field_worker_attribution_codes WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('DELETE FROM field_workers WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('DELETE FROM events_log WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('DELETE FROM pariwar_passport WHERE pariwar_id::text = ANY($1)', [pariwars]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
      await pool.end();
    }
  }, 60_000);

  async function pariwar(locale: 'hi' | 'en' | null = 'en'): Promise<string> {
    const pid = randomUUID();
    pariwars.push(pid);
    if (locale !== null) {
      await pool.query(
        `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
         VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, $3)`,
        [pid, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' }), locale],
      );
    }
    return pid;
  }

  const seal = async (value: string, pid: string): Promise<string> =>
    encryption.serializeEnvelope(await encryption.encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId: pid, fieldClass: 'field_worker' }, enc.kms, enc.kekRef));

  // Story 13.1c AD3 — suspend / reactivate / terminate take a verified result for THEIR key too. ⚠ Keep this helper in a `.test.ts` (the `authorize(` fence).
  const verified = (pid: string, key: 'field_worker.register' | 'field_worker.approve' | 'field_worker.suspend' | 'field_worker.reactivate' | 'field_worker.terminate') => {
    const result = rbac.authorize({
      actorId: ACTOR,
      grants: [{ pariwarId: pid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid }],
      key,
      resource: { dimension: 'district', value: 'Patna', pariwarId: pid },
    });
    if (result === null) throw new Error('the real check refused a pariwar_admin grant');
    return result;
  };

  /** Register (with a code row) and, on `client`, the two approval commands: a REAL `activateFieldWorker`, uncommitted until the caller commits. */
  async function register(pid: string, code: string, o: { mobileCiphertext?: string } = {}): Promise<string> {
    const id = randomUUID();
    const mobileCiphertext = o.mobileCiphertext ?? (await seal(MOBILE, pid));
    const nameCiphertext = await seal('Field Worker Name', pid);
    await withPariwarScope(pool, pid, async (_db, client) => {
      await fieldWorker.registerFieldWorker(client, {
        pariwarId: ids.pariwarId(pid),
        fieldWorkerId: ids.fieldWorkerId(id),
        auditId: randomUUID(),
        actor: 'operator',
        actorId: ACTOR,
        nameCiphertext,
        mobileCiphertext,
        mobileBlindIndex: `idx-${id}`,
        registeredByDisplay: 'Asha Verma',
        district: 'Patna',
        authorization: verified(pid, 'field_worker.register'),
      });
      await client.query(`INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts) VALUES ($1, $2, $3, 1)`, [pid, id, code]);
    });
    return id;
  }

  const base = (pid: string, id: string) => ({
    pariwarId: ids.pariwarId(pid),
    fieldWorkerId: ids.fieldWorkerId(id),
    actor: 'operator' as const,
    actorId: ACTOR,
  });

  async function approveOn(client: pg.PoolClient, pid: string, id: string, auditId = randomUUID()): Promise<void> {
    const approval = { ...base(pid, id), authorization: verified(pid, 'field_worker.approve') };
    await fieldWorker.recordFieldWorkerKycCompleted(client, { ...approval, auditId: randomUUID() });
    await fieldWorker.activateFieldWorker(client, { ...approval, auditId, approvedByDisplay: 'Meera Pariwar-Admin' });
  }

  /** A worker a Pariwar Admin has approved, committed: the row is `due`. */
  async function approved(pid: string, code: string, o: { mobileCiphertext?: string } = {}): Promise<{ id: string; sendId: string }> {
    const id = await register(pid, code, o);
    await withPariwarScope(pool, pid, (_db, client) => approveOn(client, pid, id));
    return { id, sendId: await sendIdOf(id) };
  }

  /** A fresh approval, then its row re-seeded by raw INSERT with these columns: `created_at` and the `due → due` shape cannot be made by UPDATE. */
  async function seeded(pid: string, code: string, cols: { attempt_count?: number; updatedAgoMs?: number; createdAgoMs?: number }): Promise<{ id: string; sendId: string }> {
    const { id, sendId } = await approved(pid, code);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`DELETE FROM ${TABLE} WHERE send_id = $1`, [sendId]);
      await c.query(
        `INSERT INTO ${TABLE} (send_id, pariwar_id, field_worker_id, activated_audit_id, attempt_count, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, clock_timestamp() - ($6::bigint * interval '1 millisecond'), clock_timestamp() - ($7::bigint * interval '1 millisecond'))`,
        [sendId, pid, id, randomUUID(), cols.attempt_count ?? 0, cols.updatedAgoMs ?? 0, cols.createdAgoMs ?? cols.updatedAgoMs ?? 0],
      );
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    return { id, sendId };
  }

  async function sendIdOf(id: string): Promise<string> {
    const { rows } = await pool.query<{ send_id: string }>(`SELECT send_id FROM ${TABLE} WHERE field_worker_id = $1`, [id]);
    expect(rows).toHaveLength(1);
    return rows[0]!.send_id;
  }

  const rowOf = async (sendId: string) =>
    (
      await pool.query<{ outcome: string; detail: string | null; provider_message_id: string | null; locale: string | null; attempt_count: number }>(
        `SELECT outcome, detail, provider_message_id, locale, attempt_count FROM ${TABLE} WHERE send_id = $1`,
        [sendId],
      )
    ).rows[0]!;

  const auditLines = async (pid: string, id: string) =>
    (
      await pool.query<{ action: string; actor_id: string | null; actor_role: string | null; request_payload_hash: string; trace_id: string | null }>(
        `SELECT action, actor_id, actor_role, request_payload_hash, trace_id FROM audit_log_entries
          WHERE pariwar_id = $1 AND resource_locator = $2 AND action LIKE 'field_worker.code_sms%' ORDER BY seq`,
        [pid, `field_worker/${id}`],
      )
    ).rows;

  function sweep(gw: ReturnType<typeof gateway>, over: Partial<FieldWorkerCodeSmsDeps> = {}): FieldWorkerCodeSmsDeps & { alarms: string[] } {
    const alarms: string[] = [];
    return {
      alarms,
      pool,
      encryption: enc,
      smsAppClient: gw.client,
      resolveConfig: (key) => Promise.resolve(LOCALE_OF[key] ?? null),
      onAlarm: (m) => alarms.push(m),
      finaliseBackoffMs: [0, 0],
      ...over,
    };
  }

  /** Tick, with a bound, until `sendId`'s row is no longer `due` or `attempting`. */
  async function settled(deps: FieldWorkerCodeSmsDeps, sendId: string): Promise<Awaited<ReturnType<typeof rowOf>>> {
    for (let i = 0; i < 8; i += 1) {
      await runFieldWorkerCodeSmsTick(deps);
      const row = await rowOf(sendId);
      if (row.outcome !== 'due' && row.outcome !== 'attempting') return row;
    }
    return rowOf(sendId);
  }

  it('⭐ AC2, AC7 — a REAL approval, then a tick: ONE gateway call with the Pariwar’s template, the code, the E.164, the CRQID; `accepted`', async () => {
    const pid = await pariwar('en');
    const { id, sendId } = await approved(pid, '482915');
    const gw = gateway();
    const row = await settled(sweep(gw), sendId);
    expect(row).toEqual({ outcome: 'accepted', detail: null, provider_message_id: 'req1', locale: 'en', attempt_count: 1 });
    expect(gw.mine(sendId)).toHaveLength(1);
    expect(gw.mine(sendId)[0]).toMatchObject({
      to: MOBILE,
      templateId: TEMPLATE_EN,
      values: [{ name: 'code', value: '482915' }],
      body: renderFieldWorkerCodeSms('en', '482915'),
      correlationId: `fw${hex(sendId)}`,
    });
    const lines = await auditLines(pid, id);
    expect(lines).toEqual([
      { action: 'field_worker.code_sms_mobile_decrypted', actor_id: null, actor_role: 'system', request_payload_hash: expect.stringMatching(/^[0-9a-f]{64}$/), trace_id: null },
    ]);
    expect(JSON.stringify(lines)).not.toContain(MOBILE);
  });

  it('⭐ AC2 — a code starting with `0` keeps its zero; a Hindi-default Pariwar gets the Hindi template', async () => {
    const pid = await pariwar('hi');
    const { sendId } = await approved(pid, '012379');
    const gw = gateway();
    const row = await settled(sweep(gw), sendId);
    expect(row).toMatchObject({ outcome: 'accepted', locale: 'hi' });
    expect(gw.mine(sendId)[0]).toMatchObject({ templateId: TEMPLATE_HI, values: [{ name: 'code', value: '012379' }], body: renderFieldWorkerCodeSms('hi', '012379') });
  });

  it('⭐ AC2, I1 — no gateway call before the approval’s COMMIT: a tick during an open approval transaction sees no row', async () => {
    const pid = await pariwar();
    const id = await register(pid, '592013');
    const c = await pool.connect();
    const gw = gateway();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [pid]);
      await approveOn(c, pid, id);
      expect((await c.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(1); // the writer sees it
      await runFieldWorkerCodeSmsTick(sweep(gw));
      expect((await pool.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(0);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    const sendId = await sendIdOf(id);
    expect(gw.mine(sendId)).toHaveLength(0);
    expect(await settled(sweep(gw), sendId)).toMatchObject({ outcome: 'accepted' });
    expect(gw.mine(sendId)).toHaveLength(1);
  });

  // Review finding CB21 (a): the title used to add "and a tick sends nothing", and this leg runs no tick. With no row there is nothing for a tick
  // to send; the "no send before the COMMIT" half is the leg above (a tick runs while the approval is uncommitted), and the row itself is
  // forced to roll back through HTTP in `approval-atomicity.spec.ts` (AC1 (a)).
  it('⭐ AC1 (a) — an approval that rolls back leaves no row', async () => {
    const pid = await pariwar();
    const id = await register(pid, '592014');
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [pid]);
      await approveOn(c, pid, id);
      await c.query('ROLLBACK');
    } finally {
      c.release();
    }
    expect((await pool.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(0);
  });

  it('⭐ AC3 (a), (b) — suspended before the tick ends `skipped_not_active`, ⛔ audit line, ⛔ gateway; reactivated later, ⛔ second text', async () => {
    const pid = await pariwar();
    const { id, sendId } = await approved(pid, '592015');
    await withPariwarScope(pool, pid, (_db, client) => fieldWorker.suspendFieldWorker(client, { ...base(pid, id), auditId: randomUUID(), authorization: verified(pid, 'field_worker.suspend'), reasonCode: 'under_review' }));
    const gw = gateway();
    expect(await settled(sweep(gw), sendId)).toMatchObject({ outcome: 'skipped_not_active', detail: null, locale: null });
    expect(gw.mine(sendId)).toHaveLength(0);
    expect(await auditLines(pid, id)).toEqual([]);
    await withPariwarScope(pool, pid, (_db, client) => fieldWorker.reactivateFieldWorker(client, { ...base(pid, id), auditId: randomUUID(), authorization: verified(pid, 'field_worker.reactivate') }));
    await runFieldWorkerCodeSmsTick(sweep(gw));
    expect((await rowOf(sendId)).outcome).toBe('skipped_not_active');
    expect(gw.mine(sendId)).toHaveLength(0);
  });

  it('⭐ AC3 (a) — terminated before the tick: the same', async () => {
    const pid = await pariwar();
    const { id, sendId } = await approved(pid, '592016');
    // Round 4 / ci:local (R4-19): the command judges `ended_on` against the IST date on the DB clock, so the test takes TODAY from the same
    // place; the UTC date is a day behind from 00:00 to 05:30 IST, and `ended_on` then falls before registration (it failed at 01:10 IST).
    const { rows: ist } = await pool.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d");
    const today = ist[0]!.d;
    await withPariwarScope(pool, pid, (_db, client) =>
      fieldWorker.terminateFieldWorker(client, { ...base(pid, id), auditId: randomUUID(), authorization: verified(pid, 'field_worker.terminate'), reasonCode: 'inactive', endedOn: today }),
    );
    const gw = gateway();
    expect(await settled(sweep(gw), sendId)).toMatchObject({ outcome: 'skipped_not_active' });
    expect(gw.mine(sendId)).toHaveLength(0);
  });

  it('⭐ AC4 (a) — two ticks overlapping on one row: tick A held in the gateway until tick B has returned, on a row past the lease BEFORE the claim; ONE send', async () => {
    const pid = await pariwar();
    const { sendId } = await seeded(pid, '592017', { updatedAgoMs: 10 * 60_000, createdAgoMs: 10 * 60_000 });
    let release!: (id: string) => void;
    const held = new Promise<string>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const inGateway = new Promise<void>((resolve) => {
      entered = resolve;
    });
    // R4-20: only THIS row is held; a foreign row a tick meets is answered at once, so neither tick can wait out the send timeout on it
    // (in the 01:10 IST run a row left `due` by the failed leg above was held too, and A's own send timed out while B waited).
    const gw = gateway((m) => {
      if (m.correlationId !== `fw${hex(sendId)}`) return Promise.resolve('req-other');
      entered();
      return held;
    });
    const a = runFieldWorkerCodeSmsTick(sweep(gw));
    await inGateway;
    // The claim moved `updated_at`: B finds the row `attempting`, inside its lease, and neither claims it nor lapses it.
    expect((await rowOf(sendId)).outcome).toBe('attempting');
    const b = sweep(gw);
    await runFieldWorkerCodeSmsTick(b);
    expect((await rowOf(sendId)).outcome).toBe('attempting');
    expect(gw.mine(sendId)).toHaveLength(1);
    release('req-a');
    await a;
    expect(await rowOf(sendId)).toMatchObject({ outcome: 'accepted', provider_message_id: 'req-a', attempt_count: 1 });
    expect(gw.mine(sendId)).toHaveLength(1);
    expect(b.alarms).toEqual([]);
  });

  it('⭐ AC4 (b) — a process killed after the claim leaves `attempting`; the next tick past the lease ends it `exhausted:outcome_unknown`, alarmed, ⛔ re-sent', async () => {
    const pid = await pariwar();
    const { sendId } = await seeded(pid, '592018', { updatedAgoMs: 365 * 24 * 3_600_000, createdAgoMs: 60_000 });
    const claimed = await fieldWorker.claimNextFieldWorkerCodeSms(pool, { claimToken: randomUUID() });
    expect(claimed?.sendId).toBe(sendId); // the oldest `updated_at` in the database, so ours
    const gw = gateway();
    const deps = sweep(gw, { leaseMs: 0 });
    await runFieldWorkerCodeSmsTick(deps);
    expect(await rowOf(sendId)).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown', attempt_count: 1 });
    expect(gw.mine(sendId)).toHaveLength(0);
    expect(deps.alarms).toEqual([expect.stringContaining(sendId)]);
  });

  it('⭐ AC4 (c) — a gateway timeout is final: ⛔ re-sent on the next tick', async () => {
    const pid = await pariwar();
    const { sendId } = await approved(pid, '592019');
    const gw = gateway(() => new Promise<string>(() => undefined));
    const row = await settled(sweep(gw, { sendTimeoutMs: 20 }), sendId);
    expect(row).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown:api_unavailable:timeout' });
    await runFieldWorkerCodeSmsTick(sweep(gw));
    expect(gw.mine(sendId)).toHaveLength(1);
  });

  it('⭐ AC4 (d) — `rate_limited:*`: back to `due`, attempt 1, not claimable inside its backoff; sent later, ONE accepted text', async () => {
    const pid = await pariwar();
    const { sendId } = await approved(pid, '592020');
    const limited = gateway(() => Promise.reject(new SmsSendError('slow down', null, 429)));
    await runFieldWorkerCodeSmsTick(sweep(limited));
    expect(await rowOf(sendId)).toMatchObject({ outcome: 'due', attempt_count: 1, detail: expect.stringMatching(/^rate_limited:/) });
    expect(limited.mine(sendId)).toHaveLength(1);
    const gw = gateway();
    await runFieldWorkerCodeSmsTick(sweep(gw));
    expect(gw.mine(sendId)).toHaveLength(0); // the backoff: one minute after the release
    // A minute later, as a real tick would find it: the same row shape, aged.
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - interval '70 seconds' WHERE send_id = $1`, [sendId]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    expect(await settled(sweep(gw), sendId)).toMatchObject({ outcome: 'accepted', detail: null, attempt_count: 2 });
    expect(gw.mine(sendId)).toHaveLength(1);
  });

  it('⭐ AC4 (e) — a KMS transient: back to `due`, the gateway ⛔ called; the intent line and its `_rolled_back` twin are written', async () => {
    const pid = await pariwar();
    const { id, sendId } = await approved(pid, '592021');
    const kms = new Proxy(enc.kms, {
      get(t, prop) {
        if (prop === 'decryptDek') return () => Promise.reject(Object.assign(new Error('unavailable'), { code: 14 }));
        const value: unknown = Reflect.get(t, prop, t);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
    const gw = gateway();
    await runFieldWorkerCodeSmsTick(sweep(gw, { encryption: { kms, kekRef: enc.kekRef } }));
    expect(await rowOf(sendId)).toMatchObject({ outcome: 'due', detail: 'api_unavailable:kms', attempt_count: 1 });
    expect(gw.mine(sendId)).toHaveLength(0);
    expect((await auditLines(pid, id)).map((l) => l.action)).toEqual(['field_worker.code_sms_mobile_decrypted', 'field_worker.code_sms_mobile_decrypted_rolled_back']);
  });

  it('⭐ AC4 (f) — `due` past the max age: `exhausted:expired`, ⛔ send, one alarm', async () => {
    const pid = await pariwar();
    const { sendId } = await approved(pid, '592022');
    const gw = gateway();
    const deps = sweep(gw, { maxAgeMs: 0 });
    await runFieldWorkerCodeSmsTick(deps);
    expect(await rowOf(sendId)).toMatchObject({ outcome: 'error', detail: 'exhausted:expired', attempt_count: 0 });
    expect(gw.mine(sendId)).toHaveLength(0);
    expect(deps.alarms.filter((a) => a.includes(sendId))).toHaveLength(1);
  });

  it('⭐ AC4 (k) — a row at attempt 9 past its backoff, released again: final `exhausted:attempts`, ONE alarm, ⛔ a tenth release', async () => {
    const pid = await pariwar();
    const { sendId } = await seeded(pid, '592023', { attempt_count: 9, updatedAgoMs: 257 * 60_000, createdAgoMs: 8 * 3_600_000 });
    const gw = gateway(() => Promise.reject(new SmsSendError('slow down', null, 429)));
    const deps = sweep(gw);
    expect(await settled(deps, sendId)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempts', attempt_count: 10 });
    expect(deps.alarms.filter((a) => a.includes(sendId) && a.includes('exhausted:attempts'))).toHaveLength(1);
    expect(fieldWorker.deriveFieldWorkerCodeSmsStatus({ outcome: 'error', detail: 'exhausted:attempts', report: null })).toBe('not_delivered');
  });

  it('⭐ AC5 — the sweep changes neither the worker nor `events_log`, whatever the send came to', async () => {
    const pid = await pariwar();
    const { id, sendId } = await approved(pid, '592024');
    const snapshot = async () => {
      const worker = (await pool.query(`SELECT current_state, state_event_version, audit_id FROM field_workers WHERE field_worker_id = $1`, [id])).rows;
      const events = (await pool.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`, [id])).rows;
      return JSON.stringify({ worker, events });
    };
    const before = await snapshot();
    const gw = gateway(() => Promise.reject(new SmsSendError('refused', null, 500)));
    await settled(sweep(gw), sendId);
    expect((await rowOf(sendId)).outcome).toBe('error');
    expect(await snapshot()).toBe(before);
  });

  it('⭐ AC6 — dark: no template id ends the row `config:dlt_template_id_missing`, one alarm, ⛔ decrypt, ⛔ audit, ⛔ gateway; provisioning later sends nothing', async () => {
    const pid = await pariwar();
    const { id, sendId } = await approved(pid, '592025');
    const gw = gateway();
    const dark = sweep(gw, { resolveConfig: () => Promise.resolve(null) });
    expect(await settled(dark, sendId)).toMatchObject({ outcome: 'error', detail: 'config:dlt_template_id_missing', provider_message_id: null, attempt_count: 1 });
    expect(dark.alarms.filter((a) => a.includes(sendId))).toHaveLength(1);
    expect(await auditLines(pid, id)).toEqual([]);
    await runFieldWorkerCodeSmsTick(sweep(gw));
    expect(gw.mine(sendId)).toHaveLength(0);
    expect((await rowOf(sendId)).detail).toBe('config:dlt_template_id_missing');
  });

  it('a Pariwar with no passport ends `config:pariwar_locale_missing`, alarmed, ⛔ audit', async () => {
    const pid = await pariwar(null);
    const { id, sendId } = await approved(pid, '592026');
    const gw = gateway();
    const deps = sweep(gw);
    expect(await settled(deps, sendId)).toMatchObject({ outcome: 'error', detail: 'config:pariwar_locale_missing' });
    expect(gw.mine(sendId)).toHaveLength(0);
    expect(await auditLines(pid, id)).toEqual([]);
  });

  it('⭐ I6 — an unreadable stored mobile ends `identity_unreadable:envelope`, alarmed, ⛔ gateway, and the line and its twin stand', async () => {
    const pid = await pariwar();
    const { id, sendId } = await approved(pid, '592027', { mobileCiphertext: 'enc:v1:not-an-envelope' });
    const gw = gateway();
    expect(await settled(sweep(gw), sendId)).toMatchObject({ outcome: 'error', detail: 'identity_unreadable:envelope' });
    expect(gw.mine(sendId)).toHaveLength(0);
    expect((await auditLines(pid, id)).map((l) => l.action)).toEqual(['field_worker.code_sms_mobile_decrypted', 'field_worker.code_sms_mobile_decrypted_rolled_back']);
  });

  it('⭐ AC7 — ⛔ connection is held across the decrypt or the gateway call: a real `max: 1` pool, used for everything, is idle at both', async () => {
    const pid = await pariwar();
    const { sendId } = await approved(pid, '592028');
    const small = new pg.Pool({ connectionString: DATABASE_URL, max: 1, connectionTimeoutMillis: 3000 });
    const seen: string[] = [];
    const idle = (where: string): void => {
      expect(typeof small.totalCount).toBe('number');
      expect(small.totalCount, where).toBe(small.idleCount);
      seen.push(where);
    };
    const kms = new Proxy(enc.kms, {
      get(t, prop) {
        const value: unknown = Reflect.get(t, prop, t);
        if (prop === 'decryptDek' && typeof value === 'function') {
          return (...args: unknown[]) => {
            idle('kms');
            return (value as (...a: unknown[]) => unknown).apply(t, args);
          };
        }
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
    const gw = gateway((m) => {
      if (m.correlationId === `fw${hex(sendId)}`) idle('gateway');
      return Promise.resolve('req-small');
    });
    try {
      expect(await settled(sweep(gw, { pool: small, encryption: { kms, kekRef: enc.kekRef } }), sendId)).toMatchObject({ outcome: 'accepted', provider_message_id: 'req-small' });
    } finally {
      await small.end();
    }
    expect(seen).toEqual(['kms', 'gateway']);
  });

  describe('AC13 — the logins', () => {
    const noGrants = `twt_13_1b_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const sendGrants = `${noGrants}_s`;

    beforeAll(async () => {
      for (const role of [noGrants, sendGrants]) {
        await pool.query(`CREATE ROLE ${role} NOLOGIN BYPASSRLS`);
        await pool.query(`GRANT ${role} TO CURRENT_USER`);
      }
      await pool.query(`GRANT SELECT, UPDATE ON ${TABLE} TO ${sendGrants}`);
    });

    afterAll(async () => {
      await pool.query(`REVOKE ALL ON ${TABLE} FROM ${sendGrants}`);
      for (const role of [noGrants, sendGrants]) {
        await pool.query(`REVOKE ${role} FROM CURRENT_USER`);
        await pool.query(`DROP ROLE ${role}`);
      }
    });

    const onRole = (role: string): pg.Pool => new pg.Pool({ connectionString: DATABASE_URL, options: `-c role=${role}`, max: 3 });

    it('⭐ an RLS-bound login: ONE `rls_bound_role` alarm, nothing sent or changed', async () => {
      const pid = await pariwar();
      const { sendId } = await approved(pid, '592029');
      const app = new pg.Pool({ connectionString: DATABASE_URL, options: '-c role=twt_app', max: 2 });
      const gw = gateway();
      const deps = sweep(gw, { pool: app });
      try {
        expect(await runFieldWorkerCodeSmsTick(deps)).toEqual({ refused: true, lapsed: 0, claimed: 0 });
      } finally {
        await app.end();
      }
      expect(deps.alarms).toEqual([expect.stringContaining('field_worker_code_sms.rls_bound_role')]);
      expect((await rowOf(sendId)).outcome).toBe('due');
      await settled(sweep(gateway()), sendId);
    });

    it('⭐ a login that passes the guard but holds no grant on the send table: `sweep_failed:<error name>` each tick, nothing changed', async () => {
      const pid = await pariwar();
      const { sendId } = await approved(pid, '592030');
      const p = onRole(noGrants);
      const gw = gateway();
      const deps = sweep(gw, { pool: p });
      try {
        await runFieldWorkerCodeSmsTick(deps);
        await runFieldWorkerCodeSmsTick(deps);
      } finally {
        await p.end();
      }
      expect(deps.alarms).toEqual([expect.stringContaining('field_worker_code_sms.sweep_failed:error [code:42501]'), expect.stringContaining('field_worker_code_sms.sweep_failed:error [code:42501]')]);
      expect(await rowOf(sendId)).toMatchObject({ outcome: 'due', attempt_count: 0 });
      await settled(sweep(gateway()), sendId);
    });

    it('⭐ a login that can move a send row but not read `field_workers`: released `api_unavailable:db`, and at the ceiling `exhausted:attempts`, ⛔ `outcome_unknown`', async () => {
      const pid = await pariwar();
      const { sendId } = await seeded(pid, '592031', { attempt_count: 9, updatedAgoMs: 257 * 60_000, createdAgoMs: 8 * 3_600_000 });
      const p = onRole(sendGrants);
      const gw = gateway();
      const deps = sweep(gw, { pool: p });
      const errors: unknown[][] = [];
      const original = console.error;
      console.error = (...a: unknown[]) => void errors.push(a);
      try {
        expect(await settled(deps, sendId)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempts', attempt_count: 10 });
      } finally {
        console.error = original;
        await p.end();
      }
      expect(gw.mine(sendId)).toHaveLength(0);
      expect(JSON.stringify(errors)).toContain(sendId);
    });
  });
});
