// Story 6.27b (Task 3.7, 3c.6; AC6, AC8, AC11; PM24; `-310` CF2; `-328` read with `-329`) — the APPROVERS' read of the
// neighbours' answers, E2E on a live DB (:5433), and the console's call-back rules.
//   · the role × step matrix — the FOUR arms admit (a Pariwar Admin at the three votable states; at the cycle-freeze
//     escalation resolution — a live `escalated` decision in `verification_in_progress` / `verifier_review` (BF17); an R9
//     voter on a live routing in an `R9_OUTCOME_FROM_STATES` state, incl. `state_trustee_approved` (BF18); the Super
//     Admin on a claim HELD for an escalated correction closure); a District Admin / verifier ⇒ 403 at the hook; every
//     other state ⇒ ONE 404 (incl. a DENIED claim that still carries a live routing, an unknown claim, another Pariwar's);
//   · the read is audited ONCE (context keys on the in-memory sink, the persisted locator through the production sink) —
//     ⛔ a name, a date or a number in the line; a 404 ⛔ audited;
//   · the call-back number: a Pariwar Admin ONLY on a "Yes" to v3's words (`consented`, ONE showing line); a v2 "Yes",
//     "No", unanswered, ⛔ reply ⇒ `none` with ⛔ decrypt (a garbage mobile proves it: decrypting would read
//     `unavailable`); the Super Admin for every TEXTED neighbour (`super_admin` basis); a never-texted ping ⇒ `none` for
//     everyone; a failed section ⇒ ⛔ showing line;
//   · the CONSOLE: the District Admin and a verifier unchanged ("Yes" of either version), the Super Admin on "No" /
//     unanswered / ⛔ reply (`super_admin`) and ⛔ for a never-texted ping; each reply's question words follow its version;
//   · the hidden actor ⇒ `peerMesh` ABSENT and audited; a broken answer ciphertext ⇒ that answer `unavailable`; the
//     warnings read forced to fail ⇒ every flag `null`; `not_died` ⇒ `true`, `died` ⇒ `false`.

import { randomUUID } from 'node:crypto';

import { claim, encryption, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// ⭐ Fault seams — off by default. `warnings` fails the warnings read (the flags' source); `answers` fails the section's
// answers read (a REAL SQL error first, so the SAVEPOINT path runs).
// Code review round 2 (S8): `mapping` throws in the WIRE mapping (`assemblePeerMeshSection`'s responder count), AFTER the
// assembler has reported the numbers it showed — the section degrades to `unavailable` there.
const fault = vi.hoisted(() => ({ warnings: false, answers: false, mapping: false }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const { sql } = await import('drizzle-orm');
  const failing =
    <A extends unknown[], R>(on: () => boolean, fn: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      if (on()) await (a[0] as { execute: (q: unknown) => Promise<unknown> }).execute(sql`SELECT 1/0`);
      return fn(...a);
    };
  return {
    ...actual,
    claim: {
      ...actual.claim,
      readClaimApprovalWarnings: failing(() => fault.warnings, actual.claim.readClaimApprovalWarnings),
      readPeerAnswersForClaim: failing(() => fault.answers, actual.claim.readPeerAnswersForClaim),
      distinctPeerMeshResponderCount: (...a: Parameters<typeof actual.claim.distinctPeerMeshResponderCount>) => {
        if (fault.mapping) throw new Error('simulated: the wire mapping failed');
        return actual.claim.distinctPeerMeshResponderCount(...a);
      },
    },
  };
});

import { createAuditLogSink } from '../../../src/audit/audit-log-sink.js';
import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { encryptGroundInspectionField } from '../../../src/modules/claims/ground-inspection-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { insertDeathCertificate } from '../_nominee-name-check-fixture.js';
import * as peerFx from '../_peer-reply-fixture.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;
type Role = 'district_admin' | 'verifier' | 'pariwar_admin' | 'super_admin';

const DISTRICT = 'Patna';
const MOBILE = '+919876543210';

describe.skipIf(!hasDatabase)('Story 6.27b — the approvers\' read of the neighbours\' answers (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const env = () => ({ pool: td.pool, deps, app });

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    fault.warnings = false;
    fault.answers = false;
    fault.mapping = false;
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

  // ── Actors ────────────────────────────────────────────────────────────────────────────────────────────────────

  async function staff(pariwarId: string, role: Role): Promise<{ client: Client; userId: string }> {
    const email = `pa27b-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: `${role} person` });
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
    const [dim, value] =
      role === 'district_admin' || role === 'verifier' ? ['district', DISTRICT] : role === 'super_admin' ? ['global', null] : ['pariwar', pariwarId];
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      userId,
      pariwarId,
      role,
      dim,
      value,
    ]);
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }

  // ── World ─────────────────────────────────────────────────────────────────────────────────────────────────────

  interface World {
    pariwarId: string;
    claimCaseId: string;
    deceased: string;
  }

  /** A claim of a fresh death (posted to Patna, KYC name "Ram K."), driven through the projector to `state`. */
  async function claimAt(
    state: 'verification_in_progress' | 'verifier_review' | 'verifier_approved' | 'state_trustee_freeze' | 'state_trustee_approved' | 'approved' | 'denied' | 'appeal_stage_1' | 'reversed' | 'closed',
    pariwarId: string = randomUUID(),
    /** Story 6.32 (S22) — a SECOND claim for an already-seeded death (a refile); its member rows are ⛔ inserted again. */
    sameDeath?: string,
  ): Promise<World> {
    const deceased = sameDeath ?? randomUUID();
    const claimCaseId = randomUUID();
    if (sameDeath === undefined) {
      await td.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [deceased, pariwarId]);
      await td.pool.query(`INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`, [
        deceased,
        pariwarId,
        DISTRICT,
      ]);
      await td.pool.query(
        `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
         VALUES ($1, $2, $3, $4, 'self_declared', 'manual')`,
        [deceased, pariwarId, await encryption.encryptKycField('Ram K.', pariwarId, deps.encryption), await encryption.encryptKycField('1950-01-01', pariwarId, deps.encryption)],
      );
    }
    const s = await openScopeTx(deps, pariwarId);
    const e = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
      claim.projectClaimState(s.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceased),
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
        actorId: null,
      });
    try {
      await e(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: deceased, intake_channel: 'helpline', claimant_actor_id: null });
      await e('intake_pending', 'intake_converged', 'claim.intake_converged');
      await e('intake_converged', 'documents_pending', 'claim.documents_received');
      await e('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'm', metric_version: 1 });
      if (state !== 'verification_in_progress') await e('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      if (state === 'closed') {
        await e('verifier_review', 'closed', 'claim.closed', { trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: randomUUID(), deceased_member_id: deceased });
      } else if (state === 'denied' || state === 'appeal_stage_1' || state === 'reversed') {
        await e('verifier_review', 'denied', 'claim.verifier_denied', { actor: 'operator' });
        if (state !== 'denied') await e('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
        if (state === 'reversed') {
          await e('appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
          await e('reversed', 'reversed', 'claim.reversed', { reversed_at_stage: 1, disposition_category: 'reconsideration_on_merits' });
        }
      } else if (state !== 'verification_in_progress' && state !== 'verifier_review') {
        await e('verifier_review', 'verifier_approved', 'claim.verifier_approved');
        if (state !== 'verifier_approved') await e('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
        if (state === 'state_trustee_approved' || state === 'approved') await e('state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
        if (state === 'approved') await e('state_trustee_approved', 'approved', 'claim.approved');
      }
      await closeScopeTx(s, true);
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
    return { pariwarId, claimCaseId, deceased };
  }

  const route = (w: World) =>
    td.pool.query(
      `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Router')`,
      [w.claimCaseId, w.pariwarId, randomUUID()],
    );
  const escalate = (w: World) =>
    td.pool.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'escalated', 'r9_routed_to_voting', $3, 'Anita (District Admin)')`,
      [w.claimCaseId, w.pariwarId, randomUUID()],
    );
  /** A staff-case closure HELD (`escalated`) on the claim's LIVE return — the Super Admin's G1 step (fixture rows). */
  async function hold(w: World): Promise<void> {
    const { rows } = await td.pool.query<{ decision_id: string }>(
      `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'correction_return', 'returned_for_correction', 'other', $3, 'Prakash (Pariwar Admin)') RETURNING decision_id`,
      [w.claimCaseId, w.pariwarId, randomUUID()],
    );
    await td.pool.query(
      `INSERT INTO claim_correction_closures (claim_case_id, pariwar_id, return_decision_id, origin, state, escalated_at)
       VALUES ($1, $2, $3, 'staff_case', 'escalated', now())`,
      [w.claimCaseId, w.pariwarId, rows[0]!.decision_id],
    );
  }

  /** `texted.length` neighbours on `w` (the claim's ONE selection). */
  async function neighbours(
    w: World,
    texted: boolean[],
    workplace?: { source: 'workplace' | 'named_by_member'; recentChangeBeforeFiling: boolean },
  ): Promise<{ member: string; ping: string }[]> {
    const members: string[] = [];
    for (const [i] of texted.entries()) members.push(await peerFx.seedNeighbour(env(), w.pariwarId, `Neighbour ${i}`, MOBILE));
    const pings = await peerFx.attachPings(env(), w.pariwarId, w.claimCaseId, w.deceased, members, texted, workplace);
    return members.map((member, i) => ({ member, ping: pings[i]! }));
  }
  const put = (w: World, n: { member: string; ping: string }, key: string, value: Json) => peerFx.put(env(), w.pariwarId, n.member, n.ping, key, value);
  /** Pin `n`'s reply to questionnaire v2 BEFORE any answer (a reply started before v3 went live — a seeded row). */
  async function pinV2(w: World, n: { member: string; ping: string }): Promise<void> {
    const { rows } = await td.pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [n.ping]);
    await td.pool.query(
      `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v2')`,
      [randomUUID(), w.pariwarId, w.claimCaseId, rows[0]!.selection_id, n.ping, n.member],
    );
  }

  const url = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/peer-answers`;
  const consoleUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/verifier-console`;
  type Ping = { pingId: string; callbackMobile: Json; callbackBasis: string | null; source: string | null; reply: { answers: { questionKey: string; question: string; value: Json; warningFlag: boolean | null }[] } | null };
  async function read(who: { client: Client }, w: World): Promise<{ status: number; body: { peerMesh?: { status: string; transcript?: { pings: Ping[]; recentChangeBeforeFiling?: boolean | null } } } }> {
    const res = await who.client.inject({ method: 'GET', url: url(w.pariwarId, w.claimCaseId) });
    return { status: res.statusCode, body: res.json() };
  }
  const pingsOf = (b: { peerMesh?: { transcript?: { pings: Ping[] } } }) => b.peerMesh?.transcript?.pings ?? [];
  async function consolePings(who: { client: Client }, w: World): Promise<Ping[]> {
    const res = await who.client.inject({ method: 'GET', url: consoleUrl(w.pariwarId, w.claimCaseId) });
    expect(res.statusCode, res.body).toBe(200);
    return ((res.json() as { packet: { peerMesh?: { transcript?: { pings: Ping[] } } } }).packet.peerMesh?.transcript?.pings ?? []);
  }
  async function consoleTranscript(who: { client: Client }, w: World): Promise<{ pings: Ping[]; recentChangeBeforeFiling?: boolean | null }> {
    const res = await who.client.inject({ method: 'GET', url: consoleUrl(w.pariwarId, w.claimCaseId) });
    expect(res.statusCode, res.body).toBe(200);
    return (res.json() as { packet: { peerMesh: { transcript: { pings: Ping[]; recentChangeBeforeFiling?: boolean | null } } } }).packet.peerMesh.transcript;
  }
  const readLines = (claimCaseId: string) => td.auditSink.ofType('admin_claim.peer_answers_read').filter((e) => e.resourceLocator === `claim:${claimCaseId}`);
  const shownLines = (claimCaseId: string) =>
    td.auditSink.ofType('admin_claim.peer_callback_mobile_shown').filter((e) => e.resourceLocator?.startsWith(`claim:${claimCaseId}:ping:`));

  // ── AC6 — the role × step matrix ───────────────────────────────────────────────────────────────────────────────

  describe('the step (four arms) and the gate', () => {
    for (const state of ['verifier_approved', 'reversed', 'state_trustee_freeze'] as const) {
      it(`arm 1 — a Pariwar Admin at \`${state}\` (the final vote) reads the answers; the line names the step`, async () => {
        const w = await claimAt(state);
        const [n] = await neighbours(w, [true]);
        await put(w, n!, 'has_died', { codes: ['died'] });
        const pa = await staff(w.pariwarId, 'pariwar_admin');
        const r = await read(pa, w);
        expect(r.status, JSON.stringify(r.body)).toBe(200);
        expect(r.body.peerMesh?.status).toBe('present');
        // Story 6.32 (second review S15) — the family's account counts ride the line (zeros: ⛔ completed full visit).
        expect(readLines(w.claimCaseId).at(-1)?.context).toEqual({ step: 'final_vote', section: 'present', ping_count: 1, answer_count: 1, family_visit_count: 0, family_answer_count: 0, family_health_answer_count: 0, family_account_inherited: false });
      });
    }

    for (const state of ['verification_in_progress', 'verifier_review'] as const) {
      it(`arm 2 (BF17) — at \`${state}\` with a live ESCALATED decision ⇒ the escalation resolution; without one ⇒ 404`, async () => {
        const w = await claimAt(state);
        const pa = await staff(w.pariwarId, 'pariwar_admin');
        expect((await read(pa, w)).status).toBe(404);
        await escalate(w);
        const r = await read(pa, w);
        expect(r.status, JSON.stringify(r.body)).toBe(200);
        expect(r.body.peerMesh).toEqual({ status: 'empty', familyAccount: [], familyAccountInheritedFromClaimId: null }); // Story 6.32 (IQ7) — REQUIRED on `empty` too
        expect(readLines(w.claimCaseId).at(-1)?.context).toMatchObject({ step: 'escalation_resolution', section: 'empty' });
      });
    }

    for (const state of ['verifier_review', 'state_trustee_approved'] as const) {
      it(`arm 3 (BF18) — a live R9 routing at \`${state}\` ⇒ the R9 step; without one ⇒ 404`, async () => {
        const w = await claimAt(state);
        const pa = await staff(w.pariwarId, 'pariwar_admin');
        expect((await read(pa, w)).status).toBe(404);
        await route(w);
        const r = await read(pa, w);
        expect(r.status, JSON.stringify(r.body)).toBe(200);
        expect(readLines(w.claimCaseId).at(-1)?.context).toMatchObject({ step: 'r9_vote' });
      });
    }

    // Code review round 2 (S15) — a votable state WITH a live R9 routing: the approving step is R9's, ⛔ the final vote's.
    for (const state of ['verifier_approved', 'state_trustee_freeze'] as const) {
      it(`arm 1 yields to arm 3 — \`${state}\` with a LIVE R9 routing ⇒ audited \`r9_vote\`, ⛔ \`final_vote\``, async () => {
        const w = await claimAt(state);
        await route(w);
        const pa = await staff(w.pariwarId, 'pariwar_admin');
        const r = await read(pa, w);
        expect(r.status, JSON.stringify(r.body)).toBe(200);
        expect(readLines(w.claimCaseId).at(-1)?.context).toMatchObject({ step: 'r9_vote' });
      });
    }

    it('arm 4 — the Super Admin on a claim HELD for an escalated correction closure; the Pariwar Admin (⛔ the key) ⇒ 404', async () => {
      const w = await claimAt('verifier_review');
      await hold(w);
      const sa = await staff(w.pariwarId, 'super_admin');
      const r = await read(sa, w);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect(readLines(w.claimCaseId).at(-1)?.context).toMatchObject({ step: 'super_admin_approval' });
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      expect((await read(pa, w)).status).toBe(404);
    });

    it('a District Admin and a verifier (⛔ `cycle.freeze`) ⇒ 403 at the hook', async () => {
      const w = await claimAt('verifier_approved');
      for (const role of ['district_admin', 'verifier'] as const) {
        const who = await staff(w.pariwarId, role);
        expect((await read(who, w)).status, role).toBe(403);
      }
    });

    it('ONE 404 for every other state, a DENIED claim with a live routing, an unknown claim and another Pariwar\'s — ⛔ audited as a read', async () => {
      const p = randomUUID();
      const pa = await staff(p, 'pariwar_admin');
      const worlds: World[] = [];
      for (const state of ['verification_in_progress', 'verifier_review', 'state_trustee_approved', 'approved', 'denied', 'appeal_stage_1', 'closed'] as const) {
        worlds.push(await claimAt(state, p));
      }
      const deniedRouted = await claimAt('denied', p);
      await route(deniedRouted);
      worlds.push(deniedRouted);
      const bodies = new Set<string>();
      const sameness = (b: unknown) => {
        const { code, message } = (b as { error: { code: string; message: string } }).error;
        return JSON.stringify({ code, message }); // ⛔ `request_id`, which differs per request
      };
      for (const w of worlds) {
        const r = await read(pa, w);
        expect(r.status, w.claimCaseId).toBe(404);
        bodies.add(sameness(r.body));
        expect(readLines(w.claimCaseId)).toEqual([]);
      }
      const unknown = await read(pa, { pariwarId: p, claimCaseId: randomUUID(), deceased: randomUUID() });
      expect(unknown.status).toBe(404);
      bodies.add(sameness(unknown.body));
      const other = await claimAt('verifier_approved'); // another Pariwar's claim, read under `p`
      const cross = await read(pa, { ...other, pariwarId: p });
      expect(cross.status).toBe(404);
      bodies.add(sameness(cross.body));
      expect(bodies.size, [...bodies].join(' | ')).toBe(1);
    });
  });

  // ── The audit line ───────────────────────────────────────────────────────────────────────────────────────────────

  it('the read is audited ONCE — context keys only (⛔ a name, a date, a number), and the persisted row names the claim', async () => {
    const w = await claimAt('verifier_approved');
    const [n] = await neighbours(w, [true]);
    await put(w, n!, 'has_died', { codes: ['died'] });
    await put(w, n!, 'death_date', { date: '2026-10-01' });
    await put(w, n!, 'callback_consent', { codes: ['yes'] });
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    expect((await read(pa, w)).status).toBe(200);
    const lines = readLines(w.claimCaseId);
    expect(lines).toHaveLength(1);
    expect(Object.keys(lines[0]!.context ?? {}).sort()).toEqual([
      'answer_count',
      'family_account_inherited',
      'family_answer_count',
      'family_health_answer_count',
      'family_visit_count',
      'ping_count',
      'section',
      'step',
    ]);
    const all = JSON.stringify([...lines, ...shownLines(w.claimCaseId)]);
    for (const secret of ['Neighbour 0', '2026-10-01', '9876543210', 'Ram K.']) expect(all).not.toContain(secret);
    createAuditLogSink(td.pool).emit(lines[0]!);
    await vi.waitFor(
      async () => {
        const { rows } = await td.pool.query(`SELECT resource_locator FROM audit_log_entries WHERE action = 'admin_claim.peer_answers_read' AND resource_locator = $1`, [
          `claim:${w.claimCaseId}`,
        ]);
        expect(rows).toHaveLength(1);
      },
      { timeout: 5000 },
    );
  });

  // ── The call-back number (`-328` read with `-329`) ─────────────────────────────────────────────────────────────

  describe('the call-back number', () => {
    it('a "Yes" to v3\'s words ⇒ SHOWN to the Pariwar Admin (`consented`), ONE showing line (persisted locator, ⛔ the number)', async () => {
      const w = await claimAt('verifier_approved');
      const [n] = await neighbours(w, [true]);
      await put(w, n!, 'has_died', { codes: ['died'] });
      await put(w, n!, 'callback_consent', { codes: ['yes'] });
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const ping = pingsOf((await read(pa, w)).body)[0]!;
      expect(ping.callbackMobile).toEqual({ status: 'shown', text: MOBILE });
      expect(ping.callbackBasis).toBe('consented');
      const lines = shownLines(w.claimCaseId);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.context).toEqual({ basis: 'consented', step: 'final_vote' });
      expect(JSON.stringify(lines)).not.toContain('9876543210');
      const locator = `claim:${w.claimCaseId}:ping:${n!.ping}`;
      createAuditLogSink(td.pool).emit(lines[0]!);
      await vi.waitFor(
        async () => {
          const { rows } = await td.pool.query(`SELECT 1 FROM audit_log_entries WHERE action = 'admin_claim.peer_callback_mobile_shown' AND resource_locator = $1`, [locator]);
          expect(rows).toHaveLength(1);
        },
        { timeout: 5000 },
      );
    });

    it('a "Yes" to v2\'s words ⇒ `none` for the Pariwar Admin with ⛔ decrypt and ⛔ line — but SHOWN to the District Admin on the console', async () => {
      const w = await claimAt('verifier_approved');
      const [n] = await neighbours(w, [true]);
      await pinV2(w, n!);
      await put(w, n!, 'has_died', { codes: ['died'] });
      await put(w, n!, 'callback_consent', { codes: ['yes'] });
      const da = await staff(w.pariwarId, 'district_admin');
      const onConsole = (await consolePings(da, w))[0]!;
      expect(onConsole.callbackMobile).toEqual({ status: 'shown', text: MOBILE });
      expect(onConsole.callbackBasis).toBe('consented');
      // ⛔ decrypt: a garbage mobile would read `unavailable` if it were decrypted.
      await td.pool.query(`UPDATE member_identities SET mobile_ciphertext = 'enc:v1:garbage' WHERE member_id = $1`, [n!.member]);
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const ping = pingsOf((await read(pa, w)).body)[0]!;
      expect(ping.callbackMobile).toEqual({ status: 'none' });
      expect(ping.callbackBasis).toBeNull();
      expect(shownLines(w.claimCaseId)).toEqual([]);
      // …and the v2 reply's question words are v2's — the console words follow each reply's own version (3c.6).
      const consent = onConsole.reply!.answers.find((a) => a.questionKey === 'callback_consent')!;
      expect(consent.question).toBe('May the District Admin phone you about this?');
    });

    it('"No" / unanswered / ⛔ reply ⇒ `none` for the Pariwar Admin, SHOWN (`super_admin`) for the Super Admin; a never-texted ping ⇒ `none` for both', async () => {
      const w = await claimAt('verifier_approved');
      const [no, unanswered, noReply, untexted] = await neighbours(w, [true, true, true, false]);
      await put(w, no!, 'has_died', { codes: ['died'] });
      await put(w, no!, 'callback_consent', { codes: ['no'] });
      await put(w, unanswered!, 'has_died', { codes: ['died'] });
      void noReply;
      void untexted;
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      for (const ping of pingsOf((await read(pa, w)).body)) expect(ping.callbackMobile, ping.pingId).toEqual({ status: 'none' });
      expect(shownLines(w.claimCaseId)).toEqual([]);
      const sa = await staff(w.pariwarId, 'super_admin');
      const byPing = new Map(pingsOf((await read(sa, w)).body).map((p) => [p.pingId, p]));
      for (const n of [no!, unanswered!, noReply!]) {
        expect(byPing.get(n.ping)?.callbackMobile, n.ping).toEqual({ status: 'shown', text: MOBILE });
        expect(byPing.get(n.ping)?.callbackBasis).toBe('super_admin');
      }
      expect(byPing.get(untexted!.ping)?.callbackMobile).toEqual({ status: 'none' });
      expect(shownLines(w.claimCaseId).map((l) => l.context)).toEqual([
        { basis: 'super_admin', step: 'final_vote' },
        { basis: 'super_admin', step: 'final_vote' },
        { basis: 'super_admin', step: 'final_vote' },
      ]);
    });

    it('a FAILED section ⇒ `unavailable` and ⛔ showing line', async () => {
      const w = await claimAt('verifier_approved');
      const [n] = await neighbours(w, [true]);
      await put(w, n!, 'has_died', { codes: ['died'] });
      await put(w, n!, 'callback_consent', { codes: ['yes'] });
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      fault.answers = true;
      try {
        const r = await read(pa, w);
        expect(r.status).toBe(200);
        expect(r.body.peerMesh).toEqual({ status: 'unavailable' });
      } finally {
        fault.answers = false;
      }
      expect(shownLines(w.claimCaseId)).toEqual([]);
      expect(readLines(w.claimCaseId).at(-1)?.context).toMatchObject({ section: 'unavailable' });
    });

    // Code review round 2 (S8) — the assembler has ALREADY reported the number when the wire mapping fails: the line is
    // emitted only for a section the response / packet actually carries (`present`).
    it('a WIRE-MAPPING failure after the number was assembled ⇒ `unavailable` and ⛔ showing line — the approvers\' read AND the console', async () => {
      const w = await claimAt('verifier_approved');
      const [n] = await neighbours(w, [true]);
      await put(w, n!, 'has_died', { codes: ['died'] });
      await put(w, n!, 'callback_consent', { codes: ['yes'] });
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const sa = await staff(w.pariwarId, 'super_admin');
      const consoleLines = () =>
        td.auditSink
          .ofType('admin_verifier_console.peer_callback_mobile_shown')
          .filter((e) => (e.context as Json | undefined)?.['claim_case_id'] === w.claimCaseId);
      fault.mapping = true;
      try {
        const r = await read(pa, w);
        expect(r.status).toBe(200);
        expect(r.body.peerMesh).toEqual({ status: 'unavailable' });
        const res = await sa.client.inject({ method: 'GET', url: consoleUrl(w.pariwarId, w.claimCaseId) });
        expect(res.statusCode, res.body).toBe(200);
        expect((res.json() as { packet: { peerMesh?: Json } }).packet.peerMesh).toEqual({ status: 'unavailable' });
      } finally {
        fault.mapping = false;
      }
      expect(shownLines(w.claimCaseId)).toEqual([]);
      expect(consoleLines()).toEqual([]);
      // The control: the same reads with the mapping intact DO show the number and audit it once each.
      expect(pingsOf((await read(pa, w)).body)[0]!.callbackMobile).toEqual({ status: 'shown', text: MOBILE });
      expect(shownLines(w.claimCaseId)).toHaveLength(1);
      expect((await consolePings(sa, w))[0]!.callbackMobile).toEqual({ status: 'shown', text: MOBILE });
      expect(consoleLines()).toHaveLength(1);
    });

    it('the CONSOLE — the District Admin and a verifier: a "Yes" only (either version); the Super Admin: "No" / unanswered / ⛔ reply (`super_admin`), ⛔ a never-texted ping', async () => {
      const w = await claimAt('verifier_review');
      const [yes, no, unanswered, noReply, untexted] = await neighbours(w, [true, true, true, true, false]);
      await put(w, yes!, 'has_died', { codes: ['died'] });
      await put(w, yes!, 'callback_consent', { codes: ['yes'] });
      await put(w, no!, 'has_died', { codes: ['died'] });
      await put(w, no!, 'callback_consent', { codes: ['no'] });
      await put(w, unanswered!, 'has_died', { codes: ['died'] });
      for (const role of ['district_admin', 'verifier'] as const) {
        const who = await staff(w.pariwarId, role);
        const byPing = new Map((await consolePings(who, w)).map((p) => [p.pingId, p]));
        expect(byPing.get(yes!.ping)?.callbackMobile, role).toEqual({ status: 'shown', text: MOBILE });
        for (const n of [no!, unanswered!, noReply!, untexted!]) expect(byPing.get(n.ping)?.callbackMobile, `${role} ${n.ping}`).toEqual({ status: 'none' });
      }
      const sa = await staff(w.pariwarId, 'super_admin');
      const byPing = new Map((await consolePings(sa, w)).map((p) => [p.pingId, p]));
      expect(byPing.get(yes!.ping)?.callbackBasis).toBe('consented');
      for (const n of [no!, unanswered!, noReply!]) {
        expect(byPing.get(n.ping)?.callbackMobile).toEqual({ status: 'shown', text: MOBILE });
        expect(byPing.get(n.ping)?.callbackBasis).toBe('super_admin');
      }
      expect(byPing.get(untexted!.ping)?.callbackMobile).toEqual({ status: 'none' });
      const consoleLines = td.auditSink
        .ofType('admin_verifier_console.peer_callback_mobile_shown')
        .filter((e) => (e.context as Json | undefined)?.['claim_case_id'] === w.claimCaseId);
      expect(consoleLines.filter((l) => (l.context as Json)['basis'] === 'super_admin')).toHaveLength(3);
      // v3's words on a reply started on v3 (3c.6).
      const consent = byPing.get(yes!.ping)!.reply!.answers.find((a) => a.questionKey === 'callback_consent')!;
      expect(consent.question).toBe('May the Admin phone you about this?');
    });
  });

  // ── Story 6.36 (SW24, SW20; `-326` BD1 A) — the source and the staff line on BOTH surfaces ──────────────────────

  it('⭐ Story 6.36 — `source` on every ping and `recentChangeBeforeFiling` reach the District Admin\'s console AND the approvers\' read; a legacy selection carries `null` on both', async () => {
    const w = await claimAt('verifier_approved');
    await neighbours(w, [true, false], { source: 'named_by_member', recentChangeBeforeFiling: true });
    const da = await staff(w.pariwarId, 'district_admin');
    const onConsole = await consoleTranscript(da, w);
    expect(onConsole.pings.map((p) => p.source)).toEqual(['named_by_member', 'named_by_member']);
    expect(onConsole.recentChangeBeforeFiling).toBe(true);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const { status, body } = await read(pa, w);
    expect(status).toBe(200);
    expect(pingsOf(body).map((p) => p.source)).toEqual(['named_by_member', 'named_by_member']);
    expect(body.peerMesh?.transcript?.recentChangeBeforeFiling).toBe(true);

    const legacy = await claimAt('verifier_approved');
    await neighbours(legacy, [true]);
    const legacyConsole = await consoleTranscript(await staff(legacy.pariwarId, 'district_admin'), legacy);
    expect(legacyConsole.pings.map((p) => p.source)).toEqual([null]);
    expect(legacyConsole.recentChangeBeforeFiling).toBeNull();
    const legacyRead = await read(await staff(legacy.pariwarId, 'pariwar_admin'), legacy);
    expect(pingsOf(legacyRead.body).map((p) => p.source)).toEqual([null]);
    expect(legacyRead.body.peerMesh?.transcript?.recentChangeBeforeFiling).toBeNull();
  });

  it('⭐ Story 6.36 (AC16; `-331` SC4 A) — each reply keeps its version\'s words: a v3 reply reads "A colleague at the same school", a v4 reply "…school or office" (the SAME stored code)', async () => {
    const w = await claimAt('verifier_review');
    const [v3, v4] = await neighbours(w, [true, true]);
    const { rows } = await td.pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [v3!.ping]);
    await td.pool.query(
      `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v3')`,
      [randomUUID(), w.pariwarId, w.claimCaseId, rows[0]!.selection_id, v3!.ping, v3!.member],
    );
    for (const n of [v3!, v4!]) {
      await put(w, n, 'has_died', { codes: ['died'] });
      await put(w, n, 'relationship', { codes: ['school_colleague'] });
    }
    const byPing = new Map((await consolePings(await staff(w.pariwarId, 'district_admin'), w)).map((p) => [p.pingId, p]));
    const label = (ping: string) => byPing.get(ping)!.reply!.answers.find((a) => a.questionKey === 'relationship')!.value;
    expect(label(v3!.ping)).toEqual({ kind: 'codes', codes: ['school_colleague'], labels: ['A colleague at the same school'] });
    expect(label(v4!.ping)).toEqual({ kind: 'codes', codes: ['school_colleague'], labels: ['A colleague at the same school or office'] });
  });

  // ── Hidden, broken, flags ──────────────────────────────────────────────────────────────────────────────────────

  it('PM25 (c) — a reader holding an UN-completed ground visit gets ⛔ section (`peerMesh` ABSENT), and the read is audited `hidden`', async () => {
    const w = await claimAt('verifier_approved');
    await neighbours(w, [true]);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    await td.pool.query(
      `INSERT INTO claim_ground_inspections (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
         inspector_actor_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'initial', 'family_residence', $5, now(), 'scheduled')`,
      [randomUUID(), w.claimCaseId, w.pariwarId, DISTRICT, pa.userId],
    );
    const r = await read(pa, w);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({});
    expect(readLines(w.claimCaseId).at(-1)?.context).toEqual({ step: 'final_vote', section: 'hidden', ping_count: 0, answer_count: 0, family_visit_count: 0, family_answer_count: 0, family_health_answer_count: 0, family_account_inherited: false });
  });

  it('⭐ Story 6.32 (second review S9 / S15; AC8) — the approvers\' route carries a POPULATED family account (the cause DECRYPTED), and its line counts it — ⛔ a value', async () => {
    const w = await claimAt('verifier_approved');
    const [n] = await neighbours(w, [true]);
    await put(w, n!, 'has_died', { codes: ['died'] });
    // a COMPLETED full visit by ANOTHER inspector (⛔ the reader's own — the PM25 (c) hide), its answers saved while it was
    // open (0189's guard), as the superuser: the letter and a REAL ciphertext cause
    const gid = randomUUID();
    const s = await openScopeTx(deps, w.pariwarId);
    let uploadId: string;
    try {
      ({ uploadId } = await insertDeathCertificate(s, w.pariwarId, w.claimCaseId));
      await closeScopeTx(s, true);
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
    await td.pool.query(
      `INSERT INTO claim_ground_inspections (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
         inspector_actor_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'initial', 'family_residence', $5, now(), 'scheduled')`,
      [gid, w.claimCaseId, w.pariwarId, DISTRICT, randomUUID()],
    );
    await td.pool.query(
      `INSERT INTO claim_ground_inspection_questionnaires (pariwar_id, claim_case_id, ground_inspection_id, questionnaire_version_id) VALUES ($1, $2, $3, 'ground_inspection.v1')`,
      [w.pariwarId, w.claimCaseId, gid],
    );
    const cause = await encryptGroundInspectionField(JSON.stringify(['old_age']), w.pariwarId, deps.encryption);
    await td.pool.query(
      `INSERT INTO claim_ground_inspection_answers (pariwar_id, claim_case_id, ground_inspection_id, question_key, value_codes, value_ciphertext, saved_by_actor_id)
       VALUES ($1, $2, $3, 'head_letter', ARRAY['collected'], NULL, 'inspector'), ($1, $2, $3, 'death_cause', NULL, $4, 'inspector')`,
      [w.pariwarId, w.claimCaseId, gid, cause],
    );
    await td.pool.query(
      `UPDATE claim_ground_inspections SET status = 'completed', completed_at = clock_timestamp(), original_certificate_verdict = 'matches',
         compared_certificate_upload_id = $2, death_date_ciphertext = 'enc:v1:d', death_date_source = 'family_statement', death_date_index = 'idx:d'
       WHERE ground_inspection_id = $1`,
      [gid, uploadId!],
    );
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const res = await pa.client.inject({ method: 'GET', url: url(w.pariwarId, w.claimCaseId) });
    expect(res.statusCode, res.body).toBe(200);
    const family = (res.json() as { peerMesh: { status: string; familyAccount: { groundInspectionId: string; answers: { questionKey: string; value: Json }[] }[] } }).peerMesh;
    expect(family.status).toBe('present');
    expect(family.familyAccount).toHaveLength(1);
    expect(family.familyAccount[0]!.groundInspectionId).toBe(gid);
    expect(family.familyAccount[0]!.answers.map((a) => [a.questionKey, a.value])).toEqual([
      ['head_letter', { kind: 'codes', codes: ['collected'], labels: ['Yes — I collected the letter'] }],
      ['death_cause', { kind: 'codes', codes: ['old_age'], labels: ['Old age'] }],
    ]);
    const line = readLines(w.claimCaseId).at(-1);
    expect(line?.context).toEqual({
      step: 'final_vote',
      section: 'present',
      ping_count: 1,
      answer_count: 1,
      family_visit_count: 1,
      family_answer_count: 2,
      family_health_answer_count: 1,
      family_account_inherited: false,
    });
    expect(JSON.stringify(line)).not.toMatch(/old_age|Old age|collected/);
  });

  it('⭐ Story 6.32 (second review S22, BigDev: "S22 A") — a refile approved on the INHERITED inspection points at the source claim; ⛔ its answers; the line flags it', async () => {
    // the source: the same death, with a COMPLETED FULL visit whose letter was recorded while it was open (in the answer
    // window — 0189's guard), THEN refused `-239` (the standing-refusal rule reads the live decision, ⛔ the claim's state)
    const src = await claimAt('verifier_review');
    const s = await openScopeTx(deps, src.pariwarId);
    let uploadId: string;
    try {
      ({ uploadId } = await insertDeathCertificate(s, src.pariwarId, src.claimCaseId));
      await closeScopeTx(s, true);
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
    const gid = randomUUID();
    await td.pool.query(
      `INSERT INTO claim_ground_inspections (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
         inspector_actor_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'initial', 'family_residence', $5, now(), 'scheduled')`,
      [gid, src.claimCaseId, src.pariwarId, DISTRICT, randomUUID()],
    );
    await td.pool.query(
      `INSERT INTO claim_ground_inspection_questionnaires (pariwar_id, claim_case_id, ground_inspection_id, questionnaire_version_id) VALUES ($1, $2, $3, 'ground_inspection.v1')`,
      [src.pariwarId, src.claimCaseId, gid],
    );
    await td.pool.query(
      `INSERT INTO claim_ground_inspection_answers (pariwar_id, claim_case_id, ground_inspection_id, question_key, value_codes, saved_by_actor_id)
       VALUES ($1, $2, $3, 'head_letter', ARRAY['collected'], 'inspector')`,
      [src.pariwarId, src.claimCaseId, gid],
    );
    await td.pool.query(
      `UPDATE claim_ground_inspections SET status = 'completed', completed_at = clock_timestamp(), original_certificate_verdict = 'matches',
         compared_certificate_upload_id = $2, death_date_ciphertext = 'enc:v1:d', death_date_source = 'family_statement', death_date_index = 'idx:d'
       WHERE ground_inspection_id = $1`,
      [gid, uploadId!],
    );
    await td.pool.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'denied', 'post_death_nominee_change', $3, 'Anita (District Admin)')`,
      [src.claimCaseId, src.pariwarId, randomUUID()],
    );
    const refile = await claimAt('verifier_approved', src.pariwarId, src.deceased);
    const pa = await staff(refile.pariwarId, 'pariwar_admin');
    const res = await pa.client.inject({ method: 'GET', url: url(refile.pariwarId, refile.claimCaseId) });
    expect(res.statusCode, res.body).toBe(200);
    const section = (res.json() as { peerMesh: Json }).peerMesh;
    expect(section).toEqual({ status: 'empty', familyAccount: [], familyAccountInheritedFromClaimId: src.claimCaseId.toLowerCase() });
    // ⛔ the source's answers on the wire
    expect(res.body).not.toMatch(/collected|head_letter/);
    expect(readLines(refile.claimCaseId).at(-1)?.context).toMatchObject({ section: 'empty', family_visit_count: 0, family_account_inherited: true });
    // (a claim with ⛔ inheritance answers `null` — the `empty` leg above pins it exactly)

    // ⭐ patch review — the refile gains a completed FULL visit of its OWN (the source still standing): its gate is met by its
    // own visit, so ⛔ pointer (the console's ground-inspection section, the warnings and the queue apply the same condition);
    // its own account is shown
    const own = randomUUID();
    await td.pool.query(
      `INSERT INTO claim_ground_inspections (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
         inspector_actor_id, scheduled_at, status, completed_at, original_certificate_verdict, compared_certificate_upload_id, death_date_ciphertext,
         death_date_source, death_date_index)
       VALUES ($1, $2, $3, $4, 'corroboration', 'family_residence', $5, now(), 'completed', clock_timestamp(), 'matches', $6, 'enc:v1:d',
         'family_statement', 'idx:d')`,
      [own, refile.claimCaseId, refile.pariwarId, DISTRICT, randomUUID(), uploadId!],
    );
    const again = await pa.client.inject({ method: 'GET', url: url(refile.pariwarId, refile.claimCaseId) });
    expect(again.statusCode, again.body).toBe(200);
    const s2 = (again.json() as { peerMesh: { familyAccount: unknown[]; familyAccountInheritedFromClaimId: string | null } }).peerMesh;
    expect(s2.familyAccountInheritedFromClaimId).toBeNull();
    expect(s2.familyAccount).toHaveLength(1);
    expect(readLines(refile.claimCaseId).at(-1)?.context).toMatchObject({ family_visit_count: 1, family_account_inherited: false });
  });

  it('a broken answer ciphertext ⇒ THAT answer `unavailable`, the rest shown', async () => {
    const w = await claimAt('verifier_approved');
    const [n] = await neighbours(w, [true]);
    await put(w, n!, 'has_died', { codes: ['died'] });
    await put(w, n!, 'death_date', { date: '2026-10-01' });
    await td.pool.query(`UPDATE claim_peer_mesh_reply_answers SET value_ciphertext = 'enc:v1:garbage' WHERE claim_case_id = $1 AND question_key = 'death_date'`, [
      w.claimCaseId,
    ]);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const answers = pingsOf((await read(pa, w)).body)[0]!.reply!.answers;
    expect(answers.find((a) => a.questionKey === 'death_date')?.value).toEqual({ kind: 'unavailable' });
    expect(answers.find((a) => a.questionKey === 'has_died')?.value).toMatchObject({ kind: 'codes', codes: ['died'] });
  });

  it('AC8 — the per-answer flags: `not_died` ⇒ `true`, `died` ⇒ `false`, a non-warning question ⇒ `false`; the warnings read forced to fail ⇒ `null`', async () => {
    const w = await claimAt('verifier_approved');
    const [a, b] = await neighbours(w, [true, true]);
    await put(w, a!, 'has_died', { codes: ['not_died'] });
    await put(w, b!, 'has_died', { codes: ['died'] });
    await put(w, b!, 'how_known', { codes: ['family_told'] });
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const flagsOf = (pings: Ping[]) =>
      Object.fromEntries(pings.flatMap((p) => (p.reply?.answers ?? []).map((x) => [`${p.pingId === a!.ping ? 'a' : 'b'}.${x.questionKey}`, x.warningFlag])));
    expect(flagsOf(pingsOf((await read(pa, w)).body))).toEqual({ 'a.has_died': true, 'b.has_died': false, 'b.how_known': false });
    fault.warnings = true;
    try {
      expect(flagsOf(pingsOf((await read(pa, w)).body))).toEqual({ 'a.has_died': null, 'b.has_died': null, 'b.how_known': false });
    } finally {
      fault.warnings = false;
    }
  });
});
