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
import { readFileSync } from 'node:fs';

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
/** ⭐ Pass 2 / G2 — the reveal action appeared in ⛔ NO test, so an unwritten visibility audit line
 *  was invisible to this suite. */
const VISIBILITY_AUDIT_ACTION = 'pariwar.drive_target_visibility.changed';

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
   *
   * ⚠⛔ **THE COMMENT ABOVE IS TRUE BUT INCOMPLETE, AND THE MISSING HALF IS LOAD-BEARING** (code
   * review Pass 2 / G2). A review layer flagged that this stamps `pariwar_id` with the Pariwar under
   * test even for `dimension: 'global'`, and argued the fixture therefore ⛔ could not distinguish
   * *"a global grant satisfies a pariwar-dimension check"* from *"the row happens to name this
   * Pariwar"*. ⭐ **Investigated, and the row's `pariwar_id` is REQUIRED — ⛔ not incidental.**
   * `loadActorGrants` queries `role_grants WHERE user_id = $1` with ⛔ NO Pariwar predicate, but it
   * runs on the **RLS-scoped** `scopeTx.client`, so `role_grants` is filtered to the active Pariwar
   * by the tenant policy. ⇒ a grant row that does ⛔ not name this Pariwar is **invisible**, whatever
   * its dimension. ⭐ BOTH halves do work: `pariwar_id` decides whether the row is SEEN, and
   * `scope_dimension: 'global'` + `scope_value: null` decides whether it SATISFIES a
   * pariwar-dimension check. ⛔ Do not "fix" this by giving the global grant a different
   * `pariwar_id` — that hides it and every reveal test 403s. The property is pinned by its own test
   * below (*a global grant on ANOTHER Pariwar is not seen here*).
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

  /** The audit line's own id for a Pariwar + action — the anchor a written row must carry. */
  async function auditLineIds(pariwarId: string, action: string): Promise<string[]> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT audit_id::text AS id FROM audit_log_entries
           WHERE pariwar_id = $1 AND action = $2 ORDER BY seq`,
        [pariwarId, action],
      );
      return (res.rows as { id: string }[]).map((r) => r.id);
    } finally {
      c.release();
    }
  }

  /** The schedule row's recorded audit anchor. */
  async function storedTargetAuditIds(pariwarId: string): Promise<string[]> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT audit_id::text AS audit_id FROM pariwar_drive_target_schedule
           WHERE pariwar_id = $1 ORDER BY version`,
        [pariwarId],
      );
      return (res.rows as { audit_id: string }[]).map((r) => r.audit_id);
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

  it('⭐⭐ the row\'s `audit_id` IS the id of a REAL audit line — the anchor JOINS', async () => {
    // ⚠⛔ THE ASSERTION WHOSE ABSENCE LET A DANGLING ANCHOR SHIP (code review Pass 2 / G2).
    // `withCompensatingAudit` writes the audit line and hands ITS id to the `mutate` callback; both
    // handlers used to DISCARD that parameter and write a locally minted `randomUUID()` instead.
    // ⇒ every governance row's `audit_id` pointed at a row that ⛔ DOES NOT EXIST — on the surface
    // whose whole justification is provenance, and in the column the schema calls *"the join back
    // to it"*. ⛔ The column has no FK and the domain guard checks only NON-NULL, so ⛔ nothing
    // failed: only this assertion can. ⛔ Do not weaken it to a shape/`toBeTruthy` check — a random
    // UUID passes those, which is exactly how the defect survived two review passes.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody() });
    await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: { ...goodBody(), targetInr: 750_000, expectedVersion: 1 },
    });

    const anchors = await storedTargetAuditIds(pariwarId);
    const lineIds = await auditLineIds(pariwarId, TARGET_AUDIT_ACTION);
    expect(anchors).toHaveLength(2);
    expect(lineIds).toHaveLength(2);
    // ⭐ Every anchor resolves to a real line, and the two versions carry DIFFERENT anchors (so a
    // single shared or copied-forward id cannot pass either).
    expect([...anchors].sort()).toEqual([...lineIds].sort());
    expect(new Set(anchors).size).toBe(2);
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

  it('⭐⭐ CROSS-PARIWAR — a `pariwar_admin` of A is REFUSED on B, and writes NOTHING to B', async () => {
    // ⚠⛔ FAMILY 3's ACTUAL CASE, MISSING UNTIL CODE REVIEW PASS 2 / G2. The two denials above are
    // (a) a role INSIDE the tenant that lacks the key → 403, and (b) an admin with ⛔ NO grant
    // ANYWHERE → 404. ⛔ NEITHER is the tenancy regression this family exists for: an actor who is
    // legitimately a `pariwar_admin` **somewhere** reaching into a Pariwar that is ⛔ not theirs.
    // ⭐ The 404 test's own comment contrasts *"this Pariwar is not yours"* with *"it is yours, but
    // you lack this key"* — but its actor has ⛔ no Pariwar at all, so "not yours" was ⛔ never
    // actually contrasted against "yours". A same-tenant-non-owner check is ⛔ not a cross-tenant
    // check ([[feedback_trace_reachability_before_escalating]] — prove the boundary, don't infer it).
    const pariwarA = freshPariwar();
    const pariwarB = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarA, 'pariwar_admin'); // ⭐ a REAL grant — but on A only.

    // Sanity: the grant genuinely works on A, so a refusal on B cannot be blamed on a dud fixture.
    const onA = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarA),
      payload: goodBody(),
    });
    expect(onA.statusCode).toBe(200);

    for (const url of [targetUrl(pariwarB), visibilityUrl(pariwarB)]) {
      const write = await client.inject({
        method: 'PUT',
        url,
        payload: url.endsWith('visibility')
          ? { visibility: { revealToMembers: true, revealToPublic: false }, rationale: 'x' }
          : goodBody(),
      });
      expect(write.statusCode).toBe(404); // ⛔ B is not theirs — never 200, never a partial write.
      const read = await client.inject({ method: 'GET', url });
      expect(read.statusCode).toBe(404);
    }

    // ⭐ B is UNTOUCHED, asserted at the table — ⛔ not inferred from the status codes.
    expect(await storedTargets(pariwarB)).toHaveLength(0);
    expect(await storedVisibility(pariwarB)).toBeNull();
    // …and A is unharmed by the attempts on B.
    expect(await resolverTarget(pariwarA)).toBe(500_000);
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

  // ── Branches that shipped with ⛔ NO test at all (code review Pass 2 / G2) ────────────────────

  it('⭐ the REVEAL write records its OWN audit line — the action no test had ever named', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: true, revealToPublic: false },
        rationale: 'Members may see it.',
      },
    });
    expect(res.statusCode).toBe(200);
    // ⚠ `auditLines` was only ever called with TARGET_AUDIT_ACTION, so a reveal that wrote ⛔ no
    // audit line — on the SUPER_ADMIN-ONLY DISCLOSURE act — would have been invisible.
    expect(await auditLines(pariwarId, VISIBILITY_AUDIT_ACTION)).toBe(1);
  });

  it('⭐ the REVEAL route is idempotency-wrapped too — a replay does ⛔ not write twice', async () => {
    // ⚠ The whole `drive-target:visibility:${pariwarId}` namespace was untested, so the
    // namespace-collision guarantee between the two PUTs was asserted ⛔ NOWHERE.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');
    const key = randomUUID();
    const payload = {
      visibility: { revealToMembers: true, revealToPublic: true },
      rationale: 'Publish it.',
    };

    const first = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload,
      headers: { 'idempotency-key': key },
    });
    const replay = await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload,
      headers: { 'idempotency-key': key },
    });
    expect(first.statusCode).toBe(200);
    expect(replay.statusCode).toBe(200);
    // ⭐ ONE audit line for two requests — the replay returned the recorded result.
    expect(await auditLines(pariwarId, VISIBILITY_AUDIT_ACTION)).toBe(1);

    // ⭐⭐ AND THE NAMESPACES DO ⛔ NOT COLLIDE: the SAME key on the TARGET route is a different
    // idempotency identity, so it must run rather than replay the reveal's recorded response.
    const onTarget = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
      headers: { 'idempotency-key': key },
    });
    expect(onTarget.statusCode).toBe(200);
    expect(onTarget.json<TargetBody>().targetInr).toBe(500_000);
    expect(await auditLines(pariwarId, TARGET_AUDIT_ACTION)).toBe(1);
  });

  it('⛔ a BLANK Idempotency-Key is a 400 — ⛔ never a silent downgrade to unprotected', async () => {
    // ⚠⛔ A present-but-unusable key used to be treated as ABSENT, so the write ran completely
    // UNPROTECTED while the caller believed it was protected — and their timeout retry then
    // manufactured the second version the key exists to prevent. ⇒ refuse loudly.
    //
    // ⚠⛔ CLOSURE HONESTY — THE OTHER UNUSABLE SHAPE IS ⛔ NOT CONSTRUCTIBLE HERE. Real Fastify
    // surfaces a REPEATED `Idempotency-Key` as `string[]` (a proxy or SDK that appends rather than
    // replaces sends one), and the handler guards `Array.isArray(headerKey)` for exactly that. But
    // `light-my-request`'s `inject` JOINS an array into ONE comma-separated string, so that arm
    // ⛔ cannot be reached through this harness. ⇒ the guard is asserted by the blank case only, and
    // the array case is recorded as un-attested rather than faked with a test that exercises a
    // different code path ([[feedback_record_unattested_no_backfill]]).
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(),
      headers: { 'idempotency-key': '   ' },
    });
    expect(res.statusCode).toBe(400);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('⭐⭐ RLS, ⛔ not dimension alone — a GLOBAL grant on ANOTHER Pariwar is ⛔ not seen here', async () => {
    // ⭐ Pins the half the `grantRole` doc-block explains: `loadActorGrants` has ⛔ NO Pariwar
    // predicate, so it is the RLS-scoped client that filters `role_grants` to the active Pariwar.
    // ⇒ `scope_dimension: 'global'` satisfies the pariwar-DIMENSION check, but the row must still
    // NAME this Pariwar to be visible at all. ⛔ A reviewer who "corrects" the fixture to give the
    // global grant a different `pariwar_id` breaks every reveal test — this is why.
    const here = freshPariwar();
    const elsewhere = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, here, 'pariwar_admin'); // lets scope resolve on `here`
    await grantRole(userId, elsewhere, 'super_admin', 'global'); // global — but on ANOTHER Pariwar

    // The global super_admin grant exists, and is ⛔ invisible under `here`'s scope ⇒ 403, ⛔ not 200.
    const res = await client.inject({ method: 'GET', url: visibilityUrl(here) });
    expect(res.statusCode).toBe(403);
  });

  it('⭐ the target ACCEPTS its ceiling exactly — the bound is `<=`, ⛔ not `<`', async () => {
    // ⚠ Only `MAX + 1` was tested, so a contract narrowed to `< MAX` (or to a smaller number) would
    // have passed every existing assertion.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(100_000_000),
    });
    expect(res.statusCode).toBe(200);
    expect(await resolverTarget(pariwarId)).toBe(100_000_000);
  });

  it('⛔ the TARGET request is `.strict()` too — an unknown field is a 400', async () => {
    // ⚠ Only the visibility PUT's `.strict()` was covered (via the target-smuggling test).
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: { ...goodBody(), revealToPublic: true },
    });
    expect(res.statusCode).toBe(400);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('⛔ a non-null `expectedVersion` against an UNSET Pariwar is a 409, ⛔ never a first write', async () => {
    // ⚠ `null`-vs-null and stale-vs-current were covered; "I believe there is a version 1" against a
    // Pariwar that has none was ⛔ not.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: targetUrl(pariwarId),
      payload: goodBody(500_000, 1),
    });
    expect(res.statusCode).toBe(409);
    expect(await storedTargets(pariwarId)).toHaveLength(0);
  });

  it('⭐ BOTH GETs return the CONFIGURED shape after a write — the non-null DTO arms', async () => {
    // ⚠ Both GET tests only read the UNSET shape, so `toTargetDto`/`toVisibilityDto`'s non-null
    // branches were reached only incidentally through PUT responses.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody() });
    await client.inject({
      method: 'PUT',
      url: visibilityUrl(pariwarId),
      payload: {
        visibility: { revealToMembers: true, revealToPublic: false },
        rationale: 'Members only.',
      },
    });

    const t = await client.inject({ method: 'GET', url: targetUrl(pariwarId) });
    expect(t.statusCode).toBe(200);
    const tb = t.json<TargetBody>();
    expect(tb.configured).toBe(true);
    expect(tb.targetInr).toBe(500_000);
    expect(tb.version).toBe(1);
    expect(tb.changedByDisplay).toBe('Asha Verma');

    const v = await client.inject({ method: 'GET', url: visibilityUrl(pariwarId) });
    expect(v.statusCode).toBe(200);
    const vb = v.json<{ configured: boolean; visibility: Record<string, boolean> }>();
    expect(vb.configured).toBe(true);
    expect(vb.visibility).toEqual({ revealToMembers: true, revealToPublic: false });
  });

  // ── AC6 — NOTHING RENDERS IT ──────────────────────────────────────────────────────────────────

  it('⛔⛔ the target appears in ⛔ NO public drive or drive-page response (AC6)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');
    await client.inject({ method: 'PUT', url: targetUrl(pariwarId), payload: goodBody(1_234_567) });

    // ⚠⛔ THE TOKEN SCAN THAT STOOD HERE WAS VACUOUS AND HAS MOVED (code review Pass 2 / G2).
    // It injected `GET /public-pages/sahyog-drive` for this `freshPariwar()` — a `randomUUID()` that
    // ⛔ NO row is ever created for in this suite — then EXPLICITLY WAIVED the status code and
    // scanned the body. For a Pariwar that does not exist the route returns 404/empty, so
    // `expect('').not.toContain('1234567')` is a TAUTOLOGY: adding `targetInr` to the public payload
    // would have left it GREEN. ⛔ It guarded AC6's headline invariant and asserted nothing.
    // ⭐ IT NOW LIVES IN `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts`, whose
    // fixture seeds a REAL Pariwar with a REAL closed drive serving a REAL 200 — and which now also
    // sets a target AND reveals it to members and the public first, so the scan runs in the state
    // most likely to leak. ⛔ Do not re-add a fixture-less scan here; this suite cannot build a
    // public page, and a scan that cannot fail is worse than no scan.
    //
    // ⭐ What IS constructible here, and is asserted instead: the admin-facing response is the ONLY
    // place the figure appears, and it is reached through the permission gate.
    const authedEcho = await client.inject({ method: 'GET', url: targetUrl(pariwarId) });
    expect(authedEcho.statusCode).toBe(200);
    expect(authedEcho.body).toContain('1234567');
  });

  it('⛔⛔ …and ⛔ NO MEMBER-facing route carries the target or either flag (AC6, the other half)', () => {
    // ⚠⛔ AC6 names TWO surfaces — *"⛔ no public surface **and ⛔ no member surface**"* — and the
    // scan it shipped with covered ⛔ NEITHER (it was fixture-less) and named only the public one.
    // ⭐ The MEMBER half is proven here the way it is actually true: **BY CONSTRUCTION**. No member
    // contract composes these shapes and no member route reads the resolvers, so there is no member
    // response to scan — which is a STRONGER guarantee than a token scan, and the honest way to
    // state it. This assertion fails the moment that stops being true.
    const memberFacingContractSources = [
      'packages/contracts/src/index.ts',
      'apps/api/src/server.ts',
    ];
    for (const rel of memberFacingContractSources) {
      const src = readFileSync(new URL(`../../../../../${rel}`, import.meta.url), 'utf8');
      // The barrel/registration may NAME the drive-target module (it must, to register it) but must
      // ⛔ never re-export its field shapes into a member or public surface.
      expect(src).not.toContain('targetInr');
      expect(src).not.toContain('revealToMembers');
      expect(src).not.toContain('revealToPublic');
    }
  });

  it('⚠⛔ …and the DERIVED channel neither scan covers is RECORDED, ⛔ not mistaken for covered (D3)', () => {
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
    //
    // ⚠⛔ THE VEHICLE WAS `expect(true).toBe(true)` UNTIL CODE REVIEW PASS 2 / G2. Pass 1 dismissed
    // that as the closure-honesty idiom; ⭐ that dismissal became untenable once the AC6 scan
    // directly ABOVE it turned out to be vacuous too — two adjacent always-green cases presenting
    // as AC6's coverage. The explanation above is genuinely valuable and stays; what it must ⛔ not
    // do is inflate the suite's pass count with a case that CANNOT fail.
    // ⇒ the assertion below is a REAL one: it pins that D3 is still OPEN and still ROUTED, by
    // reading the routing target. ⛔ When 11b.14 answers D3, this fails and someone must revisit
    // this note rather than leaving a stale "routed" claim behind.
    const storyD = readFileSync(
      new URL('../../../../../_bmad-output/implementation-artifacts/11b-14-live-drives-listed-and-the-progress-meter.md', import.meta.url),
      'utf8',
    );
    expect(storyD).toContain('D3');
  });
});
