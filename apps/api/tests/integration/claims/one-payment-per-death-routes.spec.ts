// Story 6.28 — one payment per death through HTTP (:5433). `2026-10-11-318` Q1 A, `2026-10-11-319` OP2, OP4 H(iv).
//
//   AC2 — ONE test per approval ROUTE (the 6.24a / 6.26a precedent): with another claim X of the death past its final vote,
//         the District Admin's approval is ⛔ not stopped (P1); each FINAL route — the cycle-freeze vote, R9 finalize,
//         "no correction needed" and the Super Admin's escalation decision — answers 409
//         `<prefix>.death_already_finally_approved` with `details: {}` — ⛔ never a 500, ⛔ never a denial, ⛔ never X's id
//         anywhere in the body. ⭐ With X PAID (`approved`), H(iv) then CLOSES Y after the 409 (OP4 — ⛔ never the vote alone).
//   AC4 — H(iv) a lock timeout leaves the 409 intact, Y open, and an error-level log; H(i) the cycle commit closes the other
//         open claims of the committed death (fresh + replay, idempotent; a lock timeout is logged and a replay heals it);
//         H(iii) the appeal response's `claim_state` reads `closed`; H(ii) the helpline intake and the override answer
//         `state: 'closed'` — IN the request transaction, ⛔ never a hang.
// A world per test in a FRESH Pariwar; X is seeded through the projector.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const R9_CLAUSE = 'niy.special-death.r9';
const OLD_DECLARATION = new Date(Date.now() - 400 * 86_400_000);
const STOP_WORDS = 'Another claim for this death has already passed the final vote. This claim cannot be finally approved.';

describe.skipIf(!hasDatabase)('Story 6.28 — one payment per death through HTTP (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const logLines: string[] = [];
  const logStream = new Writable({
    write(chunk: Buffer | string, _enc, cb) {
      logLines.push(chunk.toString());
      cb();
    },
  });

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps, { logStream });
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

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `opd628-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
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

  type Role = 'district_admin' | 'pariwar_admin' | 'super_admin' | 'helpline_operator';
  async function staff(pariwarId: string, role: Role) {
    const display = {
      district_admin: 'Anita (District Admin)',
      pariwar_admin: 'Prakash (Pariwar Admin)',
      super_admin: 'Sushila (Super Admin)',
      helpline_operator: 'Hema (Helpline)',
    }[role];
    const a = await authenticate(display);
    const [dim, value] =
      role === 'district_admin' ? ['district', DISTRICT] : role === 'super_admin' ? ['global', null] : ['pariwar', pariwarId];
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      a.userId, pariwarId, role, dim, value,
    ]);
    await a.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return a;
  }

  async function stepUp(a: { client: Client }, actionContext: string): Promise<void> {
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } })).statusCode).toBe(200);
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } })).statusCode).toBe(200);
  }

  async function inScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const s = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(s);
      await closeScopeTx(s, true);
      return out;
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
  }

  const emitter = (s: Awaited<ReturnType<typeof openScopeTx>>, pariwarId: string, memberId: string, claimCaseId: string) =>
    (from: string | null, to: string, eventType: string, extra: Json = {}) =>
      claim.projectClaimState(s.client, {
        claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: ids.memberId(memberId), intakeChannels: ['helpline'],
        claimantActorId: null, eventType: eventType as never, payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
        actorId: null,
      });

  /** A QUIET claim (one old declaration ⇒ ⛔ no warning) in `verification_in_progress`, approvable in full, in a FRESH
   *  Pariwar — R. */
  async function seedWorld(): Promise<{ pariwarId: string; memberId: string; claimCaseId: string }> {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const pid = ids.pariwarId(pariwarId);
      const mid = ids.memberId(memberId);
      await s.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at) VALUES ($1, $2, 'active', 0, now(), now())`,
        [memberId, pariwarId],
      );
      await s.client.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, DISTRICT],
      );
      const row = { rank: 1 as const, splitPct: 100 as const, relationship: 'spouse', nameCiphertext: 'enc:v1:n', mobileCiphertext: 'enc:v1:m', addressCiphertext: null };
      await nominee.replaceMemberNominees(s.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
      await nominee.appendMemberDeclarationVersions(s.tx, {
        memberId: mid, pariwarId: pid, plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(s.tx, pid, mid), [1]),
        nominees: [row], recordedAt: OLD_DECLARATION, eventVersion: null,
      });
      const emit = emitter(s, pariwarId, memberId, claimCaseId);
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
    });
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    return { pariwarId, memberId, claimCaseId };
  }

  /** X — another claim of the same death, driven through the projector to `state` (past its final vote, or paid). */
  async function siblingAt(
    w: { pariwarId: string; memberId: string },
    state: 'state_trustee_approved' | 'approved',
    opts: { readonly channel?: 'helpline' | 'member_app'; readonly approvable?: boolean } = {},
  ): Promise<string> {
    const xid = randomUUID();
    const channel = opts.channel ?? 'helpline';
    await inScope(w.pariwarId, async (s) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(xid), pariwarId: ids.pariwarId(w.pariwarId), deceasedMemberId: ids.memberId(w.memberId), intakeChannels: [channel],
          claimantActorId: null, eventType: eventType as never, payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: w.memberId, intake_channel: channel, claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
    });
    // The cycle commit's RF7 re-checks need X's certificate + completed inspection (`seedNomineeNameCheck`'s default) —
    // seeded while X is still reviewable (`verifier_approved`).
    if (opts.approvable) await seedNomineeNameCheck(deps, w.pariwarId, xid);
    await inScope(w.pariwarId, async (s) => {
      const emit = (from: string | null, to: string, eventType: string) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(xid), pariwarId: ids.pariwarId(w.pariwarId), deceasedMemberId: ids.memberId(w.memberId), intakeChannels: [channel],
          claimantActorId: null, eventType: eventType as never, payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system' } as never,
          actorId: null,
        });
      await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit('state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
      if (state === 'approved') await emit('state_trustee_approved', 'approved', 'claim.approved');
    });
    return xid;
  }

  /** Hold the death's INTAKE key on a separate session (a closure in its own tx then meets its `lock_timeout`). */
  async function holdIntakeKey(pariwarId: string, memberId: string) {
    const c = await td.pool.connect();
    const key = claim.intakeAdvisoryLockKey(pariwarId, memberId).toString();
    await c.query('SELECT pg_advisory_lock($1::bigint)', [key]);
    return async () => {
      await c.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
      c.release();
    };
  }

  const closedTriggerOf = async (cid: string) =>
    (await td.pool.query<{ t: string; h: string }>(
      `SELECT payload ->> 'trigger' AS t, payload ->> 'held_by_claim_case_id' AS h FROM events_log WHERE stream_id = $1 AND event_type = 'claim.closed'`,
      [cid],
    )).rows[0];

  /** `p` must settle within `ms` — a closure that waited on its own request's intake key would hang (Trap 2). */
  function withinMs<T>(p: Promise<T>, ms = 15_000): Promise<T> {
    return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`no answer within ${ms} ms — a hang`)), ms))]);
  }

  const stateOf = async (cid: string) => (await td.pool.query<{ s: string }>('SELECT current_state::text AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]!.s;
  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; message: string; details?: Json } }).error;

  function expectStopped(res: { statusCode: number; body: string }, prefix: string, xid: string): void {
    expect(res.statusCode, res.body).toBe(409);
    const err = errOf(res.body);
    expect(err).toMatchObject({ code: `${prefix}.death_already_finally_approved`, message: STOP_WORDS });
    expect(err.details ?? {}).toEqual({});
    // ⛔ The other claim's id ⛔ never leaves the server (OP2).
    expect(res.body.toLowerCase()).not.toContain(xid.toLowerCase());
    expect(err.message).not.toMatch(/refused|denied/i);
  }

  async function daApprove(da: { client: Client }, w: { pariwarId: string; claimCaseId: string }) {
    return da.client.inject({
      method: 'POST',
      url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' },
    });
  }

  // ── AC2 — the five routes ──────────────────────────────────────────────────────────────────────────────────────
  it('1/5 — the District Admin\'s verifier decision is ⛔ not STOPPED (P1) — it approves (201)', async () => {
    const w = await seedWorld();
    await siblingAt(w, 'state_trustee_approved');
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
  });

  // X `state_trustee_approved` ⇒ the 409 and Y untouched (a vote alone closes ⛔ nothing — F15); X `approved` ⇒ the 409, then
  // H(iv) CLOSES Y (`death_already_finally_approved`, held by X).
  for (const xState of ['state_trustee_approved', 'approved'] as const) {
  const paid = xState === 'approved';
  const expectAfter = async (y: string, xid: string, unchanged: string) => {
    if (!paid) {
      expect(await stateOf(y)).toBe(unchanged);
      return;
    }
    expect(await stateOf(y)).toBe('closed');
    expect(await closedTriggerOf(y)).toEqual({ t: 'death_already_finally_approved', h: xid });
  };

  it(`2/5 — the cycle-freeze vote → 409 \`cycle_freeze.death_already_finally_approved\`; X ${xState} ⇒ Y ${paid ? 'CLOSED by H(iv)' : 'unchanged'}`, async () => {
    const w = await seedWorld();
    const xid = await siblingAt(w, xState);
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const res = await pa.client.inject({
      method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, action: 'approve' },
    });
    expectStopped(res, 'cycle_freeze', xid);
    await expectAfter(w.claimCaseId, xid, 'verifier_approved');
  });

  it(`3/5 — R9 finalize → 409 \`r9_voting.death_already_finally_approved\`; X ${xState} ⇒ Y ${paid ? 'CLOSED by H(iv), its routing ended' : 'unchanged'}`, async () => {
    const w = await seedWorld();
    await td.pool.query(
      `INSERT INTO clause_versions (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
       VALUES (gen_random_uuid(), $1, $2, 1, now(), $3, 'pool')`,
      [R9_CLAUSE, w.pariwarId, JSON.stringify({ rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' })],
    );
    await td.pool.query(
      `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Router')`,
      [w.claimCaseId, w.pariwarId, randomUUID()],
    );
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const r9 = `/api/v1/p/${w.pariwarId}/admin/r9-voting/${w.claimCaseId}`;
    expect((await pa.client.inject({ method: 'POST', url: `${r9}/open`, payload: { clause_id: R9_CLAUSE, panel_actor_ids: [pa.userId] } })).statusCode).toBe(201);
    expect((await pa.client.inject({ method: 'POST', url: `${r9}/vote`, payload: { vote: 'approve', rationale: 'yes' } })).statusCode).toBe(201);
    const xid = await siblingAt(w, xState);
    await stepUp(pa, 'r9_finalize');
    expectStopped(await pa.client.inject({ method: 'POST', url: `${r9}/finalize`, payload: {} }), 'r9_voting', xid);
    await expectAfter(w.claimCaseId, xid, 'verification_in_progress');
    if (paid) {
      const live = await td.pool.query(
        `SELECT 1 FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND outcome = 'routed_to_r9' AND superseded_at IS NULL`,
        [w.claimCaseId],
      );
      expect(live.rowCount).toBe(0);
    }
  });

  /** A quiet claim the District Admin approved, returned by the Pariwar Admin and marked `mustAct`. */
  async function returned(mustAct: 'family' | 'staff') {
    const w = await seedWorld();
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const run = await inScope(w.pariwarId, async (s) => {
      await claim.returnToDistrictAdmin(s.client, {
        claimCaseId: ids.claimId(w.claimCaseId), pariwarId: ids.pariwarId(w.pariwarId), reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:return-note', actorId: pa.userId, actorDisplay: 'Prakash (Pariwar Admin)', actor: 'trustee',
      });
      const mark = await claim.writeCorrectionMark(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId), mustAct, actorId: pa.userId,
        actorDisplay: 'Prakash (Pariwar Admin)', setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: claim.noCorrectionHold,
      });
      return mark.openedRun!;
    });
    return { ...w, da, pa, day0: run.day0 };
  }

  it(`4/5 — "no correction needed" (6.19c D27) → 409 \`closure.death_already_finally_approved\`; X ${xState} ⇒ Y ${paid ? 'CLOSED by H(iv)' : 'unchanged'}`, async () => {
    const w = await returned('family');
    await inScope(w.pariwarId, (s) =>
      claim.recordNoCorrectionNeeded(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId), actorId: w.da.userId,
        actorDisplay: 'Anita (District Admin)', now: new Date(), markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n',
        setByRole: 'district_admin', hold: claim.isCorrectionClaimHeld,
      }),
    );
    await td.pool.query(
      `UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`,
      [w.claimCaseId],
    );
    await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId);
    const xid = await siblingAt(w, xState);
    const res = await w.pa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`, payload: {},
    });
    expectStopped(res, 'closure', xid);
    await expectAfter(w.claimCaseId, xid, 'verifier_approved');
  });

  it(`5/5 — the Super Admin's escalation decision (→ \`decideEscalatedClosure\` via \`translateClosureError\`) → 409; X ${xState} ⇒ Y ${paid ? 'CLOSED by H(iv)' : 'unchanged'}`, async () => {
    const w = await returned('staff');
    await inScope(w.pariwarId, (s) =>
      claim.escalateStaffCase(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId),
        now: new Date(`${cycleCalendar.addCalendarDays(w.day0, 90)}T04:30:00.000Z`),
      }),
    );
    const xid = await siblingAt(w, xState);
    const sa = await staff(w.pariwarId, 'super_admin');
    const res = await sa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation/decision`,
      payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.' },
    });
    expectStopped(res, 'closure', xid);
    await expectAfter(w.claimCaseId, xid, 'verifier_approved');
  });
  }

  // ── AC4 — H(iv)'s failure, H(i), H(iii), H(ii) ────────────────────────────────────────────────────────────────────
  it('H(iv) — a lock timeout leaves the 409 INTACT, Y open, and an error-level log with ids only', async () => {
    const w = await seedWorld();
    const xid = await siblingAt(w, 'approved');
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const release = await holdIntakeKey(w.pariwarId, w.memberId);
    logLines.length = 0;
    try {
      const res = await pa.client.inject({
        method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, action: 'approve' },
      });
      expectStopped(res, 'cycle_freeze', xid);
    } finally {
      await release();
    }
    expect(await stateOf(w.claimCaseId)).toBe('verifier_approved');
    const line = logLines.map((l) => JSON.parse(l) as Json).find((l) => String(l['msg'] ?? '').startsWith('one payment per death'));
    expect(line).toMatchObject({ level: 50, claim_case_id: w.claimCaseId, site: 'cycle_freeze.vote', lock_timeout: true });
  });

  it('H(i) — the cycle COMMIT closes the committed death\'s other open claims (fresh + replay, idempotent); a vote alone closed nothing', async () => {
    const w = await seedWorld(); // Y — open (`verification_in_progress`)
    const xid = await siblingAt(w, 'state_trustee_approved', { approvable: true });
    expect(await stateOf(w.claimCaseId)).toBe('verification_in_progress');
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    await stepUp(pa, 'cycle_freeze_commit');
    const commitId = randomUUID();
    const res = await pa.client.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/commit`, payload: { commit_id: commitId } });
    expect(res.statusCode, res.body).toBe(200);
    expect((res.json() as { committed_claim_ids: string[] }).committed_claim_ids).toEqual([xid]);
    expect(await stateOf(xid)).toBe('approved');
    expect(await stateOf(w.claimCaseId)).toBe('closed');
    expect(await closedTriggerOf(w.claimCaseId)).toEqual({ t: 'death_already_finally_approved', h: xid });
    // A replay re-runs it — idempotently (⛔ a second `claim.closed`).
    await stepUp(pa, 'cycle_freeze_commit');
    const replay = await pa.client.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/commit`, payload: { commit_id: commitId } });
    expect(replay.statusCode, replay.body).toBe(200);
    const closures = await td.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.closed'`, [w.claimCaseId]);
    expect(closures.rowCount).toBe(1);
  });

  it('H(i) — a lock timeout is logged and leaves the claim open (R2); the commit is ⛔ not failed; a REPLAY then closes it', async () => {
    const w = await seedWorld();
    const xid = await siblingAt(w, 'state_trustee_approved', { approvable: true });
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    await stepUp(pa, 'cycle_freeze_commit');
    const commitId = randomUUID();
    const release = await holdIntakeKey(w.pariwarId, w.memberId);
    logLines.length = 0;
    try {
      const res = await pa.client.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/commit`, payload: { commit_id: commitId } });
      expect(res.statusCode, res.body).toBe(200);
    } finally {
      await release();
    }
    expect(await stateOf(xid)).toBe('approved');
    expect(await stateOf(w.claimCaseId)).toBe('verification_in_progress');
    const line = logLines.map((l) => JSON.parse(l) as Json).find((l) => String(l['msg'] ?? '').startsWith('one payment per death'));
    expect(line).toMatchObject({ level: 50, deceased_member_id: w.memberId, site: 'cycle_freeze.commit', lock_timeout: true });
    await stepUp(pa, 'cycle_freeze_commit');
    const replay = await pa.client.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/commit`, payload: { commit_id: commitId } });
    expect(replay.statusCode, replay.body).toBe(200);
    expect(await stateOf(w.claimCaseId)).toBe('closed');
  });

  it('H(iii) — a refusal of a PAID death is appealed and REVERSED: the stage-1 response\'s `claim_state` is `closed`', async () => {
    const w = await seedWorld();
    const xid = await siblingAt(w, 'approved');
    // Y — refused for an ordinary reason (its LIVE decision row), through the projector.
    await inScope(w.pariwarId, async (sc) => {
      const emit = emitter(sc, w.pariwarId, w.memberId, w.claimCaseId);
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
      await sc.client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'other', 'enc:v1:r', $3, 'Anita (District Admin)')`,
        [w.claimCaseId, w.pariwarId, randomUUID()],
      );
    });
    await td.pool.query(
      `INSERT INTO pariwar_appeal_config (pariwar_id, legal_review_status) VALUES ($1, 'cleared')
         ON CONFLICT (pariwar_id) DO UPDATE SET legal_review_status = 'cleared'`,
      [w.pariwarId],
    );
    const op = await staff(w.pariwarId, 'helpline_operator');
    const filed = await op.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/appeal`, payload: {} });
    expect(filed.statusCode, filed.body).toBe(201);
    const reviewer = await staff(w.pariwarId, 'district_admin');
    const reversed = await reviewer.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/appeal/stage1`,
      payload: { decision: 'reversed', rationale: 'Reconsidered on the merits.', disposition_category: 'reconsideration_on_merits' },
    });
    expect(reversed.statusCode, reversed.body).toBe(201);
    expect((reversed.json() as { claim_state: string }).claim_state).toBe('closed');
    expect(await closedTriggerOf(w.claimCaseId)).toEqual({ t: 'death_already_finally_approved', h: xid });
  });

  it('H(ii) — the HELPLINE intake for a paid death kept apart answers `state: \'closed\'` (in the REQUEST tx — ⛔ never a hang)', async () => {
    const w = await seedWorld();
    // Y (the world's own claim) is ⛔ the subject — refuse it out of the way (terminal), so the filing below MINTS.
    await inScope(w.pariwarId, async (sc) => {
      const emit = emitter(sc, w.pariwarId, w.memberId, w.claimCaseId);
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
    });
    const xid = await siblingAt(w, 'approved');
    await td.pool.query(
      `INSERT INTO convergence_overrides (pariwar_id, deceased_member_id, intake_attempt_id, against_claim_case_id, reason, decided_by_actor)
       VALUES ($1, $2, $3, $4, 'fixture — kept apart', $5)`,
      [w.pariwarId, w.memberId, randomUUID(), xid, randomUUID()],
    );
    const op = await staff(w.pariwarId, 'helpline_operator');
    await stepUp(op, 'claim_file');
    const res = await withinMs(
      op.client.inject({
        method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/claims/intake`,
        payload: { deceasedMemberId: w.memberId, relationship: 'spouse', identityReadBackConfirmed: true, lookupMethod: 'mobile' },
      }),
    );
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { claimCaseId: string; created: boolean; state: string };
    expect(body).toMatchObject({ created: true, state: 'closed' });
    expect(await stateOf(body.claimCaseId)).toBe('closed');
    expect(await closedTriggerOf(body.claimCaseId)).toEqual({ t: 'death_already_finally_approved', h: xid });
  });

  it('H(ii) — the OVERRIDE of a filing against a paid claim answers `state: \'closed\'` (⛔ never a hang)', async () => {
    const w = await seedWorld();
    await inScope(w.pariwarId, async (sc) => {
      const emit = emitter(sc, w.pariwarId, w.memberId, w.claimCaseId);
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
    });
    const xid = await siblingAt(w, 'approved', { channel: 'member_app' });
    const op = await staff(w.pariwarId, 'helpline_operator');
    await stepUp(op, 'claim_file');
    const parked = await op.client.inject({
      method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/claims/intake`,
      payload: { deceasedMemberId: w.memberId, relationship: 'spouse', identityReadBackConfirmed: true, lookupMethod: 'mobile' },
    });
    expect(parked.statusCode, parked.body).toBe(200);
    expect(parked.json()).toMatchObject({ claimCaseId: xid, created: false });
    const attempt = await td.pool.query<{ id: string }>(
      `SELECT intake_attempt_id AS id FROM intake_attempts WHERE pariwar_id = $1 AND deceased_member_id = $2 AND attempt_status = 'pending'`,
      [w.pariwarId, w.memberId],
    );
    await stepUp(op, 'claim_file');
    const res = await withinMs(
      op.client.inject({
        method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/claims/convergence/override`,
        payload: { intakeAttemptId: attempt.rows[0]!.id, againstClaimCaseId: xid, reason: 'A different family member filed for this death.' },
      }),
    );
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { newClaimCaseId: string; state: string };
    expect(body.state).toBe('closed');
    expect(await stateOf(body.newClaimCaseId)).toBe('closed');
  });
});
