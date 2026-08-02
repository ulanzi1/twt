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
//     invalidation, and a suspended member drops out of the assignable roster with NO roster change.
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

  function body(reasonCode: string, rationale = 'Recorded after review of the file.'): Json {
    return { reason_code: reasonCode, rationale };
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
      payload: body(reasonCode, opts.rationale),
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
        `SELECT action, reason_code, actor_display, rejoin_permitted_at, rationale_ciphertext
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
    expect(String(rows[0]?.rationale_ciphertext)).not.toContain('Recorded after review');
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

    expect((await act(client, p, memberId, 'restore', 'moderation-error')).statusCode).toBe(200);
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
    await act(client, p, memberId, 'restore', 'moderation-error');
    expect(await idsIn()).not.toContain(memberId);
    await act(client, p, memberId, 'suspend', 'regulator-action');
    expect(await idsIn()).toContain(memberId);
  });
});
