// THE NEIGHBOURS' TEXT — the sweep and the child against the live DB (Story 6.27c, Task 4.5; AC2–AC5b). Own-committing (the
// sweep reads COMMITTED rows across tenants), an INJECTED clock, a fake SMS gateway and a capturing queue — the template is
// 6.24b's `claim-suspicion-notices-live.test.ts`. ⭐ ISOLATED: every test runs in a Pariwar of its OWN, and every sweep runs with
// `pariwarAllowlist` = that Pariwar. ⭐ REAL envelopes: the neighbours' mobiles and the deceased's KYC name are encrypted under the
// SAME fake-KMS deps the child decrypts with. Stubs CALL the real registry (`renderPeerMeshRequest`) and builder.
//   · AC2b / AC4 — the SHIPPED registry (v4 carries questions awaiting counsel) HOLDS: ⛔ ping begun, ONE ids-only alarm; a
//     registry with ⛔ live version holds; an `APP_LINKS_BASE_URL` with a port or a trailing dot holds; a stalled ping of a held
//     Pariwar is PARKED (⛔ given up), and once the gap closes (a test registry with ⛔ pending question) every due text is sent;
//   · AC2 / AC2c — each neighbour texted ONCE with EXACTLY the registered words, the mode-resolved name and the link
//     `<origin>/peer-request?c=<the row's code>`; the accepted write; a re-run sends ⛔ again; ⛔ at night (re-enqueued at 09:00 IST);
//   · AC5 / AC5b — a skipped neighbour replaced and the replacement texted; R6 (an erased number) replaced; a decrypt THROW is a
//     transient (⛔ replaced); `name_too_long` texts ⛔ one; ⛔ new event; ⛔ alarm carries a name, a number or a link code;
//   · the code review's F2 / F3 / F5 / F6 — 20:00 IST crossed mid-run (before a begin; between a begin and the handoff) ⇒ ⛔ sent,
//     deferred to 09:00; a lease stamped at its begin (⛔ the run's start) ⇒ a second child ⛔ re-claims it; a held claim ⛔ counts
//     against the sweep's bound; a base whose link cannot fit the `{link}` slot HOLDS.

import { randomUUID } from 'node:crypto';

import { type SmsAppClient, type SmsGatewayMessage } from '@twt/channels';
import { bindScopedDb, claim, encryption, ids, member as memberDomain, questionnaires, schema } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import { helplineNotCallbackNumberWarning } from '../src/scheduler/claim-dlt-sms-send.js';
import {
  runPeerMeshRequestChild,
  runPeerMeshRequestSweep,
  type ClaimPeerMeshRequestDeps,
  type PeerMeshRequestPayload,
} from '../src/scheduler/claim-peer-mesh-requests.js';
import { renderPeerMeshRequest } from '../src/scheduler/peer-mesh-sms-templates.js';
import { onOwnTx } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const HELPLINE = '1800123456';
const NAME = 'Ramesh Kumar Sharma';
const ORIGIN = 'https://links.example.org';
const enc = buildJobsEncryptionDeps('claim-peer-mesh-request-live-pepper');
/** 11:30 IST — inside the send hours. */
const DAYTIME = new Date('2026-10-16T06:00:00.000Z');
const DAY = 86_400_000;
const SMS_QUEUE = 'claim.peer_mesh_request.sms';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** The LIVE version with every `'pending'` question given a (test) basis — the gap closed. */
const V4 = questionnaires.resolveLiveVersion('peer_mesh', randomUUID())!;
const CLEARED: questionnaires.QuestionnaireDefinition = {
  ...V4,
  pages: V4.pages.map((pg) => ({
    ...pg,
    questions: pg.questions.map((q) => (q.counselBasis === 'pending' ? { ...q, counselBasis: '2099-01-01-001' } : q)),
  })),
};

describe.skipIf(!hasDatabase)('Story 6.27c — the neighbours\' text (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-peer-mesh-requests-live] idle client error:', err.message));
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
    /** The stored ranking; the first `selected` are pinged. */
    readonly ranked: string[];
    readonly mobiles: Map<string, string>;
    readonly pings: { pingId: string; memberId: string }[];
  }

  const mobileOf = (i: number): string => `+9198765${String(10000 + i).slice(-5)}`;

  /**
   * A fresh Pariwar (its passport — `locale`), the deceased (a REAL KYC name envelope), `ranked` active neighbours with REAL mobile
   * envelopes, a claim through the projector to `verification_in_progress`, a selection (the first `selected`) and its pings.
   */
  async function world(o: { locale?: 'hi' | 'en'; ranked?: number; selected?: number; name?: string } = {}): Promise<World> {
    const pid = randomUUID();
    pariwars.push(pid);
    await pool.query(
      `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, $3)`,
      [pid, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' }), o.locale ?? 'hi'],
    );
    const deceased = randomUUID();
    const claimCaseId = randomUUID();
    const ranked = Array.from({ length: o.ranked ?? 7 }, () => randomUUID());
    const mobiles = new Map(ranked.map((m, i) => [m, mobileOf(i)] as const));
    const selected = ranked.slice(0, o.selected ?? 5);
    const selectionId = randomUUID();
    const pings: World['pings'] = [];
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
      for (const m of ranked) {
        await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [m, pid]);
        await client.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
          m,
          pid,
          await encryption.encryptMobile(mobiles.get(m)!, enc),
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
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: selected,
        metric_id: 'm',
        metric_version: 1,
      });
      await client.query(
        `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
           metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at, source, ranked_member_ids)
         VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours', 'workplace', $6::uuid[])`,
        [selectionId, claimCaseId, pid, deceased, selected, ranked],
      );
      for (const m of selected) {
        const pingId = randomUUID();
        await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, source) VALUES ($1, $2, $3, $4, 'workplace')`, [
          pingId,
          selectionId,
          pid,
          m,
        ]);
        pings.push({ pingId, memberId: m });
      }
    });
    return { pid, claimCaseId, selectionId, ranked, mobiles, pings };
  }

  interface Harness {
    deps: ClaimPeerMeshRequestDeps;
    enqueued: { queue: string; data: JobEnvelope<PeerMeshRequestPayload>; options: Record<string, unknown> }[];
    sent: SmsGatewayMessage[];
    alarms: string[];
    setNow: (d: Date) => void;
  }

  interface HarnessOpts {
    registry?: readonly questionnaires.QuestionnaireDefinition[];
    appLinksBaseUrl?: string;
    config?: Record<string, string | null>;
    /** The Pariwar's helpline (default `HELPLINE`); `null` ⇒ unset. */
    helpline?: string | null;
    /** A config key PREFIX whose read THROWS (a Secret Manager fault). */
    throwOn?: string;
    /** The gateway's `isConfigured()` (default `true`). */
    gatewayConfigured?: boolean;
    /** The gateway's send (default: accepted with a fresh id). */
    send?: (m: SmsGatewayMessage) => Promise<string>;
  }

  function harness(w: { pid: string }, o: HarnessOpts = {}): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    let now = DAYTIME;
    const smsAppClient: SmsAppClient = {
      isConfigured: () => o.gatewayConfigured ?? true,
      messaging: () => ({
        send: (m) => {
          sent.push(m);
          return o.send ? o.send(m) : Promise.resolve(`gw-${randomUUID()}`);
        },
      }),
    };
    const deps: ClaimPeerMeshRequestDeps = {
      pool,
      encryption: enc,
      smsAppClient,
      resolveConfig: async (key) => {
        if (o.throwOn !== undefined && key.startsWith(o.throwOn)) throw Object.assign(new Error('secret manager down'), { code: 14 });
        if (o.config && key in o.config) return o.config[key]!;
        if (key.startsWith('sms.dlt.template_id.peer_mesh.request.')) return 'TPL-PEER';
        if (key.startsWith('sms.claim_correction.helpline_number.')) return o.helpline === undefined ? HELPLINE : o.helpline;
        return null;
      },
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [w.pid],
      appLinksBaseUrl: o.appLinksBaseUrl ?? ORIGIN,
      ...(o.registry !== undefined ? { questionnaireRegistry: o.registry } : {}),
    };
    return { deps, enqueued, sent, alarms, setNow: (d) => (now = d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object, options: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<PeerMeshRequestPayload>, options: options as Record<string, unknown> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runPeerMeshRequestSweep>[1];
  const envelopeOf = (w: World): JobEnvelope<PeerMeshRequestPayload> => ({
    pariwarId: w.pid,
    requestId: randomUUID(),
    actorId: null,
    traceId: randomUUID(),
    payload: { claimCaseId: w.claimCaseId },
  });
  /** Sweep, then run every enqueued child of OUR claim (each a fresh job). */
  async function tick(h: Harness, w: World) {
    h.enqueued.length = 0;
    const swept = await runPeerMeshRequestSweep(h.deps, boss(h));
    const out = [];
    for (const e of h.enqueued.filter((x) => x.queue === SMS_QUEUE && x.data.payload.claimCaseId === w.claimCaseId)) {
      out.push(await runPeerMeshRequestChild(h.deps, boss(h), e.data, randomUUID()));
    }
    return { swept, out };
  }
  async function rows(w: World) {
    const { rows: r } = await pool.query<{
      ping_id: string;
      member_id: string;
      send_outcome: string | null;
      detail: string | null;
      attempt_count: number;
      link_code: string | null;
      provider_message_id: string | null;
      recipient_number_hash: string | null;
      send_updated_at: Date | null;
      replaces_ping_id: string | null;
      claimed_by_job: string | null;
    }>(`SELECT * FROM claim_peer_mesh_pings WHERE selection_id = $1 ORDER BY ping_id`, [w.selectionId]);
    return r;
  }
  const eventCount = async (w: World) =>
    (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`, [w.claimCaseId])).rows[0]!.n;
  /** ⛔ alarm names, numbers or link codes (PM21 (e), AC5b). */
  async function expectIdsOnly(h: Harness, w: World) {
    const codes = (await rows(w)).map((r) => r.link_code).filter((c): c is string => c !== null);
    for (const a of h.alarms) {
      expect(a).not.toContain('Ramesh');
      // ids are ALLOWED — strip them first: a UUID's hex groups can hold ten decimal digits in a row (review round 2 P9)
      expect(a.replace(UUID_RE, '<id>')).not.toMatch(/\+?91\d{10}|\d{10}/);
      for (const c of codes) expect(a).not.toContain(c);
    }
  }

  // ── AC2b / AC4 — the holds ──────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC2b — the SHIPPED live version (questions awaiting counsel) HOLDS the sweep AND a hook-enqueued child: ⛔ ping begun', async () => {
    const w = await world();
    const h = harness(w);
    const child = await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID());
    expect(child).toEqual({ status: 'held_config', reason: 'config:counsel_basis_pending' });
    const { swept } = await tick(h, w);
    expect(swept).toMatchObject({ enqueued: 0, heldForConfig: 1 });
    expect((await rows(w)).every((r) => r.send_outcome === null)).toBe(true);
    expect(h.sent).toHaveLength(0);
    expect(h.alarms.some((a) => a.includes('config:counsel_basis_pending') && a.includes(w.claimCaseId))).toBe(true);
    await expectIdsOnly(h, w);
  });

  it.each([
    ['⛔ live version', { registry: [] }, 'config:questionnaire_unavailable'],
    ['a non-443 port', { registry: [CLEARED], appLinksBaseUrl: 'https://links.example.org:8443' }, 'config:app_links_base_url_invalid'],
    ['an explicit :443', { registry: [CLEARED], appLinksBaseUrl: 'https://links.example.org:443' }, 'config:app_links_base_url_invalid'],
    ['a trailing-dot host', { registry: [CLEARED], appLinksBaseUrl: 'https://links.example.org.' }, 'config:app_links_base_url_invalid'],
    [
      'a base whose link cannot fit the `{link}` slot (review F6 — 141 characters)',
      { registry: [CLEARED], appLinksBaseUrl: `https://${'a'.repeat(60)}.${'b'.repeat(40)}.org` },
      'config:app_link_too_long',
    ],
    ['⛔ template id', { registry: [CLEARED], config: { 'sms.dlt.template_id.peer_mesh.request.hi': null } }, 'config:dlt_template_id_missing:hi'],
    // review round 2 P10 — the rest of R11's list
    ['the gateway unconfigured', { registry: [CLEARED], gatewayConfigured: false }, 'config:sms_gateway_unconfigured'],
    ['a Secret Manager fault', { registry: [CLEARED], throwOn: 'sms.dlt.template_id.' }, 'config:secret_manager'],
    ['⛔ helpline', { registry: [CLEARED], helpline: null }, 'config:helpline_number_missing'],
  ] as const)('AC4 — %s HOLDS (⛔ ping begun)', async (_label, opts, reason) => {
    const w = await world();
    const h = harness(w, opts as Parameters<typeof harness>[1]);
    expect(await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID())).toEqual({ status: 'held_config', reason });
    expect((await tick(h, w)).swept).toMatchObject({ enqueued: 0, heldForConfig: 1 });
    expect((await rows(w)).every((r) => r.send_outcome === null)).toBe(true);
  });

  it('⭐ AC4 — a stalled ping of a HELD Pariwar is PARKED (⛔ given up); the gap closed, the child re-claims and every due text goes', async () => {
    const w = await world({ selected: 2 });
    const stalled = w.pings[0]!;
    await pool.query(
      `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = $2, claimed_by_job = 'dead-job',
         aging_since = $3, locale_source = 'pariwar_default', link_code = 'St4lledCode1' WHERE ping_id = $1`,
      [stalled.pingId, new Date(DAYTIME.getTime() - 60 * 60_000), new Date(DAYTIME.getTime() - DAY)],
    );
    const held = harness(w);
    await tick(held, w);
    expect((await rows(w)).find((r) => r.ping_id === stalled.pingId)).toMatchObject({ send_outcome: 'attempting', claimed_by_job: 'sweep:held' });
    // five days later, still held ⇒ still parked (⛔ given up)
    held.setNow(new Date(DAYTIME.getTime() + 5 * DAY));
    await tick(held, w);
    expect((await rows(w)).find((r) => r.ping_id === stalled.pingId)?.send_outcome).toBe('attempting');
    // the gap closed: the credited anchor is ⛔ past the cutoff ⇒ re-claimed and sent, with the SAME link code
    const open = harness(w, { registry: [CLEARED] });
    open.setNow(new Date(DAYTIME.getTime() + 5 * DAY));
    const { swept } = await tick(open, w);
    expect(swept.finalisedStuck).toBe(0);
    const after = await rows(w);
    expect(after.every((r) => r.send_outcome === 'accepted')).toBe(true);
    expect(after.find((r) => r.ping_id === stalled.pingId)).toMatchObject({ attempt_count: 2, link_code: 'St4lledCode1' });
    expect(open.sent).toHaveLength(2);
  });

  // ── AC2 / AC2c — the texts ──────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC2 / AC2c — each of the five texted ONCE: the registered words, the name, the link to its OWN code; the accepted write; ⛔ again', async () => {
    const w = await world({ locale: 'en' });
    const h = harness(w, { registry: [CLEARED] });
    const before = await eventCount(w);
    const { out } = await tick(h, w);
    expect(out).toEqual([expect.objectContaining({ status: 'done', counts: expect.objectContaining({ accepted: 5 }) })]);
    const after = await rows(w);
    expect(after).toHaveLength(5);
    expect(h.sent).toHaveLength(5);
    for (const r of after) {
      expect(r).toMatchObject({ send_outcome: 'accepted', attempt_count: 1, detail: null });
      expect(r.provider_message_id).toMatch(/^gw-/);
      expect(r.recipient_number_hash).toBeTruthy();
      expect(r.send_updated_at).not.toBeNull();
      const link = `${ORIGIN}/peer-request?c=${r.link_code!}`;
      const msg = h.sent.find((m) => m.to === w.mobiles.get(r.member_id));
      expect(msg?.body).toBe(renderPeerMeshRequest('en', { member: NAME, link, helpline: HELPLINE }));
    }
    // a re-run (the sweep, the hook) ⛔ texts anyone again
    await tick(h, w);
    await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID());
    expect(h.sent).toHaveLength(5);
    expect(await eventCount(w)).toBe(before); // AC5b — ⛔ event
    await expectIdsOnly(h, w);
  });

  it('the Hindi Pariwar is texted in Hindi (R10 — the Pariwar\'s default)', async () => {
    const w = await world({ locale: 'hi', selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    await tick(h, w);
    const [r] = await rows(w);
    expect(h.sent[0]?.body).toBe(renderPeerMeshRequest('hi', { member: NAME, link: `${ORIGIN}/peer-request?c=${r!.link_code!}`, helpline: HELPLINE }));
  });

  it.each([
    ['20:00 IST', '2026-10-16T14:30:00.000Z', '2026-10-17T03:30:00.000Z'],
    ['08:59 IST', '2026-10-16T03:29:00.000Z', '2026-10-16T03:30:00.000Z'],
    ['02:00 IST', '2026-10-15T20:30:00.000Z', '2026-10-16T03:30:00.000Z'],
  ])('⛔ at night (%s) — ⛔ ping begun; the child re-enqueued at the next 09:00 IST', async (_label, at, next) => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    h.setNow(new Date(at));
    const r = await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID());
    expect(r).toEqual({ status: 'deferred_quiet_hours', startAfter: new Date(next) });
    expect(h.enqueued).toEqual([expect.objectContaining({ queue: SMS_QUEUE, options: expect.objectContaining({ startAfter: new Date(next) }) })]);
    expect((await rows(w))[0]?.send_outcome).toBeNull();
  });

  // ── AC5 / AC5b — the exclusions, the replacement, R6, the transients ─────────────────────────────────────────

  it('⭐ AC5 — a skipped neighbour (⛔ active) is replaced from the stored ranking and the replacement is texted in the SAME run', async () => {
    const w = await world();
    const gone = w.pings[1]!;
    await onOwnTx(pool, w.pid, async (client) => {
      await client.query('RESET ROLE');
      await client.query(`SET LOCAL app.member_state_writer = 'on'`);
      await client.query(`UPDATE members SET state = 'lapsed-unpaid' WHERE member_id = $1`, [gone.memberId]);
    });
    const h = harness(w, { registry: [CLEARED] });
    const before = await eventCount(w);
    await tick(h, w);
    const after = await rows(w);
    expect(after.find((r) => r.ping_id === gone.pingId)).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:peer_not_active' });
    const rep = after.find((r) => r.replaces_ping_id === gone.pingId)!;
    expect(rep).toMatchObject({ member_id: w.ranked[5], send_outcome: 'accepted' });
    expect(h.sent.map((m) => m.to).sort()).toEqual([...w.pings.filter((p) => p !== gone).map((p) => w.mobiles.get(p.memberId)!), w.mobiles.get(w.ranked[5]!)!].sort());
    expect(h.alarms).toEqual([]); // ⛔ alarm for a first-attempt peer skip
    expect(await eventCount(w)).toBe(before);
  });

  it('R6 — an ERASED number (the sentinel) ⇒ `no_target:no_sendable_number` + a texted replacement; a decrypt THROW is a transient (⛔ replaced)', async () => {
    const w = await world({ selected: 3 });
    const [erased, broken] = w.pings;
    await onOwnTx(pool, w.pid, async (client) => {
      await client.query(`UPDATE member_identities SET mobile_ciphertext = $2 WHERE member_id = $1`, [
        erased!.memberId,
        await encryption.encryptMobile(memberDomain.ANONYMIZED_SENTINEL, enc),
      ]);
      await client.query(`UPDATE member_identities SET mobile_ciphertext = 'enc:v1:not-an-envelope' WHERE member_id = $1`, [broken!.memberId]);
    });
    const h = harness(w, { registry: [CLEARED] });
    await expect(runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    const after = await rows(w);
    expect(after.find((r) => r.ping_id === erased!.pingId)).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:no_sendable_number' });
    expect(after.find((r) => r.replaces_ping_id === erased!.pingId)).toMatchObject({ member_id: w.ranked[3], send_outcome: 'accepted' });
    expect(after.find((r) => r.ping_id === broken!.pingId)).toMatchObject({ send_outcome: 'attempting', detail: 'decrypt_failed:tier1' });
    expect(after.some((r) => r.replaces_ping_id === broken!.pingId)).toBe(false);
    expect(after.filter((r) => r.send_outcome === 'accepted')).toHaveLength(2);
    await expectIdsOnly(h, w);
  });

  it('R9 — a name longer than the slot ⇒ every ping `no_target:name_too_long`, ⛔ replaced, ⛔ texted, ⛔ alarmed', async () => {
    const w = await world({ name: 'A'.repeat(20) + ' ' + 'B'.repeat(20) });
    const h = harness(w, { registry: [CLEARED] });
    await tick(h, w);
    const after = await rows(w);
    expect(after).toHaveLength(5);
    expect(after.every((r) => r.send_outcome === 'no_target' && r.detail === 'no_target:name_too_long')).toBe(true);
    expect(h.sent).toHaveLength(0);
    expect(h.alarms).toEqual([]);
  });

  // ── the code review's F2 / F3 / F5 ──────────────────────────────────────────────────────────────────────────

  /** 19:59:59 and 20:00:01 IST on 2026-10-16; the next 09:00 IST. */
  const BEFORE_CUTOFF = new Date('2026-10-16T14:29:59.000Z');
  const AFTER_CUTOFF = new Date('2026-10-16T14:30:01.000Z');
  const NEXT_MORNING = new Date('2026-10-17T03:30:00.000Z');

  it('⭐ F2 — 20:00 IST crossed BEFORE a begin (during the config check) ⇒ ⛔ ping begun, ⛔ sent; the child comes back at 09:00', async () => {
    const w = await world({ selected: 2 });
    const h = harness(w, { registry: [CLEARED] });
    h.setNow(BEFORE_CUTOFF);
    const resolve = h.deps.resolveConfig;
    const deps: ClaimPeerMeshRequestDeps = {
      ...h.deps,
      resolveConfig: async (key) => {
        const v = await resolve(key);
        h.setNow(AFTER_CUTOFF);
        return v;
      },
    };
    expect(await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), randomUUID())).toEqual({
      status: 'deferred_quiet_hours',
      startAfter: NEXT_MORNING,
      counts: { accepted: 0, finalOther: 0, superseded: 0, noTarget: 0, replaced: 0, expired: 0, skipped: 0, transient: 0 },
    });
    expect(h.sent).toHaveLength(0);
    expect((await rows(w)).every((r) => r.send_outcome === null)).toBe(true);
    expect(h.enqueued).toEqual([expect.objectContaining({ queue: SMS_QUEUE, options: expect.objectContaining({ startAfter: NEXT_MORNING }) })]);
  });

  it('⭐ F2 — 20:00 IST crossed BETWEEN a begin and the handoff ⇒ ⛔ sent (the row stays `attempting`); 09:00 re-claims it and texts once', async () => {
    const w = await world({ selected: 2 });
    const h = harness(w, { registry: [CLEARED] });
    h.setNow(BEFORE_CUTOFF);
    // the clock passes 20:00 while the first neighbour's number is hashed — after its begin committed, before the handoff
    const kms = new Proxy(enc.kms, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver) as unknown;
        if (typeof v !== 'function') return v;
        const fn = v as (...a: unknown[]) => unknown;
        if (prop === 'computeHmac') {
          return (...a: unknown[]) => {
            h.setNow(AFTER_CUTOFF);
            return fn.apply(target, a);
          };
        }
        return fn.bind(target);
      },
    });
    const deps: ClaimPeerMeshRequestDeps = { ...h.deps, encryption: { ...enc, kms } };
    expect(await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), 'job-night')).toMatchObject({ status: 'deferred_quiet_hours', startAfter: NEXT_MORNING });
    expect(h.sent).toHaveLength(0);
    const night = await rows(w);
    const first = night.find((r) => r.ping_id === w.pings.map((p) => p.pingId).sort()[0]);
    expect(first).toMatchObject({ send_outcome: 'attempting', attempt_count: 1, claimed_by_job: 'job-night' });
    expect(night.filter((r) => r.send_outcome === null)).toHaveLength(1);
    // the morning's child: the un-sent row re-claimed past its lease (the SAME code), the other begun — each texted ONCE
    h.setNow(new Date(NEXT_MORNING.getTime() + 60_000));
    await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), 'job-morning');
    const morning = await rows(w);
    expect(morning.every((r) => r.send_outcome === 'accepted')).toBe(true);
    expect(morning.find((r) => r.ping_id === first!.ping_id)).toMatchObject({ attempt_count: 2, link_code: first!.link_code });
    expect(h.sent).toHaveLength(2);
    await expectIdsOnly(h, w);
  });

  it('⭐ F3 — the lease is stamped at the BEGIN (⛔ the run\'s start): a second child during the handoff ⛔ re-claims it — ONE text', async () => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    const second = harness(w, { registry: [CLEARED] });
    const later = new Date(DAYTIME.getTime() + 11 * 60_000); // past the 10-minute lease from the FIRST child's start
    second.setNow(later);
    const resolve = h.deps.resolveConfig;
    const gateway = h.deps.smsAppClient;
    let secondResult: Awaited<ReturnType<typeof runPeerMeshRequestChild>> | undefined;
    const deps: ClaimPeerMeshRequestDeps = {
      ...h.deps,
      resolveConfig: async (key) => {
        const v = await resolve(key);
        h.setNow(later); // the config check was slow
        return v;
      },
      smsAppClient: {
        isConfigured: () => true,
        messaging: () => ({
          send: async (m: SmsGatewayMessage) => {
            secondResult = await runPeerMeshRequestChild(second.deps, boss(second), envelopeOf(w), 'second-job');
            return gateway.messaging().send(m);
          },
        }),
      },
    };
    await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), 'first-job');
    expect(h.sent.length + second.sent.length).toBe(1);
    expect(secondResult).toMatchObject({ status: 'done', counts: expect.objectContaining({ skipped: 1, accepted: 0 }) });
    expect(await rows(w)).toEqual([expect.objectContaining({ send_outcome: 'accepted', attempt_count: 1, claimed_by_job: 'first-job' })]);
  });

  it('⭐ F5 — a HELD claim ⛔ counts against the sweep\'s bound: a ready claim after a held one is enqueued at `maxRuns = 1`', async () => {
    const [low, high] = [await world({ selected: 1 }), await world({ selected: 1 })].sort((a, b) => a.claimCaseId.localeCompare(b.claimCaseId));
    const h = harness(low!, { registry: [CLEARED] });
    const deps: ClaimPeerMeshRequestDeps = {
      ...h.deps,
      maxRuns: 1,
      pariwarAllowlist: [low!.pid, high!.pid],
      resolveConfig: async (key) => {
        if (key === `sms.claim_correction.helpline_number.${low!.pid}`) return null; // the LOW claim's Pariwar is held
        if (key.startsWith('sms.dlt.template_id.peer_mesh.request.')) return 'TPL-PEER';
        if (key.startsWith('sms.claim_correction.helpline_number.')) return HELPLINE;
        return null;
      },
    };
    const swept = await runPeerMeshRequestSweep(deps, boss(h));
    expect(swept).toMatchObject({ heldForConfig: 1, enqueued: 1, scannedClaims: 2 });
    expect(h.enqueued.map((e) => e.data.payload.claimCaseId)).toEqual([high!.claimCaseId]);
    expect(h.alarms.some((a) => a.includes('hard bound'))).toBe(false);
  });

  it('F5 — under a GLOBAL gap every claim is held, so the held ones DO count against the bound (⛔ a walk of every due claim)', async () => {
    const [low, high] = [await world({ selected: 1 }), await world({ selected: 1 })].sort((a, b) => a.claimCaseId.localeCompare(b.claimCaseId));
    const h = harness(low!, { registry: [CLEARED], appLinksBaseUrl: 'https://links.example.org:8443' });
    const deps: ClaimPeerMeshRequestDeps = { ...h.deps, maxRuns: 1, pariwarAllowlist: [low!.pid, high!.pid] };
    expect(await runPeerMeshRequestSweep(deps, boss(h))).toMatchObject({ heldForConfig: 1, enqueued: 0, scannedClaims: 1 });
    expect(h.enqueued).toHaveLength(0);
    expect(h.alarms.some((a) => a.includes('hit the hard bound of 1 claims'))).toBe(true);
  });

  // ── the code review's ROUND 2 (P1, P2, P5–P8, P18) ───────────────────────────────────────────────────────────

  /** As the superuser: leave `pingId` `attempting` under a dead job, past its lease (a crash-left row). */
  async function stall(pingId: string, code: string): Promise<void> {
    await pool.query(
      `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = $2, claimed_by_job = 'dead-job',
         aging_since = $2, locale_source = 'pariwar_default', link_code = $3 WHERE ping_id = $1`,
      [pingId, new Date(DAYTIME.getTime() - 60 * 60_000), code],
    );
  }
  /** A KMS whose calls are counted, and `onHmac` run once on the FIRST `computeHmac` (the F2 test's Proxy). */
  function countingKms(onHmac?: () => void): { kms: typeof enc.kms; calls: () => number } {
    let calls = 0;
    let fired = false;
    const kms = new Proxy(enc.kms, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver) as unknown;
        if (typeof v !== 'function') return v;
        const fn = v as (...a: unknown[]) => unknown;
        return (...a: unknown[]) => {
          calls += 1;
          if (prop === 'computeHmac' && onHmac && !fired) {
            fired = true;
            onHmac();
          }
          return fn.apply(target, a);
        };
      },
    });
    return { kms, calls: () => calls };
  }

  it('⭐ D1 (a) / P18 — a decrypt THROW, then an UNUSABLE number on the own retry (attempt 2) ⇒ `no_target`, ⛔ replaced, the "may have sent" alarm — although ⛔ text went (R5 / `-343` as built)', async () => {
    const w = await world({ selected: 1 });
    const p = w.pings[0]!;
    await onOwnTx(pool, w.pid, async (client) => {
      await client.query(`UPDATE member_identities SET mobile_ciphertext = 'enc:v1:not-an-envelope' WHERE member_id = $1`, [p.memberId]);
    });
    const h = harness(w, { registry: [CLEARED] });
    await expect(runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), 'job-r')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect((await rows(w))[0]).toMatchObject({ send_outcome: 'attempting', attempt_count: 1, detail: 'decrypt_failed:tier1' });
    await onOwnTx(pool, w.pid, async (client) => {
      await client.query(`UPDATE member_identities SET mobile_ciphertext = $2 WHERE member_id = $1`, [p.memberId, await encryption.encryptMobile(memberDomain.ANONYMIZED_SENTINEL, enc)]);
    });
    expect(await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), 'job-r')).toMatchObject({ status: 'done' }); // pg-boss's retry: the SAME job
    const after = await rows(w);
    expect(after).toHaveLength(1); // ⛔ replacement, though the ranking holds six more
    expect(after[0]).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:no_sendable_number', attempt_count: 2, provider_message_id: null });
    expect(h.sent).toHaveLength(0);
    expect(h.alarms.some((a) => a.includes(p.pingId) && a.includes('on attempt 2') && a.includes('may have sent'))).toBe(true);
    await expectIdsOnly(h, w);
  });

  it('AC5b — a re-claimed row whose claim LEFT the window ⇒ `error` + the ids-only "a text may have gone" alarm', async () => {
    const w = await world({ selected: 1 });
    const p = w.pings[0]!;
    await stall(p.pingId, 'Dec1dedCode1');
    await onOwnTx(pool, w.pid, async (client) => {
      await client.query('RESET ROLE');
      await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
      await client.query(`UPDATE claims SET current_state = 'denied' WHERE claim_case_id = $1`, [w.claimCaseId]);
    });
    const h = harness(w, { registry: [CLEARED] });
    expect(await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID())).toMatchObject({ status: 'done', counts: expect.objectContaining({ expired: 1 }) });
    expect((await rows(w))[0]).toMatchObject({ send_outcome: 'error', detail: 'exhausted:recheck_claim_decided' });
    expect(h.alarms.filter((a) => a.includes(p.pingId) && a.includes('a text may have gone'))).toHaveLength(1);
    expect(h.sent).toHaveLength(0);
    await expectIdsOnly(h, w);
  });

  it('AC5b — a re-claimed row with a NAME fault ⇒ `no_target:name_*` (⛔ replaced) + the "a prior attempt may have sent" alarm', async () => {
    const w = await world({ selected: 1, name: 'A'.repeat(20) + ' ' + 'B'.repeat(20) });
    const p = w.pings[0]!;
    await stall(p.pingId, 'N4meFaultCd1');
    const h = harness(w, { registry: [CLEARED] });
    await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID());
    const after = await rows(w);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:name_too_long' });
    expect(h.alarms.filter((a) => a.includes(p.pingId) && a.includes('on a re-claim after 1 claimed attempt(s)') && a.includes('may have sent'))).toHaveLength(1);
    await expectIdsOnly(h, w);
  });

  it('AC5b — a helpline that is ⛔ a callback number: SENT, and ONE warning per child (`-322` C1)', async () => {
    const w = await world({ selected: 2 });
    const h = harness(w, { registry: [CLEARED], helpline: '+91 1800 123' });
    await tick(h, w);
    expect(h.sent).toHaveLength(2);
    expect(h.alarms.filter((a) => a === helplineNotCallbackNumberWarning(w.pid, 'peer mesh request'))).toHaveLength(1);
    expect((await rows(w)).every((r) => r.send_outcome === 'accepted')).toBe(true);
  });

  it('AC5b — a recipient-level final `error` (an unclassified gateway failure) is recorded fail-closed and alarmed per ping; the run goes on', async () => {
    const w = await world({ selected: 2 });
    const h = harness(w, { registry: [CLEARED], send: () => Promise.reject(new Error('boom')) });
    await tick(h, w);
    const after = await rows(w);
    expect(after.every((r) => r.send_outcome === 'error' && r.detail === 'unknown:unknown')).toBe(true);
    expect(h.alarms.filter((a) => a.includes('recorded error (fail-closed)'))).toHaveLength(2);
    await expectIdsOnly(h, w);
  });

  it.each([
    ['the gateway refuses the ACCOUNT (`auth`)', 'auth'],
    ['the template id vanished after the race guard (the core\'s `config:*` final)', 'config'],
  ] as const)('⭐ P1 — %s ⇒ that ping `error`, the run STOPS `held_config` — ⛔ every remaining slot used up', async (_label, kind) => {
    const w = await world({ selected: 3 });
    const h = harness(w, { registry: [CLEARED], ...(kind === 'auth' ? { send: () => Promise.reject(Object.assign(new Error('401'), { httpStatus: 401 })) } : {}) });
    let templateReads = 0;
    const resolve = h.deps.resolveConfig;
    const deps: ClaimPeerMeshRequestDeps = {
      ...h.deps,
      resolveConfig: async (key) => {
        if (kind === 'config' && key.startsWith('sms.dlt.template_id.peer_mesh.request.')) {
          templateReads += 1;
          if (templateReads > 1) return null; // the race guard saw it; the core's own read does ⛔
        }
        return resolve(key);
      },
    };
    const r = await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), randomUUID());
    const reason = kind === 'auth' ? 'auth:http_401' : 'config:dlt_template_id_missing';
    expect(r).toEqual({ status: 'held_config', reason });
    const after = await rows(w);
    expect(after.filter((x) => x.send_outcome === 'error' && x.detail === reason)).toHaveLength(1);
    expect(after.filter((x) => x.send_outcome === null)).toHaveLength(2);
    await expectIdsOnly(h, w);
  });

  it('⭐ P5 — a child with ⛔ ping due returns `noop` BEFORE any KMS call (⛔ the deceased\'s name decrypted for nothing)', async () => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    await tick(h, w);
    expect((await rows(w))[0]?.send_outcome).toBe('accepted');
    const k = countingKms();
    const deps: ClaimPeerMeshRequestDeps = { ...h.deps, encryption: { ...enc, kms: k.kms } };
    expect(await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), randomUUID())).toEqual({ status: 'noop', reason: 'nothing_due' });
    expect(k.calls()).toBe(0);
  });

  it('⭐ P6 — the LEASE lapsed between the begin and the handoff ⇒ ⛔ sent (left to the re-claim); the own retry sends ONCE', async () => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    const k = countingKms(() => h.setNow(new Date(DAYTIME.getTime() + 11 * 60_000)));
    const deps: ClaimPeerMeshRequestDeps = { ...h.deps, encryption: { ...enc, kms: k.kms } };
    await expect(runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), 'job-slow')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(h.sent).toHaveLength(0);
    expect((await rows(w))[0]).toMatchObject({ send_outcome: 'attempting', attempt_count: 1, claimed_by_job: 'job-slow' });
    expect(h.alarms.some((a) => a.includes('its lease lapsed (or nearly) before the handoff'))).toBe(true);
    // pg-boss's retry of the SAME job: re-claimed at once, ⛔ slow this time ⇒ texted once
    expect(await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), 'job-slow')).toMatchObject({ status: 'done', counts: expect.objectContaining({ accepted: 1 }) });
    expect(h.sent).toHaveLength(1);
    expect((await rows(w))[0]).toMatchObject({ send_outcome: 'accepted', attempt_count: 2 });
  });

  /** The pool, with every `pariwar_passport` read REJECTED (`'fail'`) or answered with ⛔ row (`'empty'`). */
  function passportPool(mode: 'fail' | 'empty'): pg.Pool {
    return new Proxy(pool, {
      get(target, prop, receiver) {
        if (prop === 'connect') {
          return async () => {
            const client = await target.connect();
            return new Proxy(client, {
              get(c, cp, cr) {
                if (cp === 'query') {
                  return (q: unknown, ...rest: unknown[]) => {
                    const text = typeof q === 'string' ? q : (q as { text?: string } | null)?.text;
                    if (typeof text === 'string' && text.includes('FROM pariwar_passport')) {
                      return mode === 'fail' ? Promise.reject(new Error('db blip')) : Promise.resolve({ rows: [], rowCount: 0, fields: [], command: 'SELECT' });
                    }
                    return (c.query as (...a: unknown[]) => unknown).call(c, q, ...rest);
                  };
                }
                const v = Reflect.get(c, cp, cr) as unknown;
                return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(c) : v;
              },
            });
          };
        }
        const v = Reflect.get(target, prop, receiver) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
  }

  it('⭐ P7 — a DB fault on the locale read is a RETRY in the child and a SKIP in the sweep (⛔ a hold, ⛔ a park)', async () => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    const deps: ClaimPeerMeshRequestDeps = { ...h.deps, pool: passportPool('fail') };
    await expect(runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), randomUUID())).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(h.alarms.some((a) => a.includes('the locale read failed') && a.includes(w.claimCaseId))).toBe(true);
    const swept = await runPeerMeshRequestSweep(deps, boss(h));
    expect(swept).toMatchObject({ enqueued: 0, heldForConfig: 0, parkedForConfig: 0 });
    expect(h.alarms.some((a) => a.includes(`Pariwar ${w.pid} could ⛔ be read`))).toBe(true);
    expect((await rows(w))[0]?.send_outcome).toBeNull();
  });

  it('P7 — a MISSING passport (⛔ default language) is a config HOLD, ⛔ a retry (`config:locale_unavailable`)', async () => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    const deps: ClaimPeerMeshRequestDeps = { ...h.deps, pool: passportPool('empty') };
    expect(await runPeerMeshRequestChild(deps, boss(h), envelopeOf(w), randomUUID())).toEqual({ status: 'held_config', reason: 'config:locale_unavailable' });
    expect(await runPeerMeshRequestSweep(deps, boss(h))).toMatchObject({ enqueued: 0, heldForConfig: 1 });
    expect((await rows(w))[0]?.send_outcome).toBeNull();
  });

  it('P8 — a deferral waits at least a minute (host-vs-DB clock skew at 09:00 ⛔ loops)', async () => {
    const w = await world({ selected: 1 });
    const h = harness(w, { registry: [CLEARED] });
    h.setNow(new Date('2026-10-16T03:29:30.000Z')); // 08:59:30 IST
    expect(await runPeerMeshRequestChild(h.deps, boss(h), envelopeOf(w), randomUUID())).toEqual({
      status: 'deferred_quiet_hours',
      startAfter: new Date('2026-10-16T03:30:30.000Z'),
    });
  });
});
