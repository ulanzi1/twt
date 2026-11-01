// Story 6.22 — the fraud register's investigation over HTTP (Task 4.4): AC3 (the flag + the helpline's list + the Q7 HTTP
// twin), AC4 (the finding: refusals, step-up, the release proven on a real lock route, the approved claim), AC10 (the
// override door's 409s), AC12 (audits — ⛔ note in any context), AC13 (the console read's uniform withholding, the
// work-list's district scope, `closed_member_alive` on the helpline read). Live DB.
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

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `fi-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    await service.setAdminDisplayName(deps, userId, displayName);
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
  async function staff(w: World, roles: readonly Role[], district = w.district): Promise<Staff> {
    const a = await authenticate(`${roles.join('+')} ${randomUUID().slice(0, 4)}`);
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
        expect((await flagOf(a, w)).statusCode, roles[0]).toBe(403);
      }
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
      const da = await staff(w, ['district_admin']);
      const noStep = await findOf(da, w);
      expect(noStep.statusCode).toBe(403);
      expect(errCode(noStep)).toBe('auth.step_up_required');
      await stepUp(da, FRAUD_FINDING_STEP_UP_CONTEXT);
      expect(errCode(await findOf(da, w))).toBe('fraud_investigation.not_flagged');
      const both = await staff(w, ['helpline_operator', 'district_admin']);
      expect((await flagOf(both, w)).statusCode).toBe(201);
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
        expect.arrayContaining(['not_flagged', 'finder_is_flagger', 'missing_alive_confirmation', 'missing_note']),
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
        await stepUp(a, FRAUD_FINDING_STEP_UP_CONTEXT).catch(() => undefined);
        expect((await findOf(a, w)).statusCode, roles[0]).toBe(403);
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
});
