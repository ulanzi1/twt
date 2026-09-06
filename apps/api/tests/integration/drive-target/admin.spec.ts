// Per-Pariwar DRIVE TARGET admin endpoints — Story 11b.13 (Task 5; AC2-AC6).
//
// Drives the real Fastify app via fastify.inject for the FOUR routes that make `2026-09-04-190`
// cl.7 operable WITHOUT database access:
//   · GET/PUT /p/:pariwarId/admin/drive-target             — `pariwar.manage_drive_target`
//   · GET/PUT /p/:pariwarId/admin/drive-target/visibility  — `…_visibility` (⛔ super_admin ONLY)
//
// ⭐⭐ THE LOAD-BEARING ASSERTIONS, and why each exists:
//   · `pariwar_admin` CAN set the target and gets **403 on BOTH visibility routes** — AC3's
//     regression guard at the wire. ⛔ The write key must never quietly carry the reveal.
//   · `super_admin` can do both.
//   · A `pariwar_admin` target change leaves the reveal flags **byte-unchanged** — true by
//     construction (D2), asserted anyway.
//   · A stale `expectedVersion` → **409 with the registered code** (`2026-09-05-201` cl.4).
//     ⛔ Never a bare `23505`, ⛔ never an opaque 500.
//   · A replayed `Idempotency-Key` returns the recorded response and creates ⛔ NO second version
//     and ⛔ no second audit line (`-201` cl.3).
//   · Public-revealed-while-member-hidden → **422** (`2026-09-04-189` cl.3).
//   · Zero / negative / non-integer / absurd targets → **400** at the CONTRACT boundary.
//     ⚠ `0` is a REJECTION case, ⛔ not a boundary pass.
//
// ⛔ NO TEST HERE MAY ASSERT A 500. Every rejection this surface can produce has a designed status:
// 400 (contract), 401 (no session), 403 (no grant), 409 (display name / version conflict /
// idempotency in flight), 422 (governance-record shape / the member ≥ public refusal). A 500 means
// an error escaped `errorMappingHandler`'s registry — that is the bug, ⛔ not the expectation.
// ⚠⛔ THIS IS DELIBERATELY ⛔ NOT THE NEIGHBOURING MASKING MODULE'S POSTURE, whose
// `UngovernedNomineeBankMaskingChangeError` is unregistered and surfaces as an opaque 500 on a plain
// governance refusal (Story 11b.3a chunk G2). Every drive-target error class IS registered.
//
// ⚠ Own-committing writes. Assertions key on MEMBERSHIP/state, ⛔ never counts against a shared
// table, and each test uses a FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { ids, pool as poolDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const targetUrl = (pariwarId: string): string => `/api/v1/p/${pariwarId}/admin/drive-target`;
const visibilityUrl = (pariwarId: string): string =>
  `/api/v1/p/${pariwarId}/admin/drive-target/visibility`;

const TARGET_AUDIT_ACTION = 'pariwar.drive_target.changed';

interface TargetBody {
  targetInr: number | null;
  configured: boolean;
  effectiveFrom: string | null;
  changedByDisplay: string | null;
  rationale: string | null;
  version: number | null;
}

interface VisibilityBody {
  visibility: { revealToMembers: boolean; revealToPublic: boolean };
  configured: boolean;
  changedByDisplay: string | null;
  rationale: string | null;
  updatedAt: string | null;
}

describe.skipIf(!hasDatabase)('Drive-target admin surface (Story 11b.13)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const touchedPariwarIds: string[] = [];

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
      if (touchedPariwarIds.length > 0) {
        // Both tables deny DELETE to the app role by design (a governance record is not discarded);
        // this cleanup runs as the test superuser, which is why it can tidy its own fixtures.
        await c.query(`DELETE FROM pariwar_drive_target_schedule WHERE pariwar_id = ANY($1)`, [
          touchedPariwarIds,
        ]);
        await c.query(`DELETE FROM pariwar_drive_target_visibility WHERE pariwar_id = ANY($1)`, [
          touchedPariwarIds,
        ]);
      }
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [
          createdUserIds,
        ]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
      await td.pool.end();
    }
  });

  function freshPariwar(): string {
    const id = randomUUID();
    touchedPariwarIds.push(id);
    return id;
  }

  async function authenticate(
    displayName: string | null = 'Asha Verma',
  ): Promise<{ client: Client; userId: string }> {
    const email = `dt-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(displayName === null ? {} : { displayName }),
    });
    createdUserIds.push(userId);

    const client = makeClient(app);
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: {
        id: `cred-${userId}`,
        publicKey: Buffer.from(userId).toString('base64url'),
        counter: 0,
      },
    };
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/options',
      payload: { enrollmentToken: token },
    });
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/register/verify',
      payload: { response: { id: 'browser' }, enrollmentToken: token },
    });
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/options',
      payload: {},
    });
    const verify = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  /**
   * Grant a role. `super_admin` is granted at the GLOBAL dimension (the directory-publication /
   * masking precedent) — a global super_admin grant satisfies a pariwar-dimension check.
   */
  async function grantRole(
    userId: string,
    pariwarId: string,
    role: string,
    dimension: 'global' | 'pariwar' = 'pariwar',
  ): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dimension, dimension === 'global' ? null : pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Schedule rows for a Pariwar, oldest first — the state assertion, independent of the echo. */
  async function storedTargets(
    pariwarId: string,
  ): Promise<{ version: number; target_inr: number; effective_until: Date | null }[]> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT version, target_inr, effective_until FROM pariwar_drive_target_schedule
           WHERE pariwar_id = $1 ORDER BY version`,
        [pariwarId],
      );
      return res.rows as never;
    } finally {
      c.release();
    }
  }

  /** The raw visibility row — used for the BYTE-UNCHANGED assertion. */
  async function storedVisibility(pariwarId: string): Promise<Record<string, unknown> | null> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT reveal_to_members, reveal_to_public, rationale, changed_by_actor,
                changed_by_display, audit_id, created_at, updated_at
           FROM pariwar_drive_target_visibility WHERE pariwar_id = $1`,
        [pariwarId],
      );
      return (res.rows[0] as Record<string, unknown> | undefined) ?? null;
    } finally {
      c.release();
    }
  }

  async function auditLines(pariwarId: string, action: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT count(*)::int AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2`,
        [pariwarId, action],
      );
      return (res.rows[0] as { n: number }).n;
    } finally {
      c.release();
    }
  }

  /**
   * `resolveEffectiveDriveTargetInr` itself, through a REAL scope tx — the same RLS-scoped handle
   * Story 11b.14 will use. ⭐ Asserting through the resolver rather than the table is what makes
   * this end-to-end: a test that only proved "the call did not error" would prove nothing.
   */
  async function resolverTarget(pariwarId: string): Promise<number | null> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      return await poolDomain.resolveEffectiveDriveTargetInr(
        scopeTx.tx,
        ids.pariwarId(pariwarId),
        new Date(),
      );
    } finally {
      await closeScopeTx(scopeTx, true);
    }
  }

  const goodBody = (targetInr = 500_000, expectedVersion: number | null = null) => ({
    targetInr,
    rationale: 'Trustee resolution of 6 September.',
    expectedVersion,
  });

  // ── THE TARGET RESOURCE ───────────────────────────────────────────────────────────────────────

  it('an UNSET Pariwar reads `configured: false` with a null target and a null version', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({ method: 'GET', url: targetUrl(pariwarId) });
    expect(res.statusCode).toBe(200);
    const body = res.json<TargetBody>();
    // ⭐ Reported EXPLICITLY, ⛔ never inferred from all-null fields: Story 11b.14 renders NO BAR
    // for an unset target, which is a different fact from a small one.
    expect(body).toEqual({
      targetInr: null,
      configured: false,
      effectiveFrom: null,
      changedByDisplay: null,
      rationale: null,
      version: null,
    });
  });

  it('⭐ `pariwar_admin` CAN set the target, and it reaches the RESOLVER', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<TargetBody>();
    expect(body.targetInr).toBe(500_000);
    expect(body.configured).toBe(true);
    expect(body.version).toBe(1);
    expect(body.changedByDisplay).toBe('Asha Verma');

    expect(await resolverTarget(pariwarId)).toBe(500_000);
    expect(await auditLines(pariwarId, TARGET_AUDIT_ACTION)).toBe(1);
  });

  it('a second change CLOSES the head and returns version 2 — the trail survives', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody() });
    const second = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(750_000, 1),
    });
    expect(second.statusCode).toBe(200);
    expect(second.json<TargetBody>().version).toBe(2);

    const rows = await storedTargets(pariwarId);
    expect(rows.map((r) => r.version)).toEqual([1, 2]);
    expect(rows.map((r) => r.target_inr)).toEqual([500_000, 750_000]);
    expect(rows[0]?.effective_until).not.toBeNull();
    expect(rows[1]?.effective_until).toBeNull();
  });

  it('⭐⭐ a STALE `expectedVersion` → 409 `pariwar.drive_target_version_conflict`', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody() });
    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody(750_000, 1) });

    // The operator still holding the version-1 view submits.
    const stale = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(100_000, 1),
    });
    // ⛔⛔ A REGISTERED 409 — ⛔ never a bare 23505, ⛔ never an opaque 500 (`2026-09-05-201` cl.4).
    expect(stale.statusCode).toBe(409);
    expect(stale.json<{ error: { code: string } }>().error.code).toBe(
      'pariwar.drive_target_version_conflict',
    );
    // ⭐⭐ AND THE OTHER OPERATOR'S CHANGE STANDS — ⛔ no silent overwrite, which is the entire
    // finding `-201` was ruled on.
    expect(await resolverTarget(pariwarId)).toBe(750_000);
    expect(await storedTargets(pariwarId)).toHaveLength(2);
  });

  it('⭐⭐ a REPLAYED `Idempotency-Key` returns the recorded response and creates NO second version or audit line', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const key = randomUUID();
    const first = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      headers: { 'idempotency-key': key },
      payload: goodBody(),
    });
    expect(first.statusCode).toBe(200);

    const replay = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      headers: { 'idempotency-key': key },
      payload: goodBody(),
    });
    expect(replay.statusCode).toBe(200);
    // ⭐ The RECORDED response, byte-identical.
    expect(replay.json<TargetBody>()).toEqual(first.json<TargetBody>());
    // ⭐⭐ AND ⛔ NO second version and ⛔ no second audit line. Without the key this replay would
    // create version 2 with an identical target and a second audit line — "a version history that
    // reports two operator decisions where there was one", which on a provenance surface is a
    // CORRECTNESS problem, not noise (`2026-09-05-201` cl.1).
    expect(await storedTargets(pariwarId)).toHaveLength(1);
    expect(await auditLines(pariwarId, TARGET_AUDIT_ACTION)).toBe(1);
  });

  it('⭐ the idempotency seam runs BEFORE the version check — a retry does NOT hit a false conflict', async () => {
    // ⛔⛔ THE ORDER `2026-09-05-201` cl.2 RULES LOAD-BEARING. Reversed, this retry — which carries
    // the version the caller legitimately last saw — would fire `expectedVersion` and tell the
    // operator "someone else changed this" when the someone was THEMSELVES, driving the re-submit
    // that manufactures the duplicate the key exists to prevent.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const key = randomUUID();
    const body = goodBody(500_000, null);
    const first = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      headers: { 'idempotency-key': key },
      payload: body,
    });
    expect(first.statusCode).toBe(200);
    // The SAME body, still carrying `expectedVersion: null` — now stale, since version 1 exists.
    const retry = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      headers: { 'idempotency-key': key },
      payload: body,
    });
    // ⭐ 200, ⛔ NOT 409: idempotency short-circuits before the version guard is ever consulted.
    expect(retry.statusCode).toBe(200);
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['non-integer', 500.5],
    ['above the ceiling', 100_000_001],
  ])('a %s target → 400 at the CONTRACT boundary, ⛔ never a 500', async (_label, targetInr) => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: { targetInr, rationale: 'Attempt.', expectedVersion: null },
    });
    // ⚠ `0` is a REJECTION case, ⛔ not a boundary pass — Story 11b.14 divides by this figure.
    expect(res.statusCode).toBe(400);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('a blank rationale → 400, and ⛔ NOTHING is written', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: { targetInr: 500_000, rationale: '   ', expectedVersion: null },
    });
    expect(res.statusCode).toBe(400);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('an OMITTED `expectedVersion` → 400 — it is REQUIRED, ⛔ not optional', async () => {
    // ⭐ `-201` cl.4: an optional field would repeat the `actorGrants?:` hygiene defect — a
    // required property turns an omission into an error, an optional one turns it into a silently
    // unguarded write.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: { targetInr: 500_000, rationale: 'No version supplied.' },
    });
    expect(res.statusCode).toBe(400);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('an admin with a DIFFERENT grant → 403, and ⛔ NOTHING is written', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    // ⚠ `auditor`, ⛔ not "no grant at all": an actor with NO grant for the Pariwar never reaches
    // the permission hook — scope resolution 404s first (the house 404-not-403 read posture). The
    // gate this test exercises is `requirePermissionHook`, so the actor must be IN the tenant.
    await grantRole(userId, pariwarId, 'auditor');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
    });
    expect(res.statusCode).toBe(403);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('an admin with NO grant for the Pariwar → 404 (scope resolution), ⛔ never a write', async () => {
    // ⭐ Recorded rather than left to surprise a future reader: the two denials are DIFFERENT
    // layers. 404 = "this Pariwar is not yours"; 403 = "it is yours, but you lack this key".
    const pariwarId = freshPariwar();
    const { client } = await authenticate();

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
    });
    expect(res.statusCode).toBe(404);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('an unauthenticated caller → 401 (⛔ never a silent write)', async () => {
    const pariwarId = freshPariwar();
    const res = await makeClient(app).inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
    });
    expect(res.statusCode).toBe(401);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('an admin with NO display name → 409 `admin.display_name_missing`, before any write', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate(null);
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('admin.display_name_missing');
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  // ── THE REVEAL RESOURCE — AC3'S REGRESSION GUARD AT THE WIRE ──────────────────────────────────

  it('⭐⭐ `pariwar_admin` → 403 on the visibility GET — the switches are super_admin-visible only', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({ method: 'GET', url: visibilityUrl(pariwarId) });
    // ⭐ AC5's "visible only to a super_admin" satisfied by a 403 on a SEPARATE RESOURCE — ⛔ never
    // by one endpoint shaping its response two ways, which would put the authority boundary inside
    // a handler.
    expect(res.statusCode).toBe(403);
  });

  it('⭐⭐ `pariwar_admin` → 403 on the visibility PUT — the write key does NOT carry the reveal', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: true, revealToPublic: false },
        rationale: 'Attempting a reveal I do not hold.',
      },
    });
    // ⛔⛔ THE REGRESSION THIS EXISTS TO PREVENT (AC3). `2026-09-04-190` cl.7(c) reserves the
    // disclosure act to the Trust.
    expect(res.statusCode).toBe(403);
    expect(await storedVisibility(pariwarId)).toBeNull();
  });

  it('`super_admin` can read and set the reveal switches', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const before = await client.inject({ method: 'GET', url: visibilityUrl(pariwarId) });
    expect(before.statusCode).toBe(200);
    // ⭐ FAIL-CLOSED default, reported as UNCONFIGURED so the operator can tell "nobody chose this"
    // from "the Trust decided to hide it".
    expect(before.json<VisibilityBody>()).toEqual({
      visibility: { revealToMembers: false, revealToPublic: false },
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    });

    const res = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: true, revealToPublic: false },
        rationale: 'Members of this Pariwar may see the target.',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<VisibilityBody>();
    expect(body.visibility).toEqual({ revealToMembers: true, revealToPublic: false });
    expect(body.configured).toBe(true);
    expect(body.changedByDisplay).toBe('Asha Verma');
  });

  it('⭐⭐ public-revealed-while-member-hidden → 422 `pariwar.drive_target_visibility_invalid`', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: false, revealToPublic: true },
        rationale: 'Trying to show the public more than a member.',
      },
    });
    // `2026-09-04-189` cl.3 — ENFORCED, ⛔ not documented. ⛔ Not a 409: nothing raced, so telling
    // the operator to retry would be false.
    expect(res.statusCode).toBe(422);
    expect(res.json<{ error: { code: string } }>().error.code).toBe(
      'pariwar.drive_target_visibility_invalid',
    );
    expect(await storedVisibility(pariwarId)).toBeNull();
  });

  it('⭐⭐ a `pariwar_admin` TARGET change leaves the reveal row BYTE-UNCHANGED (AC3 / D2)', async () => {
    const pariwarId = freshPariwar();
    const trust = await authenticate('Kalpana Bharti');
    await grantRole(trust.userId, pariwarId, 'super_admin', 'global');
    const admin = await authenticate('Dhiraj Rahul');
    await grantRole(admin.userId, pariwarId, 'pariwar_admin');

    await trust.client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: true, revealToPublic: true },
        rationale: 'The Trust reveals this target publicly.',
      },
    });
    const before = await storedVisibility(pariwarId);
    expect(before).not.toBeNull();

    // The Pariwar Admin then changes the target twice.
    await admin.client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody() });
    await admin.client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(900_000, 1),
    });

    // ⭐ BYTE-UNCHANGED — every column, including `updated_at` and the Trust's own rationale.
    // ⚠ TRUE BY CONSTRUCTION (D2: the target setter cannot name a flag column), asserted anyway —
    // this is what would fail if someone merged the two records back together.
    expect(await storedVisibility(pariwarId)).toEqual(before);
    // …and the target really did change, so the assertion above is not vacuous.
    expect(await resolverTarget(pariwarId)).toBe(900_000);
  });

  it('the reveal PUT cannot carry a target — `.strict()` makes it unrepresentable (400)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: true, revealToPublic: false },
        rationale: 'Smuggling a target through the reveal route.',
        targetInr: 1,
      },
    });
    // ⭐ D2's guarantee made unrepresentable on the wire, ⛔ not merely unenforced: a reveal can
    // never change what is being revealed.
    expect(res.statusCode).toBe(400);
  });

  // ── AC6 — NOTHING RENDERS IT ──────────────────────────────────────────────────────────────────

  it('⛔⛔ the target appears in ⛔ NO public drive or drive-page response (AC6)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');
    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody(1_234_567) });

    // The unauthenticated public drive index for this Pariwar. ⛔ A TOKEN assertion: the figure, its
    // field names and the reveal flags must not appear anywhere in the body.
    const index = await makeClient(app).inject({
      method: 'GET',
      url: `/api/v1/p/${pariwarId}/public-pages/sahyog-drive`,
    });
    // ⚠ The status is not the subject — an empty or absent index is a fine outcome for a fresh
    // Pariwar. What is asserted is that the target is nowhere in whatever came back.
    const raw = index.body;
    expect(raw).not.toContain('1234567');
    expect(raw).not.toContain('targetInr');
    expect(raw).not.toContain('target_inr');
    expect(raw).not.toContain('revealToMembers');
    expect(raw).not.toContain('revealToPublic');
  });

  it('⚠⛔ …and what that assertion does ⛔ NOT cover is RECORDED, ⛔ not mistaken for covered (D3)', () => {
    // ⭐⭐ THE TEST ABOVE IS A **TOKEN** ASSERTION, AND STORY 11b.14 SHIPS A **DERIVED** CHANNEL IT
    // WOULD PASS STRAIGHT THROUGH. D's meter is `round(amountRaisedInr / target × 100)` and D's AC3
    // DISPLAYS `amountRaisedInr` itself ⇒ a reader recovers `target ≈ amount / percentage` from TWO
    // PUBLISHED numbers, to within the rounding band.
    // ⇒ ⛔ BOTH this story's "the target appears in no response" test AND story D's own can pass
    // while the hidden figure is publicly DERIVABLE.
    // ⚠ It is a consequence of a RATIFIED COMBINATION (`-189` cl.2(b) ratifies a bar; cl.2(c) and
    // `-190` cl.7(b) hide the target), ⛔ not a defect in any one ruling — so it is ⛔ not
    // re-litigated here and ⛔ not answered by narrowing this story.
    // ⇒ **D3 is ROUTED to Story 11b.14 (AC2 + Task 3) with the question OPEN**, and the mitigation
    // lives at D's RENDER BOUNDARY. ⛔ This story renders nothing, so D3 blocks no task here.
    // ⛔ Do not "fix" it by adding an assertion to this file — there is nothing here to fix.
    expect(true).toBe(true);
  });
});
