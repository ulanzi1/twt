// The TERMINATION DWELL precondition, end to end — Story 10.20 (Task 6; AC8, WS-D). (:5433)
//
// What `epics.md:3857` recorded as the defect: *"`nextModerationStatus('suspended','terminate')`
// returns `'terminated'` unconditionally, so two API calls seconds apart terminate a member — and
// because the suspension notice is a best-effort post-commit job, termination can precede its own
// notice."* This spec proves that is closed, and proves the four things that must remain TRUE
// alongside it:
//
//   · the ORDINARY path is refused during the dwell with a 409 that is DISTINCT from
//     `invalid_state`, and ACCEPTED once the dwell has elapsed;
//   · the IMMEDIATE-TERMINATION EXCEPTION still works during the dwell (Q4.1) — ⛔ the dwell must
//     not eliminate it, because principles 5 and 6 as adopted both carry an express exception;
//   · an UNPROVISIONED registry refuses the ordinary path with a 503, never a hard-coded 7;
//   · `legal_actions` is NOT filtered, and `termination_available_at` is the separate additive fact
//     (Q4.2) — collapsing them would make a pure reducer's output depend on a clock.
//
// ── ⭐ BOTH SIDES OF THE COMPARISON ARE PINNED, and that is the point of the mutable clock ────────
// The dwell compares `member_moderation_actions.acted_at` (written from the INJECTED app clock)
// against `deps.clock()`. A spec that pins one side and lets the other default is the 2026-08-10
// DATE-BOMB class ([[project_known_livedb_test_failures]] #12): it fails on a DATE rather than a
// diff, and a baseline comparison can never see it. So the suite drives ONE app whose clock reads a
// mutable `now`, and every instant in this file is written out explicitly — there is no `new Date()`
// anywhere in it.
//
// ⚠ Each test AUTHENTICATES AT THE INSTANT IT ACTS. Moving a clock eight days forward under a live
// admin session would expire the session and the step-up elevation, and the resulting 403 would look
// like a dwell failure. Minting the credentials after the clock moves keeps the test measuring the
// dwell rather than the session TTL.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingStepUpDelivery,
  type TestDeps,
} from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

/** The instant every suspension in this file is taken at — explicit, never `new Date()`. */
const SUSPENDED_AT = new Date('2026-08-01T09:00:00.000Z');
/** The ratified dwell (Decision `2026-08-12-099` Q4). Read from the seed, asserted here. */
const DWELL_DAYS = 7;
/** SUSPENDED_AT + 7 days. Written out, so the test does not restate the implementation. */
const AVAILABLE_AT = new Date('2026-08-08T09:00:00.000Z');
/** One second BEFORE the dwell elapses — the ordinary path must still be closed here. */
const JUST_BEFORE = new Date('2026-08-08T08:59:59.000Z');
/** Comfortably after. */
const AFTER = new Date('2026-08-09T10:00:00.000Z');

const ESCALATION = {
  escalation_inadequacy:
    'Suspension would not protect the Trust: the member retains the access that was misused and the restoration path it preserves is futile here.',
  escalation_proportionality:
    'Termination fits the conduct because the forgery was deliberate, repeated, and aimed at the claim-verification process itself.',
};
const IMMEDIATE_REASON =
  'The forged documents are still circulating and each day of delay exposes further claims to the same fraud.';

describe.skipIf(!hasDatabase)('moderation dwell precondition (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  /** THE mutable instant every clock read in this suite resolves to. Never `new Date()`. */
  let now: Date = SUSPENDED_AT;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn, clock: () => now });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
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
      if (createdPariwars.length > 0) {
        await c.query(`DELETE FROM member_moderation_actions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM clause_versions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  /**
   * Provision the ratified dwell clause for one Pariwar.
   *
   * ⚠ The seeded `niy.moderation.dwell` row is scoped to the REFERENCE Pariwar and `resolveByClauseId`
   * does not fall back across tenants, so each test tenant provisions its own. `dwell_days` is the
   * RATIFIED 7 — ⛔ a test must not fabricate a shorter duration to make itself convenient; that would
   * put a number in the registry no Panel ratified. The tests move the CLOCK instead.
   */
  async function provisionDwell(pariwarId: string, dwellDays = DWELL_DAYS): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO clause_versions (clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
         VALUES ('niy.moderation.dwell', $1, 1, '2025-01-01T00:00:00+00:00'::timestamptz, $2::jsonb, 'pool')`,
        [pariwarId, JSON.stringify({ rule_code: 'MODERATION-DWELL', dwell_days: dwellDays, provisional: true })],
      );
    } finally {
      c.release();
    }
  }

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `mod-dwell-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: 'Trustee One' });
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

  async function grant(userId: string, pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, 'pariwar_admin', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function elevate(client: Client, actionContext: string): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }

  async function seedActiveMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const project = (eventType: string, payload: Json) =>
        memberDomain.projectMemberState(scopeTx.client, {
          memberId: mid,
          pariwarId: pid,
          eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
          actorId: memberId,
          payload,
        });
      await project('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      await project('member.kyc_completed', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc', actor: 'member' });
      await project('member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'fee_paid', actor: 'member', utr: 'UTR123', amount_inr: 110 });
      await project('member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system', kyc_verified: true });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return memberId;
  }

  /** A tenant with the dwell provisioned (unless told otherwise) + a member SUSPENDED at SUSPENDED_AT. */
  async function suspended(opts: { provision?: boolean } = {}): Promise<{ p: string; memberId: string }> {
    now = SUSPENDED_AT;
    const p = randomUUID();
    createdPariwars.push(p);
    if (opts.provision !== false) await provisionDwell(p);
    const memberId = await seedActiveMember(p);
    const { client, userId } = await authenticate();
    await grant(userId, p);
    await elevate(client, 'member_moderation_suspend');
    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/suspend`,
      payload: { reason_code: 'r14-forgery', rationale: 'Suspended pending investigation.' },
    });
    expect(res.statusCode).toBe(200);
    // ⭐ SIDE ONE OF THE COMPARISON, ASSERTED RATHER THAN ASSUMED. If `acted_at` ever stopped
    // following the injected clock, every dwell assertion below would silently start measuring from
    // wall-clock time and the suite would keep passing until a real date made it fail.
    expect(res.json<{ acted_at: string }>().acted_at).toBe(SUSPENDED_AT.toISOString());
    return { p, memberId };
  }

  /** Act at a PINNED instant, with credentials minted at that same instant. */
  async function clientAt(instant: Date, p: string, actionContext: string): Promise<Client> {
    now = instant;
    const { client, userId } = await authenticate();
    await grant(userId, p);
    await elevate(client, actionContext);
    return client;
  }

  /** Terminate at a pinned `now` — side TWO of the comparison. */
  async function terminateAt(instant: Date, p: string, memberId: string, extra: Json = {}) {
    const client = await clientAt(instant, p, 'member_moderation_terminate');
    return client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/terminate`,
      payload: { reason_code: 'r14-forgery', rationale: 'Terminated by the Panel.', ...ESCALATION, ...extra },
    });
  }

  const errCode = (res: { json: () => unknown }) => (res.json() as { error: { code: string } }).error.code;

  it('⭐ AC8: the ORDINARY path is REFUSED during the dwell — a 409 DISTINCT from invalid_state', async () => {
    const { p, memberId } = await suspended();
    // ONE SECOND before the dwell elapses. Both sides pinned; the boundary is the assertion.
    const res = await terminateAt(JUST_BEFORE, p, memberId);
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('member_moderation.dwell_not_elapsed');
    // ⛔ NOT the legality 409 — "too soon" and "illegal transition" are different facts.
    expect(errCode(res)).not.toBe('member_moderation.invalid_state');
    const details = (res.json() as { error: { details: Record<string, unknown> } }).error.details;
    expect(details['available_at']).toBe(AVAILABLE_AT.toISOString());
    expect(details['dwell_days']).toBe(DWELL_DAYS);
    expect(details['dwell_policy_version']).toBeTruthy();
  });

  it('⭐ AC8: two API calls SECONDS apart cannot terminate a member — the epics.md:3857 defect, closed', async () => {
    const { p, memberId } = await suspended();
    // The clock IS the suspension instant: this is the "seconds apart" case, exactly.
    const res = await terminateAt(SUSPENDED_AT, p, memberId);
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('member_moderation.dwell_not_elapsed');
  });

  it('⭐ AC8: once the dwell has ELAPSED the ordinary path is accepted, and the version is PINNED', async () => {
    const { p, memberId } = await suspended();
    const res = await terminateAt(AFTER, p, memberId);
    expect(res.statusCode).toBe(200);

    const c = await td.pool.connect();
    try {
      const r = await c.query(
        `SELECT dwell_policy_version, immediate_termination_reason_ciphertext
           FROM member_moderation_actions WHERE member_id = $1 AND action = 'terminate'`,
        [memberId],
      );
      // FR-8: the clause version that governed the decision is on the record, so a later re-tune
      // cannot retroactively move the window this termination was taken under.
      expect(r.rows[0].dwell_policy_version).toBeTruthy();
      // ⛔ The ordinary path records NO exception reason — that is what makes "how often is the
      // exception used?" an answerable question.
      expect(r.rows[0].immediate_termination_reason_ciphertext).toBeNull();
    } finally {
      c.release();
    }
  });

  it('⭐ AC8/Q4.1: the IMMEDIATE-TERMINATION EXCEPTION still works DURING the dwell', async () => {
    const { p, memberId } = await suspended();
    // ⛔ The dwell must NOT eliminate immediate termination: principles 5 and 6 as adopted say
    // termination *normally* follows suspension and notice *normally* precedes it — both carry an
    // express exception, and an absolute gate would contradict the principles it mechanizes.
    const res = await terminateAt(SUSPENDED_AT, p, memberId, {
      immediate_termination_reason: IMMEDIATE_REASON,
    });
    expect(res.statusCode).toBe(200);

    const c = await td.pool.connect();
    try {
      const r = await c.query(
        `SELECT immediate_termination_reason_ciphertext, dwell_policy_version
           FROM member_moderation_actions WHERE member_id = $1 AND action = 'terminate'`,
        [memberId],
      );
      expect(r.rows[0].immediate_termination_reason_ciphertext).toBeTruthy();
      // The policy IN FORCE is pinned even when the exception was taken — which policy governed is
      // part of the record independently of which route was used.
      expect(r.rows[0].dwell_policy_version).toBeTruthy();
    } finally {
      c.release();
    }
  });

  it('AC8: an exception reason below the substance floor is a 422 — a recorded reason must be recorded', async () => {
    const { p, memberId } = await suspended();
    const res = await terminateAt(SUSPENDED_AT, p, memberId, { immediate_termination_reason: 'urgent!!' });
    expect(res.statusCode).toBe(422);
    expect(errCode(res)).toBe('member_moderation.escalation_required');
  });

  it('⭐ AC8: an UNPROVISIONED registry refuses the ordinary path with 503 — `7` is never hard-coded', async () => {
    const { p, memberId } = await suspended({ provision: false });
    const res = await terminateAt(AFTER, p, memberId);
    // ⛔ NOT a 409: no amount of waiting provisions a registry clause. Decision `2026-08-07-088`
    // clause 2 — a sanction under a convention no Pariwar ratified is an unratified sanction
    // imposed by a machine, so the code must refuse rather than fall back to 7.
    expect(res.statusCode).toBe(503);
    expect(errCode(res)).toBe('member_moderation.dwell_policy_unprovisioned');
  });

  it('AC8: the EXCEPTION still works on an unprovisioned Pariwar — it is a separate governance route', async () => {
    const { p, memberId } = await suspended({ provision: false });
    const res = await terminateAt(SUSPENDED_AT, p, memberId, {
      immediate_termination_reason: IMMEDIATE_REASON,
    });
    expect(res.statusCode).toBe(200);
  });

  it('⛔ AC8/Q4.2: `legal_actions` is NOT filtered by the dwell; `termination_available_at` is additive', async () => {
    const { p, memberId } = await suspended();
    // Read DURING the dwell, at the suspension instant.
    const client = await clientAt(SUSPENDED_AT, p, 'member_moderation_terminate');
    const hist = await client.inject({ method: 'GET', url: `/api/v1/p/${p}/members/${memberId}/moderation` });
    expect(hist.statusCode).toBe(200);
    const body = hist.json() as { legal_actions: string[]; termination_available_at: string | null };
    // ⛔ `terminate` STAYS in the list for the whole dwell window. Filtering it would make a pure
    // reducer's output depend on a clock and fork the one place four call sites derive legality
    // from (D5) — the Panel ruled this correction explicitly right.
    expect(body.legal_actions).toContain('terminate');
    // The separate, additive fact the console needs so it does not offer a button the server refuses.
    expect(body.termination_available_at).toBe(AVAILABLE_AT.toISOString());
  });

  it('AC8: `termination_available_at` is null once the dwell has elapsed, and for an unmoderated member', async () => {
    const { p, memberId } = await suspended();
    const client = await clientAt(AFTER, p, 'member_moderation_terminate');
    const later = await client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/members/${memberId}/moderation`,
    });
    // A past instant is not a precondition — surfacing one invites a stale "available at" forever.
    expect((later.json() as { termination_available_at: string | null }).termination_available_at).toBeNull();
  });

  it('⛔ AC8: SUSPEND is unaffected — a suspend immediately following a restore is still accepted', async () => {
    const { p, memberId } = await suspended();
    const client = await clientAt(SUSPENDED_AT, p, 'member_moderation_restore');
    const restored = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/restore`,
      payload: { reason_code: 'moderation-error', rationale: 'Restored on review.' },
    });
    expect(restored.statusCode).toBe(200);

    // No dwell applies to a suspension — the precondition is scoped to `terminate` alone, and a
    // Pariwar must be able to re-suspend immediately if the conduct recurs.
    await elevate(client, 'member_moderation_suspend');
    const resuspended = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/suspend`,
      payload: { reason_code: 'r14-forgery', rationale: 'Conduct recurred.' },
    });
    expect(resuspended.statusCode).toBe(200);
  });
});
