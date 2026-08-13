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

import { claim, geoTree, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';
const BLOCK = 'Block-1';
const OTHER_BLOCK = 'Block-2';

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

  // ── Story 6.17 — the block path WITH a published tree (the AC3 happy path) ────────────────────

  it('block path with a published tree: block_admin schedules + completes; district_admin reaches it by ancestry; a wrong-block admin gets 403', async () => {
    const pariwarId = randomUUID();
    await publishTree(pariwarId, DISTRICT, [BLOCK, OTHER_BLOCK]);
    const claimCaseId = await (async () => {
      const c = await seedClaim(pariwarId, { toVerification: true });
      return c;
    })();

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

    const { body, ct } = multipart(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'p.jpg', 'image/jpeg');
    const photo = await blockAdmin.client.inject({
      method: 'POST',
      url: `${base(pariwarId, claimCaseId)}/${gid}/photos`,
      payload: body as unknown as object,
      headers: { 'content-type': ct },
    });
    expect(photo.statusCode).toBe(201);
    const done = await blockAdmin.client.inject({ method: 'POST', url: `${base(pariwarId, claimCaseId)}/${gid}/complete`, payload: {} });
    expect(done.statusCode).toBe(200);

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
});
