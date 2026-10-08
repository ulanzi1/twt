// Story 6.24a — the refile after a suspicion refusal, through HTTP (:5433). `2026-10-07-292`.
//
//   AC2 — ONE test per approval ROUTE (the 6.26a precedent): the District Admin's approval is ⛔ not held (P1, `step:
//         'district_admin'`); each FINAL route — the cycle-freeze vote, R9 finalize, "no correction needed" and the Super
//         Admin's escalation decision — answers 409 `<prefix>.suspicion_appeal_pending` `{ reason }` in words that say the
//         claim WAITS, ⛔ never a 500, ⛔ never a denial (F9).
//   AC2b — the 90 days at the on-behalf initiation (409 `appeal.suspicion_refusal_time_limit_passed` `{ appeal_until }`);
//          the helpline appeal screen's read and its filing, by an operator holding ONLY `claim.file`; the reason lock
//          (409 `verifier_decision.suspicion_reason_locked`).
//   AC1 — the F1 swallow over HTTP: a SAME-channel refile (helpline → helpline) while S stands MINTS (`created: true`).
//   AC8 — the console's kept-apart / wait lines (one booked read under a SAVEPOINT; a failed read says "could not be
//         checked" and aborts ⛔ nothing); the member entry read's two bits (`claim_live` false while S stands,
//         `claim_closed` on a closed claim); the helpline read-back lists a `closed` claim.
// A world per test in a FRESH Pariwar; the refused sibling S is seeded through the projector + its decision row.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import {
  VERIFIER_CONSOLE_MAX_READS,
  assembleSuspicionRefusal,
  assembleVerifierConsole,
  type VerifierConsoleContext,
} from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

// The console section's ONE read made to fail ON DEMAND with a REAL SQL error first (the SAVEPOINT path).
const fault = vi.hoisted(() => ({ on: false }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const { sql } = await import('drizzle-orm');
  return {
    ...actual,
    claim: {
      ...actual.claim,
      readStandingSuspicionRefusals: async (...a: Parameters<typeof actual.claim.readStandingSuspicionRefusals>) => {
        if (fault.on) await (a[0] as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(sql`SELECT 1/0`);
        return actual.claim.readStandingSuspicionRefusals(...a);
      },
    },
  };
});

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const R9_CLAUSE = 'niy.special-death.r9';
const OLD_DECLARATION = new Date(Date.now() - 400 * 86_400_000);
const DAY = 86_400_000;
const ACCESS_TTL_MS = 15 * 60 * 1000;

describe.skipIf(!hasDatabase)('Story 6.24a — the suspicion refusal through HTTP (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    fault.on = false;
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
    const email = `sr624a-${randomUUID()}@example.test`;
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

  /** S — another claim of the same death, `denied` on `-239` (through the projector + its LIVE decision row). */
  async function refuseSibling(w: { pariwarId: string; memberId: string }, opts: { reason?: string; decidedAt?: Date } = {}): Promise<string> {
    const sid = randomUUID();
    await inScope(w.pariwarId, async (s) => {
      const emit = emitter(s, w.pariwarId, w.memberId, sid);
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: w.memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
      await s.client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, decided_at)
         VALUES ($1, $2, 'denied', $3, 'enc:v1:r', $4, 'Anita (District Admin)', $5)`,
        [sid, w.pariwarId, opts.reason ?? 'post_death_nominee_change', randomUUID(), opts.decidedAt ?? new Date()],
      );
    });
    return sid;
  }

  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; message: string; details?: Json } }).error;

  function expectWaits(res: { statusCode: number; body: string }, prefix: string): void {
    expect(res.statusCode, res.body).toBe(409);
    const err = errOf(res.body);
    expect(err).toMatchObject({ code: `${prefix}.suspicion_appeal_pending`, details: { reason: 'appeal_not_filed' } });
    expect(err.message).toMatch(/Final approval waits/);
    // The words name the EARLIER claim's refusal — this claim is ⛔ never said to be refused or denied.
    expect(err.message).not.toMatch(/this claim (?:is|was|has been) (?:refused|denied)/i);
  }

  async function daApprove(da: { client: Client }, w: { pariwarId: string; claimCaseId: string }) {
    return da.client.inject({
      method: 'POST',
      url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' },
    });
  }

  // ── AC2 — the five routes ──────────────────────────────────────────────────────────────────────────────────────
  it('1/5 — the District Admin\'s verifier decision is ⛔ not HELD (P1, `district_admin`) — it approves (201)', async () => {
    const w = await seedWorld();
    await refuseSibling(w);
    const da = await staff(w.pariwarId, 'district_admin');
    const res = await daApprove(da, w);
    expect(res.statusCode, res.body).toBe(201);
  });

  it('2/5 — the cycle-freeze vote → 409 `cycle_freeze.suspicion_appeal_pending`', async () => {
    const w = await seedWorld();
    await refuseSibling(w);
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const res = await pa.client.inject({
      method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, action: 'approve' },
    });
    expectWaits(res, 'cycle_freeze');
  });

  it('3/5 — R9 finalize → 409 `r9_voting.suspicion_appeal_pending`', async () => {
    const w = await seedWorld();
    await refuseSibling(w);
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
    await stepUp(pa, 'r9_finalize');
    expectWaits(await pa.client.inject({ method: 'POST', url: `${r9}/finalize`, payload: {} }), 'r9_voting');
  });

  /** A quiet claim the District Admin approved, returned by the Pariwar Admin and marked `mustAct` — with S refused. */
  async function returned(mustAct: 'family' | 'staff') {
    const w = await seedWorld();
    await refuseSibling(w);
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

  it('4/5 — "no correction needed" (6.19c D27) → 409 `closure.suspicion_appeal_pending`', async () => {
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
    const res = await w.pa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`, payload: {},
    });
    expectWaits(res, 'closure');
  });

  it('5/5 — the Super Admin\'s escalation decision (→ `decideEscalatedClosure` via `translateClosureError`) → 409 `closure.suspicion_appeal_pending`', async () => {
    const w = await returned('staff');
    await inScope(w.pariwarId, (s) =>
      claim.escalateStaffCase(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId),
        now: new Date(`${cycleCalendar.addCalendarDays(w.day0, 90)}T04:30:00.000Z`),
      }),
    );
    const sa = await staff(w.pariwarId, 'super_admin');
    const res = await sa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation/decision`,
      payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.' },
    });
    expectWaits(res, 'closure');
  });

  // ── AC2b — the 90 days, the helpline appeal screen, the reason lock ───────────────────────────────────────────────
  it('the on-behalf initiation of a `-239` refusal past its 90 days → 409 `appeal.suspicion_refusal_time_limit_passed` `{ appeal_until }` (⛔ not a 500); another reason past 90 days is initiable', async () => {
    const w = await seedWorld();
    const refusedAt = new Date(Date.now() - 100 * DAY);
    const old239 = await refuseSibling(w, { decidedAt: refusedAt });
    const oldOther = await refuseSibling(w, { reason: 'other', decidedAt: new Date(Date.now() - 400 * DAY) });
    const op = await staff(w.pariwarId, 'helpline_operator');
    const refused = await op.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, old239)}/appeal`, payload: {} });
    expect(refused.statusCode, refused.body).toBe(409);
    expect(errOf(refused.body)).toMatchObject({
      code: 'appeal.suspicion_refusal_time_limit_passed',
      details: { appeal_until: claim.suspicionRefusalAppealUntil(refusedAt) },
    });
    const ok = await op.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, oldOther)}/appeal`, payload: {} });
    expect(ok.statusCode, ok.body).toBe(201);
  });

  it('⭐ the helpline appeal screen — an operator holding ONLY `claim.file` reads the member\'s refused claims (the `-239` date) and files an appeal for the family', async () => {
    const w = await seedWorld();
    // ONE instant for the refusal AND the expected date — two `new Date()` reads straddling 00:00 IST disagreed (code
    // review round 2).
    const recentAt = new Date();
    const recent = await refuseSibling(w, { decidedAt: recentAt });
    const expired = await refuseSibling(w, { decidedAt: new Date(Date.now() - 100 * DAY) });
    const other = await refuseSibling(w, { reason: 'other' });
    const op = await staff(w.pariwarId, 'helpline_operator');
    const url = `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/appeals`;
    const read = async () => (await op.client.inject({ method: 'GET', url })).json() as { claims: Json[] };
    const before = await read();
    const byId = (rows: Json[], id: string) => rows.find((c) => c['claim_case_id'] === id);
    expect(byId(before.claims, recent)).toMatchObject({ eligibility: 'can_appeal', appeal_until: claim.suspicionRefusalAppealUntil(recentAt) });
    expect(byId(before.claims, expired)).toMatchObject({ eligibility: 'time_limit_passed' });
    expect(byId(before.claims, other)).toMatchObject({ eligibility: 'can_appeal', appeal_until: null });
    expect(byId(before.claims, w.claimCaseId)).toBeUndefined(); // R is ⛔ not refused
    const filed = await op.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, recent)}/appeal`, payload: {} });
    expect(filed.statusCode, filed.body).toBe(201);
    expect(byId((await read()).claims, recent)).toMatchObject({ eligibility: 'under_appeal' });
    // A role WITHOUT `claim.file` is refused the read (⛔ not an empty 200).
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await da.client.inject({ method: 'GET', url })).statusCode).toBe(403);
  });

  it('⛔ CROSS-PARIWAR (family 3) — a `claim.file` operator of ANOTHER Pariwar is refused the read and the filing, and ⛔ nothing is written', async () => {
    const w = await seedWorld();
    const s = await refuseSibling(w);
    const otherPariwar = randomUUID();
    const op = await staff(otherPariwar, 'helpline_operator');
    const read = await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/appeals` });
    expect([401, 403, 404], read.body).toContain(read.statusCode);
    const file = await op.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, s)}/appeal`, payload: {} });
    expect([401, 403, 404], file.body).toContain(file.statusCode);
    const { rows } = await td.pool.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [s]);
    expect(rows[0]).toEqual({ current_state: 'denied' });
    expect((await td.pool.query(`SELECT 1 FROM claim_appeals WHERE claim_case_id = $1`, [s])).rowCount).toBe(0);
  });

  it('RF6 — a held claim the reversal can ⛔ not close (already `state_trustee_approved` — `-294` §2 (a)) is RECORDED in the stage-1 audit line, ⛔ never silently (family 8)', async () => {
    const w = await seedWorld();
    // H — past its final vote BEFORE S stands (the `-294` §2 (a) shape), through events.
    await inScope(w.pariwarId, async (sc) => {
      const emit = emitter(sc, w.pariwarId, w.memberId, w.claimCaseId);
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit('state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
    });
    const s = await refuseSibling(w);
    await td.pool.query(
      `INSERT INTO pariwar_appeal_config (pariwar_id, legal_review_status) VALUES ($1, 'cleared')
         ON CONFLICT (pariwar_id) DO UPDATE SET legal_review_status = 'cleared'`,
      [w.pariwarId],
    );
    const op = await staff(w.pariwarId, 'helpline_operator');
    const filed = await op.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, s)}/appeal`, payload: {} });
    expect(filed.statusCode, filed.body).toBe(201);
    const reviewer = await staff(w.pariwarId, 'district_admin');
    td.auditSink.events.length = 0;
    const reversed = await reviewer.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, s)}/appeal/stage1`,
      payload: { decision: 'reversed', rationale: 'Reconsidered on the merits.', disposition_category: 'reconsideration_on_merits' },
    });
    expect(reversed.statusCode, reversed.body).toBe(201);
    const line = td.auditSink.ofType('admin_appeal.stage1').at(-1);
    expect(line?.context).toMatchObject({
      claim_case_id: s,
      reversed: true,
      held_claims_closed: [],
      held_claims_not_closed: [{ claim_case_id: w.claimCaseId, state: 'state_trustee_approved' }],
    });
    // H is ⛔ not moved.
    expect((await td.pool.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [w.claimCaseId])).rows[0]).toEqual({ current_state: 'state_trustee_approved' });
  });

  it('RF13 — the District Admin\'s revision of S OFF `-239` while R is open → 409 `verifier_decision.suspicion_reason_locked`', async () => {
    const w = await seedWorld();
    const s = await refuseSibling(w);
    const da = await staff(w.pariwarId, 'district_admin');
    await stepUp(da, 'claim_decision_revise');
    const res = await da.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, s)}/verifier-decision/revise`,
      payload: { outcome: 'denied', reason_code: 'other', rationale: 'A different reason.' },
    });
    expect(res.statusCode, res.body).toBe(409);
    expect(errOf(res.body)).toMatchObject({ code: 'verifier_decision.suspicion_reason_locked', details: { held_claim_reference: claim.claimShortReference(w.claimCaseId) } });
  });

  // ── AC1 — the F1 swallow, over HTTP ────────────────────────────────────────────────────────────────────────────
  it('⭐ F1 — a SAME-channel refile (helpline → helpline) while S stands under appeal MINTS a new claim (`created: true`), ⛔ never S', async () => {
    const w = await seedWorld();
    const s = await refuseSibling(w);
    // R is gone from the picture: close it out of the death's candidates by making S the only live claim — S is
    // appealed (live), R is refused for another reason (terminal).
    await inScope(w.pariwarId, async (sc) => {
      await claim.initiateAppeal(sc.client, { claimCaseId: ids.claimId(s), pariwarId: ids.pariwarId(w.pariwarId), initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
      const emit = emitter(sc, w.pariwarId, w.memberId, w.claimCaseId);
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
    });
    const op = await staff(w.pariwarId, 'helpline_operator');
    await stepUp(op, 'claim_file');
    const res = await op.client.inject({
      method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/claims/intake`,
      payload: { deceasedMemberId: w.memberId, relationship: 'spouse', identityReadBackConfirmed: true, lookupMethod: 'mobile' },
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { claimCaseId: string; created: boolean };
    expect(body.created).toBe(true);
    expect(body.claimCaseId).not.toBe(s);
  });

  // ── AC8 — what people see ───────────────────────────────────────────────────────────────────────────────────────
  function ctxOf(s: Awaited<ReturnType<typeof openScopeTx>>, pariwarId: string, claimCaseId: string): VerifierConsoleContext {
    return {
      db: s.tx, client: s.client, pariwarId, claimCaseId, district: DISTRICT, actorId: randomUUID(),
      grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }], traceId: null,
    };
  }

  it('the console — R is KEPT APART (S by reference only) and its final approval waits `appeal_not_filed`; S itself shows nothing; the ceiling is 21', async () => {
    expect(VERIFIER_CONSOLE_MAX_READS).toBe(21);
    const w = await seedWorld();
    const refusedAt = new Date(); // ONE instant for the seed and the expectation (code review round 2 — 00:00 IST)
    const s = await refuseSibling(w, { decidedAt: refusedAt });
    const { packet, readCount } = await inScope(w.pariwarId, (sc) => assembleVerifierConsole(deps, ctxOf(sc, w.pariwarId, w.claimCaseId)));
    expect(packet.suspicionRefusal).toEqual({
      available: true,
      keptApartFrom: [{ reference: claim.claimShortReference(s), appeal: 'not_filed', appealUntil: claim.suspicionRefusalAppealUntil(refusedAt) }],
      finalApprovalWaits: 'appeal_not_filed',
    });
    expect(readCount).toBeLessThanOrEqual(VERIFIER_CONSOLE_MAX_READS);
    expect(JSON.stringify(packet.suspicionRefusal)).not.toContain(s); // the reference only, ⛔ not the full id
    const own = await inScope(w.pariwarId, (sc) => assembleVerifierConsole(deps, ctxOf(sc, w.pariwarId, s)));
    expect(own.packet.suspicionRefusal).toEqual({ available: true, keptApartFrom: [], finalApprovalWaits: null });
  });

  it('the console section books EXACTLY one read (+ its SAVEPOINT); a FAILED read says "could not be checked" and ⛔ never aborts the scope tx', async () => {
    const w = await seedWorld();
    await refuseSibling(w);
    await inScope(w.pariwarId, async (sc) => {
      const statements: string[] = [];
      const client = sc.client as unknown as { query: (...a: unknown[]) => unknown };
      const realQuery = client.query.bind(client);
      client.query = (...args: unknown[]) => {
        const first = args[0] as string | { text: string };
        statements.push(typeof first === 'string' ? first : first.text);
        return realQuery(...args);
      };
      try {
        let booked = 0;
        await assembleSuspicionRefusal(ctxOf(sc, w.pariwarId, w.claimCaseId), ids.claimId(w.claimCaseId), ids.memberId(w.memberId), { bump: () => (booked += 1) });
        expect(booked).toBe(1);
        expect(statements.filter((t) => /^SAVEPOINT console_suspicion_refusal$/.test(t))).toHaveLength(1);
      } finally {
        client.query = realQuery as never;
      }
    });
    fault.on = true;
    try {
      const { packet } = await inScope(w.pariwarId, (sc) => assembleVerifierConsole(deps, ctxOf(sc, w.pariwarId, w.claimCaseId)));
      expect(packet.suspicionRefusal).toEqual({ available: false, keptApartFrom: [], finalApprovalWaits: null });
      expect(packet.approvalWarnings.available).toBe(true); // read AFTER it — the scope tx survived
    } finally {
      fault.on = false;
    }
  });

  it('the member entry read — `claim_live` is FALSE for a pointer claim on which S stands (the wizard is reachable); `claim_closed` on a CLOSED claim; the helpline read-back lists the closed claim', async () => {
    const w = await seedWorld();
    const s = await refuseSibling(w);
    const memberClient = () => {
      const tok = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
      const c = makeClient(app);
      return (claimCaseId: string) => c.inject({ method: 'GET', url: `/api/v1/member/claims/${claimCaseId}/death-certificate`, headers: { authorization: `Bearer ${tok}` } });
    };
    // S under appeal is non-terminal, yet its refusal STANDS ⇒ ⛔ not live for the entry gate.
    await inScope(w.pariwarId, (sc) =>
      claim.initiateAppeal(sc.client, { claimCaseId: ids.claimId(s), pariwarId: ids.pariwarId(w.pariwarId), initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }),
    );
    const standing = (await memberClient()(s)).json() as Json;
    expect(standing).toMatchObject({ claim_live: false, claim_closed: false });
    // S's appeal ALLOWED ⇒ R is closed ⇒ R's read carries `claim_closed` and the `closed` status.
    await inScope(w.pariwarId, (sc) =>
      claim.reviewAppealStage1(sc.client, {
        claimCaseId: ids.claimId(s), pariwarId: ids.pariwarId(w.pariwarId), decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
        reviewerActorId: randomUUID(), reviewerDisplay: 'Another District Admin', rationaleCiphertext: claim.prepareAppealCiphertext('enc:v1:x'), actor: 'operator',
      }),
    );
    const closed = (await memberClient()(w.claimCaseId)).json() as Json;
    expect(closed).toMatchObject({ status: 'closed', claim_live: false, claim_closed: true });
    // S is reversed (live, no longer standing) ⇒ live again for the entry gate.
    expect(((await memberClient()(s)).json() as Json)['claim_live']).toBe(true);
    const op = await staff(w.pariwarId, 'helpline_operator');
    const list = (await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/death-certificate/claims` })).json() as { claims: Json[] };
    expect(list.claims.find((c) => c['claim_case_id'] === w.claimCaseId)).toMatchObject({ claim_state: 'closed', status: 'closed', upload_allowed: false });
  });
});
