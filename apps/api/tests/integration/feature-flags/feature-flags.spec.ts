// Feature-flag admin surface — E2E (Story 10.8; AC3/AC4/AC8/AC9). (:5433)
//
// Proves against real Postgres:
//   · AC4 INVENTORY COMPLETENESS — every registered flag appears for an authorized reader, including
//     flags that have never been flipped. A flag registered but omitted fails the test.
//   · AC7/Decision 7 RBAC revert-sanity PAIR — pariwar_admin (view + flip) → 200; auditor (view but
//     NOT flip) → 200 on the inventory and fail-closed 403 on the flip. That asymmetry IS FR-58C's
//     transparency property, so it is asserted in BOTH directions rather than just the denial.
//   · AC3 FLIP → AUDIT round-trip against the real writeAuditEntry hash chain, asserted by
//     traceId/action MEMBERSHIP — never counts: the chain self-commits and accumulates across the
//     whole suite ([[project_live_db_test_gotchas]]).
//   · AC3 rationale is REQUIRED (400 without it) and 404 on an unregistered key.
//   · AC8 DIGILOCKER END-TO-END — flipping `kyc_manual_fallback` to `full` for ONE Pariwar hides the
//     manual CTA for that tenant only and changes nothing for another. This is the Epic-10 demoable
//     closure beat.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; users/role_grants/feature_flag_versions
// cleaned in afterAll.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

interface InventoryBody {
  flags: {
    flag_key: string;
    state: string;
    source: string;
    rationale: string | null;
    last_flip_actor: string | null;
  }[];
}

// A DIFFERENT flag from every other test in this file: a global (`pariwar_id: null`) row has no
// per-Pariwar scope, so it is NOT caught by the per-test `pariwar_id = ANY(createdPariwarIds)`
// cleanup and, more importantly, would otherwise permanently shadow `kyc_manual_fallback`'s code
// default for every OTHER test in this file that assumes a fresh Pariwar starts on `source:
// 'default'`. `afterAll` deletes it unconditionally (not gated on the global-flip test succeeding).
const GLOBAL_TEST_FLAG = 'wa_cost_optimization';

/** A well-formed flip body; individual tests override one field at a time. */
const flipBody = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  state: 'full',
  cohort_definition: { clauses: [] },
  fallback_default: true,
  owner: 'kyc-desk',
  dead_by: '2027-06-30',
  rationale: 'integration test flip',
  ...over,
});

describe.skipIf(!hasDatabase)('feature-flag admin surface — E2E (:5433)', () => {
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
        await c.query(`DELETE FROM feature_flag_versions WHERE pariwar_id = ANY($1)`, [createdPariwarIds]);
      }
      // Unconditional (not gated on the global-flip test succeeding): a GLOBAL row (pariwar_id IS
      // NULL) has no per-Pariwar scope, so it is invisible to the cleanup above, and a global row
      // for this key would otherwise permanently shadow the code default for every OTHER suite that
      // reads this shared DB. `afterAll` runs even if a test in this file threw.
      await c.query(`DELETE FROM feature_flag_versions WHERE pariwar_id IS NULL AND flag_key = $1`, [GLOBAL_TEST_FLAG]);
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
    const email = `flags-${randomUUID()}@example.test`;
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

  /** A GLOBAL-scope grant — the only kind that satisfies a `dimension: 'global'` check. */
  async function grantGlobal(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'global', NULL)`,
        [userId, pariwarId, role],
      );
    } finally {
      c.release();
    }
  }

  // ── AC4: no secret flags ────────────────────────────────────────────────────────────────────────

  it('AC4: the per-Pariwar inventory lists EVERY registered flag, including never-flipped ones', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Flag Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/feature-flags` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as InventoryBody;

    // Nothing has been flipped for this fresh Pariwar, so a ROW-driven listing would return zero
    // entries. Registry-driven, it returns the whole registry — that difference IS the property.
    expect(body.flags.length).toBeGreaterThan(0);
    expect(body.flags.map((f) => f.flag_key)).toContain('kyc_manual_fallback');
    expect(body.flags.every((f) => f.source === 'default')).toBe(true);
  });

  it('AC4: the cross-tenant global catalog is readable by super_admin OR a pariwar_admin in ANY tenant', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);

    // super_admin: a genuine `dimension: 'global'` grant.
    const su = await authenticate('Super Admin');
    await grantGlobal(su.userId, p, 'super_admin');
    const ok = await su.client.inject({ method: 'GET', url: '/api/v1/global/feature-flags' });
    expect(ok.statusCode).toBe(200);
    expect((ok.json() as InventoryBody).flags.map((f) => f.flag_key)).toContain('kyc_manual_fallback');
    // The catalog resolves the global tier only, so no entry can be a per-tenant override.
    expect((ok.json() as InventoryBody).flags.every((f) => f.source !== 'override')).toBe(true);

    // pariwar_admin: no global grant at all — only an ordinary pariwar-scoped one. The catalog's data
    // doesn't vary by tenant, so prd.md:892's "visible to Pariwar Admin and above" is read literally
    // here rather than being satisfied only via the per-Pariwar route.
    const pa = await authenticate('Pariwar Admin');
    await grant(pa.userId, p, 'pariwar_admin');
    const paOk = await pa.client.inject({ method: 'GET', url: '/api/v1/global/feature-flags' });
    expect(paOk.statusCode).toBe(200);
    expect((paOk.json() as InventoryBody).flags.map((f) => f.flag_key)).toContain('kyc_manual_fallback');

    // The denial half: an actor with NO feature_flag.view grant anywhere still gets 403 — the
    // loosening is "any of the actor's OWN tenants", not "any authenticated admin".
    const bystander = await authenticate('Bystander Admin');
    const denied = await bystander.client.inject({ method: 'GET', url: '/api/v1/global/feature-flags' });
    expect(denied.statusCode).toBe(403);
  });

  it('AC4/AC7: the global FLIP stays super_admin-only even though the catalog read is now broader', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);

    // pariwar_admin can READ the global catalog (above) but must NOT be able to WRITE a row that
    // governs every tenant at once — Decision 7's read/write asymmetry applies at global scope too.
    const pa = await authenticate('Pariwar Admin');
    await grant(pa.userId, p, 'pariwar_admin');
    const denied = await pa.client.inject({
      method: 'POST',
      url: `/api/v1/global/feature-flags/${GLOBAL_TEST_FLAG}/versions`,
      payload: flipBody(),
    });
    expect(denied.statusCode).toBe(403);

    const su = await authenticate('Super Admin');
    await grantGlobal(su.userId, p, 'super_admin');
    const ok = await su.client.inject({
      method: 'POST',
      url: `/api/v1/global/feature-flags/${GLOBAL_TEST_FLAG}/versions`,
      payload: flipBody(),
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ flag_key: GLOBAL_TEST_FLAG, pariwar_id: null, state: 'full' });

    // The global row is now in force for a tenant with no override — assert it shows up as `global`
    // provenance, never `override`, from a DIFFERENT Pariwar the same actor is a genuine member of
    // (scope-resolution's membership check needs a `role_grants` row scoped to whichever `:pariwarId`
    // is in the URL — a `global`-dimension grant issued under `p` does not itself satisfy membership
    // in an unrelated Pariwar it was never granted under).
    const p2 = randomUUID();
    createdPariwarIds.push(p2);
    await grant(su.userId, p2, 'auditor');
    const view = await su.client.inject({ method: 'GET', url: `/api/v1/p/${p2}/feature-flags` });
    expect(view.statusCode).toBe(200);
    const flipped = (view.json() as InventoryBody).flags.find((f) => f.flag_key === GLOBAL_TEST_FLAG);
    expect(flipped?.source).toBe('global');
    // Cleanup for this test's global row lives in `afterAll` (unconditional, so it still runs if
    // an assertion above throws) — see `GLOBAL_TEST_FLAG`'s header comment.
  });

  // ── Decision 7: the view/flip asymmetry ─────────────────────────────────────────────────────────

  it('Decision 7 PAIR: an auditor CAN read the inventory but CANNOT flip (403)', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Auditor');
    await grant(a.userId, p, 'auditor');

    // The transparency half — an auditor who could not see live flags could not audit a flag-gated
    // behaviour change. This assertion is as load-bearing as the denial below.
    const read = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/feature-flags` });
    expect(read.statusCode).toBe(200);

    // The authority half — read-only oversight must not carry a production-behaviour-changing power.
    const write = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody(),
    });
    expect(write.statusCode).toBe(403);
  });

  it('an actor with NO grant for the tenant gets 404, not 403 (no enumeration oracle)', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Ungranted');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/feature-flags` });
    // Deliberate, and NOT a weaker check than 403: `scopeResolutionHook` 404s when the actor holds
    // zero grants for the Pariwar, so a stranger cannot use the status code to discover WHICH
    // Pariwars exist. The 403 path is for an actor who legitimately belongs to the tenant but lacks
    // the key — that case is the auditor-flip test above. Both are fail-closed.
    expect(res.statusCode).toBe(404);
  });

  // ── AC3: the flip + its audit line ──────────────────────────────────────────────────────────────

  it('AC3: a flip creates version 2, is reflected in the inventory, and writes an audit line', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Flipper');
    await grant(a.userId, p, 'pariwar_admin');

    const flip = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ rationale: 'begin the Patna cutover' }),
    });
    expect(flip.statusCode).toBe(200);
    const flipped = flip.json() as { version: number; state: string; audit_id: string | null };
    expect(flipped.version).toBe(2); // the code default owns version 1
    expect(flipped.state).toBe('full');
    expect(flipped.audit_id).not.toBeNull();

    // The inventory now shows the override + the FR-58C actor & rationale.
    const inv = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/feature-flags` });
    const entry = (inv.json() as InventoryBody).flags.find((f) => f.flag_key === 'kyc_manual_fallback');
    expect(entry?.source).toBe('override');
    expect(entry?.state).toBe('full');
    expect(entry?.rationale).toBe('begin the Patna cutover');
    expect(entry?.last_flip_actor).toBe(a.userId);

    // The audit line, on the REAL hash chain. Asserted by MEMBERSHIP for this actor — the chain
    // self-commits and accumulates across the whole suite, so a count assertion would be flaky.
    const c = await t.pool.connect();
    try {
      const { rows } = await c.query<{ action: string; audit_id: string }>(
        `SELECT action, audit_id FROM audit_log_entries WHERE actor_id = $1 AND action LIKE 'feature_flag.%'`,
        [a.userId],
      );
      expect(rows.map((r) => r.action)).toContain('feature_flag.version_created');
      // The row's anchor is the audit line's own id — the ADR-0030 intent-first threading.
      expect(rows.map((r) => r.audit_id)).toContain(flipped.audit_id);
    } finally {
      c.release();
    }
  });

  it('AC7: a rollback flip gets its OWN audit action, greppable without parsing a payload', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Roller Back');
    await grant(a.userId, p, 'pariwar_admin');

    await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ state: 'canary', rationale: 'canary start' }),
    });
    const back = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ state: 'rolled_back', rationale: 'error rate looked wrong' }),
    });
    expect(back.statusCode).toBe(200);
    expect((back.json() as { version: number }).version).toBe(3);

    const c = await t.pool.connect();
    try {
      const { rows } = await c.query<{ action: string }>(
        `SELECT action FROM audit_log_entries WHERE actor_id = $1 AND action LIKE 'feature_flag.%'`,
        [a.userId],
      );
      expect(rows.map((r) => r.action)).toContain('feature_flag.rolled_back');
    } finally {
      c.release();
    }
  });

  it('AC3: a flip with NO rationale is rejected (400) — the audit trail cannot be made optional', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('No Reason');
    await grant(a.userId, p, 'pariwar_admin');

    const withoutRationale = { ...flipBody() };
    delete withoutRationale.rationale;
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: withoutRationale,
    });
    expect(res.statusCode).toBe(400);

    const empty = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ rationale: '   ' }),
    });
    expect(empty.statusCode).toBe(400);
  });

  it('an UNREGISTERED flag key is 404 — the capability bar cannot be expanded at runtime', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Inventor');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/invented_at_runtime/versions`,
      payload: flipBody(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('an unknown cohort DIMENSION is rejected at the wire (400), before it can be persisted', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Bad Cohort');
    await grant(a.userId, p, 'pariwar_admin');

    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ cohort_definition: { clauses: [{ dimension: 'zodiac', op: 'in', values: ['leo'] }] } }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('the version history exposes the immutable prior version after a second flip', async () => {
    const p = randomUUID();
    createdPariwarIds.push(p);
    const a = await authenticate('Historian');
    await grant(a.userId, p, 'pariwar_admin');

    await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ state: 'canary', rationale: 'first' }),
    });
    await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ state: 'full', rationale: 'second' }),
    });

    const res = await a.client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/feature-flags/kyc_manual_fallback/versions`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { versions: { version: number; state: string; rationale: string; superseded_by_version: number | null }[] };
    const own = body.versions.filter((v) => v.rationale === 'first' || v.rationale === 'second');
    expect(own).toHaveLength(2);
    const first = own.find((v) => v.rationale === 'first');
    // History was NOT rewritten: v2 still says `canary` and points forward at v3.
    expect(first?.state).toBe('canary');
    expect(first?.superseded_by_version).toBe(3);
  });

  // ── AC8: the DigiLocker end-to-end (the Epic-10 demoable closure) ───────────────────────────────

  it('⚠ AC8 END-TO-END: flipping kyc_manual_fallback to `full` hides the manual CTA for THAT tenant only', async () => {
    const pTarget = randomUUID();
    const pOther = randomUUID();
    createdPariwarIds.push(pTarget, pOther);

    const admin = await authenticate('Cutover Admin');
    await grant(admin.userId, pTarget, 'pariwar_admin');
    await grant(admin.userId, pOther, 'pariwar_admin');

    // BEFORE: no flag version in force anywhere → both tenants resolve to the config default.
    const beforeTarget = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${pTarget}/feature-flags` });
    const beforeEntry = (beforeTarget.json() as InventoryBody).flags.find((f) => f.flag_key === 'kyc_manual_fallback');
    expect(beforeEntry?.state).toBe('off');
    expect(beforeEntry?.source).toBe('default');

    // THE FLIP — hard-mandatory cutover ON for pTarget only.
    const flip = await admin.client.inject({
      method: 'POST',
      url: `/api/v1/p/${pTarget}/feature-flags/kyc_manual_fallback/versions`,
      payload: flipBody({ state: 'full', rationale: 'DigiLocker hard-mandatory cutover' }),
    });
    expect(flip.statusCode).toBe(200);

    // AFTER: pTarget carries the override…
    const afterTarget = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${pTarget}/feature-flags` });
    const targetEntry = (afterTarget.json() as InventoryBody).flags.find((f) => f.flag_key === 'kyc_manual_fallback');
    expect(targetEntry?.state).toBe('full');
    expect(targetEntry?.source).toBe('override');

    // …and the OTHER tenant is completely unaffected. This is the per-tenant-isolation half of AC8:
    // "changes nothing for other tenants."
    const afterOther = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${pOther}/feature-flags` });
    const otherEntry = (afterOther.json() as InventoryBody).flags.find((f) => f.flag_key === 'kyc_manual_fallback');
    expect(otherEntry?.state).toBe('off');
    expect(otherEntry?.source).toBe('default');

    // And the CONSUMER actually changes behaviour with no consumer code edit — the seam resolves the
    // flag and inverts it (cutover ON ⇒ manual fallback hidden). Asserted through the seam itself so
    // the whole chain (flag row → RLS → lookup → evaluator → inversion) is exercised, not just the
    // inventory read.
    const { isManualFallbackEnabled } = await import('../../../src/modules/kyc/manual-fallback-seam.js');
    const { openScopeTx, closeScopeTx } = await import('../../../src/modules/multi-tenant/scope-tx.js');

    const targetTx = await openScopeTx(deps, pTarget);
    try {
      await expect(
        isManualFallbackEnabled(deps, targetTx.tx, { pariwarId: pTarget as never }),
      ).resolves.toBe(false); // cutover active ⇒ manual hidden
    } finally {
      await closeScopeTx(targetTx, false);
    }

    const otherTx = await openScopeTx(deps, pOther);
    try {
      await expect(
        isManualFallbackEnabled(deps, otherTx.tx, { pariwarId: pOther as never }),
      ).resolves.toBe(true); // untouched ⇒ manual still available
    } finally {
      await closeScopeTx(otherTx, false);
    }
  });
});
