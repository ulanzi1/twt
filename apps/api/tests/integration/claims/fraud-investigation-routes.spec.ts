// Story 6.22 — the fraud register's investigation over HTTP (Task 4.4): AC3 (the flag + the helpline's list + the Q7 HTTP
// twin), AC4 (the finding: refusals, step-up, the release proven on a real lock route, the approved claim), AC10 (the
// override door's 409s), AC12 (audits — ⛔ note in any context), AC13 (the console read's uniform withholding, the
// work-list's district scope, `closed_member_alive` on the helpline read). Code review round 2: a finding refused AFTER its
// writes leaves nothing (R2-1), `closed_member_alive` on the nominee-refusals and helpline-appeal lists (R2-2), the work-list's
// `is_flagger` (R2-6). Live DB.
//
// Members are seeded through REAL events (`seedLifecycleMember` — TR3); claims through the projector (⛔ `forceClaimState` —
// the finding's replay would reset it).

import { randomUUID } from 'node:crypto';

import { FRAUD_FINDING_STEP_UP_CONTEXT } from '@twt/contracts';
import { claim, ids, member as memberDomain, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { buildServer } from '../../../src/server.js';
import { encryptFraudInvestigationNote } from '../../../src/modules/claims/fraud-investigation-crypto.js';
import { fileClaim, inScope, seedLifecycleMember } from '../_death-report-fixture.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';
import type { CapturingStepUpDelivery } from '../_setup.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const FLAG_NOTE = 'ZZ-FLAG-NOTE-PLAINTEXT';
const FINDING_NOTE = 'ZZ-FINDING-NOTE-PLAINTEXT';

describe.skipIf(!hasDatabase)('Story 6.22 — the fraud investigation routes (live DB)', { timeout: 60000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
    await app.ready();
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

  /** `displayName === null` ⇒ an admin with NO `users.display_name` (the attribution snapshot cannot be resolved — family 8). */
  async function authenticate(displayName: string | null): Promise<{ client: Client; userId: string }> {
    const email = `fi-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    if (displayName !== null) await service.setAdminDisplayName(deps, userId, displayName);
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

  type Role = 'helpline_operator' | 'district_admin' | 'verifier' | 'pariwar_admin' | 'super_admin';
  type Staff = { client: Client; userId: string };

  /** A staff member holding `roles` (several ⇒ one PERSON granted each) in the world's Pariwar / district. */
  async function staff(w: World, roles: readonly Role[], district = w.district, displayName?: string | null): Promise<Staff> {
    const a = await authenticate(displayName === undefined ? `${roles.join('+')} ${randomUUID().slice(0, 4)}` : displayName);
    for (const role of roles) {
      const [dim, value] =
        role === 'district_admin' || role === 'verifier' ? ['district', district] : role === 'super_admin' ? ['global', null] : ['pariwar', w.pariwarId];
      await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
        a.userId, w.pariwarId, role, dim, value,
      ]);
    }
    await a.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId: w.pariwarId } });
    return a;
  }

  async function stepUp(a: Staff, actionContext: string): Promise<void> {
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } })).statusCode).toBe(200);
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } })).statusCode).toBe(200);
  }

  /** An `active` member (real events) with a posting district (unless `posted: false`) and ONE claim in `intake_pending`. */
  async function world(opts: { posted?: boolean; pariwarId?: string } = {}) {
    const district = `D-${randomUUID().slice(0, 8)}`;
    const { memberId, pariwarId } = await seedLifecycleMember(td, opts.pariwarId !== undefined ? { pariwarId: opts.pariwarId } : {});
    if (opts.posted !== false) {
      await td.pool.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, district],
      );
    }
    const claimCaseId = await fileClaim(td, pariwarId, memberId);
    return { pariwarId, district, memberId, claimCaseId };
  }
  type World = Awaited<ReturnType<typeof world>>;

  /** Append raw lifecycle events to a claim (the projector — ⛔ a forced state). */
  async function drive(w: World, claimCaseId: string, steps: readonly [string, string, string, Json?][]): Promise<void> {
    await inScope(td, w.pariwarId, async (s) => {
      for (const [from, to, eventType, extra] of steps) {
        await claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          deceasedMemberId: ids.memberId(w.memberId),
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...(extra ?? {}) } as never,
          actorId: null,
        });
      }
    });
  }
  const TO_REVIEW: [string, string, string, Json?][] = [
    ['intake_pending', 'intake_converged', 'claim.intake_converged'],
    ['intake_converged', 'documents_pending', 'claim.documents_received'],
    ['documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 }],
    ['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing'],
  ];
  const TO_APPROVED: [string, string, string, Json?][] = [
    ...TO_REVIEW,
    ['verifier_review', 'verifier_approved', 'claim.verifier_approved'],
    ['verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen'],
    ['state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved'],
    ['state_trustee_approved', 'approved', 'claim.approved'],
  ];

  const claimUrl = (w: World, cid = w.claimCaseId) => `/api/v1/p/${w.pariwarId}/admin/claims/${cid}`;
  const flagUrl = (w: World, cid = w.claimCaseId) => `${claimUrl(w, cid)}/fraud-investigation/flag`;
  const findUrl = (w: World, cid = w.claimCaseId) => `${claimUrl(w, cid)}/fraud-investigation/finding`;
  const consoleUrl = (w: World, cid = w.claimCaseId) => `${claimUrl(w, cid)}/fraud-investigation`;
  const memberListUrl = (w: World) => `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/fraud-investigation/claims`;
  const workListUrl = (w: World) => `/api/v1/p/${w.pariwarId}/admin/fraud-investigations`;
  const stepRows = async (cid: string) => (await td.pool.query<{ step: string }>('SELECT step FROM claim_fraud_investigation_steps WHERE claim_case_id = $1 ORDER BY acted_at', [cid])).rows.map((r) => r.step);
  const flagOf = (a: Staff, w: World, body: Json = {}, cid = w.claimCaseId) =>
    a.client.inject({ method: 'POST', url: `${claimUrl(w, cid)}/fraud-investigation/flag`, payload: { step_id: randomUUID(), note: FLAG_NOTE, ...body } });
  const findOf = (a: Staff, w: World, body: Json = {}, cid = w.claimCaseId) =>
    a.client.inject({
      method: 'POST',
      url: `${claimUrl(w, cid)}/fraud-investigation/finding`,
      payload: { step_id: randomUUID(), finding_id: randomUUID(), outcome: 'innocent', alive_confirmation: 'in_person', note: FINDING_NOTE, ...body },
    });
  const errCode = (res: { json(): unknown }) => String(((res.json() as Json).error as Json | undefined)?.code);
  const stateOf = async (cid: string) => (await td.pool.query<{ s: string }>('SELECT current_state::text AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]?.s;
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.claim_case_id === claimCaseId.toLowerCase());

  describe('AC3 — the flag and the helpline\'s list', () => {
    it('the operator lists EVERY claim naming the member (a denied and a settled one too), flags one (201, ⛔ state change), replays (200), and a second flag is 409', async () => {
      const w = await world();
      const denied = await fileClaim(td, w.pariwarId, w.memberId);
      await drive(w, denied, [...TO_REVIEW, ['verifier_review', 'denied', 'claim.verifier_denied', { actor: 'operator' }]]);
      const settled = await fileClaim(td, w.pariwarId, w.memberId);
      await drive(w, settled, [...TO_APPROVED, ['approved', 'settled', 'claim.settled', { deceased_member_id: w.memberId }]]);
      const op = await staff(w, ['helpline_operator']);

      const list = await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/fraud-investigation/claims` });
      expect(list.statusCode).toBe(200);
      const claims = (list.json() as { claims: Json[] }).claims;
      expect(claims.map((c) => c.claim_case_id).sort()).toEqual([w.claimCaseId, denied, settled].sort());
      expect(Object.fromEntries(claims.map((c) => [c.claim_case_id, c.claim_state]))).toMatchObject({ [denied]: 'denied', [settled]: 'settled' });
      for (const c of claims) expect(Object.keys(c).sort()).toEqual(['claim_case_id', 'claim_state', 'filed_at', 'investigation']);

      const stepId = randomUUID();
      const first = await flagOf(op, w, { step_id: stepId }, denied);
      expect(first.statusCode).toBe(201);
      expect(first.json()).toMatchObject({ step_id: stepId, claim_state: 'denied', replayed: false });
      expect(await stateOf(denied)).toBe('denied');
      const again = await flagOf(op, w, { step_id: stepId }, denied);
      expect(again.statusCode).toBe(200);
      expect(again.json()).toMatchObject({ replayed: true });
      const events = await td.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.fraud_flagged'`, [denied]);
      expect(events.rowCount).toBe(1);
      const other = await flagOf(op, w, {}, denied);
      expect(other.statusCode).toBe(409);
      expect(errCode(other)).toBe('fraud_investigation.already_flagged');
      expect(auditsFor('admin_claim.fraud_flag_rejected', denied).map((e) => (e.context as Json).reason)).toEqual(['already_flagged']);

      const after = await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/fraud-investigation/claims` });
      const byId = Object.fromEntries((after.json() as { claims: Json[] }).claims.map((c) => [c.claim_case_id, c.investigation]));
      expect(byId).toMatchObject({ [denied]: 'flagged', [settled]: 'none' });
    });

    it('a District Admin, a verifier and a Pariwar Admin cannot flag (403); an empty note is 400 and audited; a member with ⛔ posting CAN be flagged', async () => {
      const w = await world({ posted: false });
      for (const roles of [['district_admin'], ['verifier'], ['pariwar_admin']] as const) {
        const a = await staff(w, roles);
        const res = await flagOf(a, w);
        expect(res.statusCode, roles[0]).toBe(403);
        // R2-13 (b) — the CODE too (the RB1 one-code block's), so a 403 of another kind (CSRF, a step-up) cannot pass for it.
        expect(errCode(res), roles[0]).toBe('authz.forbidden');
      }
      expect(await stepRows(w.claimCaseId)).toEqual([]);
      const op = await staff(w, ['helpline_operator']);
      const empty = await flagOf(op, w, { note: '   ' });
      expect(empty.statusCode).toBe(400);
      expect(errCode(empty)).toBe('fraud_investigation.missing_note');
      expect(auditsFor('admin_claim.fraud_flag_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['missing_note']);
      expect((await flagOf(op, w)).statusCode).toBe(201);
    });
  });

  describe('AC3 — PQ7 (built C), the HTTP twin', () => {
    /** A fully approvable claim at `verification_in_progress` — `ground-inspection-required-routes.spec.ts`'s seed, copied. */
    async function approvableWorld(): Promise<World> {
      const w = await world();
      const pid = ids.pariwarId(w.pariwarId);
      const mid = ids.memberId(w.memberId);
      await inScope(td, w.pariwarId, async (s) => {
        const row = { rank: 1 as const, splitPct: 100 as const, relationship: 'spouse', nameCiphertext: 'enc:v1:n', mobileCiphertext: 'enc:v1:m', addressCiphertext: null };
        await nominee.replaceMemberNominees(s.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
        await nominee.appendMemberDeclarationVersions(s.tx, {
          memberId: mid, pariwarId: pid, plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(s.tx, pid, mid), [1]),
          nominees: [row], recordedAt: new Date(Date.now() - 400 * 86_400_000), eventVersion: null,
        });
      });
      await drive(w, w.claimCaseId, TO_REVIEW.slice(0, 3));
      await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId);
      return w;
    }

    it('⭐ a FLAGGED claim with ⛔ finding is still approved by the District Admin AND passes the final vote (a ruling of A or B flips this)', async () => {
      const w = await approvableWorld();
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      const approve = await da.client.inject({
        method: 'POST', url: `${claimUrl(w)}/verifier-decision`, payload: { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' },
      });
      expect(approve.statusCode, approve.body).toBe(201);
      const pa = await staff(w, ['pariwar_admin']);
      const vote = await pa.client.inject({
        method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, action: 'approve' },
      });
      expect(vote.statusCode, vote.body).toBeLessThan(300);
      expect(await stateOf(w.claimCaseId)).toBe('state_trustee_approved');
    });
  });

  describe('AC4 — the finding', () => {
    it('step-up first (⛔ written without it); un-flagged ⇒ 409; ⛔ proof of life / ⛔ note ⇒ 400; the flagger (one person with BOTH roles) ⇒ 409', async () => {
      const w = await world();
      // `not_flagged` needs a claim nobody flagged — a second claim of the SAME death (the same district, so the refusal is
      // the chain's, ⛔ the district gate's).
      const unflagged = await fileClaim(td, w.pariwarId, w.memberId);
      const both = await staff(w, ['helpline_operator', 'district_admin']);
      expect((await flagOf(both, w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      // R2-13 (c) — on a FLAGGED claim that this District Admin COULD find (⛔ the flagger), so "⛔ written" below can fail:
      // without the step-up gate this request would write the finding, the release and the found step.
      const noStep = await findOf(da, w);
      expect(noStep.statusCode).toBe(403);
      expect(errCode(noStep)).toBe('auth.step_up_required');
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged']);
      expect((await td.pool.query('SELECT 1 FROM claim_nominee_findings WHERE claim_case_id = $1', [w.claimCaseId])).rowCount).toBe(0);
      expect(await stateOf(w.claimCaseId)).toBe('intake_pending');
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect(errCode(await findOf(da, w, {}, unflagged))).toBe('fraud_investigation.not_flagged');
      expect(auditsFor('admin_claim.fraud_finding_rejected', unflagged).map((e) => (e.context as Json).reason)).toEqual(['not_flagged']);
      await stepUp(both, FRAUD_FINDING_STEP_UP_CONTEXT);
      const self = await findOf(both, w);
      expect(self.statusCode).toBe(409);
      expect(errCode(self)).toBe('fraud_investigation.finder_is_flagger');
      const noProof = await findOf(da, w, { alive_confirmation: undefined });
      expect(noProof.statusCode).toBe(400);
      expect(errCode(noProof)).toBe('fraud_investigation.missing_alive_confirmation');
      expect(errCode(await findOf(da, w, { note: '' }))).toBe('fraud_investigation.missing_note');
      const steps = await td.pool.query('SELECT step FROM claim_fraud_investigation_steps WHERE claim_case_id = $1', [w.claimCaseId]);
      expect(steps.rows.map((r) => r.step)).toEqual(['flagged']);
      expect(auditsFor('admin_claim.fraud_finding_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(
        expect.arrayContaining(['finder_is_flagger', 'missing_alive_confirmation', 'missing_note']),
      );
    });

    it('a Super Admin who flagged cannot find it (409 — they hold both keys)', async () => {
      const w = await world();
      const sa = await staff(w, ['super_admin']);
      expect((await flagOf(sa, w)).statusCode).toBe(201);
      await stepUp(sa, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect(errCode(await findOf(sa, w))).toBe('fraud_investigation.finder_is_flagger');
    });

    it('a member with ⛔ posting: the finding is 403 for the District Admin AND the Super Admin (G7 — a recorded residual)', async () => {
      const w = await world({ posted: false });
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      for (const roles of [['district_admin'], ['super_admin']] as const) {
        const a = await staff(w, roles);
        // The step-up is DONE (⛔ swallowed), so the refusal below cannot be the missing step-up: it is the null district.
        await stepUp(a, FRAUD_FINDING_STEP_UP_CONTEXT);
        const res = await findOf(a, w);
        expect(res.statusCode, roles[0]).toBe(403);
        expect(errCode(res), roles[0]).not.toBe('auth.step_up_required');
        expect(await stepRows(w.claimCaseId), roles[0]).toEqual(['flagged']);
      }
    });

    it('⭐ innocent: 201, the claim CLOSED, and the member RELEASED — erasure now meets its ordinary rule (rtbf.invalid_state), ⛔ rtbf.death_reported', async () => {
      const w = await world();
      const memberToken = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
      const erase = async () => {
        await memberAuthRepo.insertElevation(deps.pool, { memberId: w.memberId, actionContext: 'rtbf', elevatedUntil: new Date(Date.now() + 5 * 60 * 1000) });
        const res = await app.inject({ method: 'POST', url: '/api/v1/member/rtbf', payload: {}, headers: { origin: 'http://localhost:3001', authorization: `Bearer ${memberToken}` } });
        return errCode(res);
      };
      expect(await erase()).toBe('rtbf.death_reported');
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const res = await findOf(da, w, { alive_confirmation: 'video_call' });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ outcome: 'innocent', closed: true, not_closed_reason: null, other_standing_claims: [], replayed: false });
      expect(await stateOf(w.claimCaseId)).toBe('closed');
      expect(await erase()).toBe('rtbf.invalid_state'); // TR1 — released ≠ erasable: an `active` member's ordinary refusal
      const overlay = await inScope(td, w.pariwarId, (s) => memberDomain.getMemberAccountOverlay(s.tx, ids.memberId(w.memberId), new Date()));
      expect(overlay.accountFrozen).toBe(false);

      // AC12 — the recorded audit carries ids, the outcome and the proof of life — ⛔ the note.
      const [recorded] = auditsFor('admin_claim.fraud_finding_recorded', w.claimCaseId);
      expect(recorded?.context).toMatchObject({ outcome: 'innocent', alive_confirmation: 'video_call', closed: true });
      const allContexts = JSON.stringify(td.auditSink.events.map((e) => e.context));
      expect(allContexts).not.toContain(FINDING_NOTE);
      expect(allContexts).not.toContain(FLAG_NOTE);

      // AC13 — the helpline's claim read now labels the closed claim `closed_member_alive`.
      const op = await staff(w, ['helpline_operator']);
      const helpline = await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/death-certificate/claims` });
      expect(helpline.statusCode).toBe(200);
      const row = (helpline.json() as { claims: Json[] }).claims.find((c) => c.claim_case_id === w.claimCaseId);
      expect(row).toMatchObject({ closed_member_alive: true });
    });

    it('an `approved` claim: 201, ⛔ closed (`committed`); a SECOND standing claim is listed and keeps the member locked', async () => {
      const w = await world();
      await drive(w, w.claimCaseId, TO_APPROVED);
      const second = await fileClaim(td, w.pariwarId, w.memberId);
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const res = await findOf(da, w);
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ closed: false, not_closed_reason: 'committed' });
      expect((res.json() as { other_standing_claims: Json[] }).other_standing_claims.map((c) => c.claim_case_id)).toEqual([second]);
      expect(await stateOf(w.claimCaseId)).toBe('approved');
    });
  });

  describe('AC13 — the console read and the work-list', () => {
    it('the notes are WITHHELD uniformly for a verifier; a District Admin reads them (audited) and is told they may record the finding', async () => {
      const w = await world();
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const url = `${claimUrl(w)}/fraud-investigation`;
      const verifier = await staff(w, ['verifier']);
      const v = await verifier.client.inject({ method: 'GET', url });
      expect(v.statusCode).toBe(200);
      expect(v.json()).toMatchObject({ steps: [{ step: 'flagged', note: { state: 'withheld' } }], viewer: { can_record_finding: false } });
      expect(auditsFor('admin_claim.fraud_notes_read', w.claimCaseId)).toHaveLength(0);
      const da = await staff(w, ['district_admin']);
      const d = await da.client.inject({ method: 'GET', url });
      expect(d.json()).toMatchObject({ steps: [{ note: { state: 'readable', value: FLAG_NOTE } }], viewer: { can_record_finding: true, is_flagger: false } });
      expect(auditsFor('admin_claim.fraud_notes_read', w.claimCaseId)).toHaveLength(1);
      expect(JSON.stringify(auditsFor('admin_claim.fraud_notes_read', w.claimCaseId))).not.toContain(FLAG_NOTE);
    });

    it('the work-list shows a flagged, un-found claim in the District Admin\'s district — and ⛔ one in another district', async () => {
      const w = await world();
      const elsewhere = await world({ pariwarId: w.pariwarId });
      const op = await staff(w, ['helpline_operator']);
      expect((await flagOf(op, w)).statusCode).toBe(201);
      expect((await flagOf(op, elsewhere)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      const res = await da.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/fraud-investigations` });
      expect(res.statusCode).toBe(200);
      const items = (res.json() as { items: Json[] }).items.map((i) => i.claim_case_id);
      expect(items).toContain(w.claimCaseId);
      expect(items).not.toContain(elsewhere.claimCaseId);
      expect((await (await staff(w, ['helpline_operator'])).client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/fraud-investigations` })).statusCode).toBe(403);
    });

    it('⭐ R2-6 — a row the VIEWER flagged says `is_flagger: true` and is ⛔ hidden (a Super Admin holds both keys); another District Admin reads `false`', async () => {
      const w = await world();
      const sa = await staff(w, ['super_admin']);
      expect((await flagOf(sa, w)).statusCode).toBe(201);
      const rowFor = async (who: Staff) => {
        const res = await who.client.inject({ method: 'GET', url: workListUrl(w) });
        expect(res.statusCode).toBe(200);
        return (res.json() as { items: Json[] }).items.find((i) => i.claim_case_id === w.claimCaseId);
      };
      const own = await rowFor(sa);
      expect(own).toMatchObject({ is_flagger: true }); // listed — ⛔ dropped — and labelled
      expect(Object.keys(own!).sort()).toEqual(['claim_case_id', 'claim_filed_at', 'claim_state', 'flagged_at', 'is_flagger']);
      expect(await rowFor(await staff(w, ['district_admin']))).toMatchObject({ is_flagger: false });
      // The label tells the truth: the flagger's finding IS refused, the other District Admin's is not.
      await stepUp(sa, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect(errCode(await findOf(sa, w))).toBe('fraud_investigation.finder_is_flagger');
    });
  });

  describe('AC10 — the override door over HTTP', () => {
    it('an override onto a claim a finding CLOSED is 409 `convergence.against_claim_closed` (⛔ a 500)', async () => {
      const w = await world();
      const pending = await inScope(td, w.pariwarId, (s) =>
        claim.tryConverge(s.client, {
          pariwarId: ids.pariwarId(w.pariwarId), deceasedMemberId: ids.memberId(w.memberId), intakeChannel: 'member_app', actor: 'member',
          claimantActorId: null, trigger: 'seed', actorId: null, auditId: randomUUID(),
        }),
      );
      expect(pending.convergencePending).toBe(true);
      const op = await staff(w, ['helpline_operator']);
      expect((await flagOf(op, w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect((await findOf(da, w)).statusCode).toBe(201);
      await stepUp(op, 'claim_file');
      const res = await op.client.inject({
        method: 'POST',
        url: `/api/v1/p/${w.pariwarId}/admin/claims/convergence/override`,
        payload: { intakeAttemptId: pending.intakeAttemptId, againstClaimCaseId: w.claimCaseId, reason: 'a separate case, confirmed by phone' },
      });
      expect(res.statusCode).toBe(409);
      expect(errCode(res)).toBe('convergence.against_claim_closed');
    });
  });

  // ── Code review 2026-11-02, chunk B — RB1: access ─────────────────────────────────────────────────────────────────────
  describe('RB1 — access: the layers that guard the five routes', () => {
    /** One request per route, each with a body that would be VALID — so a refusal is the guard's, ⛔ the schema's. */
    const fiveRoutes = (w: World): [string, string, Json?][] => [
      ['POST', flagUrl(w), { step_id: randomUUID(), note: FLAG_NOTE }],
      ['POST', findUrl(w), { step_id: randomUUID(), finding_id: randomUUID(), outcome: 'innocent', alive_confirmation: 'in_person', note: FINDING_NOTE }],
      ['GET', consoleUrl(w)],
      ['GET', memberListUrl(w)],
      ['GET', workListUrl(w)],
    ];

    it('⭐ WITHOUT a session every route is 401', async () => {
      const w = await world();
      const anonymous = makeClient(app);
      for (const [method, url, payload] of fiveRoutes(w)) {
        const res = await anonymous.inject({ method: method as 'GET' | 'POST', url, ...(payload ? { payload } : {}) });
        expect(res.statusCode, `${method} ${url}`).toBe(401);
      }
      expect(await stepRows(w.claimCaseId)).toEqual([]);
    });

    it('⭐ a TAMPERED session naming a non-human actor is EXACTLY 404 on every route (⛔ a write), with a positive control', async () => {
      const w = await world();
      const both = await staff(w, ['helpline_operator', 'district_admin']);
      // POSITIVE CONTROL first — the untampered session reaches the three reads.
      for (const url of [consoleUrl(w), memberListUrl(w), workListUrl(w)]) {
        expect((await both.client.inject({ method: 'GET', url })).statusCode, url).toBe(200);
      }
      await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE sess ->> 'userId' = $2`, [randomUUID(), both.userId]);
      for (const [method, url, payload] of fiveRoutes(w)) {
        const res = await both.client.inject({ method: method as 'GET' | 'POST', url, ...(payload ? { payload } : {}) });
        expect(res.statusCode, `${method} ${url}`).toBe(404);
      }
      expect(await stepRows(w.claimCaseId)).toEqual([]);
    });

    it('⭐ WITHOUT the key: every other role is 403 (one code, ⛔ a write) — a verifier cannot flag, find, or list; an operator cannot read the console; a District Admin cannot flag or list', async () => {
      const w = await world();
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201); // so a finding has something to refuse about
      const op = await staff(w, ['helpline_operator']);
      const da = await staff(w, ['district_admin']);
      const verifier = await staff(w, ['verifier']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      await stepUp(verifier, FRAUD_FINDING_STEP_UP_CONTEXT);
      const [flag, find, consoleRead, list, work] = fiveRoutes(w);
      const attempts: [string, Staff, [string, string, Json?]][] = [
        ['operator → console', op, consoleRead!],
        ['operator → finding', op, find!],
        ['district admin → flag', da, flag!],
        ['district admin → member list', da, list!],
        ['verifier → flag', verifier, flag!],
        ['verifier → finding', verifier, find!],
        ['verifier → member list', verifier, list!],
        ['verifier → work-list', verifier, work!],
      ];
      const codes = new Set<string>();
      for (const [label, who, [method, url, payload]] of attempts) {
        const res = await who.client.inject({ method: method as 'GET' | 'POST', url, ...(payload ? { payload } : {}) });
        expect(res.statusCode, label).toBe(403);
        codes.add(errCode(res));
      }
      expect([...codes], 'one denial code, ⛔ a step-up or schema refusal in disguise').toHaveLength(1);
      expect([...codes][0]).not.toBe('auth.step_up_required');
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged']);
    });

    it('⭐ CROSS-DISTRICT: a District Admin and a verifier of ANOTHER district are 403 on the finding and the console read; the claim\'s own district reaches them', async () => {
      const w = await world();
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const elsewhere = `D-OTHER-${randomUUID().slice(0, 6)}`;
      const otherDa = await staff(w, ['district_admin'], elsewhere);
      const otherVerifier = await staff(w, ['verifier'], elsewhere);
      await stepUp(otherDa, FRAUD_FINDING_STEP_UP_CONTEXT);
      const refusedFind = await findOf(otherDa, w);
      expect(refusedFind.statusCode).toBe(403);
      expect(errCode(refusedFind)).not.toBe('auth.step_up_required');
      for (const who of [otherDa, otherVerifier]) {
        const res = await who.client.inject({ method: 'GET', url: consoleUrl(w) });
        expect(res.statusCode).toBe(403);
        expect(res.body).not.toContain(FLAG_NOTE);
      }
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged']);
      // POSITIVE CONTROL — the claim's own district.
      const da = await staff(w, ['district_admin']);
      expect((await da.client.inject({ method: 'GET', url: consoleUrl(w) })).statusCode).toBe(200);
    });

    it('⭐ CROSS-PARIWAR: staff of X reach NONE of Y\'s five routes (⛔ a body naming the claim); the same client reaches X', async () => {
      const x = await world();
      const y = await world();
      expect((await flagOf(await staff(y, ['helpline_operator']), y)).statusCode).toBe(201);
      const both = await staff(x, ['helpline_operator', 'district_admin']);
      await stepUp(both, FRAUD_FINDING_STEP_UP_CONTEXT);
      for (const [method, url, payload] of fiveRoutes(y)) {
        const res = await both.client.inject({ method: method as 'GET' | 'POST', url, ...(payload ? { payload } : {}) });
        expect([403, 404], `${method} ${url}`).toContain(res.statusCode);
        expect(res.body).not.toContain(y.claimCaseId);
        expect(res.body).not.toContain(FLAG_NOTE);
      }
      expect(await stepRows(y.claimCaseId)).toEqual(['flagged']);
      expect((await both.client.inject({ method: 'GET', url: consoleUrl(x) })).statusCode).toBe(200); // POSITIVE CONTROL
    });
  });

  // ── RB2 — the GUILTY arm over HTTP (the PQ1 go-live arm) ─────────────────────────────────────────────────────────────
  describe('RB2 — a GUILTY finding over HTTP', () => {
    it('⭐ 201, the claim CLOSED, the audit says `guilty`, and the member stays LOCKED — erasure is still `rtbf.death_reported` and the account stays frozen', async () => {
      const w = await world();
      const memberToken = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
      const erase = async () => {
        await memberAuthRepo.insertElevation(deps.pool, { memberId: w.memberId, actionContext: 'rtbf', elevatedUntil: new Date(Date.now() + 5 * 60 * 1000) });
        const res = await app.inject({ method: 'POST', url: '/api/v1/member/rtbf', payload: {}, headers: { origin: 'http://localhost:3001', authorization: `Bearer ${memberToken}` } });
        return errCode(res);
      };
      expect(await erase()).toBe('rtbf.death_reported');
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const res = await findOf(da, w, { outcome: 'guilty', alive_confirmation: 'ground_inspection' });
      expect(res.statusCode, res.body).toBe(201);
      expect(res.json()).toMatchObject({ outcome: 'guilty', closed: true, not_closed_reason: null, replayed: false });
      expect(await stateOf(w.claimCaseId)).toBe('closed');
      // PQ1 (built B): a GUILTY member is ⛔ released — a ruling of A flips both of these two lines.
      expect(await erase()).toBe('rtbf.death_reported');
      const overlay = await inScope(td, w.pariwarId, (s) => memberDomain.getMemberAccountOverlay(s.tx, ids.memberId(w.memberId), new Date()));
      expect(overlay.accountFrozen).toBe(true);
      const kinds = await td.pool.query<{ kind: string }>('SELECT kind FROM claim_nominee_findings WHERE claim_case_id = $1', [w.claimCaseId]);
      expect(kinds.rows.map((r) => r.kind)).toEqual(['member_found_guilty']);
      const [recorded] = auditsFor('admin_claim.fraud_finding_recorded', w.claimCaseId);
      expect(recorded?.context).toMatchObject({ outcome: 'guilty', alive_confirmation: 'ground_inspection', closed: true });
      // The helpline's claim read labels the fraud-closed claim `closed_member_alive`.
      const op = await staff(w, ['helpline_operator']);
      const helpline = await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/death-certificate/claims` });
      const row = (helpline.json() as { claims: Json[] }).claims.find((c) => c.claim_case_id === w.claimCaseId);
      expect(row).toMatchObject({ closed_member_alive: true });
    });
  });

  // ── RB3 — the finding / flag / console behaviours the first pass left unproven ──────────────────────────────────────
  describe('RB3 — replay, refusals, audits and the console read', () => {
    it('⭐ a finding REPLAYS (200, `replayed: true`, ⛔ a second audit); a second finding is `already_found`; the flag\'s step id is `step_conflict`', async () => {
      const w = await world();
      const op = await staff(w, ['helpline_operator']);
      const flagStep = randomUUID();
      expect((await flagOf(op, w, { step_id: flagStep })).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const ids1 = { step_id: randomUUID(), finding_id: randomUUID() };
      const first = await findOf(da, w, ids1);
      expect(first.statusCode).toBe(201);
      const again = await findOf(da, w, ids1);
      expect(again.statusCode).toBe(200);
      expect(again.json()).toMatchObject({ replayed: true, step_id: ids1.step_id, finding_id: ids1.finding_id, closed: true });
      expect(auditsFor('admin_claim.fraud_finding_recorded', w.claimCaseId)).toHaveLength(1); // the replay wrote ⛔ audit
      expect((await td.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.closed'`, [w.claimCaseId])).rowCount).toBe(1);
      const second = await findOf(da, w);
      expect(second.statusCode).toBe(409);
      expect(errCode(second)).toBe('fraud_investigation.already_found');
      const conflict = await findOf(da, w, { step_id: flagStep });
      expect(conflict.statusCode).toBe(409);
      expect(errCode(conflict)).toBe('fraud_investigation.step_conflict');
      expect(auditsFor('admin_claim.fraud_finding_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(
        expect.arrayContaining(['already_found', 'step_conflict']),
      );
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged', 'found_innocent']);
    });

    // R2-1 — the refusal above reuses the claim's OWN flag step id, so it is refused at the replay check, before any write.
    // A step id held by ANOTHER claim is invisible to that check (the steps are read per claim): `recordFraudFinding` writes
    // the member finding and the release annotation (its step 4) and only THEN meets the global key at the step insert
    // (step 5). The rollback is the handler's `closeScopeTx(scopeTx, ok)` alone — this proves it.
    it('⭐ R2-1 — a finding refused AFTER its writes (a step id ANOTHER claim holds) is 409 `step_conflict` and leaves NOTHING: ⛔ finding row, ⛔ release, ⛔ found step; erasure still `rtbf.death_reported`', async () => {
      const other = await world(); // claim A — another death, its own Pariwar
      const w = await world(); // claim B — the one under test
      const taken = randomUUID();
      expect((await flagOf(await staff(other, ['helpline_operator']), other, { step_id: taken })).statusCode).toBe(201);
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const memberToken = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
      const erase = async () => {
        await memberAuthRepo.insertElevation(deps.pool, { memberId: w.memberId, actionContext: 'rtbf', elevatedUntil: new Date(Date.now() + 5 * 60 * 1000) });
        const res = await app.inject({ method: 'POST', url: '/api/v1/member/rtbf', payload: {}, headers: { origin: 'http://localhost:3001', authorization: `Bearer ${memberToken}` } });
        return errCode(res);
      };
      expect(await erase()).toBe('rtbf.death_reported');
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);

      const res = await findOf(da, w, { step_id: taken }); // innocent — had it committed, the member would be RELEASED
      expect(res.statusCode, res.body).toBe(409);
      expect(errCode(res)).toBe('fraud_investigation.step_conflict');
      expect(auditsFor('admin_claim.fraud_finding_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['step_conflict']);
      expect(auditsFor('admin_claim.fraud_finding_recorded', w.claimCaseId)).toHaveLength(0);
      // ⛔ The step-4 writes survived the refusal:
      expect((await td.pool.query('SELECT 1 FROM claim_nominee_findings WHERE claim_case_id = $1', [w.claimCaseId])).rowCount).toBe(0);
      const released = await td.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_lock_released'`, [w.claimCaseId]);
      expect(released.rowCount).toBe(0);
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged']);
      expect(await stateOf(w.claimCaseId)).toBe('intake_pending');
      expect(await erase()).toBe('rtbf.death_reported'); // the member is still LOCKED
      // …and A's step is untouched (still A's flag).
      const a = await td.pool.query<{ claim_case_id: string; step: string }>('SELECT claim_case_id::text, step FROM claim_fraud_investigation_steps WHERE step_id = $1', [taken]);
      expect(a.rows).toEqual([{ claim_case_id: other.claimCaseId, step: 'flagged' }]);

      // The CONTROL — the same request with a FRESH step id commits, and DOES release the member: so the refusal above
      // really had writes to roll back (an innocent finding releases), ⛔ a request that could never have written.
      const ok = await findOf(da, w);
      expect(ok.statusCode, ok.body).toBe(201);
      expect((await td.pool.query('SELECT 1 FROM claim_nominee_findings WHERE claim_case_id = $1', [w.claimCaseId])).rowCount).toBe(1);
      // … and the release event the refusal leg found absent IS written here (patch-diff PT9: its positive partner).
      expect((await td.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_lock_released'`, [w.claimCaseId])).rowCount).toBe(1);
      expect(await erase()).toBe('rtbf.invalid_state');
    });

    it('a flag on an UNKNOWN claim is 404 `claim_not_found`; the flag audit fires ONCE and ⛔ on a replay', async () => {
      const w = await world();
      const op = await staff(w, ['helpline_operator']);
      const unknown = randomUUID();
      const missing = await flagOf(op, w, {}, unknown);
      expect(missing.statusCode).toBe(404);
      expect(errCode(missing)).toBe('fraud_investigation.claim_not_found');
      expect(auditsFor('admin_claim.fraud_flag_rejected', unknown).map((e) => (e.context as Json).reason)).toEqual(['claim_not_found']);
      const stepId = randomUUID();
      expect((await flagOf(op, w, { step_id: stepId })).statusCode).toBe(201);
      expect((await flagOf(op, w, { step_id: stepId })).statusCode).toBe(200);
      const flagged = auditsFor('admin_claim.fraud_flagged', w.claimCaseId);
      expect(flagged).toHaveLength(1);
      expect(flagged[0]!.context).toMatchObject({ step_id: stepId, claim_state: 'intake_pending' });
      expect(JSON.stringify(flagged)).not.toContain(FLAG_NOTE);
    });

    it('a claim ALREADY `closed` keeps its state: the finding is 201 with `not_closed_reason: already_closed`', async () => {
      const w = await world();
      await drive(w, w.claimCaseId, [
        ...TO_REVIEW,
        ['verifier_review', 'closed', 'claim.closed', { trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: randomUUID(), deceased_member_id: w.memberId }],
      ]);
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const res = await findOf(da, w);
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ closed: false, not_closed_reason: 'already_closed' });
      expect((await td.pool.query(`SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'claim.closed'`, [w.claimCaseId])).rowCount).toBe(1);
    });

    it('⭐ the console: TWO steps are withheld together for a verifier and readable together for a District Admin (one rule, ⛔ per-step hiding); `no-store` when notes are decrypted; the flagger sees `is_flagger`', async () => {
      const w = await world();
      const both = await staff(w, ['helpline_operator', 'district_admin']); // one PERSON: the flagger who also holds the finding key
      expect((await flagOf(both, w)).statusCode).toBe(201);
      const asFlagger = await both.client.inject({ method: 'GET', url: consoleUrl(w) });
      expect(asFlagger.json()).toMatchObject({ viewer: { is_flagger: true, can_record_finding: false } });
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect((await findOf(da, w)).statusCode).toBe(201);

      const verifier = await staff(w, ['verifier']);
      const v = await verifier.client.inject({ method: 'GET', url: consoleUrl(w) });
      expect((v.json() as { steps: Json[] }).steps.map((x) => x.note)).toEqual([{ state: 'withheld' }, { state: 'withheld' }]);
      expect(v.body).not.toContain(FLAG_NOTE);
      expect(v.body).not.toContain(FINDING_NOTE);

      const d = await da.client.inject({ method: 'GET', url: consoleUrl(w) });
      expect(d.headers['cache-control']).toBe('no-store'); // RB7 — decrypted Tier-1 notes are ⛔ cached
      const body = d.json() as { steps: { step: string; note: Json }[]; viewer: Json };
      expect(body.steps.map((x) => [x.step, x.note])).toEqual([
        ['flagged', { state: 'readable', value: FLAG_NOTE }],
        ['found_innocent', { state: 'readable', value: FINDING_NOTE }],
      ]);
      expect(body.viewer).toMatchObject({ can_record_finding: false, is_flagger: false });
      const reads = auditsFor('admin_claim.fraud_notes_read', w.claimCaseId);
      expect(reads).toHaveLength(2); // the flagger-with-the-key read (1 step) and this one (2 steps)
      expect(reads.map((r) => (r.context as Json).step_count).sort()).toEqual([1, 2]);
    });

    it('the console\'s `anonymized` (the RTBF sentinel, stored as an envelope) and `unreadable` (a broken envelope) note states', async () => {
      const w = await world();
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      const noteOf = async () => ((await da.client.inject({ method: 'GET', url: consoleUrl(w) })).json() as { steps: { note: Json }[] }).steps[0]!.note;
      expect(await noteOf()).toEqual({ state: 'readable', value: FLAG_NOTE }); // the CONTROL
      const sentinel = await encryptFraudInvestigationNote(memberDomain.ANONYMIZED_SENTINEL, w.pariwarId, deps.encryption);
      await td.pool.query(`UPDATE claim_fraud_investigation_steps SET note_ciphertext = $1 WHERE claim_case_id = $2`, [sentinel, w.claimCaseId]);
      expect(await noteOf()).toEqual({ state: 'anonymized' });
      await td.pool.query(`UPDATE claim_fraud_investigation_steps SET note_ciphertext = 'not-an-envelope' WHERE claim_case_id = $1`, [w.claimCaseId]);
      expect(await noteOf()).toEqual({ state: 'unreadable' });
    });
  });

  // ── R2-2 — `closed_member_alive` on the two OTHER helpline producers (the death-certificate read is pinned above) ─────
  describe('R2-2 — `closed_member_alive` on the nominee-refusals list and the helpline appeal list', () => {
    /** A `-239` refusal (`domain/_suspicion-refusal-fixtures.ts`'s `refusedClaim`, over the projector): `claim.verifier_denied`
     *  plus its LIVE decision row — the row is what the refusals list reads, ⛔ the denial's own grounding. */
    async function refuse(w: World, cid: string): Promise<void> {
      await drive(w, cid, [...TO_REVIEW, ['verifier_review', 'denied', 'claim.verifier_denied', { actor: 'operator' }]]);
      await td.pool.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'post_death_nominee_change', NULL, $3, 'Anita (District Admin)')`,
        [cid, w.pariwarId, randomUUID()],
      );
    }
    /** `denied` → `closed` HELD BY `holder` (RF6's trigger — the OP10 shape `readClosedMemberAliveBulk`'s reverse leg reads). */
    const closeHeldBy = (w: World, cid: string, holder: string) =>
      drive(w, cid, [['denied', 'closed', 'claim.closed', { trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: holder, deceased_member_id: w.memberId }]]);

    it('⭐ the refusals list: a refusal fraud-closed ITSELF and one closed HELD BY a claim later fraud-closed read `true` (⛔ before the finding); a closed refusal held by an un-found claim and a standing one read `false`', async () => {
      const w = await world();
      const c = w.claimCaseId; // C — refused, then flagged and FOUND (its own close)
      const [r, k, d] = [await fileClaim(td, w.pariwarId, w.memberId), await fileClaim(td, w.pariwarId, w.memberId), await fileClaim(td, w.pariwarId, w.memberId)];
      for (const cid of [c, r, k, d]) await refuse(w, cid);
      await closeHeldBy(w, r, c); // R — closed held by C (C is later fraud-closed: the holder direction)
      await closeHeldBy(w, k, d); // K — the CONTROL: closed held by D, which nobody finds
      const pa = await staff(w, ['pariwar_admin']);
      const aliveById = async () => {
        const res = await pa.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-refusals` });
        expect(res.statusCode, res.body).toBe(200);
        return Object.fromEntries((res.json() as { items: Json[] }).items.map((i) => [i.claim_case_id, [i.claim_state, i.closed_member_alive]]));
      };
      // BEFORE the finding — every row `false` (so the flip below is the finding's, ⛔ the seed's).
      expect(await aliveById()).toEqual({ [c]: ['denied', false], [r]: ['closed', false], [k]: ['closed', false], [d]: ['denied', false] });

      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const found = await findOf(da, w);
      expect(found.statusCode, found.body).toBe(201);
      expect(found.json()).toMatchObject({ closed: true });

      expect(await aliveById()).toEqual({ [c]: ['closed', true], [r]: ['closed', true], [k]: ['closed', false], [d]: ['denied', false] });
    });

    // ⚠ The helpline APPEAL list lists `denied` and `appeal_stage_*` claims ONLY (`HELPLINE_APPEAL_LISTED_STATES`), and
    // `readClosedMemberAliveBulk` answers for `closed` claims only — so on THIS producer `closed_member_alive: true` is
    // unreachable by construction (as is `closed_holder_refused: true`). What CAN be pinned: a fraud-closed claim is ⛔
    // listed, and the listed refusal of the same death carries the field as `false`.
    it('the helpline appeal list: the fraud-closed claim is ⛔ listed (its state is not an appeal state); the same death\'s standing refusal reads `closed_member_alive: false`', async () => {
      const w = await world();
      const d = await fileClaim(td, w.pariwarId, w.memberId);
      await refuse(w, d);
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect((await findOf(da, w)).statusCode).toBe(201);
      expect(await stateOf(w.claimCaseId)).toBe('closed');

      const op = await staff(w, ['helpline_operator']);
      const res = await op.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/appeals` });
      expect(res.statusCode, res.body).toBe(200);
      const claims = (res.json() as { claims: Json[] }).claims;
      expect(claims.map((x) => x.claim_case_id)).toEqual([d]);
      expect(claims[0]).toMatchObject({ claim_state: 'denied', closed_member_alive: false, closed_holder_refused: false });
    });
  });

  // ── RB4 — a missing display name BLOCKS (checklist family 8) ─────────────────────────────────────────────────────────
  describe('RB4 — an actor with NO display name is refused before the domain, and STILL audited', () => {
    it('⭐ the flag: 409 `admin.display_name_missing`, a `_rejected` audit (`missing_display`), ⛔ a step', async () => {
      const w = await world();
      const nameless = await staff(w, ['helpline_operator'], w.district, null);
      const res = await flagOf(nameless, w);
      expect(res.statusCode).toBe(409);
      expect(errCode(res)).toBe('admin.display_name_missing');
      expect(auditsFor('admin_claim.fraud_flag_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['missing_display']);
      expect(await stepRows(w.claimCaseId)).toEqual([]);
      // The CONTROL: a named operator flags the same claim.
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
    });

    it('⭐ the finding: the same — nothing written, the claim stays open', async () => {
      const w = await world();
      expect((await flagOf(await staff(w, ['helpline_operator']), w)).statusCode).toBe(201);
      const nameless = await staff(w, ['district_admin'], w.district, null);
      await stepUp(nameless, FRAUD_FINDING_STEP_UP_CONTEXT);
      const res = await findOf(nameless, w);
      expect(res.statusCode).toBe(409);
      expect(errCode(res)).toBe('admin.display_name_missing');
      expect(auditsFor('admin_claim.fraud_finding_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['missing_display']);
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged']);
      expect(await stateOf(w.claimCaseId)).not.toBe('closed');
      // The CONTROL (patch-diff review PD13): a NAMED District Admin records the finding on the same claim — so the refusal above was the
      // missing name, ⛔ a claim that could not be found.
      const named = await staff(w, ['district_admin']);
      await stepUp(named, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect((await findOf(named, w)).statusCode).toBe(201);
      expect(await stateOf(w.claimCaseId)).toBe('closed');
    });
  });

  // ── RB9 — the helpline's per-member list is audited; RB11 — a visually empty note is no note ─────────────────────────
  describe('RB9 / RB11', () => {
    it('⭐ RB9 — the helpline\'s per-member list writes ONE `fraud_claims_read` line: the member id and a count, ⛔ a state, ⛔ a name', async () => {
      const w = await world();
      const op = await staff(w, ['helpline_operator']);
      const before = td.auditSink.ofType('admin_claim.fraud_claims_read').length;
      expect((await op.client.inject({ method: 'GET', url: memberListUrl(w) })).statusCode).toBe(200);
      const lines = td.auditSink.ofType('admin_claim.fraud_claims_read').slice(before).filter((e) => (e.context as Json | undefined)?.member_id === w.memberId.toLowerCase());
      expect(lines).toHaveLength(1);
      expect(lines[0]!.context).toEqual({ member_id: w.memberId.toLowerCase(), claim_count: 1 });
      expect(lines[0]!.resourceLocator).toBe(`member:${w.memberId.toLowerCase()}`);
    });

    it.each([
      ['zero-width spaces', '\u200B\u200C\u200D'],
      ['braille blanks', '\u2800\u2800'],
      ['a Hangul filler (a LETTER that draws nothing)', '\u3164'],
    ])('⭐ RB11 — a note of %s is `missing_note` (400, audited) on BOTH routes', async (_label, blank) => {
      const w = await world();
      const op = await staff(w, ['helpline_operator']);
      const flagRes = await flagOf(op, w, { note: blank });
      expect(flagRes.statusCode).toBe(400);
      expect(errCode(flagRes)).toBe('fraud_investigation.missing_note');
      expect(auditsFor('admin_claim.fraud_flag_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['missing_note']); // audited (PD13)
      expect(await stepRows(w.claimCaseId)).toEqual([]);
      expect((await flagOf(op, w)).statusCode).toBe(201); // the CONTROL: a real note flags
      const da = await staff(w, ['district_admin']);
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      const findRes = await findOf(da, w, { note: blank });
      expect(findRes.statusCode).toBe(400);
      expect(errCode(findRes)).toBe('fraud_investigation.missing_note');
      expect(auditsFor('admin_claim.fraud_finding_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['missing_note']); // audited (PD13)
      expect(await stepRows(w.claimCaseId)).toEqual(['flagged']);
    });
  });
});
