// Claim-document upload (helpline operator) E2E (live DB :5433) — Story 6.5 (Task 5/Task 7).
//
// Drives the operator upload-on-behalf endpoint through the REAL admin guard chain
// [adminSession, scope, requirePermissionHook(claim.file)] via a cookie-threading client, with a
// hand-built multipart body. Asserts the upload lifecycle guard (AC1/AC5) + the storage/queue seam:
//   · intake_converged → 202 { status: 'processing' }, the bytes are `put`, the OCR job is enqueued
//     with the right payload;
//   · intake_pending (a wrong state) → 409 claim_document.upload_not_allowed, and the upload NEVER
//     reaches storage NOR the queue (zero calls — the guard runs first);
//   · a disallowed MIME → 415, no storage/queue calls.
//
// ⚠ Own-committing writes (scope tx commits on 2xx). Fresh random pariwarId per test; audit tables
// are append-only ([[project_live_db_test_gotchas]]).

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

/** Build a minimal multipart/form-data body with a single `file` part. */
function multipart(bytes: Buffer, filename: string, contentType: string): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, bytes, tail]), ct: `multipart/form-data; boundary=${boundary}` };
}

describe.skipIf(!hasDatabase)('Claim-document upload — helpline E2E (:5433)', () => {
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
    const email = `du-${randomUUID()}@example.test`;
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

  async function grantRole(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, pariwarId, role, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Seed a committed claim, advanced to `converged` (both events) or left at `intake_pending`. */
  async function seedClaim(pariwarId: string, opts: { converged: boolean }): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const deceasedMemberId = ids.memberId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await claim.projectClaimState(scopeTx.client, {
        claimCaseId,
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId,
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null, to_state: 'intake_pending', trigger: 'seed', actor: 'operator',
          deceased_member_id: String(deceasedMemberId), intake_channel: 'helpline', claimant_actor_id: null,
        },
        actorId: null,
      });
      if (opts.converged) {
        await claim.projectClaimState(scopeTx.client, {
          claimCaseId,
          pariwarId: ids.pariwarId(pariwarId),
          deceasedMemberId,
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: 'claim.intake_converged',
          payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'system' },
          actorId: null,
        });
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }

  const uploadUrl = (pariwarId: string, claimCaseId: string): string =>
    `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/documents?documentType=death_certificate`;

  it('intake_converged → 202, bytes stored, OCR job enqueued with the right payload', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const claimCaseId = await seedClaim(pariwarId, { converged: true });

    const storeBefore = td.claimDocumentStorage.store.size;
    const queueBefore = td.claimOcrParityQueue.enqueued.length;
    const { body, ct } = multipart(Buffer.from('%PDF-1.4 fake'), 'cert.pdf', 'application/pdf');

    const res = await client.inject({
      method: 'POST',
      url: uploadUrl(pariwarId, claimCaseId),
      payload: body as unknown as object,
      headers: { 'content-type': ct },
    });
    expect(res.statusCode).toBe(202);
    const json = res.json<{ documentId: string; status: string }>();
    expect(json.status).toBe('processing');
    expect(json.documentId).toMatch(/^[0-9a-f-]{36}$/);

    expect(td.claimDocumentStorage.store.size).toBe(storeBefore + 1);
    expect(td.claimOcrParityQueue.enqueued.length).toBe(queueBefore + 1);
    const enq = td.claimOcrParityQueue.last!;
    expect(enq.pariwarId).toBe(pariwarId);
    expect(enq.payload.claimCaseId).toBe(claimCaseId);
    expect(enq.payload.documentType).toBe('death_certificate');
    expect(enq.payload.contentType).toBe('application/pdf');
    expect(enq.payload.byteSize).toBeGreaterThan(0);
    // The stored object key matches the enqueued key (the job fetches by it).
    expect(td.claimDocumentStorage.store.has(enq.payload.storageObjectKey)).toBe(true);
  });

  it('intake_pending (wrong state) → 409 claim_document.upload_not_allowed, no storage/queue calls', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const claimCaseId = await seedClaim(pariwarId, { converged: false });

    const storeBefore = td.claimDocumentStorage.store.size;
    const queueBefore = td.claimOcrParityQueue.enqueued.length;
    const { body, ct } = multipart(Buffer.from('%PDF-1.4 fake'), 'cert.pdf', 'application/pdf');

    const res = await client.inject({
      method: 'POST',
      url: uploadUrl(pariwarId, claimCaseId),
      payload: body as unknown as object,
      headers: { 'content-type': ct },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('claim_document.upload_not_allowed');
    // A rejected upload NEVER reached storage or the queue (the guard runs first).
    expect(td.claimDocumentStorage.store.size).toBe(storeBefore);
    expect(td.claimOcrParityQueue.enqueued.length).toBe(queueBefore);
  });

  it('disallowed MIME → 415, no storage/queue calls', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const claimCaseId = await seedClaim(pariwarId, { converged: true });

    const storeBefore = td.claimDocumentStorage.store.size;
    const queueBefore = td.claimOcrParityQueue.enqueued.length;
    const { body, ct } = multipart(Buffer.from('hello'), 'note.txt', 'text/plain');

    const res = await client.inject({
      method: 'POST',
      url: uploadUrl(pariwarId, claimCaseId),
      payload: body as unknown as object,
      headers: { 'content-type': ct },
    });
    expect(res.statusCode).toBe(415);
    expect(td.claimDocumentStorage.store.size).toBe(storeBefore);
    expect(td.claimOcrParityQueue.enqueued.length).toBe(queueBefore);
  });
});
