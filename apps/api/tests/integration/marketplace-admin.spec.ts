// Story 12.2 — the admin MODULE surface through HTTP (`2026-11-01-433`; AC2–AC8 + AC13's route-table leg). Live DB.
//   · AC2 — `module.manage` gates EVERY route: 403 for an admin of the Pariwar without it (a district_admin); 404 for a
//     Pariwar where the admin holds NO grant (the scope hook — ⛔ an enumeration oracle);
//   · AC3 — partners: A–Z by lower(English name), server-minted id, a replay returns the same partner, a duplicate name in
//     any case is 409, a QE12 refusal is 422 with NO audit line (the pure pre-check);
//   · AC4 — the scope options for every source shape, and the author-time C11 check (NO audit line, NO event on a
//     refusal; the 201st listed district ACCEPTED — exact match, ⛔ the capped page);
//   · AC5 — author: 201 draft, server-minted id, replay, the all-null branding, the actor, and every refusal's code;
//   · AC6 — publish: step-up, the non-author gate (incl. a NULL author), the three ticks, schedule vs activate, the
//     publication row + its QE4 hash, the audit action, the sign-off line, and the pre-check refusals (NO audit line);
//   · AC7 — withdraw from draft / scheduled / active (no step-up), archived → 409, another Pariwar → 404;
//   · AC8 — the cursor list in a Pariwar no other leg writes, malformed cursors → 400 (never 500), the detail shape.
// ⚠ Own-committing; a FRESH Pariwar per test; assertions on OWN ids only (the DB is shared with parallel files).

import { randomUUID } from 'node:crypto';

import { ids as idsDomain, marketplace } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { UNNAMED_ADMIN_LABEL } from '../../src/modules/marketplace/handlers.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../src/server.js';
import {
  buildTestDeps,
  createTestApp,
  hasDatabase,
  makeClient,
  teardown,
  type CapturingStepUpDelivery,
  type TestDeps,
} from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const TICKS = { tone_checklist_confirmed: true, hindi_reviewed: true, partner_agreement_confirmed: true } as const;
const EMPTY_JSON = { headers: { 'content-type': 'application/json' }, payload: '{}' } as const;

describe.skipIf(!hasDatabase)('Story 12.2 — the admin module surface through HTTP', { timeout: 60000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const mods = await c.query<{ module_id: string }>('SELECT module_id FROM marketplace_modules WHERE pariwar_id = ANY($1)', [createdPariwars]);
      const ids = mods.rows.map((r) => r.module_id);
      await c.query('DELETE FROM marketplace_module_publications WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM marketplace_modules WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [ids]);
      await c.query('DELETE FROM marketplace_partners WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM geo_tree_versions WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM workplace_districts WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('COMMIT');
      if (createdUserIds.length > 0) {
        // By the `user_id` column too: RP12 rewrites a session's `sess.userId` to a stranger's, so the JSON key no longer matches.
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1) OR user_id = ANY($1::uuid[])`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  /** A FRESH Pariwar (there is ⛔ `pariwars` table — any UUID is a tenant), cleaned up in afterAll. */
  function freshPariwar(): string {
    const p = randomUUID();
    createdPariwars.push(p);
    return p;
  }

  // Copied from `workplaces.spec.ts` / `questionnaire-versions.spec.ts` (G8 — ⛔ a shared helper exists).
  async function actorWithId(
    pariwarId: string,
    role: string,
    dim: string,
    value: string | null,
    displayName: string,
  ): Promise<{ client: Client; userId: string }> {
    const email = `mm-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    await td.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dim, value],
    );
    return { client, userId };
  }
  const pariwarAdmin = (p: string, name = 'Asha (Pariwar Admin)') => actorWithId(p, 'pariwar_admin', 'pariwar', p, name);

  async function elevate(client: Client, actionContext: string): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }

  const M = (p: string) => `/api/v1/p/${p}/modules`;
  const post = (c: Client, url: string, payload: unknown, key: string | null = randomUUID()) =>
    c.inject({ method: 'POST', url, payload: payload as Json, headers: key === null ? {} : { 'idempotency-key': key } });
  const json = (r: { body: string }) => JSON.parse(r.body) as Json;
  const errOf = (r: { body: string }) => (JSON.parse(r.body) as { error: { code: string; details?: Json } }).error;

  async function partner(c: Client, p: string, en = `HDFC ${randomUUID().slice(0, 8)}`, hi = 'एचडीएफसी बैंक'): Promise<string> {
    const r = await post(c, `${M(p)}/partners`, { display_name_en: en, display_name_hi: hi });
    expect(r.statusCode).toBe(201);
    return json(r)['partner_id'] as string;
  }

  function manifest(partnerId: string, o: Json = {}): Json {
    const now = Date.now();
    return {
      partner_id: partnerId,
      name_en: 'HDFC home loan',
      name_hi: 'एचडीएफसी गृह ऋण',
      description_en: 'A home-loan offer for members.',
      description_hi: 'सदस्यों के लिए गृह ऋण प्रस्ताव।',
      eligibility_filter: { version: 1, clauses: [] },
      scope_filter: { version: 1, scope: 'members-all' },
      valid_from: new Date(now - HOUR_MS).toISOString(),
      valid_until: new Date(now + 7 * DAY_MS).toISOString(),
      slot_capacity: 10,
      lead_handoff_url: 'https://leads.partner.example/hdfc/twt',
      lead_handoff_signing_key_secret_name: 'marketplace-hdfc-signing-key',
      ...o,
    };
  }

  async function authored(c: Client, p: string, partnerId: string, o: Json = {}): Promise<string> {
    const r = await post(c, M(p), manifest(partnerId, o));
    expect(r.statusCode, r.body).toBe(201);
    return json(r)['module_id'] as string;
  }

  /** The `module*` audit lines of a Pariwar (fresh per test, so the set is exactly this test's). */
  async function moduleAudit(p: string): Promise<{ action: string; resource_locator: string; actor_id: string | null }[]> {
    const r = await td.pool.query<{ action: string; resource_locator: string; actor_id: string | null }>(
      `SELECT action, resource_locator, actor_id FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'module%' ORDER BY seq`,
      [p],
    );
    return r.rows;
  }
  async function moduleEvents(p: string): Promise<{ stream_id: string; event_type: string; actor_id: string | null }[]> {
    const r = await td.pool.query<{ stream_id: string; event_type: string; actor_id: string | null }>(
      `SELECT stream_id, event_type, actor_id FROM events_log WHERE pariwar_id = $1 AND event_type LIKE 'module.%' ORDER BY event_version`,
      [p],
    );
    return r.rows;
  }
  async function publicationRows(moduleId: string): Promise<Json[]> {
    return (await td.pool.query('SELECT * FROM marketplace_module_publications WHERE module_id = $1', [moduleId])).rows as Json[];
  }

  async function seedTree(p: string, nodes: Json[]): Promise<void> {
    await td.pool.query(
      `INSERT INTO geo_tree_versions (pariwar_id, version, effective_at, tree_document) VALUES ($1, 1, now() - interval '1 hour', $2::jsonb)`,
      [p, JSON.stringify({ version: 1, nodes })],
    );
  }
  const stateNode = (value: string) => ({ dimension: 'state', value, parent_dimension: null, parent_value: null });
  const districtNode = (value: string, parent: string | null) => ({
    dimension: 'district',
    value,
    parent_dimension: parent === null ? null : 'state',
    parent_value: parent,
  });
  async function listDistricts(p: string, names: string[], status = 'listed'): Promise<void> {
    await td.pool.query(
      `INSERT INTO workplace_districts (pariwar_id, district, status) SELECT $1, d, $3 FROM unnest($2::text[]) AS d`,
      [p, names, status],
    );
  }

  // ── AC2 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC2: an admin of the Pariwar WITHOUT module.manage gets 403 on all eight routes; a Pariwar with NO grant is 404', async () => {
    const p = freshPariwar();
    const pa = await pariwarAdmin(p);
    const partnerId = await partner(pa.client, p);
    const moduleId = await authored(pa.client, p, partnerId);
    const da = await actorWithId(p, 'district_admin', 'district', 'Patna', 'Dev (District Admin)');
    const c = da.client;
    const calls = [
      () => c.inject({ method: 'GET', url: M(p) }),
      () => c.inject({ method: 'GET', url: `${M(p)}/scope-options` }),
      () => c.inject({ method: 'GET', url: `${M(p)}/partners` }),
      () => post(c, `${M(p)}/partners`, { display_name_en: 'LIC', display_name_hi: 'एलआईसी' }),
      () => post(c, M(p), manifest(partnerId)),
      () => c.inject({ method: 'GET', url: `${M(p)}/${moduleId}` }),
      () => post(c, `${M(p)}/${moduleId}/publish`, TICKS),
      () => post(c, `${M(p)}/${moduleId}/withdraw`, {}),
    ];
    // Review round 1, RP11: publish ALSO answers 403 when the step-up is missing, so the status alone cannot tell a dropped
    // permission check from the step-up gate. Every response must carry the SAME permission-denial code, never the step-up one.
    const denials: Awaited<ReturnType<(typeof calls)[number]>>[] = [];
    for (const call of calls) denials.push(await call());
    for (const r of denials) expect(r.statusCode, r.body).toBe(403);
    const denialCode = errOf(denials[0]!).code;
    expect(denialCode).not.toBe('auth.step_up_required');
    for (const r of denials) expect(errOf(r).code).toBe(denialCode);

    // The Pariwar admin of P on ANOTHER Pariwar (no grant there) — the scope hook's 404, on reads and writes alike.
    const q = freshPariwar();
    expect((await pa.client.inject({ method: 'GET', url: M(q) })).statusCode).toBe(404);
    expect((await post(pa.client, `${M(q)}/partners`, { display_name_en: 'LIC', display_name_hi: 'एलआईसी' })).statusCode).toBe(404);
    // Nothing was written by the refused calls.
    expect((await moduleAudit(p)).filter((a) => a.actor_id === da.userId)).toEqual([]);
  });

  // Review round 1, RP12 (checklist family 3, per mutation route). The questionnaire twin's RV11 is the house standard:
  // POSITIVE CONTROLS first (the same clients DO write on every route, so a refusal is the actor / tenant boundary and not a
  // session that never took), then a TAMPERED session — its userId rewritten to a stranger's — must get EXACTLY 404 (a 401
  // would pass without ever reaching the scope hook) on every mutation route, with nothing written; and an admin with NO grant
  // in the Pariwar gets 404 on all eight routes. A non-human or system actor is not constructible on this surface: every route
  // sits behind the admin session guard and nothing else authenticates.
  it('RP12 / family 3: a TAMPERED session is EXACTLY 404 on all four mutation routes with nothing written; an admin with NO grant is 404 on all eight', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    // ⭐ POSITIVE CONTROLS — every mutation route writes for these very clients.
    const partnerId = await partner(author.client, p);
    const toPublish = await authored(author.client, p, partnerId);
    await elevate(publisher.client, 'module_publish');
    expect((await post(publisher.client, `${M(p)}/${toPublish}/publish`, TICKS)).statusCode).toBe(200);
    const toWithdraw = await authored(author.client, p, partnerId);
    expect((await post(author.client, `${M(p)}/${toWithdraw}/withdraw`, {})).statusCode).toBe(200);
    // The open draft the refused sessions will try to act on; the publisher HOLDS a fresh step-up, so a 404 is not the elevation.
    const open = await authored(author.client, p, partnerId);
    await elevate(publisher.client, 'module_publish');

    const outsider = await pariwarAdmin(freshPariwar(), 'Omar (Other Pariwar)');
    const counts = async () => ({
      partners: (await td.pool.query('SELECT count(*)::int AS n FROM marketplace_partners WHERE pariwar_id = $1', [p])).rows[0].n as number,
      modules: (await td.pool.query('SELECT count(*)::int AS n FROM marketplace_modules WHERE pariwar_id = $1', [p])).rows[0].n as number,
      publications: (await td.pool.query('SELECT count(*)::int AS n FROM marketplace_module_publications WHERE pariwar_id = $1', [p])).rows[0].n as number,
      events: (await moduleEvents(p)).length,
      audit: (await moduleAudit(p)).length,
    });
    const before = await counts();

    // An admin with NO grant in P: 404 on every route, reads and writes alike (the module routes name P's real open draft).
    const noGrant = [
      outsider.client.inject({ method: 'GET', url: M(p) }),
      outsider.client.inject({ method: 'GET', url: `${M(p)}/scope-options` }),
      outsider.client.inject({ method: 'GET', url: `${M(p)}/partners` }),
      post(outsider.client, `${M(p)}/partners`, { display_name_en: 'Outsider Ltd', display_name_hi: 'आउटसाइडर' }),
      post(outsider.client, M(p), manifest(partnerId)),
      outsider.client.inject({ method: 'GET', url: `${M(p)}/${open}` }),
      post(outsider.client, `${M(p)}/${open}/publish`, TICKS),
      post(outsider.client, `${M(p)}/${open}/withdraw`, {}),
    ];
    for (const r of await Promise.all(noGrant)) expect(r.statusCode, r.body).toBe(404);

    // TAMPER both sessions: the session row now names a user who holds no grant in P.
    for (const who of [author, publisher]) {
      await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [randomUUID(), who.userId]);
    }
    const tampered = [
      post(author.client, `${M(p)}/partners`, { display_name_en: 'Tamper Ltd', display_name_hi: 'टैम्पर' }),
      post(author.client, M(p), manifest(partnerId)),
      post(publisher.client, `${M(p)}/${open}/publish`, TICKS),
      post(author.client, `${M(p)}/${open}/withdraw`, {}),
    ];
    for (const r of await Promise.all(tampered)) expect(r.statusCode, r.body).toBe(404); // EXACTLY 404, ⛔ a 401

    expect(await counts()).toEqual(before);
    expect((await td.pool.query('SELECT current_state FROM marketplace_modules WHERE module_id = $1', [open])).rows[0]).toEqual({ current_state: 'draft' });
  });

  // ── Idempotency (QE13 / QE18) — the rows the unit-test header says are pinned over HTTP (review round 1, RP13) ──────────

  it('RP13: an Idempotency-Key over 200 characters → 400 module.idempotency_key_required (⛔ a 500), nothing written; exactly 200 is accepted', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const names = { display_name_en: 'Long Key Ltd', display_name_hi: 'लॉन्ग की' };
    const tooLong = await post(client, `${M(p)}/partners`, names, 'k'.repeat(201));
    expect(tooLong.statusCode).toBe(400);
    expect(errOf(tooLong).code).toBe('module.idempotency_key_required');
    expect(((await client.inject({ method: 'GET', url: `${M(p)}/partners` })).body)).toContain('"items":[]');
    expect((await post(client, `${M(p)}/partners`, names, 'k'.repeat(200))).statusCode).toBe(201);
  });

  it('RP13: two concurrent requests with the SAME Idempotency-Key write ONE module — the second is the recorded replay or 409 module.idempotency_in_progress', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const key = randomUUID();
    // Which of the two claims the key first, and whether the loser arrives before or after the result is recorded, is
    // timing; the assertions hold for every interleaving.
    const rs = await Promise.all([post(client, M(p), manifest(partnerId), key), post(client, M(p), manifest(partnerId), key)]);
    const created = rs.filter((r) => r.statusCode === 201);
    expect(created.length, rs.map((r) => r.body).join(' | ')).toBeGreaterThanOrEqual(1);
    for (const r of rs.filter((x) => x.statusCode !== 201)) {
      expect(r.statusCode, r.body).toBe(409);
      expect(errOf(r).code).toBe('module.idempotency_in_progress');
    }
    expect(new Set(created.map((r) => json(r)['module_id'])).size).toBe(1);
    expect((await moduleEvents(p)).filter((e) => e.event_type === 'module.authored')).toHaveLength(1);
    // Once settled, the key replays the SAME module.
    expect(json(await post(client, M(p), manifest(partnerId), key))['module_id']).toBe(json(created[0]!)['module_id']);
  });

  it('RP13: a withdraw replayed with the same key returns the recorded 200 and writes ONE archive event and ONE audit line', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const id = await authored(client, p, await partner(client, p));
    const key = randomUUID();
    const first = await post(client, `${M(p)}/${id}/withdraw`, {}, key);
    expect(first.statusCode, first.body).toBe(200);
    const replay = await post(client, `${M(p)}/${id}/withdraw`, {}, key);
    expect(replay.statusCode, replay.body).toBe(200);
    expect(json(replay)).toEqual(json(first));
    expect((await moduleEvents(p)).filter((e) => e.stream_id === id).map((e) => e.event_type)).toEqual(['module.authored', 'module.archived']);
    const lines = (await moduleAudit(p)).filter((a) => a.resource_locator === `module/${id}`).map((a) => a.action);
    expect(lines).toEqual(['module.authored', 'module.archived']); // no second intent, no _rolled_back
  });

  // ── AC3 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC3: partners — 201 with a server-minted id; replay → the same partner; A–Z by lower(name); duplicate name any case → 409', async () => {
    const p = freshPariwar();
    const { client, userId } = await pariwarAdmin(p);
    const key = randomUUID();
    const first = await post(client, `${M(p)}/partners`, { display_name_en: 'Zeta Insurance', display_name_hi: 'ज़ेटा बीमा' }, key);
    expect(first.statusCode).toBe(201);
    const replay = await post(client, `${M(p)}/partners`, { display_name_en: 'Zeta Insurance', display_name_hi: 'ज़ेटा बीमा' }, key);
    expect(replay.statusCode).toBe(201);
    expect(json(replay)['partner_id']).toBe(json(first)['partner_id']);
    await partner(client, p, 'alpha Health', 'अल्फा स्वास्थ्य');
    await partner(client, p, 'Beta Bank', 'बीटा बैंक');

    const list = await client.inject({ method: 'GET', url: `${M(p)}/partners` });
    expect(list.statusCode).toBe(200);
    const items = (json(list)['items'] as { display_name_en: string }[]).map((i) => i.display_name_en);
    expect(items).toEqual(['alpha Health', 'Beta Bank', 'Zeta Insurance']);
    expect((json(await client.inject({ method: 'GET', url: `${M(p)}/partners?limit=1` }))['items'] as unknown[]).length).toBe(1);
    expect((await client.inject({ method: 'GET', url: `${M(p)}/partners?limit=201` })).statusCode).toBe(400);

    const dup = await post(client, `${M(p)}/partners`, { display_name_en: 'zeta INSURANCE', display_name_hi: 'ज़ेटा' });
    expect(dup.statusCode).toBe(409);
    expect(errOf(dup).code).toBe('module_partner.name_taken');
    // One registration line per partner created (the replay and the duplicate leave the set at three + a rolled-back pair).
    const created = (await moduleAudit(p)).filter((a) => a.action === 'module_partner.created');
    expect(created).toHaveLength(4); // three created + the duplicate's intent line
    expect((await moduleAudit(p)).filter((a) => a.action === 'module_partner.created_rolled_back')).toHaveLength(1);
    // Review round 1, RP15: the line names the partner and the ACTING admin (the actor id, QE14) — a count alone would not.
    const firstId = json(first)['partner_id'] as string;
    expect((await moduleAudit(p)).filter((a) => a.resource_locator === `module_partner/${firstId}`)).toEqual([
      { action: 'module_partner.created', resource_locator: `module_partner/${firstId}`, actor_id: userId },
    ]);
  });

  it('AC3: a QE12 name refusal → 422 module_partner.name_invalid with issue paths and NO audit line', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const bad = await post(client, `${M(p)}/partners`, { display_name_en: 'LIC', display_name_hi: 'LIC ।' });
    expect(bad.statusCode).toBe(422);
    const e = errOf(bad);
    expect(e.code).toBe('module_partner.name_invalid');
    expect((e.details?.['issues'] as { path: string[] }[]).map((i) => i.path)).toEqual([['display_name_hi']]);
    const bidi = await post(client, `${M(p)}/partners`, { display_name_en: `L${String.fromCodePoint(0x202e)}IC`, display_name_hi: 'एलआईसी' });
    expect(errOf(bidi).code).toBe('module_partner.name_invalid');
    expect(await moduleAudit(p)).toEqual([]);
  });

  // ── AC4 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC4 (iv): ⛔ tree and ⛔ listed district — both lists empty; state → 422 requires_geo_tree; district → 422 scope_value_unknown; NO audit, NO event', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const opts = await client.inject({ method: 'GET', url: `${M(p)}/scope-options` });
    expect(opts.statusCode).toBe(200);
    expect(json(opts)).toEqual({ geo_tree_version: null, states: [], districts: [], district_source: 'workplace_districts', districts_truncated: false });

    const st = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'state', values: ['Bihar'] } }));
    expect(st.statusCode).toBe(422);
    expect(errOf(st)).toMatchObject({ code: 'module.state_scope_requires_geo_tree', details: {} });
    const di = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'district', values: ['Atlantis'] } }));
    expect(di.statusCode).toBe(422);
    expect(errOf(di)).toMatchObject({ code: 'module.scope_value_unknown', details: { scope: 'district', values: ['Atlantis'] } });
    expect((await moduleAudit(p)).filter((a) => a.action.startsWith('module.'))).toEqual([]);
    expect(await moduleEvents(p)).toEqual([]);
  });

  it('AC4 (iii): ⛔ tree, 205 listed districts — 200 shown + truncated; the 201st+ is ACCEPTED (exact match); a retired one is refused', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const names = Array.from({ length: 205 }, (_, i) => `District ${String(i).padStart(3, '0')}`);
    await listDistricts(p, names);
    await listDistricts(p, ['Old Spelling'], 'retired');
    const opts = json(await client.inject({ method: 'GET', url: `${M(p)}/scope-options` }));
    expect(opts['district_source']).toBe('workplace_districts');
    expect(opts['districts_truncated']).toBe(true);
    expect(opts['states']).toEqual([]);
    const districts = opts['districts'] as { value: string; state: string | null; usable: boolean }[];
    expect(districts).toHaveLength(200);
    expect(districts[0]).toEqual({ value: 'District 000', state: null, usable: true, unusable_reason: null });
    expect(districts.some((d) => d.value === 'District 204')).toBe(false);

    const ok = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'district', values: ['District 204', 'District 001'] } }));
    expect(ok.statusCode, ok.body).toBe(201);
    const retired = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'district', values: ['Old Spelling'] } }));
    expect(errOf(retired)).toMatchObject({ code: 'module.scope_value_unknown', details: { values: ['Old Spelling'] } });
  });

  it('AC4 (i)/(v): a tree with states + districts — parents carried; a 121–128-char node is offered unusable (too_long), never truncated', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const long = `L${'o'.repeat(124)}`; // 125 characters
    await seedTree(p, [stateNode('Bihar'), stateNode('Assam'), districtNode('Patna', 'Bihar'), districtNode('Gaya', 'Bihar'), districtNode(long, 'Assam')]);
    // A listed workplace district is IGNORED once a tree is in force.
    await listDistricts(p, ['Muzaffarpur']);
    const opts = json(await client.inject({ method: 'GET', url: `${M(p)}/scope-options` }));
    expect(opts['geo_tree_version']).toBe(1);
    expect(opts['district_source']).toBe('geo_tree');
    expect(opts['districts_truncated']).toBe(false);
    expect((opts['states'] as { value: string }[]).map((s) => s.value)).toEqual(['Assam', 'Bihar']);
    const districts = opts['districts'] as { value: string; state: string | null; usable: boolean; unusable_reason: string | null }[];
    expect(districts.find((d) => d.value === 'Patna')).toEqual({ value: 'Patna', state: 'Bihar', usable: true, unusable_reason: null });
    expect(districts.find((d) => d.value === long)).toEqual({ value: long, state: 'Assam', usable: false, unusable_reason: 'too_long' });
    expect(districts.some((d) => d.value === 'Muzaffarpur')).toBe(false);

    expect((await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'state', values: ['Bihar'] } }))).statusCode).toBe(201);
    expect((await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'district', values: ['Gaya'] } }))).statusCode).toBe(201);
    const unknown = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'state', values: ['Bihar', 'Kerala'] } }));
    expect(errOf(unknown)).toMatchObject({ code: 'module.scope_value_unknown', details: { scope: 'state', values: ['Kerala'] } });
    const listed = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'district', values: ['Muzaffarpur'] } }));
    expect(errOf(listed).code).toBe('module.scope_value_unknown');
  });

  it('AC4 (ii): a districts-only tree — states: [], district_source geo_tree; a state audience → 422 requires_geo_tree', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    await seedTree(p, [districtNode('Patna', null), districtNode('Gaya', null)]);
    const opts = json(await client.inject({ method: 'GET', url: `${M(p)}/scope-options` }));
    expect(opts['states']).toEqual([]);
    expect(opts['district_source']).toBe('geo_tree');
    expect((opts['districts'] as { value: string; state: string | null }[]).map((d) => [d.value, d.state])).toEqual([
      ['Gaya', null],
      ['Patna', null],
    ]);
    const st = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'state', values: ['Bihar'] } }));
    expect(errOf(st).code).toBe('module.state_scope_requires_geo_tree');
  });

  it('AC4: a MALFORMED scope_filter skips the pre-check and is refused by the domain (422 module.manifest_invalid)', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const r = await post(client, M(p), manifest(partnerId, { scope_filter: { version: 1, scope: 'role', values: ['teacher'] } }));
    expect(r.statusCode).toBe(422);
    expect(errOf(r).code).toBe('module.manifest_invalid');
  });

  // ── AC5 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC5: author → 201 draft; the id is server-minted; replay → same id, one stream; branding all-null; actor operator; audit module.authored', async () => {
    const p = freshPariwar();
    const { client, userId } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const key = randomUUID();
    const r1 = await post(client, M(p), manifest(partnerId), key);
    expect(r1.statusCode).toBe(201);
    const body = json(r1);
    expect(body).toEqual({ module_id: expect.any(String), state: 'draft' });
    const id = body['module_id'] as string;
    const r2 = await post(client, M(p), manifest(partnerId), key);
    expect(json(r2)['module_id']).toBe(id);

    const row = (await td.pool.query('SELECT current_state, branding_bundle, partner_id FROM marketplace_modules WHERE module_id = $1', [id])).rows[0] as Json;
    expect(row).toEqual({ current_state: 'draft', branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null }, partner_id: partnerId });
    const events = (await moduleEvents(p)).filter((e) => e.stream_id === id);
    expect(events).toEqual([{ stream_id: id, event_type: 'module.authored', actor_id: userId }]);
    const payload = (await td.pool.query(`SELECT payload FROM events_log WHERE stream_id = $1`, [id])).rows[0] as { payload: Json };
    expect(payload.payload['actor']).toBe('operator');
    const lines = (await moduleAudit(p)).filter((a) => a.action.startsWith('module.'));
    expect(lines).toEqual([{ action: 'module.authored', resource_locator: `module/${id}`, actor_id: userId }]);
  });

  it('AC5: shape refusals are 400 (module_id in the body, a non-UUID partner_id — ⛔ a 500, a missing Idempotency-Key)', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    expect((await post(client, M(p), { ...manifest(partnerId), module_id: randomUUID() })).statusCode).toBe(400);
    expect((await post(client, M(p), manifest('not-a-uuid'))).statusCode).toBe(400);
    expect((await post(client, M(p), { ...manifest(partnerId), branding_bundle: {} })).statusCode).toBe(400);
    const noKey = await post(client, M(p), manifest(partnerId), null);
    expect(noKey.statusCode).toBe(400);
    expect(errOf(noKey).code).toBe('module.idempotency_key_required');
    expect(await moduleEvents(p)).toEqual([]);
  });

  it('AC5: an unknown partner → 422 module.partner_unknown (⛔ audit); another Pariwar\'s partner is unknown too', async () => {
    const p = freshPariwar();
    const q = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const other = await pariwarAdmin(q);
    const qPartner = await partner(other.client, q);
    for (const pid of [randomUUID(), qPartner]) {
      const r = await post(client, M(p), manifest(pid));
      expect(r.statusCode).toBe(422);
      expect(errOf(r)).toMatchObject({ code: 'module.partner_unknown', details: { partner_id: pid } });
    }
    expect(await moduleAudit(p)).toEqual([]);
  });

  it('AC5: a domain-refused manifest → 422 module.manifest_invalid with issue paths, AND the intent + _rolled_back pair', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const r = await post(client, M(p), manifest(partnerId, { name_hi: 'LIC' }));
    expect(r.statusCode).toBe(422);
    const e = errOf(r);
    expect(e.code).toBe('module.manifest_invalid');
    expect((e.details?.['issues'] as { path: string[] }[]).map((i) => i.path)).toEqual([['name_hi']]);
    expect((await moduleAudit(p)).map((a) => a.action).filter((a) => a.startsWith('module.'))).toEqual([
      'module.authored',
      'module.authored_rolled_back',
    ]);
    expect(await moduleEvents(p)).toEqual([]);
  });

  // Review round 1, RP10. `JSON.stringify` cannot produce Infinity, so the body is sent as RAW text: `1e999` parses to
  // Infinity, which `z.number()` accepts but the audit-intent hash (canonical JSON) cannot serialise — it used to throw
  // while the intent arguments were built, a 500 with no audit line, where the domain's own rule answers 422.
  it('RP10: a non-finite slot_capacity (raw 1e999) → 422 module.manifest_invalid at slot_capacity, ⛔ a 500, with the intent + _rolled_back pair', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const raw = JSON.stringify(manifest(partnerId)).replace('"slot_capacity":10', '"slot_capacity":1e999');
    expect(raw).toContain('1e999');
    const r = await client.inject({
      method: 'POST',
      url: M(p),
      headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
      payload: raw,
    });
    expect(r.statusCode, r.body).toBe(422);
    const e = errOf(r);
    expect(e.code).toBe('module.manifest_invalid');
    expect((e.details?.['issues'] as { path: string[] }[]).map((i) => i.path)).toContainEqual(['slot_capacity']);
    expect((await moduleAudit(p)).map((a) => a.action).filter((a) => a.startsWith('module.'))).toEqual([
      'module.authored',
      'module.authored_rolled_back',
    ]);
    expect(await moduleEvents(p)).toEqual([]);
  });

  it('AC5: valid_until ≤ now() → 422 module.window_ended', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const now = Date.now();
    const r = await post(client, M(p), manifest(partnerId, {
      valid_from: new Date(now - 2 * HOUR_MS).toISOString(),
      valid_until: new Date(now - HOUR_MS).toISOString(),
    }));
    expect(r.statusCode).toBe(422);
    expect(errOf(r).code).toBe('module.window_ended');
  });

  // ── AC6 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC6: publish without step-up → 403 auth.step_up_required (action module_publish), NO event', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const id = await authored(author.client, p, await partner(author.client, p));
    const r = await post(publisher.client, `${M(p)}/${id}/publish`, TICKS);
    expect(r.statusCode).toBe(403);
    expect(errOf(r)).toMatchObject({ code: 'auth.step_up_required', details: { action: 'module_publish' } });
    expect((await moduleEvents(p)).map((e) => e.event_type)).toEqual(['module.authored']);
  });

  it('AC6: a missing or false tick → 400', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const id = await authored(author.client, p, await partner(author.client, p));
    await elevate(publisher.client, 'module_publish');
    for (const k of Object.keys(TICKS)) {
      expect((await post(publisher.client, `${M(p)}/${id}/publish`, { ...TICKS, [k]: false })).statusCode).toBe(400);
      const without: Json = { ...TICKS };
      delete without[k];
      expect((await post(publisher.client, `${M(p)}/${id}/publish`, without)).statusCode).toBe(400);
    }
    expect(await publicationRows(id)).toEqual([]);
  });

  it('AC6: the AUTHOR (with step-up) → 409 tone_review.required + a publish_blocked line carrying the Pariwar; NO event, NO row', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const id = await authored(author.client, p, await partner(author.client, p));
    await elevate(author.client, 'module_publish');
    const r = await post(author.client, `${M(p)}/${id}/publish`, TICKS);
    expect(r.statusCode).toBe(409);
    expect(errOf(r).code).toBe('tone_review.required');
    const blocked = td.toneReviewAuditSink.ofType('tone_review.publish_blocked').filter((ev) => ev.resourceLocator === `module/${id}`);
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ pariwarId: p, actorId: author.userId });
    expect((await moduleEvents(p)).map((e) => e.event_type)).toEqual(['module.authored']);
    expect(await publicationRows(id)).toEqual([]);
    expect((await moduleAudit(p)).map((a) => a.action).filter((a) => a.startsWith('module.'))).toEqual(['module.authored']);
  });

  it('AC6 / I4: a module whose genesis actor_id is NULL (system-authored) is refused the same way (409), NO row', async () => {
    const p = freshPariwar();
    const admin = await pariwarAdmin(p);
    const partnerId = await partner(admin.client, p);
    const id = idsDomain.moduleId(randomUUID());
    const scopeTx = await openScopeTx(deps, p);
    try {
      await marketplace.authorModule(scopeTx.client, {
        pariwarId: idsDomain.pariwarId(p),
        moduleId: id,
        auditId: randomUUID(),
        actor: 'system',
        actorId: null,
        manifest: manifest(partnerId, { branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null } }),
      });
      await closeScopeTx(scopeTx, true);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
    expect((await td.pool.query('SELECT actor_id FROM events_log WHERE stream_id = $1', [id])).rows[0]).toEqual({ actor_id: null });
    // The detail page fails CLOSED: an unknown author reads as the viewer's own.
    const detail = json(await admin.client.inject({ method: 'GET', url: `${M(p)}/${id}` }));
    expect(detail['authored_by_viewer']).toBe(true);
    expect(detail['author_display_name']).toBe(UNNAMED_ADMIN_LABEL);

    await elevate(admin.client, 'module_publish');
    const r = await post(admin.client, `${M(p)}/${id}/publish`, TICKS);
    expect(r.statusCode).toBe(409);
    expect(errOf(r).code).toBe('tone_review.required');
    expect(td.toneReviewAuditSink.ofType('tone_review.publish_blocked').filter((ev) => ev.resourceLocator === `module/${id}`)).toHaveLength(1);
    expect(await publicationRows(id)).toEqual([]);
  });

  it.each([
    ['valid_from ≤ now → module.activated / active', -HOUR_MS, 'module.activated', 'active'],
    ['valid_from > now → module.scheduled / scheduled', DAY_MS, 'module.scheduled', 'scheduled'],
  ] as const)('AC6: a second admin publishes — %s; ONE publication row (QE4 hash); audit action = event type; a sign-off line', async (_n, fromOffset, eventType, state) => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const partnerId = await partner(author.client, p, 'LIC India', 'भारतीय जीवन बीमा');
    const id = await authored(author.client, p, partnerId, { valid_from: new Date(Date.now() + fromOffset).toISOString() });
    await elevate(publisher.client, 'module_publish');
    const key = randomUUID();
    const r = await post(publisher.client, `${M(p)}/${id}/publish`, TICKS, key);
    expect(r.statusCode, r.body).toBe(200);
    expect(json(r)).toEqual({ module_id: id, state, published_event_type: eventType });
    // A replay with the SAME key returns the recorded result and writes nothing more.
    expect(json(await post(publisher.client, `${M(p)}/${id}/publish`, TICKS, key))).toEqual(json(r));

    const expectedHash = marketplace.moduleToneContentHash(
      { nameEn: 'HDFC home loan', nameHi: 'एचडीएफसी गृह ऋण', descriptionEn: 'A home-loan offer for members.', descriptionHi: 'सदस्यों के लिए गृह ऋण प्रस्ताव।' },
      { displayNameEn: 'LIC India', displayNameHi: 'भारतीय जीवन बीमा' },
    );
    const rows = await publicationRows(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pariwar_id: p,
      published_event_type: eventType,
      tone_signoff_content_hash: expectedHash,
      reviewed_by_actor_id: publisher.userId,
      hindi_reviewed: true,
      partner_agreement_confirmed: true,
    });
    expect((await moduleEvents(p)).filter((e) => e.stream_id === id).map((e) => [e.event_type, e.actor_id])).toEqual([
      ['module.authored', author.userId],
      [eventType, publisher.userId],
    ]);
    const lines = (await moduleAudit(p)).filter((a) => a.resource_locator === `module/${id}`);
    expect(lines.map((a) => [a.action, a.actor_id])).toEqual([
      ['module.authored', author.userId],
      [eventType, publisher.userId],
    ]);
    // The publication's audit_id IS the publish intent line.
    const audit = await td.pool.query(`SELECT audit_id FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2`, [p, eventType]);
    expect(rows[0]!['audit_id']).toBe((audit.rows[0] as { audit_id: string }).audit_id);
    const signoffs = td.toneReviewAuditSink.ofType('tone_review.signoff').filter((ev) => ev.resourceLocator === `module/${id}`);
    expect(signoffs).toHaveLength(1);
    expect(signoffs[0]).toMatchObject({ contentHash: expectedHash, actorId: publisher.userId, pariwarId: p });
  });

  it('AC6: pre-check refusals (NO audit line): non-draft → 409 not_draft; another Pariwar\'s id → 404 not_found; now ≥ valid_until → 409 window_ended', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const partnerId = await partner(author.client, p);
    const live = await authored(author.client, p, partnerId);
    // Review round 1, RP17: 3 s on the CLIENT clock (was 1.5 s) so a slow author call under load cannot answer 422 before the test starts.
    const closing = await authored(author.client, p, partnerId, { valid_until: new Date(Date.now() + 3000).toISOString() });
    await elevate(publisher.client, 'module_publish');
    expect((await post(publisher.client, `${M(p)}/${live}/publish`, TICKS)).statusCode).toBe(200);
    const before = (await moduleAudit(p)).length;

    const again = await post(publisher.client, `${M(p)}/${live}/publish`, TICKS);
    expect(again.statusCode).toBe(409);
    expect(errOf(again).code).toBe('module.not_draft');

    const q = freshPariwar();
    const qa = await pariwarAdmin(q);
    const qModule = await authored(qa.client, q, await partner(qa.client, q));
    const foreign = await post(publisher.client, `${M(p)}/${qModule}/publish`, TICKS);
    expect(foreign.statusCode).toBe(404);
    expect(errOf(foreign).code).toBe('module.not_found');

    await new Promise((resolve) => setTimeout(resolve, 3200));
    const ended = await post(publisher.client, `${M(p)}/${closing}/publish`, TICKS);
    expect(ended.statusCode).toBe(409);
    expect(errOf(ended).code).toBe('module.window_ended');

    expect((await moduleAudit(p)).length).toBe(before);
    expect(await publicationRows(closing)).toEqual([]);
  });

  // Review round 1, RP5 (checklist family 2 — concurrency proven live). The route's `getModule` pre-read takes NO lock;
  // the command's `FOR UPDATE` does. So a loser is stopped either at the pre-read (the winner already committed) or at
  // the lock (it re-reads the state) — and which one a given race hits is timing. Every assertion below therefore holds
  // for BOTH timings: the loser's code, the end state, the single publication row / event / sign-off, and the audit
  // balance (intent lines minus `_rolled_back` lines = the one that published). Several rounds make a lock-path race likely.
  it('AC6 / checklist 2: two admins publish the SAME draft at once → ONE 200 and ONE 409 module.not_draft; ONE publication row, ONE publish event, ONE sign-off', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const first = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const second = await pariwarAdmin(p, 'Meena (Pariwar Admin)');
    const partnerId = await partner(author.client, p);
    for (let round = 0; round < 3; round += 1) {
      const id = await authored(author.client, p, partnerId);
      await elevate(first.client, 'module_publish');
      await elevate(second.client, 'module_publish');
      const results = await Promise.all([first, second].map((a) => post(a.client, `${M(p)}/${id}/publish`, TICKS)));
      expect(results.map((r) => r.statusCode).sort(), results.map((r) => r.body).join(' | ')).toEqual([200, 409]);
      expect(errOf(results.find((r) => r.statusCode === 409)!).code).toBe('module.not_draft');
      const winner = [first, second][results.findIndex((r) => r.statusCode === 200)]!;

      const rows = await publicationRows(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ pariwar_id: p, published_event_type: 'module.activated', reviewed_by_actor_id: winner.userId });
      expect((await moduleEvents(p)).filter((e) => e.stream_id === id).map((e) => [e.event_type, e.actor_id])).toEqual([
        ['module.authored', author.userId],
        ['module.activated', winner.userId],
      ]);
      const lines = (await moduleAudit(p)).filter((a) => a.resource_locator === `module/${id}`);
      const intents = lines.filter((a) => a.action === 'module.activated').length;
      const rolledBack = lines.filter((a) => a.action === 'module.activated_rolled_back').length;
      expect(intents - rolledBack).toBe(1);
      expect(td.toneReviewAuditSink.ofType('tone_review.signoff').filter((ev) => ev.resourceLocator === `module/${id}`)).toHaveLength(1);
    }
  });

  it('AC6 / AC7 / checklist 2: publish and withdraw of the same draft at once → a consistent end state (a publication row IFF the publish won; no gap in the stream)', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const partnerId = await partner(author.client, p);
    for (let round = 0; round < 4; round += 1) {
      const id = await authored(author.client, p, partnerId);
      await elevate(publisher.client, 'module_publish');
      const [pub, wd] = await Promise.all([
        post(publisher.client, `${M(p)}/${id}/publish`, TICKS),
        author.client.inject({ method: 'POST', url: `${M(p)}/${id}/withdraw`, ...EMPTY_JSON, headers: { ...EMPTY_JSON.headers, 'idempotency-key': randomUUID() } }),
      ]);
      // Withdraw is legal from a draft AND from an active module, so it succeeds whichever of the two takes the lock first.
      expect(wd.statusCode, wd.body).toBe(200);
      expect([200, 409], pub.body).toContain(pub.statusCode);
      if (pub.statusCode === 409) expect(errOf(pub).code).toBe('module.not_draft');
      const published = pub.statusCode === 200;
      expect(await publicationRows(id)).toHaveLength(published ? 1 : 0);
      expect((await moduleEvents(p)).filter((e) => e.stream_id === id).map((e) => e.event_type)).toEqual(
        published ? ['module.authored', 'module.activated', 'module.archived'] : ['module.authored', 'module.archived'],
      );
      const row = (await td.pool.query('SELECT current_state FROM marketplace_modules WHERE module_id = $1', [id])).rows[0];
      expect(row).toEqual({ current_state: 'archived' });
    }
  });

  // Review round 1, RP14 (checklist family 8). The race test's "a publication row IFF published" stays green if the row's
  // insert is moved OUTSIDE the publish transaction; this does not. A row pre-seeded for a DRAFT makes
  // `recordModulePublication` hit the module_id primary key (23505) AFTER the command has already written its event and its
  // state change — so, if the three share one transaction, the event and the state change are rolled back with it.
  it('RP14 / family 8: the publication row is part of the publish transaction — a row that cannot be written leaves the module a DRAFT with ⛔ publish event', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const id = await authored(author.client, p, await partner(author.client, p));
    const seededReviewer = randomUUID();
    await td.pool.query(
      `INSERT INTO marketplace_module_publications
         (module_id, pariwar_id, published_event_type, tone_signoff_content_hash, reviewed_by_actor_id, hindi_reviewed, partner_agreement_confirmed, audit_id)
       VALUES ($1, $2, 'module.activated', $3, $4, true, true, $5)`,
      [id, p, 'a'.repeat(64), seededReviewer, randomUUID()],
    );
    await elevate(publisher.client, 'module_publish');
    const r = await post(publisher.client, `${M(p)}/${id}/publish`, TICKS);
    expect(r.statusCode, r.body).toBe(409);
    expect(errOf(r).code).toBe('module.already_published');

    expect((await td.pool.query('SELECT current_state FROM marketplace_modules WHERE module_id = $1', [id])).rows[0]).toEqual({ current_state: 'draft' });
    expect((await moduleEvents(p)).filter((e) => e.stream_id === id).map((e) => e.event_type)).toEqual(['module.authored']);
    const lines = (await moduleAudit(p)).filter((a) => a.resource_locator === `module/${id}`).map((a) => a.action);
    expect(lines).toEqual(['module.authored', 'module.activated', 'module.activated_rolled_back']);
    const rows = await publicationRows(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reviewed_by_actor_id: seededReviewer }); // the seeded row, untouched
    expect(td.toneReviewAuditSink.ofType('tone_review.signoff').filter((ev) => ev.resourceLocator === `module/${id}`)).toHaveLength(0);
  });

  // ── AC7 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC7: withdraw (body {}, ⛔ step-up) archives a draft, a scheduled and an active module; archived → 409; another Pariwar → 404', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p);
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const partnerId = await partner(author.client, p);
    const draft = await authored(author.client, p, partnerId);
    const scheduled = await authored(author.client, p, partnerId, { valid_from: new Date(Date.now() + DAY_MS).toISOString() });
    const active = await authored(author.client, p, partnerId);
    await elevate(publisher.client, 'module_publish');
    expect(json(await post(publisher.client, `${M(p)}/${scheduled}/publish`, TICKS))['state']).toBe('scheduled');
    expect(json(await post(publisher.client, `${M(p)}/${active}/publish`, TICKS))['state']).toBe('active');

    // The AUTHOR withdraws (no step-up held for this client) — the bodyless write sent the way the admin client sends it.
    for (const id of [draft, scheduled, active]) {
      const r = await author.client.inject({ method: 'POST', url: `${M(p)}/${id}/withdraw`, ...EMPTY_JSON, headers: { ...EMPTY_JSON.headers, 'idempotency-key': randomUUID() } });
      expect(r.statusCode, r.body).toBe(200);
      expect(json(r)).toEqual({ module_id: id, state: 'archived' });
      const row = (await td.pool.query('SELECT current_state, archive_reason FROM marketplace_modules WHERE module_id = $1', [id])).rows[0];
      expect(row).toEqual({ current_state: 'archived', archive_reason: 'trustee_archived' });
      // Review round 1, RP15: the audit line AND the event name the withdrawing admin; the event is `operator`, reason `trustee_archived`.
      expect((await moduleAudit(p)).filter((a) => a.resource_locator === `module/${id}` && a.action === 'module.archived')).toEqual([
        { action: 'module.archived', resource_locator: `module/${id}`, actor_id: author.userId },
      ]);
      const archived = (await td.pool.query(`SELECT actor_id, payload FROM events_log WHERE stream_id = $1 AND event_type = 'module.archived'`, [id])).rows[0] as {
        actor_id: string;
        payload: Json;
      };
      expect(archived.actor_id).toBe(author.userId);
      expect(archived.payload['actor']).toBe('operator');
    }
    const twice = await post(author.client, `${M(p)}/${draft}/withdraw`, {});
    expect(twice.statusCode).toBe(409);
    expect(errOf(twice).code).toBe('module.illegal_transition');

    const q = freshPariwar();
    const qa = await pariwarAdmin(q);
    const qModule = await authored(qa.client, q, await partner(qa.client, q));
    const foreign = await post(author.client, `${M(p)}/${qModule}/withdraw`, {});
    expect(foreign.statusCode).toBe(404);
    expect(errOf(foreign).code).toBe('module.not_found');
    expect((await td.pool.query('SELECT current_state FROM marketplace_modules WHERE module_id = $1', [qModule])).rows[0]).toEqual({ current_state: 'draft' });

    expect(json(await author.client.inject({ method: 'GET', url: `${M(p)}/${active}` }))['lead_count']).toBe(0);
  });

  // ── AC8 ─────────────────────────────────────────────────────────────────────────────────────────────

  it('AC8: three modules in a Pariwar no other leg writes page with limit=2 into two pages, no duplicates, next_cursor null last', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const partnerId = await partner(client, p);
    const ids = [await authored(client, p, partnerId), await authored(client, p, partnerId), await authored(client, p, partnerId)];
    const page1 = json(await client.inject({ method: 'GET', url: `${M(p)}?limit=2` }));
    const items1 = page1['items'] as { module_id: string }[];
    expect(items1).toHaveLength(2);
    expect(typeof page1['next_cursor']).toBe('string');
    const page2 = json(await client.inject({ method: 'GET', url: `${M(p)}?limit=2&cursor=${encodeURIComponent(page1['next_cursor'] as string)}` }));
    const items2 = page2['items'] as { module_id: string }[];
    expect(items2).toHaveLength(1);
    expect(page2['next_cursor']).toBeNull();
    const seen = [...items1, ...items2].map((i) => i.module_id);
    expect(new Set(seen).size).toBe(3);
    expect([...seen].sort()).toEqual([...ids].sort());
    // Newest first: the last authored is first.
    expect(seen[0]).toBe(ids[2]);
    // The state filter.
    expect(json(await client.inject({ method: 'GET', url: `${M(p)}?state=active` }))['items']).toEqual([]);
    expect((await client.inject({ method: 'GET', url: `${M(p)}?limit=201` })).statusCode).toBe(400);
  });

  it('AC8: a malformed cursor → 400 module.cursor_invalid (never a 500)', async () => {
    const p = freshPariwar();
    const { client } = await pariwarAdmin(p);
    const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
    const m = randomUUID();
    const good = b64(JSON.stringify({ c: '2026-11-01 05:00:00.123456+00', m }));
    const cursors = [
      'not base64 at all!',
      b64('{not json'),
      `${Buffer.from(JSON.stringify({ c: '2026-11-01 05:00:00+00', m }), 'utf8').toString('base64')}==`.replace(/=+$/, '=='),
      good.slice(0, 4) + '+' + good.slice(5),
      good.slice(0, 4) + '/' + good.slice(5),
      b64(`{"c":"2026-11-01 05:00:00+00","c":"2026-11-02 05:00:00+00","m":"${m}"}`),
      b64(JSON.stringify({ c: 'infinity', m })),
      b64(JSON.stringify({ c: '2026-13-01 00:00:00+00', m })),
      b64(JSON.stringify({ c: '2026-11-01 05:00:00+00', m: m.toUpperCase() })),
      '',
      'a'.repeat(300),
    ];
    for (const cursor of cursors) {
      const r = await client.inject({ method: 'GET', url: `${M(p)}?cursor=${encodeURIComponent(cursor)}` });
      expect(r.statusCode, cursor).toBe(400);
      expect(errOf(r).code, cursor).toBe('module.cursor_invalid');
    }
    // The well-formed one is accepted (an empty page past it).
    expect((await client.inject({ method: 'GET', url: `${M(p)}?cursor=${good}` })).statusCode).toBe(200);
  });

  it('AC8: the detail — admin shape, partner names, author display name, authored_by_viewer per viewer, publication + reviewer, lead_count; tenant-isolated', async () => {
    const p = freshPariwar();
    const author = await pariwarAdmin(p, 'Meera (Pariwar Admin)');
    const publisher = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const partnerId = await partner(author.client, p, 'Health Camp Trust', 'स्वास्थ्य शिविर');
    const id = await authored(author.client, p, partnerId, { scope_filter: { version: 1, scope: 'members-all' }, slot_capacity: null });

    const draft = json(await author.client.inject({ method: 'GET', url: `${M(p)}/${id}` }));
    expect(draft).toMatchObject({
      module_id: id,
      pariwar_id: p,
      partner_id: partnerId,
      partner_display_name_en: 'Health Camp Trust',
      partner_display_name_hi: 'स्वास्थ्य शिविर',
      current_state: 'draft',
      archive_reason: null,
      slot_capacity: null,
      slots_remaining: null,
      lead_handoff_url: 'https://leads.partner.example/hdfc/twt',
      lead_handoff_signing_key_secret_name: 'marketplace-hdfc-signing-key',
      branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
      eligibility_filter: { version: 1, clauses: [] },
      scope_filter: { version: 1, scope: 'members-all' },
      author_display_name: 'Meera (Pariwar Admin)',
      authored_by_viewer: true,
      publication: null,
      lead_count: 0,
    });
    expect(json(await publisher.client.inject({ method: 'GET', url: `${M(p)}/${id}` }))['authored_by_viewer']).toBe(false);

    await elevate(publisher.client, 'module_publish');
    expect((await post(publisher.client, `${M(p)}/${id}/publish`, TICKS)).statusCode).toBe(200);
    const live = json(await author.client.inject({ method: 'GET', url: `${M(p)}/${id}` }));
    expect(live['current_state']).toBe('active');
    expect(live['publication']).toMatchObject({
      published_event_type: 'module.activated',
      reviewer_display_name: 'Ravi (Pariwar Admin)',
      hindi_reviewed: true,
      partner_agreement_confirmed: true,
      tone_signoff_content_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });

    // A display name not recorded → the fallback label, NEVER a 500.
    await td.pool.query('UPDATE users SET display_name = NULL WHERE id = ANY($1)', [[author.userId, publisher.userId]]);
    const unnamed = await author.client.inject({ method: 'GET', url: `${M(p)}/${id}` });
    expect(unnamed.statusCode).toBe(200);
    expect(json(unnamed)['author_display_name']).toBe(UNNAMED_ADMIN_LABEL);
    expect((json(unnamed)['publication'] as Json)['reviewer_display_name']).toBe(UNNAMED_ADMIN_LABEL);

    // Tenant isolation: P's module through Q's route is 404, and Q's list never holds it.
    const q = freshPariwar();
    const qa = await pariwarAdmin(q);
    const r = await qa.client.inject({ method: 'GET', url: `${M(q)}/${id}` });
    expect(r.statusCode).toBe(404);
    expect(errOf(r).code).toBe('module.not_found');
    expect((json(await qa.client.inject({ method: 'GET', url: M(q) }))['items'] as { module_id: string }[]).some((i) => i.module_id === id)).toBe(false);
    expect((await author.client.inject({ method: 'GET', url: `${M(p)}/${randomUUID()}` })).statusCode).toBe(404);
  });
});

// ── AC13 — the route-table leg (hermetic: the OpenAPI surface needs no DB) ─────────────────────────────────────────────────
describe('Story 12.2 — the module routes on the forced-pagination surface (AC13, G7)', () => {
  it('both list GETs declare a 200 schema (so the gate EXAMINES them) and a bounded limit (max 200); every route is in the table', async () => {
    const t = await createTestApp();
    try {
      type Param = { name?: string; in?: string; schema?: { maximum?: number } };
      type Op = { parameters?: Param[]; responses?: Record<string, { content?: Record<string, { schema?: { type?: string; properties?: Record<string, { type?: string }> } }> }> };
      const doc = t.app.swagger() as { paths: Record<string, Record<string, Op>> };
      for (const path of ['/api/v1/p/{pariwarId}/modules', '/api/v1/p/{pariwarId}/modules/partners']) {
        const get = doc.paths[path]?.['get'];
        expect(get, path).toBeDefined();
        const schema = get!.responses?.['200']?.content?.['application/json']?.schema;
        expect(schema?.type, path).toBe('object');
        expect(schema?.properties?.['items']?.type, path).toBe('array');
        const limit = (get!.parameters ?? []).find((p) => p.in === 'query' && p.name === 'limit');
        expect(limit?.schema?.maximum, path).toBe(200);
      }
      const base = '/api/v1/p/{pariwarId}/modules';
      expect(Object.keys(doc.paths[`${base}/scope-options`] ?? {})).toContain('get');
      expect(Object.keys(doc.paths[`${base}/partners`] ?? {}).sort()).toEqual(['get', 'post']);
      expect(Object.keys(doc.paths[base] ?? {}).sort()).toEqual(['get', 'post']);
      expect(Object.keys(doc.paths[`${base}/{moduleId}`] ?? {})).toContain('get');
      expect(Object.keys(doc.paths[`${base}/{moduleId}/publish`] ?? {})).toContain('post');
      expect(Object.keys(doc.paths[`${base}/{moduleId}/withdraw`] ?? {})).toContain('post');
    } finally {
      await teardown(t);
    }
  });
});
