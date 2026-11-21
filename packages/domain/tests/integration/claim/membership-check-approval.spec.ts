// Story 6.39 — the MEMBERSHIP CHECK's approval gate, at the domain, on real rows (Task 4.5; AC5, AC6, AC8; DL5, DL9;
// N1, N2, N4, N5, N6).
//
// `2026-10-31-424` Q1 (a) C and `2026-10-31-430` Q1 B (Trustee-ratified): before any drive opens, staff check an
// identity nobody has checked, and compare the certificate's date of death with the date the joining fee was paid.
// ONE conjunct inside `assertClaimApprovable` makes a claim WAIT at all SIX approval sites — a refusal never waits.
// Each test in its own rolled-back transaction. A claim is made to wait by SUPERSEDING its live check
// (`voidMembershipCheck` — the writer's own stamp; a superseded check counts for ⛔ nothing) or by seeding ⛔ none
// (`membershipCheck: 'skip'`), and each wait reason by a RAW check row (`seedMembershipCheck`) — the gate reads only
// the live row, the claim's current accepted review and the deceased's KYC row.
// ⚠ ⛔ No TRUNCATE; ⛔ no `DROP SCHEMA` ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  FeePaidAfterDeathNotShownError,
  GroundInspectionRequiredError,
  MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES,
  MembershipCheckRefusedError,
  MembershipCheckRequiredError,
  ReasonCodeOutcomeMismatchError,
  TrusteeReasonCodeError,
  adjudicateClaim,
  approveNoCorrectionNeeded,
  assertClaimApprovable,
  castR9Vote,
  commitCycleFreeze,
  decideEscalatedClosure,
  escalateClaim,
  escalateStaffCase,
  finalizeR9Outcome,
  isCorrectionClaimHeld,
  isFeePaidAfterDeathRefusalStanding,
  membershipCheckApprovalState,
  projectClaimState,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  readJoiningFeeReceipt,
  recordMembershipCheck,
  recordNoCorrectionNeeded,
  resolveEscalation,
  resolveMembershipCheckApprovalState,
  returnToDistrictAdmin,
  reviseDecision,
  routeToR9,
  voteOnFrozenClaim,
  type MembershipCheckWaitReason,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  claimId as toClaimId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  type ClaimId,
  type CycleFreezeCommitId,
  type PariwarId,
} from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  ensurePassedMembershipCheck,
  enterAppScope,
  seedAcceptedDeathCertificate,
  seedClauseVersion,
  seedEvent,
  seedMembershipCheck,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import { DA as CC_DA, SA as CC_SA, TRUSTEE as CC_PA, asSuperuser, decline, reachedClaim, request, returnedClaim, type Returned } from './_correction-closure-fixture.js';

const DA = 'd6d6d6d6-0000-4000-8000-000000000039';
const PA = 'a6a6a6a6-0000-4000-8000-000000000039';
const V1 = 'b6b6b6b6-0000-4000-8000-000000003911';
const V2 = 'b6b6b6b6-0000-4000-8000-000000003912';
const V3 = 'b6b6b6b6-0000-4000-8000-000000003913';
const PANEL = [V1, V2, V3];
const R9_CLAUSE = 'niy.special-death.r9';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];
interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
}

const waits = (reason: MembershipCheckWaitReason) => (e: unknown) => e instanceof MembershipCheckRequiredError && e.reason === reason;

/** Supersede the claim's live check with the writer's own stamp — it then counts for ⛔ nothing: `not_checked`. */
async function voidMembershipCheck(client: Client, cid: ClaimId): Promise<void> {
  await client.query(
    `UPDATE claim_membership_checks SET superseded_at = now(), superseded_reason = 're_checked' WHERE claim_case_id = $1 AND superseded_at IS NULL`,
    [cid],
  );
}

async function rowCounts(ctx: Pick<Ctx, 'client' | 'cid'>) {
  const q = async (sql: string) => (await ctx.client.query<{ n: number }>(sql, [ctx.cid])).rows[0]!.n;
  return {
    events: await q('SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1'),
    verifier: await q('SELECT count(*)::int AS n FROM claim_verifier_decisions WHERE claim_case_id = $1'),
    trustee: await q('SELECT count(*)::int AS n FROM claim_state_trustee_decisions WHERE claim_case_id = $1'),
    warningRecords: await q('SELECT count(*)::int AS n FROM claim_warning_approvals WHERE claim_case_id = $1'),
  };
}

/** The approval refuses with the typed wait and writes NOTHING. ⚠ Counted BEFORE the rollback (counted after it, any
 *  write made before the throw is undone first and the proof could never fail — the wait is a typed JS throw, ⛔ a SQL
 *  error, so the transaction is still usable for the count). */
async function refusesAndWritesNothing(ctx: Pick<Ctx, 'client' | 'cid'>, fn: () => Promise<unknown>, match: (e: unknown) => boolean) {
  const before = await rowCounts(ctx);
  await ctx.client.query('SAVEPOINT mc_gate');
  await expect(fn()).rejects.toSatisfy(match);
  const after = await rowCounts(ctx);
  await ctx.client.query('ROLLBACK TO SAVEPOINT mc_gate');
  expect(after).toEqual(before);
}

/** Run `fn` and roll it back — for the "a refusal / escalation / route / return SUCCEEDS" legs on the same claim. */
async function succeedsThenUndo(client: Client, fn: () => Promise<unknown>): Promise<void> {
  await client.query('SAVEPOINT mc_ok');
  await fn();
  await client.query('ROLLBACK TO SAVEPOINT mc_ok');
}

/** A fully approvable claim at `state`, with a passing membership check (the fixture default) or ⛔ none (`skip`). */
async function claimAt(
  state: 'verifier_review' | 'verifier_approved',
  opts: { membershipCheck?: 'passed' | 'skip'; inspection?: 'completed' | 'skip'; beforeScope?: (tx: Tx, pid: PariwarId) => Promise<void> } = {},
): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = toPariwarId(opts.beforeScope ? randomUUID() : PARIWAR_A);
  if (opts.beforeScope) {
    await client.query('RESET ROLE');
    await opts.beforeScope(tx, pid);
  }
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await driveClaimTo(client, pid, cid, mid, state);
  await seedNomineeNameCheck(client, pid, cid, {
    membershipCheck: opts.membershipCheck ?? 'passed',
    inspection: opts.inspection ?? 'completed',
  });
  return { client, tx, pid, cid, mid };
}

/** The claim's CURRENT accepted review id. */
async function currentReviewId(ctx: Pick<Ctx, 'client' | 'pid' | 'cid'>): Promise<string> {
  return seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid });
}

/** Replace the claim's live check with a RAW one of the given outcome, against its current accepted review. */
async function checkOf(ctx: Ctx, over: Partial<Parameters<typeof seedMembershipCheck>[1]> = {}): Promise<string> {
  return seedMembershipCheck(ctx.tx, {
    pariwarId: ctx.pid,
    claimCaseId: ctx.cid,
    deceasedMemberId: ctx.mid,
    reviewId: await currentReviewId(ctx),
    ...over,
  });
}

/** AC15 — a RAW `same_day` check against the claim's CURRENT accepted review, for a claim known only by id (the 6.19c fixtures). */
async function sameDayCheck(client: Client, pid: string, cid: string): Promise<string> {
  const deceased = await client.query<{ deceased_member_id: string }>('SELECT deceased_member_id FROM claims WHERE claim_case_id = $1', [cid]);
  return seedMembershipCheck(bindScopedDb(client), {
    pariwarId: pid,
    claimCaseId: cid,
    deceasedMemberId: deceased.rows[0]!.deceased_member_id,
    reviewId: await seedAcceptedDeathCertificate(client, { pariwarId: pid, claimCaseId: cid }),
    feeOutcome: 'same_day',
  });
}

/** Give the deceased a KYC row (RAW — the placeholder ciphertext is never opened by anything under test). */
async function seedKyc(ctx: Ctx, kind: 'digilocker' | 'typed_in' | 'unverified'): Promise<void> {
  const [strength, source] =
    kind === 'digilocker' ? ['aadhaar_kyc', 'digilocker'] : kind === 'typed_in' ? ['self_declared', 'manual'] : ['unverified', 'manual'];
  await ctx.client.query(
    `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source, trustee_verified)
     VALUES ($1, $2, 'enc:v1:name', 'enc:v1:dob', $3, $4, false)
     ON CONFLICT (member_id) DO UPDATE SET verification_strength = EXCLUDED.verification_strength, source = EXCLUDED.source`,
    [ctx.mid, ctx.pid, strength, source],
  );
}

const approve = (ctx: Ctx) =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: 'r5_d_natural_death',
    rationaleCiphertext: 'enc:v1:why', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const deny = (ctx: Ctx, reasonCode: 'concealment_flag_uphold' | 'other' | 'fee_paid_after_death' = 'other') =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'denied', reasonCode,
    rationaleCiphertext: 'enc:v1:deny', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const escalate = (ctx: Ctx) =>
  escalateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'escalated', reasonCode: 'r9_routed_to_voting',
    rationaleCiphertext: 'enc:v1:esc', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const vote = (ctx: Ctx, outcome: 'approved' | 'denied' = 'approved', reasonCode: 'other' | 'fee_paid_after_death' = 'other') =>
  voteOnFrozenClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome,
    reasonCode: outcome === 'denied' ? reasonCode : null,
    rationaleCiphertext: outcome === 'denied' ? 'enc:v1:deny' : null,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
const route = (ctx: Ctx) =>
  routeToR9(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, reasonCode: 'r9_special_case', rationaleCiphertext: null,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
const giveBack = (ctx: Ctx) =>
  returnToDistrictAdmin(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, reasonCode: 'other', rationaleCiphertext: 'enc:v1:return',
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });

// ── R9 helpers ────────────────────────────────────────────────────────────────────────────────────────────────
async function seedR9(tx: Tx, pid: PariwarId): Promise<void> {
  await seedClauseVersion(tx, pid, {
    clauseId: R9_CLAUSE,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
}
async function routeOpenAndVote(ctx: Ctx): Promise<void> {
  await route(ctx);
  await openR9VotingSession(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, clauseId: R9_CLAUSE, panelActorIds: PANEL,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
  for (const voter of [V1, V2]) {
    await castR9Vote(ctx.client, {
      claimCaseId: ctx.cid, pariwarId: ctx.pid, vote: 'approve',
      rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(-2)}`), warningReasonCode: null,
      actorId: voter, actorDisplay: `Panelist ${voter.slice(-2)}`, actor: 'trustee',
    });
  }
}
const finalize = (ctx: Ctx) =>
  finalizeR9Outcome(ctx.client, { claimCaseId: ctx.cid, pariwarId: ctx.pid, actorId: V1, actorDisplay: 'Finalizer', actor: 'trustee' });

async function stateOf(ctx: Pick<Ctx, 'tx' | 'cid'>): Promise<string> {
  const [row] = await ctx.tx.select({ s: schema.claims.currentState }).from(schema.claims).where(eq(schema.claims.claimCaseId, ctx.cid));
  return row!.s;
}

const gate = (ctx: Ctx, step: 'district_admin' | 'final' = 'final') =>
  assertClaimApprovable(ctx.tx, ctx.pid, ctx.cid, toMemberId(ctx.mid), { approvingActorIds: [PA], step });
const gateState = (ctx: Ctx) => membershipCheckApprovalState(ctx.tx, ctx.pid, ctx.cid, toMemberId(ctx.mid));

describe.skipIf(!hasDatabase)('Story 6.39 — the membership check approval gate', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC5 — every gate call WAITS with ⛔ check; a refusal, an escalation, a route and a return ⛔ never do ─────────
  describe('AC5 — all SIX approval sites (the `-251` waived approve among them) wait with ⛔ check, and pass with one', () => {
    it('P1 — the District Admin\'s approval waits `not_checked` (⛔ nothing written); a DENY and an ESCALATION on the same claim succeed; checked ⇒ approves', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('not_checked'));
      await succeedsThenUndo(ctx.client, async () => expect((await deny(ctx)).claimState).toBe('denied'));
      await succeedsThenUndo(ctx.client, () => escalate(ctx));
      // AC15 — a fee paid ON the day of death holds this site too (`-473` Q1 B; code review 2026-11-21).
      await checkOf(ctx, { feeOutcome: 'same_day' });
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('fee_after_death'));
      await ensurePassedMembershipCheck(ctx.client, ctx.pid, ctx.cid);
      expect((await approve(ctx)).claimState).toBe('verifier_approved');
    });

    it('P3 — the Pariwar Admin\'s final vote waits; a deny vote, a route to R9 and a return for correction succeed; checked ⇒ approves', async () => {
      const ctx = await claimAt('verifier_approved', { membershipCheck: 'skip' });
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('not_checked'));
      await succeedsThenUndo(ctx.client, async () => expect((await vote(ctx, 'denied')).claimState).toBe('denied'));
      await succeedsThenUndo(ctx.client, () => route(ctx));
      await succeedsThenUndo(ctx.client, () => giveBack(ctx));
      // AC15 — a fee paid ON the day of death holds this site too (`-473` Q1 B; code review 2026-11-21).
      await checkOf(ctx, { feeOutcome: 'same_day' });
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('fee_after_death'));
      await ensurePassedMembershipCheck(ctx.client, ctx.pid, ctx.cid);
      expect((await vote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('P4 — R9 finalize waits; checked ⇒ the panel\'s approval finalizes', async () => {
      const ctx = await claimAt('verifier_approved', { beforeScope: seedR9 });
      await routeOpenAndVote(ctx);
      await voidMembershipCheck(ctx.client, ctx.cid);
      await refusesAndWritesNothing(ctx, () => finalize(ctx), waits('not_checked'));
      // AC15 — a fee paid ON the day of death holds this site too (`-473` Q1 B; code review 2026-11-21).
      await checkOf(ctx, { feeOutcome: 'same_day' });
      await refusesAndWritesNothing(ctx, () => finalize(ctx), waits('fee_after_death'));
      // ⚠ `state_trustee_freeze` is IN the check's window, so a new check can still be recorded there.
      await ensurePassedMembershipCheck(ctx.client, ctx.pid, ctx.cid);
      await finalize(ctx);
      expect(await stateOf(ctx)).toBe('state_trustee_approved');
    });

    describe('6.19c\'s three approvals — the Super Admin\'s FULL and `-251` WAIVED approves, and "no correction needed"', () => {
      const saApprove = (client: Client, c: Returned, reason: string) =>
        decideEscalatedClosure(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_SA, actorDisplay: 'Super Admin One', now: c.day(100),
          reason, noteCiphertext: 'enc:v1:sa-note', decisionRationaleCiphertext: 'enc:v1:sa-rationale', decision: 'approve',
        });

      it('the Super Admin\'s FULL-gate approve (staff case) waits; checked ⇒ approves', async () => {
        const { client } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await returnedClaim(client, { mustAct: 'staff' });
        await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
        await voidMembershipCheck(client, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, () => saApprove(client, c, 'details_verified'), waits('not_checked'));
        // AC15 — a fee paid ON the day of death holds this site too (`-473` Q1 B; code review 2026-11-21).
        await sameDayCheck(client, PARIWAR_A, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, () => saApprove(client, c, 'details_verified'), waits('fee_after_death'));
        await ensurePassedMembershipCheck(client, PARIWAR_A, c.cid);
        expect((await saApprove(client, c, 'details_verified')).closure).toMatchObject({ state: 'approved' });
      });

      it('⭐ the `-251` WAIVED approve waives the name check ONLY — the membership conjunct reaches it BY CONSTRUCTION (it sits in the OUTER helper)', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await reachedClaim(client, tx);
        await request(client, c);
        await decline(client, c);
        await voidMembershipCheck(client, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, () => saApprove(client, c, 'name_difference_accepted'), waits('not_checked'));
        // AC15 — a fee paid ON the day of death holds this site too (`-473` Q1 B; code review 2026-11-21).
        await sameDayCheck(client, PARIWAR_A, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, () => saApprove(client, c, 'name_difference_accepted'), waits('fee_after_death'));
        await ensurePassedMembershipCheck(client, PARIWAR_A, c.cid);
        expect(await saApprove(client, c, 'name_difference_accepted')).toMatchObject({ nameCheckWaived: true });
      });

      it('"no correction needed" (D27) waits; checked ⇒ approves', async () => {
        const { client } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await returnedClaim(client, { mustAct: 'family' });
        await recordNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_DA, actorDisplay: 'DA', now: c.day(3),
          markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
        });
        await asSuperuser(client, () =>
          client.query(`UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`, [c.cid]),
        );
        await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true, membershipCheck: 'skip' });
        await voidMembershipCheck(client, c.cid);
        const d27 = () =>
          approveNoCorrectionNeeded(client, {
            pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_PA, actorDisplay: 'PA', now: c.day(4),
            decisionRationaleCiphertext: 'enc:v1:note', warningReasonCode: null,
          });
        await refusesAndWritesNothing({ client, cid: c.cid }, d27, waits('not_checked'));
        // AC15 — a fee paid ON the day of death holds this site too (`-473` Q1 B; code review 2026-11-21).
        await sameDayCheck(client, PARIWAR_A, c.cid);
        await refusesAndWritesNothing({ client, cid: c.cid }, d27, waits('fee_after_death'));
        await ensurePassedMembershipCheck(client, PARIWAR_A, c.cid);
        await d27();
      });
    });
  });

  // ── AC5 — one site per reason ────────────────────────────────────────────────────────────────────────────────
  describe('AC5 — each wait reason, at an approval site', () => {
    it('`stale` (N4) — the check names a certificate review that is no longer the current one: P1 waits; a fresh check passes', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const ctx: Ctx = { client, tx, pid: PARIWAR_A, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, ctx.pid, ctx.cid, ctx.mid, 'verifier_review');
      // An EARLIER accepted review (another date), then the fixture's own — which re-reviews it (`re_reviewed`).
      const earlier = await seedAcceptedDeathCertificate(client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date: '2026-02-02' });
      await seedNomineeNameCheck(client, ctx.pid, ctx.cid, { membershipCheck: 'skip' });
      const current = await currentReviewId(ctx);
      expect(current).not.toBe(earlier);
      // The check was computed against the EARLIER review (a raw row — the writer refuses a non-current review).
      await seedMembershipCheck(tx, { pariwarId: ctx.pid, claimCaseId: ctx.cid, deceasedMemberId: ctx.mid, reviewId: earlier });
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'stale' });
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('stale'));
      await ensurePassedMembershipCheck(client, ctx.pid, ctx.cid);
      expect((await approve(ctx)).claimState).toBe('verifier_approved');
    });

    it('`identity_not_confirmed` — the final vote waits (⛔ a denial: the state is unchanged); a later `confirmed` check supersedes it and the vote approves', async () => {
      const ctx = await claimAt('verifier_approved');
      await checkOf(ctx, { identityOutcome: 'not_confirmed', identityReason: 'name_differs' });
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('identity_not_confirmed'));
      expect(await stateOf(ctx)).toBe('verifier_approved');
      await checkOf(ctx);
      expect((await vote(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('`fee_after_death` (N6) — P1 waits, and KEEPS waiting whatever the identity says; it can never pass', async () => {
      const ctx = await claimAt('verifier_review');
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('fee_after_death'));
      // …the fee half is reported BEFORE the identity half (DL5's precedence).
      await checkOf(ctx, { feeOutcome: 'after_death', identityOutcome: 'not_confirmed' });
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('fee_after_death'));
    });

    it('`stale` (N2) — a check recorded `not_required` can ⛔ never mask an unchecked identity: the KYC row turned `self_declared` by a raw write ⇒ `stale`', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await seedKyc(ctx, 'digilocker');
      await checkOf(ctx, { identityOutcome: 'not_required' });
      expect(await gateState(ctx)).toEqual({ passed: true });
      await succeedsThenUndo(ctx.client, async () => expect((await approve(ctx)).claimState).toBe('verifier_approved'));
      // The record is rewritten under the check (unreachable today — G2; the gate re-reads it every time).
      await seedKyc(ctx, 'typed_in');
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('stale'));
      // …and the two fail-closed fixtures behave the same way: `unverified`, and ⛔ row at all.
      await seedKyc(ctx, 'unverified');
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'stale' });
      await asSuperuser(ctx.client, () => ctx.client.query('DELETE FROM member_kyc_profiles WHERE member_id = $1', [ctx.mid]));
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'stale' });
    });

    it('N2 relaxes — an identity that has SINCE become DigiLocker-verified no longer holds a `not_confirmed` claim (the gate reads today\'s record)', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await seedKyc(ctx, 'typed_in');
      await checkOf(ctx, { identityOutcome: 'not_confirmed' });
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'identity_not_confirmed' });
      await seedKyc(ctx, 'digilocker');
      expect(await gateState(ctx)).toEqual({ passed: true });
    });
  });

  // ── AC5 — the order (TR2) ─────────────────────────────────────────────────────────────────────────────────────
  describe('AC5 — the existing refusals keep their order; the new conjunct sits after the inspection, before the final-only conjuncts', () => {
    it('⛔ certificate AND ⛔ check ⇒ the CERTIFICATE answers, as today', async () => {
      const ctx = await claimAt('verifier_approved', { membershipCheck: 'skip' });
      await ctx.client.query('UPDATE claim_documents SET storage_object_key = $2 WHERE claim_case_id = $1', [ctx.cid, `gone/${randomUUID()}`]);
      await expect(gate(ctx)).rejects.toMatchObject({ name: 'DeathCertificateAcceptanceRequiredError' });
    });

    it('a failing name check AND ⛔ check ⇒ the NAME CHECK answers', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const ctx: Ctx = { client, tx, pid: PARIWAR_A, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, ctx.pid, ctx.cid, ctx.mid, 'verifier_approved');
      await seedNomineeNameCheck(client, ctx.pid, ctx.cid, { verdicts: ['matches', 'does_not_match'], membershipCheck: 'skip' });
      await expect(gate(ctx)).rejects.toMatchObject({ name: 'NomineeNameCheckRequiredError' });
    });

    it('⛔ inspection AND ⛔ check ⇒ the INSPECTION answers; inspection complete ⇒ the membership check answers next', async () => {
      const ctx = await claimAt('verifier_approved', { membershipCheck: 'skip', inspection: 'skip' });
      await expect(gate(ctx)).rejects.toSatisfy((e: unknown) => e instanceof GroundInspectionRequiredError);
      const done = await claimAt('verifier_approved', { membershipCheck: 'skip' });
      await expect(gate(done)).rejects.toSatisfy(waits('not_checked'));
    });

    it('it binds BOTH steps — the District Admin\'s (P1) and the final one', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await expect(gate(ctx, 'district_admin')).rejects.toSatisfy(waits('not_checked'));
      await expect(gate(ctx, 'final')).rejects.toSatisfy(waits('not_checked'));
      await ensurePassedMembershipCheck(ctx.client, ctx.pid, ctx.cid);
      await expect(gate(ctx, 'district_admin')).resolves.toBeUndefined();
      await expect(gate(ctx, 'final')).resolves.toBeUndefined();
    });
  });

  // ── AC8 — the day of death ──────────────────────────────────────────────────────────────────────────────────
  describe('AC8 — a joining fee paid ON the day of death', () => {
    it('⭐ PQ1 (a), RULED B (`2026-11-21-473` Q1) — `same_day` STOPS the drive: the gate answers `fee_after_death` and the approval is refused (until the ruling it passed — built A; THIS is the test that flipped)', async () => {
      // The one arm the ruling changed, pinned as ruled.
      expect([...MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES]).toEqual(['after_death', 'same_day']);
      const ctx = await claimAt('verifier_review');
      await checkOf(ctx, { feeOutcome: 'same_day' });
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'fee_after_death' });
      await refusesAndWritesNothing(ctx, () => approve(ctx), waits('fee_after_death'));
      // The pure resolver, for each fee outcome (identity confirmed, the check current).
      const outcomeOf = (feeOutcome: schema.MembershipCheckFeeOutcome) =>
        resolveMembershipCheckApprovalState({
          liveCheck: { checkId: 'c' as never, deathCertificateReviewId: 'r' as never, feeOutcome, identityRequired: true, identityOutcome: 'confirmed' },
          currentAcceptedReviewId: 'R' as never,
          kyc: null,
        });
      expect(outcomeOf('before_death')).toEqual({ passed: true });
      expect(outcomeOf('same_day')).toEqual({ passed: false, reason: 'fee_after_death' });
      expect(outcomeOf('after_death')).toEqual({ passed: false, reason: 'fee_after_death' });
    });
  });

  // ── AC16 — what the family is told (`2026-11-21-473` Q3 B; `-474` item 4) ──────────────────────────────────────
  describe('AC16 — `isFeePaidAfterDeathRefusalStanding`: the refusal stands on `fee_paid_after_death`, on EITHER denial', () => {
    it('the P1 denial with the reason ⇒ true; with another reason ⇒ false; not yet denied ⇒ false', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
      await succeedsThenUndo(ctx.client, async () => {
        await deny(ctx, 'other');
        expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
      });
      await deny(ctx, 'fee_paid_after_death');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(true);
    });

    it('a fee paid ON the day of death (`-473` Q1 B) refused with the reason ⇒ true', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'same_day' });
      await deny(ctx, 'fee_paid_after_death');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(true);
    });

    it('the FINAL-VOTE denial with the reason (P1 approved) ⇒ true; with another reason ⇒ false', async () => {
      const ctx = await claimAt('verifier_approved', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await succeedsThenUndo(ctx.client, async () => {
        expect((await vote(ctx, 'denied', 'other')).claimState).toBe('denied');
        expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
      });
      expect((await vote(ctx, 'denied', 'fee_paid_after_death')).claimState).toBe('denied');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(true);
    });
  });

  // ── AC16 through an appeal — the reason follows the denial that MADE the claim denied (code review 2026-11-21) ──
  describe('AC16 — through an appeal: the reason is the denial that made the claim `denied` (`-474` item 4, "its LIVE denial")', () => {
    /**
     * The appeal ladder's own events (6.16's shapes), from `denied`: `reversed` ⇒ `reversed`; `upheld` ⇒ `denied` — AND its
     * journey row, as the ladder writes it (`reversed`; `upheld_final` for an uphold). ⚠ The row matters: the read this
     * replaced keyed on it, so without it the "after a reversal" legs could not tell the two reads apart (proved by
     * reverting the read — code review 2026-11-21). The uphold is at stage 1 for brevity (the reducer's `upheld` arm);
     * the real ladder upholds at stage 3.
     */
    async function appealStage1(ctx: Ctx, decision: 'reversed' | 'upheld'): Promise<void> {
      const [row] = await ctx.tx
        .select({ intakeChannels: schema.claims.intakeChannels, claimantActorId: schema.claims.claimantActorId })
        .from(schema.claims)
        .where(eq(schema.claims.claimCaseId, ctx.cid));
      const base = {
        claimCaseId: ctx.cid,
        pariwarId: ctx.pid,
        deceasedMemberId: toMemberId(ctx.mid),
        intakeChannels: row!.intakeChannels,
        claimantActorId: row!.claimantActorId,
        actorId: null,
      };
      await projectClaimState(ctx.client, {
        ...base,
        eventType: 'claim.appeal_stage1_initiated',
        payload: { from_state: 'denied', to_state: 'appeal_stage_1', trigger: 'appeal_initiate_self', actor: 'member' },
      });
      await projectClaimState(ctx.client, {
        ...base,
        eventType: 'claim.appeal_stage1_reviewed',
        payload: {
          from_state: 'appeal_stage_1',
          to_state: decision === 'reversed' ? 'reversed' : 'denied',
          trigger: decision === 'reversed' ? 'appeal_stage1_reverse' : 'appeal_stage1_uphold',
          actor: 'operator',
          decision,
        },
      });
      await ctx.client.query(
        `INSERT INTO claim_appeals (claim_case_id, pariwar_id, current_stage, initiated_by_actor, status) VALUES ($1, $2, '1', 'member', $3)`,
        [ctx.cid, ctx.pid, decision === 'reversed' ? 'reversed' : 'upheld_final'],
      );
    }

    it('a P1 denial for ANOTHER reason, reversed on appeal, then the final vote denies with the reason ⇒ true (⛔ blanked)', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await deny(ctx, 'other');
      await appealStage1(ctx, 'reversed');
      expect(await stateOf(ctx)).toBe('reversed');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
      expect((await vote(ctx, 'denied', 'fee_paid_after_death')).claimState).toBe('denied');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(true);
    });

    it('a P1 denial WITH the reason, reversed on appeal, then the final vote denies for another reason ⇒ false (⛔ inherited)', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await deny(ctx, 'fee_paid_after_death');
      await appealStage1(ctx, 'reversed');
      expect((await vote(ctx, 'denied', 'other')).claimState).toBe('denied');
      // The P1 decision row is STILL live (a reversal supersedes ⛔ decision) — the control that makes the false meaningful.
      const p1 = await ctx.client.query(
        'SELECT reason_code FROM claim_verifier_decisions WHERE claim_case_id = $1 AND superseded_at IS NULL',
        [ctx.cid],
      );
      expect(p1.rows).toEqual([{ reason_code: 'fee_paid_after_death' }]);
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
    });

    it('an R9 denial after a reversal ⇒ false, though the P1 fee denial row is still live (the denial that made it `denied` is `claim.r9_outcome`) — round 2', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip', beforeScope: seedR9 });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await deny(ctx, 'fee_paid_after_death');
      await appealStage1(ctx, 'reversed');
      await route(ctx);
      await openR9VotingSession(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, clauseId: R9_CLAUSE, panelActorIds: PANEL,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      for (const voter of [V1, V2]) {
        await castR9Vote(ctx.client, {
          claimCaseId: ctx.cid, pariwarId: ctx.pid, vote: 'deny',
          rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(-2)}`), warningReasonCode: null,
          actorId: voter, actorDisplay: `Panelist ${voter.slice(-2)}`, actor: 'trustee',
        });
      }
      await finalize(ctx);
      expect(await stateOf(ctx)).toBe('denied');
      const p1 = await ctx.client.query(
        'SELECT reason_code FROM claim_verifier_decisions WHERE claim_case_id = $1 AND superseded_at IS NULL',
        [ctx.cid],
      );
      expect(p1.rows).toEqual([{ reason_code: 'fee_paid_after_death' }]);
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
    });

    it('an ESCALATION\'s denial (`claim.verifier_denied`, ⛔ live verifier decision after `resolveEscalation`) ⇒ false — round 2', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await escalate(ctx);
      await resolveEscalation(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'denied', reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:deny', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      expect(await stateOf(ctx)).toBe('denied');
      const live = await ctx.client.query('SELECT 1 FROM claim_verifier_decisions WHERE claim_case_id = $1 AND superseded_at IS NULL', [ctx.cid]);
      expect(live.rows).toEqual([]);
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);
    });

    it('a P1 denial WITH the reason whose appeal is UPHELD ⇒ true (the upheld denial is the one that stands)', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await deny(ctx, 'fee_paid_after_death');
      await appealStage1(ctx, 'upheld');
      expect(await stateOf(ctx)).toBe('denied');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(true);
    });
  });

  // ── AC6 — the deny path is never gated; the dedicated reason is ──────────────────────────────────────────────
  describe('AC6 — a denial is never gated (N5); `fee_paid_after_death` is accepted ONLY while the live check says so (DL9)', () => {
    it('a P1 DENY and a final-vote DENY with ⛔ check at all succeed', async () => {
      const p1 = await claimAt('verifier_review', { membershipCheck: 'skip' });
      expect((await deny(p1, 'other')).claimState).toBe('denied');
      const final = await claimAt('verifier_approved', { membershipCheck: 'skip' });
      expect((await vote(final, 'denied')).claimState).toBe('denied');
    });

    it('`adjudicateClaim` — refused without a check, with a PASSING check, with a STALE `after_death` check; accepted while the live, current check says `after_death`', async () => {
      const ctx = await claimAt('verifier_review', { membershipCheck: 'skip' });
      const notShown = (e: unknown) => e instanceof FeePaidAfterDeathNotShownError;
      await refusesAndWritesNothing(ctx, () => deny(ctx, 'fee_paid_after_death'), notShown);
      await checkOf(ctx);
      await refusesAndWritesNothing(ctx, () => deny(ctx, 'fee_paid_after_death'), notShown);
      // `-473` Q1 B — a fee paid ON the day of death counts as after: the reason is accepted for it too.
      await checkOf(ctx, { feeOutcome: 'same_day' });
      await succeedsThenUndo(ctx.client, async () => expect((await deny(ctx, 'fee_paid_after_death')).claimState).toBe('denied'));
      await checkOf(ctx, { feeOutcome: 'after_death' });
      // ⚠ The same denial with ANOTHER reason goes through — the guard is on the reason, ⛔ on the denial.
      await succeedsThenUndo(ctx.client, async () => expect((await deny(ctx, 'other')).claimState).toBe('denied'));
      const result = await deny(ctx, 'fee_paid_after_death');
      expect(result.claimState).toBe('denied');
      const [row] = await ctx.tx
        .select({ reasonCode: schema.claimVerifierDecisions.reasonCode })
        .from(schema.claimVerifierDecisions)
        .where(eq(schema.claimVerifierDecisions.claimCaseId, ctx.cid));
      expect(row!.reasonCode).toBe('fee_paid_after_death');
    });

    it('a STALE `after_death` check proves nothing: the certificate was re-reviewed since ⇒ the reason is refused until a fresh check says so', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const ctx: Ctx = { client, tx, pid: PARIWAR_A, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, ctx.pid, ctx.cid, ctx.mid, 'verifier_review');
      const earlier = await seedAcceptedDeathCertificate(client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date: '2026-02-02' });
      await seedNomineeNameCheck(client, ctx.pid, ctx.cid, { membershipCheck: 'skip' });
      await seedMembershipCheck(tx, { pariwarId: ctx.pid, claimCaseId: ctx.cid, deceasedMemberId: ctx.mid, reviewId: earlier, feeOutcome: 'after_death' });
      await refusesAndWritesNothing(ctx, () => deny(ctx, 'fee_paid_after_death'), (e) => e instanceof FeePaidAfterDeathNotShownError);
      await checkOf(ctx, { feeOutcome: 'after_death' });
      expect((await deny(ctx, 'fee_paid_after_death')).claimState).toBe('denied');
    });

    it('`reviseDecision` — a revise ONTO `fee_paid_after_death` needs the check too; with it, the denial\'s reason is revised', async () => {
      const ctx = await claimAt('verifier_review');
      const first = await deny(ctx, 'other');
      const revise = () =>
        reviseDecision(ctx.client, {
          claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'denied', reasonCode: 'fee_paid_after_death',
          rationaleCiphertext: 'enc:v1:revised', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
          supersedesDecisionId: first.decision.decisionId,
        });
      // The live check PASSES (`before_death`) ⇒ the reason is not shown.
      await refusesAndWritesNothing(ctx, revise, (e) => e instanceof FeePaidAfterDeathNotShownError);
      // ⚠ A `denied` claim is outside the check's window — the row is seeded RAW, as a check recorded before the denial.
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await revise();
      const live = await ctx.client.query<{ reason_code: string }>(
        `SELECT reason_code FROM claim_verifier_decisions WHERE claim_case_id = $1 AND superseded_at IS NULL`,
        [ctx.cid],
      );
      expect(live.rows).toEqual([{ reason_code: 'fee_paid_after_death' }]);
    });

    it('⭐ the FINAL-VOTE deny (TR14) — a P1-approved claim whose RE-CHECK reads `after_death` is ended with the code; refused while the check does not say so', async () => {
      const ctx = await claimAt('verifier_approved');
      // P1 passed on a `before_death` check; the reason is not shown yet.
      await refusesAndWritesNothing(ctx, () => vote(ctx, 'denied', 'fee_paid_after_death'), (e) => e instanceof FeePaidAfterDeathNotShownError);
      // The certificate was re-reviewed after P1 and the re-check reads `after_death` (the window is open post-P1).
      await checkOf(ctx, { feeOutcome: 'after_death' });
      await refusesAndWritesNothing(ctx, () => vote(ctx), waits('fee_after_death'));
      const result = await vote(ctx, 'denied', 'fee_paid_after_death');
      expect(result.claimState).toBe('denied');
      const rows = await ctx.client.query<{ reason_code: string; outcome: string }>(
        `SELECT reason_code, outcome FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND phase = 'frozen_vote' AND superseded_at IS NULL`,
        [ctx.cid],
      );
      expect(rows.rows).toEqual([{ reason_code: 'fee_paid_after_death', outcome: 'denied' }]);
    });

    it('the code is DENY-ONLY in both vocabularies, and ⛔ an escalation resolution\'s reason', async () => {
      const ctx = await claimAt('verifier_review');
      await checkOf(ctx, { feeOutcome: 'after_death' });
      // P1 — an APPROVAL (and an escalation) with the code is a compat mismatch, before any read.
      await expect(
        adjudicateClaim(ctx.client, {
          claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: 'fee_paid_after_death',
          rationaleCiphertext: 'enc:v1:why', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
        }),
      ).rejects.toBeInstanceOf(ReasonCodeOutcomeMismatchError);
      // The final vote — an approve with the code is refused by the trustee compat map.
      const final = await claimAt('verifier_approved');
      await expect(
        voteOnFrozenClaim(final.client, {
          claimCaseId: final.cid, pariwarId: final.pid, outcome: 'approved', reasonCode: 'fee_paid_after_death',
          rationaleCiphertext: null, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
        }),
      ).rejects.toBeInstanceOf(TrusteeReasonCodeError);
      // An ESCALATION's denial is ⛔ the final vote: refused there even while the check says `after_death`.
      await escalate(ctx);
      await expect(
        resolveEscalation(ctx.client, {
          claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'denied', reasonCode: 'fee_paid_after_death',
          rationaleCiphertext: 'enc:v1:deny', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
        }),
      ).rejects.toBeInstanceOf(TrusteeReasonCodeError);
    });
  });

  // ── AC7 — the cycle-freeze commit re-checks (DL6) ─────────────────────────────────────────────────────────────
  describe('AC7 — the commit, the LAST step before the pools spawn, re-checks the membership check (DL6)', () => {
    const commit = (client: Client, pid: PariwarId) =>
      commitCycleFreeze(client, { pariwarId: pid, commitId: randomUUID() as CycleFreezeCommitId, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
    const eventTypesOf = async (ctx: Pick<Ctx, 'client' | 'cid'>) =>
      (await ctx.client.query<{ t: string }>('SELECT event_type AS t FROM events_log WHERE stream_id = $1 ORDER BY event_version', [ctx.cid])).rows.map((r) => r.t);

    it('⭐ a voted claim whose check is made stale by a RAW supersede is SKIPPED and KEPT (⛔ `claim.approved`, ⛔ in the committed set the spawn trigger is fed) while a passing sibling commits', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const voted = async (): Promise<Ctx> => {
        const ctx: Ctx = { client, tx, pid, cid: toClaimId(randomUUID()), mid: randomUUID() };
        await driveClaimTo(client, pid, ctx.cid, ctx.mid, 'verifier_approved');
        await seedNomineeNameCheck(client, pid, ctx.cid);
        expect((await vote(ctx)).claimState).toBe('state_trustee_approved');
        return ctx;
      };
      const held = await voted();
      const sibling = await voted();
      // The window closed at the final vote, so nothing built can move the check now (G10) — a RAW supersede does.
      await voidMembershipCheck(client, held.cid);
      expect(await gateState(held)).toEqual({ passed: false, reason: 'not_checked' });

      const first = await commit(client, pid);
      // ⚠ `committedClaimIds` is exactly what the API's post-commit spawn trigger is fed (`getFrozenClaimRefs`).
      expect(first.committedClaimIds).toEqual([sibling.cid]);
      expect(await stateOf(sibling)).toBe('approved');
      expect(await stateOf(held)).toBe('state_trustee_approved');
      expect(await eventTypesOf(held)).not.toContain('claim.approved');
      expect(await eventTypesOf(sibling)).toContain('claim.approved');

      // SKIP-AND-KEEP, ⛔ a drop: with a current passing check again, a LATER commit approves it.
      await ensurePassedMembershipCheck(client, pid, held.cid);
      const second = await commit(client, pid);
      expect(second.committedClaimIds).toEqual([held.cid]);
      expect(await stateOf(held)).toBe('approved');
    });

    it('each failing reason keeps the claim: a check turned `after_death`, one turned `same_day` (AC15 — `-473` Q1 B), and an identity `not_confirmed`', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const ctx: Ctx = { client, tx, pid, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, pid, ctx.cid, ctx.mid, 'verifier_approved');
      await seedNomineeNameCheck(client, pid, ctx.cid);
      await vote(ctx);
      await checkOf(ctx, { feeOutcome: 'after_death' });
      expect((await commit(client, pid)).committedClaimIds).toEqual([]);
      expect(await stateOf(ctx)).toBe('state_trustee_approved');
      await checkOf(ctx, { feeOutcome: 'same_day' });
      expect((await commit(client, pid)).committedClaimIds).toEqual([]);
      expect(await stateOf(ctx)).toBe('state_trustee_approved');
      await checkOf(ctx, { identityOutcome: 'not_confirmed' });
      expect((await commit(client, pid)).committedClaimIds).toEqual([]);
      expect(await stateOf(ctx)).toBe('state_trustee_approved');
    });
  });

  // ── The writer's re-assertions under the claim lock (DL2, DL3) ───────────────────────────────────────────────
  describe('the writer re-asserts, under the claim lock, what the handler computed against', () => {
    /** A claim whose deceased has a real joining receipt (the lock-in event + its receipt). Returns the receipt id. */
    async function withJoiningReceipt(ctx: Ctx): Promise<string> {
      const utr = `UTR-${randomUUID()}`;
      const receiptId = await asSuperuser(ctx.client, async () => {
        await seedEvent(ctx.tx, ctx.pid, {
          streamId: ctx.mid,
          eventType: 'member.vyawastha_shulk_paid',
          eventVersion: 3,
          payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr, amount_inr: 100 },
        });
        const [row] = await ctx.tx
          .insert(schema.vyawasthaShulkReceipts)
          .values({
            memberId: toMemberId(ctx.mid), pariwarId: ctx.pid, tr: `TR-${randomUUID()}`, utr, amountInr: 100, paymentMethod: 'upi',
            paidAt: new Date('2026-01-09T06:00:00.000Z'), validThrough: new Date('2099-01-01T00:00:00.000Z'),
          })
          .returning({ receiptId: schema.vyawasthaShulkReceipts.receiptId });
        return row!.receiptId as string;
      });
      await enterAppScope(ctx.client, ctx.pid);
      return receiptId;
    }
    /** The claim's live check id right now (`null` ⇒ none) — what a staff member who just opened the check saw. */
    const liveCheckId = async (ctx: Ctx): Promise<string | null> => {
      const r = await ctx.client.query<{ check_id: string }>(
        'SELECT check_id FROM claim_membership_checks WHERE claim_case_id = $1 AND superseded_at IS NULL',
        [ctx.cid],
      );
      return r.rows[0]?.check_id ?? null;
    };
    const record = async (ctx: Ctx, over: Partial<Parameters<typeof recordMembershipCheck>[1]>) =>
      recordMembershipCheck(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, computedAgainstReviewId: randomUUID(), feeReceiptId: randomUUID(),
        expectedLiveCheckId: 'expectedLiveCheckId' in over ? over.expectedLiveCheckId! : await liveCheckId(ctx),
        feeOutcome: 'before_death', identityOutcome: 'confirmed', identityReason: null, noteCiphertext: null,
        actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator', ...over,
      });
    const refused = (reason: string) => (e: unknown) => e instanceof MembershipCheckRefusedError && e.reason === reason;

    it('a review id that is ⛔ the current accepted one ⇒ `stale`; a receipt that is ⛔ the joining one ⇒ `stale`; both right ⇒ recorded, superseding the live check, ONE event', async () => {
      const ctx = await claimAt('verifier_review');
      const receiptId = await withJoiningReceipt(ctx);
      const reviewId = await currentReviewId(ctx);
      expect((await readJoiningFeeReceipt(ctx.tx, ctx.pid, toMemberId(ctx.mid)))?.receiptId).toBe(receiptId);

      await refusesAndWritesNothing(ctx, () => record(ctx, { computedAgainstReviewId: randomUUID(), feeReceiptId: receiptId }), refused('stale'));
      await refusesAndWritesNothing(ctx, () => record(ctx, { computedAgainstReviewId: reviewId, feeReceiptId: randomUUID() }), refused('stale'));

      const before = await rowCounts(ctx);
      const result = await record(ctx, { computedAgainstReviewId: reviewId.toUpperCase(), feeReceiptId: receiptId, feeOutcome: 'same_day' });
      expect(result).toMatchObject({ feeOutcome: 'same_day', identityRequired: true, identityOutcome: 'confirmed', deathCertificateReviewId: reviewId, feeReceiptId: receiptId });
      expect(result.supersededCheckId).not.toBeNull();
      expect((await rowCounts(ctx)).events).toBe(before.events + 1);
      const live = await ctx.client.query(`SELECT check_id FROM claim_membership_checks WHERE claim_case_id = $1 AND superseded_at IS NULL`, [ctx.cid]);
      expect(live.rows).toEqual([{ check_id: result.checkId }]);
      expect(await stateOf(ctx)).toBe('verifier_review');
    });

    it('⛔ joining receipt ⇒ `no_fee_receipt` (fail closed); outside the window ⇒ `window_closed`; ⛔ accepted certificate ⇒ `certificate_not_accepted`', async () => {
      const ctx = await claimAt('verifier_review');
      // The fixture member has ⛔ lock-in event: the joining receipt cannot be identified.
      await refusesAndWritesNothing(ctx, async () => record(ctx, { computedAgainstReviewId: await currentReviewId(ctx) }), refused('no_fee_receipt'));

      const noCert = await claimAt('verifier_review', { membershipCheck: 'skip' });
      await noCert.client.query('UPDATE claim_documents SET storage_object_key = $2 WHERE claim_case_id = $1', [noCert.cid, `gone/${randomUUID()}`]);
      await refusesAndWritesNothing(noCert, () => record(noCert, {}), refused('certificate_not_accepted'));

      const denied = await claimAt('verifier_review');
      await deny(denied, 'other');
      await refusesAndWritesNothing(denied, () => record(denied, {}), refused('window_closed'));
    });

    it('⭐ code review 2026-11-21 (family 12 (c)) — a live check that is ⛔ the one the writer saw ⇒ `check_changed`: ⛔ a re-check supersedes a check unseen', async () => {
      const ctx = await claimAt('verifier_review');
      const receiptId = await withJoiningReceipt(ctx);
      const reviewId = await currentReviewId(ctx);
      const base = { computedAgainstReviewId: reviewId, feeReceiptId: receiptId };
      const seen = await liveCheckId(ctx);
      expect(seen).not.toBeNull();
      // Saw ⛔ live check, but one exists ⇒ refused; saw ANOTHER check ⇒ refused. Nothing written either time.
      await refusesAndWritesNothing(ctx, () => record(ctx, { ...base, expectedLiveCheckId: null }), refused('check_changed'));
      await refusesAndWritesNothing(ctx, () => record(ctx, { ...base, expectedLiveCheckId: randomUUID() }), refused('check_changed'));
      // Saw the live one (any case) ⇒ recorded, superseding exactly it.
      const result = await record(ctx, { ...base, expectedLiveCheckId: seen!.toUpperCase() });
      expect(result.supersededCheckId).toBe(seen);
      // The FIRST writer's view is now stale: its re-check is refused.
      await refusesAndWritesNothing(ctx, () => record(ctx, { ...base, expectedLiveCheckId: seen }), refused('check_changed'));
    });

    it('the identity half is judged iff nobody has checked it — re-read under the lock (DL4)', async () => {
      const ctx = await claimAt('verifier_review');
      const receiptId = await withJoiningReceipt(ctx);
      const reviewId = await currentReviewId(ctx);
      const base = { computedAgainstReviewId: reviewId, feeReceiptId: receiptId };
      // ⛔ KYC row at all ⇒ required (fail closed): `not_required` is refused.
      await refusesAndWritesNothing(ctx, () => record(ctx, { ...base, identityOutcome: 'not_required' }), refused('invalid_outcome'));
      await seedKyc(ctx, 'typed_in');
      await refusesAndWritesNothing(ctx, () => record(ctx, { ...base, identityOutcome: 'not_required' }), refused('invalid_outcome'));
      await seedKyc(ctx, 'digilocker');
      await refusesAndWritesNothing(ctx, () => record(ctx, { ...base, identityOutcome: 'confirmed' }), refused('invalid_outcome'));
      expect(await record(ctx, { ...base, identityOutcome: 'not_required' })).toMatchObject({ identityRequired: false, identityOutcome: 'not_required' });
    });
  });
});
