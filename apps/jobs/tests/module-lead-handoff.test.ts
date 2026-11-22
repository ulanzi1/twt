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

import { claim, encryption, marketplace, withPariwarScope, type Db } from '@twt/domain';
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
      cancelledWaiting: 0,
      claimed: 0,
      sent: 0,
      visitsPurged: 0,
    });
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('module_lead_handoff.rls_bound_role');
    expect(statements).toHaveLength(1);
  });

  /** Which step a statement belongs to — the lapse, the purge, the waiting pass's page read, the claim, (12.5b) W15's visit purge. */
  const stepOf = (text: string): string | null =>
    text.includes("WHERE status = 'attempting' AND claimed_at")
      ? 'lapse'
      : text.includes('marketplace_partner_form_visits')
        ? 'visit purge'
        : text.includes('WITH old AS MATERIALIZED')
        ? 'purge'
        : text.includes('AS module_withdrawn')
          ? 'waiting pass'
          : text.includes('WITH next AS MATERIALIZED')
            ? 'claim'
            : null;

  it.each(['lapse', 'purge', 'claim'])('a throw in the %s ⇒ ONE `sweep_failed:<error name>` alarm NAMING THAT STEP, and the tick ends', async (step) => {
    const reached: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        const at = stepOf(text);
        if (at !== null) reached.push(at);
        if (at === step) throw Object.assign(new Error('permission denied for table marketplace_lead_handoffs'), { code: '42501' });
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    const result = await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) });
    expect(result.claimed).toBe(0);
    expect(alarms).toHaveLength(1);
    // The step is THIS one (⛔ any of them), and nothing of the `trust_sends` part after it ran: the order is lapse → purge → waiting pass
    // → claim. Story 12.5b, `-491`: W15 runs on EVERY one of these ticks — after the claim loop, or in place of the rest of the tick.
    expect(alarms[0]).toContain(`module_lead_handoff.sweep_failed:Error [code:42501] at the ${step} —`);
    const order = ['lapse', 'purge', 'waiting pass', 'claim'];
    expect(reached).toEqual([...order.slice(0, order.indexOf(step) + 1), 'visit purge']);
    expect(alarms[0]).not.toContain('permission denied');
  });

  it('a throw in the waiting pass ⇒ ONE `waiting_pass_failed` alarm, the PASS ends and the CLAIM STILL RUNS (`-488` (2))', async () => {
    const reached: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        const at = stepOf(text);
        if (at !== null) reached.push(at);
        if (at === 'waiting pass') throw Object.assign(new Error('permission denied for table marketplace_lead_handoffs'), { code: '42501' });
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    const result = await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) });
    expect(alarms).toEqual([expect.stringContaining('module_lead_handoff.waiting_pass_failed:Error [code:42501] listing a page — the pass ends here, the claim still runs')]);
    expect(alarms[0]).not.toContain('permission denied');
    expect(reached).toEqual(['lapse', 'purge', 'waiting pass', 'claim', 'visit purge']);
    expect(result).toMatchObject({ refused: false, cancelledWaiting: 0, claimed: 0 });
  });

  // `-491` — a throw in the ROLE CHECK (S1) also leaves W15 to run; ⛔ the `rls_bound_role` REFUSAL (above: one statement, nothing more).
  it('a throw in the role check ⇒ ONE `sweep_failed` alarm, the trust_sends part ends, and W15 STILL RUNS (`-491`)', async () => {
    const reached: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) throw Object.assign(new Error('connection terminated'), { code: '57P01' });
        const at = stepOf(text);
        if (at !== null) reached.push(at);
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    const result = await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) });
    expect(reached).toEqual(['visit purge']);
    expect(alarms).toEqual([expect.stringContaining('module_lead_handoff.sweep_failed:Error [code:57P01] at the role check —')]);
    expect(result).toMatchObject({ refused: false, claimed: 0 });
  });

  // `-491` — the two faults are independent: a lapse throw AND a W15 throw in one tick give TWO alarms, each naming its own step.
  it('a throw in the lapse AND in W15 in the same tick ⇒ TWO alarms (`sweep_failed … lapse`, `visit_purge_failed`), neither hiding the other (`-491`)', async () => {
    const reached: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        const at = stepOf(text);
        if (at !== null) reached.push(at);
        if (at === 'lapse') throw Object.assign(new Error('permission denied for table marketplace_lead_handoffs'), { code: '42501' });
        if (at === 'visit purge') throw Object.assign(new Error('permission denied for table marketplace_partner_form_visits'), { code: '42501' });
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) });
    expect(reached).toEqual(['lapse', 'visit purge']);
    expect(alarms).toHaveLength(2);
    expect(alarms[0]).toContain('sweep_failed:Error [code:42501] at the lapse');
    expect(alarms[1]).toContain('visit_purge_failed:Error [code:42501]');
    expect(alarms.join(' ')).not.toContain('permission denied');
  });

  // `-491` (QE5) — W15 runs although the tick's time budget is spent before the claim loop starts.
  it('W15 runs even when the tick budget is already spent (`tickBudgetMs: 0`)', async () => {
    const reached: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        const at = stepOf(text);
        if (at !== null) reached.push(at);
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, tickBudgetMs: 0, onAlarm: () => undefined });
    expect(reached.at(-1)).toBe('visit purge');
  });

  // Story 12.5b (QE5, AC5) — W15 is its own scope and its throw is its own: ONE alarm (a name and a SQLSTATE — ⛔ the message), nothing else.
  it('W15 runs after the claim on a normal tick; a throw in it ⇒ ONE `visit_purge_failed:<error>` alarm and the tick still resolves', async () => {
    const reached: string[] = [];
    const pool = {
      query: vi.fn(async (text: string) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        const at = stepOf(text);
        if (at !== null) reached.push(at);
        if (at === 'visit purge') throw Object.assign(new Error('permission denied for table marketplace_partner_form_visits'), { code: '42501' });
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const alarms: string[] = [];
    const result = await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null, onAlarm: (m) => alarms.push(m) });
    expect(reached).toEqual(['lapse', 'purge', 'waiting pass', 'claim', 'visit purge']);
    expect(alarms).toEqual([expect.stringContaining('module_lead_handoff.visit_purge_failed:Error [code:42501] — the partner-form visit records were not purged this tick')]);
    expect(alarms[0]).not.toContain('permission denied');
    expect(result).toMatchObject({ refused: false, visitsPurged: 0 });
  });

  it('W15 removes only visit records MORE than 90 days old, by a MATERIALIZED batch, bounded (⛔ an IN-subquery, ⛔ a row lock — RP1)', async () => {
    const seen: { text: string; values: unknown[] }[] = [];
    const pool = {
      query: vi.fn(async (text: string, values: unknown[] = []) => {
        if (text.includes('rolbypassrls')) return { rows: [{ ok: true }], rowCount: 1 };
        if (text.includes('marketplace_partner_form_visits')) {
          seen.push({ text, values });
          return { rows: [], rowCount: 3 };
        }
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as pg.Pool;
    const result = await runModuleLeadHandoffTick({ pool, encryption: {} as never, resolveSecret: async () => null });
    expect(result.visitsPurged).toBe(3);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.text).toMatch(/WITH old AS MATERIALIZED/);
    expect(seen[0]!.text).toMatch(/opened_at < clock_timestamp\(\) - \$1::double precision \* interval '1 day'/);
    expect(seen[0]!.text).toMatch(/ORDER BY opened_at, visit_id\s+LIMIT \$2/);
    // Review RP1 (Decision `2026-11-22-490` (2)): a row lock needs an UPDATE privilege the jobs login does not hold (the live leg in
    // `lead-handoff-commands.spec.ts` runs it on that login's shape).
    expect(seen[0]!.text).not.toMatch(/FOR (UPDATE|NO KEY UPDATE|SHARE|KEY SHARE)/);
    expect(seen[0]!.text).not.toMatch(/IN \(/);
    expect(seen[0]!.values).toEqual([90, 500]);
  });

  it('waitingPageSize clamps the page option as the read does — the pass compares against THIS (round 2; the live "page option of 0" leg runs the pass)', () => {
    expect(marketplace.waitingPageSize(undefined)).toBe(marketplace.LEAD_HANDOFF_WAITING_PAGE);
    expect(marketplace.waitingPageSize(0)).toBe(1);
    expect(marketplace.waitingPageSize(10_000)).toBe(marketplace.LEAD_HANDOFF_WAITING_PAGE_CAP);
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
      for (const t of ['marketplace_lead_handoffs', 'marketplace_partner_form_visits', 'consent_records', 'marketplace_modules', 'marketplace_partners', 'members', 'claims', 'events_log']) {
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
           manifest_schema_version, lead_route, current_state, state_event_version, slots_remaining, archive_reason, audit_id)
         VALUES ($1, $2, $3, 'n', 'n', 'd', 'd', '{"version":1,"clauses":[]}', '{"version":1,"scope":"members-all"}',
                 now() - interval '1 hour', now() + interval '1 hour', NULL, $4, $5,
                 '{"version":1,"logo_object_key":null,"accent_color_hex":null}', 1, 'trust_sends', 'draft', 1, NULL, NULL, $6)`,
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
    // Story 12.5b (QE4 (c)) — the seal takes the pool and the module: it reads the route in its own short scope before KMS.
    const sealedFields = await marketplace.sealLeadMemberFields(pool, enc, {
      pariwarId: w.pariwarId,
      moduleId: w.moduleId,
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
      // Each call its own waiting-pass cursor: no test inherits where another's pass stopped.
      waitingCursor: { leadId: null },
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

  /** Overwrite a lead's sealed fields with an envelope sealed under `rowKey` (the guard refuses it; `replica` steps around the guard). */
  async function resealAs(w: World, leadId: string, rowKey: string, plaintext = '{"version":1}'): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const other = encryption.serializeEnvelope(
        await encryption.encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: w.pariwarId, fieldClass: 'module_lead_fields', rowKey }, enc.kms, enc.kekRef),
      );
      await c.query('UPDATE marketplace_lead_handoffs SET member_fields_ciphertext = $2 WHERE lead_id = $1', [leadId, other]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  }

  it('fields that open but are not the sealed object ⇒ failed_delivery:fields_unreadable with the alarm, ⛔ request — ONE row\'s fault: the tick goes on', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    // Sealed under THIS lead's own context, so the key unwraps and the tag holds — but the object is not a `SealedLeadMemberFieldsV1`.
    await resealAs(w, leadId, leadId);
    const control = await lead(await world());
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:fields_unreadable', attempt_count: 1 });
    expect(sentFor(leadId)).toHaveLength(0);
    expect(alarmsFor(leadId).some((a) => a.includes('module_lead_handoff_failed'))).toBe(true);
    // The SAME tick: unconditional — a `schema` fault never ends it.
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('⭐ a key the key service REJECTS ⇒ HELD (kms), the attempt given back, ONE held alarm, ⛔ failure, and the tick ENDS — then hold_expired:kms (Decision -487)', async () => {
    const w = await world();
    const { leadId } = await lead(w);
    // Sealed under ANOTHER lead's context: the fake key service rejects the unwrap with gRPC 3 — what a wrong key reference returns for
    // EVERY row. The sweep cannot tell the two apart, so it must not end the lead.
    await resealAs(w, leadId, randomUUID());
    const control = await lead(await world());
    const zeroHold = { holdRetryMs: 0 };
    const first = await runModuleLeadHandoffTick(deps(zeroHold));
    expect(await row(leadId)).toMatchObject({ status: 'due', outcome_detail: 'held:kms_unavailable', attempt_count: 0 });
    expect((await row(leadId))['held_since']).not.toBeNull();
    expect((await row(leadId))['member_fields_ciphertext']).not.toBeNull();
    expect(alarms.filter((a) => a.includes('module_lead_handoff_held:kms_unavailable'))).toHaveLength(1);
    expect(alarms.filter((a) => a.includes('module_lead_handoff_failed'))).toHaveLength(0);
    // The tick ENDED on it: the control behind it was not claimed, and nothing was sent.
    expect(first.claimed).toBe(1);
    expect(await row(control.leadId)).toMatchObject({ status: 'due', attempt_count: 0, outcome_detail: null });
    expect(received).toHaveLength(0);
    // The next tick: the control was due BEFORE the held row came back, so it goes first — a held row does not stall the queue — and the
    // run of holds, past its maximum (an option here), ends as a HOLD's expiry with the failure alarm.
    await runModuleLeadHandoffTick(deps({ ...zeroHold, maxHoldMs: 0 }));
    expect(sentFor(control.leadId)).toHaveLength(1);
    expect(await row(leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:hold_expired:kms' });
    expect(alarmsFor(leadId).filter((a) => a.includes('module_lead_handoff_failed (failed_delivery:hold_expired:kms)'))).toHaveLength(1);
    expect(sentFor(leadId)).toHaveLength(0);
  });

  it.each([
    ['a 403', '/s403', 'released:http_403', 403, true],
    ['a 404', '/s404', 'released:http_404', 404, true],
    ['a 408', '/s408', 'released:http_408', 408, false],
    ['a 429', '/s429', 'released:http_429', 429, false],
    ['a server that never answers (the deadline)', '/hang', 'released:timeout', 599, false],
    ['a connection dropped after the request was written', '/drop', 'released:network', 598, false],
  ] as const)('%s ⇒ due, counted, the schedule\'s next time, the attempted line\'s status — through the sweep (AC6, AC8)', async (_label, path, detail, auditStatus, setupFault) => {
    const w = await world(`https://partner.test${path}`);
    const { leadId } = await lead(w);
    respond = (p, res) => {
      if (p === '/hang') return; // never answered: the client's wall-clock deadline ends it
      if (p === '/drop') return void res.socket?.destroy();
      defaultRespond(p, res);
    };
    const before = (await pool.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    await runModuleLeadHandoffTick(deps({ client: seamClient({ deadlineMs: 400 }), retryScheduleMs: [120_000, 0, 0, 0, 0, 0] }));
    const r = await row(leadId);
    expect(r).toMatchObject({ status: 'due', outcome_detail: detail, attempt_count: 1, claim_token: null });
    // "the schedule's next time": the FIRST wait of the schedule passed in, from the database clock.
    const waitSeconds = ((r['next_attempt_at'] as Date).getTime() - before.getTime()) / 1000;
    expect(waitSeconds).toBeGreaterThanOrEqual(120);
    expect(waitSeconds).toBeLessThan(150);
    expect(sentFor(leadId)).toHaveLength(1);
    const attempted = (await auditLines(w.pariwarId, leadId)).filter((l) => l.action === 'module.lead_handoff_attempted');
    expect(attempted).toHaveLength(1);
    // A real status, or the fixed synthetic 599 (timeout) / 598 (network) when no response came (QE14 (c)).
    expect(attempted[0]!.response_status).toBe(auditStatus);
    expect(alarmsFor(leadId).filter((m) => m.includes('module_lead_handoff_setup_fault'))).toHaveLength(setupFault ? 1 : 0);
    expect(alarmsFor(leadId).filter((m) => m.includes('module_lead_handoff_failed'))).toHaveLength(0);
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
    const behind = await lead(await world('https://other.test/ok'));
    // The DEFAULT budget (⛔ zero): only S9's own `end_tick` can keep the row behind it from being claimed.
    const result = await runModuleLeadHandoffTick(deps({ pool: faultyPool(pool, isAttempted) }));
    expect(sentFor(never.leadId)).toHaveLength(1);
    expect(await row(never.leadId)).toMatchObject({ status: 'attempting', attempt_count: 1 });
    expect(alarmsFor(never.leadId).some((a) => a.includes('left to its lease'))).toBe(true);
    expect(result.claimed).toBe(1);
    expect(await row(behind.leadId)).toMatchObject({ status: 'due', attempt_count: 0, outcome_detail: null });
    expect(sentFor(behind.leadId)).toHaveLength(0);
    expect((await auditLines(v.pariwarId, never.leadId)).filter((l) => l.action === 'module.lead_handoff_attempted')).toHaveLength(0);
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
        // The secret NAMES too: QE9 would allow one in an alarm, but the sweep emits none (its own header says so) — pinned as built.
        for (const forbidden of [MEMBER_NAME, MOBILE, '9876501234', 'Gaya', 'https://', 'partner.test', '127.0.0.1', SECRET, 'REF-1', 'v1=', SECRET_NAME, 'nope-key']) {
          expect(s, `leaked "${forbidden}" in: ${s}`).not.toContain(forbidden);
        }
      }
      // Each lead's lines under its OWN Pariwar (one Pariwar for all three would read two empty lists), and the shape is asserted on
      // lines that EXIST: the delivered and the refused lead each made a request.
      for (const [w, id, requested] of [[ok, a.leadId, true], [bad, b.leadId, true], [held, c.leadId, false]] as const) {
        const r = await row(id);
        expect(String(r['outcome_detail'] ?? '')).not.toMatch(/partner\.test|127\.0\.0\.1|https/);
        const lines = await auditLines(w.pariwarId, id);
        expect(lines.length).toBe(requested ? 2 : 0);
        for (const l of lines) expect(l.resource_locator).toMatch(/^module_lead\/[0-9a-f-]{36}(\/attempt\/\d+)?$/);
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
    // The control is on ANOTHER authority and another secret name, so neither breaker of this tick keeps it back.
    const control = await lead(await world('https://other.test/ok'));
    await runModuleLeadHandoffTick(deps({ resolveSecret: async (n) => (n === 'absent-key' ? null : SECRET) }));
    await expectCancelled(l.leadId, w.pariwarId, 'consent_revoked');
    expect(alarmsFor(l.leadId).filter((a) => a.includes('setup_fault') || a.includes('held:'))).toHaveLength(0);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('the member\'s word wins over a withdrawn module: consent_revoked, ⛔ module_withdrawn', async () => {
    const w = await world();
    const l = await lead(w);
    await revoke(w, l);
    await archive(w.moduleId, 'trustee_archived');
    const control = await lead(await world('https://other.test/ok'));
    await runModuleLeadHandoffTick(deps());
    await expectCancelled(l.leadId, w.pariwarId, 'consent_revoked');
    expect(sentFor(control.leadId)).toHaveLength(1);
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
    const sealed = await marketplace.sealLeadMemberFields(pool, enc, { pariwarId: w.pariwarId, moduleId: w.moduleId, leadId, fields: { full_name: 'X Y', mobile: MOBILE_RAW, district: null, preferred_language: 'en' } });
    // `recordLeadHandoff` now REFUSES this row (`member_not_in_pariwar` — code review 2026-11-22, patch 1), so a row that predates the
    // check, or one written around it, is seeded raw: P0 at send stays the backstop.
    await expect(
      withPariwarScope(pool, w.pariwarId, (_db: Db, client: pg.PoolClient) =>
        marketplace.recordLeadHandoff(client, { pariwarId: w.pariwarId, leadId, moduleId: w.moduleId, memberId: foreign.memberId, consentId, sealedFields: sealed, auditId: randomUUID() }),
      ),
    ).rejects.toMatchObject({ name: 'LeadHandoffConsentInvalidError', reason: 'member_not_in_pariwar' });
    await pool.query(
      `INSERT INTO marketplace_lead_handoffs (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, audit_id)
       VALUES ($1, $2, $3, $4, $5, 1, $6, $7)`,
      [leadId, w.pariwarId, w.moduleId, foreign.memberId, consentId, sealed, randomUUID()],
    );
    const control = await lead(await world());
    await runModuleLeadHandoffTick(deps());
    expect(await row(leadId)).toMatchObject({ status: 'due', outcome_detail: 'held:db_unavailable', attempt_count: 0 });
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('a secret of nothing but whitespace is NOT a key: held:signing_key_unavailable, ⛔ request (patch 11)', async () => {
    const w = await world('https://partner.test/ok', { secretName: 'blank-key' });
    const { leadId } = await lead(w);
    const control = await lead(await world('https://other.test/ok'));
    await runModuleLeadHandoffTick(deps({ resolveSecret: async (n) => (n === 'blank-key' ? ' \n\t' : SECRET) }));
    expect(await row(leadId)).toMatchObject({ status: 'due', outcome_detail: 'held:signing_key_unavailable', attempt_count: 0 });
    expect(sentFor(leadId)).toHaveLength(0);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  it('a secret with whitespace AROUND it is not used: held:signing_key_unavailable with its own reason, ⛔ request, the bytes ⛔ trimmed (round 2)', async () => {
    const w = await world('https://partner.test/ok', { secretName: 'echoed-key' });
    const { leadId } = await lead(w);
    const control = await lead(await world('https://other.test/ok'));
    await runModuleLeadHandoffTick(deps({ resolveSecret: async (n) => (n === 'echoed-key' ? `${SECRET}\n` : SECRET) }));
    expect(await row(leadId)).toMatchObject({ status: 'due', outcome_detail: 'held:signing_key_unavailable', attempt_count: 0 });
    expect(sentFor(leadId)).toHaveLength(0);
    expect(alarms.filter((a) => a.includes('signing_key_unavailable'))).toEqual([expect.stringContaining('the secret value has whitespace around it')]);
    expect(alarms.join('\n')).not.toContain(SECRET);
    expect(sentFor(control.leadId)).toHaveLength(1);
  });

  // ── Checklist family 2 — the claim under two workers, on two connections ──

  it('two workers: a row LOCKED by another transaction is passed over (SKIP LOCKED), and N concurrent claims of M due rows give exactly M winners', async () => {
    const w = await world();
    const first = await lead(w);
    const second = await lead(w);
    const holder = await pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT 1 FROM marketplace_lead_handoffs WHERE lead_id = $1 FOR UPDATE', [first.leadId]);
      // The head of the queue is locked by "the other worker": this claim does not wait for it, and does not take it.
      const claimed = await marketplace.claimDueLeadHandoff(pool, { claimToken: 'worker-b' });
      expect(claimed?.leadId).toBe(second.leadId);
      await holder.query('ROLLBACK');
    } finally {
      holder.release();
    }
    const third = await lead(w);
    const fourth = await lead(w);
    // Three due rows (first, third, fourth), SIX claims at once on the pool's six connections.
    const tokens = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
    const results = await Promise.all(tokens.map((claimToken) => marketplace.claimDueLeadHandoff(pool, { claimToken })));
    const winners = results.filter((r): r is NonNullable<typeof r> => r !== null);
    expect(winners.map((r) => r.leadId).sort()).toEqual([first.leadId, third.leadId, fourth.leadId].sort());
    for (const id of [first.leadId, third.leadId, fourth.leadId]) {
      const r = await row(id);
      // Exactly ONE write per row: one attempt counted, one token — the winner's.
      expect(r).toMatchObject({ status: 'attempting', attempt_count: 1 });
      expect(tokens[results.findIndex((x) => x?.leadId === id)]).toBe(r['claim_token']);
    }
    expect(await marketplace.claimDueLeadHandoff(pool, { claimToken: 'late' })).toBeNull();
  });

  // ── Decision 2026-11-22-487 (2) — the waiting pass: a stop is honoured within the tick, ⛔ at the next retry ──

  const HOUR_SCHEDULE = [3_600_000, 3_600_000, 3_600_000, 3_600_000, 3_600_000, 3_600_000];

  /** A lead that has FAILED once and is now waiting an hour for its retry (the schedule is an option), on `w`'s `/s503` endpoint. */
  async function waitingLead(w: World): Promise<{ leadId: string; consentId: string }> {
    const l = await lead(w);
    await runModuleLeadHandoffTick(deps({ retryScheduleMs: HOUR_SCHEDULE, tickBudgetMs: 0 }));
    expect(await row(l.leadId)).toMatchObject({ status: 'due', outcome_detail: 'released:http_5xx:503', attempt_count: 1 });
    expect(((await row(l.leadId))['next_attempt_at'] as Date).getTime()).toBeGreaterThan(Date.now() + 3_000_000);
    return l;
  }

  it.each<[string, string, Condition]>([
    ['the consent revoked', 'consent_revoked', revoke],
    ['the member withdrawn', 'member_withdrawn', async (w) => memberEvents(w, [{ type: 'member.withdrawal_completed' }])],
    ['the offer withdrawn by the Trust', 'module_withdrawn', async (w) => archive(w.moduleId, 'trustee_archived')],
  ])('a lead WAITING on a retry, %s ⇒ cancelled in the NEXT tick, the fields gone — ⛔ an hour later; the unstopped twin waits on', async (_label, word, condition) => {
    const stopped = await world('https://partner.test/s503');
    const l = await waitingLead(stopped);
    const twinWorld = await world('https://other.test/s503');
    const twin = await waitingLead(twinWorld);
    await condition(stopped, l);
    const dueNow = await lead(await world('https://other.test/ok'));
    received.length = 0;
    alarms.length = 0;

    const result = await runModuleLeadHandoffTick(deps());
    expect(result.cancelledWaiting).toBe(1);
    expect(await row(l.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: `cancelled:${word}`, member_fields_ciphertext: null, attempt_count: 1, claim_token: null });
    // ⛔ request, ⛔ a second decrypt line, ⛔ alarm for the cancelled lead: a cancel is not a failure.
    expect(sentFor(l.leadId)).toHaveLength(0);
    expect((await auditLines(stopped.pariwarId, l.leadId)).filter((x) => x.action === 'module.lead_handoff_fields_decrypted')).toHaveLength(1);
    expect(alarmsFor(l.leadId)).toHaveLength(0);
    // CONTROLS, same tick: the twin that nobody stopped still waits with its fields; a lead that is due now IS sent.
    expect(await row(twin.leadId)).toMatchObject({ status: 'due', outcome_detail: 'released:http_5xx:503', attempt_count: 1 });
    expect((await row(twin.leadId))['member_fields_ciphertext']).not.toBeNull();
    expect(sentFor(twin.leadId)).toHaveLength(0);
    expect(sentFor(dueNow.leadId)).toHaveLength(1);
  });

  it('the waiting pass: the member\'s word wins over a withdrawn offer, and an UNSOUND read cancels nothing', async () => {
    const w = await world('https://partner.test/s503');
    const l = await waitingLead(w);
    await revoke(w, l);
    await archive(w.moduleId, 'trustee_archived');
    // A waiting row whose member the scope read cannot see (seeded raw: the command refuses it) — the row's own attempt will hold it.
    const host = await world('https://other.test/ok');
    const foreign = await world();
    const unsoundLead = randomUUID();
    const unsoundConsent = randomUUID();
    await pool.query(
      `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload)
       VALUES ($1, $2, $3, 'module_lead_handoff', $4, 'member_self', '{}')`,
      [unsoundConsent, foreign.memberId, host.pariwarId, unsoundLead],
    );
    await pool.query(
      `INSERT INTO marketplace_lead_handoffs (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, audit_id, next_attempt_at)
       VALUES ($1, $2, $3, $4, $5, 1, 'kept', $6, now() + interval '1 hour')`,
      [unsoundLead, host.pariwarId, host.moduleId, foreign.memberId, unsoundConsent, randomUUID()],
    );
    const result = await runModuleLeadHandoffTick(deps());
    expect(result.cancelledWaiting).toBe(1);
    expect(await row(l.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:consent_revoked' });
    expect(await row(unsoundLead)).toMatchObject({ status: 'due', member_fields_ciphertext: 'kept', attempt_count: 0 });
  });

  it('the waiting pass has its own TIME budget and resumes from its cursor: budget 0 ⇒ one row a tick, each row reached once', async () => {
    const a = await world('https://partner.test/s503');
    const la = await waitingLead(a);
    const b = await world('https://other.test/s503');
    const lb = await waitingLead(b);
    await revoke(a, la);
    await revoke(b, lb);
    const cursor = { leadId: null as string | null };
    const one = await runModuleLeadHandoffTick(deps({ waitingBudgetMs: 0, waitingCursor: cursor }));
    expect(one.cancelledWaiting).toBe(1);
    const firstId = [la.leadId, lb.leadId].sort()[0]!;
    // The pass walks in `lead_id` order and stopped BEHIND the row it handled.
    expect(cursor.leadId).toBe(firstId);
    expect([(await row(la.leadId))['status'], (await row(lb.leadId))['status']].sort()).toEqual(['cancelled', 'due']);
    const two = await runModuleLeadHandoffTick(deps({ waitingBudgetMs: 0, waitingCursor: cursor }));
    expect(two.cancelledWaiting).toBe(1);
    expect([(await row(la.leadId))['status'], (await row(lb.leadId))['status']]).toEqual(['cancelled', 'cancelled']);
    // The budget ran out on the LAST row of the list: the cursor stays there, and the next pass reads an empty page, WRAPS to the top
    // and completes its cycle (round 3) — ⛔ a tick that re-checks nothing.
    expect(cursor.leadId).toBe([la.leadId, lb.leadId].sort()[1]);
    const three = await runModuleLeadHandoffTick(deps({ waitingCursor: cursor }));
    expect(three.cancelledWaiting).toBe(0);
    expect(cursor.leadId).toBeNull();
  });

  it('a THROW in the waiting pass ⇒ ONE waiting_pass_failed alarm naming the lead; the PASS ends and the claim still sends (`-488` (2)) — and a later tick reaches that row', async () => {
    const w = await world('https://partner.test/s503');
    const l = await waitingLead(w);
    await revoke(w, l);
    const dueNow = await lead(await world('https://other.test/ok'));
    alarms.length = 0;
    received.length = 0;
    const cursor = { leadId: null as string | null };
    // The fault hits the read of THIS lead's consents, once — the first read of it is the pass's.
    const broken = await runModuleLeadHandoffTick(
      deps({ pool: faultyPool(pool, (text, values) => /from "consent_records"/i.test(text) && values.includes(l.leadId), 1), waitingCursor: cursor }),
    );
    // (The injected fault reaches the sweep wrapped by the query layer, so its NAME is the wrapper's — the lead and the step are pinned.)
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toMatch(new RegExp(`module_lead_handoff\\.waiting_pass_failed:\\w+ at lead ${l.leadId} — the pass ends here, the claim still runs`));
    expect(broken).toMatchObject({ cancelledWaiting: 0, sent: 1 });
    // The claim RAN in the same tick: the lead that is due now was sent.
    expect(sentFor(dueNow.leadId)).toHaveLength(1);
    expect(await row(l.leadId)).toMatchObject({ status: 'due' });
    // The cursor moved BEFORE the read that threw; a later tick's pass comes round to the row and cancels it.
    expect(cursor.leadId).toBe(l.leadId);
    // Round 3: the NEXT tick's pass starts behind it, wraps to the top and comes round to it — one tick, ⛔ a tick later.
    const next = await runModuleLeadHandoffTick(deps({ waitingCursor: cursor }));
    expect(next.cancelledWaiting).toBe(1);
    expect(await row(l.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:consent_revoked', member_fields_ciphertext: null });
  });

  it('a lead DUE NOW that the claim does not reach this tick is re-checked too: its stop is honoured in THIS tick (`-488` (1))', async () => {
    // Two leads due now; the claim's budget is 0, so it takes ONE. Whichever it takes, the revoked one is cancelled by the pass, before
    // the claim, and is never sent — under `-487` alone a due-now row the claim did not reach waited for its turn.
    const a = await world('https://partner.test/s503');
    const kept = await lead(a);
    const b = await world('https://other.test/s503');
    const stopped = await lead(b);
    await revoke(b, stopped);
    const result = await runModuleLeadHandoffTick(deps({ tickBudgetMs: 0 }));
    expect(result.cancelledWaiting).toBe(1);
    expect(result.claimed).toBe(1);
    expect(await row(stopped.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:consent_revoked', member_fields_ciphertext: null, attempt_count: 0 });
    expect(sentFor(stopped.leadId)).toHaveLength(0);
    // CONTROL: the unstopped lead is untouched by the pass — the claim took it (one request).
    expect(sentFor(kept.leadId)).toHaveLength(1);
  });

  it('ONE cycle per pass: started from a cursor in the MIDDLE, the pass runs to the end, wraps, and stops where it began — every row in one tick (round 3)', async () => {
    const leads: Array<{ leadId: string; consentId: string; w: World }> = [];
    for (const url of ['https://partner.test/s503', 'https://other.test/s503', 'https://partner.test/s503']) {
      const w = await world(url);
      leads.push({ ...(await waitingLead(w)), w });
    }
    for (const l of leads) await revoke(l.w, l);
    const ids = leads.map((l) => l.leadId).sort();
    // Started behind the middle row: the third, then (wrapped) the first and the middle one itself.
    const cursor = { leadId: ids[1]! as string | null };
    const result = await runModuleLeadHandoffTick(deps({ waitingPage: 1, waitingCursor: cursor }));
    expect(result.cancelledWaiting).toBe(3);
    for (const l of leads) expect(await row(l.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:consent_revoked' });
    expect(cursor.leadId).toBeNull();
  });

  it('a page option of 0 still ends: the pass reads pages of one and reaches every row (round 2)', async () => {
    const a = await world('https://partner.test/s503');
    const la = await waitingLead(a);
    const b = await world('https://other.test/s503');
    const lb = await waitingLead(b);
    await revoke(a, la);
    await revoke(b, lb);
    const cursor = { leadId: null as string | null };
    const result = await runModuleLeadHandoffTick(deps({ waitingPage: 0, waitingCursor: cursor }));
    expect(result.cancelledWaiting).toBe(2);
    expect(cursor.leadId).toBeNull();
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

  // ── Story 12.5b (AC5, AC8's purge; QE5) — a `partner_form` row fails LOUDLY; W15 ──

  /**
   * A `partner_form` offer in a fresh Pariwar, its member, and a `due` handoff row for it — a row the commands AND the 0216 trigger refuse,
   * so it is PLANTED (G26, TR26): ONE committed superuser transaction under `SET LOCAL session_replication_role = 'replica'` (skips the
   * triggers and the FK checks — the parents are real), set back to `'origin'` before COMMIT. ⛔ a `pg_temp` clone (the tick's own
   * connections never see it), ⛔ a "flip" of the immutable route, ⛔ `ALTER TABLE … DISABLE TRIGGER`.
   */
  async function plantPartnerFormRow(o: { nextAttemptAtSql?: string } = {}): Promise<{ w: World; leadId: string }> {
    const pariwarId = randomUUID();
    pariwars.push(pariwarId);
    const partnerId = randomUUID();
    const moduleId = randomUUID();
    const memberId = randomUUID();
    const leadId = randomUUID();
    const consentId = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(
        `INSERT INTO marketplace_partners (partner_id, pariwar_id, display_name_en, display_name_hi, created_by_actor_id, audit_id)
         VALUES ($1, $2, $3, 'साझेदार', $4, $5)`,
        [partnerId, pariwarId, `Partner ${randomUUID()}`, randomUUID(), randomUUID()],
      );
      await c.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
      await c.query(
        `INSERT INTO marketplace_modules (module_id, pariwar_id, partner_id, name_en, name_hi, description_en, description_hi, eligibility_filter,
           scope_filter, valid_from, valid_until, slot_capacity, branding_bundle, manifest_schema_version, lead_route, partner_form_url,
           current_state, state_event_version, slots_remaining, archive_reason, audit_id)
         VALUES ($1, $2, $3, 'n', 'n', 'd', 'd', '{"version":1,"clauses":[]}', '{"version":1,"scope":"members-all"}',
                 now() - interval '1 hour', now() + interval '1 hour', NULL, '{"version":1,"logo_object_key":null,"accent_color_hex":null}', 2,
                 'partner_form', 'https://partner.test/apply?offer=twt', 'draft', 1, NULL, NULL, $4)`,
        [moduleId, pariwarId, partnerId, randomUUID()],
      );
      await c.query(`UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2 WHERE module_id = $1`, [moduleId]);
      await c.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
      await c.query(
        `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload)
         VALUES ($1, $2, $3, 'module_lead_handoff', $4, 'member_self', '{}')`,
        [consentId, memberId, pariwarId, leadId],
      );
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(
        `INSERT INTO marketplace_lead_handoffs (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext,
           audit_id, next_attempt_at) VALUES ($1, $2, $3, $4, $5, 1, 'enc:v1:planted', $6, ${o.nextAttemptAtSql ?? "now() - interval '100 years'"})`,
        [leadId, pariwarId, moduleId, memberId, consentId, randomUUID()],
      );
      await c.query("SET LOCAL session_replication_role = 'origin'");
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
    return { w: { pariwarId, partnerId, moduleId, memberId }, leadId };
  }

  /** The pool with its `pool.query` statements that `match` refused (⛔ a checked-out client's — `faultyPool` covers those). */
  function poolQueryFaulting(match: (text: string) => boolean): pg.Pool {
    return new Proxy(pool, {
      get(t, prop) {
        if (prop === 'query') {
          return (q: unknown, v?: unknown) =>
            match(String(typeof q === 'string' ? q : ((q as { text?: unknown }).text ?? '')))
              ? Promise.reject(Object.assign(new Error('injected fault'), { code: '42501' }))
              : (t.query as (...a: unknown[]) => unknown).call(t, q, v);
        }
        const value: unknown = Reflect.get(t, prop, t);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
      },
    });
  }
  /** The waiting pass's page read fails (its throw ends only the PASS — `-488` (2)), so the CLAIM is what meets the row. */
  const passOutOfTheWay = (): pg.Pool => poolQueryFaulting((text) => text.includes('AS module_withdrawn'));

  it('AC5: a due row for a partner_form offer is claimed and CANCELLED partner_form_route — the fields gone, ONE route alarm; ⛔ secret, DNS, decrypt, audit line or request', async () => {
    const { w, leadId } = await plantPartnerFormRow();
    alarms.length = 0;
    lookups.length = 0;
    const secrets: string[] = [];
    const result = await runModuleLeadHandoffTick(deps({ pool: passOutOfTheWay(), resolveSecret: async (n) => (secrets.push(n), SECRET) }));
    expect(result.claimed).toBeGreaterThanOrEqual(1);
    expect(result.cancelledWaiting).toBe(0);
    expect(await row(leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:partner_form_route', member_fields_ciphertext: null, claim_token: null });
    const routeAlarms = alarmsFor(leadId).filter((a) => a.includes('module_lead_handoff_route_refused'));
    expect(routeAlarms).toHaveLength(1);
    expect(alarmsFor(leadId)).toHaveLength(1);
    expect(sentFor(leadId)).toHaveLength(0);
    expect(secrets).toEqual([]);
    expect(lookups).toEqual([]);
    expect(await auditLines(w.pariwarId, leadId)).toEqual([]);
  });

  it('AC5: the WAITING pass cancels such a row the same way, before reading the member\'s side (a row the claim does not reach)', async () => {
    const { w, leadId } = await plantPartnerFormRow({ nextAttemptAtSql: "now() + interval '1 hour'" });
    alarms.length = 0;
    const result = await runModuleLeadHandoffTick(deps());
    expect(result.cancelledWaiting).toBeGreaterThanOrEqual(1);
    expect(await row(leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:partner_form_route', member_fields_ciphertext: null });
    expect(alarmsFor(leadId).filter((a) => a.includes('module_lead_handoff_route_refused'))).toHaveLength(1);
    expect(sentFor(leadId)).toHaveLength(0);
    expect(await auditLines(w.pariwarId, leadId)).toEqual([]);
  });

  it('AC5 / TR1: a NULL-authority row is claimed even while another authority is OPEN in the same tick', async () => {
    // The trust_sends row first (recorded first: an older next_attempt_at); its 503 opens partner.test's authority for the rest of the
    // tick. The planted row's next_attempt_at is its own plant time — later, so the claim reaches it SECOND, with that authority open.
    const w = await world('https://partner.test/s503');
    const first = await lead(w);
    const { leadId } = await plantPartnerFormRow({ nextAttemptAtSql: 'clock_timestamp()' });
    await runModuleLeadHandoffTick(deps({ pool: passOutOfTheWay(), retryScheduleMs: HOUR_SCHEDULE }));
    expect(await row(first.leadId)).toMatchObject({ status: 'due', outcome_detail: 'released:http_5xx:503' });
    expect(await row(leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:partner_form_route' });
  });

  // Review R2P10 — "the route is decided FIRST" is only proved by a row the OTHER checks would have cancelled under a different word: with a
  // healthy member and module, a regression that read the member's side first would still end `partner_form_route`.
  it.each<[string, (w: World) => Promise<void>]>([
    ['the offer is withdrawn', async (w) => archive(w.moduleId, 'trustee_archived')],
    ['the member has withdrawn', async (w) => memberEvents(w, [{ type: 'member.withdrawal_completed' }])],
  ])('R2P10: a partner_form row whose %s is STILL cancelled partner_form_route — in the claim AND in the waiting pass', async (_label, condition) => {
    const claimed = await plantPartnerFormRow();
    const waiting = await plantPartnerFormRow({ nextAttemptAtSql: "now() + interval '1 hour'" });
    await condition(claimed.w);
    await condition(waiting.w);
    alarms.length = 0;
    // The waiting pass is out of the way for the CLAIM leg (the claim is what meets `claimed`); the second tick lets the pass meet `waiting`.
    await runModuleLeadHandoffTick(deps({ pool: passOutOfTheWay() }));
    expect(await row(claimed.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:partner_form_route', member_fields_ciphertext: null });
    const result = await runModuleLeadHandoffTick(deps());
    expect(result.cancelledWaiting).toBeGreaterThanOrEqual(1);
    expect(await row(waiting.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:partner_form_route', member_fields_ciphertext: null });
    for (const l of [claimed.leadId, waiting.leadId]) {
      expect(alarmsFor(l).filter((a) => a.includes('module_lead_handoff_route_refused'))).toHaveLength(1);
      expect(sentFor(l)).toHaveLength(0);
    }
  });

  /** A visit row `ageSql` old, for `w`'s module and member (committed). */
  async function visit(w: World, ageSql: string): Promise<string> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO marketplace_partner_form_visits (visit_id, pariwar_id, module_id, member_id, opened_at) VALUES ($1, $2, $3, $4, clock_timestamp() - ${ageSql})`,
      [id, w.pariwarId, w.moduleId, w.memberId],
    );
    return id;
  }
  const visitExists = async (id: string): Promise<boolean> =>
    (await pool.query('SELECT 1 FROM marketplace_partner_form_visits WHERE visit_id = $1', [id])).rows.length === 1;

  it('W15 (AC8; QE10 (A)): a visit record MORE than 90 days old is removed, one at 89 days kept — and the same for a member whose death is reported (⛔ special rule)', async () => {
    const plain = (await plantPartnerFormRow()).w;
    const died = (await plantPartnerFormRow()).w;
    // A standing death report for `died` (the P5 seeding: an intake, then a settlement — the report stands after the freeze lifts).
    const claimId = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.claim_state_writer = 'on'");
      await c.query(`INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version) VALUES ($1, $2, $3, '{member_app}', 'intake_pending', 1)`, [
        claimId,
        died.pariwarId,
        died.memberId,
      ]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    await pool.query(`INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at) VALUES ($1, 'claim.intake_initiated', $2, 1, $3, now() - interval '2 hours')`, [
      claimId,
      JSON.stringify({ deceased_member_id: died.memberId }),
      died.pariwarId,
    ]);
    expect(await withPariwarScope(pool, died.pariwarId, (db: Db) => claim.isDeathReportStanding(db, died.pariwarId as never, died.memberId as never))).toBe(true);
    const old = [await visit(plain, "interval '90 days 1 minute'"), await visit(died, "interval '90 days 1 minute'")];
    const young = [await visit(plain, "interval '89 days'"), await visit(died, "interval '89 days'")];
    const result = await runModuleLeadHandoffTick(deps());
    expect(result.visitsPurged).toBeGreaterThanOrEqual(2);
    for (const id of old) expect(await visitExists(id)).toBe(false);
    for (const id of young) expect(await visitExists(id)).toBe(true);
  });

  it('AC5: a W15 throw ⇒ ONE visit_purge_failed alarm, and a trust_sends row due in the SAME tick is still delivered', async () => {
    const { leadId } = await lead(await world());
    alarms.length = 0;
    // W15 runs on `pool.query` (⛔ a checked-out client), so the fault is injected there; every other statement passes through.
    const result = await runModuleLeadHandoffTick(deps({ pool: poolQueryFaulting((text) => text.includes('marketplace_partner_form_visits')) }));
    expect(sentFor(leadId)).toHaveLength(1);
    expect(await row(leadId)).toMatchObject({ status: 'delivered' });
    expect(result.visitsPurged).toBe(0);
    expect(alarms.filter((a) => a.includes('visit_purge_failed'))).toHaveLength(1);
  });
});
