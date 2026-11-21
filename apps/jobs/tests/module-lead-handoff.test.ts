// The partner LEAD HANDOFF sweep — Story 12.5 (Task 5 / 9.1; AC3's two-attempt leg, AC4's live half through the sweep, AC5–AC8, AC9's
// purge leg, AC11).
//
// Unit: the registration (queue, per-minute cron, IST, `localConcurrency: 1`), boot.ts's dedicated `max: 3` pool and its two `end()`
// sites, the Row 26 guard and the `sweep_failed` alarm on a stubbed pool.
// Live (the story container): REAL domain commands (`sealLeadMemberFields` + `recordLeadHandoff`), the real scope transactions and audit
// lines, the fake KMS (`buildJobsEncryptionDeps`), and a LOCAL TLS server reached through the client's ONE test seam — the real
// `https.request`, TLS and SNI run. Time is controlled ONLY through the sweep's options (no fake timers around real sockets, no sleeps).
// ⚠ A tick sweeps the WHOLE shared database: every test seeds a FRESH Pariwar, asserts on its own lead ids, and `afterEach` removes its
// rows (under `session_replication_role = replica`, as the 13.1b live test does). `beforeAll` clears foreign open rows — `apps/jobs`
// runs its files one at a time, and only this story writes this table.
// ⚠ Every "NO request" assertion sits beside a control that DID make a request in the same tick.

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import tls from 'node:tls';

import { encryption, marketplace, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES } from '@twt/queue';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import {
  DEFAULT_MODULE_LEAD_HANDOFF_CRON,
  MODULE_LEAD_HANDOFF_TZ,
  registerModuleLeadHandoffCron,
  runModuleLeadHandoffTick,
  type ModuleLeadHandoffDeps,
} from '../src/scheduler/module-lead-handoff.js';
import { createPartnerLeadClient, type PartnerLeadClient } from '../src/scheduler/partner-lead-client.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// ── Unit ──────────────────────────────────────────────────────────────────────────────────────────────

describe('module-lead-handoff — registration and pool (unit)', () => {
  it('creates the queue, works it ONE tick at a time, and schedules every minute in IST', async () => {
    const createQueue = vi.fn(async () => undefined);
    const work = vi.fn(async () => 'worker-id');
    const schedule = vi.fn(async () => undefined);
    const boss = { createQueue, work, schedule } as unknown as Parameters<typeof registerModuleLeadHandoffCron>[0];
    await registerModuleLeadHandoffCron(boss, { pool: {} as pg.Pool, encryption: {} as never, resolveSecret: async () => null });
    expect(DEFAULT_MODULE_LEAD_HANDOFF_CRON).toBe('* * * * *');
    expect(MODULE_LEAD_HANDOFF_TZ).toBe('Asia/Kolkata');
    expect(QUEUE_NAMES.MODULE_LEAD_HANDOFF).toBe('module.lead_handoff');
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.MODULE_LEAD_HANDOFF);
    expect(work).toHaveBeenCalledWith(QUEUE_NAMES.MODULE_LEAD_HANDOFF, { localConcurrency: 1 }, expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.MODULE_LEAD_HANDOFF, '* * * * *', {}, { tz: 'Asia/Kolkata' });
  });

  it('boot.ts gives the sweep its OWN max:3 pool, ends it twice, wires the SM resolver, and checks the cron shape', () => {
    const boot = readFileSync(new URL('../src/boot.ts', import.meta.url), 'utf-8');
    expect(boot).toMatch(/const \{ pool: moduleLeadHandoffPool \} = createDb\(connectionString, \{ max: 3, logger: false \}\)/);
    expect(boot).toMatch(/registerModuleLeadHandoffCron\(\s*boss,\s*\{ pool: moduleLeadHandoffPool, encryption: jobsEncryption, resolveSecret: resolveSmsDltConfig \}/);
    expect(boot.match(/moduleLeadHandoffPool\.end\(\)/g)).toHaveLength(2);
    expect(boot).toMatch(/MODULE_LEAD_HANDOFF_CRON must be a 5-field cron expression/);
    // Fence rule (e)'s production half: boot passes ⛔ client — the sweep builds `createPartnerLeadClient()` itself.
    expect(boot).not.toMatch(/createPartnerLeadClient|testSeam/);
  });

  it('⛔ BYPASSRLS ⇒ ONE `rls_bound_role` alarm and ⛔ lapse, purge or claim', async () => {
    const statements: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        statements.push(text);
        return { rows: [{ ok: false }], rowCount: 1 };
      }),
      connect: vi.fn(),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    expect(await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) })).toEqual({
      refused: true,
      lapsed: 0,
      purged: 0,
      claimed: 0,
      sent: 0,
    });
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('module_lead_handoff.rls_bound_role');
    expect(statements).toHaveLength(1);
  });

  it.each(['lapse', 'purge', 'claim'])('a throw in the %s ⇒ ONE `sweep_failed:<error name>` alarm and the tick ends', async (step) => {
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        const isLapse = text.includes("WHERE status = 'attempting' AND claimed_at");
        const isPurge = text.includes('WITH old AS MATERIALIZED');
        const isClaim = text.includes('WITH next AS MATERIALIZED');
        if ((step === 'lapse' && isLapse) || (step === 'purge' && isPurge) || (step === 'claim' && isClaim)) {
          throw Object.assign(new Error('permission denied for table marketplace_lead_handoffs'), { code: '42501' });
        }
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    const result = await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) });
    expect(result.claimed).toBe(0);
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toMatch(/module_lead_handoff\.sweep_failed:Error \[code:42501\] at the (lapse|purge|claim)/);
    expect(alarms[0]).not.toContain('permission denied');
  });
});

// ── Live ──────────────────────────────────────────────────────────────────────────────────────────────

const fixture = (name: string): Buffer => readFileSync(new URL(`./fixtures/partner-lead/${name}`, import.meta.url));
const CA = fixture('ca-cert.pem');
const CONTEXTS: Record<string, tls.SecureContext> = {
  'partner.test': tls.createSecureContext({ cert: fixture('partner-cert.pem'), key: fixture('partner-key.pem') }),
  'other.test': tls.createSecureContext({ cert: fixture('other-cert.pem'), key: fixture('other-key.pem') }),
};

const enc = buildJobsEncryptionDeps('module-lead-handoff-live-pepper');
const SECRET = 'whsec_live_test_secret_value_9f3c';
const SECRET_NAME = 'marketplace-test-lead-key';
const MEMBER_NAME = 'Savitri Kumari Devi Prasad';
const MOBILE_RAW = '98765 01234';
const MOBILE = '+919876501234';
const SCHEDULE_ZERO = [0, 0, 0, 0, 0, 0];

interface Received {
  readonly host: string;
  readonly path: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: Buffer;
}

/** A pool whose clients throw on the FIRST n statements that `match` (an injected fault) — the rest pass through. */
function faultyPool(base: pg.Pool, match: (text: string, values: unknown[]) => boolean, times = Number.POSITIVE_INFINITY): pg.Pool {
  let left = times;
  const wrapClient = (client: pg.PoolClient): pg.PoolClient =>
    new Proxy(client, {
      get(t, prop) {
        if (prop === 'query') {
          return (q: unknown, v?: unknown) => {
            const text = typeof q === 'string' ? q : String((q as { text?: unknown }).text ?? '');
            const values = Array.isArray(v) ? v : ((q as { values?: unknown[] }).values ?? []);
            if (left > 0 && match(text, values)) {
              left -= 1;
              return Promise.reject(Object.assign(new Error('injected fault'), { name: 'InjectedFault' }));
            }
            return (t.query as (...a: unknown[]) => unknown).call(t, q, v);
          };
        }
        const value: unknown = Reflect.get(t, prop, t);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
  return new Proxy(base, {
    get(t, prop) {
      if (prop === 'connect') return async () => wrapClient(await t.connect());
      const value: unknown = Reflect.get(t, prop, t);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
    },
  });
}

describe.skipIf(!hasDatabase)('Story 12.5 — the lead-handoff sweep (live DB, own-committing)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  let server: https.Server;
  let port: number;
  const received: Received[] = [];
  const pariwars: string[] = [];
  /** Per-path responses; a test may override. */
  let respond: (path: string, res: import('node:http').ServerResponse) => void;

  const defaultRespond = (path: string, res: import('node:http').ServerResponse): void => {
    if (path === '/ok') return void res.writeHead(200, { 'x-partner-reference': 'REF-1' }).end('{"ignored":true}');
    if (path === '/unsafe-ref') return void res.writeHead(200, { 'x-partner-reference': 'has space' }).end();
    const m = /^\/s(\d{3})$/.exec(path);
    if (m !== null) return void res.writeHead(Number(m[1]), Number(m[1]) === 302 ? { location: 'https://partner.test/elsewhere' } : {}).end();
    res.writeHead(500).end();
  };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    await purgeRows(pool, 'TRUE');
    server = https.createServer({ SNICallback: (name, cb) => cb(null, CONTEXTS[name] ?? CONTEXTS['partner.test']!) }, (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        received.push({ host: String(req.headers.host), path: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) });
        respond(req.url ?? '', res);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    respond = defaultRespond;
    received.length = 0;
    await purgeRows(pool, `pariwar_id::text = ANY('{${pariwars.join(',')}}'::text[])`);
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      for (const t of ['marketplace_lead_handoffs', 'consent_records', 'marketplace_modules', 'marketplace_partners', 'members', 'claims', 'events_log']) {
        await c.query(`DELETE FROM ${t} WHERE pariwar_id::text = ANY($1)`, [pariwars]);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
      await pool.end();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 60_000);

  respond = defaultRespond;

  async function purgeRows(p: pg.Pool, where: string): Promise<void> {
    const c = await p.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`DELETE FROM marketplace_lead_handoffs WHERE ${where}`);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  }

  // ── Seeds ──

  interface World {
    readonly pariwarId: string;
    readonly partnerId: string;
    readonly moduleId: string;
    readonly memberId: string;
  }

  /** A fresh Pariwar with a partner, an ACTIVE module at `url`, and a joined (`active`) member. */
  async function world(url = 'https://partner.test/ok', o: { secretName?: string; pariwarId?: string } = {}): Promise<World> {
    const pariwarId = o.pariwarId ?? randomUUID();
    if (!pariwars.includes(pariwarId)) pariwars.push(pariwarId);
    const partnerId = randomUUID();
    const moduleId = randomUUID();
    const memberId = randomUUID();
    await pool.query(
      `INSERT INTO marketplace_partners (partner_id, pariwar_id, display_name_en, display_name_hi, created_by_actor_id, audit_id)
       VALUES ($1, $2, $3, 'साझेदार', $4, $5)`,
      [partnerId, pariwarId, `Partner ${randomUUID()}`, randomUUID(), randomUUID()],
    );
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
      await c.query(
        `INSERT INTO marketplace_modules (module_id, pariwar_id, partner_id, name_en, name_hi, description_en, description_hi, eligibility_filter,
           scope_filter, valid_from, valid_until, slot_capacity, lead_handoff_url, lead_handoff_signing_key_secret_name, branding_bundle,
           manifest_schema_version, current_state, state_event_version, slots_remaining, archive_reason, audit_id)
         VALUES ($1, $2, $3, 'n', 'n', 'd', 'd', '{"version":1,"clauses":[]}', '{"version":1,"scope":"members-all"}',
                 now() - interval '1 hour', now() + interval '1 hour', NULL, $4, $5,
                 '{"version":1,"logo_object_key":null,"accent_color_hex":null}', 1, 'draft', 1, NULL, NULL, $6)`,
        [moduleId, pariwarId, partnerId, url, o.secretName ?? SECRET_NAME, randomUUID()],
      );
      await c.query(`UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2 WHERE module_id = $1`, [moduleId]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    await pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
    await memberEvents({ pariwarId, memberId }, [
      { type: 'member.signup_initiated' },
      { type: 'member.kyc_completed' },
      { type: 'member.vyawastha_shulk_paid' },
      { type: 'member.lock_in_expired', payload: { kyc_verified: true } },
    ]);
    return { pariwarId, partnerId, moduleId, memberId };
  }

  let eventSeq = 0;
  async function memberEvents(w: { pariwarId: string; memberId: string }, events: ReadonlyArray<{ type: string; payload?: unknown }>): Promise<void> {
    const { rows } = await pool.query<{ v: number }>('SELECT COALESCE(max(event_version), 0)::int AS v FROM events_log WHERE stream_id = $1', [w.memberId]);
    let v = rows[0]!.v;
    for (const e of events) {
      v += 1;
      eventSeq += 1;
      await pool.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
         VALUES ($1, $2, $3, $4, NULL, $5, now() - interval '1 day' + ($6::int * interval '1 second'))`,
        [w.memberId, e.type, JSON.stringify(e.payload ?? {}), v, w.pariwarId, eventSeq],
      );
    }
  }

  /** A REAL lead: the consent, `sealLeadMemberFields`, then `recordLeadHandoff` in a scope transaction (QE18's order, minus the submit). */
  async function lead(w: World, o: { fullName?: string } = {}): Promise<{ leadId: string; consentId: string }> {
    const leadId = randomUUID();
    const consentId = randomUUID();
    await pool.query(
      `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload)
       VALUES ($1, $2, $3, 'module_lead_handoff', $4, 'member_self', '{}')`,
      [consentId, w.memberId, w.pariwarId, leadId],
    );
    const sealedFields = await marketplace.sealLeadMemberFields(enc, {
      pariwarId: w.pariwarId,
      leadId,
      fields: { full_name: o.fullName ?? MEMBER_NAME, mobile: MOBILE_RAW, district: 'Gaya', preferred_language: 'hi' },
    });
    await withPariwarScope(pool, w.pariwarId, (_db: Db, client: pg.PoolClient) =>
      marketplace.recordLeadHandoff(client, { pariwarId: w.pariwarId, leadId, moduleId: w.moduleId, memberId: w.memberId, consentId, sealedFields, auditId: randomUUID() }),
    );
    return { leadId, consentId };
  }

  async function row(leadId: string): Promise<Record<string, unknown>> {
    const { rows } = await pool.query('SELECT * FROM marketplace_lead_handoffs WHERE lead_id = $1', [leadId]);
    expect(rows).toHaveLength(1);
    return rows[0] as Record<string, unknown>;
  }

  const lookups: string[] = [];
  function seamClient(o: { deadlineMs?: number } = {}): PartnerLeadClient {
    return createPartnerLeadClient({
      testSeam: {
        lookup: async (host) => {
          lookups.push(host);
          if (host === 'private.test') return [{ address: '10.0.0.5', family: 4 }];
          if (host === 'mixed.test') return [{ address: '127.0.0.1', family: 4 }, { address: '192.168.1.9', family: 4 }];
          if (host === 'dnsfail.test') throw new Error('ENOTFOUND');
          return [{ address: '127.0.0.1', family: 4 }];
        },
        allowAddresses: ['127.0.0.1'],
        connectPort: port,
        ca: CA,
        deadlineMs: o.deadlineMs ?? 3_000,
      },
    });
  }

  const alarms: string[] = [];
  function deps(o: Partial<ModuleLeadHandoffDeps> = {}): ModuleLeadHandoffDeps {
    return {
      pool,
      encryption: enc,
      resolveSecret: async () => SECRET,
      client: seamClient(),
      onAlarm: (m) => alarms.push(m),
      retryScheduleMs: SCHEDULE_ZERO,
      auditRetryPauseMs: 0,
      ...o,
    };
  }

  const sentFor = (leadId: string): Received[] => received.filter((r) => r.headers['idempotency-key'] === leadId);
  const alarmsFor = (leadId: string): string[] => alarms.filter((a) => a.includes(leadId));

  async function auditLines(pariwarId: string, leadId: string): Promise<Array<{ action: string; resource_locator: string; request_payload_hash: string; response_status: number }>> {
    const { rows } = await pool.query<{ action: string; resource_locator: string; request_payload_hash: string; response_status: number }>(
      `SELECT action, resource_locator, request_payload_hash, response_status FROM audit_log_entries
        WHERE pariwar_id = $1 AND resource_locator LIKE $2 ORDER BY seq`,
      [pariwarId, `module_lead/${leadId}%`],
    );
    return rows;
  }

  afterEach(() => {
    alarms.length = 0;
    lookups.length = 0;
  });

  // ── AC6 / AC3 / AC8 — delivery ──

  it('delivers a lead: one signed POST to the partner, delivered:http_2xx:200, the reference kept, the audit pair written (AC3, AC6, AC8)', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    const result = await runModuleLeadHandoffTick(deps());
    expect(result.sent).toBeGreaterThanOrEqual(1);
    const got = sentFor(leadId);
    expect(got).toHaveLength(1);
    const req = got[0]!;
    expect(req.host).toBe('partner.test');
    expect(req.headers['x-twt-attribution']).toBe(`pariwar=${w.pariwarId}, module=${w.moduleId}, lead_id=${leadId}`);
    expect(req.headers['content-type']).toBe('application/json');
    // The receiver's check, independently: HMAC-SHA-256 over "<t>." + body with the module's secret.
    const sig = /^t=(\d+), v1=([0-9a-f]{64})$/.exec(String(req.headers['x-twt-signature']));
    expect(sig).not.toBeNull();
    expect(createHmac('sha256', SECRET).update(`${sig![1]!}.`).update(req.body).digest('hex')).toBe(sig![2]);
    const body = JSON.parse(req.body.toString('utf-8')) as Record<string, unknown>;
    expect(body['member']).toEqual({ full_name: MEMBER_NAME, mobile: MOBILE, district: 'Gaya', preferred_language: 'hi' });
    expect(body['lead_id']).toBe(leadId);
    expect(body).not.toHaveProperty('member_id');
    expect(await row(leadId)).toMatchObject({ status: 'delivered', outcome_detail: 'delivered:http_2xx:200', partner_reference: 'REF-1', attempt_count: 1 });
    expect((await row(leadId))['delivered_at']).not.toBeNull();
    const lines = await auditLines(w.pariwarId, leadId);
    expect(lines.map((l) => l.action)).toEqual(['module.lead_handoff_fields_decrypted', 'module.lead_handoff_attempted']);
    expect(lines[1]!.resource_locator).toBe(`module_lead/${leadId}/attempt/1`);
    expect(lines[1]!.request_payload_hash).toBe(createHash('sha256').update(req.body).digest('hex'));
    expect(lines[1]!.response_status).toBe(200);
  });

  it('an unsafe reference header is stored as NULL', async () => {
    const w = await world('https://partner.test/unsafe-ref');
    const { leadId } = await lead(w);
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'delivered', partner_reference: null });
  });

  it('a transient failure ⇒ due, counted; the next tick re-sends the SAME key and the SAME bytes (AC3, AC6)', async () => {
    const w = await world('https://partner.test/flaky');
    const { leadId } = await lead(w);
    let calls = 0;
    respond = (path, res) => {
      if (path !== '/flaky') return defaultRespond(path, res);
      calls += 1;
      res.writeHead(calls === 1 ? 503 : 200).end();
    };
    // The schedule is an OPTION (zero here): the release makes the row due at once, and the breaker keeps it out of THIS tick.
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'due', outcome_detail: 'released:http_5xx:503', attempt_count: 1 });
    expect(sentFor(leadId)).toHaveLength(1);
    await runModuleLeadHandoffTick(deps());
    const sends = sentFor(leadId);
    expect(sends).toHaveLength(2);
    expect(sends[0]!.headers['idempotency-key']).toBe(leadId);
    expect(sends[1]!.headers['idempotency-key']).toBe(leadId);
    expect(sends[1]!.body.equals(sends[0]!.body)).toBe(true);
    expect(await row(leadId)).toMatchObject({ status: 'delivered', attempt_count: 2 });
  });

  it('the 7th transient failure ⇒ failed_delivery:retries_exhausted with ONE module_lead_handoff_failed alarm', async () => {
    const w = await world('https://partner.test/s503');
    const { leadId } = await lead(w);
    for (let i = 0; i < 7; i += 1) await runModuleLeadHandoffTick(deps());
    expect(sentFor(leadId)).toHaveLength(7);
    expect(await row(leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:retries_exhausted', attempt_count: 7 });
    expect(alarmsFor(leadId).filter((a) => a.includes('module_lead_handoff_failed'))).toHaveLength(1);
  });

  it.each([
    ['a 400', 'https://partner.test/s400', 'failed_delivery:http_4xx:400', true],
    ['a 409 to a replayed key (QE6 cost (iii))', 'https://partner.test/s409', 'failed_delivery:http_4xx:409', true],
    ['a 302 (⛔ followed)', 'https://partner.test/s302', 'failed_delivery:http_3xx:302', true],
    ['an explicit port', 'https://partner.test:8443/ok', 'failed_delivery:port_refused', false],
    ['a malformed stored URL', 'https://partner.test/x?q=1', 'failed_delivery:url_refused', false],
  ])('%s ⇒ permanent at once (%s), with the failure alarm', async (_label, url, detail, requested) => {
    const w = await world(url);
    const { leadId } = await lead(w);
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: detail });
    expect(sentFor(leadId)).toHaveLength(requested ? 1 : 0);
    expect(alarmsFor(leadId).some((a) => a.includes('module_lead_handoff_failed'))).toBe(true);
    // ⛔ Requested ⇒ ⛔ looked up either: a refused URL never reaches DNS.
    if (!requested) expect(lookups).toHaveLength(0);
  });

  it('a corrupt envelope ⇒ failed_delivery:fields_unreadable with the alarm, ⛔ request', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const other = encryption.serializeEnvelope(
        await encryption.encryptTier1(Buffer.from('{"version":1}', 'utf-8'), { pariwarId: w.pariwarId, fieldClass: 'module_lead_fields', rowKey: randomUUID() }, enc.kms, enc.kekRef),
      );
      await c.query('UPDATE marketplace_lead_handoffs SET member_fields_ciphertext = $2 WHERE lead_id = $1', [leadId, other]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    const control = await lead(await world());
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:fields_unreadable' });
    expect(sentFor(leadId)).toHaveLength(0);
    expect(alarmsFor(leadId).some((a) => a.includes('module_lead_handoff_failed'))).toBe(true);
    // A rowKey mismatch under the fake KMS is a key rejection ⇒ the tick ENDS; the control waits for the next tick.
    if ((await row(control.leadId))['status'] === 'due') await runModuleLeadHandoffTick(deps());
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('a 401 ⇒ due, counted, ONE setup_fault alarm for that module in the tick; an address refusal the same, ⛔ request, that authority\'s other row ⛔ claimed', async () => {
    const w = await world('https://partner.test/s401');
    const a = await lead(w);
    await runModuleLeadHandoffTick(deps());
    expect(await row(a.leadId)).toMatchObject({ status: 'due', outcome_detail: 'released:http_401', attempt_count: 1 });
    expect(alarmsFor(a.leadId).filter((m) => m.includes('module_lead_handoff_setup_fault'))).toHaveLength(1);

    const p = await world('https://private.test/hook');
    const x = await lead(p);
    const y = await lead(p);
    // The control is on ANOTHER authority: the 401 row above is due again and re-opens partner.test's breaker in this tick.
    const control = await lead(await world('https://other.test/ok'));
    alarms.length = 0;
    await runModuleLeadHandoffTick(deps());
    const rows = [await row(x.leadId), await row(y.leadId)];
    const refused = rows.filter((r) => r['outcome_detail'] === 'released:address_refused');
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ status: 'due', attempt_count: 1 });
    const untouched = rows.find((r) => r['outcome_detail'] !== 'released:address_refused')!;
    expect(untouched).toMatchObject({ status: 'due', attempt_count: 0, outcome_detail: null });
    expect(received.filter((r) => r.host === 'private.test')).toHaveLength(0);
    expect(alarms.filter((m) => m.includes('module_lead_handoff_setup_fault') && m.includes(p.moduleId))).toHaveLength(1);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('a host that resolves to one public and one private address is refused whole (address_refused)', async () => {
    const w = await world('https://mixed.test/hook');
    const { leadId } = await lead(w);
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ outcome_detail: 'released:address_refused' });
  });

  it('the breaker: after a transient failure, a second due row for the SAME authority is ⛔ claimed this tick, while another authority IS sent', async () => {
    const flaky = await world('https://partner.test/s503');
    const a = await lead(flaky);
    const b = await lead(flaky);
    const elsewhere = await world('https://other.test/ok');
    const c = await lead(elsewhere);
    await runModuleLeadHandoffTick(deps());
    const [ra, rb] = [await row(a.leadId), await row(b.leadId)];
    const tried = [ra, rb].filter((r) => r['attempt_count'] === 1);
    const skipped = [ra, rb].filter((r) => r['attempt_count'] === 0);
    expect(tried).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatchObject({ status: 'due', outcome_detail: null });
    expect((skipped[0]!['updated_at'] as Date).getTime()).toBe((skipped[0]!['created_at'] as Date).getTime());
    expect(sentFor(a.leadId).length + sentFor(b.leadId).length).toBe(1);
    expect(sentFor(c.leadId)).toHaveLength(1);
    expect(sentFor(c.leadId)[0]!.host).toBe('other.test');
  });

  it('a lapse ⇒ due, counted, and the next tick re-sends with the SAME Idempotency-Key; on attempt 7 ⇒ outcome_unknown with the alarm', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    const crashing: PartnerLeadClient = { ...seamClient(), post: () => Promise.reject(new Error('the worker died mid-request')) };
    await runModuleLeadHandoffTick(deps({ client: crashing }));
    expect(await row(leadId)).toMatchObject({ status: 'attempting', attempt_count: 1 });
    expect(alarms.some((a) => a.includes('a row crashed') && a.includes(leadId))).toBe(true);
    await runModuleLeadHandoffTick(deps({ leaseMs: 0 }));
    expect(sentFor(leadId)).toHaveLength(1);
    expect(sentFor(leadId)[0]!.headers['idempotency-key']).toBe(leadId);
    expect(await row(leadId)).toMatchObject({ status: 'delivered', attempt_count: 2 });

    const v = await world();
    const last = await lead(v);
    await runModuleLeadHandoffTick(deps({ client: crashing, maxAttempts: 1 }));
    await runModuleLeadHandoffTick(deps({ leaseMs: 0, maxAttempts: 1 }));
    expect(await row(last.leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:outcome_unknown' });
    expect(alarmsFor(last.leadId).some((a) => a.includes('module_lead_handoff_failed (failed_delivery:outcome_unknown)'))).toBe(true);
  });

  it('a STALE worker (its row lapsed and was re-claimed mid-request) writes nothing and raises stale_claim (I11)', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    const base = seamClient();
    const thief: PartnerLeadClient = {
      ...base,
      post: async (r) => {
        await marketplace.lapseLeadHandoffs(pool, { leaseMs: 0, retryScheduleMs: [0] });
        await marketplace.claimDueLeadHandoff(pool, { claimToken: 'the-other-worker' });
        return base.post(r);
      },
    };
    await runModuleLeadHandoffTick(deps({ client: thief, tickBudgetMs: 0 }));
    expect(await row(leadId)).toMatchObject({ status: 'attempting', claim_token: 'the-other-worker' });
    expect(alarmsFor(leadId).some((a) => a.includes('stale_claim'))).toBe(true);
  });

  it('a 2xx on a row ERASED mid-flight ends delivered (a settle records the true outcome)', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    const base = seamClient();
    const eraser: PartnerLeadClient = {
      ...base,
      post: async (r) => {
        await pool.query('UPDATE marketplace_lead_handoffs SET member_fields_ciphertext = NULL, updated_at = clock_timestamp() WHERE lead_id = $1', [leadId]);
        return base.post(r);
      },
    };
    await runModuleLeadHandoffTick(deps({ client: eraser }));
    expect(await row(leadId)).toMatchObject({ status: 'delivered', member_fields_ciphertext: null });
  });

  it('resolves the secret for one name ONCE in a tick that sends two rows of that module', async () => {
    const w = await world();
    const a = await lead(w);
    const b = await lead(w);
    const resolveSecret = vi.fn<(name: string) => Promise<string>>(async () => SECRET);
    await runModuleLeadHandoffTick(deps({ resolveSecret }));
    expect(sentFor(a.leadId)).toHaveLength(1);
    expect(sentFor(b.leadId)).toHaveLength(1);
    expect(resolveSecret.mock.calls.filter((c) => c[0] === SECRET_NAME)).toHaveLength(1);
  });

  it('with tickBudgetMs = 0 the tick sends exactly ONE row', async () => {
    const w = await world();
    const a = await lead(w);
    const b = await lead(w);
    const result = await runModuleLeadHandoffTick(deps({ tickBudgetMs: 0 }));
    expect(result.claimed).toBe(1);
    expect(sentFor(a.leadId).length + sentFor(b.leadId).length).toBe(1);
  });

  // ── AC7 — holds ──

  it('a missing secret ⇒ held:signing_key_unavailable, ⛔ counted, held_since set, ONE alarm, ⛔ decrypt line, the module\'s other row ⛔ claimed', async () => {
    const w = await world('https://partner.test/ok', { secretName: 'missing-key' });
    const a = await lead(w);
    const b = await lead(w);
    const control = await lead(await world());
    await runModuleLeadHandoffTick(deps({ resolveSecret: async (n) => (n === 'missing-key' ? null : SECRET) }));
    const rows = [await row(a.leadId), await row(b.leadId)];
    const held = rows.filter((r) => r['outcome_detail'] === 'held:signing_key_unavailable');
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ status: 'due', attempt_count: 0 });
    expect(held[0]!['held_since']).not.toBeNull();
    expect(rows.filter((r) => r['outcome_detail'] === null)).toHaveLength(1);
    expect(alarms.filter((m) => m.includes('module_lead_handoff_held:signing_key_unavailable') && m.includes(w.moduleId))).toHaveLength(1);
    expect(alarms.some((m) => m.includes('not found'))).toBe(true);
    expect((await auditLines(w.pariwarId, a.leadId)).length + (await auditLines(w.pariwarId, b.leadId)).length).toBe(0);
    expect(sentFor(a.leadId).length + sentFor(b.leadId).length).toBe(0);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('a Secret Manager OUTAGE holds the same way, and the alarm says which it was', async () => {
    const w = await world('https://partner.test/ok', { secretName: 'outage-key' });
    const { leadId } = await lead(w);
    await runModuleLeadHandoffTick(deps({ resolveSecret: () => Promise.reject(Object.assign(new Error('unavailable'), { code: 14 })) }));
    expect(await row(leadId)).toMatchObject({ outcome_detail: 'held:signing_key_unavailable' });
    expect(alarmsFor(leadId).some((m) => m.includes('Secret Manager unavailable [code:14]'))).toBe(true);
  });

  it('a DNS fault ⇒ held:dns_unavailable, and its authority\'s other rows are ⛔ claimed this tick', async () => {
    const w = await world('https://dnsfail.test/hook');
    const a = await lead(w);
    const b = await lead(w);
    const control = await lead(await world());
    await runModuleLeadHandoffTick(deps());
    const rows = [await row(a.leadId), await row(b.leadId)];
    expect(rows.filter((r) => r['outcome_detail'] === 'held:dns_unavailable')).toHaveLength(1);
    expect(rows.filter((r) => r['outcome_detail'] === null && r['attempt_count'] === 0)).toHaveLength(1);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it.each([
    ['a KMS fault', 'held:kms_unavailable', 'kms'],
    ['an audit-line fault', 'held:audit_unavailable', 'audit'],
    ['a predicate query that throws', 'held:db_unavailable', 'db'],
  ] as const)('%s holds the row and ENDS THE TICK (a second due row untouched), ⛔ request', async (_label, detail, fault) => {
    const w = await world();
    const a = await lead(w);
    const second = await lead(await world('https://other.test/ok'));
    let d = deps();
    if (fault === 'kms') {
      d = deps({ encryption: { ...enc, kms: { ...enc.kms, decryptDek: () => Promise.reject(Object.assign(new Error('down'), { code: 14 })) } } });
    } else if (fault === 'audit') {
      d = deps({ pool: faultyPool(pool, (text, values) => /insert into "audit_log_entries"/i.test(text) && values.includes('module.lead_handoff_fields_decrypted')) });
    } else {
      d = deps({ pool: faultyPool(pool, (text) => /from "consent_records"/i.test(text)) });
    }
    await runModuleLeadHandoffTick({ ...d, tickBudgetMs: 60_000 });
    const rows = [await row(a.leadId), await row(second.leadId)];
    expect(rows.filter((r) => r['outcome_detail'] === detail)).toHaveLength(1);
    expect(rows.filter((r) => r['outcome_detail'] === null && r['attempt_count'] === 0)).toHaveLength(1);
    expect(sentFor(a.leadId).length + sentFor(second.leadId).length).toBe(0);
  });

  it('after MAX_HOLD_MS of unbroken holds ⇒ failed_delivery:hold_expired:<word> with the failure alarm; an ordinary outcome in between clears held_since', async () => {
    const w = await world('https://partner.test/ok', { secretName: 'gone-key' });
    const { leadId } = await lead(w);
    // The hold's retry and its maximum are OPTIONS: zero retry makes the held row due at once; the budget keeps each tick to one row.
    const missing = { resolveSecret: async () => null, holdRetryMs: 0, tickBudgetMs: 0 };
    await runModuleLeadHandoffTick(deps(missing));
    expect((await row(leadId))['held_since']).not.toBeNull();
    await runModuleLeadHandoffTick(deps({ ...missing, maxHoldMs: 0 }));
    expect(await row(leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:hold_expired:signing_key' });
    expect(alarmsFor(leadId).some((a) => a.includes('module_lead_handoff_failed (failed_delivery:hold_expired:signing_key)'))).toBe(true);

    const v = await world('https://partner.test/s503', { secretName: 'flaky-key' });
    const other = await lead(v);
    let first = true;
    const flaky = { resolveSecret: async () => (first ? ((first = false), null) : SECRET), holdRetryMs: 0, tickBudgetMs: 0 };
    await runModuleLeadHandoffTick(deps(flaky));
    expect((await row(other.leadId))['held_since']).not.toBeNull();
    await runModuleLeadHandoffTick(deps(flaky));
    expect(await row(other.leadId)).toMatchObject({ status: 'due', outcome_detail: 'released:http_5xx:503', held_since: null });
  });

  // ── AC8 — the attempted line's retries, and silence ──

  it('the attempted line failing ONCE then succeeding ⇒ the row is settled with its true outcome; failing all three ⇒ ⛔ settled, it lapses', async () => {
    const w = await world();
    const once = await lead(w);
    const isAttempted = (text: string, values: unknown[]): boolean => /insert into "audit_log_entries"/i.test(text) && values.includes('module.lead_handoff_attempted');
    await runModuleLeadHandoffTick(deps({ pool: faultyPool(pool, isAttempted, 1), tickBudgetMs: 0 }));
    expect(await row(once.leadId)).toMatchObject({ status: 'delivered' });
    expect((await auditLines(w.pariwarId, once.leadId)).filter((l) => l.action === 'module.lead_handoff_attempted')).toHaveLength(1);

    const v = await world();
    const never = await lead(v);
    await runModuleLeadHandoffTick(deps({ pool: faultyPool(pool, isAttempted), tickBudgetMs: 0 }));
    expect(sentFor(never.leadId)).toHaveLength(1);
    expect(await row(never.leadId)).toMatchObject({ status: 'attempting', attempt_count: 1 });
    expect(alarmsFor(never.leadId).some((a) => a.includes('left to its lease'))).toBe(true);
  });

  it('⛔ alarm, log line, audit locator or detail carries a member field, the URL, a resolved address, a header value or the secret', async () => {
    const logs: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) =>
      vi.spyOn(console, k).mockImplementation((...a: unknown[]) => {
        logs.push(a.map(String).join(' '));
      }),
    );
    try {
      const ok = await world();
      const a = await lead(ok);
      const bad = await world('https://partner.test/s400');
      const b = await lead(bad);
      const held = await world('https://partner.test/ok', { secretName: 'nope-key' });
      const c = await lead(held);
      await runModuleLeadHandoffTick(deps({ resolveSecret: async (n) => (n === 'nope-key' ? null : SECRET) }));
      const everything = [...alarms, ...logs];
      for (const s of everything) {
        for (const forbidden of [MEMBER_NAME, MOBILE, '9876501234', 'Gaya', 'https://', 'partner.test', '127.0.0.1', SECRET, 'REF-1', 'v1=']) {
          expect(s, `leaked "${forbidden}" in: ${s}`).not.toContain(forbidden);
        }
      }
      for (const id of [a.leadId, b.leadId, c.leadId]) {
        const r = await row(id);
        expect(String(r['outcome_detail'] ?? '')).not.toMatch(/partner\.test|127\.0\.0\.1|https/);
        for (const l of await auditLines(ok.pariwarId, id)) expect(l.resource_locator).toMatch(/^module_lead\/[0-9a-f-]{36}(\/attempt\/\d+)?$/);
      }
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });

  // ── AC5 — the cancel predicates, each with a CONTROL sent in the same tick ──

  type Condition = (w: World, l: { leadId: string; consentId: string }) => Promise<void>;
  const revoke: Condition = async (_w, l) => {
    await pool.query('UPDATE consent_records SET revoked_at = now() WHERE consent_id = $1', [l.consentId]);
  };

  async function expectCancelled(
    leadId: string,
    pariwarId: string,
    word: string,
  ): Promise<void> {
    expect(await row(leadId)).toMatchObject({ status: 'cancelled', outcome_detail: `cancelled:${word}`, member_fields_ciphertext: null });
    expect(sentFor(leadId)).toHaveLength(0);
    expect((await auditLines(pariwarId, leadId)).filter((x) => x.action === 'module.lead_handoff_fields_decrypted')).toHaveLength(0);
    expect(alarmsFor(leadId).filter((a) => a.includes('module_lead_handoff_failed'))).toHaveLength(0);
  }

  it.each<[string, string, Condition]>([
    ['P1 — the consent revoked', 'consent_revoked', revoke],
    [
      'P1 — a revoke on a SECOND consent row for the same lead',
      'consent_revoked',
      async (w, l) => {
        await pool.query(
          `INSERT INTO consent_records (subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload, granted_at, revoked_at)
           VALUES ($1, $2, 'module_lead_handoff', $3, 'member_self', '{}', now() - interval '1 minute', now())`,
          [w.memberId, w.pariwarId, l.leadId],
        );
      },
    ],
    [
      'P2 — the member anonymized (the lifecycle state)',
      'member_erased',
      async (w) => memberEvents(w, [{ type: 'member.withdrawal_completed' }, { type: 'member.rtbf_anonymized' }]),
    ],
    ['P3 — withdrawn', 'member_withdrawn', async (w) => memberEvents(w, [{ type: 'member.withdrawal_completed' }])],
    [
      'P3 — terminated',
      'member_terminated',
      async (w) => memberEvents(w, [{ type: 'member.moderation.suspended', payload: { reason_code: 'fraud' } }, { type: 'member.moderation.terminated', payload: { reason_code: 'fraud' } }]),
    ],
    [
      'P4 — frozen by a claim intake',
      'account_frozen',
      async (w) => {
        const claimId = randomUUID();
        await pool.query(`INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at) VALUES ($1, 'claim.intake_initiated', $2, 1, $3, now() - interval '1 hour')`, [
          claimId,
          JSON.stringify({ deceased_member_id: w.memberId }),
          w.pariwarId,
        ]);
      },
    ],
    [
      'P5 — the claim SETTLED (the freeze lifted), the death report standing',
      'death_reported',
      async (w) => {
        const claimId = randomUUID();
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL app.claim_state_writer = 'on'");
          await c.query(`INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version) VALUES ($1, $2, $3, '{member_app}', 'intake_pending', 1)`, [
            claimId,
            w.pariwarId,
            w.memberId,
          ]);
          await c.query('COMMIT');
        } finally {
          c.release();
        }
        const payload = JSON.stringify({ deceased_member_id: w.memberId });
        await pool.query(`INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at) VALUES ($1, 'claim.intake_initiated', $2, 1, $3, now() - interval '2 hours')`, [claimId, payload, w.pariwarId]);
        await pool.query(`INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at) VALUES ($1, 'claim.settled', $2, 2, $3, now() - interval '1 hour')`, [claimId, payload, w.pariwarId]);
      },
    ],
    [
      'QE22 — the module WITHDRAWN by the Trust (trustee_archived)',
      'module_withdrawn',
      async (w) => archive(w.moduleId, 'trustee_archived'),
    ],
  ])('%s ⇒ cancelled, the fields dropped, ⛔ request, ⛔ decrypt line — and the CONTROL is sent in the same tick', async (_label, word, condition) => {
    const w = await world();
    const l = await lead(w);
    const control = await lead(await world());
    await condition(w, l);
    await runModuleLeadHandoffTick(deps());
    await expectCancelled(l.leadId, w.pariwarId, word);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  async function archive(moduleId: string, reason: string): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
      await c.query(
        `UPDATE marketplace_modules SET current_state = 'archived', archive_reason = $2::marketplace_module_archive_reason, state_event_version = state_event_version + 1 WHERE module_id = $1`,
        [moduleId, reason],
      );
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  }

  it('a SUSPENDED member\'s lead is sent; a lead of a module archived by valid_until_reached is sent', async () => {
    const s = await world();
    await memberEvents(s, [{ type: 'member.moderation.suspended', payload: { reason_code: 'fraud' } }]);
    const a = await lead(s);
    const v = await world();
    const b = await lead(v);
    await archive(v.moduleId, 'valid_until_reached');
    await runModuleLeadHandoffTick(deps());
    expect(sentFor(a.leadId)).toHaveLength(1);
    expect(sentFor(b.leadId)).toHaveLength(1);
  });

  it.each([
    ['an explicit port (⛔ port_refused)', 'https://partner.test:8443/ok', {}],
    ['a missing key (⛔ held — on the FIRST attempt)', 'https://partner.test/ok', { secretName: 'absent-key' }],
    ['a private address (⛔ address_refused, ⛔ retries_exhausted)', 'https://private.test/hook', {}],
  ])('the member\'s side decides FIRST: a revoked consent ends consent_revoked with %s', async (_label, url, o) => {
    const w = await world(url, o);
    const l = await lead(w);
    await revoke(w, l);
    await runModuleLeadHandoffTick(deps({ resolveSecret: async (n) => (n === 'absent-key' ? null : SECRET) }));
    await expectCancelled(l.leadId, w.pariwarId, 'consent_revoked');
    expect(alarmsFor(l.leadId).filter((a) => a.includes('setup_fault') || a.includes('held:'))).toHaveLength(0);
  });

  it('the member\'s word wins over a withdrawn module: consent_revoked, ⛔ module_withdrawn', async () => {
    const w = await world();
    const l = await lead(w);
    await revoke(w, l);
    await archive(w.moduleId, 'trustee_archived');
    await runModuleLeadHandoffTick(deps());
    await expectCancelled(l.leadId, w.pariwarId, 'consent_revoked');
  });

  it('P0 false with an explicit-port URL: the row is HELD (held:db_unavailable), ⛔ failed, and the tick goes on', async () => {
    const w = await world('https://partner.test:8443/ok');
    const foreign = await world();
    const leadId = randomUUID();
    const consentId = randomUUID();
    await pool.query(
      `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload)
       VALUES ($1, $2, $3, 'module_lead_handoff', $4, 'member_self', '{}')`,
      [consentId, foreign.memberId, w.pariwarId, leadId],
    );
    const sealed = await marketplace.sealLeadMemberFields(enc, { pariwarId: w.pariwarId, leadId, fields: { full_name: 'X Y', mobile: MOBILE_RAW, district: null, preferred_language: 'en' } });
    await withPariwarScope(pool, w.pariwarId, (_db: Db, client: pg.PoolClient) =>
      marketplace.recordLeadHandoff(client, { pariwarId: w.pariwarId, leadId, moduleId: w.moduleId, memberId: foreign.memberId, consentId, sealedFields: sealed, auditId: randomUUID() }),
    );
    const control = await lead(await world());
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'due', outcome_detail: 'held:db_unavailable', attempt_count: 0 });
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  // ── AC9 — the purge half ──

  it('the purge drops a delivered row\'s fields once past the retention (retentionDays as an option)', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    await runModuleLeadHandoffTick(deps());
    expect((await row(leadId))['member_fields_ciphertext']).not.toBeNull();
    await runModuleLeadHandoffTick(deps({ retentionDays: 0 }));
    expect(await row(leadId)).toMatchObject({ status: 'delivered', member_fields_ciphertext: null });
  });
});
