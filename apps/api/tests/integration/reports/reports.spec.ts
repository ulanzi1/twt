// Reports-&-exports library admin surface — E2E (Story 10.7; AC2/AC3/AC5/AC6). (:5433)
//
// Proves the request/poll/download trio against real Postgres:
//   · AC6 RBAC revert-sanity PAIR — pariwar_admin (holds member.export_roster) → 200 + enqueue; an
//     auditor (Pariwar grant, NO roster key) → fail-closed 403 for the roster; unknown report_type → 400.
//   · AC2 idempotency — a second request for the same (actor, report_type, params) returns the SAME
//     in-flight export id (no duplicate job).
//   · AC5 one-time download — a ready row streams once (200 + text/csv), a replay → 410 consumed; a
//     not-ready row → 409.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; users/role_grants/report_exports cleaned in afterAll.

import { randomUUID } from 'node:crypto';

import { encryption } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { CapturingReportExportQueue, createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('reports admin surface — E2E (:5433)', () => {
  let t: TestApp;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];
  const createdPariwarIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
    deps = t.deps;
  });

  afterAll(async () => {
    const c = await t.pool.connect();
    try {
      if (createdPariwarIds.length > 0) {
        await c.query(`DELETE FROM report_exports WHERE pariwar_id = ANY($1)`, [createdPariwarIds]);
      }
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await teardown(t);
  });

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `reports-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const enroll = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, pariwarId, role, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  it('AC6 with-key: pariwar_admin requests a roster → 200 pending + a REPORT_EXPORT_BUILD job enqueued', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Admin');
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { report_export_id: string; status: string };
    expect(body.status).toBe('pending');
    const queue = deps.reportExportQueue as CapturingReportExportQueue;
    expect(queue.last?.payload.reportExportId).toBe(body.report_export_id);
  });

  it('AC6 without-key: an auditor (no member.export_roster) → fail-closed 403 on the roster', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Auditor');
    await grant(a.userId, p, 'auditor');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AC6 auditor CAN request the audit-log report (reuses audit.export) → 200', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Auditor2');
    await grant(a.userId, p, 'auditor');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'audit_log_query', format: 'json' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('unknown report_type → 400 (fail-closed)', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Admin2');
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'ghost_report', format: 'csv' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AC2 idempotency: a second identical request returns the SAME in-flight export id', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Admin3');
    await grant(a.userId, p, 'pariwar_admin');
    const first = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    const second = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect((second.json() as { report_export_id: string }).report_export_id).toBe(
      (first.json() as { report_export_id: string }).report_export_id,
    );
  });

  it('AC5 one-time download: a ready row streams once (200 text/csv), a replay → 410 consumed', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Admin4');
    await grant(a.userId, p, 'pariwar_admin');

    // Seed a ready report_exports row with a real artifact encrypted under the test KMS (field-class
    // report_export), so the download handler can decrypt + stream it.
    const csv = 'member_id,district\r\nm1,Patna\r\n';
    const ct = await encryption.encryptTier1(
      Buffer.from(csv, 'utf8'),
      { pariwarId: p, fieldClass: 'report_export' },
      deps.encryption.kms,
      deps.encryption.kekRef,
    );
    const serialized = encryption.serializeEnvelope(ct);
    const c = await t.pool.connect();
    let exportId = '';
    try {
      const res = await c.query<{ report_export_id: string }>(
        `INSERT INTO report_exports (pariwar_id, requested_by_actor_id, report_type, format, params_hash, status, requested_at, ready_at, expires_at, artifact_ciphertext, row_count)
         VALUES ($1,$2,'member_roster','csv','h', 'ready', now(), now(), now() + interval '24 hours', $3, 1) RETURNING report_export_id`,
        [p, a.userId, serialized],
      );
      exportId = res.rows[0]!.report_export_id;
    } finally {
      c.release();
    }

    // Poll status → ready.
    const status = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/reports/${exportId}` });
    expect(status.statusCode).toBe(200);
    expect((status.json() as { status: string }).status).toBe('ready');

    // First download → 200, streaming the decrypted plaintext CSV.
    const d1 = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/reports/${exportId}/download` });
    expect(d1.statusCode).toBe(200);
    expect(d1.body).toContain('m1,Patna');

    // Replay → 410 consumed (the one-time guard).
    const d2 = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/reports/${exportId}/download` });
    expect(d2.statusCode).toBe(410);

    // The report.downloaded audit line was actually written (review finding: this was previously
    // asserted nowhere — a swallowed audit-write failure would have passed silently).
    const auditRows = await c.query<{ action: string; actor_role: string | null }>(
      `SELECT action, actor_role FROM audit_log_entries WHERE resource_locator = $1 AND action = 'report.downloaded'`,
      [`report_export:${exportId}`],
    );
    expect(auditRows.rows.length).toBeGreaterThanOrEqual(1);
    // The actor's role is resolved via the SAME precise (permissionKey → resolved scope → grant) chain
    // as the build worker, not "the first grant matching this Pariwar" (review finding) — a pariwar_admin
    // holds member.export_roster @ pariwar, so that is the role recorded.
    expect(auditRows.rows[0]!.actor_role).toBe('pariwar_admin');
  });

  it('review finding: a failed export download is 409 with a DISTINCT code from "still building"', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Admin5');
    await grant(a.userId, p, 'pariwar_admin');

    const c = await t.pool.connect();
    let exportId = '';
    try {
      const res = await c.query<{ report_export_id: string }>(
        `INSERT INTO report_exports (pariwar_id, requested_by_actor_id, report_type, format, params_hash, status, requested_at, failed_reason)
         VALUES ($1,$2,'member_roster','csv','h-failed','failed', now(), 'assemble_error') RETURNING report_export_id`,
        [p, a.userId],
      );
      exportId = res.rows[0]!.report_export_id;
    } finally {
      c.release();
    }

    const failedDownload = await a.client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/admin/reports/${exportId}/download`,
    });
    expect(failedDownload.statusCode).toBe(409);
    expect((failedDownload.json() as { error: { code: string } }).error.code).toBe('reports.build_failed');
  });

  it('review finding: GET /admin/reports lists the actor own exports, newest-first, scoped to them alone', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Admin6');
    await grant(a.userId, p, 'pariwar_admin');
    const other = await authenticate('Admin7');
    await grant(other.userId, p, 'pariwar_admin');

    const first = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    // A different `params` (not report_type — pariwar_admin doesn't hold the Auditor-only
    // audit_log_query key) so this is a genuinely SECOND export, not the AC2 idempotent-replay case.
    const second = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'json', params: { marker: 'second' } },
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const firstId = (first.json() as { report_export_id: string }).report_export_id;
    const secondId = (second.json() as { report_export_id: string }).report_export_id;

    const list = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/reports` });
    expect(list.statusCode).toBe(200);
    const ids = (list.json() as { exports: { report_export_id: string }[] }).exports.map(
      (e) => e.report_export_id,
    );
    expect(ids).toContain(firstId);
    expect(ids).toContain(secondId);
    expect(ids.indexOf(secondId)).toBeLessThan(ids.indexOf(firstId)); // newest-first

    // A DIFFERENT actor in the same Pariwar sees NONE of these — the list is actor-scoped, not tenant-wide.
    const otherList = await other.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/reports` });
    expect(otherList.statusCode).toBe(200);
    const otherIds = (otherList.json() as { exports: { report_export_id: string }[] }).exports.map(
      (e) => e.report_export_id,
    );
    expect(otherIds).not.toContain(firstId);
    expect(otherIds).not.toContain(secondId);
  });

  it('review finding: the SAME actor can have concurrent active exports across DIFFERENT Pariwars (cross-tenant idempotency index fix)', async () => {
    const pA = randomUUID();
    const pB = randomUUID();
    createdPariwarIds.push(pA, pB);
    const a = await authenticate('Admin8');
    await grant(a.userId, pA, 'pariwar_admin');
    await grant(a.userId, pB, 'pariwar_admin');

    // Before the fix, the partial unique index keyed on (requested_by_actor_id, report_type, params_hash)
    // WITHOUT pariwar_id would make the second insert hit a 23505 whose row RLS then hides from this
    // actor's Pariwar-B-scoped retry re-read — an uncaught 500. With pariwar_id in the index, both
    // requests succeed independently.
    const resA = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${pA}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    const resB = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${pB}/admin/reports`,
      payload: { report_type: 'member_roster', format: 'csv' },
    });
    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);
    expect((resA.json() as { report_export_id: string }).report_export_id).not.toBe(
      (resB.json() as { report_export_id: string }).report_export_id,
    );
  });
});
