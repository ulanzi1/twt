// Story 5.12 — a member's WhatsApp yes lasts until withdrawn (`-364` option A): the WORKER's member half. Live DB (:5433);
// each leg mints a FRESH random Pariwar (the worker commits — exact counts are per-tenant).
//   · AC3 — every withdrawal ends every yes: a LEGACY yes (seeded by INSERT — ⛔ an UPDATE of an ACTIVE row, which the LY4
//     trigger refuses; T8) + a re-opt-in through the REAL phrase match, then STOP / Meta 131050 ⇒ ⛔ open consent; ONE audit
//     line whose id is on BOTH revoked rows. The three non-consent codes end nothing (LY8 (a)).
//   · AC4 (a)–(h) — STOP always works (condition 3; LY6): any-state lookup, nothing-to-end ⇒ ⛔ write, two members on one
//     number, Hindi, a fault retried once then alarmed (ids only), the punctuation option, a pre-loop fault alarmed from the
//     per-message catch.
//   · AC2 / AC9 — ⛔ yes expires: a tick leaves an ACTIVE past its window ACTIVE (⛔ `expired` audit, ⛔ `expiredWindow`); the
//     stale-PENDING sweep is tested (closes the WA half of 5.5's sweep-coverage item): the table is SHARED and un-ordered (≥ 60
//     stale PENDINGs from other suites, `LIMIT 200`), so the seeded rows are 10 / 8 years old and the TTL is 9 years (a DEPS
//     field) — ONLY the seeded rows are candidates.
// Fault injection: the worker runs on its OWN pool connections, so a `pg_temp` trigger inside one uncommitted client tx cannot
// reach it — a COMMITTED test trigger calling a non-temp function, scoped `WHEN (OLD.opt_in_id = …)`, both dropped in
// `finally`, on their own connection with a `lock_timeout`; a leaked one is swept in `beforeAll` (the cycle-freeze.spec.ts shape).

import { randomUUID } from 'node:crypto';

import { claim, consent, createDb, ids, waOptIn } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { memberMobileBlindIndex, processWebhookEvent, runWaOptInExpirySweep, runWaWebhookProcessorTick } from '../src/wa-webhook-processor.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const FAULT_PREFIX = 't512_fault_';

describe.skipIf(!hasDatabase)('Story 5.12 — the worker ends every yes; STOP always works (live :5433)', () => {
  let created: ReturnType<typeof createDb>;
  let pool: pg.Pool;
  const enc = buildJobsEncryptionDeps('wa-opt-in-lasting-yes-pepper');
  const pariwars: string[] = [];
  const PNID = 'pnid-5-12';
  const MOBILE = '9876543210';
  const FROM = '919876543210';

  /** TEST-ONLY DDL on the SHARED `member_wa_opt_in` — its own connection, a `lock_timeout` (fail fast, ⛔ queue every suite). */
  async function ddl(sql: string): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query("SET lock_timeout = '5s'");
      await c.query(sql);
    } finally {
      await c.query('RESET lock_timeout').catch(() => undefined);
      c.release();
    }
  }

  beforeAll(async () => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
    const leakedTriggers = await pool.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'member_wa_opt_in'::regclass AND NOT tgisinternal AND starts_with(tgname, $1)`,
      [FAULT_PREFIX],
    );
    for (const { tgname } of leakedTriggers.rows) await ddl(`DROP TRIGGER IF EXISTS ${tgname} ON member_wa_opt_in`);
    const leakedFunctions = await pool.query<{ proname: string }>(
      `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = current_schema() AND starts_with(p.proname, $1)`,
      [FAULT_PREFIX],
    );
    for (const { proname } of leakedFunctions.rows) await ddl(`DROP FUNCTION IF EXISTS ${proname}()`);
    const leakedSequences = await pool.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'S' AND n.nspname = current_schema() AND starts_with(c.relname, $1)`,
      [FAULT_PREFIX],
    );
    for (const { relname } of leakedSequences.rows) await ddl(`DROP SEQUENCE IF EXISTS ${relname}`);
  });
  afterAll(async () => {
    try {
      await pool.query('DELETE FROM claim_contact_wa_stops WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await pool.query('DELETE FROM member_wa_opt_in WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await pool.query('DELETE FROM pariwar_wa_config WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
    } finally {
      await pool.end();
    }
  });

  /** A fresh tenant; with a WhatsApp config (and so an open claim branch) when a leg needs the claim stop. */
  async function pariwar(o: { readonly withConfig?: boolean } = {}): Promise<string> {
    const pid = randomUUID();
    pariwars.push(pid);
    if (o.withConfig) {
      await pool.query(`INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name) VALUES ($1, true, $2, 'tok')`, [pid, PNID]);
    }
    return pid;
  }
  const phrase = (): string => waOptIn.generateVerificationPhrase();
  const blind = (mobile = MOBILE) => memberMobileBlindIndex(mobile, enc);

  /** A legacy yes: an open consent granted two days ago + an EXPIRED row carrying it — INSERTed (⛔ UPDATE — T8). */
  async function seedLegacyYes(pid: string, memberId: string, mobile = MOBILE): Promise<{ consentId: string; optInId: string; phrase: string }> {
    const consentId = randomUUID();
    const p = phrase();
    await pool.query(
      `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_at, granted_via_actor, consent_payload)
       VALUES ($1, $2, $3, 'whatsapp_opt_in', now() - interval '2 days', 'member_self', '{"source":"meta_webhook_inbound"}')`,
      [consentId, memberId, pid],
    );
    const { rows } = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id,
                                     matched_at, created_at, updated_at)
       VALUES ($1, $2, 'EXPIRED_24H_WINDOW', $3, $4, now() - interval '1 day', $5, now() - interval '2 days', now() - interval '2 days',
               now() - interval '1 day') RETURNING opt_in_id`,
      [pid, memberId, p, await blind(mobile), consentId],
    );
    return { consentId, optInId: rows[0]!.opt_in_id, phrase: p };
  }

  /** A row in a given state with ⛔ consent (PENDING / REVOKED / EXPIRED-never-confirmed). */
  async function seedRow(pid: string, memberId: string, state: 'PENDING' | 'REVOKED' | 'EXPIRED_24H_WINDOW'): Promise<string> {
    const { rows } = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, $3, $4, $5) RETURNING opt_in_id`,
      [pid, memberId, state, phrase(), await blind()],
    );
    return rows[0]!.opt_in_id;
  }

  /** Opt in through the REAL path: a PENDING row, then the member's phrase message drained by the worker (5.4's match). */
  async function optInThroughWorker(pid: string, memberId: string, mobile = MOBILE): Promise<string> {
    const p = phrase();
    const { rows } = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'PENDING', $3, $4) RETURNING opt_in_id`,
      [pid, memberId, p, await blind(mobile)],
    );
    await process(pid, inbound(p, { from: `91${mobile}` }));
    expect(await stateOf(rows[0]!.opt_in_id)).toBe('ACTIVE');
    return rows[0]!.opt_in_id;
  }

  const inbound = (body: string, o: { readonly withMetadata?: boolean; readonly from?: string } = {}) => ({
    entry: [
      {
        changes: [
          {
            value: {
              ...(o.withMetadata ? { metadata: { phone_number_id: PNID } } : {}),
              messages: [{ from: o.from ?? FROM, type: 'text', text: { body } }],
            },
          },
        ],
      },
    ],
  });
  const statusPayload = (wamid: string, code: number) => ({
    entry: [{ changes: [{ value: { statuses: [{ id: wamid, status: 'failed', recipient_id: FROM, errors: [{ code }] }] } }] }],
  });
  async function event(pid: string, rawPayload: unknown): Promise<string> {
    const { rows } = await pool.query<{ event_id: string }>(
      `INSERT INTO wa_inbound_webhook_events (pariwar_id, raw_payload, signature_verified) VALUES ($1, $2, true) RETURNING event_id`,
      [pid, JSON.stringify(rawPayload)],
    );
    return rows[0]!.event_id;
  }
  const deps = () => ({ pool, db: created.db, enc });
  async function process(pid: string, rawPayload: unknown, extra: { readonly onAlarm?: (m: string) => void; readonly enc?: typeof enc } = {}): Promise<string> {
    const eventId = await event(pid, rawPayload);
    await processWebhookEvent({ ...deps(), ...extra }, { eventId, pariwarId: pid, rawPayload });
    return eventId;
  }

  const stateOf = async (optInId: string) =>
    (await pool.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId])).rows[0]!.state;
  const openConsents = async (pid: string, memberId: string) =>
    Number(
      (
        await pool.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'whatsapp_opt_in' AND revoked_at IS NULL`,
          [pid, memberId],
        )
      ).rows[0]!.n,
    );
  const revokedAuditIds = async (pid: string, memberId: string) =>
    (
      await pool.query<{ revoked_audit_id: string | null }>(
        `SELECT revoked_audit_id FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'whatsapp_opt_in' ORDER BY granted_at`,
        [pid, memberId],
      )
    ).rows.map((r) => r.revoked_audit_id);
  const auditLines = async (pid: string, action: string) =>
    (
      await pool.query<{ audit_id: string; request_payload_hash: string; response_status: number }>(
        `SELECT audit_id, request_payload_hash, response_status FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2 ORDER BY seq`,
        [pid, action],
      )
    ).rows;
  const memberAuditCount = async (pid: string) =>
    Number(
      (
        await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'member.wa_opt_in_%'`, [pid])
      ).rows[0]!.n,
    );
  const stopsOf = async (pid: string) =>
    (await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM claim_contact_wa_stops WHERE pariwar_id = $1`, [pid])).rows[0]!.n;

  /** The yes is GONE by every read the senders use (AC3). */
  async function expectNoYes(pid: string, memberId: string): Promise<void> {
    const pariwarId = ids.pariwarId(pid);
    const m = ids.memberId(memberId);
    expect(await openConsents(pid, memberId)).toBe(0);
    expect(await consent.consentExists(created.db, pariwarId, m, 'whatsapp_opt_in')).toBe(false);
    expect(await waOptIn.isPeerMeshWaReminderOptedIn(created.db, { pariwarId, memberId: m })).toBe(false);
    expect(await waOptIn.isOptInActive(created.db, { pariwarId, memberId: m })).toBe(false);
  }

  /**
   * Make `endEveryWaYes`'s UPDATE of `optInId` fail — on EVERY attempt, or only the first (a sequence's first value: `nextval`
   * is ⛔ transactional, so it survives the rollback). Runs `body`, then drops the trigger, function and sequence.
   */
  async function withFault<T>(optInId: string, mode: 'always' | 'first_only', body: () => Promise<T>): Promise<T> {
    const name = `${FAULT_PREFIX}${randomUUID().replace(/-/g, '')}`;
    const guard = mode === 'first_only' ? `IF nextval('${name}') = 1 THEN RAISE EXCEPTION 'test: forced member-STOP fault'; END IF;` : `RAISE EXCEPTION 'test: forced member-STOP fault';`;
    if (mode === 'first_only') await ddl(`CREATE SEQUENCE ${name}`);
    await ddl(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN ${guard} RETURN NEW; END $fn$`);
    try {
      await ddl(`CREATE TRIGGER ${name} BEFORE UPDATE ON member_wa_opt_in FOR EACH ROW WHEN (OLD.opt_in_id = '${optInId}'::uuid) EXECUTE FUNCTION ${name}()`);
      return await body();
    } finally {
      await ddl(`DROP TRIGGER IF EXISTS ${name} ON member_wa_opt_in`);
      await ddl(`DROP FUNCTION IF EXISTS ${name}()`);
      if (mode === 'first_only') await ddl(`DROP SEQUENCE IF EXISTS ${name}`);
    }
  }

  // ── AC3 — every withdrawal ends every yes (condition 4; I2) ─────────────────────────────────────────────────────────────────

  it('⭐ AC3 STOP — legacy yes + a re-opt-in, then STOP ⇒ ⛔ open consent, ⛔ yes; ONE audit line, its id on BOTH consent rows; ACTIVE → REVOKED', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    await seedLegacyYes(pid, m);
    const optInId = await optInThroughWorker(pid, m);
    expect(await openConsents(pid, m)).toBe(2);
    await process(pid, inbound('STOP'));
    expect(await stateOf(optInId)).toBe('REVOKED');
    await expectNoYes(pid, m);
    const lines = await auditLines(pid, 'member.wa_opt_in_revoked');
    expect(lines).toHaveLength(1);
    expect(await revokedAuditIds(pid, m)).toEqual([lines[0]!.audit_id, lines[0]!.audit_id]);
    expect(await auditLines(pid, 'member.wa_opt_in_revoked_rolled_back')).toHaveLength(0);
  });

  it('⭐ AC3 Meta 131050 — legacy yes + a re-opt-in, then a 131050 status ⇒ BLOCKED_BY_META and ⛔ open consent; ONE `blocked` line on BOTH rows', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    await seedLegacyYes(pid, m);
    const optInId = await optInThroughWorker(pid, m);
    await process(pid, statusPayload(`wamid.${randomUUID()}`, 131050));
    expect(await stateOf(optInId)).toBe('BLOCKED_BY_META');
    await expectNoYes(pid, m);
    const lines = await auditLines(pid, 'member.wa_opt_in_blocked');
    expect(lines).toHaveLength(1);
    expect(await revokedAuditIds(pid, m)).toEqual([lines[0]!.audit_id, lines[0]!.audit_id]);
  });

  it('⭐ AC3 / LY8 (a) — 131047, 131026 and 131049 on an ACTIVE member end NOTHING: the member stays ACTIVE, its consent open, ⛔ audit', async () => {
    for (const code of [131047, 131026, 131049]) {
      const pid = await pariwar();
      const m = randomUUID();
      const optInId = await optInThroughWorker(pid, m);
      const before = await memberAuditCount(pid);
      await process(pid, statusPayload(`wamid.${randomUUID()}`, code));
      expect(await stateOf(optInId), String(code)).toBe('ACTIVE');
      expect(await openConsents(pid, m), String(code)).toBe(1);
      expect(await memberAuditCount(pid), String(code)).toBe(before);
    }
  });

  // ── AC4 — STOP always works (condition 3; I3; LY6) ──────────────────────────────────────────────────────────────────────────

  it('AC4 (a) — an ACTIVE member\'s STOP ⇒ REVOKED and every consent closed', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    const optInId = await optInThroughWorker(pid, m);
    await process(pid, inbound('Stop'));
    expect(await stateOf(optInId)).toBe('REVOKED');
    await expectNoYes(pid, m);
  });

  it('⭐ AC4 (b) — a legacy EXPIRED member with an open consent: the consent closes, the row state is UNCHANGED, ONE audit line (before = after = EXPIRED)', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    const legacy = await seedLegacyYes(pid, m);
    await process(pid, inbound('STOP'));
    expect(await stateOf(legacy.optInId)).toBe('EXPIRED_24H_WINDOW');
    expect(await openConsents(pid, m)).toBe(0);
    const lines = await auditLines(pid, 'member.wa_opt_in_revoked');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.request_payload_hash).toBe(
      waOptIn.waOptInAuditPayloadHash({
        originatingChannel: 'meta_webhook_inbound',
        memberId: m,
        verificationPhrase: legacy.phrase,
        beforeState: 'EXPIRED_24H_WINDOW',
        afterState: 'EXPIRED_24H_WINDOW',
      }),
    );
    expect(await revokedAuditIds(pid, m)).toEqual([lines[0]!.audit_id]);
  });

  it('⭐ AC4 (c) — nothing to end (only PENDING / only REVOKED / ⛔ row / EXPIRED with ⛔ consent) ⇒ ⛔ write, ⛔ audit line', async () => {
    for (const state of ['PENDING', 'REVOKED', 'EXPIRED_24H_WINDOW', null] as const) {
      const pid = await pariwar();
      const m = randomUUID();
      const optInId = state === null ? null : await seedRow(pid, m, state);
      await process(pid, inbound('STOP'));
      if (optInId !== null) expect(await stateOf(optInId), String(state)).toBe(state);
      expect(await memberAuditCount(pid), String(state)).toBe(0);
    }
  });

  it('⭐ AC4 (d) — DEFENSIVE (⛔ reachable today — F10b): a number on TWO members\' rows ⇒ both yes ended; a fault on the first still ends the second', async () => {
    const pid = await pariwar();
    // Lookup orders by UUID: always fault the first member, then prove processing reaches the second.
    const [m1, m2] = [randomUUID(), randomUUID()].sort() as [string, string];
    const o1 = await optInThroughWorker(pid, m1);
    const o2 = await optInThroughWorker(pid, m2);
    const alarms: string[] = [];
    await withFault(o1, 'always', () => process(pid, inbound('STOP'), { onAlarm: (msg) => alarms.push(msg) }));
    expect(await stateOf(o1)).toBe('ACTIVE');
    expect(await stateOf(o2)).toBe('REVOKED');
    await expectNoYes(pid, m2);
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain(m1);
    expect(alarms[0]).not.toContain(m2);
  });

  it('AC4 (e) — a STOP in Hindi (`रोको`) behaves as (a)', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    const optInId = await optInThroughWorker(pid, m);
    await process(pid, inbound('रोको'));
    expect(await stateOf(optInId)).toBe('REVOKED');
    await expectNoYes(pid, m);
  });

  it('⭐ AC4 (f) — a fault on BOTH attempts ⇒ `wa_opt_in.stop_unrecorded` ONCE (ids only — ⛔ number, ⛔ phrase); the claim stop is still recorded', async () => {
    const pid = await pariwar({ withConfig: true });
    const m = randomUUID();
    const optInId = await optInThroughWorker(pid, m);
    const p = (await pool.query<{ verification_phrase: string }>(`SELECT verification_phrase FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId])).rows[0]!
      .verification_phrase;
    const alarms: string[] = [];
    const eventId = await withFault(optInId, 'always', () => process(pid, inbound('STOP', { withMetadata: true }), { onAlarm: (msg) => alarms.push(msg) }));
    expect(await stopsOf(pid)).toBe('1');
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('wa_opt_in.stop_unrecorded');
    expect(alarms[0]).toContain(pid);
    expect(alarms[0]).toContain(eventId);
    expect(alarms[0]).toContain(m);
    expect(alarms[0]).not.toContain(MOBILE);
    expect(alarms[0]).not.toContain(p);
    // Each attempt wrote its own primary line and, its write failing, its own compensation.
    expect(await auditLines(pid, 'member.wa_opt_in_revoked')).toHaveLength(2);
    expect(await auditLines(pid, 'member.wa_opt_in_revoked_rolled_back')).toHaveLength(2);
  });

  it('⭐ AC4 (f) — a fault on the FIRST attempt only ⇒ the retry ends the yes, ⛔ alarm; 2 primary + 1 `_rolled_back`; the consent carries the SECOND primary\'s id', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    const optInId = await optInThroughWorker(pid, m);
    const alarms: string[] = [];
    await withFault(optInId, 'first_only', () => process(pid, inbound('STOP'), { onAlarm: (msg) => alarms.push(msg) }));
    expect(alarms).toEqual([]);
    expect(await stateOf(optInId)).toBe('REVOKED');
    await expectNoYes(pid, m);
    const primary = await auditLines(pid, 'member.wa_opt_in_revoked');
    expect(primary).toHaveLength(2);
    const rolledBack = await auditLines(pid, 'member.wa_opt_in_revoked_rolled_back');
    expect(rolledBack).toHaveLength(1);
    expect(rolledBack[0]!.response_status).toBe(500);
    expect(await revokedAuditIds(pid, m)).toEqual([primary[1]!.audit_id]);
  });

  it('⭐ AC4 (g) — the punctuation option: "STOP." and "Stop!" behave as (a); "please stop now" does ⛔', async () => {
    for (const body of ['STOP.', 'Stop!']) {
      const pid = await pariwar();
      const m = randomUUID();
      const optInId = await optInThroughWorker(pid, m);
      await process(pid, inbound(body));
      expect(await stateOf(optInId), body).toBe('REVOKED');
      await expectNoYes(pid, m);
    }
    const pid = await pariwar();
    const m = randomUUID();
    const optInId = await optInThroughWorker(pid, m);
    await process(pid, inbound('please stop now'));
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(await openConsents(pid, m)).toBe(1);
  });

  it('⭐ AC4 (h) — the member blind index (the SECOND HMAC) throws on a STOP ⇒ the claim stop IS recorded; `wa_opt_in.stop_unrecorded` ONCE from the per-message catch, ⛔ number', async () => {
    const pid = await pariwar({ withConfig: true });
    const m = randomUUID();
    const optInId = await optInThroughWorker(pid, m);
    let calls = 0;
    const kms = Object.create(enc.kms) as typeof enc.kms;
    kms.computeHmac = async (...a: Parameters<typeof enc.kms.computeHmac>) => {
      calls += 1;
      if (calls === 2) throw new Error('kms unavailable'); // the claim-space hash is the FIRST HMAC; the member index the second
      return enc.kms.computeHmac(...a);
    };
    const alarms: string[] = [];
    const eventId = await process(pid, inbound('STOP', { withMetadata: true }), { enc: { ...enc, kms }, onAlarm: (msg) => alarms.push(msg) });
    expect(await stopsOf(pid)).toBe('1');
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('wa_opt_in.stop_unrecorded');
    expect(alarms[0]).toContain(eventId);
    expect(alarms[0]).not.toContain(MOBILE);
    expect(alarms[0]).not.toContain('contact_ladder.stop_unrecorded');
  });

  it('⭐ LY5 lost race — the ACTIVE row moves elsewhere between the read and the write (⛔ open consent) ⇒ primary + `_rolled_back`, ⛔ retry, ⛔ alarm', async () => {
    const pid = await pariwar();
    const m = randomUUID();
    const { rows } = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'ACTIVE', $3, $4) RETURNING opt_in_id`,
      [pid, m, phrase(), await blind()],
    );
    const optInId = rows[0]!.opt_in_id;
    // A BEFORE trigger returning NULL SKIPS the row update ⇒ `endEveryWaYes` returns `{ null, 0 }` — the shape a concurrent DELETE leaves.
    const name = `${FAULT_PREFIX}${randomUUID().replace(/-/g, '')}`;
    await ddl(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RETURN NULL; END $fn$`);
    const alarms: string[] = [];
    try {
      await ddl(`CREATE TRIGGER ${name} BEFORE UPDATE ON member_wa_opt_in FOR EACH ROW WHEN (OLD.opt_in_id = '${optInId}'::uuid) EXECUTE FUNCTION ${name}()`);
      await process(pid, inbound('STOP'), { onAlarm: (msg) => alarms.push(msg) });
    } finally {
      await ddl(`DROP TRIGGER IF EXISTS ${name} ON member_wa_opt_in`);
      await ddl(`DROP FUNCTION IF EXISTS ${name}()`);
    }
    expect(alarms).toEqual([]);
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(await auditLines(pid, 'member.wa_opt_in_revoked')).toHaveLength(1);
    expect(await auditLines(pid, 'member.wa_opt_in_revoked_rolled_back')).toHaveLength(1);
  });

  // ── AC2 / AC9 — ⛔ yes expires; the stale-PENDING sweep ─────────────────────────────────────────────────────────────────────

  const NINE_YEARS = 9 * 365 * 86400;
  async function seedAged(pid: string, state: 'PENDING' | 'ACTIVE', yearsOld: number): Promise<string> {
    const { rows } = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, created_at)
       VALUES ($1, $2, $3::wa_opt_in_state, $4, $5, CASE WHEN $3::wa_opt_in_state = 'ACTIVE' THEN now() - make_interval(years => $6::int) ELSE NULL END,
               now() - make_interval(years => $6::int))
       RETURNING opt_in_id`,
      [pid, randomUUID(), state, phrase(), `blind-${randomUUID()}`, yearsOld],
    );
    return rows[0]!.opt_in_id;
  }

  it('⭐ AC2 — a tick leaves an ACTIVE row whose window passed long ago ACTIVE, writes ⛔ `expired` line for it, and its result carries ⛔ expiredWindow', async () => {
    const pid = await pariwar();
    const active = await seedAged(pid, 'ACTIVE', 10);
    const result = await runWaWebhookProcessorTick({ ...deps(), pendingTtlSeconds: NINE_YEARS });
    expect(result).not.toHaveProperty('expiredWindow');
    expect(await stateOf(active)).toBe('ACTIVE');
    expect(await auditLines(pid, 'member.wa_opt_in_expired')).toHaveLength(0);
  });

  it('⭐ AC9 — the sweep: a stale PENDING expires with ONE audit line; a fresher PENDING is left; an ACTIVE past window is left (⛔ audit)', async () => {
    const pid = await pariwar();
    const stale = await seedAged(pid, 'PENDING', 10);
    const fresh = await seedAged(pid, 'PENDING', 8);
    const active = await seedAged(pid, 'ACTIVE', 10);
    const result = await runWaOptInExpirySweep({ ...deps(), pendingTtlSeconds: NINE_YEARS });
    expect(result.expiredPending).toBeGreaterThanOrEqual(1);
    expect(await stateOf(stale)).toBe('EXPIRED_24H_WINDOW');
    expect(await stateOf(fresh)).toBe('PENDING');
    expect(await stateOf(active)).toBe('ACTIVE');
    expect(await auditLines(pid, 'member.wa_opt_in_expired')).toHaveLength(1);
  });

  it('⭐ AC9 — a per-row fault is isolated: the faulted row stays PENDING (one primary + one `_rolled_back`), the next row still expires', async () => {
    const pid = await pariwar();
    const faulted = await seedAged(pid, 'PENDING', 10);
    const next = await seedAged(pid, 'PENDING', 10);
    await withFault(faulted, 'always', () => runWaOptInExpirySweep({ ...deps(), pendingTtlSeconds: NINE_YEARS }));
    expect(await stateOf(faulted)).toBe('PENDING');
    expect(await stateOf(next)).toBe('EXPIRED_24H_WINDOW');
    expect(await auditLines(pid, 'member.wa_opt_in_expired')).toHaveLength(2);
    expect(await auditLines(pid, 'member.wa_opt_in_expired_rolled_back')).toHaveLength(1);
  });

  it('a claim-only STOP (⛔ member on the number) records the claim stop and writes ⛔ member audit', async () => {
    const pid = await pariwar({ withConfig: true });
    await process(pid, inbound('STOP', { withMetadata: true }));
    expect(await stopsOf(pid)).toBe('1');
    expect(await memberAuditCount(pid)).toBe(0);
    // The claim hash space is untouched by the member half (I5) — the stop row is the claim-space hash.
    const { rows } = await pool.query<{ recipient_number_hash: string }>(`SELECT recipient_number_hash FROM claim_contact_wa_stops WHERE pariwar_id = $1`, [pid]);
    expect(rows[0]!.recipient_number_hash).toBe(await claim.correctionNumberHash(`+91${MOBILE}`, pid, enc));
  });
});
