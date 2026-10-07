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

import { claim, encryption, geoTree, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';
import { insertDeathCertificate } from '../_nominee-name-check-fixture.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';
const BLOCK = 'Block-1';
const OTHER_BLOCK = 'Block-2';

/** A minimal multipart body: an optional `caption` field (before the file), an optional `photoKind` field (Story 6.26a
 *  GI4 — AFTER the file when `kindAfterFile`, proving it is read once the stream is drained) + one `file` part. */
function multipart(
  bytes: Buffer,
  filename: string,
  contentType: string,
  caption?: string,
  photoKind?: string,
  kindAfterFile = false,
  comparedCertificateToken?: string,
): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const parts: Buffer[] = [];
  // `2026-10-07-287` J1 — an original's photo carries the token of the certificate the inspector compared.
  if (comparedCertificateToken !== undefined) {
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="comparedCertificateToken"\r\n\r\n${comparedCertificateToken}\r\n`),
    );
  }
  const kindPart =
    photoKind !== undefined
      ? Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photoKind"\r\n\r\n${photoKind}\r\n`)
      : null;
  if (caption !== undefined) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`));
  }
  if (kindPart && !kindAfterFile) parts.push(kindPart);
  if (kindPart && kindAfterFile) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: ${contentType}\r\n\r\n`,
      ),
      bytes,
      Buffer.from('\r\n'),
      kindPart,
      Buffer.from(`--${boundary}--\r\n`),
    );
    return { body: Buffer.concat(parts), ct: `multipart/form-data; boundary=${boundary}` };
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

  /** ⭐ Story 6.26a — give a claim a CURRENT death certificate (the fixture's raw insert). Returns its upload id. */
  async function seedCertificate(pariwarId: string, claimCaseId: string): Promise<string> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const { uploadId } = await insertDeathCertificate(scopeTx, pariwarId, claimCaseId);
      await closeScopeTx(scopeTx, true);
      return uploadId;
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  /** ⭐ Story 6.26a (GI4 / GI5) — a full completion body against `token` (a fixed past date; the time optional). */
  const completeBody = (token: string, over: Record<string, unknown> = {}) => ({
    originalCertificateVerdict: 'matches',
    comparedCertificateToken: token,
    deathDate: '2026-06-01',
    deathTime: '14:30',
    ...over,
  });

  /**
   * Publish a geo tree for `pariwarId` placing each block under `parentDistrict`. Story 1.18 shipped
   * `createGeoTreeVersion` as a DOMAIN function with deliberately NO route (Decision `2026-08-12-102`
   * §7), so this is the only way to put a tree in force — which is also exactly why AC3's ancestry
   * path is recorded DECLARED, NOT PRODUCTION-ACTIVE.
   */
  async function publishTree(pariwarId: string, parentDistrict: string, blocks: string[]): Promise<void> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await geoTree.createGeoTreeVersion(scopeTx.tx, {
        pariwarId: ids.pariwarId(pariwarId),
        nodes: [
          { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
          { dimension: 'district', value: parentDistrict, parent_dimension: 'state', parent_value: 'Bihar' },
          ...blocks.map((b) => ({
            dimension: 'block' as const,
            value: b,
            parent_dimension: 'district' as const,
            parent_value: parentDistrict,
          })),
        ],
        // ⚠ PINNED, never clock-defaulted ([[project_known_livedb_test_failures]] #12, the DATE-BOMB
        // class): the tree must be IN FORCE at read time, and a wall-clock default read against a
        // pinned instant fails on a DATE rather than on a diff.
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  /**
   * Seed a committed ground-inspection assignment directly through the domain writer — for the cases
   * where the HTTP path could not have created it (a block-tagged row in a Pariwar whose actors are
   * denied by the very gate under test).
   */
  async function seedAssignment(
    pariwarId: string,
    claimCaseId: string,
    over: { block?: string | null; district?: string; inspectorActorId?: string } = {},
  ): Promise<string> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const res = await claim.scheduleGroundInspection(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        district: over.district ?? DISTRICT,
        block: over.block ?? null,
        inspectionStage: 'initial',
        inspectionSiteType: 'family_residence',
        inspectorActorId: over.inspectorActorId ?? randomUUID(),
        // ⚠ PINNED, never clock-defaulted ([[project_known_livedb_test_failures]] #12).
        scheduledAt: new Date('2026-07-10T12:00:00.000Z'),
        scheduledByActor: randomUUID(),
        idempotencyKey: randomUUID(),
      });
      await closeScopeTx(scopeTx, true);
      return String(res.groundInspection.groundInspectionId);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
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

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⛔ THE D6 POLARITY PAIR — Story 6.17, MANDATORY, BOTH HALVES. Written FIRST, before the happy
  //    paths, because they are the EXECUTABLE FORM of the ruling, not illustrations of it:
  //
  //        Missing geo-tree data is a DENIAL condition, not a FALLBACK condition.
  //
  //    ⭐ Non-negotiable AS A PAIR. (a) alone passes on a system that denies everything; (b) alone
  //    passes on a system that has silently re-widened. ⛔ Never `.skip`, never `.todo`.
  //    The fallback probe that proves the pair ISOLATES the forbidden fallback (insert "if no tree,
  //    gate this block row at district" → (a) RED, (b) GREEN) is recorded in the Dev Agent Record.
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  it('D6 polarity (a): block assignment + NO resolvable tree → access DENIED', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    // ⭐ The actor is a district_admin at the row's OWN district — i.e. someone who WOULD be
    // authorized under the legacy path. That isolates the tree's absence as the SOLE cause of the
    // denial; a "no grant at all" actor would prove nothing.
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    // ⛔ NO tree at all is published for this Pariwar — not "a tree missing this one edge". No tree
    // is the RESTING STATE of every Pariwar: there is no writer surface and no code default
    // geography (ADR-0038), so this is production, not a contrived fixture.

    // 1. schedule-with-a-block-body → the gate resolves {block, 'Block-1'} and denies.
    const denied = await schedule(client, pariwarId, claimCaseId, { block: BLOCK, inspectorActorId: userId });
    expect(denied.statusCode).toBe(403);
    // ⛔ A CLEAN AUTHORIZATION DENIAL — not a 404, not a 500, not a validation error. A crash that
    // happens to block access is not a deny, and would sail through a naive `not.toBe(200)`. The
    // structured 403 carries `authz.forbidden` (the wire code) and fires an `authz.denied` audit
    // line (the sink's event type) — both are asserted, because either alone can be faked.
    expect(denied.json<{ error: { code: string } }>().error.code).toBe('authz.forbidden');
    const denials = td.auditSink.ofType('authz.denied');
    expect(denials.length).toBeGreaterThan(0);
    expect(denials.at(-1)!.context).toMatchObject({
      permissionKey: 'claim.conduct_ground_inspection',
      targetLocator: { dimension: 'block', value: BLOCK },
    });

    // 2. The SAME denial on the id-addressed verbs. Seed the block-tagged row directly (the operator
    //    could not have created it above), then try to reach it.
    const gid = await seedAssignment(pariwarId, claimCaseId, { block: BLOCK, inspectorActorId: userId });
    const findings = await client.inject({
      method: 'PATCH',
      url: `${base(pariwarId, claimCaseId)}/${gid}`,
      payload: { structuredFindings: { residence_confirmed: 'yes' } },
    });
    expect(findings.statusCode).toBe(403);
    expect(findings.json<{ error: { code: string } }>().error.code).toBe('authz.forbidden');
    const read = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?block=${BLOCK}` });
    expect(read.statusCode).toBe(403);

    // 3. ⭐ THE COMPANION that proves the deny is about the TREE and not about the block COLUMN:
    //    same actor, same row — publish `Patna → Block-1` and it turns into a 200.
    await publishTree(pariwarId, DISTRICT, [BLOCK]);
    const nowOk = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?block=${BLOCK}` });
    expect(nowOk.statusCode).toBe(200);
    expect(nowOk.json<{ assignments: unknown[] }>().assignments).toHaveLength(1);
  });

  it('D6 polarity (b): district assignment + existing district path → behaviour UNCHANGED', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    // ⛔ NO tree published — the same resting state as (a). The ONLY difference between the two
    // halves is whether the assignment carries a block. That is what makes the pair a pair.

    // ⭐ Asserted against the EXISTING Story 6.7 expectations, deliberately: the claim is
    // "unchanged", and a freshly re-derived expectation can drift into agreeing with a regression.
    // These are the same two assertions as
    // `district_admin@Patna schedules a Patna assignment → 201; a Vaishali-district body → 403`.
    const ok = await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId });
    expect(ok.statusCode).toBe(201);
    const wrongDistrict = await schedule(client, pariwarId, claimCaseId, { district: OTHER_DISTRICT });
    expect(wrongDistrict.statusCode).toBe(403);

    // The block column is NULL on the row that just got created — the legacy shape, untouched.
    const gid = ok.json<{ groundInspectionId: string }>().groundInspectionId;
    const read = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?district=${DISTRICT}` });
    expect(read.statusCode).toBe(200);
    const rows = read.json<{ assignments: Array<{ groundInspectionId: string; block: string | null }> }>().assignments;
    expect(rows.find((r) => r.groundInspectionId === gid)!.block).toBeNull();

    // And the id-addressed verbs still reach it with no tree in sight.
    const findings = await client.inject({
      method: 'PATCH',
      url: `${base(pariwarId, claimCaseId)}/${gid}`,
      payload: { structuredFindings: { residence_confirmed: 'yes' } },
    });
    expect(findings.statusCode).toBe(200);
  });

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
    // ⚠ AMENDED by Story 6.26a (GI4 / GI5): a completion now needs the original-certificate record against the
    // claim's CURRENT certificate and the family's date — so the claim gets a certificate, the photo is the
    // original's, the inspector reads the copy they compare, and the completion carries the full record.
    await seedCertificate(pariwarId, claimCaseId);

    // Schedule with the acting admin as the inspector (so complete passes the inspector guard).
    const sched = await schedule(client, pariwarId, claimCaseId, {
      inspectorActorId: userId,
      locationDetail: '12 MG Road, near the temple',
      familyContact: '+918888888888',
    });
    expect(sched.statusCode).toBe(201);
    const gid = sched.json<{ groundInspectionId: string }>().groundInspectionId;

    // The inspector opens the copy FIRST — an original's photo is recorded against it (`2026-10-07-287` J1).
    const cert = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/${gid}/certificate` });
    expect(cert.statusCode, cert.body).toBe(200);
    const token = cert.json<{ certificateToken: string }>().certificateToken;

    const storeBefore = td.claimDocumentStorage.store.size;
    const { body, ct } = multipart(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'p.jpg', 'image/jpeg', 'front gate', 'original_certificate', false, token);
    const photo = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/photos`, payload: body as unknown as object, headers: { 'content-type': ct } });
    expect(photo.statusCode).toBe(201);
    expect(td.claimDocumentStorage.store.size).toBe(storeBefore + 1);
    const done = await client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/complete`, payload: completeBody(token) });
    expect(done.statusCode, done.body).toBe(200);
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
    // Story 6.26a — the inspector's record round-trips: the verdict, the compared upload, the decrypted date and time.
    expect(assignments[0]).toMatchObject({
      originalCertificateVerdict: 'matches',
      comparedCertificateToken: token,
      deathDateSource: 'family_statement',
      deathDate: '2026-06-01',
      deathTime: '14:30',
      // `-286` H1 / `-287` J1 — the list says which certificate the original's photo was recorded against (the page's
      // Complete gate reads it; renaming it would break the page while every mocked admin test stayed green).
      photos: [expect.objectContaining({ photoKind: 'original_certificate', certificateToken: token })],
    });
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

  it('AC4 (review 2026-10-07): original_certificate_not_produced records as an evidence_unavailable refusal with its mandatory note — through HTTP', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const gid = (await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId })).json<{ groundInspectionId: string }>().groundInspectionId;

    const res = await client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/refusal`,
      payload: { disposition: 'evidence_unavailable', refusalReason: 'original_certificate_not_produced', reasonNote: 'The family could not produce the original certificate at the visit' },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json<{ status: string }>().status).toBe('evidence_unavailable');

    const read = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?district=${DISTRICT}` });
    const assignments = read.json<{ assignments: Array<{ status: string; refusalReason: string | null }> }>().assignments;
    expect(assignments[0]).toMatchObject({ status: 'evidence_unavailable', refusalReason: 'original_certificate_not_produced' });
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

  // ── Story 6.17 — the block path WITH a published tree (the AC3 happy path) ────────────────────

  it('block path with a published tree: block_admin schedules + completes; district_admin reaches it by ancestry; a wrong-block admin gets 403', async () => {
    const pariwarId = randomUUID();
    await publishTree(pariwarId, DISTRICT, [BLOCK, OTHER_BLOCK]);
    const claimCaseId = await (async () => {
      const c = await seedClaim(pariwarId, { toVerification: true });
      return c;
    })();
    // ⚠ AMENDED by Story 6.26a (GI4): the completion below needs a current certificate to compare with.
    await seedCertificate(pariwarId, claimCaseId);

    // (1) block_admin@Block-1 — the FR-40 actor this whole story exists for. EXACT-NODE match: no
    //     resolver participates at all, which is why the fix was never a resolver.
    const blockAdmin = await authenticate();
    await grant(blockAdmin.userId, pariwarId, 'block_admin', 'block', BLOCK);
    const sched = await schedule(blockAdmin.client, pariwarId, claimCaseId, {
      block: BLOCK,
      inspectorActorId: blockAdmin.userId,
    });
    expect(sched.statusCode).toBe(201);
    const gid = sched.json<{ groundInspectionId: string }>().groundInspectionId;

    // ⭐ Story 6.26a (GI4) — the block_admin inspector SEES the claim's uploaded certificate (an assignment they hold).
    const cert = await blockAdmin.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/${gid}/certificate` });
    expect(cert.statusCode, cert.body).toBe(200);
    const token = cert.json<{ certificateToken: string }>().certificateToken;
    const { body, ct } = multipart(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'p.jpg', 'image/jpeg', undefined, 'original_certificate', false, token);
    const photo = await blockAdmin.client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/photos`,
      payload: body as unknown as object,
      headers: { 'content-type': ct },
    });
    expect(photo.statusCode).toBe(201);
    const done = await blockAdmin.client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/complete`,
      payload: completeBody(token),
    });
    expect(done.statusCode, done.body).toBe(200);

    // (2) district_admin@Patna reaches the SAME row by district→block ancestry (AC3). ⚠ This is the
    //     capability recorded DECLARED, NOT PRODUCTION-ACTIVE: it is reachable here only because the
    //     test published a tree through a DOMAIN function that has no route.
    const districtAdmin = await authenticate();
    await grant(districtAdmin.userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const byAncestry = await districtAdmin.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?block=${BLOCK}` });
    expect(byAncestry.statusCode).toBe(200);
    const rows = byAncestry.json<{ assignments: Array<{ groundInspectionId: string; block: string | null }> }>().assignments;
    expect(rows.map((r) => r.groundInspectionId)).toContain(gid);
    expect(rows.find((r) => r.groundInspectionId === gid)!.block).toBe(BLOCK);

    // (3) A block admin in the WRONG block is denied — exact-node mismatch, which no tree can widen.
    const wrongBlock = await authenticate();
    await grant(wrongBlock.userId, pariwarId, 'block_admin', 'block', OTHER_BLOCK);
    const denied = await wrongBlock.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?block=${BLOCK}` });
    expect(denied.statusCode).toBe(403);
  });

  it('reschedule changing `block` → 409 ground_inspection.block_immutable (and clearing it is equally refused)', async () => {
    const pariwarId = randomUUID();
    await publishTree(pariwarId, DISTRICT, [BLOCK, OTHER_BLOCK]);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'block_admin', 'block', BLOCK);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const gid = (await schedule(client, pariwarId, claimCaseId, { block: BLOCK, inspectorActorId: userId }))
      .json<{ groundInspectionId: string }>().groundInspectionId;

    // A different block — the cross-node authz-escalation case D3 forbids.
    const moved = await client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/reschedule`,
      payload: scheduleBody({ block: OTHER_BLOCK, inspectorActorId: userId }),
      headers: { 'idempotency-key': randomUUID() },
    });
    expect(moved.statusCode).toBe(409);
    expect(moved.json<{ error: { code: string } }>().error.code).toBe('ground_inspection.block_immutable');
    // ⛔ NOT the district literal — that contract is byte-identical and this is a SIBLING error.
    expect(moved.json<{ error: { code: string } }>().error.code).not.toBe('ground_inspection.district_immutable');

    // ⭐ And CLEARING the block is refused too: it would silently move the row from the block gate
    // back to the district gate — a re-gating, not a reschedule.
    const cleared = await client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/reschedule`,
      payload: scheduleBody({ inspectorActorId: userId }),
      headers: { 'idempotency-key': randomUUID() },
    });
    expect(cleared.statusCode).toBe(409);
    expect(cleared.json<{ error: { code: string } }>().error.code).toBe('ground_inspection.block_immutable');
  });

  it('reschedule ADDING a block to a legacy district-only assignment (null → non-null) → 409 ground_inspection.block_immutable (review fix, code review 2026-08-13 — the third transition direction; the other two are the test above)', async () => {
    // The above test pins non-null→non-null (moving) and non-null→null (clearing). It never pinned
    // the third direction: null→non-null (ADDING a block to a row scheduled before it carried one).
    // `assertReschedule`'s guard (`ground-inspection-persist.ts`) is a single symmetric
    // `(input.block ?? null) !== target.block` check — correct BY CONSTRUCTION for all three
    // directions — but "correct by construction" is a claim about the code, not evidence; this pins
    // it the same way the other two are pinned.
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    // A plain district_admin, no block grant and no published tree — exactly the actor who could
    // reach a legacy row's reschedule route (dimension resolves to 'district' from the row's own
    // NULL block, D2) but must never be able to newly authorize it at the block dimension by simply
    // naming one in the reschedule body.
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const gid = (await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId }))
      .json<{ groundInspectionId: string }>().groundInspectionId;

    const added = await client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/reschedule`,
      payload: scheduleBody({ block: BLOCK, inspectorActorId: userId }),
      headers: { 'idempotency-key': randomUUID() },
    });
    expect(added.statusCode).toBe(409);
    expect(added.json<{ error: { code: string } }>().error.code).toBe('ground_inspection.block_immutable');

    // Control: the row is untouched — still district-only, still `scheduled`, no replacement minted.
    const rows = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?district=${DISTRICT}` });
    const assignments = rows.json<{ assignments: { groundInspectionId: string; block: string | null; status: string }[] }>().assignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({ groundInspectionId: gid, block: null, status: 'scheduled' });
  });

  it('idempotent retry with a DIFFERENT block → mismatch, never a silent first-row return', async () => {
    const pariwarId = randomUUID();
    await publishTree(pariwarId, DISTRICT, [BLOCK, OTHER_BLOCK]);
    const { client, userId } = await authenticate();
    // A district_admin holds both blocks by ancestry, so the SECOND request is not merely 403'd —
    // it genuinely reaches the idempotency discriminator, which is what this test is about.
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const key = randomUUID();

    const first = await client.inject({
      method: 'POST',
      url: base(pariwarId, claimCaseId),
      payload: scheduleBody({ block: BLOCK, inspectorActorId: userId }),
      headers: { 'idempotency-key': key },
    });
    expect(first.statusCode).toBe(201);

    const replayed = await client.inject({
      method: 'POST',
      url: base(pariwarId, claimCaseId),
      payload: scheduleBody({ block: OTHER_BLOCK, inspectorActorId: userId }),
      headers: { 'idempotency-key': key },
    });
    expect(replayed.statusCode).toBe(409);
    expect(replayed.json<{ error: { code: string; details?: { field?: string } } }>().error.code).toBe(
      'ground_inspection.idempotency_mismatch',
    );

    // ⭐ The negative half: an IDENTICAL replay still returns the original (200, created:false).
    const identical = await client.inject({
      method: 'POST',
      url: base(pariwarId, claimCaseId),
      payload: scheduleBody({ block: BLOCK, inspectorActorId: userId }),
      headers: { 'idempotency-key': key },
    });
    expect(identical.statusCode).toBe(200);
    expect(identical.json<{ created: boolean }>().created).toBe(false);
  });

  it('read locator (D4): ?block= serves a block admin; BOTH params → 400; NEITHER → 400', async () => {
    const pariwarId = randomUUID();
    await publishTree(pariwarId, DISTRICT, [BLOCK]);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'block_admin', 'block', BLOCK);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    await schedule(client, pariwarId, claimCaseId, { block: BLOCK, inspectorActorId: userId });

    const byBlock = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?block=${BLOCK}` });
    expect(byBlock.statusCode).toBe(200);
    expect(byBlock.json<{ assignments: unknown[] }>().assignments).toHaveLength(1);

    // ⛔ BOTH — a 400, never a silent precedence rule. A request naming two jurisdictions has not
    // said which one it is asking authorization for.
    const both = await client.inject({
      method: 'GET',
      url: `${base(pariwarId, claimCaseId)}?district=${DISTRICT}&block=${BLOCK}`,
    });
    expect(both.statusCode).toBe(400);

    // ⛔ NEITHER — also a 400. It must never degrade into "return everything on the claim".
    const neither = await client.inject({ method: 'GET', url: base(pariwarId, claimCaseId) });
    expect(neither.statusCode).toBe(400);
  });

  it('read (review fix, code review 2026-08-13): `?district=` does NOT return a block-tagged row the actor cannot pass at `dimension: \'block\'`', async () => {
    // ⛔ THE GAP THIS PINS: the list handler used to filter candidate rows with a raw
    // `r.inspection.district === district` string match — which a block-tagged row ALSO satisfies,
    // because `district` stays populated on every row (D1). A plain district-dimension grant then
    // reached a row whose real authorization boundary is `dimension: 'block'` (D2), with zero
    // resolver/tree check — the exact "absence widens" shape D6 forbids, on the read path instead of
    // the fallback hook. NO tree is published here, so if the fix regresses, the block-tagged row
    // reappears via the unauthorized district-string match, not via legitimate ancestry.
    const pariwarId = randomUUID();
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    // The vulnerable row: block-tagged, but the SAME district string as the legacy row below. Seeded
    // directly (not via HTTP) — a plain district_admin with no tree cannot schedule a block-tagged row
    // through the gate under test, which is exactly why this row is the dangerous one to leak.
    const blockTaggedId = await seedAssignment(pariwarId, claimCaseId, { block: BLOCK });
    // The control: a legacy, district-only row under the identical district — must still be visible.
    const legacyId = await seedAssignment(pariwarId, claimCaseId, { block: null });

    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);

    const res = await client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}?district=${DISTRICT}` });
    expect(res.statusCode).toBe(200);
    const ids_ = res.json<{ assignments: { groundInspectionId: string }[] }>().assignments.map((a) => a.groundInspectionId);
    expect(ids_).toContain(legacyId);
    expect(ids_).not.toContain(blockTaggedId);
    expect(ids_).toHaveLength(1);
  });

  it('cross-tenant: a tree published in Pariwar A does NOT resolve the same edge in Pariwar B', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    // Only A publishes `Patna → Block-1`. B is a genuinely different tenant with the SAME node names,
    // so a leak would be invisible to any test that used distinct names.
    await publishTree(pariwarA, DISTRICT, [BLOCK]);

    const claimB = await seedClaim(pariwarB, { toVerification: true });
    const gidB = await seedAssignment(pariwarB, claimB, { block: BLOCK });

    const { client, userId } = await authenticate();
    await grant(userId, pariwarB, 'district_admin', 'district', DISTRICT);
    const res = await client.inject({ method: 'GET', url: `${base(pariwarB, claimB)}?block=${BLOCK}` });
    expect(res.statusCode).toBe(403);

    // ⭐ The control: the same actor, granted in A where the tree IS published, reaches an equivalent
    // row. Without this, the 403 above could be explained by anything.
    await grant(userId, pariwarA, 'district_admin', 'district', DISTRICT);
    const claimA = await seedClaim(pariwarA, { toVerification: true });
    await seedAssignment(pariwarA, claimA, { block: BLOCK });
    const okA = await client.inject({ method: 'GET', url: `${base(pariwarA, claimA)}?block=${BLOCK}` });
    expect(okA.statusCode).toBe(200);
    expect(gidB).toBeTruthy();
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

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⭐ Story 6.26a — the window through HTTP (GI3, `-283` A4), the original certificate (GI4), the dates (GI5), the
  //    certificate read and its audit (GI14).
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /** Move a committed claim on from `verification_in_progress` through REAL events. */
  async function drive(pariwarId: string, claimCaseId: string, steps: [string, string, string, Record<string, unknown>?][]): Promise<void> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const row = await claim.getClaimCase(scopeTx.tx, ids.pariwarId(pariwarId), ids.claimId(claimCaseId));
      for (const [from, to, eventType, extra] of steps) {
        await claim.projectClaimState(scopeTx.client, {
          claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: row!.deceasedMemberId,
          intakeChannels: ['helpline'], claimantActorId: null, eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...(extra ?? {}) } as never, actorId: null,
        });
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }
  const TO_DENIED: [string, string, string][] = [
    ['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing'],
    ['verifier_review', 'denied', 'claim.verifier_denied'],
  ];
  const TO_REVERSED: [string, string, string, Record<string, unknown>?][] = [
    ...TO_DENIED,
    ['denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated'],
    ['appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' }],
  ];

  async function uploadPhoto(client: Client, pariwarId: string, claimCaseId: string, gid: string, kind?: string, kindAfterFile = false, token?: string) {
    const { body, ct } = multipart(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'p.jpg', 'image/jpeg', undefined, kind, kindAfterFile, token);
    return client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/photos`, payload: body as unknown as object, headers: { 'content-type': ct } });
  }
  const errCode = (res: { json: <T>() => T }) => res.json<{ error: { code: string; details?: Record<string, unknown> } }>().error;

  /** A district admin who is ALSO the inspector of a fresh assignment on a claim with a current certificate. */
  async function inspectorWorld(opts: { certificate?: boolean; stage?: 'initial' | 'certificate_check' } = {}) {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const uploadId = opts.certificate === false ? null : await seedCertificate(pariwarId, claimCaseId);
    const sched = await schedule(client, pariwarId, claimCaseId, { inspectorActorId: userId, inspectionStage: opts.stage ?? 'initial' });
    expect(sched.statusCode, sched.body).toBe(201);
    const gid = sched.json<{ groundInspectionId: string }>().groundInspectionId;
    return { pariwarId, client, userId, claimCaseId, uploadId, gid };
  }

  it('⭐ AC3 (`-283` A4) — THROUGH HTTP: schedule in `reversed` (a denial overturned on appeal) → 201, ⛔ not `not_allowed`; in `denied` → 409 `ground_inspection.not_allowed` with the state', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const reversed = await seedClaim(pariwarId, { toVerification: true });
    await drive(pariwarId, reversed, TO_REVERSED);
    const ok = await schedule(client, pariwarId, reversed, { inspectorActorId: userId });
    expect(ok.statusCode, ok.body).toBe(201);
    const denied = await seedClaim(pariwarId, { toVerification: true });
    await drive(pariwarId, denied, TO_DENIED);
    const refused = await schedule(client, pariwarId, denied, { inspectorActorId: userId });
    expect(refused.statusCode).toBe(409);
    expect(errCode(refused)).toMatchObject({ code: 'ground_inspection.not_allowed', details: { state: 'denied' } });
  });

  it('GI4 — the photo kind rides the multipart (before OR after the file part); an unknown kind → 400', async () => {
    const w = await inspectorWorld();
    expect((await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', true, w.uploadId!)).statusCode).toBe(201);
    expect((await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid)).json<{ photoKind: string }>().photoKind).toBe('site');
    const bad = await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'selfie');
    expect(bad.statusCode).toBe(400);
    expect(errCode(bad).code).toBe('ground_inspection.invalid_photo_kind');
    const read = await w.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}?district=${DISTRICT}` });
    const kinds = read.json<{ assignments: { photos: { photoKind: string }[] }[] }>().assignments[0]!.photos.map((p) => p.photoKind).sort();
    expect(kinds).toEqual(['original_certificate', 'site']);
  });

  it('adversarial review 2026-10-07: a DUPLICATE `photoKind` multipart field (fastify delivers it as an array) → 400, ⛔ never a silent default to `site`', async () => {
    const w = await inspectorWorld();
    // Two `photoKind` parts under the same name — @fastify/multipart turns `data.fields.photoKind` into an
    // array in this case, which must be rejected the same as an explicitly-unknown kind.
    const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photoKind"\r\n\r\noriginal_certificate\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photoKind"\r\n\r\nsite\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await w.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/photos`,
      payload: body as unknown as object,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    });
    expect(res.statusCode, res.body).toBe(400);
    expect(errCode(res).code).toBe('ground_inspection.invalid_photo_kind');
  });

  it('⭐ `-287` J1 — an original\'s photo needs the COMPARED token: ⛔ none ⇒ 409 `original_certificate_required` (`compared_certificate`); a stale one ⇒ 409 `certificate_changed`; a duplicate part ⇒ 400; the list carries the stamp (⛔ none on a site photo)', async () => {
    const w = await inspectorWorld();
    const none = await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate');
    expect([none.statusCode, errCode(none)]).toEqual([409, expect.objectContaining({ code: 'ground_inspection.original_certificate_required', details: { missing: 'compared_certificate' } })]);
    const stale = await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', false, randomUUID());
    expect([stale.statusCode, errCode(stale).code]).toEqual([409, 'ground_inspection.certificate_changed']);
    const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
    const tokenPart = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="comparedCertificateToken"\r\n\r\n${w.uploadId}\r\n`);
    const dup = await w.client.inject({
      method: 'POST', url: `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/photos`,
      payload: Buffer.concat([
        tokenPart, tokenPart,
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photoKind"\r\n\r\noriginal_certificate\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]) as unknown as object,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    });
    expect([dup.statusCode, errCode(dup).code]).toEqual([400, 'ground_inspection.invalid_compared_certificate']);
    // The current token ⇒ 201, stamped; a site photo ⇒ ⛔ no stamp. The list says which is which.
    expect((await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', false, w.uploadId!.toUpperCase())).statusCode).toBe(201);
    expect((await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'site')).statusCode).toBe(201);
    const read = await w.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}?district=${DISTRICT}` });
    const photos = read.json<{ assignments: { photos: { photoKind: string; certificateToken: string | null }[] }[] }>().assignments[0]!.photos;
    expect(photos.map((p) => [p.photoKind, p.certificateToken]).sort()).toEqual([
      ['original_certificate', w.uploadId],
      ['site', null],
    ]);
  });

  it('⭐ GI4 — the certificate read: 200 (token = the CURRENT upload, a signed URL) to the assigned inspector; 403 to another conduct-key holder; 409 with ⛔ no current certificate', async () => {
    const pariwarId = randomUUID();
    const inspector = await authenticate();
    const other = await authenticate();
    for (const u of [inspector, other]) await grant(u.userId, pariwarId, 'block_admin', 'block', BLOCK);
    const claimCaseId = await seedClaim(pariwarId, { toVerification: true });
    const uploadId = await seedCertificate(pariwarId, claimCaseId);
    const gid = await seedAssignment(pariwarId, claimCaseId, { block: BLOCK, inspectorActorId: inspector.userId });
    const ok = await inspector.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/${gid}/certificate` });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(ok.json()).toMatchObject({ certificateToken: uploadId, contentType: 'application/pdf', expiresInSeconds: 300 });
    expect(ok.json<{ signedUrl: string }>().signedUrl).toBeTruthy();
    // ⭐ A block admin holding the conduct key on the SAME block, but ⛔ the inspector and ⛔ an override holder.
    const denied = await other.client.inject({ method: 'GET', url: `${base(pariwarId, claimCaseId)}/${gid}/certificate` });
    expect(denied.statusCode).toBe(403);

    const none = await inspectorWorld({ certificate: false });
    const res = await none.client.inject({ method: 'GET', url: `${base(none.pariwarId, none.claimCaseId)}/${none.gid}/certificate` });
    expect(res.statusCode).toBe(409);
    expect(errCode(res).code).toBe('ground_inspection.no_current_certificate');
  });

  it('⭐ GI4 (second code review 2026-10-07) — the certificate read is confined to an assignment the inspector HOLDS: 200 to an override holder; 409 `not_active` once completed; 409 `not_allowed` outside the window; 404 from another Pariwar', async () => {
    // AC4's "(or an override holder)": a supervisor who reaches the route (the conduct key — district admin) and is
    // ⛔ not the inspector, but holds `claim.override_ground_inspection` (pariwar admin).
    const w = await inspectorWorld();
    const supervisor = await authenticate();
    await grant(supervisor.userId, w.pariwarId, 'district_admin', 'district', DISTRICT);
    await grant(supervisor.userId, w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId);
    const certUrl = `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/certificate`;
    const viaOverride = await supervisor.client.inject({ method: 'GET', url: certUrl });
    expect(viaOverride.statusCode, viaOverride.body).toBe(200);
    expect(viaOverride.json()).toMatchObject({ certificateToken: w.uploadId });

    // ⭐ Checklist family 3 — the same actor, granted in ANOTHER Pariwar, ⛔ never reaches this assignment through it.
    const pariwarB = randomUUID();
    await grant(w.userId, pariwarB, 'district_admin', 'district', DISTRICT);
    const cross = await w.client.inject({ method: 'GET', url: `${base(pariwarB, w.claimCaseId)}/${w.gid}/certificate` });
    expect(cross.statusCode).toBe(404);

    // Once the assignment is completed it is ⛔ no longer held — the copy is ⛔ never re-opened through it.
    await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', false, w.uploadId ?? randomUUID());
    const done = await w.client.inject({ method: 'POST', url: `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/complete`, payload: completeBody(w.uploadId!) });
    expect(done.statusCode, done.body).toBe(200);
    const afterDone = await w.client.inject({ method: 'GET', url: certUrl });
    expect(afterDone.statusCode).toBe(409);
    expect(errCode(afterDone)).toMatchObject({ code: 'ground_inspection.not_active', details: { status: 'completed' } });

    // A scheduled assignment on a claim that has LEFT the window (refused) ⇒ ⛔ no copy.
    const d = await inspectorWorld();
    await drive(d.pariwarId, d.claimCaseId, TO_DENIED);
    const outside = await d.client.inject({ method: 'GET', url: `${base(d.pariwarId, d.claimCaseId)}/${d.gid}/certificate` });
    expect(outside.statusCode).toBe(409);
    expect(errCode(outside)).toMatchObject({ code: 'ground_inspection.not_allowed', details: { state: 'denied' } });
  });

  it('⭐ GI4 / GI5 — every new completion refusal has its stable code (409s name what is missing; malformed values are 400s)', async () => {
    const w = await inspectorWorld();
    const url = `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/complete`;
    const complete = (payload: Record<string, unknown>) => w.client.inject({ method: 'POST', url, payload });
    // A SITE photo only ⇒ the original's photo is missing.
    await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'site');
    let r = await complete(completeBody(w.uploadId!));
    expect(r.statusCode).toBe(409);
    expect(errCode(r)).toMatchObject({ code: 'ground_inspection.original_certificate_required', details: { missing: 'photo' } });
    await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', false, w.uploadId ?? randomUUID());
    r = await complete(completeBody(w.uploadId!, { originalCertificateVerdict: undefined }));
    expect(errCode(r)).toMatchObject({ code: 'ground_inspection.original_certificate_required', details: { missing: 'verdict' } });
    r = await complete(completeBody(w.uploadId!, { comparedCertificateToken: undefined }));
    expect(errCode(r)).toMatchObject({ code: 'ground_inspection.original_certificate_required', details: { missing: 'compared_certificate' } });
    r = await complete(completeBody(w.uploadId!, { deathDate: undefined }));
    expect([r.statusCode, errCode(r).code]).toEqual([409, 'ground_inspection.death_date_required']);
    r = await complete(completeBody(w.uploadId!, { deathDate: '2099-01-01' }));
    expect([r.statusCode, errCode(r).code]).toEqual([409, 'ground_inspection.death_date_in_future']);
    r = await complete(completeBody(w.uploadId!, { deathDate: '2026-02-30' }));
    expect(r.statusCode).toBe(400);
    r = await complete(completeBody(w.uploadId!, { deathTime: '24:00' }));
    expect(r.statusCode).toBe(400);
    // The family replaces the certificate — the copy the inspector compared is ⛔ no longer current.
    await seedCertificate(w.pariwarId, w.claimCaseId);
    r = await complete(completeBody(w.uploadId!));
    expect([r.statusCode, errCode(r).code]).toEqual([409, 'ground_inspection.certificate_changed']);

    const check = await inspectorWorld({ stage: 'certificate_check' });
    await uploadPhoto(check.client, check.pariwarId, check.claimCaseId, check.gid, 'original_certificate', false, check.uploadId ?? randomUUID());
    const checkUrl = `${base(check.pariwarId, check.claimCaseId)}/${check.gid}/complete`;
    const withTime = await check.client.inject({ method: 'POST', url: checkUrl, payload: completeBody(check.uploadId!) });
    expect(withTime.statusCode).toBe(400);
    expect(errCode(withTime)).toMatchObject({ code: 'ground_inspection.invalid_death_facts', details: { problem: 'time_not_allowed' } });
    const done = await check.client.inject({ method: 'POST', url: checkUrl, payload: completeBody(check.uploadId!, { deathTime: undefined }) });
    expect(done.statusCode, done.body).toBe(200);

    // ⛔ No current certificate ⇒ an original's photo has nothing to have been compared against (`-287` J1).
    const none = await inspectorWorld({ certificate: false });
    const noCert = await uploadPhoto(none.client, none.pariwarId, none.claimCaseId, none.gid, 'original_certificate', false, randomUUID());
    expect([noCert.statusCode, errCode(noCert).code]).toEqual([409, 'ground_inspection.no_current_certificate']);
  });

  it('⭐ AC5 — the stored row holds the date ONLY as ciphertext + an index under `DEATH_DATE_INDEX_FIELD_CLASS` (from `@twt/domain`)', async () => {
    const w = await inspectorWorld();
    await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', false, w.uploadId ?? randomUUID());
    const r = await w.client.inject({ method: 'POST', url: `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/complete`, payload: completeBody(w.uploadId!) });
    expect(r.statusCode, r.body).toBe(200);
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query<Record<string, unknown>>('SELECT * FROM claim_ground_inspections WHERE ground_inspection_id = $1', [w.gid]);
      const row = rows[0]!;
      for (const [col, v] of Object.entries(row)) {
        expect(String(v), col).not.toBe('2026-06-01');
        expect(String(v), col).not.toBe('14:30');
      }
      expect(String(row['death_date_ciphertext'])).toMatch(/^enc:v1:/);
      expect(String(row['death_time_ciphertext'])).toMatch(/^enc:v1:/);
      const expectedIndex = await encryption.blindIndex(
        encryption.DEATH_DATE_INDEX_FIELD_CLASS, '2026-06-01', { pariwarId: w.pariwarId }, deps.encryption.kms, deps.encryption.hmacKeyRef,
      );
      expect(row['death_date_index']).toBe(expectedIndex);
      expect(encryption.DEATH_DATE_INDEX_FIELD_CLASS).toBe('death_date');
    } finally {
      c.release();
    }
  });

  it('⭐ AC14 — the certificate read and the completion are audited with codes, ids and counts ONLY (⛔ a date, a time, a note or a name)', async () => {
    const w = await inspectorWorld();
    await w.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/certificate` });
    await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'original_certificate', false, w.uploadId ?? randomUUID());
    await uploadPhoto(w.client, w.pariwarId, w.claimCaseId, w.gid, 'site');
    const r = await w.client.inject({
      method: 'POST', url: `${base(w.pariwarId, w.claimCaseId)}/${w.gid}/complete`,
      payload: completeBody(w.uploadId!, { notes: 'ZZ-INSPECTION-NOTE Ramesh' }),
    });
    expect(r.statusCode, r.body).toBe(200);
    const viewed = td.auditSink.ofType('admin_ground_inspection.certificate_viewed').filter((e) => e.context?.['ground_inspection_id'] === w.gid);
    expect(viewed).toHaveLength(1);
    expect(viewed[0]!.context).toEqual({ claim_case_id: w.claimCaseId, ground_inspection_id: w.gid, certificate_token: w.uploadId });
    const completed = td.auditSink.ofType('admin_ground_inspection.completed').filter((e) => e.context?.['ground_inspection_id'] === w.gid);
    expect(completed).toHaveLength(1);
    expect(completed[0]!.context).toMatchObject({
      photo_count: 2,
      photo_kind_counts: { site: 1, original_certificate: 1, original_certificate_for_compared: 1 },
      original_certificate_verdict: 'matches',
      death_date_source: 'family_statement',
    });
    for (const line of [...viewed, ...completed]) {
      const dump = JSON.stringify(line);
      for (const leaked of ['2026-06-01', '14:30', 'ZZ-INSPECTION-NOTE', 'Ramesh']) expect(dump, leaked).not.toContain(leaked);
    }
  });
});