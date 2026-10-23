// THE NEIGHBOURS' WHATSAPP REMINDER — the sweep and the child against the live DB (Story 6.31, Task 5.4; AC2, AC3, AC5, AC7, AC9–AC11).
// Own-committing (the sweep reads COMMITTED rows across tenants), an INJECTED clock for quiet hours and the lease, the DB clock for the
// 48 / 72 hours, a capturing queue — 6.27c's `claim-peer-mesh-requests-live.test.ts` `world()`, mirrored. ⭐ The REAL WhatsApp client
// (`createWhatsappAppCache`) over an injected `fetch` (⛔ network), so the request body, the timeout and the classifier are the shipped
// ones. ⭐ ISOLATED: every test runs in a Pariwar of its OWN, and every sweep with `pariwarAllowlist` = that Pariwar. ⭐ REAL envelopes:
// the neighbours' mobiles and the deceased's KYC name are encrypted under the SAME fake-KMS deps the child decrypts with.
//   · AC5 — ONE template per due neighbour: the number without `+`, the template name for the Pariwar's language, `language.code`
//     from the fixed map, the three values (the FULL name — one that fails the SMS fit check too —, the app link, the helpline), the
//     10 s bound; the row `accepted` with the wamid and the number hash; a second tick sends ⛔ thing (I1);
//   · AC9 — every config gap of a switch-ON Pariwar HOLDS (⛔ enqueued, ⛔ row, ONE alarm); a switch-OFF Pariwar is ⛔ offered;
//   · AC3 — quiet hours (⛔ begin at night; the marker step past 20:00 ⇒ ⛔ marker, ⛔ send); a lost lease at the marker ⇒ ⛔ send;
//   · AC7 — one leg per WR10 rule through the real client: may-have-sent (⛔ resent), transient (retried by the SAME job), scope (parked,
//     the loop ENDS), recipient, unknown scope (parked, the loop CONTINUES); no sendable number; a decrypt / hash throw; an erased
//     name; the sweep's lapsed in-flight finisher and late marking; a finalise that throws after a 200 ⇒ ONE alarm with the wamid;
//   · AC11 — ⛔ alarm carries the name, a mobile, a link code or a link; ⛔ event, ⛔ claim state, ⛔ ping column, ⛔ selection outcome.

import { randomUUID } from 'node:crypto';

import { createWhatsappAppCache, WhatsappTemplateParamError, type FetchInit, type FetchLike, type WhatsappAppCache } from '@twt/channels';
import { buildAppLinkUrl } from '@twt/contracts';
import { bindScopedDb, claim, encryption, ids, member as memberDomain, questionnaires, schema } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import {
  runPeerMeshWaReminderChild,
  runPeerMeshWaReminderSweep,
  type ClaimPeerMeshWaReminderDeps,
  type PeerMeshWaReminderPayload,
} from '../src/scheduler/claim-peer-mesh-wa-reminders.js';
import { smsMemberName } from '../src/scheduler/sms-member-name.js';
import { onOwnTx } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const HELPLINE = '1800123456';
const NAME = 'Ramesh Kumar Sharma';
/** The Panel's own example (65) — the SMS would SHORTEN it (`-379` Q1 A); the reminder carries it in full (WR13). */
const LONG_NAME = 'Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer';
const ORIGIN = 'https://links.example.org';
const TEMPLATE = { hi: 'peer_mesh_reminder_hi_v1', en: 'peer_mesh_reminder_en_v1' } as const;
const enc = buildJobsEncryptionDeps('claim-peer-mesh-wa-reminder-live-pepper');
/** 11:30 IST — inside the send hours. */
const DAYTIME = new Date('2026-10-16T06:00:00.000Z');
/** 21:30 IST — outside. */
const NIGHT = new Date('2026-10-16T16:00:00.000Z');
const MIN = 60_000;
const SEND_QUEUE = 'claim.peer_mesh_wa_reminder.send';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** The LIVE version with every `'pending'` question given a (test) basis — the counsel gap closed. */
const V4 = questionnaires.resolveLiveVersion('peer_mesh', randomUUID())!;
const CLEARED: questionnaires.QuestionnaireDefinition = {
  ...V4,
  pages: V4.pages.map((pg) => ({ ...pg, questions: pg.questions.map((q) => (q.counselBasis === 'pending' ? { ...q, counselBasis: '2099-01-01-001' } : q)) })),
};

describe.skipIf(!hasDatabase)('Story 6.31 — the WhatsApp reminder (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-peer-mesh-wa-reminders-live] idle client error:', err.message));
  });
  afterAll(async () => {
    try {
      if (pariwars.length === 0) return;
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL lock_timeout = '5s'");
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    } finally {
      await pool.end();
    }
  });

  // ── the world ───────────────────────────────────────────────────────────────────────────────────────────────

  interface World {
    readonly pid: string;
    readonly claimCaseId: string;
    readonly selectionId: string;
    readonly mobiles: Map<string, string>;
    readonly pings: { pingId: string; memberId: string; linkCode: string }[];
  }

  const mobileOf = (i: number): string => `+9198765${String(20000 + i).slice(-5)}`;

  interface WorldOpts {
    locale?: 'hi' | 'en' | null;
    neighbours?: number;
    name?: string;
    hoursAgo?: number;
    /** A finer-grained age than `hoursAgo` alone can express (`make_interval`'s `hours` is an int4) — ADDED to it. */
    secondsAgo?: number;
    /** Per-neighbour ages (index ⇒ hours), overriding `hoursAgo` — an accepted ping is frozen, so it is seeded, ⛔ updated. */
    hoursAgoEach?: readonly number[];
    switchOn?: boolean;
    phoneNumberId?: string | null;
    secretName?: string | null;
    /** A neighbour's mobile PLAINTEXT override (index → value), or `'garbage'` for an undecryptable ciphertext. */
    mobileOverride?: Record<number, string>;
  }

  /**
   * A fresh Pariwar (its passport — `locale`, or ⛔ passport), the deceased (a REAL KYC name envelope), `neighbours` active members with
   * REAL mobile envelopes, each opted in to WhatsApp, a claim through the projector to `verification_in_progress`, a selection, and
   * each neighbour's ping ACCEPTED `hoursAgo` hours ago on the DB clock; the Pariwar's WhatsApp config.
   */
  async function world(o: WorldOpts = {}): Promise<World> {
    const pid = randomUUID();
    pariwars.push(pid);
    if (o.locale !== null) {
      await pool.query(
        `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
         VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, $3)`,
        [pid, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' }), o.locale ?? 'hi'],
      );
    }
    const deceased = randomUUID();
    const claimCaseId = randomUUID();
    const members = Array.from({ length: o.neighbours ?? 1 }, () => randomUUID());
    const mobiles = new Map(members.map((m, i) => [m, mobileOf(i)] as const));
    const selectionId = randomUUID();
    await onOwnTx(pool, pid, async (client) => {
      const db = bindScopedDb(client);
      const p = ids.pariwarId(pid);
      await db.insert(schema.members).values({ memberId: ids.memberId(deceased), pariwarId: p, state: 'active', stateEventVersion: 1 });
      await db.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(deceased),
        pariwarId: p,
        nameCiphertext: await encryption.encryptKycField(o.name ?? NAME, pid, enc),
        dobCiphertext: await encryption.encryptKycField('1950-01-01', pid, enc),
        verificationStrength: 'self_declared',
        source: 'manual',
      });
      for (const [i, m] of members.entries()) {
        const override = o.mobileOverride?.[i];
        const ciphertext = override === 'garbage' ? 'enc:test:undecryptable' : await encryption.encryptMobile(override ?? mobiles.get(m)!, enc);
        await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [m, pid]);
        await client.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
          m,
          pid,
          ciphertext,
          `idx-${randomUUID()}`,
        ]);
      }
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: p,
          deceasedMemberId: ids.memberId(deceased),
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: deceased, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: members, metric_id: 'm', metric_version: 1 });
      await client.query(
        `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
           metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at, source, ranked_member_ids)
         VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours', 'workplace', $5::uuid[])`,
        [selectionId, claimCaseId, pid, deceased, members],
      );
    });
    // As the superuser: the texts ACCEPTED (6.27c's record — the reminder only reads it), the opt-ins, the WhatsApp config.
    const pings: World['pings'] = [];
    for (const [idx, m] of members.entries()) {
      const pingId = randomUUID();
      const linkCode = claim.generatePeerRequestLinkCode();
      await pool.query(
        `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, source, send_outcome, attempt_count, claimed_at,
           claimed_by_job, aging_since, link_code, locale_source, send_updated_at, provider_message_id)
         VALUES ($1, $2, $3, $4, 'workplace', 'accepted', 1, now(), 'job-text', now(), $5, 'pariwar_default',
                 clock_timestamp() - make_interval(hours => $6, secs => $7), 'gw-1')`,
        [pingId, selectionId, pid, m, linkCode, o.hoursAgoEach?.[idx] ?? o.hoursAgo ?? 49, o.secondsAgo ?? 0],
      );
      pings.push({ pingId, memberId: m, linkCode });
      const consentId = randomUUID();
      await pool.query(
        `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_via_actor, consent_payload)
         VALUES ($1, $2, $3, 'whatsapp_opt_in', 'member_self', '{}'::jsonb)`,
        [consentId, m, pid],
      );
      await pool.query(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id, matched_at)
         VALUES ($1, $2, 'ACTIVE', $3, $4, clock_timestamp() + interval '20 hours', $5, clock_timestamp())`,
        [pid, m, `TWT-${randomUUID().slice(0, 8)}`, `blind-${randomUUID()}`, consentId],
      );
    }
    await pool.query(
      `INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name) VALUES ($1, $2, $3, $4)`,
      [pid, o.switchOn ?? true, o.phoneNumberId === undefined ? '1234567890' : o.phoneNumberId, o.secretName === undefined ? 'wa.token.test' : o.secretName],
    );
    return { pid, claimCaseId, selectionId, mobiles, pings };
  }

  // ── the harness ─────────────────────────────────────────────────────────────────────────────────────────────

  interface Sent {
    readonly url: string;
    readonly body: { to: string; template: { name: string; language: { code: string }; components: { parameters: { text: string }[] }[] } };
    readonly signal: boolean;
    readonly authorization: string;
  }

  type Responder = (n: number) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
  const ok = (wamid = `wamid.${randomUUID()}`): Responder => () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ messages: [{ id: wamid }] }) });
  const metaError = (status: number, code: number | null): Responder => () =>
    Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(code === null ? {} : { error: { code, message: 'x' } }) });

  interface Harness {
    deps: ClaimPeerMeshWaReminderDeps;
    enqueued: { queue: string; data: JobEnvelope<PeerMeshWaReminderPayload>; options: Record<string, unknown> }[];
    sent: Sent[];
    alarms: string[];
    setNow: (d: Date | (() => Date)) => void;
  }

  interface HarnessOpts {
    registry?: readonly questionnaires.QuestionnaireDefinition[];
    appLinksBaseUrl?: string;
    /** Config key → value overrides (`null` ⇒ unset). */
    config?: Record<string, string | null>;
    /** A config key PREFIX whose read THROWS. */
    throwOn?: string;
    /** The access-token read throws. */
    secretThrows?: boolean;
    /** The Meta response, per send (default: 200 + a fresh wamid). */
    respond?: Responder;
    /** Replace the WhatsApp cache entirely (a handle that throws a foreign error, …). */
    cache?: WhatsappAppCache;
    /** Replace the KMS deps (a hash fault). */
    encryption?: ClaimPeerMeshWaReminderDeps['encryption'];
    /** Replace the pool (a finalise fault). */
    pool?: pg.Pool;
  }

  function harness(w: { pid: string }, o: HarnessOpts = {}): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: Sent[] = [];
    const alarms: string[] = [];
    let now: () => Date = () => DAYTIME;
    const fetchImpl: FetchLike = (url, init: FetchInit) => {
      sent.push({ url, body: JSON.parse(init.body) as Sent['body'], signal: init.signal instanceof AbortSignal, authorization: init.headers['Authorization']! });
      return (o.respond ?? ok())(sent.length);
    };
    const deps: ClaimPeerMeshWaReminderDeps = {
      pool: o.pool ?? pool,
      encryption: o.encryption ?? enc,
      whatsappAppCache: o.cache ?? createWhatsappAppCache(fetchImpl),
      resolveSecret: async () => {
        if (o.secretThrows) throw Object.assign(new Error('secret manager down'), { code: 14 });
        return 'sys-user-token';
      },
      resolveConfig: async (key) => {
        if (o.throwOn !== undefined && key.startsWith(o.throwOn)) throw Object.assign(new Error('secret manager down'), { code: 3 });
        if (o.config && key in o.config) return o.config[key]!;
        if (key.startsWith('wa.template.peer_mesh.reminder.hi.')) return TEMPLATE.hi;
        if (key.startsWith('wa.template.peer_mesh.reminder.en.')) return TEMPLATE.en;
        if (key.startsWith('sms.claim_correction.helpline_number.')) return HELPLINE;
        return null;
      },
      appLinksBaseUrl: o.appLinksBaseUrl ?? ORIGIN,
      questionnaireRegistry: o.registry ?? [CLEARED],
      now: () => now(),
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [w.pid],
    };
    return { deps, enqueued, sent, alarms, setNow: (d) => (now = typeof d === 'function' ? d : () => d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object, options: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<PeerMeshWaReminderPayload>, options: options as Record<string, unknown> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runPeerMeshWaReminderSweep>[1];
  /** `dueAsOf` — the REAL instant the sweep found it due (round-2 P1); the harness clock is a fixed past day, so omit it ⇒ lenient. */
  const envelopeOf = (w: World, dueAsOf?: Date): JobEnvelope<PeerMeshWaReminderPayload> => ({
    pariwarId: w.pid,
    requestId: randomUUID(),
    actorId: null,
    traceId: randomUUID(),
    payload: { claimCaseId: w.claimCaseId, ...(dueAsOf !== undefined ? { dueAsOf: dueAsOf.toISOString() } : {}) },
  });
  const child = (h: Harness, w: World, jobId: string = randomUUID(), dueAsOf?: Date) =>
    runPeerMeshWaReminderChild(h.deps, boss(h), envelopeOf(w, dueAsOf), jobId);
  /** The DB clock — `dueAsOf` is a DB-clock instant (round-2 P1: ⛔ a host stamp compared to the DB clock). */
  const dbNow = async (): Promise<Date> => (await pool.query<{ t: Date }>('SELECT clock_timestamp() AS t')).rows[0]!.t;
  /** Sweep, then run every enqueued child of OUR claim (each a fresh job). */
  async function tick(h: Harness, w: World) {
    h.enqueued.length = 0;
    const swept = await runPeerMeshWaReminderSweep(h.deps, boss(h));
    const out = [];
    for (const e of h.enqueued.filter((x) => x.queue === SEND_QUEUE && x.data.payload.claimCaseId === w.claimCaseId)) {
      out.push(await runPeerMeshWaReminderChild(h.deps, boss(h), e.data, randomUUID()));
    }
    return { swept, out };
  }
  interface ReminderRow {
    ping_id: string;
    send_outcome: string;
    detail: string | null;
    first_detail: string | null;
    attempt_count: number;
    provider_message_id: string | null;
    recipient_number_hash: string | null;
    template_name: string | null;
    locale: string | null;
    claimed_by_job: string | null;
    send_started_at: Date | null;
  }
  async function reminders(w: World): Promise<ReminderRow[]> {
    const { rows } = await pool.query<ReminderRow>(`SELECT * FROM claim_peer_mesh_wa_reminders WHERE pariwar_id = $1 ORDER BY ping_id`, [w.pid]);
    return rows;
  }
  /** FIXTURE ONLY, as the superuser: a reminder row in a given state. */
  async function insertReminder(w: World, i: number, over: Record<string, unknown>): Promise<void> {
    const v: Record<string, unknown> = {
      ping_id: w.pings[i]!.pingId,
      pariwar_id: w.pid,
      claim_case_id: w.claimCaseId,
      selection_id: w.selectionId,
      member_id: w.pings[i]!.memberId,
      send_outcome: 'attempting',
      claimed_at: DAYTIME,
      claimed_by_job: 'job-old',
      aging_since: DAYTIME,
      ...over,
    };
    const cols = Object.keys(v);
    await pool.query(`INSERT INTO claim_peer_mesh_wa_reminders (${cols.join(', ')}) VALUES (${cols.map((_, k) => `$${k + 1}`).join(', ')})`, Object.values(v));
  }
  /** A snapshot of everything the reminder must ⛔ move (I8): the claim's events and state, its pings, its selection. */
  async function untouched(w: World): Promise<string> {
    const { rows } = await pool.query<{ s: string }>(
      `SELECT json_build_object(
         'events', (SELECT count(*) FROM events_log WHERE stream_id = $1::uuid),
         'state', (SELECT current_state FROM claims WHERE claim_case_id = $1::uuid),
         'pings', (SELECT json_agg(to_jsonb(p) ORDER BY p.ping_id) FROM claim_peer_mesh_pings p WHERE p.selection_id = $2::uuid),
         'selection', (SELECT to_jsonb(s) FROM claim_peer_mesh_selections s WHERE s.selection_id = $2::uuid))::text AS s`,
      [w.claimCaseId, w.selectionId],
    );
    return rows[0]!.s;
  }
  /** ⛔ alarm names the deceased, a number, a link code or the link (I7, T11). */
  function expectIdsOnly(h: Harness, w: World): void {
    for (const a of h.alarms) {
      expect(a).not.toContain('Ramesh');
      expect(a.replace(UUID_RE, '<id>')).not.toMatch(/\+?91\d{10}|\d{10}/);
      for (const p of w.pings) expect(a).not.toContain(p.linkCode);
      expect(a).not.toContain(ORIGIN);
    }
  }

  // ── AC5 — the reminder ──────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC5 — ONE template per due neighbour: the number without "+", the Hindi template, the three values, the 10 s bound; accepted; ⛔ again', async () => {
    const w = await world({ neighbours: 2 });
    const before = await untouched(w);
    const h = harness(w);
    const { swept, out } = await tick(h, w);
    expect(swept).toMatchObject({ enqueued: 1, heldForConfig: 0, refused: false });
    expect(out).toEqual([{ status: 'done', counts: expect.objectContaining({ accepted: 2 }) }]);
    expect(h.sent).toHaveLength(2);
    for (const [i, p] of w.pings.entries()) {
      const s = h.sent.find((x) => x.body.to === w.mobiles.get(p.memberId)!.slice(1))!;
      expect(s, `neighbour ${String(i)}`).toBeDefined();
      expect(s.url).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
      expect(s.authorization).toBe('Bearer sys-user-token');
      expect(s.signal).toBe(true);
      expect(s.body.template.name).toBe(TEMPLATE.hi);
      expect(s.body.template.language).toEqual({ code: 'hi' });
      expect(s.body.template.components[0]!.parameters.map((x) => x.text)).toEqual([NAME, buildAppLinkUrl(ORIGIN, 'peerRequest', p.linkCode), HELPLINE]);
    }
    const rows = await reminders(w);
    expect(rows.map((r) => r.send_outcome)).toEqual(['accepted', 'accepted']);
    for (const r of rows) {
      expect(r.provider_message_id).toMatch(/^wamid\./);
      expect(r.recipient_number_hash).not.toBeNull();
      expect(r).toMatchObject({ template_name: TEMPLATE.hi, locale: 'hi', attempt_count: 1 });
    }
    // I1 — a second tick sends ⛔ thing.
    const again = await tick(h, w);
    expect(again.swept.enqueued).toBe(0);
    expect(h.sent).toHaveLength(2);
    expect(await untouched(w)).toBe(before);
    expectIdsOnly(h, w);
  });

  it('WR13 / §0 edge (ii) — a name the SMS would SHORTEN is sent IN FULL; an English Pariwar gets the English template', async () => {
    expect(smsMemberName(LONG_NAME).kind).toBe('shortened'); // the premise — re-fixtured by Story 6.37e's rework (60, ⛔ 40)
    const w = await world({ name: LONG_NAME, locale: 'en' });
    const h = harness(w);
    await tick(h, w);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.body.template).toMatchObject({ name: TEMPLATE.en, language: { code: 'en' } });
    expect(h.sent[0]!.body.template.components[0]!.parameters[0]!.text).toBe(LONG_NAME);
    // AC6 (rework review R2) — the name, its SMS-shortened form and each box only in the message: ⛔ a payload, an alarm or a row.
    const out = smsMemberName(LONG_NAME);
    if (out.kind === 'too_long') throw new Error('fixture does not fit');
    const blob = JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, rows: await reminders(w) });
    for (const token of ['Subrahmanyam', LONG_NAME, out.name, ...out.boxes]) expect(blob).not.toContain(token);
    expectIdsOnly(h, w);
  });

  // ── AC9 — the holds ─────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC9 — every config gap of a switch-ON Pariwar HOLDS: ⛔ enqueued, ⛔ row, ONE alarm naming the gap; the child holds too', async () => {
    const throwingClient: WhatsappAppCache = {
      messagingFor: () => {
        throw new Error('whatsapp-app: graph_api_version is missing/blank');
      },
    };
    const legs: { gap: string; world?: WorldOpts; opts?: HarnessOpts; configOf?: (w: World) => Record<string, string | null> }[] = [
      { gap: 'config:wa_config_incomplete', world: { secretName: '' } },
      { gap: 'config:wa_config_incomplete', world: { phoneNumberId: null } },
      // Round-2 P17 — the gaps that had ⛔ leg: the client's own config throw, a template name outside 0171's form, the helpline read.
      { gap: 'config:wa_config_incomplete', opts: { cache: throwingClient } },
      // 📌 2026-10-23 (Story 6.35, LS10 (b′)) — ONE locale's name unusable no longer holds the Pariwar (a chooser falls back, a
      // non-chooser waits — the 6.35 legs below); BOTH unusable holds it on the DEFAULT locale's gap, as before.
      {
        gap: 'config:wa_template_invalid:hi',
        configOf: (w) => ({
          [`wa.template.peer_mesh.reminder.hi.${w.pid}`]: 'Peer-Mesh.Reminder',
          [`wa.template.peer_mesh.reminder.en.${w.pid}`]: 'Peer-Mesh.Reminder',
        }),
      },
      { gap: 'config:helpline_unreadable', opts: { throwOn: 'sms.claim_correction.helpline_number.' } },
      { gap: 'config:wa_secret_unresolved', opts: { secretThrows: true } },
      { gap: 'config:wa_template_missing:hi', opts: { config: {} } },
      { gap: 'config:wa_template_unreadable', opts: { throwOn: 'wa.template.' } },
      { gap: 'config:app_links_base_url_invalid', opts: { appLinksBaseUrl: 'http://insecure.example' } },
      { gap: 'config:helpline_number_missing', opts: { config: {} } },
      { gap: 'config:questionnaire_unavailable', opts: { registry: [] } },
      { gap: 'config:counsel_basis_pending', opts: { registry: [V4] } },
      { gap: 'config:locale_unavailable', world: { locale: null } },
    ];
    for (const leg of legs) {
      const w = await world(leg.world);
      const config =
        leg.configOf?.(w) ??
        (leg.gap === 'config:wa_template_missing:hi'
          ? { [`wa.template.peer_mesh.reminder.hi.${w.pid}`]: null, [`wa.template.peer_mesh.reminder.en.${w.pid}`]: null } // 📌 6.35 — both
          : leg.gap === 'config:helpline_number_missing'
            ? { [`sms.claim_correction.helpline_number.${w.pid}`]: null }
            : undefined);
      const h = harness(w, { ...leg.opts, ...(config ? { config } : {}) });
      const { swept } = await tick(h, w);
      expect(swept, leg.gap).toMatchObject({ enqueued: 0, heldForConfig: 1 });
      expect(h.alarms.filter((a) => a.includes(leg.gap) && a.includes(w.claimCaseId)), leg.gap).toHaveLength(1);
      expect(await child(h, w), leg.gap).toEqual({ status: 'held_config', reason: leg.gap });
      expect(await reminders(w), leg.gap).toEqual([]);
      expect(h.sent, leg.gap).toHaveLength(0);
      expectIdsOnly(h, w);
    }
  });

  // ── 📌 Story 6.35 AC5 — the reminder per RECIPIENT, `-385`'s fallback, the wait (LS9, LS10 (b′)) ─────────────────────────────

  const choose = (memberId: string, locale: 'hi' | 'en') =>
    pool.query(`UPDATE members SET preferred_locale = $2, preferred_locale_set_at = now() WHERE member_id = $1`, [memberId, locale]);
  const reminderOf = async (w: World, i: number) =>
    (
      await pool.query<{ send_outcome: string; locale: string | null; locale_source: string | null; template_name: string | null }>(
        `SELECT send_outcome, locale, locale_source, template_name FROM claim_peer_mesh_wa_reminders WHERE ping_id = $1`,
        [w.pings[i]!.pingId],
      )
    ).rows[0];
  const sentTo = (h: Harness, w: World, i: number) => {
    const to = w.mobiles.get(w.pings[i]!.memberId)!.replace(/^\+/, '');
    return h.sent.find((m) => m.body.to === to)?.body.template;
  };

  it('⭐ 6.35 AC5 — an English-chooser gets the `en` template (`member_choice`); a non-chooser the Pariwar\'s — and a choice made AFTER the text counts (WR14)', async () => {
    const w = await world({ neighbours: 2 });
    // the texts went (seeded accepted) in Hindi; the member chose English since — the reminder reads it AGAIN, ⛔ copied from the ping
    await choose(w.pings[0]!.memberId, 'en');
    const h = harness(w);
    await tick(h, w);
    expect(await reminderOf(w, 0)).toMatchObject({ send_outcome: 'accepted', locale: 'en', locale_source: 'member_choice', template_name: TEMPLATE.en });
    expect(await reminderOf(w, 1)).toMatchObject({ send_outcome: 'accepted', locale: 'hi', locale_source: 'pariwar_default', template_name: TEMPLATE.hi });
    expect(sentTo(h, w, 0)).toMatchObject({ name: TEMPLATE.en, language: { code: 'en' } });
    expect(sentTo(h, w, 1)).toMatchObject({ name: TEMPLATE.hi });
  });

  it.each([
    ['unset (or Meta refuses — the same state)', (pid: string) => ({ config: { [`wa.template.peer_mesh.reminder.en.${pid}`]: null } }), 'config:wa_template_missing:en'],
    ['invalid', (pid: string) => ({ config: { [`wa.template.peer_mesh.reminder.en.${pid}`]: 'Not A Name' } }), 'config:wa_template_invalid:en'],
    ['unreadable (the OTHER locale\'s key — "Treat it as unset")', () => ({ throwOn: 'wa.template.peer_mesh.reminder.en.' }), 'config:wa_template_unreadable'],
  ] as const)('⭐ 6.35 AC5 / `-385` — the `en` template %s in a Hindi Pariwar: the English-chooser\'s reminder goes with the `hi` template (`pariwar_fallback`)', async (_l, optsOf, code) => {
    const w = await world({ neighbours: 2 });
    await choose(w.pings[0]!.memberId, 'en');
    const h = harness(w, optsOf(w.pid) as HarnessOpts);
    const { swept, out } = await tick(h, w);
    expect(swept).toMatchObject({ enqueued: 1, heldForConfig: 0, fallbackToPariwar: 1, waitingForTemplate: 0 });
    expect(out).toEqual([expect.objectContaining({ status: 'done', counts: expect.objectContaining({ accepted: 2, fallback: 1 }) })]);
    expect(await reminderOf(w, 0)).toMatchObject({ send_outcome: 'accepted', locale: 'hi', locale_source: 'pariwar_fallback', template_name: TEMPLATE.hi });
    expect(sentTo(h, w, 0)).toMatchObject({ name: TEMPLATE.hi, language: { code: 'hi' } });
    expect(h.alarms.filter((a) => a.includes(`en — ${code} — sent in hi — 1 in the Pariwar's language`) && a.includes(w.pid))).toHaveLength(1);
    expectIdsOnly(h, w);
  });

  it('⭐ 6.35 AC5 — the Pariwar\'s OWN (`hi`) template unset, `en` usable: the English-chooser is sent in `en`; the non-chooser WAITS (⛔ enqueued, ⛔ row) while the sibling still goes', async () => {
    const w = await world({ neighbours: 2 });
    // the WAITING one sorts FIRST in the keyset — it must ⛔ mark the claim seen, or the sendable sibling is skipped
    const [first, second] = [...w.pings.keys()].sort((a, b) => w.pings[a]!.pingId.localeCompare(w.pings[b]!.pingId));
    await choose(w.pings[second!]!.memberId, 'en');
    const h = harness(w, { config: { [`wa.template.peer_mesh.reminder.hi.${w.pid}`]: null } });
    const { swept } = await tick(h, w);
    expect(swept).toMatchObject({ enqueued: 1, heldForConfig: 0, waitingForTemplate: 1 });
    expect(await reminderOf(w, second!)).toMatchObject({ send_outcome: 'accepted', locale: 'en', locale_source: 'member_choice' });
    expect(await reminderOf(w, first!)).toBeUndefined();
    expect(h.alarms.filter((a) => a.includes('hi — config:wa_template_missing:hi — 1 waiting'))).toHaveLength(1);
    // the child also meets the waiting one (its own read lists it) ⇒ `waiting`, ⛔ row
    const again = await child(h, w);
    expect(again).toMatchObject({ status: 'done', counts: expect.objectContaining({ waiting: 1 }) });
    expect(await reminderOf(w, first!)).toBeUndefined();
  });

  it('6.35 AC5 — a waiting reminder past `+ 72 h` is ⛔ due any more: ⛔ row, ⛔ sent', async () => {
    const w = await world({ neighbours: 1, hoursAgo: 73 });
    const h = harness(w, { config: { [`wa.template.peer_mesh.reminder.hi.${w.pid}`]: null } });
    expect((await tick(h, w)).swept).toMatchObject({ enqueued: 0 });
    expect(await reminders(w)).toEqual([]);
    expect(h.sent).toHaveLength(0);
  });

  it('AC10 — a HELD claim is due again once its config gap closes (⛔ only the switch): the next tick sends it', async () => {
    const w = await world();
    const held = harness(w, { config: { [`sms.claim_correction.helpline_number.${w.pid}`]: null } });
    expect((await tick(held, w)).swept).toMatchObject({ enqueued: 0, heldForConfig: 1 });
    expect(await reminders(w)).toEqual([]);
    const fixed = harness(w);
    expect((await tick(fixed, w)).swept).toMatchObject({ enqueued: 1, heldForConfig: 0 });
    expect(fixed.sent).toHaveLength(1);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'accepted', attempt_count: 1 });
  });

  it('⭐ R6 — several HELD Pariwars in ONE tick get their OWN alarm, each naming only its OWN Pariwar and gap — ⛔ one merged alarm', async () => {
    const a = await world({ secretName: '' }); // config:wa_config_incomplete
    const b = await world({ locale: null }); // config:locale_unavailable
    const h = harness(a);
    h.deps = { ...h.deps, pariwarAllowlist: [a.pid, b.pid] };
    const swept = await runPeerMeshWaReminderSweep(h.deps, boss(h));
    expect(swept).toMatchObject({ heldForConfig: 2, enqueued: 0 });
    const heldAlarms = h.alarms.filter((al) => al.includes('WhatsApp reminders HELD'));
    expect(heldAlarms).toHaveLength(2); // ⛔ ONE merged alarm for both Pariwars
    const forA = heldAlarms.find((al) => al.includes(a.pid))!;
    const forB = heldAlarms.find((al) => al.includes(b.pid))!;
    expect(forA, 'an alarm naming Pariwar A').toBeDefined();
    expect(forB, 'an alarm naming Pariwar B').toBeDefined();
    expect(forA).toContain('config:wa_config_incomplete');
    expect(forA).not.toContain(b.pid);
    expect(forA).not.toContain('config:locale_unavailable');
    expect(forB).toContain('config:locale_unavailable');
    expect(forB).not.toContain(a.pid);
    expect(forB).not.toContain('config:wa_config_incomplete');
  });

  it('⭐ R4 — a bounded tick\'s resume cursor reaches the claim a persistently-due one would otherwise crowd out, next tick', async () => {
    const a = await world();
    const b = await world();
    const [first, second] = a.claimCaseId < b.claimCaseId ? [a, b] : [b, a];
    const h = harness(first);
    h.deps = { ...h.deps, pariwarAllowlist: [first.pid, second.pid], maxRuns: 1 };

    const tick1 = await runPeerMeshWaReminderSweep(h.deps, boss(h));
    expect(tick1).toMatchObject({ enqueued: 1, budgetExhausted: false });
    expect(h.enqueued.map((e) => e.data.payload.claimCaseId)).toEqual([first.claimCaseId]);
    expect(tick1.resumeCursor).not.toBeNull();

    h.enqueued.length = 0;
    const tick2 = await runPeerMeshWaReminderSweep(h.deps, boss(h), tick1.resumeCursor);
    expect(tick2.enqueued).toBe(1);
    expect(h.enqueued.map((e) => e.data.payload.claimCaseId)).toEqual([second.claimCaseId]); // ⛔ `first` again — fairness

    // WITHOUT the cursor (the OLD behaviour — restarting at the top) `first` wins AGAIN, proving the fix matters.
    h.enqueued.length = 0;
    await runPeerMeshWaReminderSweep(h.deps, boss(h), null);
    expect(h.enqueued.map((e) => e.data.payload.claimCaseId)).toEqual([first.claimCaseId]);
  });

  it('a switch-OFF Pariwar is ⛔ offered at all — ⛔ enqueued, ⛔ row, ⛔ alarm; turned ON, its due ping goes', async () => {
    const w = await world({ switchOn: false });
    const h = harness(w);
    const { swept } = await tick(h, w);
    expect(swept).toMatchObject({ enqueued: 0, heldForConfig: 0 });
    expect(h.alarms).toEqual([]);
    expect(await child(h, w)).toEqual({ status: 'noop', reason: 'switch_off' });
    expect(await reminders(w)).toEqual([]);
    await pool.query(`UPDATE pariwar_wa_config SET enabled = true WHERE pariwar_id = $1`, [w.pid]);
    await tick(h, w);
    expect(h.sent).toHaveLength(1);
  });

  it('F21 / WR12 — an RLS-bound role (the guard false) ⇒ ONE alarm, the tick ends: ⛔ listed, ⛔ finished, ⛔ row', async () => {
    const w = await world();
    await insertReminder(w, 0, { claimed_at: new Date(DAYTIME.getTime() - 11 * MIN), send_started_at: new Date(DAYTIME.getTime() - 11 * MIN) });
    const rlsBound = new Proxy(pool, {
      get(target, key) {
        if (key === 'query') {
          return (text: unknown, ...rest: unknown[]) =>
            typeof text === 'string' && text.includes('rolbypassrls')
              ? Promise.resolve({ rows: [{ ok: false }], rowCount: 1 })
              : (target.query as (...a: unknown[]) => unknown).call(target, text, ...rest);
        }
        const v = Reflect.get(target, key) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
    const h = harness(w, { pool: rlsBound });
    const { swept } = await tick(h, w);
    expect(swept).toMatchObject({ refused: true, enqueued: 0, finishedLapsed: 0, markedLate: 0 });
    expect(h.alarms.filter((a) => a.includes('cannot read across Pariwars'))).toHaveLength(1);
    expect(h.alarms).toHaveLength(1);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'attempting' });
  });

  it('⛔ due before 48 h or at 72 h: ⛔ enqueued, ⛔ row (a text that was ⛔ accepted: the domain spec\'s non-accepted legs)', async () => {
    for (const hoursAgo of [47, 72]) {
      const w = await world({ hoursAgo });
      const h = harness(w);
      expect((await tick(h, w)).swept.enqueued, String(hoursAgo)).toBe(0);
      expect(await reminders(w)).toEqual([]);
    }
  });

  // ── AC3 — quiet hours, the lease ────────────────────────────────────────────────────────────────────────────

  it('AC3 — at night ⛔ begin: re-enqueued for 09:00 IST; a marker step past 20:00 ⇒ ⛔ marker, ⛔ send, deferred', async () => {
    const w = await world();
    const h = harness(w);
    h.setNow(NIGHT);
    const night = await child(h, w);
    expect(night).toMatchObject({ status: 'deferred_quiet_hours', startAfter: new Date('2026-10-17T03:30:00.000Z') });
    expect(h.enqueued.filter((e) => e.queue === SEND_QUEUE)).toHaveLength(1);
    expect(await reminders(w)).toEqual([]);
    // 19:59:30 at the begin, 20:00:30 at the marker.
    const calls = [new Date('2026-10-16T14:29:30.000Z'), new Date('2026-10-16T14:29:30.000Z')];
    h.setNow(() => calls.shift() ?? new Date('2026-10-16T14:30:30.000Z'));
    expect((await child(h, w)).status).toBe('deferred_quiet_hours');
    expect(h.sent).toHaveLength(0);
    const [r] = await reminders(w);
    expect(r).toMatchObject({ send_outcome: 'attempting', send_started_at: null });
  });

  it('AC3 — a lease lost before the marker (the clock past lease − margin) ⇒ ⛔ marker, ZERO sends, the SAME job retries', async () => {
    const w = await world();
    const h = harness(w);
    const calls = [DAYTIME, DAYTIME];
    h.setNow(() => calls.shift() ?? new Date(DAYTIME.getTime() + 9 * MIN));
    await expect(child(h, w)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(h.sent).toHaveLength(0);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'attempting', send_started_at: null });
    expect(h.alarms.some((a) => a.includes('lease lapsed'))).toBe(true);
  });

  it('⭐ R2 — quiet hours arriving DURING the marker\'s own commit (after it is sampled) ⇒ the marker is RELEASED, ⛔ sent, deferred', async () => {
    const w = await world();
    const h = harness(w);
    // now / beginAt / markAt all still inside the window (19:59:30 IST) — the EXISTING pre-marker check passes; the clock the
    // code reads AFTER the marker's own commit (R2's new recheck) falls back to past 20:00 IST.
    const calls = [new Date('2026-10-16T14:29:30.000Z'), new Date('2026-10-16T14:29:30.000Z'), new Date('2026-10-16T14:29:30.000Z')];
    h.setNow(() => calls.shift() ?? new Date('2026-10-16T14:30:30.000Z'));
    const jobId = randomUUID();
    const result = await child(h, w, jobId);
    expect(result).toMatchObject({ status: 'deferred_quiet_hours' });
    expect(h.sent).toHaveLength(0); // Meta was ⛔ called
    const [r] = await reminders(w);
    expect(r).toMatchObject({ send_outcome: 'attempting', send_started_at: null }); // RELEASED, ⛔ left in flight
    // Round-2 P15 — the PRODUCTION path: the deferral enqueued a NEW job for the next morning; that job (a fresh id, its clock past
    // the lease) re-claims the released row and sends normally — the row was ⛔ stranded.
    const deferral = h.enqueued.filter((e) => e.queue === SEND_QUEUE);
    expect(deferral).toHaveLength(1);
    const h2 = harness(w);
    h2.setNow(new Date('2026-10-17T04:00:00.000Z')); // 09:30 IST the next morning — past the 10-minute lease
    const morning = await runPeerMeshWaReminderChild(h2.deps, boss(h2), deferral[0]!.data, randomUUID());
    expect(morning).toMatchObject({ status: 'done', counts: expect.objectContaining({ accepted: 1 }) });
    expect(h2.sent).toHaveLength(1);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'accepted', attempt_count: 2 });
  });

  it(
    '⭐ R5 — a child deferred at night BEFORE its first begin still closes a ping that crosses + 72 h while deferred (skipped_late, ⛔ zero rows left behind)',
    async () => {
      // 6 seconds of margin left on the 72-hour bound at seed time (round-2 P14).
      const w = await world({ hoursAgo: 71, secondsAgo: 59 * 60 + 54 });
      const h = harness(w);
      h.setNow(NIGHT); // outside 09:00-20:00 ⇒ the TOP-level check defers BEFORE any row is touched (⛔ a begin yet)
      const dueAsOf = await dbNow(); // the sweep's page listed it due NOW (DB clock — round-2 P1)
      const deferred = await child(h, w, randomUUID(), dueAsOf);
      expect(deferred).toMatchObject({ status: 'deferred_quiet_hours' });
      expect(await reminders(w)).toEqual([]); // R5's gap, before the fix: ⛔ row — the deadline is about to pass unrecorded
      await new Promise((resolve) => setTimeout(resolve, 7_000)); // the deadline passes while deferred overnight
      h.setNow(DAYTIME); // the deferred child wakes up the next morning — THE ENVELOPE ITS DEFERRAL ENQUEUED (its `dueAsOf` kept)
      const [again] = h.enqueued.filter((e) => e.queue === SEND_QUEUE);
      expect(again!.data.payload.dueAsOf, 'the deferral keeps the ORIGINAL dueAsOf').toBe(dueAsOf.toISOString());
      const woke = await runPeerMeshWaReminderChild(h.deps, boss(h), again!.data, randomUUID());
      expect(woke).toMatchObject({ status: 'done' });
      expect(h.sent).toHaveLength(0);
      expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'skipped_late', send_started_at: null });
    },
    20_000,
  );

  it('⭐ round-2 P1 — a sibling ping already PAST its window when the sweep found the claim due gets ⛔ row (WR5); the due one goes', async () => {
    const w = await world({ neighbours: 2, hoursAgoEach: [49, 80] });
    const h = harness(w);
    // Through the SWEEP: its page stamps `dueAsOf` from the DB clock, and the child it enqueued leaves the sibling out.
    const { out } = await tick(h, w);
    expect(h.enqueued.filter((e) => e.queue === SEND_QUEUE).map((e) => typeof e.data.payload.dueAsOf)).toEqual(['string']);
    expect(out).toEqual([expect.objectContaining({ status: 'done', counts: expect.objectContaining({ accepted: 1, skipped: 0 }) })]);
    expect((await reminders(w)).map((r) => r.ping_id)).toEqual([w.pings[0]!.pingId]);
    expect(h.sent).toHaveLength(1);
  });

  it('⭐ round-2 P1 — THROUGH A DEFERRAL: the morning child keeps the sweep\'s `dueAsOf`, so the never-due sibling still gets ⛔ row', async () => {
    const w = await world({ neighbours: 2, hoursAgoEach: [49, 80] });
    const h = harness(w);
    h.setNow(NIGHT);
    expect(await child(h, w, randomUUID(), await dbNow())).toMatchObject({ status: 'deferred_quiet_hours' });
    const [again] = h.enqueued.filter((e) => e.queue === SEND_QUEUE);
    h.setNow(DAYTIME); // a dropped `dueAsOf` would fall back to this fixed PAST day — lenient — and list the sibling
    expect(await runPeerMeshWaReminderChild(h.deps, boss(h), again!.data, randomUUID())).toMatchObject({ status: 'done', counts: expect.objectContaining({ accepted: 1, skipped: 0 }) });
    expect((await reminders(w)).map((r) => r.ping_id)).toEqual([w.pings[0]!.pingId]);
  });

  it(
    '⭐ round-2 P4 — the marker\'s OWN 72-hour recheck finalising skipped_late is a FINISHED ping: counted skipped, ⛔ a transient throw',
    async () => {
      const w = await world({ hoursAgo: 71, secondsAgo: 59 * 60 + 54 });
      // A slow HMAC (after the begin, before the marker) carries the ping past its bound.
      const slowHmac = {
        ...enc,
        kms: {
          encryptDek: enc.kms.encryptDek.bind(enc.kms),
          decryptDek: enc.kms.decryptDek.bind(enc.kms),
          computeHmac: async (...a: Parameters<typeof enc.kms.computeHmac>) => {
            await new Promise((resolve) => setTimeout(resolve, 7_000));
            return enc.kms.computeHmac(...a);
          },
        },
      };
      const h = harness(w, { encryption: slowHmac as never });
      expect(await child(h, w)).toMatchObject({ status: 'done', counts: expect.objectContaining({ skipped: 1, transient: 0 }) });
      expect(h.sent).toHaveLength(0);
      // `sweep:late` — the MARKER's statement finalised it (a begin's late judgement keeps the child's job id).
      expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'skipped_late', send_started_at: null, claimed_by_job: 'sweep:late' });
      expect(h.alarms.some((a) => a.includes('lease lapsed'))).toBe(false);
    },
    20_000,
  );

  // ── AC7 — the outcomes, through the REAL client ─────────────────────────────────────────────────────────────

  it('⭐ rule 1 / 2 — a thrown fetch, a 2xx with ⛔ wamid, a 502, a 504 ⇒ error / may_have_sent:*; a re-run sends ⛔ again (a timeout: the next leg)', async () => {
    const legs: { respond: Responder; detail: string }[] = [
      { respond: () => Promise.reject(new Error('ECONNRESET')), detail: 'may_have_sent:network' },
      // `-366` 1 — a reset AFTER the connection opened stays "may have sent".
      { respond: () => Promise.reject(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } })), detail: 'may_have_sent:network' },
      { respond: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }), detail: 'may_have_sent:no_wamid' },
      { respond: metaError(502, null), detail: 'may_have_sent:gateway_502' },
      { respond: metaError(504, null), detail: 'may_have_sent:gateway_504' },
    ];
    for (const leg of legs) {
      const w = await world();
      const h = harness(w, { respond: leg.respond });
      const jobId = randomUUID();
      expect(await child(h, w, jobId), leg.detail).toMatchObject({ status: 'done', counts: expect.objectContaining({ mayHaveSent: 1 }) });
      expect((await reminders(w))[0], leg.detail).toMatchObject({ send_outcome: 'error', detail: leg.detail });
      expect(await child(h, w, jobId), leg.detail).toEqual({ status: 'noop', reason: 'nothing_due' });
      expect(h.sent, leg.detail).toHaveLength(1);
      expectIdsOnly(h, w);
    }
  });

  it('rule 1 — the 10 s bound aborts a hung Meta call ⇒ may_have_sent:timeout', async () => {
    const w = await world();
    const hung: FetchLike = (_url, init) => new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted'))));
    const h = harness(w, { cache: createWhatsappAppCache(hung) });
    h.deps = { ...h.deps, sendTimeoutMs: 50 } as ClaimPeerMeshWaReminderDeps;
    await child(h, w);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'error', detail: 'may_have_sent:timeout' });
  });

  it('rule 1 — a throw that is ⛔ a WhatsappSendError ⇒ may_have_sent:unknown', async () => {
    const w = await world();
    const cache: WhatsappAppCache = { messagingFor: () => ({ send: () => Promise.reject(new TypeError('boom')) }) };
    const h = harness(w, { cache });
    await child(h, w);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'error', detail: 'may_have_sent:unknown' });
  });

  it('rule 3 — a 429 (with / without a code), 131056 on a 400, a 503 ⇒ transient: the marker cleared, the SAME job retries and sends', async () => {
    const legs: { respond: Responder; detail: string }[] = [
      { respond: metaError(429, null), detail: 'rate_limited:none' },
      { respond: metaError(429, 130429), detail: 'rate_limited:130429' },
      { respond: metaError(400, 131056), detail: 'rate_limited:131056' },
      { respond: metaError(503, null), detail: 'api_unavailable:503' },
      // `-366` 1 — a connection that never opened is a transient (status 0 — ⛔ "may have sent").
      { respond: () => Promise.reject(Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } })), detail: 'api_unavailable:000' },
      { respond: () => Promise.reject(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } })), detail: 'api_unavailable:000' },
    ];
    for (const leg of legs) {
      const w = await world();
      let first = true;
      const h = harness(w, { respond: (n) => (first ? ((first = false), leg.respond(n)) : ok()(n)) });
      const jobId = randomUUID();
      await expect(child(h, w, jobId), leg.detail).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
      expect((await reminders(w))[0], leg.detail).toMatchObject({ send_outcome: 'attempting', detail: leg.detail, send_started_at: null });
      expect(await child(h, w, jobId), leg.detail).toMatchObject({ status: 'done', counts: expect.objectContaining({ accepted: 1 }) });
      expect((await reminders(w))[0], leg.detail).toMatchObject({ send_outcome: 'accepted', attempt_count: 2, first_detail: leg.detail });
    }
  });

  it('⭐ rule 4 — template_not_approved, auth, a code-less 401, a 429 with 131048 ⇒ PARKED scope:<token>, an alarm, and the loop ENDS', async () => {
    const legs: { respond: Responder; detail: string }[] = [
      { respond: metaError(400, 132001), detail: 'scope:template_not_approved' },
      { respond: metaError(400, 190), detail: 'scope:auth' },
      { respond: metaError(401, null), detail: 'scope:http_401' },
      { respond: metaError(429, 131048), detail: 'scope:meta_131048' },
    ];
    for (const leg of legs) {
      const w = await world({ neighbours: 2 });
      const h = harness(w, { respond: leg.respond });
      expect(await child(h, w), leg.detail).toMatchObject({ status: 'stopped_scope', reason: leg.detail });
      expect(h.sent, leg.detail).toHaveLength(1); // the claim's second due ping is ⛔ attempted
      const rows = await reminders(w);
      expect(rows, leg.detail).toHaveLength(1);
      expect(rows[0], leg.detail).toMatchObject({ send_outcome: 'attempting', claimed_by_job: 'sweep:held', detail: leg.detail, send_started_at: null });
      expect(h.alarms.some((a) => a.includes('STOPPED') && a.includes(leg.detail) && a.includes(w.pid)), leg.detail).toBe(true); // WR10 rule 4 — names the Pariwar
    }
  });

  it('rule 5 — 131026 ⇒ rejected_recipient (finished)', async () => {
    const w = await world();
    const h = harness(w, { respond: metaError(400, 131026) });
    await child(h, w);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'rejected_recipient', detail: null });
  });

  it('⭐ rule 6 — 131009, 131008, an unrecognised code, a param error ⇒ PARKED held:<token>, an alarm, and the loop CONTINUES', async () => {
    const legs: { respond?: Responder; cache?: true; detail: string }[] = [
      { respond: metaError(400, 131009), detail: 'held:meta_131009' },
      { respond: metaError(400, 131008), detail: 'held:meta_131008' },
      { respond: metaError(400, 999001), detail: 'held:meta_999001' },
      { cache: true, detail: 'held:param_invalid' },
    ];
    for (const leg of legs) {
      const w = await world({ neighbours: 2 });
      let calls = 0;
      const cache: WhatsappAppCache | undefined = leg.cache
        ? { messagingFor: () => ({ send: () => ((calls += 1), Promise.reject(new WhatsappTemplateParamError('bad'))) }) }
        : undefined;
      const h = harness(w, { ...(leg.respond ? { respond: leg.respond } : {}), ...(cache ? { cache } : {}) });
      expect(await child(h, w), leg.detail).toMatchObject({ status: 'done', counts: expect.objectContaining({ parked: 2 }) });
      expect(leg.cache ? calls : h.sent.length, leg.detail).toBe(2); // the second due ping IS attempted
      for (const r of await reminders(w)) expect(r, leg.detail).toMatchObject({ send_outcome: 'attempting', claimed_by_job: 'sweep:held', detail: leg.detail });
      expect(h.alarms.filter((a) => a.includes('scope unknown') && a.includes(w.pid)), leg.detail).toHaveLength(2);
    }
  });

  it('no sendable number ⇒ no_target:no_sendable_number; a decrypt throw and a hash throw ⇒ transient (⛔ finished); an erased name ⇒ no_target:name_erased', async () => {
    const bad = await world({ mobileOverride: { 0: 'not-a-number' } });
    const h1 = harness(bad);
    await child(h1, bad);
    expect((await reminders(bad))[0]).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:no_sendable_number' });

    const garbage = await world({ mobileOverride: { 0: 'garbage' } });
    const h2 = harness(garbage);
    await expect(child(h2, garbage)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect((await reminders(garbage))[0]).toMatchObject({ send_outcome: 'attempting', detail: 'decrypt_failed:tier1' });

    const hashFault = await world();
    const brokenHmac = { ...enc, kms: { encryptDek: enc.kms.encryptDek.bind(enc.kms), decryptDek: enc.kms.decryptDek.bind(enc.kms), computeHmac: () => Promise.reject(new Error('kms down')) } };
    const h3 = harness(hashFault, { encryption: brokenHmac as never });
    await expect(child(h3, hashFault)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect((await reminders(hashFault))[0]).toMatchObject({ send_outcome: 'attempting', detail: 'hash_failed:tier1' });

    const erased = await world({ name: memberDomain.ANONYMIZED_SENTINEL });
    const h4 = harness(erased);
    await child(h4, erased);
    expect((await reminders(erased))[0]).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:name_erased' });
    for (const [h, w] of [[h1, bad], [h2, garbage], [h3, hashFault], [h4, erased]] as const) {
      expect(h.sent).toHaveLength(0);
      expectIdsOnly(h, w);
    }
  });

  it('⭐ the sweep FIRST finishes a lapsed in-flight row (past the bound, switch OFF) and marks a parked row past 72 h late — ⛔ send', async () => {
    const w = await world({ neighbours: 2, hoursAgo: 73, switchOn: false });
    await insertReminder(w, 0, { claimed_at: new Date(DAYTIME.getTime() - 11 * MIN), send_started_at: new Date(DAYTIME.getTime() - 11 * MIN) });
    await insertReminder(w, 1, { claimed_by_job: 'sweep:held', parked_at: DAYTIME, detail: 'scope:meta_131048' });
    const h = harness(w);
    const { swept } = await tick(h, w);
    expect(swept).toMatchObject({ finishedLapsed: 1, markedLate: 1, enqueued: 0 });
    const rows = await reminders(w);
    const byPing = new Map(rows.map((r) => [r.ping_id, r]));
    expect(byPing.get(w.pings[0]!.pingId)).toMatchObject({ send_outcome: 'error', detail: 'may_have_sent:lease_lapsed' });
    expect(byPing.get(w.pings[1]!.pingId)).toMatchObject({ send_outcome: 'skipped_late', detail: 'scope:meta_131048' });
    expect(h.sent).toHaveLength(0);
    expect(h.alarms.some((a) => a.includes('may_have_sent:lease_lapsed'))).toBe(true);
    expectIdsOnly(h, w);
  });

  it('a parked row within the bound is listed again and sent once the fault clears', async () => {
    const w = await world();
    const h1 = harness(w, { respond: metaError(400, 132001) });
    expect((await child(h1, w)).status).toBe('stopped_scope');
    const h2 = harness(w);
    const { swept } = await tick(h2, w);
    expect(swept.enqueued).toBe(1);
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'accepted', attempt_count: 2, first_detail: 'scope:template_not_approved' });
  });

  it('WR10 — a finalise that THROWS after Meta accepted ⇒ ONE alarm with the ids and the wamid, then the rethrow; the marker stays (⛔ resent)', async () => {
    const w = await world();
    const failing = new Proxy(pool, {
      get(target, key) {
        if (key === 'connect') {
          return async () => {
            const c = await target.connect();
            const query = c.query.bind(c) as (...a: unknown[]) => unknown;
            return new Proxy(c, {
              get(ct, ck) {
                if (ck === 'query') {
                  return (text: unknown, ...rest: unknown[]) =>
                    typeof text === 'string' && text.includes('SET send_outcome = $4')
                      ? Promise.reject(Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }))
                      : query(text, ...rest);
                }
                const v = Reflect.get(ct, ck) as unknown;
                return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(ct) : v;
              },
            });
          };
        }
        const v = Reflect.get(target, key) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
    const h = harness(w, { pool: failing, respond: ok('wamid.ACCEPTED_THEN_LOST') });
    const jobId = randomUUID();
    await expect(child(h, w, jobId)).rejects.toMatchObject({ code: '57014' });
    const lost = h.alarms.filter((a) => a.includes('wamid.ACCEPTED_THEN_LOST'));
    expect(lost).toHaveLength(1);
    expect(lost[0]).toContain(w.pings[0]!.pingId);
    expect(lost[0]).toContain('57014');
    expect((await reminders(w))[0]).toMatchObject({ send_outcome: 'attempting' });
    expect((await reminders(w))[0]!.send_started_at).not.toBeNull();
    // the pg-boss retry: the begin finds the send in flight ⇒ ⛔ second send
    const retry = harness(w);
    expect(await child(retry, w, jobId)).toEqual({ status: 'noop', reason: 'nothing_due' });
    expect(retry.sent).toHaveLength(0);
    expectIdsOnly(h, w);
  });
});
