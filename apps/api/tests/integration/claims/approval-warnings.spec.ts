// Story 6.23a — the nominee-change WARNINGS through HTTP (live DB :5433; Task 10; AC3–AC7, NW12). Drives the REAL
// admin chain (passkey session + a role grant + scope):
//   · AC3 — the 409 codes with `details` (`warning_reason_required` + kinds / `…ungrounded` / `…unavailable`), the 400
//           for a warning reason without a note, the approval keeping its REAL reason + the record row, the audit line
//           carrying `approval_warning_kinds` and the code (⛔ never the note);
//   · AC4 — a revise of a warned approval ⇒ 409 `not_revisable`, `details.reason: 'warning_approval_final'`;
//   · AC5 — the console section: kinds, `reasonOptions` (the generic, `null` provenance), `reviseBlocked`,
//           `uncoveredSinceApproval`, `viewerCanRecordLateReason`, `lateKeysUncoveredForViewer`;
//   · AC7 — NW14's route: the District Admin's panel stays MOUNTED after a Pariwar Admin records the only late reason
//           (`uncoveredSinceApproval` 0, `lateKeysUncoveredForViewer` > 0) and their own NW14 succeeds; a second answer
//           ⇒ `nothing_uncovered`; a missing note ⇒ 400; another district ⇒ 403; a tampered (non-human) session ⇒ 404;
//           the audit lines carry codes and counts only.
// ⚠ Own-committing seeds; a FRESH Pariwar per test (Trap 18); dates RELATIVE to now (Trap 5).

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';
import type { VerifierConsolePacket } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { ensureAcceptedDeathCertificate, seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const istDaysAgo = (n: number) => cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date()), -n);
const GENERIC = 'warnings_reviewed';

describe.skipIf(!hasDatabase)('Story 6.23a — the nominee-change warnings through HTTP (:5433)', { timeout: 30000 }, () => {
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
    const email = `aw-${randomUUID()}@example.test`;
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

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    await td.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dim, value],
    );
  }

  async function districtAdmin(pariwarId: string, district = DISTRICT) {
    const a = await authenticate('Anita (District Admin)');
    await grant(a.userId, pariwarId, 'district_admin', 'district', district);
    return a;
  }

  async function pariwarAdmin(pariwarId: string) {
    const a = await authenticate('Prakash (Pariwar Admin)');
    await grant(a.userId, pariwarId, 'pariwar_admin', 'pariwar', pariwarId);
    return a;
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

  /**
   * A claim in `verification_in_progress` whose deceased declared a nominee at each of `declaredAt` (rank 1, a new
   * version each time), then the fixture's accepted certificate (tomorrow), its all-`stands` determination, a passing
   * name check and a contact record.
   */
  async function seedWorld(declaredAt: Date[]): Promise<{ pariwarId: string; claimCaseId: string; memberId: string }> {
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
      for (const at of declaredAt) {
        const row = {
          rank: 1 as const,
          splitPct: 100 as const,
          relationship: 'spouse',
          nameCiphertext: 'enc:v1:nominee-name',
          mobileCiphertext: 'enc:v1:nominee-mobile',
          addressCiphertext: null,
        };
        await nominee.replaceMemberNominees(s.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
        await nominee.appendMemberDeclarationVersions(s.tx, {
          memberId: mid,
          pariwarId: pid,
          plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(s.tx, pid, mid), [1]),
          nominees: [row],
          recordedAt: at,
          eventVersion: null,
        });
      }
      const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: pid,
          deceasedMemberId: mid,
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
    });
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    return { pariwarId, claimCaseId, memberId };
  }

  /** Re-accept the certificate with `date` and record a determination whose marks agree with it (D6). */
  async function redetermine(pariwarId: string, claimCaseId: string, date: string): Promise<void> {
    await inScope(pariwarId, async (s) => {
      const pid = ids.pariwarId(pariwarId);
      const cid = ids.claimId(claimCaseId);
      const reviewId = await ensureAcceptedDeathCertificate(deps, s, pariwarId, claimCaseId, { date });
      const row = await claim.getClaimCase(s.tx, pid, cid);
      const versions = await nominee.listNomineeDeclarationVersions(s.tx, pid, row!.deceasedMemberId);
      const live = await claim.getLiveNomineeDetermination(s.tx, pid, cid);
      await claim.recordNomineeDetermination(s.client, {
        claimCaseId: cid,
        pariwarId: pid,
        certificateDate: date,
        certificateDateCiphertext: 'enc:v1:certificate-date',
        noteCiphertext: 'enc:v1:determination-note',
        marks: versions.map((v) => ({
          versionId: v.versionId,
          mark: claim.versionStandsAt(v.effectiveAt, date) ? ('stands' as const) : ('discarded' as const),
        })),
        watermark: { rank1: Math.max(...versions.filter((v) => v.rank === 1).map((v) => v.versionNo)), rank2: null },
        expectedLiveDeterminationId: (live?.row.determinationId as string | undefined) ?? null,
        deathCertificateReviewId: reviewId,
        certificateDateCheck: 'match',
        actorId: randomUUID(),
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
    });
  }

  const base = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const decisionUrl = (p: string, c: string) => `${base(p, c)}/verifier-decision`;
  const lateUrl = (p: string, c: string) => `${decisionUrl(p, c)}/late-warning-reason`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; details?: Json } }).error;
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.claim_case_id === claimCaseId);

  async function consoleOf(client: Client, p: string, c: string): Promise<VerifierConsolePacket['approvalWarnings']> {
    const res = await client.inject({ method: 'GET', url: `${base(p, c)}/verifier-console` });
    expect(res.statusCode).toBe(200);
    return (res.json() as { packet: VerifierConsolePacket }).packet.approvalWarnings;
  }

  async function records(claimCaseId: string): Promise<Json[]> {
    return (await td.pool.query(`SELECT * FROM claim_warning_approvals WHERE claim_case_id = $1 ORDER BY recorded_at`, [claimCaseId])).rows as Json[];
  }

  const approveBody = { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'The family confirmed it in person.' };

  // ── AC3 / AC5 ──────────────────────────────────────────────────────────────────────────────────────────────────
  it('⭐ AC5 + AC3 — the console says it BEFORE the button does; ⛔ no warning reason ⇒ 409 with the kinds; with one ⇒ approved, its REAL reason kept, ONE record row, the audit names the kinds and the code', async () => {
    const w = await seedWorld([daysAgo(30)]);
    const { client } = await districtAdmin(w.pariwarId);
    const section = await consoleOf(client, w.pariwarId, w.claimCaseId);
    expect(section).toMatchObject({
      available: true,
      kinds: ['recent_nominee_change'],
      postDeath: 'evaluated',
      uncoveredSinceApproval: 0,
      reviseBlocked: null,
      viewerCanRecordLateReason: false,
    });
    expect(section.reasonOptions[0]).toMatchObject({ code: GENERIC, reasonId: null, addedByDisplay: null, addedAt: null });

    const refused = await client.inject({ method: 'POST', url: decisionUrl(w.pariwarId, w.claimCaseId), payload: approveBody });
    expect(refused.statusCode).toBe(409);
    expect(errOf(refused.body)).toMatchObject({
      code: 'verifier_decision.warning_reason_required',
      details: { kinds: ['recent_nominee_change'], missing: 'reason' },
    });
    expect(auditsFor('admin_claim.decision_rejected', w.claimCaseId)[0]?.context).toMatchObject({
      approval_warning_kinds: ['recent_nominee_change'],
    });

    const ok = await client.inject({
      method: 'POST',
      url: decisionUrl(w.pariwarId, w.claimCaseId),
      payload: { ...approveBody, warning_reason_code: GENERIC },
    });
    expect(ok.statusCode).toBe(201);
    expect((ok.json() as Json).reason_code).toBe('r5_d_natural_death');
    const rows = await records(w.claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ step: 'district_admin_approval', reason_code: GENERIC, reason_id: null, note_ciphertext: null });
    const [line] = auditsFor('admin_claim.verifier_approved', w.claimCaseId);
    expect(line?.context).toMatchObject({ approval_warning_kinds: ['recent_nominee_change'], warning_reason_code: GENERIC });
    expect(JSON.stringify(line)).not.toContain('confirmed it in person');

    // AC5 — after the warned approval, the revise control is REPLACED by its words.
    expect((await consoleOf(client, w.pariwarId, w.claimCaseId)).reviseBlocked).toBe('warning_approval_final');
  });

  it('AC3 — `…ungrounded` with ⛔ no warning; `…unavailable` for an unknown code; a 400 for a warning reason without a note or on a deny', async () => {
    const quiet = await seedWorld([daysAgo(300)]);
    const { client } = await districtAdmin(quiet.pariwarId);
    const ungrounded = await client.inject({
      method: 'POST',
      url: decisionUrl(quiet.pariwarId, quiet.claimCaseId),
      payload: { ...approveBody, warning_reason_code: GENERIC },
    });
    expect(ungrounded.statusCode).toBe(409);
    expect(errOf(ungrounded.body).code).toBe('verifier_decision.warning_reason_ungrounded');

    const warned = await seedWorld([daysAgo(30)]);
    const da = await districtAdmin(warned.pariwarId);
    const unavailable = await da.client.inject({
      method: 'POST',
      url: decisionUrl(warned.pariwarId, warned.claimCaseId),
      payload: { ...approveBody, warning_reason_code: 'awr_00000000' },
    });
    expect(unavailable.statusCode).toBe(409);
    expect(errOf(unavailable.body).code).toBe('verifier_decision.warning_reason_unavailable');
    for (const payload of [
      { outcome: 'approved', reason_code: 'r5_d_natural_death', warning_reason_code: GENERIC },
      { outcome: 'denied', reason_code: 'other', rationale: 'x', warning_reason_code: GENERIC },
    ]) {
      const bad = await da.client.inject({ method: 'POST', url: decisionUrl(warned.pariwarId, warned.claimCaseId), payload });
      expect(bad.statusCode).toBe(400);
    }
    expect(await records(warned.claimCaseId)).toHaveLength(0);
  });

  it('AC4 — a revise of a warned approval ⇒ 409 `not_revisable`, `details.reason: warning_approval_final`', async () => {
    const w = await seedWorld([daysAgo(30)]);
    const { client } = await districtAdmin(w.pariwarId);
    expect(
      (await client.inject({ method: 'POST', url: decisionUrl(w.pariwarId, w.claimCaseId), payload: { ...approveBody, warning_reason_code: GENERIC } })).statusCode,
    ).toBe(201);
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'claim_decision_revise' } });
    expect(req.statusCode).toBe(200);
    await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    const res = await client.inject({
      method: 'POST',
      url: `${decisionUrl(w.pariwarId, w.claimCaseId)}/revise`,
      payload: { outcome: 'approved', reason_code: 'r8_90pct_met', rationale: 'new words' },
    });
    expect(res.statusCode).toBe(409);
    expect(errOf(res.body)).toMatchObject({ code: 'verifier_decision.not_revisable', details: { reason: 'warning_approval_final' } });
  });

  // ── AC7 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  it('⭐ AC7 — a late warning: the panel is offered; a Pariwar Admin answers; the District Admin\'s panel STAYS mounted and their answer lands; a repeat ⇒ nothing_uncovered', async () => {
    const w = await seedWorld([daysAgo(400), daysAgo(200)]);
    const da = await districtAdmin(w.pariwarId);
    expect((await da.client.inject({ method: 'POST', url: decisionUrl(w.pariwarId, w.claimCaseId), payload: approveBody })).statusCode).toBe(201);
    await redetermine(w.pariwarId, w.claimCaseId, istDaysAgo(300)); // the 200-day version is now post-death

    const before = await consoleOf(da.client, w.pariwarId, w.claimCaseId);
    expect(before).toMatchObject({
      kinds: ['post_death_version'],
      uncoveredSinceApproval: 1,
      reviseBlocked: 'warning_approval_final',
      viewerCanRecordLateReason: true,
      lateKeysUncoveredForViewer: 1,
    });

    const pa = await pariwarAdmin(w.pariwarId);
    const paRes = await pa.client.inject({
      method: 'POST',
      url: lateUrl(w.pariwarId, w.claimCaseId),
      payload: { warning_reason_code: GENERIC, note: 'The certificate was re-read; the change is after the date.' },
    });
    expect(paRes.statusCode).toBe(201);
    expect(paRes.json()).toMatchObject({ covered_key_count: 1, kinds: ['post_death_version'] });

    // ⭐ `-279` A1 — covered for everyone else, ⛔ by the District Admin's own record ⇒ the panel stays.
    const after = await consoleOf(da.client, w.pariwarId, w.claimCaseId);
    expect(after).toMatchObject({ uncoveredSinceApproval: 0, viewerCanRecordLateReason: true, lateKeysUncoveredForViewer: 1 });

    const daRes = await da.client.inject({
      method: 'POST',
      url: lateUrl(w.pariwarId, w.claimCaseId),
      payload: { warning_reason_code: GENERIC, note: 'I approved before the re-review; the change stands as noted.' },
    });
    expect(daRes.statusCode).toBe(201);
    const rows = await records(w.claimCaseId);
    expect(rows.filter((r) => r.step === 'district_admin_late_reason')).toHaveLength(2);
    expect((await consoleOf(da.client, w.pariwarId, w.claimCaseId)).viewerCanRecordLateReason).toBe(false);

    const again = await da.client.inject({
      method: 'POST',
      url: lateUrl(w.pariwarId, w.claimCaseId),
      payload: { warning_reason_code: GENERIC, note: 'once more' },
    });
    expect(again.statusCode).toBe(409);
    expect(errOf(again.body).code).toBe('verifier_decision.late_warning_reason.nothing_uncovered');

    // Codes and counts only — ⛔ never the note.
    const [recorded] = auditsFor('admin_claim.late_warning_reason_recorded', w.claimCaseId);
    expect(recorded?.context).toMatchObject({ warning_reason_code: GENERIC, covered_key_count: 1, kinds: ['post_death_version'] });
    expect(JSON.stringify(td.auditSink.ofType('admin_claim.late_warning_reason_recorded'))).not.toContain('re-read');
    expect(auditsFor('admin_claim.late_warning_reason_rejected', w.claimCaseId)[0]?.context).toMatchObject({ refusal: 'nothing_uncovered' });
  });

  it('AC7 — a missing note ⇒ 400; a District Admin of ANOTHER district ⇒ 403; a non-human (tampered) session ⇒ 404; ⛔ no District Admin approval ⇒ 409', async () => {
    const w = await seedWorld([daysAgo(400), daysAgo(200)]);
    const da = await districtAdmin(w.pariwarId);
    // ⛔ No approval yet.
    const none = await da.client.inject({ method: 'POST', url: lateUrl(w.pariwarId, w.claimCaseId), payload: { warning_reason_code: GENERIC, note: 'n' } });
    expect(none.statusCode).toBe(409);
    expect(errOf(none.body).code).toBe('verifier_decision.late_warning_reason.no_district_admin_approval');

    expect((await da.client.inject({ method: 'POST', url: lateUrl(w.pariwarId, w.claimCaseId), payload: { warning_reason_code: GENERIC } })).statusCode).toBe(400);

    const other = await districtAdmin(w.pariwarId, OTHER_DISTRICT);
    expect(
      (await other.client.inject({ method: 'POST', url: lateUrl(w.pariwarId, w.claimCaseId), payload: { warning_reason_code: GENERIC, note: 'n' } })).statusCode,
    ).toBe(403);
    // The console agrees: the other district is ⛔ not offered the panel (it cannot even read the console).
    expect((await other.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/verifier-console` })).statusCode).toBe(403);

    const tampered = await districtAdmin(w.pariwarId);
    await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [
      randomUUID(),
      tampered.userId,
    ]);
    expect(
      (await tampered.client.inject({ method: 'POST', url: lateUrl(w.pariwarId, w.claimCaseId), payload: { warning_reason_code: GENERIC, note: 'n' } })).statusCode,
    ).toBe(404);

    // A cross-Pariwar claim id ⇒ the district cannot be derived ⇒ 403 (⛔ existence never leaks).
    expect(
      (await da.client.inject({ method: 'POST', url: lateUrl(w.pariwarId, randomUUID()), payload: { warning_reason_code: GENERIC, note: 'n' } })).statusCode,
    ).toBe(403);
    expect(await records(w.claimCaseId)).toHaveLength(0);
  });
});
