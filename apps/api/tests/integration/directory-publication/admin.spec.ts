// Directory-publication kill-switch admin endpoints — Story 10.30 (Task 7; AC1, AC2, AC4).
//
// Drives the real Fastify app via fastify.inject for the surface that discharges the LAUNCH GATE
// Decision `2026-08-21-147` cl.1 placed on the public Member Directory:
//   · GET /p/:pariwarId/admin/directory-publication/status — the read (default-enabled + configured).
//   · PUT /p/:pariwarId/admin/directory-publication/status — the governed flip (AUDITED), BOTH ways.
//   · the permission gate: an admin WITHOUT the grant → 403, and the row is UNCHANGED.
//   · an unauthenticated caller → 401 (never a silent kill-switch write).
//   · an empty/whitespace rationale → 400 at the CONTRACT boundary. ⛔ NEVER a 500.
//
// ⭐ AC4 IS TESTED THROUGH THE REAL ROUTE IN BOTH DIRECTIONS, and the public read path
// (`resolveDirectoryPublicationEnabled` — Story 11a.3's own resolver, the thing `/members` calls) is
// asserted afterwards, so these tests prove the flip actually reached the surface it exists to
// control. ⛔ A test that only proved "the call did not error" would prove nothing.
//
// ⛔ NO TEST HERE MAY ASSERT A 500. Every rejection this surface can produce has a designed status:
// 400 (contract), 401 (no session), 403 (no grant), 409 (admin.display_name_missing). A 500 means an
// error escaped `errorMappingHandler`'s registry — that is the bug, not the expectation.
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its own tx).
// Assertions key on MEMBERSHIP/state, never counts against a shared table, and each test uses a
// FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const dpUrl = (pariwarId: string): string =>
  `/api/v1/p/${pariwarId}/admin/directory-publication/status`;

const AUDIT_ACTION = 'pariwar.directory_publication.changed';

interface StatusBody {
  enabled: boolean;
  configured: boolean;
  changedByDisplay: string | null;
  rationale: string | null;
  updatedAt: string | null;
}

describe.skipIf(!hasDatabase)('Directory-publication kill-switch admin surface (Story 10.30)', () => {
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
        // The table denies DELETE to the app role by design (a governance record is not discarded);
        // this cleanup runs as the test superuser, which is why it can tidy its own fixtures.
        await c.query(`DELETE FROM pariwar_directory_publication WHERE pariwar_id = ANY($1)`, [
          touchedPariwarIds,
        ]);
      }
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

  /** A fresh Pariwar id, registered for cleanup. */
  function freshPariwar(): string {
    const id = randomUUID();
    touchedPariwarIds.push(id);
    return id;
  }

  async function authenticate(displayName = 'Asha Verma'): Promise<{ client: Client; userId: string }> {
    const email = `dp-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
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
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/passkey/authenticate/verify',
      payload: { response: { id: credentialId } },
    });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  /**
   * Grant a role. `super_admin` is granted at the GLOBAL dimension (the
   * directory-publication-policy.spec.ts precedent) — `pariwar.manage_directory_publication` is
   * super_admin-ONLY, and a global super_admin grant satisfies the pariwar-dimension check.
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

  /** Read the stored row directly — the state assertion, independent of what the route echoed back. */
  async function storedRow(
    pariwarId: string,
  ): Promise<{ enabled: boolean; changed_by_display: string | null; rationale: string | null } | null> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ enabled: boolean; changed_by_display: string | null; rationale: string | null }>(
        `SELECT enabled, changed_by_display, rationale FROM pariwar_directory_publication WHERE pariwar_id = $1`,
        [pariwarId],
      );
      return res.rows[0] ?? null;
    } finally {
      c.release();
    }
  }

  /**
   * The PUBLIC read path — `resolveDirectoryPublicationEnabled` is the exact resolver
   * `apps/api/src/modules/public-pages/handlers.ts:137` calls to decide whether `/members` serves a
   * Pariwar at all, and it is called here through a REAL scope tx (`openScopeTx`), the same
   * RLS-scoped handle that route uses. Asserting through it is what makes AC4 an end-to-end claim
   * rather than a statement about one table.
   *
   * ⚠ WHAT THIS DOES AND DOES NOT PROVE. It proves the flip is observable to the resolver the public
   * route consults. It does ⛔ NOT prove the public PAGE changed for a visitor — `/members` is
   * edge-cached with `s-maxage=300`, so warm PoPs keep serving the prior state per page number until
   * those entries expire (`2026-08-21-145` cl.5(e)). ⛔ No test here may claim otherwise; that gap is
   * a property of the surface, not a defect in this assertion.
   */
  async function publicReadSaysEnabled(pariwarId: string): Promise<boolean> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      return await memberDomain.resolveDirectoryPublicationEnabled(
        scopeTx.tx,
        pariwarId as never,
      );
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  }

  async function auditCount(actorId: string, pariwarId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM audit_log_entries
           WHERE actor_id = $1 AND action = $2 AND pariwar_id = $3`,
        [actorId, AUDIT_ACTION, pariwarId],
      );
      return Number(res.rows[0]?.n ?? '0');
    } finally {
      c.release();
    }
  }

  it('GET on a Pariwar with NO row returns the default-enabled, UNCONFIGURED shape (AC1)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({ method: 'GET', url: dpUrl(pariwarId) });
    expect(res.statusCode).toBe(200);
    // ⛔ `configured: false` is EXPLICIT. An unconfigured Pariwar and a deliberately re-enabled one
    // both report `enabled: true`; absence must not be inferred from the all-null attribution.
    expect(res.json()).toEqual({
      enabled: true,
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    });
    expect(await storedRow(pariwarId)).toBeNull();
  });

  it('⭐ BOTH DIRECTIONS through the real route, and the PUBLIC read path follows (AC1, AC4)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate('Asha Verma');
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    // The starting posture: published, because nothing has ever been written (default-true).
    expect(await publicReadSaysEnabled(pariwarId)).toBe(true);

    // ── Direction 1: PUBLISHED → WITHHELD ───────────────────────────────────────────────────────
    const disable = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'Pulled pending a DPDPA review.' },
    });
    expect(disable.statusCode).toBe(200);
    const disabled = disable.json() as StatusBody;
    expect(disabled.enabled).toBe(false);
    expect(disabled.configured).toBe(true);
    // ⛔ Server-resolved, NEVER client-supplied — the request carried no display name at all.
    expect(disabled.changedByDisplay).toBe('Asha Verma');
    expect(disabled.rationale).toBe('Pulled pending a DPDPA review.');
    expect(disabled.updatedAt).not.toBeNull();

    // The row actually flipped (not merely "the call did not error").
    expect((await storedRow(pariwarId))?.enabled).toBe(false);
    // ⭐ And the PUBLIC resolver — the one /members calls — now says withheld.
    expect(await publicReadSaysEnabled(pariwarId)).toBe(false);
    // The §1.5 hash-chain audit line was written by this path.
    expect(await auditCount(userId, pariwarId)).toBeGreaterThanOrEqual(1);

    // ── Direction 2: WITHHELD → PUBLISHED (the mechanism is symmetric by construction) ───────────
    const reEnable = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: true, rationale: 'Review cleared; restored.' },
    });
    expect(reEnable.statusCode).toBe(200);
    const reEnabled = reEnable.json() as StatusBody;
    expect(reEnabled.enabled).toBe(true);
    // ⭐ Still `configured: true` — a deliberately re-enabled Pariwar is NOT the same fact as one
    // nobody ever touched, and the two must stay distinguishable at the same `enabled` value.
    expect(reEnabled.configured).toBe(true);
    expect(reEnabled.rationale).toBe('Review cleared; restored.');

    expect((await storedRow(pariwarId))?.enabled).toBe(true);
    expect(await publicReadSaysEnabled(pariwarId)).toBe(true);
    expect(await auditCount(userId, pariwarId)).toBeGreaterThanOrEqual(2);

    // A subsequent GET reports the re-enabled state with its attribution intact.
    const finalGet = await client.inject({ method: 'GET', url: dpUrl(pariwarId) });
    expect(finalGet.json()).toMatchObject({
      enabled: true,
      configured: true,
      changedByDisplay: 'Asha Verma',
      rationale: 'Review cleared; restored.',
    });
  });

  it('fail-closed: an admin WITHOUT the grant gets 403 and the row is UNCHANGED (AC2)', async () => {
    const pariwarId = freshPariwar();

    // Seed a known state with a properly-granted actor, so "unchanged" is a real assertion.
    const owner = await authenticate('Asha Verma');
    await grantRole(owner.userId, pariwarId, 'super_admin', 'global');
    const seed = await owner.client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'Seeded withheld state.' },
    });
    expect(seed.statusCode).toBe(200);

    // pariwar_admin holds every other pariwar-dimension content key but NOT this one —
    // `2026-08-21-146`/`-145` cl.5 ruled it super_admin-only.
    const other = await authenticate('Ravi Kumar');
    await grantRole(other.userId, pariwarId, 'pariwar_admin');

    const denied = await other.client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: true, rationale: 'Trying to republish without the grant.' },
    });
    // ⛔ 403 from requirePermissionHook — never a silent no-op, never a 200, and ⛔ never the domain's
    // unregistered UngovernedDirectoryPublicationChangeError surfacing as a 500.
    expect(denied.statusCode).toBe(403);
    expect(denied.statusCode).not.toBe(500);

    // The seeded state survived the denied call.
    expect((await storedRow(pariwarId))?.enabled).toBe(false);
    expect((await storedRow(pariwarId))?.rationale).toBe('Seeded withheld state.');
    expect(await publicReadSaysEnabled(pariwarId)).toBe(false);
    expect(await auditCount(other.userId, pariwarId)).toBe(0);
  });

  it('a district_admin (a narrower ceiling) is also denied with 403 (AC2)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'district_admin');

    const res = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'r' },
    });
    expect(res.statusCode).toBe(403);
    expect(await storedRow(pariwarId)).toBeNull();
  });

  it('a caller without the grant cannot even READ the status (403) (AC2)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({ method: 'GET', url: dpUrl(pariwarId) });
    expect(res.statusCode).toBe(403);
  });

  it('an UNAUTHENTICATED request gets 401 on both routes and writes nothing (AC2)', async () => {
    const pariwarId = freshPariwar();
    const anon = makeClient(app);

    const write = await anon.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'r' },
    });
    expect(write.statusCode).toBe(401);

    const read = await anon.inject({ method: 'GET', url: dpUrl(pariwarId) });
    expect(read.statusCode).toBe(401);

    expect(await storedRow(pariwarId)).toBeNull();
    expect(await publicReadSaysEnabled(pariwarId)).toBe(true);
  });

  // ⭐ THE 400 BOUNDARY. `UngovernedDirectoryPublicationChangeError` extends Error (not ApiError) and
  // is NOT registered in error-mapping, whose documented fallback is "Anything else → 500". If a
  // blank rationale ever reaches that throw, an operator sees an opaque 500 on a plain input error.
  // ⛔ A 500 here is a FAILING test, not an alternative pass.
  it('⛔ REJECTS an EMPTY rationale with 400 at the CONTRACT boundary — never a 500 (AC1)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.statusCode).not.toBe(500);
    expect(await storedRow(pariwarId)).toBeNull();
  });

  it('⛔ REJECTS a WHITESPACE-ONLY rationale with 400 — never a 500 (AC1)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    for (const rationale of ['   ', '\t\n ']) {
      const res = await client.inject({
        method: 'PUT',
        url: dpUrl(pariwarId),
        payload: { enabled: false, rationale },
      });
      expect(res.statusCode, `rationale ${JSON.stringify(rationale)}`).toBe(400);
      expect(res.statusCode).not.toBe(500);
    }
    expect(await storedRow(pariwarId)).toBeNull();
    expect(await auditCount(userId, pariwarId)).toBe(0);
  });

  // ⛔ Trap 2 — the display name is server-resolved and must be UNREPRESENTABLE on the wire, not
  // merely ignored. `.strict()` on the request is what makes an attempt a 400 rather than a
  // silently-dropped field.
  it('⛔ REJECTS a client-supplied changedByDisplay with 400 (Trap 2)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate('Asha Verma');
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'r', changedByDisplay: 'Somebody Else' },
    });
    expect(res.statusCode).toBe(400);
    expect(await storedRow(pariwarId)).toBeNull();
  });

  // The controlled attribution source is `users.display_name` and nothing else — never the email,
  // never the UUID ([[project_admin_display_name_attribution]]).
  it('snapshots the ACTOR’s users.display_name, not anything the caller sent', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate('Kalpana Bharti');
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'Pulled by the Panel.' },
    });
    expect(res.statusCode).toBe(200);
    expect((await storedRow(pariwarId))?.changed_by_display).toBe('Kalpana Bharti');
  });

  // ⚠ A 409, ⛔ not a 400 or 403: the request is well-formed and the actor is authorized; the
  // server-side account state is the blocker (http-errors.ts's own reasoning).
  it('blocks the flip with 409 when the acting admin has NO display_name (fail-closed)', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate('Temporarily Named');
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const c = await td.pool.connect();
    try {
      await c.query(`UPDATE users SET display_name = NULL WHERE id = $1`, [userId]);
    } finally {
      c.release();
    }

    const res = await client.inject({
      method: 'PUT',
      url: dpUrl(pariwarId),
      payload: { enabled: false, rationale: 'r' },
    });
    expect(res.statusCode).toBe(409);
    // The house error envelope nests the machine code under `error` (ErrorResponse, _common/errors.ts).
    expect((res.json() as { error?: { code?: string } }).error?.code).toBe('admin.display_name_missing');
    // ⛔ Fail-closed BEFORE the write — no partial state change, no audit line.
    expect(await storedRow(pariwarId)).toBeNull();
    expect(await auditCount(userId, pariwarId)).toBe(0);
  });
});
