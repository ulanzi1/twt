// Member moderation — E2E (Story 10.10; AC2/AC3/AC4/AC5/AC6/AC7/AC9/AC10). (:5433)
//
// Proves the whole surface against real Postgres:
//   · AC4 RBAC revert-sanity PAIR — pariwar_admin (holds `member.moderate`) → 200; an auditor
//     (Pariwar grant, NO key) → fail-closed 403; state_trustee → 403 and district_admin → 403
//     (both DEFERRED — Decision 4's inert-grant finding, pinned so a future grant cannot land
//     silently).
//   · AC4 step-up — no elevation → 403 `auth.step_up_required`; a WRONG-CONTEXT elevation (minted
//     for restore, spent on terminate) → 403 too.
//   · AC2 legality — `none --terminate-->` 409 (Decision 2), a re-suspend 409, a restore of an
//     unmoderated member 409, all BEFORE any write.
//   · AC3 — the `appliesTo` 422 (a restore code offered for a suspension) and the empty-rationale 422.
//   · AC1/AC4 — each action writes its event + its `member_moderation_actions` row + its audit line,
//     and `members.state` NEVER moves.
//   · AC5 — `is_valid` flips false on suspend and true again on restore, INCLUDING validity-cache
//     invalidation. ⚠ AMENDED BY STORY 10.17: the original line here also claimed "a suspended member
//     drops out of the assignable roster with NO roster change". That is NO LONGER TRUE and was
//     deliberately reversed — a suspension removes the entitlement to RECEIVE support (`is_valid`),
//     never the obligation to CONTRIBUTE while completing a restoration path (Niyamavali §3.3). The
//     roster now reads the separate `is_assignable` predicate, on which a SUSPENDED member is TRUE and
//     only a TERMINATED member is false. See `packages/validity-service/tests/integration/
//     moderation-validity.spec.ts` for the amended proof.
//   · AC6 — the session cascade revokes the refresh chain, and the member can STILL log in.
//   · AC7 — the 12-month rejoin lock on terminate, CLEARED by restore.
//
// ⚠ Own-committing seed writes; a fresh random pariwarId + memberId per test; users/role_grants
// cleaned in afterAll. Assert MEMBERSHIP, not counts ([[project_live_db_test_gotchas]]).

import { createHash, randomUUID } from 'node:crypto';

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

const STEP_UP_SUSPEND = 'member_moderation_suspend';
const STEP_UP_TERMINATE = 'member_moderation_terminate';
const STEP_UP_RESTORE = 'member_moderation_restore';

describe.skipIf(!hasDatabase)('member moderation — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
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
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  // ── Fixtures ───────────────────────────────────────────────────────────────────────────────────

  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `mod-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
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

  async function grant(
    userId: string,
    pariwarId: string,
    role: string,
    opts: { dimension?: string; value?: string } = {},
  ): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, opts.dimension ?? 'pariwar', opts.value ?? pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function pariwarAdmin(pariwarId: string, displayName = 'Trustee One'): Promise<Client> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'pariwar_admin');
    return a.client;
  }

  /**
   * A Trustee-Panel client — Story 10.19. The `trustee_panel` bundle is the ONLY holder of
   * `member.restore_terminated`, the key Niyamavali §8.4 makes necessary to restore a TERMINATED
   * member (Q1 option (a), Decision `2026-08-10-097` clause 1). A `pariwar_admin` holds
   * `member.moderate` and so may still suspend, terminate, and restore a SUSPENDED member — the
   * exclusivity is scoped to that ONE transition.
   */
  async function trusteePanel(pariwarId: string, displayName = 'Panel Member'): Promise<Client> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'trustee_panel');
    return a.client;
  }

  /** Mint a FRESH elevation for one action context (the per-action step-up flow). */
  async function elevate(client: Client, actionContext: string): Promise<void> {
    const req = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/step-up/request',
      payload: { actionContext },
    });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/step-up/verify',
      payload: { otp: adminStepUp.last?.code as string },
    });
    expect(ver.statusCode).toBe(200);
  }

  /** Seed an ACTIVE member (signup → kyc → shulk paid → lock-in expired verified), committed. */
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
      await project('member.vyawastha_shulk_paid', {
        from_state: 'pending-fee', to_state: 'lock-in', trigger: 'fee_paid', actor: 'member',
        utr: 'UTR123', amount_inr: 110,
      });
      await project('member.lock_in_expired', {
        from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system', kyc_verified: true,
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return memberId;
  }

  /** A fresh tenant + an active member + an elevated pariwar_admin, ready to moderate. */
  async function scenario(): Promise<{ p: string; memberId: string; client: Client }> {
    const p = randomUUID();
    createdPariwars.push(p);
    const memberId = await seedActiveMember(p);
    const client = await pariwarAdmin(p);
    return { p, memberId, client };
  }

  const modUrl = (p: string, m: string, action: string) =>
    `/api/v1/p/${p}/members/${m}/moderation/${action}`;
  const historyUrl = (p: string, m: string) => `/api/v1/p/${p}/members/${m}/moderation`;

  // ── Story 10.20 (AC6) — a TERMINATION now carries the two-part escalation justification ────────
  // Both parts are MANDATORY on `terminate` (Niyamavali §8.6), enforced in three layers: the route
  // guard, the domain backstop and migration 0099's `escalation_iff_terminate` CHECK. These two
  // strings are the default so that the tests BELOW — which are about legality, RBAC, step-up and
  // the history read — keep testing what they were written to test.
  // ⛔ They are deliberately DIFFERENT texts: identical parts are a 422 restatement, and a shared
  // constant here would have made every termination in this file fail for the wrong reason.
  // The escalation rules themselves are pinned in `moderation-escalation.spec.ts`.
  const ESCALATION_INADEQUACY =
    'Suspension would not protect the Trust: the member retains the access that was misused and the restoration path it preserves is futile here.';
  const ESCALATION_PROPORTIONALITY =
    'Termination fits the conduct because the forgery was deliberate, repeated, and aimed at the claim-verification process itself.';

  function body(
    reasonCode: string,
    rationale = 'Recorded after review of the file.',
    action?: 'suspend' | 'terminate' | 'restore',
  ): Json {
    const base: Json = { reason_code: reasonCode, rationale };
    if (action === 'terminate') {
      base.escalation_inadequacy = ESCALATION_INADEQUACY;
      base.escalation_proportionality = ESCALATION_PROPORTIONALITY;
    }
    return base;
  }

  async function act(
    client: Client,
    p: string,
    m: string,
    action: 'suspend' | 'terminate' | 'restore',
    reasonCode: string,
    opts: { elevate?: boolean; rationale?: string } = {},
  ) {
    if (opts.elevate !== false) {
      await elevate(client, `member_moderation_${action}`);
    }
    return client.inject({
      method: 'POST',
      url: modUrl(p, m, action),
      payload: body(reasonCode, opts.rationale, action),
    });
  }

  async function memberState(memberId: string): Promise<string | null> {
    const c = await td.pool.connect();
    try {
      const r = await c.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
      return r.rows[0]?.state ?? null;
    } finally {
      c.release();
    }
  }

  async function moderationRows(memberId: string): Promise<Array<Record<string, unknown>>> {
    const c = await td.pool.connect();
    try {
      const r = await c.query(
        `SELECT action, reason_code, actor_display, rejoin_permitted_at, decision_note_ciphertext
           FROM member_moderation_actions WHERE member_id = $1 ORDER BY acted_at ASC`,
        [memberId],
      );
      return r.rows;
    } finally {
      c.release();
    }
  }

  /**
   * The Story 1.10 audit lines for a member's moderation locator. Read from `audit_log_entries`
   * (the tamper-evident chain the handler writes via `writeAuditEntry`), NOT from the auth sink —
   * they are different audit families and only this one carries the moderation action lines.
   */
  async function auditLines(memberId: string): Promise<Array<{ action: string; request_payload_hash: string }>> {
    const c = await td.pool.connect();
    try {
      const r = await c.query<{ action: string; request_payload_hash: string }>(
        `SELECT action, request_payload_hash FROM audit_log_entries
          WHERE resource_locator = $1 ORDER BY seq ASC`,
        [`member:moderation:${memberId}`],
      );
      return r.rows;
    } finally {
      c.release();
    }
  }

  async function eventTypes(memberId: string): Promise<string[]> {
    const c = await td.pool.connect();
    try {
      const r = await c.query<{ event_type: string }>(
        `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version ASC`,
        [memberId],
      );
      return r.rows.map((x) => x.event_type);
    } finally {
      c.release();
    }
  }

  // ── AC4 — RBAC (the revert-sanity pair + the two DEFERRED-role pins) ──────────────────────────

  it('AC4: pariwar_admin (holds member.moderate) → 200; an auditor with NO key → fail-closed 403', async () => {
    const { p, memberId, client } = await scenario();

    const ok = await act(client, p, memberId, 'suspend', 'r7-contribution-discipline');
    expect(ok.statusCode).toBe(200);

    // The REVERT half: an auditor holds a Pariwar grant but NOT `member.moderate`.
    const auditor = await authenticate({ displayName: 'An Auditor' });
    await grant(auditor.userId, p, 'auditor');
    await elevate(auditor.client, STEP_UP_TERMINATE);
    const denied = await auditor.client.inject({
      method: 'POST',
      url: modUrl(p, memberId, 'terminate'),
      payload: body('r14-forgery'),
    });
    expect(denied.statusCode).toBe(403);
  });

  it('AC4: an acting admin with NO display name is BLOCKED — 409, no fallback, nothing written', async () => {
    // [[project_admin_display_name_attribution]] — `actor_display` is a controlled-staff snapshot
    // and there is deliberately NO email-derived fallback: a missing name blocks the action.
    // This was the ONLY attribution guard on the surface with no test, while five comparable
    // surfaces (helpdesk, operator-helpdesk, verifier-decision, r9-voting, shepherd) all pin it —
    // so a future refactor reintroducing a fallback would have shipped green here.
    const { p, memberId } = await scenario();
    const nameless = await authenticate(); // no displayName ⇒ users.display_name stays NULL
    await grant(nameless.userId, p, 'pariwar_admin');
    await elevate(nameless.client, STEP_UP_SUSPEND);

    const res = await nameless.client.inject({
      method: 'POST',
      url: modUrl(p, memberId, 'suspend'),
      payload: body('r14-forgery'),
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('admin.display_name_missing');

    // Fail-CLOSED, not fail-partial: no decision row and no event may exist.
    const c = await td.pool.connect();
    try {
      const rows = await c.query(
        `SELECT 1 FROM member_moderation_actions WHERE member_id = $1`, [memberId]);
      expect(rows.rowCount).toBe(0);
      const evs = await c.query(
        `SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type LIKE 'member.moderation.%'`,
        [memberId]);
      expect(evs.rowCount).toBe(0);
    } finally {
      c.release();
    }
  });

  it('tenant boundary: an admin elevated in Pariwar A cannot moderate, read or list in Pariwar B', async () => {
    // AI-6-5 family 3 — cross-PARIWAR denial, not merely same-tenant-non-owner. The suite pinned
    // several role-based 403s but never once crossed a tenant line, so an RLS policy typo, a
    // dropped FORCE, or a missing explicit predicate would have shipped green.
    const a = await scenario();
    const b = await scenario();

    // ⚠ 404, NOT 403 — and that is the correct answer, not a weaker one. `scopeResolutionHook`
    // resolves the actor's grants for the URL's Pariwar and returns `pariwar.not_found` on zero
    // rows precisely so the response is not an enumeration oracle: a 403 would confirm that the
    // Pariwar exists to an actor with no business knowing it. The tenant boundary is what is under
    // test here; the SHAPE of the denial is the deliberate non-disclosure posture.
    const DENIED = 404;

    // `a.client` is elevated and granted in Pariwar A only.
    const write = await a.client.inject({
      method: 'POST',
      url: modUrl(b.p, b.memberId, 'suspend'),
      payload: body('r14-forgery'),
    });
    expect(write.statusCode).toBe(DENIED);

    const read = await a.client.inject({ method: 'GET', url: historyUrl(b.p, b.memberId) });
    expect(read.statusCode).toBe(DENIED);

    const list = await a.client.inject({ method: 'GET', url: `/api/v1/p/${b.p}/moderation/members` });
    expect(list.statusCode).toBe(DENIED);

    // And nothing leaked the other way: B's member is untouched.
    const c = await td.pool.connect();
    try {
      const rows = await c.query(
        `SELECT 1 FROM member_moderation_actions WHERE member_id = $1`, [b.memberId]);
      expect(rows.rowCount).toBe(0);
    } finally {
      c.release();
    }
  });

  it('AC4/Decision 4: state_trustee is DENIED — its `state` ceiling can never satisfy a pariwar check', async () => {
    // ⚠ THE FINDING. `epics.md:3540` casts a State Trustee as this story's actor, but `state_trustee`
    // holds `member.suspend` (not `member.moderate`) and its `scopeCeiling: 'state'` fails
    // `scopeWithinCeiling('pariwar','state')`. Granting the key would seed an INERT capability.
    // This pin exists so a well-meaning future grant cannot land silently and be mistaken for a fix.
    const { p, memberId } = await scenario();
    const st = await authenticate({ displayName: 'State Trustee' });
    await grant(st.userId, p, 'state_trustee', { dimension: 'state', value: 'UP' });
    await elevate(st.client, STEP_UP_SUSPEND);
    const res = await st.client.inject({
      method: 'POST',
      url: modUrl(p, memberId, 'suspend'),
      payload: body('r7-contribution-discipline'),
    });
    expect(res.statusCode).toBe(403);
  });

  it('AC4/Decision 4: district_admin is DENIED — a district-ceiling grant cannot satisfy a pariwar check', async () => {
    const { p, memberId } = await scenario();
    const da = await authenticate({ displayName: 'District Admin' });
    await grant(da.userId, p, 'district_admin', { dimension: 'district', value: 'D-1' });
    await elevate(da.client, STEP_UP_SUSPEND);
    const res = await da.client.inject({
      method: 'POST',
      url: modUrl(p, memberId, 'suspend'),
      payload: body('r7-contribution-discipline'),
    });
    expect(res.statusCode).toBe(403);
  });

  // ── AC4 — step-up (the FIRST step-up-gated Epic-10 story) ─────────────────────────────────────

  it('AC4: NO elevation → 403 auth.step_up_required, and nothing is written', async () => {
    const { p, memberId, client } = await scenario();
    const res = await client.inject({
      method: 'POST',
      url: modUrl(p, memberId, 'suspend'),
      payload: body('r7-contribution-discipline'),
    });
    expect(res.statusCode).toBe(403);
    expect((res.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');
    expect(await moderationRows(memberId)).toHaveLength(0);
  });

  it('AC4: a WRONG-CONTEXT elevation is rejected — a restore elevation cannot be spent on a terminate', async () => {
    const { p, memberId, client } = await scenario();
    expect((await act(client, p, memberId, 'suspend', 'r7-contribution-discipline')).statusCode).toBe(200);

    // Mint an elevation for RESTORE, then try to TERMINATE with it.
    await elevate(client, STEP_UP_RESTORE);
    const res = await client.inject({
      method: 'POST',
      url: modUrl(p, memberId, 'terminate'),
      payload: body('r14-forgery'),
    });
    expect(res.statusCode).toBe(403);
    expect((res.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');
    // Still only the suspension on record.
    expect((await moderationRows(memberId)).map((r) => r.action)).toEqual(['suspend']);
  });

  // ── AC2 — legality, always BEFORE any write ───────────────────────────────────────────────────

  it('AC2/Decision 2: `none --terminate-->` is 409 — FR-56 routes termination THROUGH suspension', async () => {
    const { p, memberId, client } = await scenario();
    const res = await act(client, p, memberId, 'terminate', 'r14-forgery');
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('member_moderation.invalid_state');
    // Rejected BEFORE any write: no row, and no event on the member's stream.
    expect(await moderationRows(memberId)).toHaveLength(0);
    expect(await eventTypes(memberId)).not.toContain('member.moderation.terminated');
  });

  it('a request invalid on BOTH axes (illegal transition AND inapplicable reason code) → 422, never 409 — pins the check ORDER (code-review follow-up)', async () => {
    // `none --terminate-->` is illegal (AC2 → 409) AND `moderation-error` is a RESTORE-only code
    // (AC3 → 422). `moderateMember` (packages/domain/src/member/moderation/write.ts) checks the
    // reason-code `appliesTo` guard BEFORE the transition-legality guard, so 422 always wins. This
    // was previously an unpinned, undocumented behavioural contract — pinning it here means a future
    // reordering of those two checks is a deliberate, reviewed change, not a silent flip.
    const { p, memberId, client } = await scenario();
    const res = await act(client, p, memberId, 'terminate', 'moderation-error');
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_moderation.reason_code_invalid',
    );
    expect(await moderationRows(memberId)).toHaveLength(0);
  });

  it('AC2: re-suspending an already-suspended member is 409, not a silent second event', async () => {
    const { p, memberId, client } = await scenario();
    expect((await act(client, p, memberId, 'suspend', 'r7-contribution-discipline')).statusCode).toBe(200);
    const again = await act(client, p, memberId, 'suspend', 'r14-forgery');
    expect(again.statusCode).toBe(409);
    expect((await moderationRows(memberId)).map((r) => r.action)).toEqual(['suspend']);
  });

  it('AC2: restoring an UNMODERATED member is 409 — a no-op never returns 200', async () => {
    const { p, memberId, client } = await scenario();
    const res = await act(client, p, memberId, 'restore', 'moderation-error');
    expect(res.statusCode).toBe(409);
  });

  // ── Member existence (code-review follow-up) ──────────────────────────────────────────────────
  // A syntactically-valid but NEVER-SEEDED memberId must 404, not silently fabricate a `members`
  // row via the projector's `onConflictDoUpdate` — the same discipline `history()` already had.

  it('a moderation action against a memberId that was never seeded → 404, and NOTHING is written', async () => {
    const p = randomUUID();
    createdPariwars.push(p);
    const client = await pariwarAdmin(p);
    const neverSeededMemberId = randomUUID();

    const res = await act(client, p, neverSeededMemberId, 'suspend', 'r7-contribution-discipline');
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: { code: string } }).error.code).toBe('member.not_found');

    expect(await moderationRows(neverSeededMemberId)).toHaveLength(0);
    expect(await eventTypes(neverSeededMemberId)).toHaveLength(0);
    // ⚠ THE regression this pins: no phantom `members` row was fabricated for an identity that
    // never signed up.
    expect(await memberState(neverSeededMemberId)).toBeNull();
  });

  // ── AC3 — the reason-code registry + the mandatory rationale ──────────────────────────────────

  it('AC3: a RESTORE code cannot justify a suspension → 422 reason_code_invalid', async () => {
    const { p, memberId, client } = await scenario();
    const res = await act(client, p, memberId, 'suspend', 'moderation-error');
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_moderation.reason_code_invalid',
    );
    expect(await moderationRows(memberId)).toHaveLength(0);
  });

  it('AC3: an empty / whitespace-only rationale is rejected and nothing is written', async () => {
    const { p, memberId, client } = await scenario();
    await elevate(client, STEP_UP_SUSPEND);
    for (const rationale of ['', '   \n\t ']) {
      const res = await client.inject({
        method: 'POST',
        url: modUrl(p, memberId, 'suspend'),
        payload: { reason_code: 'r7-contribution-discipline', rationale },
      });
      // 400 from the strict Zod schema (its own `.trim().min(1)`), or 422 from the domain guard —
      // either way it never reaches a write, which is the property that matters.
      expect([400, 422]).toContain(res.statusCode);
    }
    expect(await moderationRows(memberId)).toHaveLength(0);
  });

  // ── AC1 / AC4 — the write, the attribution, the audit, and the untouched lifecycle ────────────

  it('AC1: suspend writes the event + the row, and `members.state` NEVER moves (Decision 1)', async () => {
    const { p, memberId, client } = await scenario();
    const before = await memberState(memberId);
    expect(before).toBe('active');

    const res = await act(client, p, memberId, 'suspend', 'r14-forgery');
    expect(res.statusCode).toBe(200);
    const payload = res.json() as Json;
    expect(payload.from_status).toBe('none');
    expect(payload.to_status).toBe('suspended');
    expect(payload.actor_display).toBe('Trustee One');
    expect(payload.rejoin_permitted_at).toBeNull();

    // The event landed on the MEMBER's own stream…
    expect(await eventTypes(memberId)).toContain('member.moderation.suspended');
    // …and the lifecycle state is UNCHANGED. This is the single most important assertion in the
    // story: moderation is an OVERLAY, not a `member_lifecycle_state` label.
    expect(await memberState(memberId)).toBe('active');

    // The decision record carries the attribution + the Tier-1 ciphertext (never plaintext).
    const rows = await moderationRows(memberId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('suspend');
    expect(rows[0]?.actor_display).toBe('Trustee One');
    expect(String(rows[0]?.decision_note_ciphertext)).not.toContain('Recorded after review');
  });

  it('AC6: the REAL suspend route revokes the member\'s sessions and device bindings', async () => {
    // The cascade had no end-to-end assertion at all: the only test that checked rows disappear
    // called `revokeAllMemberSessions` directly, so nothing proved the moderation HANDLER actually
    // invokes it. A dropped call would have left every test green while a suspended member kept
    // every live session — AC6 silently doing nothing.
    const { p, memberId, client } = await scenario();

    const c = await td.pool.connect();
    try {
      // Seed a live refresh chain + a device binding for the member (the shapes the cascade clears).
      const deviceId = `device-${randomUUID()}`;
      await c.query(
        `INSERT INTO member_refresh_tokens (member_id, pariwar_id, device_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '30 days')`,
        [memberId, p, deviceId, `hash-${randomUUID()}`],
      );
      await c.query(
        `INSERT INTO member_trusted_devices (member_id, pariwar_id, device_id, last_seen_at)
         VALUES ($1, $2, $3, now())`,
        [memberId, p, deviceId],
      );

      const live = async (): Promise<number> =>
        (await c.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM member_refresh_tokens
            WHERE member_id = $1 AND revoked_at IS NULL`, [memberId])).rows[0]?.n ?? 0;
      const devices = async (): Promise<number> =>
        (await c.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM member_trusted_devices WHERE member_id = $1`,
          [memberId])).rows[0]?.n ?? 0;

      expect(await live()).toBeGreaterThan(0);
      expect(await devices()).toBeGreaterThan(0);

      expect((await act(client, p, memberId, 'suspend', 'r14-forgery')).statusCode).toBe(200);

      expect(await live()).toBe(0);
      expect(await devices()).toBe(0);
    } finally {
      c.release();
    }
  });

  // ── Rationale decrypt-on-demand (code-review follow-up) ───────────────────────────────────────
  // The single exception to "the ciphertext never leaves the DB": a per-action, gated read.

  it('the admin console can decrypt ONE rationale on demand, and only that route ever returns it', async () => {
    const { p, memberId, client } = await scenario();
    const secret = 'A specific, identifying account of what this member did.';
    const res = await act(client, p, memberId, 'suspend', 'r14-forgery', { rationale: secret });
    expect(res.statusCode).toBe(200);
    const moderationActionId = (res.json() as Json).moderation_action_id as string;

    const rationaleRes = await client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/${moderationActionId}/rationale`,
    });
    expect(rationaleRes.statusCode).toBe(200);
    const body = rationaleRes.json() as { moderation_action_id: string; rationale: string | null };
    expect(body.moderation_action_id).toBe(moderationActionId);
    expect(body.rationale).toBe(secret);

    // The two LIST/history reads never carry it, ciphertext or plaintext.
    const hist = await client.inject({ method: 'GET', url: historyUrl(p, memberId) });
    expect(JSON.stringify(hist.json())).not.toContain(secret);
    expect(JSON.stringify(hist.json())).not.toContain('rationale');
  });

  it('a rationale lookup for a WRONG member (cross-member) or a nonexistent action id → 404, never leaks', async () => {
    const { p, memberId, client } = await scenario();
    const res = await act(client, p, memberId, 'suspend', 'r14-forgery', {
      rationale: 'Only readable via this member and this action id.',
    });
    const moderationActionId = (res.json() as Json).moderation_action_id as string;

    // A different member in the SAME Pariwar, same action id → 404 (not the other member's text).
    const otherMemberId = await seedActiveMember(p);
    const wrongMember = await client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/members/${otherMemberId}/moderation/${moderationActionId}/rationale`,
    });
    expect(wrongMember.statusCode).toBe(404);

    // A syntactically-valid but nonexistent action id on the RIGHT member → 404.
    const bogus = await client.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/${randomUUID()}/rationale`,
    });
    expect(bogus.statusCode).toBe(404);
  });

  it('AC4: an audit line is written per action, and the RATIONALE is never in it', async () => {
    const { p, memberId, client } = await scenario();
    const secret = 'A very identifying sentence about this member.';
    expect((await act(client, p, memberId, 'suspend', 'r14-forgery', { rationale: secret })).statusCode).toBe(200);

    // The audit write is fire-and-forget (it must never block the request path); give it a turn.
    await new Promise((r) => setTimeout(r, 200));
    const lines = await auditLines(memberId);
    expect(lines.map((l) => l.action)).toContain('member_moderation.suspended');
    // ⚠ AC4: the rationale is NEVER audited — not as text, and not as its own digest. The payload
    // hash is `sha256(action:memberId)`, which is independent of what the trustee wrote.
    expect(JSON.stringify(lines)).not.toContain(secret);
    const expectedHash = createHash('sha256').update(`suspend:${memberId}`, 'utf8').digest('hex');
    expect(lines.some((l) => l.request_payload_hash === expectedHash)).toBe(true);
  });

  // ── Story 10.19 AC3 — restore FROM TERMINATED is a Trustee Panel act ────────────────────────────
  //
  // Niyamavali §8.4, ratified 2026-08-10: the "explicit Trustee reinstatement" that recovers a
  // TERMINATED member is an act of the Trustee Panel under §8.7 — NOT the individual "Trustee
  // discretion" of §8.3 by which a SUSPENDED member is restored. Q1 option (a), Decision
  // `2026-08-10-097` clause 1, discharging a question on its SECOND deposit.
  //
  // The pair below is the whole ruling: the same action, the same member, the same reason code —
  // and the outcome turns only on WHO asks.

  it('⭐ AC3: a pariwar_admin CANNOT restore a TERMINATED member — 403, and the termination stands', async () => {
    const { p, memberId, client } = await scenario();
    await act(client, p, memberId, 'suspend', 'r7-contribution-discipline');
    await act(client, p, memberId, 'terminate', 'r14-forgery');

    // The same actor who terminated. They hold `member.moderate` and step-up elevation — everything
    // that sufficed before this story — and it is no longer enough.
    const res = await act(client, p, memberId, 'restore', 'moderation-error');
    expect(res.statusCode).toBe(403);

    // ⛔ FAIL-CLOSED, AND NOTHING PARTIAL. The denial happens INSIDE the scope tx before the write,
    // so a refused restore must leave no event, no decision row, and no status change behind.
    const hist = (await client.inject({ method: 'GET', url: historyUrl(p, memberId) })).json() as Json;
    expect(hist.current_status).toBe('terminated');
    expect((await moderationRows(memberId)).map((r) => r.action)).toEqual(['suspend', 'terminate']);
    expect(await eventTypes(memberId)).not.toContain('member.moderation.restored');
  });

  it('⭐ AC3: a trustee_panel member CAN — the transition stays legal, only the authority narrows', async () => {
    const { p, memberId, client } = await scenario();
    await act(client, p, memberId, 'suspend', 'r7-contribution-discipline');
    await act(client, p, memberId, 'terminate', 'r14-forgery');

    // ⛔ The `terminated --restore--> none` arm in `status.ts` is NOT removed by this story. The
    // transition is still legal; what changed is who may ask for it. If this test ever fails while
    // the one above passes, the arm was deleted and a terminated member became unrestorable BY
    // ANYONE — the opposite of what §8.4 says.
    const panel = await trusteePanel(p);
    expect((await act(panel, p, memberId, 'restore', 'moderation-error')).statusCode).toBe(200);

    const hist = (await client.inject({ method: 'GET', url: historyUrl(p, memberId) })).json() as Json;
    expect(hist.current_status).toBe('none');
  });

  it('⚠ AC3: the narrowing is EXACTLY ONE transition — a pariwar_admin still restores a SUSPENDED member', async () => {
    // §8.3 is untouched, and Panel authority under Part 8 stays CONCURRENT everywhere else
    // (Decision `2026-08-10-096` clause 3). A check that fired on every restore — or on every
    // moderation action — would silently convert a concurrent authority into an exclusive one
    // across the whole of Part 8. This is the test that fails if that widening ever happens.
    const { p, memberId, client } = await scenario();
    await act(client, p, memberId, 'suspend', 'r7-contribution-discipline');

    expect((await act(client, p, memberId, 'restore', 'moderation-error')).statusCode).toBe(200);
    const hist = (await client.inject({ method: 'GET', url: historyUrl(p, memberId) })).json() as Json;
    expect(hist.current_status).toBe('none');
  });

  it('⚠ AC3: a pariwar_admin still SUSPENDS and TERMINATES — the new key gates nothing else', async () => {
    const { p, memberId, client } = await scenario();
    expect((await act(client, p, memberId, 'suspend', 'r7-contribution-discipline')).statusCode).toBe(200);
    expect((await act(client, p, memberId, 'terminate', 'r14-forgery')).statusCode).toBe(200);
  });

  it('AC1/AC9: the full legal walk suspend → terminate → restore, with the history read agreeing', async () => {
    const { p, memberId, client } = await scenario();

    expect((await act(client, p, memberId, 'suspend', 'r7-contribution-discipline')).statusCode).toBe(200);
    let hist = (await client.inject({ method: 'GET', url: historyUrl(p, memberId) })).json() as Json;
    expect(hist.current_status).toBe('suspended');
    // Server-derived legality — the console's button enablement rides exactly this.
    expect(hist.legal_actions).toEqual(expect.arrayContaining(['terminate', 'restore']));
    expect(hist.legal_actions).not.toContain('suspend');

    const term = await act(client, p, memberId, 'terminate', 'r14-forgery');
    expect(term.statusCode).toBe(200);
    expect((term.json() as Json).rejoin_permitted_at).not.toBeNull();

    hist = (await client.inject({ method: 'GET', url: historyUrl(p, memberId) })).json() as Json;
    expect(hist.current_status).toBe('terminated');
    expect(hist.legal_actions).toEqual(['restore']);

    // ⚖ Story 10.19: the restore FROM TERMINATED is now a TRUSTEE PANEL act (Niyamavali §8.4, Q1
    // option (a)). The `pariwar_admin` who suspended and terminated may no longer perform it — the
    // walk needs a second, differently-authorised actor, which is the whole point of the ruling.
    const panel = await trusteePanel(p);
    expect((await act(panel, p, memberId, 'restore', 'moderation-error')).statusCode).toBe(200);
    hist = (await client.inject({ method: 'GET', url: historyUrl(p, memberId) })).json() as Json;
    expect(hist.current_status).toBe('none');
    expect(hist.current_reason_code).toBeNull();
    expect(hist.legal_actions).toEqual(['suspend']);

    // Three events, three rows, and the lifecycle state STILL untouched across the whole walk.
    expect(await eventTypes(memberId)).toEqual(
      expect.arrayContaining([
        'member.moderation.suspended',
        'member.moderation.terminated',
        'member.moderation.restored',
      ]),
    );
    expect((await moderationRows(memberId)).map((r) => r.action)).toEqual([
      'suspend',
      'terminate',
      'restore',
    ]);
    expect(await memberState(memberId)).toBe('active');

    // ⚠ The history DTO must NEVER carry the rationale or its ciphertext.
    expect(JSON.stringify(hist)).not.toContain('rationale');
    expect(JSON.stringify(hist)).not.toContain('enc:v1');
  });

  it('Decision 9: the moderated-members list agrees with the overlay at every step', async () => {
    const { p, memberId, client } = await scenario();
    const listUrl = `/api/v1/p/${p}/moderation/members`;
    const idsIn = async (): Promise<string[]> => {
      const res = await client.inject({ method: 'GET', url: listUrl });
      expect(res.statusCode).toBe(200);
      return ((res.json() as { items: Array<{ member_id: string }> }).items ?? []).map((i) => i.member_id);
    };

    // The `listModeratedMembersForPariwar` latest-action derivation must track the event fold across
    // ALL FOUR legal arms — this is the equivalence the read's header claims.
    expect(await idsIn()).not.toContain(memberId);
    await act(client, p, memberId, 'suspend', 'r7-contribution-discipline');
    expect(await idsIn()).toContain(memberId);
    await act(client, p, memberId, 'terminate', 'r14-forgery');
    expect(await idsIn()).toContain(memberId);
    // ⚖ Story 10.19 — restore FROM TERMINATED is a Trustee Panel act (Niyamavali §8.4).
    await act(await trusteePanel(p), p, memberId, 'restore', 'moderation-error');
    expect(await idsIn()).not.toContain(memberId);
    await act(client, p, memberId, 'suspend', 'regulator-action');
    expect(await idsIn()).toContain(memberId);
  });

  // ── Reason-codes registry read (code-review follow-up) ───────────────────────────────────────

  it('the reason-codes registry read returns all 10 codes with appliesTo + label, matching the write-path 422', async () => {
    const { p, client } = await scenario();
    const res = await client.inject({ method: 'GET', url: `/api/v1/p/${p}/moderation/reason-codes` });
    expect(res.statusCode).toBe(200);
    const items = (res.json() as { items: Array<Record<string, unknown>> }).items;
    expect(items).toHaveLength(10);

    const restoreOnly = items.find((i) => i.code === 'moderation-error');
    expect(restoreOnly?.applies_to).toEqual(['restore']);
    expect(restoreOnly?.label).toBe('Moderation recorded in error');

    const both = items.find((i) => i.code === 'r14-forgery');
    expect(both?.applies_to).toEqual(['suspend', 'terminate']);
    expect(both?.niyamavali_ref).toBe('R14');
  });
});
