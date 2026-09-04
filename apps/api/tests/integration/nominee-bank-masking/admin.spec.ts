// Nominee-bank masking-schedule admin endpoints — Story 11b.3a (Task 5; AC5, AC6).
//
// Drives the real Fastify app via fastify.inject for the surface that makes `2026-08-28-160`
// cl.10(b)-(d)'s knob operable WITHOUT database access:
//   · GET  /p/:pariwarId/admin/nominee-bank-masking/schedule — the read (unconfigured + configured).
//   · PUT  /p/:pariwarId/admin/nominee-bank-masking/schedule — the governed change (AUDITED).
//   · the permission gate: an admin WITHOUT the grant → 403, and ⛔ NOTHING is written.
//   · ⭐⭐ `pariwar_admin` → 403 — the role `2026-09-02-178` FORECLOSED. THIS is the ruling's teeth.
//   · an unauthenticated caller → 401 (⛔ never a silent write).
//   · an empty/whitespace rationale, and a day count outside 0…MAX → 400 at the CONTRACT boundary.
//     ⛔ NEVER a 500.
//
// ⭐ THE CHANGE IS ASSERTED THROUGH THE PUBLIC RESOLVER, ⛔ not merely against the table: 
// `resolveEffectiveNomineeBankMasking` is the exact function the public Sahyog Vivran read calls to
// decide the projection, so these tests prove the change reached the surface it exists to control.
// ⛔ A test that only proved "the call did not error" would prove nothing.
//
// ⚠ WHAT IT DOES ⛔ NOT PROVE: that the public PAGE changed for a visitor.
// `/sahyog-vivran/[driveToken]` is edge-cached with `s-maxage=300`, so warm PoPs keep
// serving the previous projection — which may be a full account number — until those entries expire.
// ⛔ No test here may claim otherwise; that gap is a property of the surface, ⛔ not a defect here.
//
// ⛔ NO TEST HERE MAY ASSERT A 500. Every rejection this surface can produce has a designed status:
// 400 (contract), 401 (no session), 403 (no grant), 409 (admin.display_name_missing). A 500 means an
// error escaped `errorMappingHandler`'s registry — that is the bug, ⛔ not the expectation.
//
// ⚠ Own-committing writes. Assertions key on MEMBERSHIP/state, ⛔ never counts against a shared
// table, and each test uses a FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim as claimDomain, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const url = (pariwarId: string): string =>
  `/api/v1/p/${pariwarId}/admin/nominee-bank-masking/schedule`;

const AUDIT_ACTION = 'pariwar.nominee_bank_masking.changed';

interface ScheduleBody {
  setting: { mode: 'after_days'; maskAfterDays: number } | { mode: 'permanent' } | null;
  configured: boolean;
  effectiveFrom: string | null;
  changedByDisplay: string | null;
  rationale: string | null;
  version: number | null;
}

describe.skipIf(!hasDatabase)('Nominee-bank masking-schedule admin surface (Story 11b.3a)', () => {
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
        await c.query(
          `DELETE FROM pariwar_nominee_bank_masking_schedule WHERE pariwar_id = ANY($1)`,
          [touchedPariwarIds],
        );
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

  function freshPariwar(): string {
    const id = randomUUID();
    touchedPariwarIds.push(id);
    return id;
  }

  async function authenticate(displayName = 'Asha Verma'): Promise<{ client: Client; userId: string }> {
    const email = `nbm-${randomUUID()}@example.test`;
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
   * Grant a role. `super_admin` is granted at the GLOBAL dimension (the directory-publication
   * precedent) — `pariwar.manage_nominee_bank_masking` is super_admin-ONLY, and a global super_admin
   * grant satisfies the pariwar-dimension check.
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

  /** Rows for a Pariwar, oldest first — the state assertion, independent of what the route echoed. */
  async function storedRows(
    pariwarId: string,
  ): Promise<
    { version: number; masking_mode: string; mask_after_days: number | null; effective_until: Date | null }[]
  > {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT version, masking_mode, mask_after_days, effective_until
           FROM pariwar_nominee_bank_masking_schedule WHERE pariwar_id = $1 ORDER BY version`,
        [pariwarId],
      );
      return res.rows as never;
    } finally {
      c.release();
    }
  }

  /**
   * The PUBLIC read path — `resolveEffectiveNomineeBankMasking` is the exact resolver the Sahyog
   * Vivran domain read calls to decide the projection, called here through a REAL scope tx, the same
   * RLS-scoped handle that route uses. ⭐ Asserting through it is what makes this end-to-end rather
   * than a statement about one table.
   */
  async function publicResolverSetting(pariwarId: string) {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      return await claimDomain.resolveEffectiveNomineeBankMasking(
        scopeTx.tx,
        ids.pariwarId(pariwarId),
        new Date(),
      );
    } finally {
      await closeScopeTx(scopeTx, true);
    }
  }

  it('GET — an unconfigured Pariwar reports `configured: false` and NO setting (FAIL-OPEN)', async () => {
    // ⭐ `configured` is LOAD-BEARING: under `D8-default` (`2026-09-02-179` cl.1) this means the
    // complete details stay VISIBLE after close until the Trust sets a window, and it governs EVERY
    // Pariwar because `-178` put authority centrally. ⛔ Never signalled only by all-null fields.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({ method: 'GET', url: url(pariwarId) });
    expect(res.statusCode).toBe(200);
    expect(res.json<ScheduleBody>()).toEqual({
      setting: null,
      configured: false,
      effectiveFrom: null,
      changedByDisplay: null,
      rationale: null,
      version: null,
    });
    expect(await publicResolverSetting(pariwarId)).toBeNull();
  });

  it('PUT — all THREE ruled settings round-trip, and the PUBLIC resolver sees each', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const put = (setting: ScheduleBody['setting']) =>
      client.inject({
        method: 'PUT',
        url: url(pariwarId),
        payload: { setting, rationale: 'Board resolution of 12 September' },
      });

    // ⭐ ZERO IS A VALUE AN ADMIN CHOSE (cl.10(b)) — it must survive the whole round trip as itself,
    // ⛔ never normalised into "no setting" by a falsy check anywhere on the path.
    const zero = await put({ mode: 'after_days', maskAfterDays: 0 });
    expect(zero.statusCode).toBe(200);
    expect(zero.json<ScheduleBody>().setting).toEqual({ mode: 'after_days', maskAfterDays: 0 });
    expect(zero.json<ScheduleBody>().configured).toBe(true);
    expect(await publicResolverSetting(pariwarId)).toEqual({ mode: 'after_days', maskAfterDays: 0 });

    const thirty = await put({ mode: 'after_days', maskAfterDays: 30 });
    expect(thirty.statusCode).toBe(200);
    expect(await publicResolverSetting(pariwarId)).toEqual({ mode: 'after_days', maskAfterDays: 30 });

    // ⭐ REVERSIBLE IN EVERY DIRECTION (cl.10(c)) — ⛔ there is no "already masked, cannot unmask".
    const perm = await put({ mode: 'permanent' });
    expect(perm.statusCode).toBe(200);
    expect(await publicResolverSetting(pariwarId)).toEqual({ mode: 'permanent' });

    // ⭐ AND EVERY SUPERSEDED WINDOW SURVIVES — the governance trail is why this is a schedule and
    // not a mutable config row. ⛔ The prior heads are CLOSED, ⛔ not deleted.
    const rows = await storedRows(pariwarId);
    expect(rows.map((r) => [r.version, r.masking_mode, r.mask_after_days, r.effective_until === null])).toEqual([
      [1, 'after_days', 0, false],
      [2, 'after_days', 30, false],
      [3, 'permanent', null, true],
    ]);
  });

  it('PUT — the change is ATTRIBUTED and AUDITED', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate('Kalpana Bharti');
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: url(pariwarId),
      payload: { setting: { mode: 'permanent' }, rationale: 'Board resolution' },
    });
    expect(res.statusCode).toBe(200);
    // ⛔ The display name is the SERVER's `users.display_name`, snapshotted — ⛔ never client-supplied.
    expect(res.json<ScheduleBody>().changedByDisplay).toBe('Kalpana Bharti');
    expect(res.json<ScheduleBody>().rationale).toBe('Board resolution');

    const c = await td.pool.connect();
    try {
      const audit = await c.query(
        `SELECT action, resource_locator FROM audit_log_entries
           WHERE pariwar_id = $1 AND action = $2`,
        [pariwarId, AUDIT_ACTION],
      );
      expect(audit.rows).toHaveLength(1);
      // ⛔⛔ AND THE AUDIT LINE CARRIES NO BANK FIELD OF ANY KIND — this module writes a SETTING.
      // ⚠ Asserted as the EXACT locator rather than a `/\d{6,}/` scan (review 2026-09-03): the
      // pariwarId is a random UUID whose hex frequently holds 6+ consecutive digits, so the scan
      // failed on a large fraction of runs and guarded nothing real — no account number flows
      // through this module. An exact match proves the locator is the pariwar id + resource + mode
      // and nothing else.
      expect(String(audit.rows[0]!['resource_locator'])).toBe(
        `pariwar/${pariwarId}/nominee-bank-masking;mode=permanent`,
      );
    } finally {
      c.release();
    }
  });

  it('⭐⭐ PUT — `pariwar_admin` is 403, and NOTHING is written. The ruling`s teeth.', async () => {
    // `2026-09-02-178` FORECLOSED `pariwar_admin`: cl.10(b)'s "Trust-Admin controlled" speaks to
    // AUTHORITY and means the TRUST. ⛔ Granting this key to `pariwar_admin` "for symmetry" with
    // every other pariwar-dimension content key is the "reverse a ratified ruling by way of a
    // catalog edit" move — and THIS assertion is what fails if someone makes it.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'pariwar_admin');

    const res = await client.inject({
      method: 'PUT',
      url: url(pariwarId),
      payload: { setting: { mode: 'permanent' }, rationale: 'should not land' },
    });
    expect(res.statusCode).toBe(403);
    expect(await storedRows(pariwarId)).toEqual([]);
    expect(await publicResolverSetting(pariwarId)).toBeNull();
  });

  it('PUT — an admin with no relevant grant is 403 and writes nothing', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'auditor');

    const res = await client.inject({
      method: 'PUT',
      url: url(pariwarId),
      payload: { setting: { mode: 'permanent' }, rationale: 'should not land' },
    });
    expect(res.statusCode).toBe(403);
    expect(await storedRows(pariwarId)).toEqual([]);
  });

  it('PUT — an UNAUTHENTICATED caller is 401 and writes nothing', async () => {
    const pariwarId = freshPariwar();
    const res = await app.inject({
      method: 'PUT',
      url: url(pariwarId),
      payload: { setting: { mode: 'permanent' }, rationale: 'should not land' },
    });
    expect(res.statusCode).toBe(401);
    expect(await storedRows(pariwarId)).toEqual([]);
  });

  it('PUT — a whitespace rationale is 400 at the CONTRACT boundary, ⛔ NEVER a 500', async () => {
    // ⭐ The domain's `UngovernedNomineeBankMaskingChangeError` extends Error, ⛔ not ApiError, and is
    // NOT in the error-mapping registry — so if it were ever reached an operator would see an opaque
    // 500 on a plain input error. The contract's `.trim().min(1)` is what makes this a 400.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    const res = await client.inject({
      method: 'PUT',
      url: url(pariwarId),
      payload: { setting: { mode: 'permanent' }, rationale: '   ' },
    });
    expect(res.statusCode).toBe(400);
    expect(await storedRows(pariwarId)).toEqual([]);
  });

  it('PUT — a day count outside 0…MAX is 400, and so is a negative one', async () => {
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    for (const maskAfterDays of [-1, 36501, 1.5]) {
      const res = await client.inject({
        method: 'PUT',
        url: url(pariwarId),
        payload: { setting: { mode: 'after_days', maskAfterDays }, rationale: 'nope' },
      });
      expect(res.statusCode).toBe(400);
    }
    expect(await storedRows(pariwarId)).toEqual([]);
  });

  it('⛔ PUT — a caller-supplied `effectiveFrom` or `changedByDisplay` is 400 (`.strict()`)', async () => {
    // ⛔ A browser-supplied display name would let an operator lie about who made the change; a
    // caller-supplied instant would let them BACK-DATE a window, retroactively re-characterising
    // what the public could see and when. `.strict()` makes both unrepresentable, ⛔ not merely
    // ignored.
    const pariwarId = freshPariwar();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'super_admin', 'global');

    for (const extra of [
      { changedByDisplay: 'Someone Else' },
      { effectiveFrom: '2020-01-01T00:00:00.000Z' },
    ]) {
      const res = await client.inject({
        method: 'PUT',
        url: url(pariwarId),
        payload: { setting: { mode: 'permanent' }, rationale: 'nope', ...extra },
      });
      expect(res.statusCode).toBe(400);
    }
    expect(await storedRows(pariwarId)).toEqual([]);
  });
});
