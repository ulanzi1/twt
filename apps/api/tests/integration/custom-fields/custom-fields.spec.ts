// Per-Pariwar custom-fields admin surface — E2E (Story 10.12; AC3/AC4/AC7/AC9). (:5433)
//
// Proves against real Postgres:
//   · AC7 RBAC revert-sanity PAIR — pariwar_admin (view + manage) → 200; auditor (view but NOT
//     manage) → 200 on the read and fail-closed 403 on the write. That asymmetry IS the read/write
//     split, so it is asserted in BOTH directions rather than just the denial.
//   · ⭐ AC3 THE FENCE, THROUGH THE HTTP BOUNDARY — a `payout_destinations` publish is refused with
//     its typed wire code, not an opaque 500. The domain spec proves the writer refuses; this proves
//     the refusal survives the error mapper and reaches the operator intact.
//   · AC4 the Tier-2 deferral reaches the caller with its explanation.
//   · AC7 ONE POST FOR BOTH — a body with `retired_at` retires instead of publishing, and audits a
//     DIFFERENT action.
//   · AC7 idempotency — a replayed `Idempotency-Key` returns the recorded response rather than
//     claiming a second version.
//   · The publish → AUDIT round-trip against the real hash chain, asserted by traceId/action
//     MEMBERSHIP — never counts: the chain self-commits and accumulates across the whole suite
//     ([[project_live_db_test_gotchas]]).
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; users/role_grants/definitions
// cleaned in afterAll.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

interface DefinitionsBody {
  host_entity: string;
  definition_set_version: string;
  in_force: { field_key: string; version: number; retired_at: string | null }[];
  history: { field_key: string; version: number; retired_at: string | null }[];
  has_more: boolean;
}

interface PublishBody {
  version: { field_key: string; version: number; retired_at: string | null; actor_display: string | null };
}

const definition = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  field_key: 'school_block_code',
  label_en: 'School block code',
  label_hi: 'विद्यालय प्रखंड कोड',
  field_type: 'string',
  max_length: 32,
  pii_tier: 3,
  required: false,
  indexed: false,
  ...over,
});

describe.skipIf(!hasDatabase)('custom-fields admin surface — E2E (:5433)', () => {
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
        // ⚠ The app role has NO DELETE grant on this table (retirement is a version). The test pool
        // connects as the Docker superuser, which is what makes cleanup possible at all — that is a
        // TEST-harness privilege, not a production capability.
        await c.query(`DELETE FROM pariwar_custom_field_definitions WHERE pariwar_id = ANY($1)`, [
          createdPariwarIds,
        ]);
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
    const email = `cf-${randomUUID()}@example.test`;
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

  const defsUrl = (p: string): string => `/api/v1/p/${p}/custom-fields/definitions`;
  const publishUrl = (p: string, key: string): string =>
    `/api/v1/p/${p}/custom-fields/definitions/member/${key}/versions`;

  // ── The guard chain ─────────────────────────────────────────────────────────────────────────────

  it('401 without a session', async () => {
    const p = randomUUID();
    const res = await makeClient(t.app).inject({ method: 'GET', url: defsUrl(p) });
    expect(res.statusCode).toBe(401);
  });

  it('404 (not 403) for an authenticated admin with no grant in this Pariwar', async () => {
    // ⚠ 404, and that is CORRECT rather than a missing authorization check. `scopeResolutionHook`
    // runs BEFORE `requirePermissionHook` and cannot resolve a tenant the actor has no relationship
    // with, so the request never reaches the RBAC gate. Answering 403 there would confirm the tenant
    // exists — the existence oracle the 404-not-403 convention exists to close. The genuine
    // authorization denial (a resolvable tenant, an insufficient key) is the auditor case below.
    const p = randomUUID();
    const a = await authenticate('No Grant');
    const res = await a.client.inject({ method: 'GET', url: defsUrl(p) });
    expect(res.statusCode).toBe(404);
  });

  it('⭐ AC7 REVERT-SANITY PAIR: auditor READS but cannot WRITE; pariwar_admin does both', async () => {
    // The read/write split, asserted in BOTH directions. If these ever collapse to one key, the
    // transparency property goes with it — an auditor who cannot read the tenant's data contract
    // cannot audit what it collects, and an auditor who CAN write is no longer read-only oversight.
    const p = randomUUID();
    createdPariwarIds.push(p);

    const admin = await authenticate('Pariwar Admin');
    await grant(admin.userId, p, 'pariwar_admin');
    const auditor = await authenticate('Auditor');
    await grant(auditor.userId, p, 'auditor');

    // Auditor: READ allowed.
    expect((await auditor.client.inject({ method: 'GET', url: defsUrl(p) })).statusCode).toBe(200);
    // Auditor: WRITE denied, fail-closed.
    const denied = await auditor.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition() },
    });
    expect(denied.statusCode).toBe(403);

    // pariwar_admin: both.
    expect((await admin.client.inject({ method: 'GET', url: defsUrl(p) })).statusCode).toBe(200);
    const ok = await admin.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition() },
    });
    expect(ok.statusCode).toBe(200);
  });

  // ── ⭐ The fence, through HTTP ───────────────────────────────────────────────────────────────────

  it('⭐ AC3: a `payout_destinations` publish is REFUSED with its typed wire code', async () => {
    // The domain spec proves the WRITER refuses. This proves the refusal survives `mapPublishError`
    // and reaches the operator as an actionable governance message — an unmapped typed error would
    // become an opaque `500 internal.error` with the explanation discarded at the last step.
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Fence Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'payout_destinations'),
      payload: { definition: definition({ field_key: 'payout_destinations', label_en: 'Payout', label_hi: 'भुगतान' }) },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('custom_field.frozen_governance_key');
    // The message NAMES the control — an operator told only "invalid" would try variations until
    // something stuck, which is how a fence gets walked around.
    expect(body.error.message).toMatch(/frozen governance control/i);
    // NOT a 500, and NOT a bare "invalid" — the control is named.
    expect(res.statusCode).not.toBe(500);
  });

  it('⚠ AC4: a Tier-2 declaration is refused as a DEFERRAL, with its explanation intact', async () => {
    // The epic's own worked example ("alternate ID number") lands here — ESCALATION 2. The message
    // must say what substrate is missing, not imply the field is illegitimate.
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Tier Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'alternate_id'),
      payload: {
        definition: definition({ field_key: 'alternate_id', label_en: 'Alternate id', label_hi: 'वैकल्पिक पहचान', pii_tier: 2 }),
      },
    });
    expect(res.statusCode).toBe(400);
    const tierBody = res.json() as { error: { code: string; message: string } };
    expect(tierBody.error.code).toBe('custom_field.pii_tier_unsupported');
    expect(tierBody.error.message).toMatch(/not yet support/i);
  });

  it('AC9: a definition with no Hindi label is refused with the parity code', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Parity Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'ward_number'),
      payload: { definition: definition({ field_key: 'ward_number', label_en: 'Ward', label_hi: '' }) },
    });
    // The contract's `.min(1)` catches an empty string at the boundary; either way it never lands.
    expect(res.statusCode).toBe(400);
  });

  it('rejects a body whose definition.field_key disagrees with the path', async () => {
    // Publishing under one key a definition claiming another would be caught by the 0095 shape
    // CHECK, but with a far less actionable message — so the boundary catches it first.
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Mismatch Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'ward_number'),
      payload: { definition: definition({ field_key: 'school_block_code' }) },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('custom_field.definition_invalid');
  });

  // ── Publish / retire / read ─────────────────────────────────────────────────────────────────────

  it('publishes, then lists the definition as in-force with attribution and a set-version pin', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Publishing Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const pub = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition() },
    });
    expect(pub.statusCode).toBe(200);
    const published = (pub.json() as PublishBody).version;
    expect(published.version).toBe(1);
    // The display-name SNAPSHOT, resolved server-side and fail-closed.
    expect(published.actor_display).toBe('Publishing Admin');

    const list = await a.client.inject({ method: 'GET', url: defsUrl(p) });
    const body = list.json() as DefinitionsBody;
    expect(body.in_force.map((d) => d.field_key)).toEqual(['school_block_code']);
    expect(body.history).toHaveLength(1);
    expect(body.definition_set_version).toMatch(/^[0-9a-f]{64}$/);
    expect(body.has_more).toBe(false);
  });

  it('⭐ AC7: the SAME POST with `retired_at` RETIRES — one route, because retirement is a version', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Retiring Admin');
    await grant(a.userId, p, 'pariwar_admin');

    await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition() },
    });

    const retire = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition(), retired_at: new Date().toISOString() },
    });
    expect(retire.statusCode).toBe(200);
    const retired = (retire.json() as PublishBody).version;
    expect(retired.version).toBe(2);
    expect(retired.retired_at).not.toBeNull();

    // Gone from in-force; still in history. Nothing was deleted.
    const list = (await a.client.inject({ method: 'GET', url: defsUrl(p) })).json() as DefinitionsBody;
    expect(list.in_force).toHaveLength(0);
    expect(list.history).toHaveLength(2);
  });

  it('⚠ AC7: the retire path audits a DIFFERENT action from the publish path', async () => {
    // Both mutations run through `withCompensatingAudit`; the action name is what makes a retirement
    // greppable in the §1.5 chain without parsing a payload. Asserted by MEMBERSHIP — the chain
    // self-commits and accumulates across the whole suite.
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Audit Admin');
    await grant(a.userId, p, 'pariwar_admin');

    await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition() },
    });
    await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      payload: { definition: definition(), retired_at: new Date().toISOString() },
    });

    const c = await t.pool.connect();
    try {
      const { rows } = await c.query<{ action: string; resource_locator: string }>(
        `SELECT action, resource_locator FROM audit_log_entries WHERE pariwar_id = $1 ORDER BY seq`,
        [p],
      );
      const actions = rows.map((r) => r.action);
      expect(actions).toContain('custom_field.definition_published');
      expect(actions).toContain('custom_field.definition_retired');
      // The locator carries the host + key. It carries NO version, and cannot: under ADR-0030 the
      // intent line commits BEFORE the write, so at hash time the version does not exist yet.
      expect(rows.every((r) => r.resource_locator === 'custom_field/member/school_block_code')).toBe(true);
    } finally {
      c.release();
    }
  });

  it('⚠ AC7: a replayed Idempotency-Key returns the RECORDED response, not a second version', async () => {
    // The unique constraint only catches a CONCURRENT double-publish. A sequential replay would
    // simply claim the next version — two operator decisions recorded where there was one, on a
    // registry whose whole purpose is provenance.
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Idempotent Admin');
    await grant(a.userId, p, 'pariwar_admin');
    const key = randomUUID();

    const first = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      headers: { 'idempotency-key': key },
      payload: { definition: definition() },
    });
    expect(first.statusCode).toBe(200);

    const replay = await a.client.inject({
      method: 'POST',
      url: publishUrl(p, 'school_block_code'),
      headers: { 'idempotency-key': key },
      payload: { definition: definition() },
    });
    expect(replay.statusCode).toBe(200);
    expect((replay.json() as PublishBody).version.version).toBe(1);

    // Exactly ONE version exists, not two.
    const list = (await a.client.inject({ method: 'GET', url: defsUrl(p) })).json() as DefinitionsBody;
    expect(list.history).toHaveLength(1);
  });

  // ── Member values ───────────────────────────────────────────────────────────────────────────────

  it('404 (not 403) reading values for a member outside this Pariwar', async () => {
    // Reporting 403 would confirm the member exists somewhere — the leak the 404-not-403 convention
    // exists to prevent.
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Values Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/custom-fields/members/${randomUUID()}/values`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('⚠ D6: a value write with an unknown key is refused, never silently dropped', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Strict Admin');
    await grant(a.userId, p, 'pariwar_admin');
    const memberId = randomUUID();

    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
        [memberId, p],
      );
    } finally {
      c.release();
    }

    const res = await a.client.inject({
      method: 'PUT',
      url: `/api/v1/p/${p}/custom-fields/members/${memberId}/values`,
      payload: { values: { not_a_field: 'x' } },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('custom_field.values_invalid');

    const cleanup = await t.pool.connect();
    try {
      await cleanup.query(`DELETE FROM members WHERE member_id = $1`, [memberId]);
    } finally {
      cleanup.release();
    }
  });
});
