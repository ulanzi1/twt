// Ground-inspection admin surface E2E (live DB :5433) — Story 6.7 (Task 5/Task 7; AC1–AC6).
//
// Drives the ground-inspection endpoints through the REAL admin guard chains via a cookie-threading
// client. Asserts the per-endpoint behaviours the HTTP layer owns (the domain writers are covered by
// packages/domain/.../ground-inspection.spec.ts):
//   · permission gating — no conduct grant → 403; district_admin@X → allowed on an X assignment,
//     denied on a Y-district body (the D6 district gate);
//   · the D3 claim-state guard → 409 ground_inspection.not_allowed;
//   · the happy schedule → photo (multipart, images-only) → complete flow, + the PII encryption
//     round-trip (the read returns DECRYPTED values + a signed URL; the row stores ciphertext);
//   · the mandatory-photo completion guard → 409; a non-image MIME → 415 with NO bytes stored;
//   · the inspector-identity guard — a district admin who is NOT the assigned inspector (no override)
//     → 403 on complete.
//
// ⚠ Own-committing writes (scope tx commits on 2xx). Fresh random pariwarId per test; events_log is
// append-only ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';

/** A minimal multipart body: an optional `caption` field (before the file) + one `file` part. */
function multipart(bytes: Buffer, filename: string, contentType: string, caption?: string): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const parts: Buffer[] = [];
  if (caption !== undefined) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { body: Buffer.concat(parts), ct: `multipart/form-data; boundary=${boundary}` };
}

describe.skipIf(!hasDatabase)('Ground-inspection admin surface — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `gi-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
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
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dim, value],
      );
    } finally {
      c.release();
    }
  }

  /** Seed a committed claim driven to `verification_in_progress` (or left at `intake_pending`). */
  async function seedClaim(pariwarId: string, opts: { toVerification: boolean }): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const deceasedMemberId = ids.memberId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['helpline'], claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceasedMemberId), intake_channel: 'helpline', claimant_actor_id: null });
      if (opts.toVerification) {
        await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
        await emit('intake_converged', 'documents_pending', 'claim.documents_received');
        await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }

  const base = (p: string, c: string): string => `/api/v1/p/${p}/admin/claims/${c}/ground-inspection`;

  function scheduleBody(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      district: DISTRICT,
      inspectionStage: 'initial',
      inspectionSiteType: 'family_residence',
      inspectorActorId: randomUUID(),
      scheduledAt: '2026-07-10T12:00:00.000Z',
      familyContact: '+919999999999',
      ...over,
    };
  }

  async function schedule(client: Client, pariwarId: string, claimCaseId: string, over: Record<string, unknown> = {}) {
    return client.inject({
      method: 'POST',
      url: base(pariwarId, claimCaseId),
      payload: scheduleBody(over),
      headers: { 'idempotency-key': randomUUID() },
    });
  }

  it('no conduct grant → 403 on schedule', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    // Grant a role WITHOUT the conduct key (helpline_operator) so scope-resolution passes but the gate denies.
    await grant(userId, pariwarId, 'helpline_operator', 'pariwar', pariwarId);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const res = await schedule(client, pariwarId, claimCaseId);
    expect(res.statusCode).toBe(403);
  });

  it('district_admin@Patna schedules a Patna assignment → 201; a Vaishali-district body → 403 (D6 gate)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });

    const ok = await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId });
    expect(ok.statusCode).toBe(201);
    // A body naming a district the admin does NOT hold → the district gate denies (403).
    const denied = await schedule(client, pariwarId, claimCaseId, { district: 'Vaishali' });
    expect(denied.statusCode).toBe(403);
  });

  it('schedule on a non-verification claim → 409 ground_inspection.not_allowed', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: false }); // intake_pending
    const res = await schedule(client, pariwarId, claimCaseId);
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('ground_inspection.not_allowed');
  });

  it('happy path: schedule → upload image → complete; PII round-trips (read returns decrypted + signed URL)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });

    // Schedule with the acting admin as the inspector (so complete passes the inspector guard).
    const sched = await schedule(client, pariwarId, claimCaseId, {
      inspectorActorId: userId,
      locationDetail: '12 MG Road, near the temple',
      familyContact: '+918888888888',
    });
    expect(sched.statusCode).toBe(201);
    const gid = sched.json<{ groundInspectionId: string }>().groundInspectionId;

    const storeBefore = td.claimDocumentStorage.store.size;
    const { body, ct } = multipart(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'p.jpg', 'image/jpeg', 'front gate');
    const photo = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/photos`, payload: body as unknown as object, headers: { 'content-type': ct } });
    expect(photo.statusCode).toBe(201);
    expect(td.claimDocumentStorage.store.size).toBe(storeBefore + 1);

    const done = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/complete`, payload: {} });
    expect(done.statusCode).toBe(200);
    expect(done.json<{ status: string; photoCount: number }>().status).toBe('completed');

    // Read (district-scoped) → decrypted PII + a signed URL for the photo.
    const read = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?district=${DISTRICT}` });
    expect(read.statusCode).toBe(200);
    const assignments = read.json<{ assignments: Array<{ locationDetail: string | null; familyContact: string | null; status: string; photos: Array<{ signedUrl: string; caption: string | null }> }> }>().assignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.locationDetail).toBe('12 MG Road, near the temple'); // decrypted round-trip
    expect(assignments[0]!.familyContact).toBe('+918888888888');
    expect(assignments[0]!.status).toBe('completed');
    expect(assignments[0]!.photos[0]!.signedUrl).toBeTruthy();
    expect(assignments[0]!.photos[0]!.caption).toBe('front gate');
  });

  it('mandatory-photo completion: complete with zero photos → 409 ground_inspection.photo_required', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const gid = (await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId })).json<{ groundInspectionId: string }>().groundInspectionId;
    const res = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/complete`, payload: {} });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('ground_inspection.photo_required');
  });

  it('non-image MIME → 415 and NO bytes stored (checked before the put)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const gid = (await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId })).json<{ groundInspectionId: string }>().groundInspectionId;

    const storeBefore = td.claimDocumentStorage.store.size;
    const { body, ct } = multipart(Buffer.from('%PDF-1.4 fake'), 'c.pdf', 'application/pdf');
    const res = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/photos`, payload: body as unknown as object, headers: { 'content-type': ct } });
    expect(res.statusCode).toBe(415);
    expect(td.claimDocumentStorage.store.size).toBe(storeBefore);
  });

  it('inspector-identity guard: a district admin who is NOT the assigned inspector (no override) → 403 on complete', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    // Assign a DIFFERENT inspector (a random id) — the acting admin is not it and holds no override.
    const gid = (await schedule(client, pariwarId, claimCaseId, { inspectorActorId: randomUUID() })).json<{ groundInspectionId: string }>().groundInspectionId;
    const res = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/complete`, payload: {} });
    expect(res.statusCode).toBe(403);
  });
});
