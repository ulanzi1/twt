// Story 6.23b — EVERY APPROVER gives a warning reason, and a LATE warning WAITS for the District Admin — at the DOMAIN,
// on real rows (Testing; AC1–AC6, AC10). Each test in its own rolled-back transaction, under a FRESH Pariwar. Fixture
// dates are RELATIVE to now (Trap 16): a recent change `now − 30 days`, an old one ≥ 200 days back.
// ⚠ RD19: every WAIT scenario re-records a PASSING name check after its redetermination (the new determination id
// makes the old check stale, and the gate would answer THAT first) before it expects `LateWarningReasonRequiredError`.
// ⚠ ⛔ No TRUNCATE of a parent reaching `claim_warning_approvals`; ⛔ no `DROP SCHEMA`.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { addCalendarDays, istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  ApprovalWarningReasonRequiredError,
  LateWarningReasonRequiredError,
  R9ApproveVotesNeedWarningReasonError,
  WarningReasonUnavailableError,
  WarningReasonUngroundedError,
  addApprovalWarningReason,
  adjudicateClaim,
  approveNoCorrectionNeeded,
  castR9Vote,
  decideEscalatedClosure,
  escalateStaffCase,
  isCorrectionClaimHeld,
  listClaimsUnderCorrection,
  recordNoCorrectionNeeded,
  returnToDistrictAdmin,
  escalateClaim,
  finalizeR9Outcome,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  projectClaimState,
  readClaimApprovalWarnings,
  readClaimApprovalWarningsBulk,
  readR9VoteWarningCoverage,
  recordLateWarningReason,
  replaceApprovalWarningReason,
  resolveEscalation,
  versionStandsAt,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { recordConcealmentAssessment } from '../../../src/claim/concealment-assessment-persist.js';
import { getEffectiveNomineeDeclaration } from '../../../src/claim/nominee-effective.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  driveClaimTo,
  enterAppScope,
  seedAcceptedDeathCertificate,
  seedClaim,
  seedClauseVersion,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  PARIWAR_A,
  SEEDED_NOMINEES_DECLARED_AT,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import {
  DA as CC_DA,
  SA as CC_SA,
  TRUSTEE as CC_PA,
  asSuperuser,
  decline,
  reachedClaim,
  request,
  returnedClaim,
  type Returned,
} from './_correction-closure-fixture.js';

export const DA = 'd1d1d1d1-0000-4000-8000-000000000001';
export const PA = 'a1a1a1a1-0000-4000-8000-000000000002';
export const SA = '5a5a5a5a-0000-4000-8000-000000000003';
const PA2 = 'a2a2a2a2-0000-4000-8000-000000000004';
/** The R9 panel — three Pariwar Admins; a majority (2) approves. */
const V1 = 'b1b1b1b1-0000-4000-8000-000000000011';
const V2 = 'b2b2b2b2-0000-4000-8000-000000000012';
const V3 = 'b3b3b3b3-0000-4000-8000-000000000013';
const PANEL = [V1, V2, V3];
const R9_CLAUSE = 'niy.special-death.r9';
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const istDaysAgo = (n: number) => addCalendarDays(istDateOf(new Date()), -n);
const GENERIC = 'warnings_reviewed';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
}

/**
 * A claim in `verifier_review` for a deceased whose nominee declarations were made at `declaredAt` (each a two-nominee
 * declaration — a NEW version per rank each time), with an accepted certificate, a determination against
 * `certificateDate` (marks per D6), a passing name check and a contact record. `beforeScope` runs as the superuser.
 */
async function claimWith(opts: {
  declaredAt: Date[];
  certificateDate?: string;
  beforeScope?: (tx: Tx, pid: PariwarId) => Promise<void>;
}): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = toPariwarId(randomUUID());
  if (opts.beforeScope) {
    // Back to the superuser — a second claim in one test is otherwise seeded under the FIRST one's app scope.
    await client.query('RESET ROLE');
    await opts.beforeScope(tx, pid);
  }
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await driveClaimTo(client, pid, cid, mid, 'verifier_review');
  for (const at of opts.declaredAt) {
    await seedNomineeDeclaration(tx, pid, mid, { declaredAt: at, nominees: [{}, {}] });
  }
  await determine({ client, tx, pid, cid, mid }, opts.certificateDate);
  await seedNomineeNameCheck(client, pid, cid);
  return { client, tx, pid, cid, mid };
}

/** (Re-)accept the certificate with `date` and record a determination whose marks agree with it (D6). */
async function determine(ctx: Ctx, date: string = addCalendarDays(istDateOf(new Date()), 1)): Promise<void> {
  await seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date });
  const versions = await listNomineeDeclarationVersions(ctx.tx, ctx.pid, toMemberId(ctx.mid));
  await seedNomineeDetermination(ctx.client, ctx.pid, ctx.cid, {
    certificateDate: date,
    marks: versions.map((v) => ({
      versionId: v.versionId,
      mark: versionStandsAt(v.effectiveAt, date) ? ('stands' as const) : ('discarded' as const),
    })),
  });
}

/**
 * RD19 — a redetermination makes the recorded name check stale; re-record a PASSING one. The fixture contact record
 * is topped up for the newly effective versions by `seedNomineeNameCheck`, and its CLAIMANT re-pointed at a version in
 * force at the new death date (as a helpline correction would) — otherwise the contact check, which runs AFTER the
 * gate, answers `claimant_details_missing` once the wait is cleared.
 */
async function redetermineAndRecheck(ctx: Ctx, date: string): Promise<void> {
  await determine(ctx, date);
  await seedNomineeNameCheck(ctx.client, ctx.pid, ctx.cid);
  const effective = await getEffectiveNomineeDeclaration(ctx.tx, ctx.pid, ctx.cid);
  if (effective.status !== 'effective') throw new Error('fixture: the redetermination must leave an effective declaration');
  await ctx.client.query('UPDATE claim_contacts SET claimant_nominee_version_id = $2 WHERE claim_case_id = $1', [
    ctx.cid,
    effective.entries[0]!.versionId,
  ]);
}

// Post-death: old declaration (stands), a change 30 days ago, a certificate dated 45 days ago ⇒ the change is BOTH
// post-death AND recent. Quiet: 400 / 300 / 200 days back, a certificate tomorrow ⇒ ⛔ no warning.
const postDeathClaim = (beforeScope?: (tx: Tx, pid: PariwarId) => Promise<void>) =>
  claimWith({ declaredAt: [daysAgo(300), daysAgo(30)], certificateDate: istDaysAgo(45), ...(beforeScope ? { beforeScope } : {}) });
const quietClaim = () => claimWith({ declaredAt: [daysAgo(400), daysAgo(300), daysAgo(200)] });

const approve = (ctx: Ctx, over: Partial<Parameters<typeof adjudicateClaim>[1]> = {}) =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    outcome: 'approved',
    reasonCode: 'r5_d_natural_death',
    rationaleCiphertext: 'enc:v1:why',
    actorId: DA,
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
    ...over,
  });

const vote = (ctx: Ctx, over: Partial<Parameters<typeof voteOnFrozenClaim>[1]> = {}) =>
  voteOnFrozenClaim(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    outcome: 'approved',
    reasonCode: null,
    rationaleCiphertext: null,
    actorId: PA,
    actorDisplay: 'Pariwar Admin',
    actor: 'trustee',
    ...over,
  });

const warnedVote = (ctx: Ctx, over: Partial<Parameters<typeof voteOnFrozenClaim>[1]> = {}) =>
  vote(ctx, { warningReasonCode: GENERIC, rationaleCiphertext: 'enc:v1:final-why', ...over });

const lateReason = (ctx: Ctx, actorId = DA) =>
  recordLateWarningReason(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    warningReasonCode: GENERIC,
    noteCiphertext: 'enc:v1:late-note',
    actorId,
    actorDisplay: actorId === DA ? 'Anita (District Admin)' : 'Another approver',
  });

const escalate = (ctx: Ctx) =>
  escalateClaim(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    outcome: 'escalated',
    reasonCode: 'r9_routed_to_voting',
    rationaleCiphertext: 'enc:v1:esc',
    actorId: DA,
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
  });

const resolve = (ctx: Ctx, over: Partial<Parameters<typeof resolveEscalation>[1]> = {}) =>
  resolveEscalation(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    outcome: 'approved',
    reasonCode: null,
    rationaleCiphertext: null,
    actorId: PA,
    actorDisplay: 'Pariwar Admin',
    actor: 'trustee',
    ...over,
  });

async function emit(ctx: Ctx, from: string, to: string, eventType: string, extra: Record<string, unknown> = {}) {
  await projectClaimState(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    deceasedMemberId: toMemberId(ctx.mid),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: eventType as never,
    payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
    actorId: null,
  });
}

async function records(ctx: Ctx) {
  return ctx.tx
    .select()
    .from(schema.claimWarningApprovals)
    .where(and(eq(schema.claimWarningApprovals.pariwarId, ctx.pid), eq(schema.claimWarningApprovals.claimCaseId, ctx.cid)));
}

async function liveVerifierDecisions(ctx: Ctx) {
  const rows = await ctx.tx
    .select()
    .from(schema.claimVerifierDecisions)
    .where(and(eq(schema.claimVerifierDecisions.pariwarId, ctx.pid), eq(schema.claimVerifierDecisions.claimCaseId, ctx.cid)));
  return rows.filter((r) => r.supersededAt === null);
}

async function claimState(ctx: Ctx): Promise<string> {
  const [row] = await ctx.tx
    .select({ s: schema.claims.currentState })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, ctx.pid), eq(schema.claims.claimCaseId, ctx.cid)));
  return row!.s;
}

async function eventCount(ctx: Ctx): Promise<number> {
  const { rows } = await ctx.client.query<{ n: number }>('SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1', [ctx.cid]);
  return rows[0]!.n;
}

/** Run `fn` in a savepoint and roll it back — a refusal must leave ⛔ nothing. */
async function refused(ctx: Ctx, fn: () => Promise<unknown>, match: (e: unknown) => boolean): Promise<void> {
  await ctx.client.query('SAVEPOINT refused');
  await expect(fn()).rejects.toSatisfy(match);
  await ctx.client.query('ROLLBACK TO SAVEPOINT refused');
}

const isWait = (opts: { own?: boolean; count?: number } = {}) => (e: unknown) =>
  e instanceof LateWarningReasonRequiredError &&
  (opts.own === undefined || e.ownReasonExcluded === opts.own) &&
  (opts.count === undefined || e.uncoveredCount === opts.count);
const isRequired = (missing: 'reason' | 'note') => (e: unknown) => e instanceof ApprovalWarningReasonRequiredError && e.missing === missing;

/**
 * A claim the District Admin APPROVED with ⛔ no warning showing, then re-reviewed to a certificate 250 days back and
 * redetermined — so its two 200-day-old versions are now post-death: two LATE keys nobody has answered. Name check
 * re-recorded (RD19).
 */
async function lateWarnedClaim(): Promise<Ctx> {
  const ctx = await quietClaim();
  await approve(ctx);
  await backdateApproval(ctx);
  await redetermineAndRecheck(ctx, istDaysAgo(250));
  return ctx;
}

/**
 * The approval and the later redetermination are SEPARATE transactions in life, but one test transaction stamps both
 * `decided_at`s with the same `now()` — move the approval a minute back (as the superuser) so the redetermination is
 * AFTER it, as EA10's correction-queue arm requires (`nd.decided_at > v.decided_at`).
 */
async function backdateApproval(ctx: Ctx): Promise<void> {
  await ctx.client.query('RESET ROLE');
  await ctx.client.query(
    `UPDATE claim_verifier_decisions SET decided_at = decided_at - interval '1 minute' WHERE claim_case_id = $1 AND outcome = 'approved'`,
    [ctx.cid],
  );
  await enterAppScope(ctx.client, ctx.pid);
}

// ── R9 helpers ──────────────────────────────────────────────────────────────────────────────────────────────────

/** As the superuser, before scope: the R9 clause and the panel's grants in `pid`. */
async function seedR9(tx: Tx, pid: PariwarId): Promise<void> {
  await seedClauseVersion(tx, pid, {
    clauseId: R9_CLAUSE,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
}

/** Route the claim to R9 (6.13's routing row) and open the session. */
async function routeAndOpen(ctx: Ctx): Promise<void> {
  await ctx.tx.insert(schema.claimStateTrusteeDecisions).values({
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    phase: 'routing',
    outcome: 'routed_to_r9',
    reasonCode: 'r9_special_case',
    rationaleCiphertext: null,
    actorId: PA,
    actorDisplay: 'Pariwar Admin',
  });
  await openR9VotingSession(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    clauseId: R9_CLAUSE,
    panelActorIds: PANEL,
    actorId: PA,
    actorDisplay: 'Pariwar Admin',
    actor: 'trustee',
  });
}

const cast = (ctx: Ctx, voter: string, vote: 'approve' | 'deny', warningReasonCode: string | null = null) =>
  castR9Vote(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    vote,
    rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(0, 4)}`),
    warningReasonCode,
    actorId: voter,
    actorDisplay: `Panelist ${voter.slice(0, 4)}`,
    actor: 'trustee',
  });

const finalize = (ctx: Ctx, finalizer = V1) =>
  finalizeR9Outcome(ctx.client, { claimCaseId: ctx.cid, pariwarId: ctx.pid, actorId: finalizer, actorDisplay: 'Finalizer', actor: 'trustee' });

const isVotesShort = (voteIds: string[]) => (e: unknown) =>
  e instanceof R9ApproveVotesNeedWarningReasonError && [...e.voteIds].sort().join() === [...voteIds].sort().join();

const r9Claim = (declaredAt: Date[], certificateDate?: string) =>
  claimWith({ declaredAt, ...(certificateDate ? { certificateDate } : {}), beforeScope: seedR9 });

describe.skipIf(!hasDatabase)('Story 6.23b — every approver gives a warning reason; a late warning waits (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC1 / Trap 13 — the readers ──────────────────────────────────────────────────────────────────────────────
  describe('AC1 / Trap 13 — the readers', () => {
    it('a LATER step\'s row ⛔ never counts toward the District Admin\'s coverage', async () => {
      const ctx = await postDeathClaim();
      await approve(ctx, { warningReasonCode: GENERIC });
      const before = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      await warnedVote(ctx);
      expect((await records(ctx)).map((r) => r.step).sort()).toEqual(['district_admin_approval', 'final_vote']);
      const after = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      expect(after.coverage).toEqual(before.coverage);
      expect(after.coverage.records.map((r) => r.step)).toEqual(['district_admin_approval']);
    });

    it('⭐ Trap 13 — the BULK reader equals the per-claim reader over DIRTY input (every field but `reasonOptions`)', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const ctxOf = (cid: ClaimId, mid: string): Ctx => ({ client, tx, pid, cid, mid });
      const made: ClaimId[] = [];
      // (a) a STALE determination — re-reviewed ⛔ without a redetermination.
      {
        const cid = toClaimId(randomUUID());
        const mid = randomUUID();
        await driveClaimTo(client, pid, cid, mid, 'verifier_review');
        await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(300), nominees: [{}, {}] });
        await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(30), nominees: [{}, {}] });
        await determine(ctxOf(cid, mid), istDaysAgo(45));
        await seedAcceptedDeathCertificate(client, { pariwarId: pid, claimCaseId: cid, date: istDaysAgo(60) });
        made.push(cid);
      }
      // (b) ⛔ no certificate at all; (c) a VACATED version (a 2 → 1 tombstone) 20 days back.
      {
        const cid = toClaimId(randomUUID());
        const mid = randomUUID();
        await driveClaimTo(client, pid, cid, mid, 'verifier_review');
        await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(300), nominees: [{}, {}] });
        await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(20), nominees: [{}] });
        made.push(cid);
      }
      // (d) a refile whose earlier claim is RELEASED by an innocence finding, and one whose earlier claim is ⛔ not.
      for (const released of [true, false]) {
        const mid = randomUUID();
        await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(150) });
        const first = await seedClaim(tx, pid, { deceasedMemberId: mid, currentState: 'denied' });
        await client.query(`UPDATE claims SET created_at = now() - interval '100 days' WHERE claim_case_id = $1`, [first]);
        if (released) {
          await tx.insert(schema.claimNomineeFindings).values({
            findingId: randomUUID() as never,
            claimCaseId: toClaimId(first),
            pariwarId: pid,
            kind: 'member_found_innocent',
            rank: null,
            recordedByActorId: 'investigator',
            recordedByDisplay: 'Investigator',
          });
        }
        const cid = toClaimId(randomUUID());
        await driveClaimTo(client, pid, cid, mid, 'verifier_review');
        made.push(cid);
      }
      // (e) a District-Admin-approved claim with a late key and a late reason.
      {
        const cid = toClaimId(randomUUID());
        const mid = randomUUID();
        const c = ctxOf(cid, mid);
        await driveClaimTo(client, pid, cid, mid, 'verifier_review');
        for (const n of [400, 300, 200]) await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(n), nominees: [{}, {}] });
        await determine(c);
        await seedNomineeNameCheck(client, pid, cid);
        await approve(c);
        await determine(c, istDaysAgo(250));
        await lateReason(c);
        made.push(cid);
      }
      const bulk = await readClaimApprovalWarningsBulk(tx, pid, [...made, toClaimId(randomUUID())]);
      expect(bulk.size).toBe(made.length);
      for (const cid of made) {
        const single = await readClaimApprovalWarnings(tx, pid, cid);
        const b = bulk.get(cid.toLowerCase())!;
        expect(b.reasonOptions).toEqual([]);
        // Every field EXCEPT `reasonOptions` (the bulk reader reads the list once per response).
        expect({ ...b, reasonOptions: null }).toEqual({ ...single, reasonOptions: null });
      }
      // The dirty inputs really are dirty: the stale one is AWAITING, the released refile is ⛔ recent, the other is.
      expect(bulk.get(made[0]!.toLowerCase())!.postDeath).toBe('awaiting_determination');
      expect(bulk.get(made[1]!.toLowerCase())!.kinds).toEqual(['recent_nominee_change']);
      expect(bulk.get(made[2]!.toLowerCase())!.kinds).toEqual([]);
      expect(bulk.get(made[3]!.toLowerCase())!.kinds).toEqual(['recent_nominee_change']);
      expect(bulk.get(made[4]!.toLowerCase())!.coverage.records.map((r) => r.step)).toEqual(['district_admin_late_reason']);
      // An empty id list is ⛔ no statement and an empty map.
      expect((await readClaimApprovalWarningsBulk(tx, pid, [])).size).toBe(0);
    });
  });

  // ── AC2 — the wait at the FINAL vote ─────────────────────────────────────────────────────────────────────────
  describe('AC2 — the WAIT (`-277` Q3 B), at the final vote', () => {
    it('⭐ a late, unanswered key ⇒ the final vote WAITS (⛔ nothing written, ⛔ not refused); the District Admin answers ⇒ it proceeds', async () => {
      const ctx = await lateWarnedClaim();
      const events = await eventCount(ctx);
      await refused(ctx, () => warnedVote(ctx), isWait({ own: false, count: 2 }));
      expect(await eventCount(ctx)).toBe(events);
      expect(await claimState(ctx)).toBe('verifier_approved');
      expect(await records(ctx)).toHaveLength(0);
      await lateReason(ctx);
      const res = await warnedVote(ctx);
      expect(res.claimState).toBe('state_trustee_approved');
      expect((await records(ctx)).map((r) => r.step).sort()).toEqual(['district_admin_late_reason', 'final_vote']);
    });

    it('⭐ fact 3 — District Admin approved → final vote denied → appeal reversed → re-reviewed in `reversed` ⇒ the next final vote waits', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      // The final vote's DENIAL as 6.23a's fact-3 fixture drives it (events only — an emitted appeal reversal does
      // ⛔ not supersede a real `frozen_vote` row, which would conflict with the next vote).
      await emit(ctx, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit(ctx, 'state_trustee_freeze', 'denied', 'claim.state_trustee_denied');
      await emit(ctx, 'denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
      await emit(ctx, 'appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      expect(await claimState(ctx)).toBe('reversed');
      await redetermineAndRecheck(ctx, istDaysAgo(250));
      await refused(ctx, () => warnedVote(ctx), isWait());
      await lateReason(ctx);
      expect((await warnedVote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('`-279` A1 — the Pariwar Admin\'s OWN late reason does ⛔ not clear their own vote (`own_reason_excluded`); another holder\'s does', async () => {
      const ctx = await lateWarnedClaim();
      await lateReason(ctx, PA);
      await refused(ctx, () => warnedVote(ctx), isWait({ own: true, count: 2 }));
      // A DIFFERENT Pariwar Admin voting is ⛔ held by PA's reason.
      await ctx.client.query('SAVEPOINT other_voter');
      expect((await warnedVote(ctx, { actorId: PA2, actorDisplay: 'Another Pariwar Admin' })).claimState).toBe('state_trustee_approved');
      await ctx.client.query('ROLLBACK TO SAVEPOINT other_voter');
      // The District Admin's NW14 is ⛔ `nothing_uncovered` for THEM — it records, and PA's vote proceeds.
      await lateReason(ctx, DA);
      expect((await warnedVote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('never waits: ⛔ no District Admin approval (escalated-and-resolved; refused then reversed); ⛔ no warning; P1 unaffected', async () => {
      // Escalated, resolved (which SUPERSEDES the escalated decision — Trap 1), then a late determination.
      const esc = await quietClaim();
      await escalate(esc);
      await resolve(esc);
      await redetermineAndRecheck(esc, istDaysAgo(250));
      expect((await warnedVote(esc)).claimState).toBe('state_trustee_approved');
      // Refused by the District Admin, reversed on appeal.
      const rev = await quietClaim();
      await adjudicateClaim(rev.client, {
        claimCaseId: rev.cid,
        pariwarId: rev.pid,
        outcome: 'denied',
        reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:deny',
        actorId: DA,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
      await emit(rev, 'denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
      await emit(rev, 'appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      await redetermineAndRecheck(rev, istDaysAgo(250));
      expect((await warnedVote(rev)).claimState).toBe('state_trustee_approved');
      // ⛔ No warning at all — the card's existing body.
      const quiet = await quietClaim();
      await approve(quiet);
      expect((await vote(quiet)).claimState).toBe('state_trustee_approved');
      // P1 — the District Admin's own approval over a warning is unchanged.
      const p1 = await postDeathClaim();
      expect((await approve(p1, { warningReasonCode: GENERIC })).claimState).toBe('verifier_approved');
    });
  });

  // ── AC3 — the escalation resolution ──────────────────────────────────────────────────────────────────────────
  describe('AC3 — the escalation resolution (EA3)', () => {
    it('a warned escalated claim: ⛔ no code ⇒ `reason`; ⛔ no rationale ⇒ `note`; a refusal leaves the escalated decision LIVE', async () => {
      const ctx = await postDeathClaim();
      await escalate(ctx);
      const events = await eventCount(ctx);
      await refused(ctx, () => resolve(ctx, { rationaleCiphertext: 'enc:v1:why' }), isRequired('reason'));
      await refused(ctx, () => resolve(ctx, { warningReasonCode: GENERIC }), isRequired('note'));
      expect(await eventCount(ctx)).toBe(events);
      expect((await liveVerifierDecisions(ctx)).map((d) => d.outcome)).toEqual(['escalated']);
      expect(await records(ctx)).toHaveLength(0);
    });

    it('with an active reason + a rationale ⇒ resolved, and ONE `escalation_resolution` row on the new decision', async () => {
      const ctx = await postDeathClaim();
      await escalate(ctx);
      const res = await resolve(ctx, { warningReasonCode: GENERIC, rationaleCiphertext: 'enc:v1:why' });
      expect(res.claimState).toBe('verifier_approved');
      expect(res.approvalWarningKinds).toEqual(['post_death_version', 'recent_nominee_change']);
      const rows = await records(ctx);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        step: 'escalation_resolution',
        trusteeDecisionId: res.decision.decisionId,
        verifierDecisionId: null,
        r9VoteId: null,
        closureId: null,
        reasonCode: GENERIC,
        noteCiphertext: null,
        recordedByActor: PA,
      });
      expect([...rows[0]!.coveredKeys].sort()).toEqual([...(await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid)).keys]);
    });

    it('Trap 11 — a REPLACED reason ⇒ unavailable; a reason with ⛔ no warning ⇒ ungrounded; a deny is unchanged (and refuses a code)', async () => {
      const ctx = await postDeathClaim();
      await escalate(ctx);
      const r = await addApprovalWarningReason(ctx.client, { pariwarId: ctx.pid, label: 'Old words', whenToUse: 'Old.', actorId: SA, actorDisplay: 'Super Admin' });
      await replaceApprovalWarningReason(ctx.client, { pariwarId: ctx.pid, reasonId: r.reasonId, label: 'New words', whenToUse: 'New.', actorId: SA, actorDisplay: 'Super Admin' });
      await refused(ctx, () => resolve(ctx, { warningReasonCode: r.code, rationaleCiphertext: 'enc:v1:why' }), (e) => e instanceof WarningReasonUnavailableError);
      await refused(ctx, () => resolve(ctx, { outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'x', warningReasonCode: GENERIC }), (e) => e instanceof WarningReasonUngroundedError);
      expect((await resolve(ctx, { outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'enc:v1:deny' })).claimState).toBe('denied');
      const quiet = await quietClaim();
      await escalate(quiet);
      await refused(quiet, () => resolve(quiet, { warningReasonCode: GENERIC, rationaleCiphertext: 'x' }), (e) => e instanceof WarningReasonUngroundedError);
      const res = await resolve(quiet);
      expect(res.claimState).toBe('verifier_approved');
      expect(res.approvalWarningKinds).toEqual([]);
    });
  });

  // ── AC4 — the final vote ─────────────────────────────────────────────────────────────────────────────────────
  describe('AC4 — the Pariwar Admin\'s final vote (EA4)', () => {
    it('after a District Admin approval OVER the warning — its own reason and note again ("even where written reasons already exist")', async () => {
      const ctx = await postDeathClaim();
      await approve(ctx, { warningReasonCode: GENERIC });
      await refused(ctx, () => vote(ctx, { rationaleCiphertext: 'enc:v1:why' }), isRequired('reason'));
      await refused(ctx, () => vote(ctx, { warningReasonCode: GENERIC }), isRequired('note'));
      const res = await warnedVote(ctx);
      expect(res.claimState).toBe('state_trustee_approved');
      expect(res.approvalWarningKinds).toEqual(['post_death_version', 'recent_nominee_change']);
      const row = (await records(ctx)).find((r) => r.step === 'final_vote')!;
      expect(row).toMatchObject({ trusteeDecisionId: res.decision.decisionId, verifierDecisionId: null, noteCiphertext: null, recordedByActor: PA });
      expect(res.decision.rationaleCiphertext).toBe('enc:v1:final-why');
    });

    it('after a REVERSAL (refused by the District Admin, reversed on appeal) and after an ESCALATION (two rows)', async () => {
      const rev = await postDeathClaim();
      await adjudicateClaim(rev.client, {
        claimCaseId: rev.cid,
        pariwarId: rev.pid,
        outcome: 'denied',
        reasonCode: 'post_death_nominee_change',
        rationaleCiphertext: 'enc:v1:deny',
        actorId: DA,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
      await emit(rev, 'denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
      await emit(rev, 'appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      await refused(rev, () => vote(rev, { rationaleCiphertext: 'enc:v1:why' }), isRequired('reason'));
      expect((await warnedVote(rev)).claimState).toBe('state_trustee_approved');
      expect((await records(rev)).map((r) => r.step)).toEqual(['final_vote']);

      const esc = await postDeathClaim();
      await escalate(esc);
      await resolve(esc, { warningReasonCode: GENERIC, rationaleCiphertext: 'enc:v1:why' });
      await refused(esc, () => vote(esc, { rationaleCiphertext: 'enc:v1:why' }), isRequired('reason'));
      await warnedVote(esc);
      expect((await records(esc)).map((r) => r.step).sort()).toEqual(['escalation_resolution', 'final_vote']);
    });

    it('a deny, and an un-warned approve with the card\'s existing body (⛔ no reason, ⛔ no rationale), are unchanged', async () => {
      const ctx = await postDeathClaim();
      await approve(ctx, { warningReasonCode: GENERIC });
      await refused(ctx, () => vote(ctx, { outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'x', warningReasonCode: GENERIC }), (e) => e instanceof WarningReasonUngroundedError);
      const denied = await vote(ctx, { outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'enc:v1:deny' });
      expect(denied.claimState).toBe('denied');
      expect(denied.approvalWarningKinds).toBeUndefined();
      const quiet = await quietClaim();
      await approve(quiet);
      await refused(quiet, () => warnedVote(quiet), (e) => e instanceof WarningReasonUngroundedError);
      expect((await vote(quiet)).claimState).toBe('state_trustee_approved');
      expect(await records(quiet)).toHaveLength(0);
    });

    it('Trap 3 — concealment + warning: `concealment_override` AND a warning reason, both recorded, the R14 snapshot kept', async () => {
      const r14 = { clauseVersionId: '' };
      const ctx = await postDeathClaim(async (tx, pid) => {
        r14.clauseVersionId = await seedClauseVersion(tx, pid, {
          clauseId: 'niy.concealment.r14',
          payload: { ack_text_en: 'ack', ack_text_hi: 'ack', rule_code: 'R14', never_auto_deny: true },
        });
      });
      await recordConcealmentAssessment(ctx.client, {
        claimCaseId: ctx.cid,
        pariwarId: ctx.pid,
        kind: 'linked',
        noteCiphertext: null,
        actorId: DA,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
      await approve(ctx, { warningReasonCode: GENERIC });
      const res = await warnedVote(ctx, { reasonCode: 'concealment_override' });
      expect(res.decision.reasonCode).toBe('concealment_override');
      expect(res.decision.concealmentClauseVersionId).toBe(r14.clauseVersionId);
      expect((await records(ctx)).find((r) => r.step === 'final_vote')).toMatchObject({ reasonCode: GENERIC, trusteeDecisionId: res.decision.decisionId });
    });
  });
  // ── AC5 — the R9 vote ────────────────────────────────────────────────────────────────────────────────────────
  describe('AC5 — the R9 vote (EA5; `-279` A2; RD10, RD17)', () => {
    it('an approve vote while warnings show needs an active reason; with one ⇒ the vote AND its `r9_vote` row; a deny is never gated', async () => {
      const ctx = await r9Claim([daysAgo(300), daysAgo(30)], istDaysAgo(45));
      await routeAndOpen(ctx);
      await refused(ctx, () => cast(ctx, V1, 'approve'), isRequired('reason'));
      await refused(ctx, () => cast(ctx, V1, 'deny', GENERIC), (e) => e instanceof WarningReasonUngroundedError);
      const v = await cast(ctx, V1, 'approve', GENERIC);
      expect(v.approvalWarningKinds).toEqual(['post_death_version', 'recent_nominee_change']);
      const rows = await records(ctx);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ step: 'r9_vote', r9VoteId: v.vote.voteId, trusteeDecisionId: null, closureId: null, verifierDecisionId: null, recordedByActor: V1 });
      const d = await cast(ctx, V2, 'deny');
      expect(d.approvalWarningKinds).toBeUndefined();
      expect(await records(ctx)).toHaveLength(1);
      // RD10 — the coverage read: by vote id, a deny vote absent.
      const cov = await readR9VoteWarningCoverage(ctx.tx, ctx.pid, [v.vote.voteId, d.vote.voteId]);
      expect([...cov.keys()]).toEqual([v.vote.voteId.toLowerCase()]);
      expect([...cov.get(v.vote.voteId.toLowerCase())!].sort()).toEqual([...rows[0]!.coveredKeys].sort());
    });

    it('a reason with ⛔ no warning ⇒ ungrounded; a REVISED vote keeps the earlier vote, its note and its row', async () => {
      const quiet = await r9Claim([daysAgo(400), daysAgo(300)]);
      await routeAndOpen(quiet);
      await refused(quiet, () => cast(quiet, V1, 'approve', GENERIC), (e) => e instanceof WarningReasonUngroundedError);
      const warned = await r9Claim([daysAgo(300), daysAgo(30)], istDaysAgo(45));
      await routeAndOpen(warned);
      const first = await cast(warned, V1, 'approve', GENERIC);
      const second = await cast(warned, V1, 'approve', GENERIC);
      expect(second.revised).toBe(true);
      const votes = await warned.tx.select().from(schema.claimR9Votes).where(eq(schema.claimR9Votes.claimCaseId, warned.cid));
      expect(votes.map((v) => v.voteId).sort()).toEqual([first.vote.voteId, second.vote.voteId].sort());
      expect(votes.find((v) => v.voteId === first.vote.voteId)!.rationaleCiphertext).toBe(first.vote.rationaleCiphertext);
      expect((await records(warned)).map((r) => r.r9VoteId).sort()).toEqual([first.vote.voteId, second.vote.voteId].sort());
    });

    it('⭐ `-279` A2 / RD17 — routed from `verifier_review` (⛔ no District Admin approval): votes over the 90-day keys only, then a post-death key ⇒ finalize names them; revised ⇒ finalized', async () => {
      // Recent only: a change 30 days back, the certificate tomorrow (it stands).
      const ctx = await r9Claim([daysAgo(300), daysAgo(30)]);
      await routeAndOpen(ctx);
      const a = await cast(ctx, V1, 'approve', GENERIC);
      const b = await cast(ctx, V2, 'approve', GENERIC);
      await cast(ctx, V3, 'deny');
      expect((await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid)).coverage.districtAdminApproved).toBe(false);
      // The certificate re-reviewed to 45 days back + redetermined ⇒ the 30-day change is ALSO post-death.
      await redetermineAndRecheck(ctx, istDaysAgo(45));
      const events = await eventCount(ctx);
      await refused(ctx, () => finalize(ctx), isVotesShort([a.vote.voteId, b.vote.voteId]));
      expect(await eventCount(ctx)).toBe(events);
      const c = await cast(ctx, V1, 'approve', GENERIC);
      await refused(ctx, () => finalize(ctx), isVotesShort([b.vote.voteId]));
      await cast(ctx, V2, 'approve', GENERIC);
      const res = await finalize(ctx);
      expect(res.claimState).toBe('state_trustee_approved');
      expect(res.approvalWarningKinds).toEqual(['post_death_version', 'recent_nominee_change']);
      expect(c.revised).toBe(true);
    });

    it('a DENIED outcome is ⛔ never gated (deny votes, warnings showing, ⛔ no record rows)', async () => {
      const ctx = await r9Claim([daysAgo(300), daysAgo(30)], istDaysAgo(45));
      await routeAndOpen(ctx);
      await cast(ctx, V1, 'deny');
      await cast(ctx, V2, 'deny');
      const res = await finalize(ctx);
      expect(res.claimState).toBe('denied');
      expect(res.approvalWarningKinds).toBeUndefined();
    });
  });

  // ── AC2 — the wait at R9 finalize, `-279` A1 and `-280` ───────────────────────────────────────────────────────
  describe('AC2 — the WAIT at R9 finalize', () => {
    /** The District Admin approved; a late key appears; routed to R9 from `verifier_approved`; two approve votes cover
     *  EVERY current key (so only the WAIT can hold the finalize). */
    async function lateWarnedR9(): Promise<Ctx> {
      const ctx = await r9Claim([daysAgo(400), daysAgo(300), daysAgo(200)]);
      await approve(ctx);
      await redetermineAndRecheck(ctx, istDaysAgo(250));
      await routeAndOpen(ctx);
      await cast(ctx, V1, 'approve', GENERIC);
      await cast(ctx, V2, 'approve', GENERIC);
      return ctx;
    }

    it('a late key unanswered by the District Admin ⇒ finalize WAITS; their late reason ⇒ finalized', async () => {
      const ctx = await lateWarnedR9();
      await refused(ctx, () => finalize(ctx), isWait({ own: false, count: 2 }));
      await lateReason(ctx);
      expect((await finalize(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('`-279` A1 — a late reason recorded by the FINALIZER, or by a live APPROVE voter, does ⛔ not count; the District Admin\'s does', async () => {
      const byFinalizer = await lateWarnedR9();
      await lateReason(byFinalizer, V3); // V3 has ⛔ no vote but finalizes
      await refused(byFinalizer, () => finalize(byFinalizer, V3), isWait({ own: true }));
      const byVoter = await lateWarnedR9();
      await lateReason(byVoter, V2);
      await refused(byVoter, () => finalize(byVoter, V3), isWait({ own: true, count: 2 }));
      await lateReason(byVoter, DA);
      expect((await finalize(byVoter, V3)).claimState).toBe('state_trustee_approved');
    });

    it('⭐ `-280` — from `state_trustee_approved`: the only cover is an approve voter\'s own late reason ⇒ waits; the District Admin answers THERE ⇒ finalized', async () => {
      const ctx = await r9Claim([daysAgo(400), daysAgo(300), daysAgo(200)]);
      await approve(ctx);
      await redetermineAndRecheck(ctx, istDaysAgo(250));
      await lateReason(ctx, V1); // a panel member answers the late key — the ONLY cover
      // To `state_trustee_approved` (a certificate can ⛔ not be re-reviewed there — so the late key arose first).
      await emit(ctx, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit(ctx, 'state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
      expect(await claimState(ctx)).toBe('state_trustee_approved');
      await routeAndOpen(ctx);
      await cast(ctx, V1, 'approve', GENERIC);
      await cast(ctx, V2, 'approve', GENERIC);
      await refused(ctx, () => finalize(ctx, V3), isWait({ own: true }));
      await lateReason(ctx, DA); // NW14 records in `state_trustee_approved` (`-280`)
      expect((await records(ctx)).filter((r) => r.step === 'district_admin_late_reason').map((r) => r.recordedByActor).sort()).toEqual([DA, V1].sort());
      expect((await finalize(ctx, V3)).claimState).toBe('state_trustee_approved');
    });
  });
  // ── AC6 — 6.19c's approvals (PARIWAR_A + the 6.19c fixture) ───────────────────────────────────────────────────
  describe('AC6 — 6.19c\'s approvals (EA6; Trap 17) — and the WAIT there', () => {
    /** A recent change: the fixture's one declaration (`SEEDED_NOMINEES_DECLARED_AT`) falls within 90 days of a filing
     *  moved to 30 days after it ⇒ `recent_nominee_change` (⛔ post-death — the certificate stands). */
    const warn = (client: Client, cid: ClaimId) =>
      client.query('UPDATE claims SET created_at = $2 WHERE claim_case_id = $1', [cid, new Date(SEEDED_NOMINEES_DECLARED_AT.getTime() + 30 * DAY)]);
    /** A LIVE District Admin approval (⛔ covering the key ⇒ a late, unanswered key). */
    const daApproval = (client: Client, cid: ClaimId) =>
      client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'approved', 'r5_d_natural_death', 'enc:v1:why', $3, 'District Admin One')`,
        [cid, PARIWAR_A, CC_DA],
      );
    const saApprove = (client: Client, c: Returned, reason: string, warningReasonCode: string | null = null, now = c.day(100)) =>
      decideEscalatedClosure(client, {
        pariwarId: PARIWAR_A,
        claimCaseId: c.cid,
        actorId: CC_SA,
        actorDisplay: 'Super Admin One',
        now,
        reason,
        noteCiphertext: 'enc:v1:super-admin-note',
        decisionRationaleCiphertext: 'enc:v1:super-admin-rationale',
        decision: 'approve',
        warningReasonCode,
      });
    const ctxOf = (client: Client, tx: Tx, c: Returned): Ctx => ({ client, tx, pid: PARIWAR_A as PariwarId, cid: c.cid, mid: c.mid });
    const late = (client: Client, cid: ClaimId, actorId: string) =>
      recordLateWarningReason(client, { claimCaseId: cid, pariwarId: PARIWAR_A as PariwarId, warningReasonCode: GENERIC, noteCiphertext: 'enc:v1:late', actorId, actorDisplay: 'Late answerer' });

    it('the Super Admin (staff case, FULL gate): ⛔ no code ⇒ `reason`; with one ⇒ approved + ONE `super_admin_approval` row (closure + decision); the closure reason unchanged', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await returnedClaim(client, { mustAct: 'staff' });
      await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
      await warn(client, c.cid);
      const ctx = ctxOf(client, tx, c);
      await refused(ctx, () => saApprove(client, c, 'details_verified'), isRequired('reason'));
      const res = await saApprove(client, c, 'details_verified', GENERIC);
      expect(res).toMatchObject({ nameCheckWaived: false, approvalWarningKinds: ['recent_nominee_change'] });
      expect(res.closure).toMatchObject({ state: 'approved', superAdminReason: 'details_verified' });
      const rows = await records(ctx);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        step: 'super_admin_approval',
        closureId: res.closure.closureId,
        trusteeDecisionId: res.chain!.decisionId,
        r9VoteId: null,
        verifierDecisionId: null,
        recordedByActor: CC_SA,
      });
    });

    it('⭐ Trap 17 — the `-251` WAIVED approve obeys the SAME rule, and WAITS on a late key; NW14 unblocks it', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const c = await reachedClaim(client, tx);
      await request(client, c);
      await decline(client, c);
      await warn(client, c.cid);
      const ctx = ctxOf(client, tx, c);
      await refused(ctx, () => saApprove(client, c, 'name_difference_accepted'), isRequired('reason'));
      await daApproval(client, c.cid);
      await refused(ctx, () => saApprove(client, c, 'name_difference_accepted', GENERIC), isWait({ own: false, count: 1 }));
      // `-279` A1 — the Super Admin's OWN late reason does ⛔ not clear their own approval.
      await late(client, c.cid, CC_SA);
      await refused(ctx, () => saApprove(client, c, 'name_difference_accepted', GENERIC), isWait({ own: true }));
      await late(client, c.cid, CC_DA);
      const res = await saApprove(client, c, 'name_difference_accepted', GENERIC);
      expect(res).toMatchObject({ nameCheckWaived: true });
      expect((await records(ctx)).map((r) => r.step).sort()).toEqual(['district_admin_late_reason', 'district_admin_late_reason', 'super_admin_approval']);
    });

    describe('"no correction needed" (D27)', () => {
      async function d27Claim(client: Client) {
        const c = await returnedClaim(client, { mustAct: 'family' });
        await recordNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_DA, actorDisplay: 'DA', now: c.day(3),
          markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
        });
        await asSuperuser(client, () =>
          client.query(`UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`, [c.cid]),
        );
        await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
        return c;
      }
      const d27 = (client: Client, c: Returned, rationale: string, warningReasonCode: string | null = null) =>
        approveNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_PA, actorDisplay: 'PA', now: c.day(4),
          decisionRationaleCiphertext: rationale, warningReasonCode,
        });

      it('a warned claim: ⛔ code ⇒ `reason` (the constant is ⛔ never a note); with code + note ⇒ approved, THAT note the rationale, ONE row', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await d27Claim(client);
        await warn(client, c.cid);
        const ctx = ctxOf(client, tx, c);
        await refused(ctx, () => d27(client, c, 'enc:v1:THE-CONSTANT'), isRequired('reason'));
        const res = await d27(client, c, 'enc:v1:pariwar-admin-note', GENERIC);
        expect(res.approvalWarningKinds).toEqual(['recent_nominee_change']);
        const [decision] = await tx
          .select()
          .from(schema.claimStateTrusteeDecisions)
          .where(eq(schema.claimStateTrusteeDecisions.decisionId, res.chain.decisionId as never));
        expect(decision!.rationaleCiphertext).toBe('enc:v1:pariwar-admin-note');
        const rows = await records(ctx);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ step: 'no_correction_approval', trusteeDecisionId: res.chain.decisionId, closureId: null, recordedByActor: CC_PA });
      });

      it('an UN-warned approve is unchanged (the constant; ⛔ no row); a code there ⇒ ungrounded', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await d27Claim(client);
        const ctx = ctxOf(client, tx, c);
        await refused(ctx, () => d27(client, c, 'enc:v1:note', GENERIC), (e) => e instanceof WarningReasonUngroundedError);
        const res = await d27(client, c, 'enc:v1:THE-CONSTANT');
        expect(res.approvalWarningKinds).toEqual([]);
        expect(await records(ctx)).toHaveLength(0);
      });

      it('the WAIT — a live District Admin approval leaving the key uncovered ⇒ 409; the Pariwar Admin\'s own late reason ⛔ counts; the DA\'s does', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await d27Claim(client);
        await warn(client, c.cid);
        await daApproval(client, c.cid);
        const ctx = ctxOf(client, tx, c);
        await refused(ctx, () => d27(client, c, 'enc:v1:note', GENERIC), isWait({ own: false }));
        await late(client, c.cid, CC_PA);
        await refused(ctx, () => d27(client, c, 'enc:v1:note', GENERIC), isWait({ own: true }));
        await late(client, c.cid, CC_DA);
        expect((await d27(client, c, 'enc:v1:note', GENERIC)).chain.claimState).toBe('state_trustee_approved');
      });
    });
  });
  // ── AC10 — the District Admin is told (EA10; `-279` A4) ──────────────────────────────────────────────────────
  describe('AC10 — the District Admin\'s correction queue lists a claim waiting for their late reason', () => {
    const queue = (ctx: Ctx, onLateWarningsUnavailable?: () => void) =>
      listClaimsUnderCorrection(ctx.tx, ctx.pid, onLateWarningsUnavailable ? { onLateWarningsUnavailable } : {});

    it('a late-warning-only claim is listed (⛔ no live return); NW14 covers it ⇒ it leaves', async () => {
      const ctx = await lateWarnedClaim();
      const rows = await queue(ctx);
      expect(rows.map((r) => r.claimCaseId)).toEqual([ctx.cid]);
      expect(rows[0]).toMatchObject({ lateWarningAwaitingReason: true, lateWarningUncoveredCount: 2, returnedAt: null, sentBackByCheck: false });
      await lateReason(ctx, PA); // ANY District Admin answer — ⛔ no actor exclusion in the queue
      expect(await queue(ctx)).toEqual([]);
    });

    it('a claim BOTH returned and late-warned shows both; an approved claim with ⛔ no late key is ⛔ listed', async () => {
      const ctx = await lateWarnedClaim();
      await returnToDistrictAdmin(ctx.client, {
        claimCaseId: ctx.cid,
        pariwarId: ctx.pid,
        reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:return-note',
        actorId: PA,
        actorDisplay: 'Pariwar Admin',
        actor: 'trustee',
      });
      const [row] = await queue(ctx);
      expect(row).toMatchObject({ claimCaseId: ctx.cid, lateWarningAwaitingReason: true, lateWarningUncoveredCount: 2 });
      expect(row!.returnedAt).not.toBeNull();
      const quiet = await quietClaim();
      await approve(quiet);
      expect(await queue(quiet)).toEqual([]);
    });

    it('ONE bulk evaluation per batch (⛔ a per-claim loop); a FORCED failure of the late arm still lists the returned claim and says so', async () => {
      const { client } = getTx();
      const late = await lateWarnedClaim();
      const pid = late.pid;
      // A second late-warned claim and a returned one, in the SAME Pariwar.
      const second: Ctx = { ...late, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, pid, second.cid, second.mid, 'verifier_review');
      for (const n of [400, 300, 200]) await seedNomineeDeclaration(late.tx, pid, second.mid, { declaredAt: daysAgo(n), nominees: [{}, {}] });
      await determine(second);
      await seedNomineeNameCheck(client, pid, second.cid);
      await approve(second);
      await backdateApproval(second);
      await redetermineAndRecheck(second, istDaysAgo(250));
      const returned: Ctx = { ...late, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, pid, returned.cid, returned.mid, 'verifier_approved');
      await seedNomineeDeclaration(late.tx, pid, returned.mid, { declaredAt: daysAgo(400) });
      await seedNomineeNameCheck(client, pid, returned.cid);
      await returnToDistrictAdmin(client, {
        claimCaseId: returned.cid, pariwarId: pid, reasonCode: 'other', rationaleCiphertext: 'enc:v1:r', actorId: PA, actorDisplay: 'PA', actor: 'trustee',
      });

      const c = client as unknown as { query: (...a: unknown[]) => unknown };
      const realQuery = c.query.bind(client);
      const textOf = (a: unknown) => (typeof a === 'string' ? a : ((a as { text?: string } | null)?.text ?? ''));
      let lateArmStatements = 0;
      c.query = (...a: unknown[]) => {
        if (textOf(a[0]).includes('discarded_member_version_ids')) lateArmStatements += 1;
        return realQuery(...(a as [never]));
      };
      try {
        const rows = await queue(late);
        expect(rows.map((r) => r.claimCaseId).sort()).toEqual([late.cid, second.cid, returned.cid].sort());
        expect(lateArmStatements).toBe(1);
        // ⭐ Code review 2026-10-06 (P6): the REAL statement is made to fail — corrupt its first bound parameter
        // (a UUID-typed comparison) rather than substituting an unrelated probe query (`SELECT 1/0`), so this
        // actually exercises the real SQL's own failure mode (a bad cast at execution time), not generic
        // SAVEPOINT/try-catch plumbing around an unrelated statement.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        c.query = (...a: unknown[]) => {
          if (!textOf(a[0]).includes('discarded_member_version_ids')) return realQuery(...(a as [never]));
          // Corrupt every UUID-shaped bound parameter (not just the first — the text `step` params from the
          // `records` subquery interpolate earlier in the statement than `pariwarId`/the claim ids).
          const params = Array.isArray(a[1]) ? a[1].map((v) => (typeof v === 'string' && UUID_RE.test(v) ? 'not-a-uuid' : v)) : a[1];
          return realQuery(a[0] as never, params as never);
        };
        let told = 0;
        const degraded = await queue(late, () => (told += 1));
        // ⭐ Code review 2026-10-06 (decision-needed #1, EA10): a late-warning-only candidate is no longer dropped
        // on a fault — `late.cid`/`second.cid` still list (best-effort `lateWarningAwaitingReason: true`, count
        // unknown), via the cheap `lateWarningCandidate` flag computed independently of the failed enrichment read.
        // `returned.cid` is unaffected either way: it qualifies via the RETURNED arm, not the late-warning arm.
        expect(degraded.map((r) => r.claimCaseId).sort()).toEqual([late.cid, second.cid, returned.cid].sort());
        expect(degraded.find((r) => r.claimCaseId === returned.cid)).toMatchObject({
          lateWarningAwaitingReason: false,
          lateWarningUncoveredCount: 0,
        });
        for (const cid of [late.cid, second.cid]) {
          expect(degraded.find((r) => r.claimCaseId === cid)).toMatchObject({
            lateWarningAwaitingReason: true,
            lateWarningUncoveredCount: 0,
          });
        }
        expect(told).toBe(1);
      } finally {
        c.query = realQuery as never;
      }
      // The transaction is still usable after the forced failure.
      expect(await claimState(late)).toBe('verifier_approved');
    });
  });
});
