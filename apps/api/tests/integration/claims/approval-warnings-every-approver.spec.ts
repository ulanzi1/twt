// Story 6.23b — EVERY APPROVER gives a warning reason, and a LATE warning WAITS for the District Admin — through HTTP
// (live DB :5433; Testing → API; AC2–AC8, AC10). Drives the REAL admin chain (passkey session + a role grant + scope):
//   · the 409 codes and `details` through EACH route that reaches a later writer — the cycle-freeze decision (approve,
//     resolve to approved), the R9 vote, R9 finalize (step-up), the "no correction needed" approve, the Super Admin's
//     escalation decision — with each route's own prefix (`cycle_freeze.` / `r9_voting.` / `closure.`, RD5);
//   · the 400s the contracts own (a code with ⛔ no note; a code on a deny / close; D27's unpaired note);
//   · D27's note ENCRYPTED as the decision rationale when warned (decrypted and compared — ⛔ the constant);
//   · the read DTOs — the warnings block + `reason_options` on the pending list, the R9 panel (with each approve vote's
//     `covers_current_warnings`), the closure queue (`null` on a closure request — RD20) and the Super Admin's detail;
//     the correction queue's late-warning row (EA10);
//   · Trap 15 — a FAILED warnings read (a fault seam on the reader) fails CLOSED: `available: false`, ⛔ never a 500;
//   · AC7 — ONE bulk statement: the pending list's REAL statement count does ⛔ not grow from 1 to 10 warned claims;
//   · EA9 / RD15 — the audit lines carry kinds and codes (kinds OMITTED when unknown), the WAIT's counts.
// ⚠ Own-committing seeds; a FRESH Pariwar per test; dates RELATIVE to now (Trap 16).

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// ⭐ Trap 15's fault seam — the handlers' warnings reads, made to fail ON DEMAND (a real SQL error first, so the SAVEPOINT
// path is exercised). Off by default: every other test runs the real readers.
const fault = vi.hoisted(() => ({ on: false }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const { sql } = await import('drizzle-orm');
  const failing =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      if (fault.on) {
        const db = a[0] as { execute: (q: unknown) => Promise<unknown> };
        await db.execute(sql`SELECT 1/0`);
      }
      return fn(...a);
    };
  // EA10's late arm runs INSIDE the domain read — reached through a db whose `execute` turns that arm's own statement
  // into a real SQL error (the domain's SAVEPOINT must keep the request's transaction usable).
  type Exec = { execute: (q: unknown) => Promise<unknown>; dialect: { sqlToQuery: (q: unknown) => { sql: string } } };
  const listClaimsUnderCorrection: typeof actual.claim.listClaimsUnderCorrection = (db, pariwarId, opts) => {
    if (!fault.on) return actual.claim.listClaimsUnderCorrection(db, pariwarId, opts);
    const failingDb = new Proxy(db as unknown as Exec, {
      get(target, prop, receiver) {
        if (prop !== 'execute') return Reflect.get(target, prop, receiver);
        return (q: unknown) =>
          target.dialect.sqlToQuery(q).sql.includes('discarded_member_version_ids') ? target.execute(sql`SELECT 1/0`) : target.execute(q);
      },
    });
    return actual.claim.listClaimsUnderCorrection(failingDb as unknown as Parameters<typeof actual.claim.listClaimsUnderCorrection>[0], pariwarId, opts);
  };
  return {
    ...actual,
    claim: {
      ...actual.claim,
      readClaimApprovalWarnings: failing(actual.claim.readClaimApprovalWarnings),
      readClaimApprovalWarningsBulk: failing(actual.claim.readClaimApprovalWarningsBulk),
      listClaimsUnderCorrection,
    },
  };
});

/** Run `fn` with every warnings read failing (Trap 15). */
async function withFault<T>(fn: () => Promise<T>): Promise<T> {
  fault.on = true;
  try {
    return await fn();
  } finally {
    fault.on = false;
  }
}

const UNAVAILABLE = {
  available: false,
  kinds: [],
  post_death: 'awaiting_determination',
  waiting_for_district_admin: false,
  own_reason_excluded: false,
};

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { decryptTrusteeRationale } from '../../../src/modules/claims/state-trustee-decision-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { ensureAcceptedDeathCertificate, ensureClaimContact, ensureGroundInspection, seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const istDaysAgo = (n: number) => cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date()), -n);
const GENERIC = 'warnings_reviewed';
const R9_CLAUSE = 'niy.special-death.r9';

describe.skipIf(!hasDatabase)('Story 6.23b — every approver, through HTTP (:5433)', { timeout: 30000 }, () => {
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

  // ── Actors ────────────────────────────────────────────────────────────────────────────────────────────────────

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `aw23b-${randomUUID()}@example.test`;
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

  async function staff(pariwarId: string, role: 'district_admin' | 'pariwar_admin' | 'super_admin') {
    const display = { district_admin: 'Anita (District Admin)', pariwar_admin: 'Prakash (Pariwar Admin)', super_admin: 'Sushila (Super Admin)' }[role];
    const a = await authenticate(display);
    const [dim, value] = role === 'district_admin' ? ['district', DISTRICT] : role === 'super_admin' ? ['global', null] : ['pariwar', pariwarId];
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      a.userId,
      pariwarId,
      role,
      dim,
      value,
    ]);
    await a.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
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

  // ── World ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * A claim in `verification_in_progress` whose deceased declared a nominee at each of `declaredAt` (rank 1, a new version
   * each time), with the fixture's accepted certificate (tomorrow), its all-`stands` determination, a passing name check
   * and a contact record — 6.23a's API world, in a FRESH Pariwar unless one is given.
   */
  async function seedWorld(
    declaredAt: Date[],
    pariwarId: string = randomUUID(),
    // Story 6.26b (RD22) — the accepted certificate's register check, threaded to the fixture BEFORE the determination.
    opts: { registerCheck?: 'matches' | 'does_not_match' | 'could_not_check' } = {},
  ): Promise<{ pariwarId: string; claimCaseId: string }> {
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
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId, opts.registerCheck ? { registerCheck: opts.registerCheck } : {});
    return { pariwarId, claimCaseId };
  }

  /**
   * Re-accept the certificate with `date`, record a determination whose marks agree with it (D6), and — RD19 — re-record
   * a PASSING name check through the REAL writer against the existing accounts (the new determination makes the old one
   * stale). ⚠ ⛔ Not `seedNomineeNameCheck`: it re-accepts the certificate at ITS default date (tomorrow) and would undo
   * the redetermination. The fixture contact record's claimant is re-pointed at a version in force at the new date (as a
   * helpline correction would), or the contact check — AFTER the gate — refuses once the wait clears.
   */
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
      const effective = await claim.getEffectiveNomineeDeclaration(s.tx, pid, cid);
      if (effective.status !== 'effective') throw new Error('fixture: the redetermination must leave an effective declaration');
      await ensureClaimContact(s, pariwarId, claimCaseId); // tops the fixture record up for the newly effective version
      await s.client.query('UPDATE claim_contacts SET claimant_nominee_version_id = $2 WHERE claim_case_id = $1', [
        claimCaseId,
        effective.entries[0]!.versionId,
      ]);
      const stamps = await s.client.query<{ account_rank: number; updated_at: Date }>(
        'SELECT account_rank, updated_at FROM claim_nominee_bank_accounts WHERE pariwar_id = $1 AND claim_case_id = $2 ORDER BY account_rank',
        [pariwarId, claimCaseId],
      );
      await claim.recordNomineeNameCheck(s.client, {
        claimCaseId: cid,
        pariwarId: pid,
        nomineeDeclarationToken: effective.token,
        accounts: stamps.rows.map((r) => ({
          accountRank: r.account_rank as 1 | 2,
          accountUpdatedAt: new Date(r.updated_at).toISOString(),
          verdict: 'matches' as const,
          clericalReason: null,
        })),
        actorId: randomUUID(),
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
    });
  }

  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const pendingUrl = (p: string) => `/api/v1/p/${p}/admin/cycle-freeze/pending`;
  const cycleDecisionUrl = (p: string) => `/api/v1/p/${p}/admin/cycle-freeze/decision`;
  const r9Url = (p: string, c: string) => `/api/v1/p/${p}/admin/r9-voting/${c}`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; message: string; details?: Json } }).error;
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => {
      const ctx = e.context as Json | undefined;
      return ctx?.claim_case_id === claimCaseId || e.resourceLocator === `claim:${claimCaseId}`;
    });
  const records = async (claimCaseId: string) =>
    (await td.pool.query(`SELECT * FROM claim_warning_approvals WHERE claim_case_id = $1 ORDER BY recorded_at`, [claimCaseId])).rows as Json[];

  const daApproveBody = { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' };

  /** The District Admin approves (with the generic warning reason when one shows). */
  async function daApprove(da: { client: Client }, w: { pariwarId: string; claimCaseId: string }, warned: boolean) {
    const res = await da.client.inject({
      method: 'POST',
      url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: warned ? { ...daApproveBody, warning_reason_code: GENERIC } : daApproveBody,
    });
    expect(res.statusCode, res.body).toBe(201);
  }

  /** In life the approval and a later redetermination are separate transactions; keep the fixture's order strict. */
  async function backdateApproval(claimCaseId: string): Promise<void> {
    await td.pool.query(
      `UPDATE claim_verifier_decisions SET decided_at = decided_at - interval '1 minute' WHERE claim_case_id = $1 AND outcome = 'approved'`,
      [claimCaseId],
    );
  }

  /** The District Admin approved with ⛔ no warning; a re-review to 250 days back makes the 200-day version post-death.
   *  ⭐ Story 6.26b (RD19 (i)) — and moves the certificate away from the fixture inspection's family date (tomorrow) ⇒ a
   *  SECOND late key, `inspection_death_date_differs` (the correct behaviour): every count below is 2. */
  async function lateWarnedWorld() {
    const w = await seedWorld([daysAgo(400), daysAgo(200)]);
    const da = await staff(w.pariwarId, 'district_admin');
    await daApprove(da, w, false);
    await backdateApproval(w.claimCaseId);
    await redetermine(w.pariwarId, w.claimCaseId, istDaysAgo(250));
    return { ...w, da };
  }

  type PendingItem = { claim_case_id: string; approval_warnings: Json };
  async function pendingOf(client: Client, pariwarId: string) {
    const res = await client.inject({ method: 'GET', url: pendingUrl(pariwarId) });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { ready_to_freeze: PendingItem[]; escalated: PendingItem[]; voted_pending_commit: PendingItem[]; reason_options: Json[] };
    return { body, all: [...body.ready_to_freeze, ...body.escalated, ...body.voted_pending_commit] };
  }

  // ── The cycle-freeze decision (EA3, EA4) ───────────────────────────────────────────────────────────────────────
  describe('the cycle-freeze pending list and decision', () => {
    it('⭐ AC4/AC7 — the pending case SHOWS the warnings + the reasons; ⛔ code ⇒ 409; code ⛔ note ⇒ 400; with both ⇒ 201, ONE `final_vote` row, the audit names kinds + code', async () => {
      const w = await seedWorld([daysAgo(30)]);
      const da = await staff(w.pariwarId, 'district_admin');
      await daApprove(da, w, true);
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const { body, all } = await pendingOf(pa.client, w.pariwarId);
      expect(all.find((i) => i.claim_case_id === w.claimCaseId)?.approval_warnings).toEqual({
        available: true,
        kinds: ['recent_nominee_change'],
        post_death: 'evaluated',
        waiting_for_district_admin: false,
        own_reason_excluded: false,
      });
      expect(body.reason_options[0]).toMatchObject({ code: GENERIC, reasonId: null, addedByDisplay: null, addedAt: null });

      const bare = await pa.client.inject({ method: 'POST', url: cycleDecisionUrl(w.pariwarId), payload: { claim_case_id: w.claimCaseId, action: 'approve' } });
      expect(bare.statusCode).toBe(409);
      expect(errOf(bare.body)).toMatchObject({
        code: 'cycle_freeze.warning_reason_required',
        details: { kinds: ['recent_nominee_change'], missing: 'reason' },
      });
      expect(errOf(bare.body).message).toMatch(/not refused/);
      expect(auditsFor('admin_cycle_freeze.rejected', w.claimCaseId).at(-1)?.context).toMatchObject({
        approval_warning_kinds: ['recent_nominee_change'],
        warning_reason_code: null,
      });
      const noNote = await pa.client.inject({
        method: 'POST',
        url: cycleDecisionUrl(w.pariwarId),
        payload: { claim_case_id: w.claimCaseId, action: 'approve', warning_reason_code: GENERIC },
      });
      expect(noNote.statusCode).toBe(400);
      const ok = await pa.client.inject({
        method: 'POST',
        url: cycleDecisionUrl(w.pariwarId),
        payload: { claim_case_id: w.claimCaseId, action: 'approve', warning_reason_code: GENERIC, rationale: 'Read every warning; approved.' },
      });
      expect(ok.statusCode, ok.body).toBe(201);
      expect((await records(w.claimCaseId)).map((r) => r.step)).toEqual(['district_admin_approval', 'final_vote']);
      const line = auditsFor('admin_cycle_freeze.vote', w.claimCaseId).at(-1)?.context as Json;
      expect(line).toMatchObject({ approval_warning_kinds: ['recent_nominee_change'], warning_reason_code: GENERIC });
      expect(JSON.stringify(line)).not.toMatch(/Read every warning/);
    });

    it('⭐ AC2 — the WAIT: the list says so, the vote 409s `late_warning_reason_required` (⛔ refused); the Pariwar Admin\'s OWN late reason ⇒ `own_reason_excluded`', async () => {
      const w = await lateWarnedWorld();
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      expect((await pendingOf(pa.client, w.pariwarId)).all.find((i) => i.claim_case_id === w.claimCaseId)?.approval_warnings).toMatchObject({
        kinds: ['post_death_version', 'inspection_death_date_differs'],
        waiting_for_district_admin: true,
        own_reason_excluded: false,
      });
      const payload = { claim_case_id: w.claimCaseId, action: 'approve', warning_reason_code: GENERIC, rationale: 'why' };
      const waits = await pa.client.inject({ method: 'POST', url: cycleDecisionUrl(w.pariwarId), payload });
      expect(waits.statusCode).toBe(409);
      expect(errOf(waits.body)).toMatchObject({
        code: 'cycle_freeze.late_warning_reason_required',
        details: { kinds: ['post_death_version', 'inspection_death_date_differs'], uncovered_count: 2, own_reason_excluded: false },
      });
      expect(errOf(waits.body).message).toMatch(/waiting for the District Admin.*It is not refused/);
      expect(auditsFor('admin_cycle_freeze.rejected', w.claimCaseId).at(-1)?.context).toMatchObject({ uncovered_count: 2, own_reason_excluded: false });

      // The Pariwar Admin answers the late warning THEMSELVES (6.23a NW14) — it does ⛔ not clear their own vote.
      await inScope(w.pariwarId, (s) =>
        claim.recordLateWarningReason(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          warningReasonCode: GENERIC,
          noteCiphertext: 'enc:v1:late',
          actorId: pa.userId,
          actorDisplay: 'Prakash (Pariwar Admin)',
        }),
      );
      expect((await pendingOf(pa.client, w.pariwarId)).all.find((i) => i.claim_case_id === w.claimCaseId)?.approval_warnings).toMatchObject({
        waiting_for_district_admin: true,
        own_reason_excluded: true,
      });
      const own = await pa.client.inject({ method: 'POST', url: cycleDecisionUrl(w.pariwarId), payload });
      expect(errOf(own.body)).toMatchObject({ code: 'cycle_freeze.late_warning_reason_required', details: { own_reason_excluded: true } });
      expect(errOf(own.body).message).toMatch(/cannot clear your own approval/);
    });

    // Code review 2026-10-06 (P26): `WarningReasonUnavailableError` and `WarningReasonUngroundedError` are fully
    // wired through `translateLaterApprovalWarningError` (shared by all four later-approver routes, Trap 7) but had
    // no test anywhere in this diff. Exercised once, here, is representative of all four prefixes.
    it('⭐ NW6 — a code with ⛔ no live warning ⇒ `warning_reason_ungrounded`; a stale/unknown code ⇒ `warning_reason_unavailable`', async () => {
      const quiet = await seedWorld([daysAgo(400)]);
      const qda = await staff(quiet.pariwarId, 'district_admin');
      await daApprove(qda, quiet, false);
      const qpa = await staff(quiet.pariwarId, 'pariwar_admin');
      const ungrounded = await qpa.client.inject({
        method: 'POST',
        url: cycleDecisionUrl(quiet.pariwarId),
        payload: { claim_case_id: quiet.claimCaseId, action: 'approve', warning_reason_code: GENERIC, rationale: 'why' },
      });
      expect(ungrounded.statusCode, ungrounded.body).toBe(409);
      expect(errOf(ungrounded.body).code).toBe('cycle_freeze.warning_reason_ungrounded');
      expect(errOf(ungrounded.body).message).toMatch(/approve it without a warning reason/);

      const w = await seedWorld([daysAgo(30)]);
      const da = await staff(w.pariwarId, 'district_admin');
      await daApprove(da, w, true);
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const unavailable = await pa.client.inject({
        method: 'POST',
        url: cycleDecisionUrl(w.pariwarId),
        payload: { claim_case_id: w.claimCaseId, action: 'approve', warning_reason_code: 'not_a_real_reason_code', rationale: 'why' },
      });
      expect(unavailable.statusCode, unavailable.body).toBe(409);
      expect(errOf(unavailable.body).code).toBe('cycle_freeze.warning_reason_unavailable');
      expect(errOf(unavailable.body).message).toMatch(/replaced or is not on the list/);
      // Neither refusal records a step.
      expect(await records(quiet.claimCaseId)).toEqual([]);
      expect((await records(w.claimCaseId)).map((r) => r.step)).toEqual(['district_admin_approval']);
    });

    it('AC3 — resolving an escalation to APPROVED needs its own reason; a deny / route / return with a code ⇒ 400; an un-warned approve body is unchanged', async () => {
      const w = await seedWorld([daysAgo(30)]);
      const da = await staff(w.pariwarId, 'district_admin');
      const esc = await da.client.inject({
        method: 'POST',
        url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
        payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting', rationale: 'For the trustee.' },
      });
      expect(esc.statusCode, esc.body).toBe(201);
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const resolve = (extra: Json) =>
        pa.client.inject({
          method: 'POST',
          url: cycleDecisionUrl(w.pariwarId),
          payload: { claim_case_id: w.claimCaseId, action: 'resolve_escalation', escalation_outcome: 'approved', ...extra },
        });
      const bare = await resolve({});
      expect(errOf(bare.body)).toMatchObject({ code: 'cycle_freeze.warning_reason_required', details: { missing: 'reason' } });
      for (const payload of [
        { action: 'deny', reason_code: 'other', rationale: 'x' },
        { action: 'route_to_r9', reason_code: 'r9_special_case', rationale: 'x' },
        { action: 'return_to_district_admin', reason_code: 'other', rationale: 'x', must_act: 'family' },
      ]) {
        const res = await pa.client.inject({
          method: 'POST',
          url: cycleDecisionUrl(w.pariwarId),
          payload: { claim_case_id: w.claimCaseId, warning_reason_code: GENERIC, ...payload },
        });
        expect(res.statusCode, payload.action).toBe(400);
      }
      const ok = await resolve({ warning_reason_code: GENERIC, rationale: 'Read every warning; resolved.' });
      expect(ok.statusCode, ok.body).toBe(201);
      expect((await records(w.claimCaseId)).map((r) => r.step)).toEqual(['escalation_resolution']);
      expect(auditsFor('admin_cycle_freeze.escalation_resolved', w.claimCaseId).at(-1)?.context).toMatchObject({
        approval_warning_kinds: ['recent_nominee_change'],
        warning_reason_code: GENERIC,
      });

      // ⛔ No warning — the card's existing approve body (⛔ reason, ⛔ rationale) still succeeds.
      const quiet = await seedWorld([daysAgo(400)]);
      const qda = await staff(quiet.pariwarId, 'district_admin');
      await daApprove(qda, quiet, false);
      const qpa = await staff(quiet.pariwarId, 'pariwar_admin');
      const qok = await qpa.client.inject({ method: 'POST', url: cycleDecisionUrl(quiet.pariwarId), payload: { claim_case_id: quiet.claimCaseId, action: 'approve' } });
      expect(qok.statusCode, qok.body).toBe(201);
      expect(await records(quiet.claimCaseId)).toEqual([]);
    });

    it('⭐ AC7 — ONE bulk statement: the pending list\'s REAL statement count does ⛔ not grow from 1 to 10 warned claims', async () => {
      const pariwarId = randomUUID();
      const first = await seedWorld([daysAgo(30)], pariwarId);
      const da = await staff(pariwarId, 'district_admin');
      await daApprove(da, first, true);
      const pa = await staff(pariwarId, 'pariwar_admin');

      // Count every statement Postgres receives INSIDE A TRANSACTION during the request — the handler's scope tx —
      // independent of the handler's own report. The auth layer's pool-level reads (the session row, the display-name
      // lookup) sit OUTSIDE any transaction and vary with their caches, ⛔ with the number of claims.
      const pool = deps.pool as unknown as { connect: (...a: unknown[]) => Promise<unknown> };
      const realConnect = pool.connect.bind(deps.pool);
      let counting = false;
      let statements = 0;
      pool.connect = async (...a: unknown[]) => {
        if (typeof a[0] === 'function') return realConnect(...a); // a callback-style caller — passed through untouched
        const c = (await realConnect(...a)) as { query: (...q: unknown[]) => unknown; __counted?: boolean };
        if (c.__counted !== true) {
          const realQuery = c.query.bind(c);
          let inTx = false;
          c.query = (...q: unknown[]) => {
            const text = (typeof q[0] === 'string' ? q[0] : ((q[0] as { text?: string } | null)?.text ?? '')).trim().toUpperCase();
            if (text === 'BEGIN') inTx = true;
            else if (text === 'COMMIT' || text === 'ROLLBACK') inTx = false;
            else if (counting && inTx) statements += 1;
            return realQuery(...q);
          };
          c.__counted = true;
        }
        return c;
      };
      const measure = async (expected: number) => {
        statements = 0;
        counting = true;
        const { all } = await pendingOf(pa.client, pariwarId);
        counting = false;
        expect(all.filter((i) => (i.approval_warnings as { kinds: string[] }).kinds.length > 0)).toHaveLength(expected);
        return statements;
      };
      try {
        const before = await measure(1);
        expect(before, 'the wrapper counted nothing — it did not intercept the client').toBeGreaterThan(5);
        for (let i = 0; i < 9; i += 1) await daApprove(da, await seedWorld([daysAgo(30)], pariwarId), true);
        const after = await measure(10);
        expect(after, `10 warned claims grew the REAL statement count ${before} → ${after}`).toBe(before);
      } finally {
        pool.connect = realConnect;
      }
    });
  });

  // ── R9 (EA5) ────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('the R9 vote, panel and finalize', () => {
    async function r9World() {
      const w = await seedWorld([daysAgo(300), daysAgo(30)]);
      return { ...w, pa: await routeToR9(w) };
    }
    /** Route `w` to R9 (the clause + the routing row) and open a one-member panel; returns that Pariwar Admin. */
    async function routeToR9(w: { pariwarId: string; claimCaseId: string }) {
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
      const open = await pa.client.inject({ method: 'POST', url: `${r9Url(w.pariwarId, w.claimCaseId)}/open`, payload: { clause_id: R9_CLAUSE, panel_actor_ids: [pa.userId] } });
      expect(open.statusCode, open.body).toBe(201);
      return pa;
    }
    const panelOf = async (client: Client, p: string, c: string) => {
      const res = await client.inject({ method: 'GET', url: r9Url(p, c) });
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as { approval_warnings: Json; reason_options: Json[]; votes: { vote_id: string; covers_current_warnings: boolean | null }[] };
    };
    async function elevate(client: Client): Promise<void> {
      const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'r9_finalize' } });
      expect(req.statusCode).toBe(200);
      const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
      expect(ver.statusCode).toBe(200);
    }

    it('⭐ AC5 — a vote needs its reason; the panel shows the block + `covers_current_warnings`; a post-death key later ⇒ the panel says `false` and finalize 409s naming the vote; revised ⇒ finalized', async () => {
      const w = await r9World();
      const vote = (payload: Json) => w.pa.client.inject({ method: 'POST', url: `${r9Url(w.pariwarId, w.claimCaseId)}/vote`, payload });
      const bare = await vote({ vote: 'approve', rationale: 'yes' });
      expect(errOf(bare.body)).toMatchObject({ code: 'r9_voting.warning_reason_required', details: { kinds: ['recent_nominee_change'] } });
      expect((await vote({ vote: 'deny', rationale: 'no', warning_reason_code: GENERIC })).statusCode).toBe(400);
      const cast = await vote({ vote: 'approve', rationale: 'yes', warning_reason_code: GENERIC });
      expect(cast.statusCode, cast.body).toBe(201);
      const voteId = (cast.json() as { vote_id: string }).vote_id;
      expect(auditsFor('admin_r9_voting.vote', w.claimCaseId).at(-1)?.context).toMatchObject({
        approval_warning_kinds: ['recent_nominee_change'],
        warning_reason_code: GENERIC,
      });
      let panel = await panelOf(w.pa.client, w.pariwarId, w.claimCaseId);
      expect(panel.approval_warnings).toMatchObject({ available: true, kinds: ['recent_nominee_change'], waiting_for_district_admin: false });
      expect(panel.reason_options[0]).toMatchObject({ code: GENERIC });
      expect(panel.votes).toEqual([expect.objectContaining({ vote_id: voteId, covers_current_warnings: true })]);
      // Trap 15 — a failed read: the block unavailable, ⛔ no options, each vote's flag `null` (⛔ a guessed `true`).
      const failed = await withFault(() => panelOf(w.pa.client, w.pariwarId, w.claimCaseId));
      expect(failed.approval_warnings).toEqual(UNAVAILABLE);
      expect(failed.reason_options).toEqual([]);
      expect(failed.votes.map((v) => v.covers_current_warnings)).toEqual([null]);

      // The certificate re-reviewed to 45 days back + redetermined ⇒ the 30-day change is post-death too — and (Story
      // 6.26b, RD19 (i)) the certificate now differs from the fixture inspection's family date: a second key the vote misses.
      await redetermine(w.pariwarId, w.claimCaseId, istDaysAgo(45));
      panel = await panelOf(w.pa.client, w.pariwarId, w.claimCaseId);
      expect(panel.votes).toEqual([expect.objectContaining({ vote_id: voteId, covers_current_warnings: false })]);
      await elevate(w.pa.client);
      const short = await w.pa.client.inject({ method: 'POST', url: `${r9Url(w.pariwarId, w.claimCaseId)}/finalize`, payload: {} });
      expect(short.statusCode).toBe(409);
      expect(errOf(short.body)).toMatchObject({
        code: 'r9_voting.approve_votes_need_warning_reason',
        details: { vote_ids: [voteId], uncovered_count: 2 },
      });
      expect(auditsFor('admin_r9_voting.rejected', w.claimCaseId).at(-1)?.context).toMatchObject({ uncovered_count: 2, vote_count: 1 });
      const revised = await vote({ vote: 'approve', rationale: 'yes, still', warning_reason_code: GENERIC });
      expect(revised.statusCode).toBe(201);
      panel = await panelOf(w.pa.client, w.pariwarId, w.claimCaseId);
      expect(panel.votes.map((v) => v.covers_current_warnings)).toEqual([true]);
      await elevate(w.pa.client);
      const fin = await w.pa.client.inject({ method: 'POST', url: `${r9Url(w.pariwarId, w.claimCaseId)}/finalize`, payload: {} });
      expect(fin.statusCode, fin.body).toBe(200);
      expect(auditsFor('admin_r9_voting.finalize', w.claimCaseId).at(-1)?.context).toMatchObject({
        approval_warning_kinds: ['post_death_version', 'recent_nominee_change', 'inspection_death_date_differs'],
      });
    });

    // Code review round 2 — the WAIT over HTTP at R9 finalize (only `cycle_freeze.` was driven before), and the R9
    // own-reason words: an approve VOTER recorded the late reason — ⛔ never "a late reason YOU recorded" to the finalizer.
    it('⭐ AC2 — the WAIT at R9 finalize: `r9_voting.late_warning_reason_required`; a VOTER\'s own late reason ⇒ `own_reason_excluded` with the R9 words', async () => {
      const w = await lateWarnedWorld();
      const pa = await routeToR9(w);
      const finalize = async () => {
        await elevate(pa.client);
        return pa.client.inject({ method: 'POST', url: `${r9Url(w.pariwarId, w.claimCaseId)}/finalize`, payload: {} });
      };
      const cast = await pa.client.inject({
        method: 'POST',
        url: `${r9Url(w.pariwarId, w.claimCaseId)}/vote`,
        payload: { vote: 'approve', rationale: 'yes', warning_reason_code: GENERIC },
      });
      expect(cast.statusCode, cast.body).toBe(201);
      const waits = await finalize();
      expect(waits.statusCode, waits.body).toBe(409);
      expect(errOf(waits.body)).toMatchObject({
        code: 'r9_voting.late_warning_reason_required',
        details: { kinds: ['post_death_version', 'inspection_death_date_differs'], uncovered_count: 2, own_reason_excluded: false },
      });
      // The (only) approve voter answers the late warning THEMSELVES — it does ⛔ not count at finalize (`-279` A1).
      await inScope(w.pariwarId, (s) =>
        claim.recordLateWarningReason(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          warningReasonCode: GENERIC,
          noteCiphertext: 'enc:v1:late',
          actorId: pa.userId,
          actorDisplay: 'Prakash (Pariwar Admin)',
        }),
      );
      const own = await finalize();
      expect(own.statusCode, own.body).toBe(409);
      expect(errOf(own.body)).toMatchObject({ code: 'r9_voting.late_warning_reason_required', details: { own_reason_excluded: true } });
      expect(errOf(own.body).message).toMatch(/recorded by an approve voter on this panel, or by the person finalizing it/);
      expect(errOf(own.body).message).not.toMatch(/you recorded/);
      // The District Admin answers ⇒ finalized.
      await inScope(w.pariwarId, (s) =>
        claim.recordLateWarningReason(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          warningReasonCode: GENERIC,
          noteCiphertext: 'enc:v1:late-da',
          actorId: w.da.userId,
          actorDisplay: 'Anita (District Admin)',
        }),
      );
      const fin = await finalize();
      expect(fin.statusCode, fin.body).toBe(200);
    });
  });

  // ── 6.19c (EA6) ─────────────────────────────────────────────────────────────────────────────────────────────────
  describe('6.19c — the "no correction needed" approve and the Super Admin', () => {
    /** A warned claim the District Admin approved over its warning, returned by the Pariwar Admin, marked `mustAct`. */
    async function returnedWarned(mustAct: 'family' | 'staff', declaredAt: Date[] = [daysAgo(30)]) {
      const w = await seedWorld(declaredAt);
      const da = await staff(w.pariwarId, 'district_admin');
      await daApprove(da, w, true);
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const run = await inScope(w.pariwarId, async (s) => {
        await claim.returnToDistrictAdmin(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          reasonCode: 'other',
          rationaleCiphertext: 'enc:v1:return-note',
          actorId: pa.userId,
          actorDisplay: 'Prakash (Pariwar Admin)',
          actor: 'trustee',
        });
        const mark = await claim.writeCorrectionMark(s.client, {
          pariwarId: ids.pariwarId(w.pariwarId),
          claimCaseId: ids.claimId(w.claimCaseId),
          mustAct,
          actorId: pa.userId,
          actorDisplay: 'Prakash (Pariwar Admin)',
          setByRole: 'pariwar_admin',
          noteCiphertext: null,
          isReturnMark: true,
          hold: claim.noCorrectionHold,
        });
        return mark.openedRun!;
      });
      return { ...w, da, pa, day0: run.day0 };
    }

    it('⭐ AC6(b) — D27: the queue item SHOWS the warnings (a closure request ⛔ would carry `null`); `{}` ⇒ 409; an unpaired field ⇒ 400; the pair ⇒ 201 and THAT note is the decision rationale (decrypted — ⛔ the constant)', async () => {
      const w = await returnedWarned('family');
      await inScope(w.pariwarId, (s) =>
        claim.recordNoCorrectionNeeded(s.client, {
          pariwarId: ids.pariwarId(w.pariwarId),
          claimCaseId: ids.claimId(w.claimCaseId),
          actorId: w.da.userId,
          actorDisplay: 'Anita (District Admin)',
          now: new Date(),
          markNoteCiphertext: 'enc:v1:m',
          noteCiphertext: 'enc:v1:n',
          setByRole: 'district_admin',
          hold: claim.isCorrectionClaimHeld,
        }),
      );
      await td.pool.query(
        `UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`,
        [w.claimCaseId],
      );
      await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId);

      const queue = await w.pa.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/correction/closure-queue?limit=50` });
      expect(queue.statusCode, queue.body).toBe(200);
      const q = queue.json() as { items: { claim_case_id: string; kind: string; approval_warnings: Json | null }[]; reason_options: Json[] };
      expect(q.items.find((i) => i.claim_case_id === w.claimCaseId)).toMatchObject({
        kind: 'no_correction_needed',
        approval_warnings: { available: true, kinds: ['recent_nominee_change'] },
      });
      expect(q.reason_options[0]).toMatchObject({ code: GENERIC });
      const failedQueue = await withFault(() =>
        w.pa.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/correction/closure-queue?limit=50` }),
      );
      expect(failedQueue.statusCode, failedQueue.body).toBe(200);
      const fq = failedQueue.json() as typeof q;
      expect(fq.items.find((i) => i.claim_case_id === w.claimCaseId)?.approval_warnings).toEqual(UNAVAILABLE);
      expect(fq.reason_options).toEqual([]);

      const url = `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`;
      const bare = await w.pa.client.inject({ method: 'POST', url, payload: {} });
      expect(bare.statusCode).toBe(409);
      expect(errOf(bare.body)).toMatchObject({ code: 'closure.warning_reason_required', details: { missing: 'reason' } });
      expect((await w.pa.client.inject({ method: 'POST', url, payload: { note: 'why' } })).statusCode).toBe(400);
      expect((await w.pa.client.inject({ method: 'POST', url, payload: { warning_reason_code: GENERIC } })).statusCode).toBe(400);
      const NOTE = 'The family showed the original will — the change is genuine.';
      // Sent padded — stored TRIMMED, as the escalation decision's rationale is (code review round 2).
      const ok = await w.pa.client.inject({ method: 'POST', url, payload: { warning_reason_code: GENERIC, note: `  ${NOTE}\n` } });
      expect(ok.statusCode, ok.body).toBe(201);
      const row = (await records(w.claimCaseId)).find((r) => r.step === 'no_correction_approval')!;
      const decision = await td.pool.query<{ rationale_ciphertext: string }>(
        'SELECT rationale_ciphertext FROM claim_state_trustee_decisions WHERE decision_id = $1',
        [row.trustee_decision_id],
      );
      expect(await decryptTrusteeRationale(decision.rows[0]!.rationale_ciphertext, w.pariwarId, deps.encryption)).toBe(NOTE);
      const line = auditsFor('admin_claim_correction.no_correction_approved', w.claimCaseId).at(-1)?.context as Json;
      expect(line).toMatchObject({ approval_warning_kinds: ['recent_nominee_change'], warning_reason_code: GENERIC });
      expect(JSON.stringify(line)).not.toContain(NOTE);
    });

    it('⭐ AC6(a) — the Super Admin\'s detail SHOWS the warnings; approve ⛔ code ⇒ 409 `closure.warning_reason_required`; close + a code ⇒ 400; approve + a code ⇒ 201 and ONE `super_admin_approval` row', async () => {
      // An OLD declaration too, so a later re-review (below) still leaves an effective one.
      const w = await returnedWarned('staff', [daysAgo(300), daysAgo(30)]);
      await inScope(w.pariwarId, (s) =>
        claim.escalateStaffCase(s.client, {
          pariwarId: ids.pariwarId(w.pariwarId),
          claimCaseId: ids.claimId(w.claimCaseId),
          now: new Date(`${cycleCalendar.addCalendarDays(w.day0, 90)}T04:30:00.000Z`),
        }),
      );
      const sa = await staff(w.pariwarId, 'super_admin');
      const detail = await sa.client.inject({ method: 'GET', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation` });
      expect(detail.statusCode, detail.body).toBe(200);
      expect(detail.json()).toMatchObject({
        approve_path: 'full_gate',
        approval_warnings: { available: true, kinds: ['recent_nominee_change'], waiting_for_district_admin: false },
      });
      const failedDetail = await withFault(() => sa.client.inject({ method: 'GET', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation` }));
      expect(failedDetail.statusCode, failedDetail.body).toBe(200);
      expect(failedDetail.json()).toMatchObject({ approval_warnings: UNAVAILABLE, reason_options: [] });
      const url = `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation/decision`;
      const bare = await sa.client.inject({ method: 'POST', url, payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.' } });
      expect(bare.statusCode).toBe(409);
      expect(errOf(bare.body).code).toBe('closure.warning_reason_required');
      const close = await sa.client.inject({
        method: 'POST',
        url,
        payload: { decision: 'close', reason: 'family_silent_after_reached', note: 'n', warning_reason_code: GENERIC },
      });
      expect(close.statusCode).toBe(400);
      // Code review round 2 — the WAIT over HTTP on the `closure.` prefix: a re-review to 45 days back makes the 30-day
      // change post-death — a key the District Admin's approval never covered (RD19: a passing check re-recorded).
      await redetermine(w.pariwarId, w.claimCaseId, istDaysAgo(45));
      const waits = await sa.client.inject({
        method: 'POST',
        url,
        payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.', warning_reason_code: GENERIC },
      });
      expect(waits.statusCode, waits.body).toBe(409);
      expect(errOf(waits.body)).toMatchObject({
        code: 'closure.late_warning_reason_required',
        // `kinds` = the UNCOVERED keys' kinds (the recent change was covered by the District Admin's approval; Story 6.26b
        // RD19 (i) — the re-review also made the inspection's family date differ).
        details: { kinds: ['post_death_version', 'inspection_death_date_differs'], uncovered_count: 2, own_reason_excluded: false },
      });
      await inScope(w.pariwarId, (s) =>
        claim.recordLateWarningReason(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          warningReasonCode: GENERIC,
          noteCiphertext: 'enc:v1:late-da',
          actorId: w.da.userId,
          actorDisplay: 'Anita (District Admin)',
        }),
      );
      const ok = await sa.client.inject({
        method: 'POST',
        url,
        payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.', warning_reason_code: GENERIC },
      });
      expect(ok.statusCode, ok.body).toBe(201);
      expect((await records(w.claimCaseId)).map((r) => r.step)).toEqual(['district_admin_approval', 'district_admin_late_reason', 'super_admin_approval']);
      expect(auditsFor('admin_claim_correction.super_admin_decided', w.claimCaseId).at(-1)?.context).toMatchObject({
        approval_warning_kinds: ['post_death_version', 'recent_nominee_change', 'inspection_death_date_differs'],
        warning_reason_code: GENERIC,
        reason: 'details_verified',
      });
    });
  });

  // ── EA10 — the correction queue ───────────────────────────────────────────────────────────────────────────────
  it('⭐ AC10 — the District Admin\'s correction queue lists the waiting claim (⛔ no live return), and `late_warnings_unavailable: false`', async () => {
    const w = await lateWarnedWorld();
    const res = await w.da.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/claims/under-correction` });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { items: Json[]; late_warnings_unavailable: boolean };
    expect(body.late_warnings_unavailable).toBe(false);
    expect(body.items).toEqual([
      expect.objectContaining({
        claim_case_id: w.claimCaseId,
        returned_at: null,
        late_warning_awaiting_reason: true,
        late_warning_uncovered_count: 2,
        correction_chase: expect.objectContaining({ return_decision_id: null }),
      }),
    ]);
  });

  // ── Trap 15 — fail closed ─────────────────────────────────────────────────────────────────────────────────────
  it('⭐ Trap 15 — a FAILED warnings read fails CLOSED on every surface: `available: false`, ⛔ no reason options, ⛔ never a 500; the queue still lists and SAYS the late arm is unavailable', async () => {
    const w = await lateWarnedWorld();
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    await withFault(async () => {
      const { body, all } = await pendingOf(pa.client, w.pariwarId);
      expect(all.find((i) => i.claim_case_id === w.claimCaseId)?.approval_warnings).toEqual(UNAVAILABLE);
      expect(body.reason_options).toEqual([]);
      // The late arm failed IN POSTGRES — the queue still answers 200, and SAYS the late arm is unavailable. The
      // late-only claim is no longer dropped (decision-needed #1, code review 2026-10-06): the cheap, independent
      // candidate check still finds it, so it lists with a best-effort flag (the exact uncovered count unknown).
      const queue = await w.da.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/claims/under-correction` });
      expect(queue.statusCode, queue.body).toBe(200);
      const queueBody = queue.json() as { items: Json[]; late_warnings_unavailable: boolean };
      expect(queueBody.late_warnings_unavailable).toBe(true);
      expect(queueBody.items).toEqual([
        // Round 2 (BigDev "1"): the count could ⛔ not be made — `null`, ⛔ never `0`.
        expect.objectContaining({ claim_case_id: w.claimCaseId, late_warning_awaiting_reason: true, late_warning_uncovered_count: null }),
      ]);
    });
  });
  // ── Story 6.26b — the three death-fact kinds over HTTP (AC8; GI6, GI7, GI17, GI18; Task 4.0's legs a–c) ─────────────
  describe('Story 6.26b — the death-fact kinds over HTTP', () => {
    const queueOf = async (client: Client, p: string) => {
      const res = await client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/claims/under-correction` });
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as { items: Json[]; late_warnings_unavailable: boolean };
    };
    /** A completed assignment, COMMITTED in its own transaction: a differing family date, or a `does_not_match`. */
    const completeLater = (w: { pariwarId: string; claimCaseId: string }, opts: { deathDate?: string; verdict?: 'does_not_match' }) =>
      inScope(w.pariwarId, (s) =>
        ensureGroundInspection(deps, s, w.pariwarId, w.claimCaseId, {
          force: true,
          ...(opts.verdict ? { verdict: opts.verdict } : { deathDate: opts.deathDate ?? istDaysAgo(3) }),
        }),
      );
    const finalVote = (pa: { client: Client }, w: { pariwarId: string; claimCaseId: string }, warned = true) =>
      pa.client.inject({
        method: 'POST',
        url: cycleDecisionUrl(w.pariwarId),
        payload: warned
          ? { claim_case_id: w.claimCaseId, action: 'approve', warning_reason_code: GENERIC, rationale: 'why' }
          : { claim_case_id: w.claimCaseId, action: 'approve' },
      });

    for (const kind of ['inspection_death_date_differs', 'original_certificate_mismatch', 'register_check_mismatch'] as const) {
      it(`⭐ AC8 — \`${kind}\`: the District Admin's approval with ⛔ warning reason ⇒ 409 naming it; with one ⇒ 201`, async () => {
        const w = await seedWorld([daysAgo(400)], undefined, kind === 'register_check_mismatch' ? { registerCheck: 'does_not_match' } : {});
        if (kind === 'inspection_death_date_differs') await completeLater(w, { deathDate: istDaysAgo(3) });
        if (kind === 'original_certificate_mismatch') await completeLater(w, { verdict: 'does_not_match' });
        const target = w;
        const da = await staff(target.pariwarId, 'district_admin');
        const bare = await da.client.inject({ method: 'POST', url: `${claimBase(target.pariwarId, target.claimCaseId)}/verifier-decision`, payload: daApproveBody });
        expect(bare.statusCode, bare.body).toBe(409);
        expect(errOf(bare.body)).toMatchObject({ code: 'verifier_decision.warning_reason_required', details: { kinds: [kind], missing: 'reason' } });
        await daApprove(da, target, true);
      });
    }

    it('(a) inspected (committed) THEN approved (its own request) ⇒ ⛔ a late-warning candidate — on the FAULT path, beside a control that IS one', async () => {
      const before = await seedWorld([daysAgo(400)]);
      const da = await staff(before.pariwarId, 'district_admin');
      await daApprove(da, before, false);
      const control = await seedWorld([daysAgo(400)], before.pariwarId);
      await daApprove(da, control, false);
      await completeLater(control, { deathDate: istDaysAgo(3) });
      await withFault(async () => {
        const body = await queueOf(da.client, before.pariwarId);
        expect(body.late_warnings_unavailable).toBe(true);
        expect(body.items.map((i) => i.claim_case_id)).toEqual([control.claimCaseId]);
      });
    });

    it('(b) approved THEN a differing date / a `does_not_match` (each its own transaction) ⇒ listed, and the final vote 409s `late_warning_reason_required`', async () => {
      const dated = await seedWorld([daysAgo(400)]);
      const da = await staff(dated.pariwarId, 'district_admin');
      await daApprove(da, dated, false);
      await completeLater(dated, { deathDate: istDaysAgo(3) });
      const verdict = await seedWorld([daysAgo(400)], dated.pariwarId);
      await daApprove(da, verdict, false);
      await completeLater(verdict, { verdict: 'does_not_match' });
      const body = await queueOf(da.client, dated.pariwarId);
      expect(body.items.map((i) => i.claim_case_id).sort()).toEqual([dated.claimCaseId, verdict.claimCaseId].sort());
      for (const i of body.items) expect(i).toMatchObject({ late_warning_awaiting_reason: true, late_warning_uncovered_count: 1 });
      const pa = await staff(dated.pariwarId, 'pariwar_admin');
      for (const w of [dated, verdict]) {
        const waits = await finalVote(pa, w);
        expect(waits.statusCode, waits.body).toBe(409);
        expect(errOf(waits.body).code).toBe('cycle_freeze.late_warning_reason_required');
      }
    });

    it('(c) `-284` E1 — R9-routed in `state_trustee_approved`, a differing completion ⇒ listed; the routing row superseded ⇒ ⛔ listed', async () => {
      const w = await seedWorld([daysAgo(400)]);
      const da = await staff(w.pariwarId, 'district_admin');
      await daApprove(da, w, false);
      const pa = await staff(w.pariwarId, 'pariwar_admin');
      const voted = await finalVote(pa, w, false);
      expect(voted.statusCode, voted.body).toBe(201);
      await td.pool.query(
        `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
         VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Router')`,
        [w.claimCaseId, w.pariwarId, randomUUID()],
      );
      await completeLater(w, { deathDate: istDaysAgo(3) });
      const listed = await queueOf(da.client, w.pariwarId);
      expect(listed.items).toEqual([
        expect.objectContaining({ claim_case_id: w.claimCaseId, claim_state: 'state_trustee_approved', late_warning_awaiting_reason: true, late_warning_uncovered_count: 1 }),
      ]);
      await td.pool.query(
        `UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE claim_case_id = $1 AND phase = 'routing' AND superseded_at IS NULL`,
        [w.claimCaseId],
      );
      expect((await queueOf(da.client, w.pariwarId)).items).toEqual([]);
    });
  });
});
