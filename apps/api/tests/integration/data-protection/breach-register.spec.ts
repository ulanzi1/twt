// The personal data breach register — `/api/v1/data-protection/…` end to end (Story 14.3; AC5–AC7, AC10, AC11; decision
// `2026-11-20-467`). Drives the real Fastify app with an authenticated Super Admin session.
//
// ⚠ `breach_incidents`, `breach_incident_entries`, `audit_integrity_checks` and `audit_log_entries` are append-only: every row
// this spec writes STAYS in the database. Assertions therefore key on this spec's own rows (by incident id, check id or actor id),
// never on absolute counts. `role_grants`, `users` and `members` rows are deleted afterwards.

import { randomUUID } from 'node:crypto';

import { BREACH_ENTRY_KINDS, type BreachEntryKind, type BreachIncidentDetailResponse, type BreachIncidentListResponse, type BreachMembersOnRecordResponse, type BreachSignalListResponse } from '@twt/contracts';
import { idempotency } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
interface ErrorBody {
  error: { code: string; details?: Record<string, unknown> };
}

const BASE = '/api/v1/data-protection';
const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();
const key = () => ({ 'idempotency-key': randomUUID() });

/** One VALID and one INVALID payload per kind (AC6 — "one test per kind"). */
function payloads(): Record<BreachEntryKind, { ok: Record<string, unknown>; bad: Record<string, unknown> }> {
  const past = iso(Date.now() - HOUR);
  const future = iso(Date.now() + HOUR);
  const assessment = {
    nature: 'A file went to a wrong address.',
    extent: 'One Pariwar.',
    location: 'Staff email.',
    dataCategories: ['identity', 'contact'],
    estimatedAffected: { count: 12 },
    affectedPariwarIds: [],
    likelyConsequences: 'Unwanted calls.',
    safetyMeasuresForPrincipals: 'Share no code with a caller.',
    contactForPrincipals: 'The helpline.',
  };
  return {
    assessment: { ok: assessment, bad: { ...assessment, dataCategories: ['passwords'] } },
    timeline_event: { ok: { occurredAt: past, description: 'It was sent.' }, bad: { occurredAt: future, description: 'Not yet.' } },
    mitigation: { ok: { measures: 'Asked for deletion.', status: 'implemented' }, bad: { measures: 'x', status: 'done' } },
    cause_findings: { ok: { broadFacts: 'A mistyped address.', findingsOnPersonResponsible: '' }, bad: { broadFacts: '', findingsOnPersonResponsible: '' } },
    remedial: { ok: { measures: 'A second check before sending.' }, bad: { measures: '  ' } },
    principals_notice_recorded: { ok: { sentAt: past, channel: 'Phone call', reachedCount: 11, note: '' }, bad: { sentAt: past, channel: 'Phone call', reachedCount: -1, note: '' } },
    board_initial_recorded: { ok: { sentAt: past, reference: 'B-1' }, bad: { sentAt: future, reference: 'B-1' } },
    board_report_recorded: { ok: { sentAt: past, reference: 'B-2' }, bad: { sentAt: past } },
    board_extension_recorded: { ok: { grantedUntil: iso(Date.now() + 200 * HOUR), reference: 'E-1' }, bad: { grantedUntil: 'next week', reference: 'E-1' } },
    cert_in_report_recorded: { ok: { sentAt: past, reference: 'C-1' }, bad: { sentAt: past, reference: 'r'.repeat(201) } },
    owner_review: { ok: { note: 'Reviewed.' }, bad: { note: '' } },
    signoff_recorded: { ok: { signers: ['Trustee One', 'Trustee Two'], signedOn: '2026-01-05', note: '' }, bad: { signers: ['Trustee One', ' trustee  one '], signedOn: '2026-01-05', note: '' } },
    closed: { ok: { summary: 'Done.' }, bad: { summary: 's'.repeat(2001) } },
    note: { ok: { text: 'A note.' }, bad: { text: 'ok', extra: true } },
  };
}

describe.skipIf(!hasDatabase)('the breach register API (Story 14.3)', { timeout: 60_000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdMemberIds: string[] = [];
  /** A named global Super Admin shared by the legs that only need "someone who may". */
  let sa: { client: Client; userId: string };

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    sa = await superAdmin('Asha Verma');
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdMemberIds.length > 0) await c.query(`DELETE FROM members WHERE member_id = ANY($1::uuid[])`, [createdMemberIds]);
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
      await td.pool.end();
    }
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `admin-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    const client = makeClient(app);
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 },
    };
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'browser' }, enrollmentToken: token } });
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, role: string, dimension: 'global' | 'pariwar'): Promise<void> {
    const pariwarId = randomUUID();
    await td.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dimension, dimension === 'global' ? null : pariwarId],
    );
  }

  async function superAdmin(displayName: string | null): Promise<{ client: Client; userId: string }> {
    const who = await authenticate();
    await grant(who.userId, 'super_admin', 'global');
    if (displayName !== null) await td.pool.query(`UPDATE users SET display_name = $2 WHERE id = $1`, [who.userId, displayName]);
    return who;
  }

  /** Audit lines whose action starts with `actionPrefix` and whose locator starts with `locatorPrefix`. */
  async function auditActions(actionPrefix: string, locatorPrefix: string): Promise<string[]> {
    const { rows } = await td.pool.query<{ action: string }>(
      `SELECT action FROM audit_log_entries WHERE action LIKE $1 AND resource_locator LIKE $2 ORDER BY seq`,
      [`${actionPrefix}%`, `${locatorPrefix}%`],
    );
    return rows.map((r) => r.action);
  }

  const openBody = (over: Record<string, unknown> = {}) => ({
    isRehearsal: true,
    title: `Spec rehearsal ${randomUUID().slice(0, 8)}`,
    becameAwareAt: iso(Date.now() - 2 * HOUR),
    detectionSource: 'other',
    ...over,
  });

  async function open(client: Client = sa.client, over: Record<string, unknown> = {}): Promise<BreachIncidentDetailResponse> {
    const res = await client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: openBody(over), headers: key() });
    expect(res.statusCode, res.body).toBe(200);
    return res.json<BreachIncidentDetailResponse>();
  }

  const appendTo = (incidentId: string, kind: string, payload: Record<string, unknown>, headers: Record<string, string> = key(), client: Client = sa.client) =>
    client.inject({ method: 'POST', url: `${BASE}/breaches/${incidentId}/entries`, payload: { kind, payload }, headers });

  // The POSTs carry VALID bodies: the guards are `preHandler`s (the repo's convention), so body validation answers first and an
  // empty body would be a 400 from the schema, not the gate under test.
  const routes = (): { method: 'GET' | 'POST'; url: string; payload?: object }[] => [
    { method: 'GET', url: `${BASE}/breaches` },
    { method: 'POST', url: `${BASE}/breaches`, payload: openBody() },
    { method: 'GET', url: `${BASE}/breaches/${randomUUID()}` },
    { method: 'POST', url: `${BASE}/breaches/${randomUUID()}/entries`, payload: { kind: 'note', payload: { text: 'x' } } },
    { method: 'GET', url: `${BASE}/signals` },
    { method: 'GET', url: `${BASE}/members-on-record` },
  ];

  it('⭐ every route: no admin session ⇒ 401 `auth.session_required`', async () => {
    const anon = makeClient(app);
    for (const route of routes()) {
      const res = await anon.inject({ ...route, headers: key() });
      expect(res.statusCode, route.url).toBe(401);
      expect(res.json<ErrorBody>().error.code).toBe('auth.session_required');
    }
  });

  it('⭐ every route: a session WITHOUT the grant ⇒ 403, with an `authz.denied` event — for no role at all, a Pariwar Admin, and a global Auditor', async () => {
    const none = await authenticate();
    const pa = await authenticate();
    await grant(pa.userId, 'pariwar_admin', 'pariwar');
    const auditor = await authenticate();
    await grant(auditor.userId, 'auditor', 'global');
    for (const who of [none, pa, auditor]) {
      const before = td.auditSink.ofType('authz.denied').length;
      const all = routes();
      for (const route of all) {
        const res = await who.client.inject({ ...route, headers: key() });
        expect(res.statusCode, `${route.method} ${route.url}`).toBe(403);
      }
      expect(td.auditSink.ofType('authz.denied').length - before).toBe(all.length);
      // …and a refused caller wrote nothing.
      expect((await td.pool.query(`SELECT 1 FROM breach_incidents WHERE opened_by = $1`, [who.userId])).rowCount).toBe(0);
    }
  });

  describe('open (AC5)', () => {
    it('⭐ 200 with the detail; ONE row; ONE `data_protection.breach.opened` line; the same key twice ⇒ ONE incident and the SAME response', async () => {
      const headers = key();
      const body = openBody({ title: '  Padded title  ' });
      const first = await sa.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: body, headers });
      expect(first.statusCode, first.body).toBe(200);
      const dto = first.json<BreachIncidentDetailResponse>();
      expect(dto.incident).toMatchObject({ title: 'Padded title', isRehearsal: true, detectionSource: 'other', detectionSignalRef: null, openedByDisplay: 'Asha Verma' });
      expect(dto.incident).not.toHaveProperty('openedBy');
      expect(dto.entries).toEqual([]);
      expect(dto.view).toMatchObject({ status: 'open', isRehearsal: true, boardReportOverdue: false, latestAssessment: null });
      expect(dto.view.boardReportDueAt).toBe(iso(Date.parse(body.becameAwareAt) + 72 * HOUR));

      const again = await sa.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: body, headers });
      expect(again.statusCode).toBe(200);
      expect(again.json()).toEqual(dto);

      const rows = await td.pool.query(`SELECT incident_id, opened_by, audit_id FROM breach_incidents WHERE title = 'Padded title' AND opened_by = $1`, [sa.userId]);
      expect(rows.rows.map((r: { incident_id: string }) => r.incident_id)).toEqual([dto.incident.incidentId]);
      const locator = `global/data-protection/breaches/${dto.incident.incidentId}`;
      expect(await auditActions('data_protection.breach.opened', locator)).toEqual(['data_protection.breach.opened']);
      // …and the row carries that audit line's id.
      const line = await td.pool.query<{ audit_id: string; pariwar_id: string }>(
        `SELECT audit_id, pariwar_id FROM audit_log_entries WHERE action = 'data_protection.breach.opened' AND resource_locator LIKE $1`,
        [`${locator}%`],
      );
      expect((rows.rows[0] as { audit_id: string }).audit_id).toBe(line.rows[0]!.audit_id);
    });

    it('a missing, blank or absent `Idempotency-Key` ⇒ 400 `breach.idempotency_key_required`, and nothing is written', async () => {
      const title = `No key ${randomUUID()}`;
      for (const headers of [{}, { 'idempotency-key': '   ' }] as Record<string, string>[]) {
        const res = await sa.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: openBody({ title }), headers });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorBody>().error.code).toBe('breach.idempotency_key_required');
      }
      expect((await td.pool.query(`SELECT 1 FROM breach_incidents WHERE title = $1`, [title])).rowCount).toBe(0);
    });

    it('awareness in the future, an unknown source, a blank title, a severity key, and a bodyless request are each 400', async () => {
      for (const over of [{ becameAwareAt: iso(Date.now() + HOUR) }, { detectionSource: 'gut_feeling' }, { title: '   ' }, { severity: 'minor' }]) {
        const res = await sa.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: openBody(over), headers: key() });
        expect(res.statusCode, JSON.stringify(over)).toBe(400);
      }
      expect((await sa.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: '{}', headers: { ...key(), 'content-type': 'application/json' } })).statusCode).toBe(400);
    });

    it('⭐ a NAMELESS admin ⇒ 409 `admin.display_name_missing` before any write: no row, no audit line — and the key is free to retry once named', async () => {
      const nameless = await superAdmin(null);
      const headers = key();
      const body = openBody({ title: `Nameless ${randomUUID()}` });
      for (const display of [null, '   ']) {
        await td.pool.query(`UPDATE users SET display_name = $2 WHERE id = $1`, [nameless.userId, display]);
        const res = await nameless.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: body, headers });
        expect(res.statusCode).toBe(409);
        expect(res.json<ErrorBody>().error.code).toBe('admin.display_name_missing');
      }
      expect((await td.pool.query(`SELECT 1 FROM breach_incidents WHERE opened_by = $1`, [nameless.userId])).rowCount).toBe(0);
      expect((await td.pool.query(`SELECT 1 FROM audit_log_entries WHERE actor_id = $1 AND action LIKE 'data_protection.%'`, [nameless.userId])).rowCount).toBe(0);
      await td.pool.query(`UPDATE users SET display_name = 'Now Named' WHERE id = $1`, [nameless.userId]);
      const ok = await nameless.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: body, headers });
      expect(ok.statusCode, ok.body).toBe(200);
      expect(ok.json<BreachIncidentDetailResponse>().incident.openedByDisplay).toBe('Now Named');
    });

    it('⭐ a DB CHECK violation is a 400, never a 500 — this node\'s clock ahead of the database\'s on `becameAwareAt`', async () => {
      const title = `Clock skew ${randomUUID()}`;
      const realNow = Date.now();
      // The request passes the contract's "not in the future" (judged on this node's clock) and is refused by the database's.
      const spy = vi.spyOn(Date, 'now').mockReturnValue(realNow + 2 * HOUR);
      let res: Awaited<ReturnType<Client['inject']>>;
      try {
        res = await sa.client.inject({ method: 'POST', url: `${BASE}/breaches`, payload: openBody({ title, becameAwareAt: iso(realNow + HOUR) }), headers: key() });
      } finally {
        spy.mockRestore();
      }
      expect(res.statusCode, res.body).toBe(400);
      expect(res.json<ErrorBody>().error).toMatchObject({ code: 'breach.constraint_violation', details: { constraint: 'breach_incidents_aware_before_opened_check' } });
      expect((await td.pool.query(`SELECT 1 FROM breach_incidents WHERE title = $1`, [title])).rowCount).toBe(0);
    });
  });

  describe('append (AC6)', () => {
    for (const kind of BREACH_ENTRY_KINDS) {
      it(`${kind}: a valid payload ⇒ 200 and ONE audit line; an invalid one ⇒ 400 and none`, async () => {
        const { incident } = await open();
        const { ok, bad } = payloads()[kind];
        const refused = await appendTo(incident.incidentId, kind, bad);
        expect(refused.statusCode, refused.body).toBe(400);
        const res = await appendTo(incident.incidentId, kind, ok);
        expect(res.statusCode, res.body).toBe(200);
        const dto = res.json<BreachIncidentDetailResponse>();
        expect(dto.entries.map((e) => e.kind)).toEqual([kind]);
        expect(dto.entries[0]).toMatchObject({ kind, payload: ok, recordedByDisplay: 'Asha Verma' });
        expect(dto.view.status).toBe(kind === 'closed' ? 'closed' : 'open');
        const locator = `global/data-protection/breaches/${incident.incidentId}/entries/`;
        expect(await auditActions('data_protection.breach.entry_appended', locator)).toEqual(['data_protection.breach.entry_appended']);
        const line = await td.pool.query<{ resource_locator: string }>(`SELECT resource_locator FROM audit_log_entries WHERE resource_locator LIKE $1`, [`${locator}%`]);
        expect(line.rows[0]!.resource_locator).toBe(`${locator}${dto.entries[0]!.entryId};kind=${kind}`);
      });
    }

    it('⭐ pre-checked refusals leave ZERO `entry_appended*` lines: an unknown incident (404), an extension not later than the due time (400), anything after `closed` (409)', async () => {
      const ghost = randomUUID();
      const notFound = await appendTo(ghost, 'note', { text: 'x' });
      expect(notFound.statusCode).toBe(404);
      expect(notFound.json<ErrorBody>().error.code).toBe('breach.incident_not_found');
      expect(await auditActions('data_protection.breach.entry_appended', `global/data-protection/breaches/${ghost}/`)).toEqual([]);

      const aware = Date.now() - 2 * HOUR;
      const { incident } = await open(sa.client, { becameAwareAt: iso(aware) });
      const locator = `global/data-protection/breaches/${incident.incidentId}/entries/`;
      const due = aware + 72 * HOUR;
      for (const grantedUntil of [iso(due), iso(due - HOUR)]) {
        const early = await appendTo(incident.incidentId, 'board_extension_recorded', { grantedUntil, reference: 'E' });
        expect(early.statusCode).toBe(400);
        expect(early.json<ErrorBody>().error).toMatchObject({ code: 'breach.extension_not_after_due', details: { currentDueAt: iso(due) } });
      }
      expect(await auditActions('data_protection.breach.entry_appended', locator)).toEqual([]);

      const moved = await appendTo(incident.incidentId, 'board_extension_recorded', { grantedUntil: iso(due + HOUR), reference: 'E' });
      expect(moved.statusCode, moved.body).toBe(200);
      expect(moved.json<BreachIncidentDetailResponse>().view.boardReportDueAt).toBe(iso(due + HOUR));
      expect((await appendTo(incident.incidentId, 'closed', { summary: 'Done.' })).statusCode).toBe(200);
      for (const kind of ['note', 'mitigation', 'closed'] as const) {
        const late = await appendTo(incident.incidentId, kind, payloads()[kind].ok);
        expect(late.statusCode).toBe(409);
        expect(late.json<ErrorBody>().error.code).toBe('breach.incident_closed');
      }
      // Exactly the two accepted appends were audited; no `_rolled_back` twin exists for any refusal.
      expect(await auditActions('data_protection.breach.entry_appended', locator)).toEqual([
        'data_protection.breach.entry_appended',
        'data_protection.breach.entry_appended',
      ]);
    });

    it('⭐ idempotency: a missing key ⇒ 400; the same key twice ⇒ ONE entry and the SAME response; a claimed-but-unfinished key ⇒ 409 `breach.idempotency_in_progress`', async () => {
      const { incident } = await open();
      const missing = await appendTo(incident.incidentId, 'note', { text: 'n' }, {});
      expect(missing.statusCode).toBe(400);
      expect(missing.json<ErrorBody>().error.code).toBe('breach.idempotency_key_required');

      const headers = key();
      const payload = { sentAt: iso(Date.now() - HOUR), channel: 'Phone call', reachedCount: 3, note: '' };
      const first = await appendTo(incident.incidentId, 'principals_notice_recorded', payload, headers);
      const second = await appendTo(incident.incidentId, 'principals_notice_recorded', payload, headers);
      expect(first.statusCode, first.body).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(second.json()).toEqual(first.json());
      const rows = await td.pool.query(`SELECT 1 FROM breach_incident_entries WHERE incident_id = $1`, [incident.incidentId]);
      expect(rows.rowCount).toBe(1);

      // A claim another request holds and has not finished: this one must not run the write beside it.
      const inFlight = randomUUID();
      const store = idempotency.createKeyedStore(td.pool);
      expect(await store.claim(`breach-entry:${incident.incidentId}:${inFlight}`, 300)).toBe('acquired');
      const blocked = await appendTo(incident.incidentId, 'note', { text: 'beside an in-flight claim' }, { 'idempotency-key': inFlight });
      expect(blocked.statusCode).toBe(409);
      expect(blocked.json<ErrorBody>().error.code).toBe('breach.idempotency_in_progress');
      expect((await td.pool.query(`SELECT 1 FROM breach_incident_entries WHERE incident_id = $1`, [incident.incidentId])).rowCount).toBe(1);
      await store.release(`breach-entry:${incident.incidentId}:${inFlight}`);

      // A REFUSED request frees its key: the same key then carries a valid one.
      const reused = key();
      expect((await appendTo(incident.incidentId, 'owner_review', { note: '' }, reused)).statusCode).toBe(400);
      expect((await appendTo(incident.incidentId, 'owner_review', { note: 'Reviewed.' }, reused)).statusCode).toBe(200);
    });

    it('a bodyless append, an unknown kind and a malformed incident id are each 400', async () => {
      const { incident } = await open();
      const url = `${BASE}/breaches/${incident.incidentId}/entries`;
      expect((await sa.client.inject({ method: 'POST', url, payload: '{}', headers: { ...key(), 'content-type': 'application/json' } })).statusCode).toBe(400);
      expect((await appendTo(incident.incidentId, 'severity_downgrade', {})).statusCode).toBe(400);
      expect((await appendTo('not-a-uuid', 'note', { text: 'x' })).statusCode).toBe(400);
    });
  });

  describe('read (AC7)', () => {
    it('⭐ the detail returns every entry in `entrySeq` order with the derived view, and writes ONE `data_protection.breach.viewed` line per read — none on a 404, never a `_rolled_back` twin', async () => {
      const { incident } = await open();
      await appendTo(incident.incidentId, 'assessment', payloads().assessment.ok);
      await appendTo(incident.incidentId, 'mitigation', payloads().mitigation.ok);
      await appendTo(incident.incidentId, 'principals_notice_recorded', payloads().principals_notice_recorded.ok);
      const locator = `global/data-protection/breaches/${incident.incidentId}`;
      const viewed = async () => (await auditActions('data_protection.breach.viewed', locator)).filter((a) => a.startsWith('data_protection.breach.viewed'));
      expect(await viewed()).toEqual([]);

      const res = await sa.client.inject({ method: 'GET', url: `${BASE}/breaches/${incident.incidentId}` });
      expect(res.statusCode, res.body).toBe(200);
      const dto = res.json<BreachIncidentDetailResponse>();
      expect(dto.incident.incidentId).toBe(incident.incidentId);
      expect(dto.entries.map((e) => e.kind)).toEqual(['assessment', 'mitigation', 'principals_notice_recorded']);
      const seqs = dto.entries.map((e) => BigInt(e.entrySeq));
      expect(seqs[0]! < seqs[1]! && seqs[1]! < seqs[2]!).toBe(true);
      expect(dto.view).toMatchObject({ status: 'open', principalsNoticeRecorded: true, boardInitialRecorded: false, boardReportRecorded: false });
      expect(dto.view.latestAssessment?.nature).toBe('A file went to a wrong address.');
      expect(await viewed()).toEqual(['data_protection.breach.viewed']);

      await sa.client.inject({ method: 'GET', url: `${BASE}/breaches/${incident.incidentId}` });
      expect(await viewed()).toEqual(['data_protection.breach.viewed', 'data_protection.breach.viewed']);

      const ghost = randomUUID();
      const missing = await sa.client.inject({ method: 'GET', url: `${BASE}/breaches/${ghost}` });
      expect(missing.statusCode).toBe(404);
      expect(missing.json<ErrorBody>().error.code).toBe('breach.incident_not_found');
      expect(await auditActions('data_protection.breach.viewed', `global/data-protection/breaches/${ghost}`)).toEqual([]);
      expect((await sa.client.inject({ method: 'GET', url: `${BASE}/breaches/not-a-uuid` })).statusCode).toBe(400);
    });

    it('⭐ the list is `{ items }`, newest first, bounded — and carries flags, times and the title only (⛔ narrative); it writes no audit line', async () => {
      const older = await open();
      const newer = await open();
      await appendTo(newer.incident.incidentId, 'assessment', payloads().assessment.ok);
      await appendTo(newer.incident.incidentId, 'board_initial_recorded', payloads().board_initial_recorded.ok);
      const linesBefore = (await td.pool.query(`SELECT 1 FROM audit_log_entries WHERE actor_id = $1`, [sa.userId])).rowCount;

      const res = await sa.client.inject({ method: 'GET', url: `${BASE}/breaches?limit=100` });
      expect(res.statusCode, res.body).toBe(200);
      const body = res.json<BreachIncidentListResponse>();
      expect(Object.keys(body)).toEqual(['items']);
      const ids = body.items.map((i) => i.incidentId);
      expect(ids.indexOf(newer.incident.incidentId)).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(newer.incident.incidentId)).toBeLessThan(ids.indexOf(older.incident.incidentId));
      const item = body.items.find((i) => i.incidentId === newer.incident.incidentId)!;
      expect(item).toMatchObject({ title: newer.incident.title, isRehearsal: true, status: 'open', boardInitialRecorded: true, boardReportRecorded: false, boardReportOverdue: false });
      expect(Object.keys(item).sort()).toEqual(
        ['becameAwareAt', 'boardInitialRecorded', 'boardReportDueAt', 'boardReportOverdue', 'boardReportRecorded', 'detectionSource', 'incidentId', 'isRehearsal', 'openedAt', 'principalsNoticeRecorded', 'signoffRecorded', 'status', 'title'].sort(),
      );
      expect(res.body).not.toContain('A file went to a wrong address.');

      expect((await sa.client.inject({ method: 'GET', url: `${BASE}/breaches?limit=1` })).json<BreachIncidentListResponse>().items).toHaveLength(1);
      expect((await sa.client.inject({ method: 'GET', url: `${BASE}/breaches` })).statusCode).toBe(200);
      for (const bad of ['0', '101', 'all']) expect((await sa.client.inject({ method: 'GET', url: `${BASE}/breaches?limit=${bad}` })).statusCode, bad).toBe(400);
      expect((await td.pool.query(`SELECT 1 FROM audit_log_entries WHERE actor_id = $1`, [sa.userId])).rowCount).toBe(linesBefore);
    });

    it('an OVERDUE incident reads as overdue in the list and the detail; recording the report clears it', async () => {
      const { incident } = await open(sa.client, { becameAwareAt: iso(Date.now() - 80 * HOUR) });
      const item = async () =>
        (await sa.client.inject({ method: 'GET', url: `${BASE}/breaches?limit=100` })).json<BreachIncidentListResponse>().items.find((i) => i.incidentId === incident.incidentId)!;
      expect((await item()).boardReportOverdue).toBe(true);
      const reported = await appendTo(incident.incidentId, 'board_report_recorded', payloads().board_report_recorded.ok);
      expect(reported.json<BreachIncidentDetailResponse>().view).toMatchObject({ boardReportOverdue: false, boardReportRecorded: true });
      expect((await item()).boardReportOverdue).toBe(false);
    });
  });

  describe('the one live link — signals (AC10)', () => {
    async function insertFailedCheck(): Promise<{ checkId: string; verifiedAt: string }> {
      const { rows } = await td.pool.query<{ check_id: string; verified_at: Date }>(
        `INSERT INTO audit_integrity_checks
           (chain_valid, start_seq, start_audit_id, end_seq, end_audit_id, first_broken_seq, first_broken_audit_id, rows_verified, verifier_actor, trigger_source)
         VALUES (false, 1, $1, 6, $2, 4, $3, 3, $4, 'manual') RETURNING check_id, verified_at`,
        [randomUUID(), randomUUID(), randomUUID(), `test:${randomUUID()}`],
      );
      return { checkId: rows[0]!.check_id, verifiedAt: rows[0]!.verified_at.toISOString() };
    }
    const signals = async () => (await sa.client.inject({ method: 'GET', url: `${BASE}/signals?limit=50` })).json<BreachSignalListResponse>().items;

    it('⭐ a failed, UNACKNOWLEDGED check is listed and an acknowledged one is not (by membership); opening an incident from it fills `incidentIds`', async () => {
      const mine = await insertFailedCheck();
      const acked = await insertFailedCheck();
      await td.pool.query(`INSERT INTO audit_integrity_acknowledgements (check_id, acknowledged_by, ticket_ref) VALUES ($1, $2, 'SPEC-14-3')`, [acked.checkId, sa.userId]);

      const before = await signals();
      expect(before.find((s) => s.checkId === mine.checkId)).toEqual({ checkId: mine.checkId, verifiedAt: mine.verifiedAt, firstBrokenSeq: '4', rowsVerified: 3, triggerSource: 'manual', incidentIds: [] });
      expect(before.some((s) => s.checkId === acked.checkId)).toBe(false);

      // "Open an incident from this": the source, the reference and the awareness time come from the signal.
      const opened = await open(sa.client, { detectionSource: 'audit_chain_break', detectionSignalRef: mine.checkId, becameAwareAt: mine.verifiedAt });
      expect(opened.incident).toMatchObject({ detectionSource: 'audit_chain_break', detectionSignalRef: mine.checkId, becameAwareAt: mine.verifiedAt });
      expect((await signals()).find((s) => s.checkId === mine.checkId)?.incidentIds).toEqual([opened.incident.incidentId]);
      // The breach page never acknowledges: the check is still unacknowledged.
      expect((await td.pool.query(`SELECT 1 FROM audit_integrity_acknowledgements WHERE check_id = $1`, [mine.checkId])).rowCount).toBe(0);
    });

    it('the signals list is `{ items }` and bounded (default 20, max 50)', async () => {
      const res = await sa.client.inject({ method: 'GET', url: `${BASE}/signals` });
      expect(res.statusCode).toBe(200);
      expect(Object.keys(res.json<object>())).toEqual(['items']);
      expect(res.json<BreachSignalListResponse>().items.length).toBeLessThanOrEqual(20);
      for (const bad of ['0', '51']) expect((await sa.client.inject({ method: 'GET', url: `${BASE}/signals?limit=${bad}` })).statusCode, bad).toBe(400);
    });
  });

  describe('members on record (AC11, arm (a))', () => {
    const read = async () => (await sa.client.inject({ method: 'GET', url: `${BASE}/members-on-record` })).json<BreachMembersOnRecordResponse>();

    it('⭐ trust-wide across Pariwars, as a DELTA over a before-read: `total` leaves out `anonymized`, which stays visible in `byState`; all nine states are present; ⛔ threshold', async () => {
      const before = await read();
      const [p1, p2] = [randomUUID(), randomUUID()];
      const seed: [string, string][] = [
        [p1, 'active'],
        [p1, 'active'],
        [p2, 'lock-in'],
        [p2, 'anonymized'],
      ];
      for (const [pariwarId, state] of seed) {
        const memberId = randomUUID();
        createdMemberIds.push(memberId);
        await td.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, $3, 1)`, [memberId, pariwarId, state]);
      }
      const after = await read();
      // Other suites add members while this runs, so the deltas are lower bounds…
      expect(after.total - before.total).toBeGreaterThanOrEqual(3);
      expect(after.pariwarCount - before.pariwarCount).toBeGreaterThanOrEqual(2);
      expect(after.byState.active - before.byState.active).toBeGreaterThanOrEqual(2);
      expect(after.byState['lock-in'] - before.byState['lock-in']).toBeGreaterThanOrEqual(1);
      expect(after.byState.anonymized - before.byState.anonymized).toBeGreaterThanOrEqual(1);
      // …and these hold EXACTLY, within the one response (one statement, one snapshot):
      expect(Object.keys(after.byState).sort()).toEqual(['active', 'active-in-grace', 'anonymized', 'lapsed-unpaid', 'lock-in', 'pending-fee', 'pending-kyc', 'pending-valid', 'withdrawn'].sort());
      const nonAnonymized = Object.entries(after.byState).filter(([s]) => s !== 'anonymized').reduce((n, [, v]) => n + v, 0);
      expect(after.total).toBe(nonAnonymized);
      expect(after.byState.anonymized).toBeGreaterThanOrEqual(1);
      expect(Object.keys(after).sort()).toEqual(['asOf', 'byState', 'pariwarCount', 'total']);
      expect(Date.parse(after.asOf)).not.toBeNaN();
    });
  });
});
