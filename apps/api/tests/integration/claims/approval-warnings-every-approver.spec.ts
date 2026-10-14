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
// Code review round 2 (V4) — the OWN-VISIT (hide) reads, failing on demand the same way: `ownVisitBulk` the set-based
// read (`readOwnVisitPendingClaimIds` — every list surface and `readClaimsHiddenFromReader`), `ownVisitOne` the one-claim
// read (`isActorOwnVisitPending` — the R9 panel), `hideCheck` the console's peer-section hide (`isPeerSectionHiddenFromActor`
// — the V11 path behind the console's prior comments).
const fault = vi.hoisted(() => ({ on: false, ownVisitBulk: false, ownVisitOne: false, hideCheck: false }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const { sql } = await import('drizzle-orm');
  const failingWhen =
    <A extends unknown[], R>(on: () => boolean, fn: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      if (on()) {
        const db = a[0] as { execute: (q: unknown) => Promise<unknown> };
        await db.execute(sql`SELECT 1/0`);
      }
      return fn(...a);
    };
  const failing = <A extends unknown[], R>(fn: (...a: A) => Promise<R>) => failingWhen(() => fault.on, fn);
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
      readOwnVisitPendingClaimIds: failingWhen(() => fault.ownVisitBulk, actual.claim.readOwnVisitPendingClaimIds),
      isActorOwnVisitPending: failingWhen(() => fault.ownVisitOne, actual.claim.isActorOwnVisitPending),
      isPeerSectionHiddenFromActor: failingWhen(() => fault.hideCheck, actual.claim.isPeerSectionHiddenFromActor),
    },
  };
});

/** Run `fn` with the named hide read(s) failing (V4). */
async function withHideFault<T>(which: readonly ('ownVisitBulk' | 'ownVisitOne' | 'hideCheck')[], fn: () => Promise<T>): Promise<T> {
  for (const k of which) fault[k] = true;
  try {
    return await fn();
  } finally {
    for (const k of which) fault[k] = false;
  }
}

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
  own_visit_pending: false,
};

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { decryptTrusteeRationale } from '../../../src/modules/claims/state-trustee-decision-crypto.js';
import { CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, encryptClosureField } from '../../../src/modules/claims/correction-closure-crypto.js';
import { encryptVerifierRationale } from '../../../src/modules/claims/verifier-decision-crypto.js';
import { encryptGroundInspectionField } from '../../../src/modules/claims/ground-inspection-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { ensureAcceptedDeathCertificate, ensureClaimContact, ensureGroundInspection, seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import * as peerFx from '../_peer-reply-fixture.js';
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
    fault.ownVisitBulk = false;
    fault.ownVisitOne = false;
    fault.hideCheck = false;
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
        own_visit_pending: false,
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
        own_visit_pending: false,
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
        own_visit_pending: false,
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
  async function elevate(client: Client, actionContext = 'r9_finalize'): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }
  /** The Pariwar Admin returns `w` to the District Admin and marks it `mustAct` (opening the correction run). */
  async function returnAndMark(w: { pariwarId: string; claimCaseId: string }, mustAct: 'family' | 'staff') {
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
    return { pa, day0: run.day0 };
  }

  // ── R9 (EA5) ────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('the R9 vote, panel and finalize', () => {
    async function r9World() {
      const w = await seedWorld([daysAgo(300), daysAgo(30)]);
      return { ...w, pa: await routeToR9(w) };
    }
    const panelOf = async (client: Client, p: string, c: string) => {
      const res = await client.inject({ method: 'GET', url: r9Url(p, c) });
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as { approval_warnings: Json; reason_options: Json[]; votes: { vote_id: string; covers_current_warnings: boolean | null }[] };
    };

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
      return { ...w, da, ...(await returnAndMark(w, mustAct)) };
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
  // ── Story 6.27b — the two NEIGHBOUR kinds at every approver (Task 1b; AC3, AC4; PM9; `-303` Q2 A, `-324` A) ──────
  // ⛔ No writer changed (F16): the ONE rule and the wait iterate `w.keys`, so the kinds reach every approver by
  // construction. The answers are saved through the REAL member route (`_peer-reply-fixture.ts`), so the date's indexes
  // and the certificate's (`ensureAcceptedDeathCertificate`) come from the SAME helper and Pariwar key.
  describe('Story 6.27b — the neighbour kinds at every approver', () => {
    type PeerKind = 'peer_says_not_died' | 'peer_death_date_differs';
    const KINDS: PeerKind[] = ['peer_says_not_died', 'peer_death_date_differs'];
    const env = () => ({ pool: td.pool, deps, app });
    type W = { pariwarId: string; claimCaseId: string; member: string; ping: string };

    /** A QUIET world (a 400-day-old nomination ⇒ ⛔ nominee warning; the fixture inspection's date equals the
     *  certificate's ⇒ ⛔ death-fact warning) with ONE texted neighbour. */
    async function peerWorld(pariwarId?: string): Promise<W> {
      const w = await seedWorld([daysAgo(400)], pariwarId);
      const member = await peerFx.seedNeighbour(env(), w.pariwarId, 'Asha Devi', '+919876543210');
      const deceased = (await td.pool.query<{ d: string }>('SELECT deceased_member_id AS d FROM claims WHERE claim_case_id = $1', [w.claimCaseId])).rows[0]!.d;
      const [ping] = await peerFx.attachPings(env(), w.pariwarId, w.claimCaseId, deceased, [member], [true]);
      return { ...w, member, ping: ping! };
    }
    /** The neighbour's answer that raises `kind`: `not_died`, or a date FOUR days from the certificate's (tomorrow). */
    async function answer(w: W, kind: PeerKind): Promise<void> {
      if (kind === 'peer_says_not_died') return peerFx.put(env(), w.pariwarId, w.member, w.ping, 'has_died', { codes: ['not_died'] });
      await peerFx.put(env(), w.pariwarId, w.member, w.ping, 'has_died', { codes: ['died'] });
      await peerFx.put(env(), w.pariwarId, w.member, w.ping, 'death_date', { date: istDaysAgo(3) });
    }
    const daLate = (w: W, da: { userId: string }) =>
      inScope(w.pariwarId, (s) =>
        claim.recordLateWarningReason(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          warningReasonCode: GENERIC,
          noteCiphertext: 'enc:v1:late-da',
          actorId: da.userId,
          actorDisplay: 'Anita (District Admin)',
        }),
      );
    const finalVote = (pa: { client: Client }, w: W, warned: boolean) =>
      pa.client.inject({
        method: 'POST',
        url: cycleDecisionUrl(w.pariwarId),
        payload: warned
          ? { claim_case_id: w.claimCaseId, action: 'approve', warning_reason_code: GENERIC, rationale: 'Read the neighbour\'s answer.' }
          : { claim_case_id: w.claimCaseId, action: 'approve' },
      });
    const r9Vote = (pa: { client: Client }, w: W, warned: boolean) =>
      pa.client.inject({
        method: 'POST',
        url: `${r9Url(w.pariwarId, w.claimCaseId)}/vote`,
        payload: warned ? { vote: 'approve', rationale: 'yes', warning_reason_code: GENERIC } : { vote: 'approve', rationale: 'yes' },
      });
    const r9Finalize = async (pa: { client: Client }, w: W) => {
      await elevate(pa.client);
      return pa.client.inject({ method: 'POST', url: `${r9Url(w.pariwarId, w.claimCaseId)}/finalize`, payload: {} });
    };
    /** D27's world: the District Admin approved, returned (family), "no correction needed" recorded. */
    async function noCorrectionReady(w: W, da: { userId: string }) {
      const { pa } = await returnAndMark(w, 'family');
      await inScope(w.pariwarId, (s) =>
        claim.recordNoCorrectionNeeded(s.client, {
          pariwarId: ids.pariwarId(w.pariwarId),
          claimCaseId: ids.claimId(w.claimCaseId),
          actorId: da.userId,
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
      return pa;
    }
    const noCorrectionUrl = (w: W) => `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`;
    /** G1's world: approved, returned (staff), escalated past day 90; returns the Super Admin. */
    async function escalatedReady(w: W) {
      const { day0 } = await returnAndMark(w, 'staff');
      await inScope(w.pariwarId, (s) =>
        claim.escalateStaffCase(s.client, {
          pariwarId: ids.pariwarId(w.pariwarId),
          claimCaseId: ids.claimId(w.claimCaseId),
          now: new Date(`${cycleCalendar.addCalendarDays(day0, 90)}T04:30:00.000Z`),
        }),
      );
      return staff(w.pariwarId, 'super_admin');
    }
    const g1Url = (w: W) => `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation/decision`;
    const g1 = (sa: { client: Client }, w: W, warned: boolean) =>
      sa.client.inject({
        method: 'POST',
        url: g1Url(w),
        payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.', ...(warned ? { warning_reason_code: GENERIC } : {}) },
      });
    const reasonRequired = (code: string, kind: PeerKind) => ({ code, details: { kinds: [kind], missing: 'reason' } });
    const waits = (code: string, kind: PeerKind) => ({ code, details: { kinds: [kind], uncovered_count: 1, own_reason_excluded: false } });

    // Task 3b.5 (AC8) — the CONSOLE's per-answer flags, stitched from its warnings read (⛔ a new read); the read FORCED to
    // fail (this spec's fault seam wraps the single reader) ⇒ `null` ("could not be checked just now"), ⛔ never `false`.
    it('AC8 — the console\'s flags: `not_died` ⇒ `true`, `died` ⇒ `false`, a non-warning question ⇒ `false`; the warnings read failed ⇒ `null`', async () => {
      const base = await seedWorld([daysAgo(400)]);
      const deceased = (await td.pool.query<{ d: string }>('SELECT deceased_member_id AS d FROM claims WHERE claim_case_id = $1', [base.claimCaseId])).rows[0]!.d;
      const asha = await peerFx.seedNeighbour(env(), base.pariwarId, 'Asha Devi', '+919876543210');
      const bina = await peerFx.seedNeighbour(env(), base.pariwarId, 'Bina Kumari', '+919812345678');
      const [pingA, pingB] = await peerFx.attachPings(env(), base.pariwarId, base.claimCaseId, deceased, [asha, bina], [true, true]);
      const w = { ...base, member: asha, ping: pingA! };
      await answer(w, 'peer_says_not_died');
      await peerFx.put(env(), w.pariwarId, bina, pingB!, 'has_died', { codes: ['died'] });
      await peerFx.put(env(), w.pariwarId, bina, pingB!, 'how_known', { codes: ['family_told'] });
      const da = await staff(w.pariwarId, 'district_admin');
      type Pings = { pingId: string; reply: { answers: { questionKey: string; warningFlag: boolean | null }[] } | null }[];
      const flagsOf = async () => {
        const res = await da.client.inject({ method: 'GET', url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-console` });
        expect(res.statusCode, res.body).toBe(200);
        const pings = (res.json() as { packet: { peerMesh: { transcript: { pings: Pings } } } }).packet.peerMesh.transcript.pings;
        return Object.fromEntries(
          pings.flatMap((p) => (p.reply?.answers ?? []).map((a) => [`${p.pingId === w.ping ? 'a' : 'b'}.${a.questionKey}`, a.warningFlag])),
        );
      };
      expect(await flagsOf()).toEqual({ 'a.has_died': true, 'b.has_died': false, 'b.how_known': false });
      expect(await withFault(flagsOf)).toEqual({ 'a.has_died': null, 'b.has_died': null, 'b.how_known': false });
    });

    // ── AC10 (BD4, `2026-10-13-327` decision 2) — a HIDDEN actor (their own ground visit on the claim is pending) cannot
    //    APPROVE at any step — WITH and WITHOUT a neighbour key (the unconditional leg proves ⛔ disclosure): ONE neutral
    //    409, ⛔ `details`, ⛔ row; every non-approving act still succeeds; the refusal lifts on a completed FULL visit and
    //    on the assignment leaving `scheduled`; a `certificate_check` completion does ⛔ not lift it.
    // ── AC7 (PM25 (c); BF10, BF19 (b), BF21) — the blind-first rule in the WARNINGS: a reader whose own ground visit is
    //    pending sees ⛔ neighbour kind on the console strip (kinds, counts, the late-reason offer), the four hosts' summary,
    //    the R9 panel's per-vote coverage and the correction queue — and every approving control shows the neutral
    //    block; another District Admin sees them throughout; `reviseBlocked` and the GATE read every key.
    describe('AC7 — the blind-first rule holds in the warnings', () => {
      const scheduleFor = (w: { pariwarId: string; claimCaseId: string }, actorId: string, stage: 'initial' | 'certificate_check' = 'initial') =>
        inScope(w.pariwarId, (s) =>
          claim.scheduleGroundInspection(s.client, {
            claimCaseId: ids.claimId(w.claimCaseId),
            pariwarId: ids.pariwarId(w.pariwarId),
            district: DISTRICT,
            inspectionStage: stage,
            inspectionSiteType: 'family_residence',
            inspectorActorId: actorId,
            scheduledAt: new Date(),
            scheduledByActor: randomUUID(),
            idempotencyKey: randomUUID(),
          }),
        );
      type Strip = { kinds: string[]; uncoveredSinceApproval: number; viewerCanRecordLateReason: boolean; lateKeysUncoveredForViewer: number; reviseBlocked: string | null; ownVisitPending: boolean };
      const stripOf = async (who: { client: Client }, w: { pariwarId: string; claimCaseId: string }) => {
        const res = await who.client.inject({ method: 'GET', url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-console` });
        expect(res.statusCode, res.body).toBe(200);
        return (res.json() as { packet: { approvalWarnings: Strip } }).packet.approvalWarnings;
      };
      const queueIds = async (who: { client: Client }, p: string) => {
        const res = await who.client.inject({ method: 'GET', url: `/api/v1/p/${p}/admin/claims/under-correction` });
        expect(res.statusCode, res.body).toBe(200);
        return (res.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id);
      };

      it('the CONSOLE strip and the QUEUE: ⛔ peer trace for the inspector (`ownVisitPending: true`, `reviseBlocked: null`), shown to another District Admin (`reviseBlocked` unfiltered); a `certificate_check` completion keeps it hidden; a FULL visit shows all', async () => {
        const w = await peerWorld();
        const da = await staff(w.pariwarId, 'district_admin');
        await daApprove(da, w, false);
        await answer(w, 'peer_says_not_died'); // LATE — the claim's ONLY key
        const inspector = await staff(w.pariwarId, 'district_admin');
        await scheduleFor(w, inspector.userId);

        const hidden = await stripOf(inspector, w);
        expect(hidden).toMatchObject({ kinds: [], uncoveredSinceApproval: 0, viewerCanRecordLateReason: false, lateKeysUncoveredForViewer: 0, ownVisitPending: true });
        // ⚠ AMENDED (code review round 2 D2 A / S19) — `null` for the HIDDEN reader: the unfiltered
        // `warning_approval_final` told them a hidden key exists; BD4 refuses their revise and the neutral block replaces it.
        expect(hidden.reviseBlocked).toBeNull();
        const other = await stripOf(da, w);
        expect(other).toMatchObject({ kinds: ['peer_says_not_died'], uncoveredSinceApproval: 1, ownVisitPending: false, reviseBlocked: 'warning_approval_final' });
        expect(other.lateKeysUncoveredForViewer).toBe(1);

        expect(await queueIds(inspector, w.pariwarId)).not.toContain(w.claimCaseId);
        expect(await queueIds(da, w.pariwarId)).toContain(w.claimCaseId);

        // A `certificate_check` completed by the inspector — their FULL visit still scheduled ⇒ still hidden.
        await inScope(w.pariwarId, (s) => ensureGroundInspection(deps, s, w.pariwarId, w.claimCaseId, { force: true, stage: 'certificate_check', inspectorActorId: inspector.userId }));
        expect((await stripOf(inspector, w)).ownVisitPending).toBe(true);
        // A completed FULL visit ⇒ every kind shown.
        await inScope(w.pariwarId, (s) => ensureGroundInspection(deps, s, w.pariwarId, w.claimCaseId, { force: true, inspectorActorId: inspector.userId }));
        expect(await stripOf(inspector, w)).toMatchObject({ kinds: ['peer_says_not_died'], uncoveredSinceApproval: 1, ownVisitPending: false, reviseBlocked: 'warning_approval_final' });
        expect(await queueIds(inspector, w.pariwarId)).toContain(w.claimCaseId);
      });

      // Code review round 2 (S5) — from the HIDDEN actor's side: the precondition (their strip shows ⛔ key) is pinned, and
      // the second leg makes the hidden person the one whose COVERAGE the gate computes — a wait read through that
      // person's filtered keys would see ⛔ uncovered key and let the final vote through (red).
      it('the GATE still reads every key: a key hidden from an inspector refuses another District Admin\'s bare approval BY NAME; a late key hidden from the approving District Admin still holds the final vote', async () => {
        const w = await peerWorld();
        await answer(w, 'peer_says_not_died');
        const inspector = await staff(w.pariwarId, 'district_admin');
        await scheduleFor(w, inspector.userId);
        expect(await stripOf(inspector, w)).toMatchObject({ kinds: [], uncoveredSinceApproval: 0, ownVisitPending: true });
        const da = await staff(w.pariwarId, 'district_admin');
        const bare = await da.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`, payload: daApproveBody });
        expect(bare.statusCode).toBe(409);
        expect(errOf(bare.body)).toMatchObject({ code: 'verifier_decision.warning_reason_required', details: { kinds: ['peer_says_not_died'], missing: 'reason' } });
        await daApprove(da, w, true);
        const [record] = await records(w.claimCaseId);
        expect((record!.covered_keys as string[]).filter((k) => k.startsWith('peer_says_not_died:'))).toHaveLength(1);

        // The WAIT: the District Admin approved, a LATE neighbour key arrived, THEN the visit was given to them — the key
        // is hidden from the very person who must answer it, and the final vote still waits for them.
        const l = await peerWorld(w.pariwarId);
        const lda = await staff(l.pariwarId, 'district_admin');
        await daApprove(lda, l, false);
        await answer(l, 'peer_says_not_died');
        await scheduleFor(l, lda.userId);
        expect(await stripOf(lda, l)).toMatchObject({ kinds: [], uncoveredSinceApproval: 0, lateKeysUncoveredForViewer: 0, ownVisitPending: true });
        const held = await finalVote(await staff(l.pariwarId, 'pariwar_admin'), l, true);
        expect(held.statusCode, held.body).toBe(409);
        expect(errOf(held.body)).toMatchObject(waits('cycle_freeze.late_warning_reason_required', 'peer_says_not_died'));
      });

      it('the four HOSTS\' summary for a Pariwar Admin / the Super Admin who is the scheduled inspector — filtered, `own_visit_pending: true`; another approver\'s is not', async () => {
        type Summary = { kinds: string[]; own_visit_pending: boolean; waiting_for_district_admin: boolean };
        // The cycle-freeze pending list.
        const f = await peerWorld();
        await answer(f, 'peer_says_not_died');
        const da = await staff(f.pariwarId, 'district_admin');
        await daApprove(da, f, true);
        const pa = await staff(f.pariwarId, 'pariwar_admin');
        const otherPa = await staff(f.pariwarId, 'pariwar_admin');
        await scheduleFor(f, pa.userId);
        const cardOf = async (who: { client: Client }) =>
          (await pendingOf(who.client, f.pariwarId)).all.find((i) => i.claim_case_id === f.claimCaseId)!.approval_warnings as unknown as Summary;
        expect(await cardOf(pa)).toMatchObject({ kinds: [], own_visit_pending: true });
        expect(await cardOf(otherPa)).toMatchObject({ kinds: ['peer_says_not_died'], own_visit_pending: false });

        // The R9 panel — the summary AND each approve vote's coverage, filtered vs unfiltered.
        const r = await peerWorld();
        const voter = await routeToR9(r);
        expect((await r9Vote(voter, r, false)).statusCode).toBe(201); // a vote cast with ⛔ key
        await answer(r, 'peer_says_not_died'); // the vote now misses the key
        await scheduleFor(r, voter.userId);
        const panelOf = async (who: { client: Client }) => {
          const res = await who.client.inject({ method: 'GET', url: r9Url(r.pariwarId, r.claimCaseId) });
          expect(res.statusCode, res.body).toBe(200);
          return res.json() as { approval_warnings: Summary; votes: { covers_current_warnings: boolean | null }[] };
        };
        const hiddenPanel = await panelOf(voter);
        expect(hiddenPanel.approval_warnings).toMatchObject({ kinds: [], own_visit_pending: true });
        expect(hiddenPanel.votes.map((v) => v.covers_current_warnings)).toEqual([null]); // ⛔ key shown ⇒ ⛔ judged
        const sa = await staff(r.pariwarId, 'super_admin');
        const openPanel = await panelOf(sa);
        expect(openPanel.approval_warnings).toMatchObject({ kinds: ['peer_says_not_died'], own_visit_pending: false });
        expect(openPanel.votes.map((v) => v.covers_current_warnings)).toEqual([false]);

        // The no-correction strip (the closure queue) and the Super Admin's escalation detail.
        const d = await peerWorld();
        await answer(d, 'peer_says_not_died');
        const dda = await staff(d.pariwarId, 'district_admin');
        await daApprove(dda, d, true);
        const dpa = await noCorrectionReady(d, dda);
        await scheduleFor(d, dpa.userId);
        const closureOf = async (who: { client: Client }) => {
          const res = await who.client.inject({ method: 'GET', url: `/api/v1/p/${d.pariwarId}/admin/correction/closure-queue?limit=50` });
          expect(res.statusCode, res.body).toBe(200);
          return (res.json() as { items: { claim_case_id: string; approval_warnings: Summary | null }[] }).items.find((i) => i.claim_case_id === d.claimCaseId)!.approval_warnings;
        };
        expect(await closureOf(dpa)).toMatchObject({ kinds: [], own_visit_pending: true });
        expect(await closureOf(await staff(d.pariwarId, 'pariwar_admin'))).toMatchObject({ kinds: ['peer_says_not_died'], own_visit_pending: false });

        const g = await peerWorld();
        await answer(g, 'peer_says_not_died');
        const gda = await staff(g.pariwarId, 'district_admin');
        await daApprove(gda, g, true);
        const gsa = await escalatedReady(g);
        await scheduleFor(g, gsa.userId);
        const detailOf = async (who: { client: Client }) => {
          const res = await who.client.inject({ method: 'GET', url: `${claimBase(g.pariwarId, g.claimCaseId)}/correction/escalation` });
          expect(res.statusCode, res.body).toBe(200);
          return (res.json() as { approval_warnings: Summary }).approval_warnings;
        };
        expect(await detailOf(gsa)).toMatchObject({ kinds: [], own_visit_pending: true });
        expect(await detailOf(await staff(g.pariwarId, 'super_admin'))).toMatchObject({ kinds: ['peer_says_not_died'], own_visit_pending: false });
      });

      // ── AC7's D1 amendment + its V1 A / X1 A extensions (code review round 2, D1 B + V1 A → S18 / V6; X2, X3, X6): for a
      //    HIDDEN reader EVERY prior staff NOTE on that claim is WITHHELD — approval (whatever its record covers, or with ⛔
      //    no record), denial (incl. a reversed claim's live denial on the cycle-freeze card), escalation, R9 approve AND
      //    deny vote, the Pariwar Admin's return note, the correction-closure notes, the console's visit notes — on every
      //    surface that decrypts one for them, as ONE explicit representation (X2: `{ state: 'withheld', reason }` or the
      //    `…_withheld` / `…Withheld` sibling): `own_visit`; every other reader sees every note. V4 — each surface's hide
      //    read FORCED to fail withholds the notes from a reader who is ⛔ not hidden: `check_failed`.
      describe('AC7 (D1 B + V1 A + X1 A) — every staff NOTE on a claim is withheld from a reader hidden on it', () => {
        const NOTE = daApproveBody.rationale;
        const ESCALATION = 'For the trustee.';
        const DENIAL = 'The papers do not agree.';
        const W = (reason: 'own_visit' | 'check_failed') => ({ state: 'withheld', reason });
        const escalate = async (da: { client: Client }, w: { pariwarId: string; claimCaseId: string }) => {
          const res = await da.client.inject({
            method: 'POST',
            url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
            payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting', rationale: ESCALATION },
          });
          expect(res.statusCode, res.body).toBe(201);
        };
        const deny = async (da: { client: Client }, w: { pariwarId: string; claimCaseId: string }) => {
          const res = await da.client.inject({
            method: 'POST',
            url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
            payload: { outcome: 'denied', reason_code: 'other', rationale: DENIAL },
          });
          expect(res.statusCode, res.body).toBe(201);
        };

        it('the cycle-freeze card — the approval (neighbour-covered, other-kind-covered, unwarned), the escalation AND a reversed claim\'s denial note; V4: a failed hide read withholds from everyone', async () => {
          const peer = await peerWorld();
          await answer(peer, 'peer_says_not_died');
          const other = await seedWorld([daysAgo(30)], peer.pariwarId); // a recent change — a NON-neighbour kind only
          const quiet = await peerWorld(peer.pariwarId); // ⛔ warning ⇒ ⛔ approval record
          const esc = await peerWorld(peer.pariwarId);
          const da = await staff(peer.pariwarId, 'district_admin');
          await daApprove(da, peer, true);
          await daApprove(da, other, true);
          await daApprove(da, quiet, false);
          await escalate(da, esc);
          // X3 — a DENIAL on the card: denied by the District Admin, then reversed on appeal (the `reversed` bucket keeps
          // the live verifier decision — the denial — as its provenance).
          const rev = await peerWorld(peer.pariwarId);
          await deny(da, rev);
          await inScope(rev.pariwarId, async (s) => {
            const deceased = (await td.pool.query<{ d: string }>('SELECT deceased_member_id AS d FROM claims WHERE claim_case_id = $1', [rev.claimCaseId])).rows[0]!.d;
            const emit = (from: string, to: string, eventType: string, extra: Json = {}) =>
              claim.projectClaimState(s.client, {
                claimCaseId: ids.claimId(rev.claimCaseId),
                pariwarId: ids.pariwarId(rev.pariwarId),
                deceasedMemberId: ids.memberId(deceased),
                intakeChannels: ['helpline'],
                claimantActorId: null,
                eventType: eventType as never,
                payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
                actorId: null,
              });
            await emit('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
            await emit('appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
            await emit('reversed', 'reversed', 'claim.reversed', { reversed_at_stage: 1, disposition_category: 'reconsideration_on_merits' });
          });
          expect((await records(peer.claimCaseId))[0]!.covered_keys as string[]).toEqual([expect.stringMatching(/^peer_says_not_died:/)]);
          expect((await records(other.claimCaseId))[0]!.covered_keys as string[]).toEqual([expect.stringMatching(/^recent_nominee_change:/)]);
          expect(await records(quiet.claimCaseId)).toEqual([]);
          const pa = await staff(peer.pariwarId, 'pariwar_admin');
          for (const w of [peer, other, quiet, esc, rev]) await scheduleFor(w, pa.userId);
          const rationalesOf = async (who: { client: Client }) => {
            const { all } = await pendingOf(who.client, peer.pariwarId);
            const of = (w: { claimCaseId: string }) => {
              const c = all.find((i) => i.claim_case_id === w.claimCaseId) as unknown as { verifier_rationale: string | null; verifier_rationale_withheld: string | null };
              return [c.verifier_rationale, c.verifier_rationale_withheld];
            };
            return [of(peer), of(other), of(quiet), of(esc), of(rev)];
          };
          expect(await rationalesOf(pa)).toEqual(Array(5).fill([null, 'own_visit']));
          const otherPa = await staff(peer.pariwarId, 'pariwar_admin');
          expect(await rationalesOf(otherPa)).toEqual([[NOTE, null], [NOTE, null], [NOTE, null], [ESCALATION, null], [DENIAL, null]]);
          expect(await withHideFault(['ownVisitBulk'], () => rationalesOf(otherPa))).toEqual(Array(5).fill([null, 'check_failed']));
        });

        it('each R9 vote\'s rationale — approve AND deny — on the panel and in the votes-by-trustee transcript; V4 on both reads', async () => {
          const votesUrl = (p: string, a: string) => `/api/v1/p/${p}/admin/r9-voting/votes-by-trustee?actorId=${a}`;
          const panelOf = async (who: { client: Client }, w: { pariwarId: string; claimCaseId: string }) => {
            const res = await who.client.inject({ method: 'GET', url: r9Url(w.pariwarId, w.claimCaseId) });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as { votes: { rationale: string; rationale_withheld: string | null }[] }).votes.map((v) => [v.rationale, v.rationale_withheld]);
          };
          const byTrusteeOf = async (who: { client: Client }, w: { pariwarId: string }, voterId: string) => {
            const res = await who.client.inject({ method: 'GET', url: votesUrl(w.pariwarId, voterId) });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as { votes: { rationale: string; rationale_withheld: string | null }[] }).votes.map((v) => [v.rationale, v.rationale_withheld]);
          };
          // Four R9 worlds (a FRESH Pariwar each — the clause is seeded once per Pariwar): an approve vote whose record
          // covers the neighbour key; one whose record covers only a nominee kind; one with ⛔ record; a DENY vote.
          const peer = await peerWorld();
          await answer(peer, 'peer_says_not_died');
          const peerVoter = await routeToR9(peer);
          expect((await r9Vote(peerVoter, peer, true)).statusCode).toBe(201);
          const other = { ...(await seedWorld([daysAgo(300), daysAgo(30)])), member: '', ping: '' }; // `r9Vote` reads only the ids
          const otherVoter = await routeToR9(other);
          expect((await r9Vote(otherVoter, other, true)).statusCode).toBe(201);
          const quiet = await peerWorld();
          const quietVoter = await routeToR9(quiet);
          expect((await r9Vote(quietVoter, quiet, false)).statusCode).toBe(201);
          const denied = await peerWorld();
          const denyVoter = await routeToR9(denied);
          const denyVote = await denyVoter.client.inject({ method: 'POST', url: `${r9Url(denied.pariwarId, denied.claimCaseId)}/vote`, payload: { vote: 'deny', rationale: 'no' } });
          expect(denyVote.statusCode, denyVote.body).toBe(201);
          expect(await records(quiet.claimCaseId)).toEqual([]);

          for (const [w, voter, note] of [
            [peer, peerVoter, 'yes'],
            [other, otherVoter, 'yes'],
            [quiet, quietVoter, 'yes'],
            [denied, denyVoter, 'no'],
          ] as const) {
            const hidden = await staff(w.pariwarId, 'pariwar_admin');
            await scheduleFor(w, hidden.userId);
            expect(await panelOf(hidden, w), w.claimCaseId).toEqual([['', 'own_visit']]);
            expect(await byTrusteeOf(hidden, w, voter.userId), w.claimCaseId).toEqual([['', 'own_visit']]);
            // Another reader (the voter, ⛔ hidden) sees every note…
            expect(await panelOf(voter, w), w.claimCaseId).toEqual([[note, null]]);
            expect(await byTrusteeOf(voter, w, voter.userId), w.claimCaseId).toEqual([[note, null]]);
          }
          // …unless that reader's hide read FAILS (V4): the panel's one-claim read, the transcript's set-based read.
          expect(await withHideFault(['ownVisitOne'], () => panelOf(peerVoter, peer))).toEqual([['', 'check_failed']]);
          expect(await withHideFault(['ownVisitBulk'], () => byTrusteeOf(denyVoter, denied, denyVoter.userId))).toEqual([['', 'check_failed']]);
        });

        it('the console\'s prior comments (approval, escalation, denial), each precedent by THAT precedent\'s claim, and (X6) the visit notes; V4 on each read', async () => {
          const approved = await peerWorld();
          await answer(approved, 'peer_says_not_died');
          const escalated = await peerWorld(approved.pariwarId);
          const denied = await peerWorld(approved.pariwarId);
          const open = await peerWorld(approved.pariwarId); // the inspector is ⛔ hidden here
          const noNote = await peerWorld(approved.pariwarId); // Y3 — an approval with ⛔ note at all
          const da = await staff(approved.pariwarId, 'district_admin');
          // The visits are assigned FIRST — a denied claim is outside the inspection window.
          const inspector = await staff(approved.pariwarId, 'district_admin');
          for (const w of [approved, escalated, denied, noNote]) await scheduleFor(w, inspector.userId);
          await daApprove(da, approved, true);
          await escalate(da, escalated);
          await deny(da, denied);
          await daApprove(da, open, false);
          const bareApprove = await da.client.inject({
            method: 'POST',
            url: `${claimBase(noNote.pariwarId, noNote.claimCaseId)}/verifier-decision`,
            payload: { outcome: 'approved', reason_code: daApproveBody.reason_code },
          });
          expect(bareApprove.statusCode, bareApprove.body).toBe(201);
          // X6 — a visit NOTE on the inspector's own pending assignment (the scheduler's words; ⛔ author is recorded).
          const VISIT_NOTE = 'Ask the neighbour on the left first.';
          await td.pool.query('UPDATE claim_ground_inspections SET notes_ciphertext = $3 WHERE claim_case_id = $1 AND inspector_actor_id = $2', [
            approved.claimCaseId,
            inspector.userId,
            await encryptGroundInspectionField(VISIT_NOTE, approved.pariwarId, deps.encryption),
          ]);
          type Console = {
            packet: {
              priorVerifierComments: { comments?: { rationale: string; rationaleWithheld: string | null }[] };
              recentPrecedents: { precedents?: { claimCaseId: string; rationale: string | null; rationaleWithheld: string | null }[] };
              groundInspection: { assignments?: { inspectorActorId: string; notes: string | null; notesWithheld: string | null }[] };
            };
          };
          const consoleOf = async (who: { client: Client }, w: { claimCaseId: string }) => {
            const res = await who.client.inject({ method: 'GET', url: `${claimBase(approved.pariwarId, w.claimCaseId)}/verifier-console` });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as Console).packet;
          };
          const priorOf = async (who: { client: Client }, w: { claimCaseId: string }) =>
            (await consoleOf(who, w)).priorVerifierComments.comments?.map((c) => [c.rationale, c.rationaleWithheld]);
          const precedentsOf = async (who: { client: Client }, w: { claimCaseId: string }, of = [approved, denied]) => {
            const list = (await consoleOf(who, w)).recentPrecedents.precedents ?? [];
            return of.map((x) => {
              const p = list.find((y) => y.claimCaseId === x.claimCaseId);
              return [p?.rationale, p?.rationaleWithheld];
            });
          };
          const visitNoteOf = async (who: { client: Client }) => {
            const a = (await consoleOf(who, approved)).groundInspection.assignments?.find((x) => x.inspectorActorId === inspector.userId);
            return [a?.notes, a?.notesWithheld];
          };
          for (const w of [approved, escalated, denied]) expect(await priorOf(inspector, w), w.claimCaseId).toEqual([['', 'own_visit']]);
          // Y3 — PRESENCE ⛔ signals: the approval with ⛔ note reads the SAME as a noted one for the hidden reader, on the
          // console's own transcript AND on a list surface (the open claim's precedents) — and plainly empty for another.
          expect(await priorOf(inspector, noNote)).toEqual([['', 'own_visit']]);
          expect(await priorOf(da, noNote)).toEqual([['', null]]);
          expect(await precedentsOf(inspector, open, [approved, noNote])).toEqual([[null, 'own_visit'], [null, 'own_visit']]);
          expect(await precedentsOf(da, open, [approved, noNote])).toEqual([[NOTE, null], [null, null]]);
          expect(await priorOf(inspector, open)).toEqual([[NOTE, null]]);
          // (f) — the open claim's precedents are the approval and the denial, on claims the inspector is hidden on.
          expect(await precedentsOf(inspector, open)).toEqual([[null, 'own_visit'], [null, 'own_visit']]);
          expect(await visitNoteOf(inspector)).toEqual([null, 'own_visit']);
          expect(await priorOf(da, approved)).toEqual([[NOTE, null]]);
          expect(await priorOf(da, escalated)).toEqual([[ESCALATION, null]]);
          expect(await priorOf(da, denied)).toEqual([[DENIAL, null]]);
          expect(await precedentsOf(da, open)).toEqual([[NOTE, null], [DENIAL, null]]);
          expect(await visitNoteOf(da)).toEqual([VISIT_NOTE, null]);
          // V4 — the District Admin (⛔ hidden): a failed peer-section hide (V11) withholds THIS claim's notes; a failed
          // precedents' hide read withholds the precedents' — each alone.
          expect(await withHideFault(['hideCheck'], () => priorOf(da, open))).toEqual([['', 'check_failed']]);
          expect(await withHideFault(['hideCheck'], () => visitNoteOf(da))).toEqual([null, 'check_failed']);
          expect(await withHideFault(['hideCheck'], () => precedentsOf(da, open))).toEqual([[NOTE, null], [DENIAL, null]]);
          expect(await withHideFault(['ownVisitBulk'], () => precedentsOf(da, open))).toEqual([[null, 'check_failed'], [null, 'check_failed']]);
          expect(await withHideFault(['ownVisitBulk'], () => priorOf(da, open))).toEqual([[NOTE, null]]);
          // Y8 — the visit note's RECORDED author is the inspector themselves (migration 0159): their own words read plainly
          // on the console while their visit is pending (⛔ author recorded above ⇒ withheld; a scheduler's would stay so).
          await td.pool.query('UPDATE claim_ground_inspections SET notes_author_actor_id = $3 WHERE claim_case_id = $1 AND inspector_actor_id = $2', [
            approved.claimCaseId,
            inspector.userId,
            inspector.userId.toLowerCase(),
          ]);
          expect(await visitNoteOf(inspector)).toEqual([VISIT_NOTE, null]);
        });

        it('the Pariwar Admin\'s RETURN note — on the name-check panel and in the correction queue; V4', async () => {
          const w = await peerWorld();
          const da = await staff(w.pariwarId, 'district_admin');
          await daApprove(da, w, false);
          const pa = await staff(w.pariwarId, 'pariwar_admin');
          const ret = await pa.client.inject({
            method: 'POST',
            url: cycleDecisionUrl(w.pariwarId),
            payload: { claim_case_id: w.claimCaseId, action: 'return_to_district_admin', reason_code: 'other', rationale: 'one more try', must_act: 'family' },
          });
          expect(ret.statusCode, ret.body).toBe(201);
          const inspector = await staff(w.pariwarId, 'district_admin');
          await scheduleFor(w, inspector.userId);
          const panelNote = async (who: { client: Client }) => {
            const res = await who.client.inject({ method: 'GET', url: `${claimBase(w.pariwarId, w.claimCaseId)}/nominee-name-check` });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as { correction_return: { note: Json } | null }).correction_return?.note;
          };
          const queueNote = async (who: { client: Client }) => {
            const res = await who.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/claims/under-correction` });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as { items: { claim_case_id: string; return_note: Json | null }[] }).items.find((i) => i.claim_case_id === w.claimCaseId)?.return_note;
          };
          expect(await panelNote(inspector)).toEqual(W('own_visit'));
          expect(await queueNote(inspector)).toEqual(W('own_visit'));
          expect(await panelNote(da)).toEqual({ state: 'readable', value: 'one more try' });
          expect(await queueNote(da)).toEqual({ state: 'readable', value: 'one more try' });
          expect(await withHideFault(['ownVisitBulk'], () => panelNote(da))).toEqual(W('check_failed'));
          expect(await withHideFault(['ownVisitBulk'], () => queueNote(da))).toEqual(W('check_failed'));
        });

        it('the correction-closure notes — the closure queue\'s note and the escalation detail\'s review + direction; V4', async () => {
          // The closure queue: a "no correction needed" record with a REAL note.
          const d = await peerWorld();
          const dda = await staff(d.pariwarId, 'district_admin');
          await daApprove(dda, d, false);
          const { pa: dpa } = await returnAndMark(d, 'family');
          const QUEUE_NOTE = 'The family confirmed the account.';
          const queueNoteCiphertext = await encryptClosureField(QUEUE_NOTE, d.pariwarId, CLAIM_CORRECTION_CLOSURE_FIELD_CLASS, deps.encryption);
          await inScope(d.pariwarId, (s) =>
            claim.recordNoCorrectionNeeded(s.client, {
              pariwarId: ids.pariwarId(d.pariwarId),
              claimCaseId: ids.claimId(d.claimCaseId),
              actorId: dda.userId,
              actorDisplay: 'Anita (District Admin)',
              now: new Date(),
              markNoteCiphertext: 'enc:v1:m',
              noteCiphertext: queueNoteCiphertext,
              setByRole: 'district_admin',
              hold: claim.isCorrectionClaimHeld,
            }),
          );
          const hiddenPa = await staff(d.pariwarId, 'pariwar_admin');
          await scheduleFor(d, hiddenPa.userId);
          const queueNoteOf = async (who: { client: Client }) => {
            const res = await who.client.inject({ method: 'GET', url: `/api/v1/p/${d.pariwarId}/admin/correction/closure-queue?limit=50` });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as { items: { claim_case_id: string; note: Json }[] }).items.find((i) => i.claim_case_id === d.claimCaseId)?.note;
          };
          expect(await queueNoteOf(hiddenPa)).toEqual(W('own_visit'));
          expect(await queueNoteOf(dpa)).toEqual({ state: 'readable', value: QUEUE_NOTE });
          expect(await withHideFault(['ownVisitBulk'], () => queueNoteOf(dpa))).toEqual(W('check_failed'));

          // The escalation detail: a review note and a direction, by the Super Admin who is ⛔ hidden.
          const g = await peerWorld();
          const gda = await staff(g.pariwarId, 'district_admin');
          await daApprove(gda, g, false);
          const sa = await escalatedReady(g);
          const review = await sa.client.inject({ method: 'POST', url: `${claimBase(g.pariwarId, g.claimCaseId)}/correction/escalation/review`, payload: { note: 'Looking into it.' } });
          expect(review.statusCode, review.body).toBe(201);
          const direction = await sa.client.inject({
            method: 'POST',
            url: `${claimBase(g.pariwarId, g.claimCaseId)}/correction/escalation/directions`,
            payload: { directed_to_actor: gda.userId, directed_to_role: 'district_admin', kind: 'other', text: 'Call the family once more.' },
          });
          expect(direction.statusCode, direction.body).toBe(201);
          const hiddenSa = await staff(g.pariwarId, 'super_admin');
          await scheduleFor(g, hiddenSa.userId);
          type Detail = { review_note: Json | null; directions: { text: Json; response: Json | null }[] };
          const detailOf = async (who: { client: Client }) => {
            const res = await who.client.inject({ method: 'GET', url: `${claimBase(g.pariwarId, g.claimCaseId)}/correction/escalation` });
            expect(res.statusCode, res.body).toBe(200);
            const body = res.json() as Detail;
            return { review: body.review_note, texts: body.directions.map((x) => x.text) };
          };
          expect(await detailOf(hiddenSa)).toEqual({ review: W('own_visit'), texts: [W('own_visit')] });
          const shown = { review: { state: 'readable', value: 'Looking into it.' }, texts: [{ state: 'readable', value: 'Call the family once more.' }] };
          expect(await detailOf(sa)).toEqual(shown);
          expect(await withHideFault(['ownVisitBulk'], () => detailOf(sa))).toEqual({ review: W('check_failed'), texts: [W('check_failed')] });
        });

        it('the refusals list — a `-239` refusal\'s DENIAL note; V4', async () => {
          const w = await seedWorld([daysAgo(400), daysAgo(200)]);
          await redetermine(w.pariwarId, w.claimCaseId, istDaysAgo(250)); // the 200-day version is post-death ⇒ grounded
          const REFUSAL = 'Nominee changed after the death.';
          // The visit is assigned FIRST — a denied claim is outside the inspection window.
          const hidden = await staff(w.pariwarId, 'pariwar_admin');
          await scheduleFor(w, hidden.userId);
          await inScope(w.pariwarId, async (s) =>
            claim.adjudicateClaim(s.client, {
              claimCaseId: ids.claimId(w.claimCaseId),
              pariwarId: ids.pariwarId(w.pariwarId),
              outcome: 'denied',
              reasonCode: 'post_death_nominee_change',
              rationaleCiphertext: await encryptVerifierRationale(REFUSAL, w.pariwarId, deps.encryption),
              actorId: randomUUID(),
              actorDisplay: 'Anita (District Admin)',
              actor: 'operator',
            }),
          );
          const rationaleOf = async (who: { client: Client }) => {
            const res = await who.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-refusals` });
            expect(res.statusCode, res.body).toBe(200);
            return (res.json() as { items: { claim_case_id: string; rationale: Json | null }[] }).items.find((i) => i.claim_case_id === w.claimCaseId)?.rationale;
          };
          expect(await rationaleOf(hidden)).toEqual(W('own_visit'));
          const other = await staff(w.pariwarId, 'pariwar_admin');
          expect(await rationaleOf(other)).toEqual({ state: 'readable', value: REFUSAL });
          expect(await withHideFault(['ownVisitBulk'], () => rationaleOf(other))).toEqual(W('check_failed'));
        });
      });

      // Code review round 2 (V4) — S19's fail-closed path: a HIDDEN reader whose warnings read FAILS gets `null`, ⛔ the
      // `'unavailable'` every other reader gets on the same fault.
      it('S19 — a failed warnings read: `reviseBlocked` is `null` for the hidden inspector, `unavailable` for another District Admin', async () => {
        const w = await peerWorld();
        const da = await staff(w.pariwarId, 'district_admin');
        await daApprove(da, w, false);
        const inspector = await staff(w.pariwarId, 'district_admin');
        await scheduleFor(w, inspector.userId);
        const hidden = await withFault(() => stripOf(inspector, w));
        expect(hidden).toMatchObject({ ownVisitPending: true, reviseBlocked: null });
        expect(await withFault(() => stripOf(da, w))).toMatchObject({ ownVisitPending: false, reviseBlocked: 'unavailable' });
      });
    });

    describe('AC10 — a hidden actor cannot approve (BD4)', () => {
      const NEUTRAL = /A ground visit on this claim is assigned to you and is not finished\. It must be completed, or given to someone else, before you can approve\./;
      /** A `scheduled` FULL visit on `w`, assigned to `actorId` (the REAL writer). */
      const assign = (w: { pariwarId: string; claimCaseId: string }, actorId: string, stage: 'initial' | 'certificate_check' = 'initial') =>
        inScope(w.pariwarId, async (s) =>
          (
            await claim.scheduleGroundInspection(s.client, {
              claimCaseId: ids.claimId(w.claimCaseId),
              pariwarId: ids.pariwarId(w.pariwarId),
              district: DISTRICT,
              inspectionStage: stage,
              inspectionSiteType: 'family_residence',
              inspectorActorId: actorId,
              scheduledAt: new Date(),
              scheduledByActor: randomUUID(),
              idempotencyKey: randomUUID(),
            })
          ).groundInspection.groundInspectionId,
        );
      const refusedNeutrally = (res: { statusCode: number; body: string }, prefix: string) => {
        expect(res.statusCode, res.body).toBe(409);
        const err = errOf(res.body);
        expect(err.code).toBe(`${prefix}.own_ground_visit_pending`);
        expect(err.message).toMatch(NEUTRAL);
        expect(err.details).toBeUndefined();
        expect(res.body).not.toMatch(/peer_|neighbour|kinds/);
      };
      /** Code review round 2 (S5) — "nothing written", ONE shape for every refused approve: the claim's state, its events
       *  and every decision / vote / record / closure row it owns (total AND live — a supersession is a write too). */
      const footprint = async (claimCaseId: string) =>
        (
          await td.pool.query(
            `SELECT (SELECT current_state FROM claims WHERE claim_case_id = $1) AS state,
                    (SELECT count(*)::int FROM events_log WHERE stream_id = $1) AS events,
                    (SELECT count(*)::int FROM claim_warning_approvals WHERE claim_case_id = $1) AS records,
                    (SELECT count(*)::int FROM claim_verifier_decisions WHERE claim_case_id = $1) AS verifier,
                    (SELECT count(*)::int FROM claim_verifier_decisions WHERE claim_case_id = $1 AND superseded_at IS NULL) AS verifier_live,
                    (SELECT count(*)::int FROM claim_state_trustee_decisions WHERE claim_case_id = $1) AS trustee,
                    (SELECT count(*)::int FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND superseded_at IS NULL) AS trustee_live,
                    (SELECT count(*)::int FROM claim_r9_votes WHERE claim_case_id = $1) AS votes,
                    (SELECT count(*)::int FROM claim_r9_votes WHERE claim_case_id = $1 AND superseded_at IS NULL) AS votes_live,
                    (SELECT count(*)::int FROM claim_r9_voting_sessions WHERE claim_case_id = $1 AND outcome IS NOT NULL) AS sessions_decided,
                    (SELECT coalesce(json_agg(json_build_array(state, super_admin_decision) ORDER BY closure_id), '[]'::json)
                       FROM claim_correction_closures WHERE claim_case_id = $1) AS closures`,
            [claimCaseId],
          )
        ).rows[0] as Json;
      const refusedWritingNothing = async (claimCaseId: string, prefix: string, act: () => Promise<{ statusCode: number; body: string }>) => {
        const before = await footprint(claimCaseId);
        refusedNeutrally(await act(), prefix);
        expect(await footprint(claimCaseId)).toEqual(before);
      };
      const stateOf = async (claimCaseId: string) =>
        (await td.pool.query<{ s: string }>('SELECT current_state AS s FROM claims WHERE claim_case_id = $1', [claimCaseId])).rows[0]!.s;
      const approveWith = (da: { client: Client }, w: W, warned: boolean) =>
        da.client.inject({
          method: 'POST',
          url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
          payload: warned ? { ...daApproveBody, warning_reason_code: GENERIC } : daApproveBody,
        });

      for (const withKey of [false, true]) {
        const label = withKey ? 'WITH a neighbour key current' : 'with ⛔ neighbour key';
        it(`the District Admin's approval and its revise; the late reason — ${label}`, async () => {
          const w = await peerWorld();
          if (withKey) await answer(w, 'peer_says_not_died');
          const da = await staff(w.pariwarId, 'district_admin');
          await assign(w, da.userId);
          await refusedWritingNothing(w.claimCaseId, 'verifier_decision', () => approveWith(da, w, withKey));
          expect(await records(w.claimCaseId)).toEqual([]);
          expect(await stateOf(w.claimCaseId)).toBe('verification_in_progress'); // ⛔ even the review-entry event

          // The revise of an approval (approved BEFORE the visit was assigned — that approval STANDS).
          const r = await peerWorld();
          const rda = await staff(r.pariwarId, 'district_admin');
          await daApprove(rda, r, false);
          if (withKey) await answer(r, 'peer_says_not_died'); // late — also what makes the late reason meaningful
          await assign(r, rda.userId);
          await elevate(rda.client, 'claim_decision_revise');
          await refusedWritingNothing(r.claimCaseId, 'verifier_decision', () =>
            rda.client.inject({
              method: 'POST',
              url: `${claimBase(r.pariwarId, r.claimCaseId)}/verifier-decision/revise`,
              payload: { outcome: 'approved', reason_code: 'r8_90pct_met', rationale: 'new words' },
            }),
          );
          // The late reason (an approving act — it covers a key for good).
          await refusedWritingNothing(r.claimCaseId, 'verifier_decision', () =>
            rda.client.inject({
              method: 'POST',
              url: `${claimBase(r.pariwarId, r.claimCaseId)}/verifier-decision/late-warning-reason`,
              payload: { warning_reason_code: GENERIC, note: 'Read it.' },
            }),
          );
          // The approval was quiet (the answer, if any, came AFTER it) ⇒ ⛔ record of its own; and ⛔ late-reason row
          // after the refusal — the claim carries NO record at all (S5: was a `withKey ? [] : []` tautology).
          expect(await records(r.claimCaseId)).toEqual([]);
          expect(await stateOf(r.claimCaseId)).toBe('verifier_approved');
        });

        it(`the final vote, the escalation resolution, R9 vote and finalize, D27 and G1 — ${label}`, async () => {
          // Final vote.
          const f = await peerWorld();
          if (withKey) await answer(f, 'peer_says_not_died');
          const fda = await staff(f.pariwarId, 'district_admin');
          await daApprove(fda, f, withKey);
          const pa = await staff(f.pariwarId, 'pariwar_admin');
          await assign(f, pa.userId);
          await refusedWritingNothing(f.claimCaseId, 'cycle_freeze', () => finalVote(pa, f, withKey));
          expect(await stateOf(f.claimCaseId)).toBe('verifier_approved');

          // Escalation resolution.
          const e = await peerWorld(f.pariwarId);
          if (withKey) await answer(e, 'peer_says_not_died');
          const esc = await fda.client.inject({
            method: 'POST',
            url: `${claimBase(e.pariwarId, e.claimCaseId)}/verifier-decision`,
            payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting', rationale: 'For the trustee.' },
          });
          expect(esc.statusCode, esc.body).toBe(201); // an escalation by a hidden-or-not DA is ⛔ gated
          await assign(e, pa.userId);
          await refusedWritingNothing(e.claimCaseId, 'cycle_freeze', () =>
            pa.client.inject({
              method: 'POST',
              url: cycleDecisionUrl(e.pariwarId),
              payload: {
                claim_case_id: e.claimCaseId,
                action: 'resolve_escalation',
                escalation_outcome: 'approved',
                ...(withKey ? { warning_reason_code: GENERIC, rationale: 'why' } : {}),
              },
            }),
          );

          // R9 — an approve vote refused, a deny vote accepted; a finalize computing "approved" refused.
          const r9 = await peerWorld();
          if (withKey) await answer(r9, 'peer_says_not_died');
          const voter = await routeToR9(r9);
          await assign(r9, voter.userId);
          await refusedWritingNothing(r9.claimCaseId, 'r9_voting', () => r9Vote(voter, r9, withKey));
          const r9b = await peerWorld();
          if (withKey) await answer(r9b, 'peer_says_not_died');
          const voterB = await routeToR9(r9b);
          expect((await r9Vote(voterB, r9b, withKey)).statusCode).toBe(201); // cast BEFORE the visit — it STANDS
          await assign(r9b, voterB.userId);
          await refusedWritingNothing(r9b.claimCaseId, 'r9_voting', () => r9Finalize(voterB, r9b));

          // D27 — the "no correction needed" approval.
          const d = await peerWorld();
          if (withKey) await answer(d, 'peer_says_not_died');
          const dda = await staff(d.pariwarId, 'district_admin');
          await daApprove(dda, d, withKey);
          const dpa = await noCorrectionReady(d, dda);
          await assign(d, dpa.userId);
          await refusedWritingNothing(d.claimCaseId, 'closure', () =>
            dpa.client.inject({ method: 'POST', url: noCorrectionUrl(d), payload: withKey ? { warning_reason_code: GENERIC, note: 'Read it.' } : {} }),
          );

          // G1 — the Super Admin.
          const g = await peerWorld();
          if (withKey) await answer(g, 'peer_says_not_died');
          const gda = await staff(g.pariwarId, 'district_admin');
          await daApprove(gda, g, withKey);
          const sa = await escalatedReady(g);
          await assign(g, sa.userId);
          await refusedWritingNothing(g.claimCaseId, 'closure', () => g1(sa, g, withKey));
          expect(await records(g.claimCaseId)).toEqual(withKey ? [expect.objectContaining({ step: 'district_admin_approval' })] : []);
        });
      }

      it('⛔ never refused: a hidden actor\'s denial (and its revise) and escalation, an R9 deny vote, a finalize that computes "denied", a final-vote denial, a return and G1\'s refuse', async () => {
        const w = await peerWorld();
        await answer(w, 'peer_says_not_died');
        const da = await staff(w.pariwarId, 'district_admin');
        await assign(w, da.userId);
        const deny = await da.client.inject({
          method: 'POST',
          url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
          payload: { outcome: 'denied', reason_code: 'other', rationale: 'Not this one.' },
        });
        expect(deny.statusCode, deny.body).toBe(201);
        // S5 — the revise of that DENIAL (same outcome, new words) by the same hidden actor.
        await elevate(da.client, 'claim_decision_revise');
        const reviseDenial = await da.client.inject({
          method: 'POST',
          url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision/revise`,
          payload: { outcome: 'denied', reason_code: 'other', rationale: 'Not this one — the papers do not agree.' },
        });
        expect(reviseDenial.statusCode, reviseDenial.body).toBe(201);
        expect(await stateOf(w.claimCaseId)).toBe('denied');
        const x = await peerWorld(w.pariwarId);
        await assign(x, da.userId);
        const esc = await da.client.inject({
          method: 'POST',
          url: `${claimBase(x.pariwarId, x.claimCaseId)}/verifier-decision`,
          payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting', rationale: 'For the trustee.' },
        });
        expect(esc.statusCode, esc.body).toBe(201);
        const r = await peerWorld();
        const voter = await routeToR9(r);
        await assign(r, voter.userId);
        const denyVote = await voter.client.inject({ method: 'POST', url: `${r9Url(r.pariwarId, r.claimCaseId)}/vote`, payload: { vote: 'deny', rationale: 'no' } });
        expect(denyVote.statusCode, denyVote.body).toBe(201);
        const fin = await r9Finalize(voter, r);
        expect(fin.statusCode, fin.body).toBe(200);
        expect(await stateOf(r.claimCaseId)).toBe('denied');

        // S5 — a refusal at a LATER step and a return, each by a hidden Pariwar Admin / Super Admin.
        const fd = await peerWorld();
        await answer(fd, 'peer_says_not_died');
        const fda = await staff(fd.pariwarId, 'district_admin');
        await daApprove(fda, fd, true);
        const pa = await staff(fd.pariwarId, 'pariwar_admin');
        await assign(fd, pa.userId);
        const finalDeny = await pa.client.inject({
          method: 'POST',
          url: cycleDecisionUrl(fd.pariwarId),
          payload: { claim_case_id: fd.claimCaseId, action: 'deny', reason_code: 'documents_insufficient', rationale: 'the papers never came' },
        });
        expect(finalDeny.statusCode, finalDeny.body).toBe(201);
        expect(await stateOf(fd.claimCaseId)).toBe('denied');
        const fr = await peerWorld(fd.pariwarId);
        await answer(fr, 'peer_says_not_died');
        await daApprove(fda, fr, true);
        await assign(fr, pa.userId);
        const ret = await pa.client.inject({
          method: 'POST',
          url: cycleDecisionUrl(fr.pariwarId),
          payload: { claim_case_id: fr.claimCaseId, action: 'return_to_district_admin', reason_code: 'other', rationale: 'one more try', must_act: 'family' },
        });
        expect(ret.statusCode, ret.body).toBe(201);
        // G1 — the Super Admin's REFUSE (a staff-case origin, so `close` is refused on origin — `-274` 1a).
        const g = await peerWorld();
        await answer(g, 'peer_says_not_died');
        const gda = await staff(g.pariwarId, 'district_admin');
        await daApprove(gda, g, true);
        const sa = await escalatedReady(g);
        await assign(g, sa.userId);
        const refuse = await sa.client.inject({
          method: 'POST',
          url: g1Url(g),
          payload: { decision: 'refuse', reason: 'claim_not_payable', refusal_reason_code: 'documents_insufficient', note: 'n' },
        });
        expect(refuse.statusCode, refuse.body).toBe(201);
        expect(await stateOf(g.claimCaseId)).toBe('denied');
      });

      // Code review round 2 (S14, V2) — a LEGACY row stores the inspector id as supplied (V2 normalises ON WRITE, so the
      // variant is seeded directly); an exact-text match would leave the assigned person UN-hidden and able to approve.
      it('the inspector id is matched normalised: a case / whitespace variant stored on a legacy row still hides the section and still refuses', async () => {
        const w = await peerWorld();
        await answer(w, 'peer_says_not_died');
        const da = await staff(w.pariwarId, 'district_admin');
        const gid = await assign(w, da.userId);
        await td.pool.query('UPDATE claim_ground_inspections SET inspector_actor_id = $2 WHERE ground_inspection_id = $1', [gid, `\t ${da.userId.toUpperCase()} `]);
        const res = await da.client.inject({ method: 'GET', url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-console` });
        expect(res.statusCode, res.body).toBe(200);
        expect((res.json() as { packet: { approvalWarnings: Json } }).packet.approvalWarnings).toMatchObject({ kinds: [], ownVisitPending: true });
        await refusedWritingNothing(w.claimCaseId, 'verifier_decision', () => approveWith(da, w, true));
      });

      it('the refusal LIFTS on a completed FULL visit and on the assignment being superseded; a `certificate_check` completion does ⛔ not lift it', async () => {
        // A certificate check completed by the same actor while their FULL visit stays scheduled ⇒ still refused.
        const c = await peerWorld();
        const cda = await staff(c.pariwarId, 'district_admin');
        await assign(c, cda.userId);
        await inScope(c.pariwarId, (s) => ensureGroundInspection(deps, s, c.pariwarId, c.claimCaseId, { force: true, stage: 'certificate_check', inspectorActorId: cda.userId }));
        refusedNeutrally(await approveWith(cda, c, false), 'verifier_decision');
        // …then a completed FULL visit by them ⇒ lifted.
        await inScope(c.pariwarId, (s) => ensureGroundInspection(deps, s, c.pariwarId, c.claimCaseId, { force: true, inspectorActorId: cda.userId }));
        const ok = await approveWith(cda, c, false);
        expect(ok.statusCode, ok.body).toBe(201);

        // Superseded (given to someone else) ⇒ lifted.
        const s2 = await peerWorld(c.pariwarId);
        const gid = await assign(s2, cda.userId);
        refusedNeutrally(await approveWith(cda, s2, false), 'verifier_decision');
        await inScope(s2.pariwarId, (s) =>
          claim.rescheduleGroundInspection(s.client, {
            pariwarId: ids.pariwarId(s2.pariwarId),
            groundInspectionId: gid,
            idempotencyKey: randomUUID(),
            district: DISTRICT,
            inspectionStage: 'initial',
            inspectionSiteType: 'family_residence',
            inspectorActorId: randomUUID(),
            scheduledAt: new Date(),
            scheduledByActor: randomUUID(),
          }),
        );
        const lifted = await approveWith(cda, s2, false);
        expect(lifted.statusCode, lifted.body).toBe(201);
      });
    });

    for (const kind of KINDS) {
      describe(`\`${kind}\``, () => {
        it('the District Admin: ⛔ reason ⇒ 409 naming it, ⛔ refused; with one ⇒ 201 and the record covers the key; a refusal and an escalation are ⛔ gated', async () => {
          const w = await peerWorld();
          await answer(w, kind);
          const da = await staff(w.pariwarId, 'district_admin');
          const bare = await da.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`, payload: daApproveBody });
          expect(bare.statusCode, bare.body).toBe(409);
          expect(errOf(bare.body)).toMatchObject(reasonRequired('verifier_decision.warning_reason_required', kind));
          await daApprove(da, w, true);
          const rec = (await records(w.claimCaseId)).find((r) => r.step === 'district_admin_approval')!;
          expect((rec.covered_keys as string[]).filter((k) => k.startsWith(`${kind}:`))).toHaveLength(1);

          // ⛔ never gated: a denial and an escalation with the same key showing.
          for (const outcome of [
            { outcome: 'denied', reason_code: 'other', rationale: 'Not this one.' },
            { outcome: 'escalated', reason_code: 'r9_routed_to_voting', rationale: 'For the trustee.' },
          ]) {
            const other = await peerWorld(w.pariwarId);
            await answer(other, kind);
            const res = await da.client.inject({ method: 'POST', url: `${claimBase(other.pariwarId, other.claimCaseId)}/verifier-decision`, payload: outcome });
            expect(res.statusCode, `${outcome.outcome}: ${res.body}`).toBe(201);
          }
        });

        it('F20 — a neighbour key that appears after the approval makes it UNREVISABLE (`warning_approval_final`, recorded ⛔ changed)', async () => {
          const w = await peerWorld();
          const da = await staff(w.pariwarId, 'district_admin');
          await daApprove(da, w, false);
          await answer(w, kind);
          await elevate(da.client, 'claim_decision_revise');
          const res = await da.client.inject({
            method: 'POST',
            url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision/revise`,
            payload: { outcome: 'approved', reason_code: 'r8_90pct_met', rationale: 'new words' },
          });
          expect(res.statusCode, res.body).toBe(409);
          expect(errOf(res.body)).toMatchObject({ code: 'verifier_decision.not_revisable', details: { reason: 'warning_approval_final' } });
        });

        it('the final vote — the ONE rule (answered BEFORE the approval); the LATE wait (answered AFTER) until the District Admin\'s late reason', async () => {
          const w = await peerWorld();
          await answer(w, kind);
          const da = await staff(w.pariwarId, 'district_admin');
          await daApprove(da, w, true);
          const pa = await staff(w.pariwarId, 'pariwar_admin');
          const bare = await finalVote(pa, w, false);
          expect(bare.statusCode, bare.body).toBe(409);
          expect(errOf(bare.body)).toMatchObject(reasonRequired('cycle_freeze.warning_reason_required', kind));
          expect((await finalVote(pa, w, true)).statusCode).toBe(201);

          const late = await peerWorld(w.pariwarId);
          await daApprove(da, late, false);
          await answer(late, kind);
          const held = await finalVote(pa, late, true);
          expect(held.statusCode, held.body).toBe(409);
          expect(errOf(held.body)).toMatchObject(waits('cycle_freeze.late_warning_reason_required', kind));
          expect(errOf(held.body).message).toMatch(/It is not refused/);
          await daLate(late, da);
          const ok = await finalVote(pa, late, true);
          expect(ok.statusCode, ok.body).toBe(201);
        });

        it('the cycle-freeze escalation resolution — the ONE rule only (⛔ late leg: ⛔ District Admin approval to wait for)', async () => {
          const w = await peerWorld();
          await answer(w, kind);
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
          expect(bare.statusCode, bare.body).toBe(409);
          expect(errOf(bare.body)).toMatchObject(reasonRequired('cycle_freeze.warning_reason_required', kind));
          const ok = await resolve({ warning_reason_code: GENERIC, rationale: 'Read the neighbour\'s answer.' });
          expect(ok.statusCode, ok.body).toBe(201);
        });

        it('R9 — a vote needs its reason; a vote cast BEFORE the answer is SHORT at finalize until revised', async () => {
          const w = await peerWorld();
          await answer(w, kind);
          const pa = await routeToR9(w);
          const bare = await r9Vote(pa, w, false);
          expect(bare.statusCode, bare.body).toBe(409);
          expect(errOf(bare.body)).toMatchObject(reasonRequired('r9_voting.warning_reason_required', kind));
          expect((await r9Vote(pa, w, true)).statusCode).toBe(201);
          expect((await r9Finalize(pa, w)).statusCode).toBe(200);

          const short = await peerWorld(); // a FRESH Pariwar — the R9 clause is seeded once per Pariwar
          const spa = await routeToR9(short);
          const cast = await r9Vote(spa, short, false);
          expect(cast.statusCode, cast.body).toBe(201);
          await answer(short, kind);
          const fin = await r9Finalize(spa, short);
          expect(fin.statusCode, fin.body).toBe(409);
          expect(errOf(fin.body)).toMatchObject({ code: 'r9_voting.approve_votes_need_warning_reason', details: { uncovered_count: 1 } });
          expect((await r9Vote(spa, short, true)).statusCode).toBe(201);
          expect((await r9Finalize(spa, short)).statusCode).toBe(200);
        });

        it('`-324` A — R9 finalize on an R9-routed `state_trustee_approved` claim WAITS for the District Admin, then each approve voter whose row misses the late key revises', async () => {
          const w = await peerWorld();
          const da = await staff(w.pariwarId, 'district_admin');
          await daApprove(da, w, false);
          const fpa = await staff(w.pariwarId, 'pariwar_admin');
          const voted = await finalVote(fpa, w, false);
          expect(voted.statusCode, voted.body).toBe(201);
          const pa = await routeToR9(w);
          const cast = await r9Vote(pa, w, false);
          expect(cast.statusCode, cast.body).toBe(201);
          await answer(w, kind); // in the window: `state_trustee_approved` under a live routing
          const held = await r9Finalize(pa, w);
          expect(held.statusCode, held.body).toBe(409);
          expect(errOf(held.body)).toMatchObject(waits('r9_voting.late_warning_reason_required', kind));
          await daLate(w, da);
          const short = await r9Finalize(pa, w);
          expect(short.statusCode, short.body).toBe(409);
          expect(errOf(short.body).code).toBe('r9_voting.approve_votes_need_warning_reason');
          expect((await r9Vote(pa, w, true)).statusCode).toBe(201);
          const fin = await r9Finalize(pa, w);
          expect(fin.statusCode, fin.body).toBe(200);
        });

        it('D27 — the "no correction needed" approval: the ONE rule; and the LATE wait until the District Admin\'s late reason', async () => {
          const w = await peerWorld();
          await answer(w, kind);
          const da = await staff(w.pariwarId, 'district_admin');
          await daApprove(da, w, true);
          const pa = await noCorrectionReady(w, da);
          const bare = await pa.client.inject({ method: 'POST', url: noCorrectionUrl(w), payload: {} });
          expect(bare.statusCode, bare.body).toBe(409);
          expect(errOf(bare.body)).toMatchObject(reasonRequired('closure.warning_reason_required', kind));
          const ok = await pa.client.inject({ method: 'POST', url: noCorrectionUrl(w), payload: { warning_reason_code: GENERIC, note: 'Read it.' } });
          expect(ok.statusCode, ok.body).toBe(201);

          const late = await peerWorld(w.pariwarId);
          await daApprove(da, late, false);
          await answer(late, kind); // after the approval, before the return
          const lpa = await noCorrectionReady(late, da);
          const held = await lpa.client.inject({ method: 'POST', url: noCorrectionUrl(late), payload: { warning_reason_code: GENERIC, note: 'Read it.' } });
          expect(held.statusCode, held.body).toBe(409);
          expect(errOf(held.body)).toMatchObject(waits('closure.late_warning_reason_required', kind));
          await daLate(late, da);
          const lok = await lpa.client.inject({ method: 'POST', url: noCorrectionUrl(late), payload: { warning_reason_code: GENERIC, note: 'Read it.' } });
          expect(lok.statusCode, lok.body).toBe(201);
        });

        it('G1 — the Super Admin\'s approval: the ONE rule (an answer the District Admin covered); the LATE wait until the District Admin\'s late reason', async () => {
          const w = await peerWorld();
          await answer(w, kind);
          const da = await staff(w.pariwarId, 'district_admin');
          await daApprove(da, w, true);
          const sa = await escalatedReady(w);
          const bare = await g1(sa, w, false);
          expect(bare.statusCode, bare.body).toBe(409);
          expect(errOf(bare.body)).toMatchObject(reasonRequired('closure.warning_reason_required', kind));
          const ok = await g1(sa, w, true);
          expect(ok.statusCode, ok.body).toBe(201);

          const late = await peerWorld(w.pariwarId);
          await daApprove(da, late, false);
          await answer(late, kind);
          const lsa = await escalatedReady(late);
          // ⚠ G1 runs the gate (the WAIT) before the reason check — so even a reason-less approve reports the wait.
          const held = await g1(lsa, late, true);
          expect(held.statusCode, held.body).toBe(409);
          expect(errOf(held.body)).toMatchObject(waits('closure.late_warning_reason_required', kind));
          await daLate(late, da);
          const lok = await g1(lsa, late, true);
          expect(lok.statusCode, lok.body).toBe(201);
          expect((await records(late.claimCaseId)).map((r) => r.step)).toEqual(['district_admin_late_reason', 'super_admin_approval']);
        });
      });
    }
  });
});
