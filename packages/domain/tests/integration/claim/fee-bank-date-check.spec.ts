// Story 6.39a — the bank date at the domain, on real rows (Task 4.4; AC3, AC5, AC6, AC7; DL5, DL6, DL7; N4, N7, TR7).
//
//   · AC5 / TR7 — the membership-check WRITER's own re-assert under the claim lock: a direct call with
//     `computedAgainstFeeBankDateId` = R1 while R2 is live, and with `null` while a record is live ⇒ each
//     `bank_date_changed`, ⛔ row (the handler compares first, so an API leg never reaches this one); the writer stores
//     `fee_date_source` / `fee_bank_date_id` from what IT re-read; the SAME PERSON is refused at the writer;
//   · AC6 — ONE test names PQ1 (`2026-11-27-511` Q1 B), through the real path: a claim denied `fee_paid_after_death` ⇒ the
//     bank date is refused `window_closed`; the appeal reverses it ⇒ accepted in `reversed`; the re-check passes; the final
//     vote approves; the family's refusal no longer stands; and once `state_trustee_approved`, a correction is refused
//     (`window_closed` — corrections stop, DL5);
//   · AC7 — the cycle-freeze commit SKIPS (and keeps) a claim the gate holds on `bank_date_recorded`.
// Each test in its own rolled-back transaction. ⛔ TRUNCATE, ⛔ DDL.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  FeeBankDateRefusedError,
  MembershipCheckRefusedError,
  adjudicateClaim,
  commitCycleFreeze,
  isFeePaidAfterDeathRefusalStanding,
  membershipCheckApprovalState,
  projectClaimState,
  recordFeeBankDate,
  recordMembershipCheck,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type CycleFreezeCommitId, type PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { driveClaimTo, enterAppScope, seedAcceptedDeathCertificate, seedEvent, seedNomineeNameCheck } from '../_helpers.js';
import { asSuperuser } from './_correction-closure-fixture.js';

const DA = 'd6d6d6d6-0000-4000-8000-00000039a001';
const DA2 = 'd6d6d6d6-0000-4000-8000-00000039a002';
const FO = 'f0f0f0f0-0000-4000-8000-00000039a001';
const PA = 'a6a6a6a6-0000-4000-8000-00000039a001';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];
interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
  utr: string;
  receiptId: string;
  reviewId: string;
}

/** IST today — the members row is created now, so a bank date of today is ⛔ before joining and ⛔ in the future. */
const TODAY = () => istDateOf(new Date());

/**
 * An approvable claim at `state` (a fresh Pariwar) whose deceased has a REAL joining payment (the lock-in event + its
 * payment), the live check naming THAT payment with `feeOutcome`.
 */
async function claimAt(state: 'verifier_review' | 'verifier_approved', feeOutcome: 'before_death' | 'after_death' = 'after_death'): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = toPariwarId(randomUUID());
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await driveClaimTo(client, pid, cid, mid, state);
  await seedNomineeNameCheck(client, pid, cid, { membershipCheck: 'skip', inspection: 'completed' });
  const utr = `${Math.floor(1e11 + Math.random() * 9e11)}`;
  const receiptId = await asSuperuser(client, async () => {
    await tx.insert(schema.members).values({ memberId: mid as never, pariwarId: pid, state: 'lock-in', stateEventVersion: 1 }).onConflictDoNothing();
    await seedEvent(tx, pid, {
      streamId: mid,
      eventType: 'member.vyawastha_shulk_paid',
      eventVersion: 3,
      payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr, amount_inr: 110 },
    });
    const [row] = await tx
      .insert(schema.vyawasthaShulkReceipts)
      .values({
        memberId: toMemberId(mid), pariwarId: pid, tr: `TR-${randomUUID()}`, utr, amountInr: 110, paymentMethod: 'upi',
        paidAt: new Date(), validThrough: new Date('2099-01-01T00:00:00.000Z'),
      })
      .returning({ receiptId: schema.vyawasthaShulkReceipts.receiptId });
    return row!.receiptId as string;
  });
  await enterAppScope(client, pid);
  const reviewId = await seedAcceptedDeathCertificate(client, { pariwarId: pid, claimCaseId: cid });
  const ctx: Ctx = { client, tx, pid, cid, mid, utr, receiptId, reviewId };
  await rawCheck(ctx, { feeOutcome });
  return ctx;
}

/** Replace the live check with a RAW one naming the joining payment (the deceased has ⛔ KYC row ⇒ the identity is judged: `confirmed`). */
async function rawCheck(ctx: Ctx, over: { feeOutcome?: 'before_death' | 'same_day' | 'after_death'; feeDateSource?: 'recorded' | 'bank'; feeBankDateId?: string | null } = {}): Promise<string> {
  await ctx.client.query(
    `UPDATE claim_membership_checks SET superseded_at = now(), superseded_reason = 're_checked' WHERE claim_case_id = $1 AND superseded_at IS NULL`,
    [ctx.cid],
  );
  const [row] = await ctx.tx
    .insert(schema.claimMembershipChecks)
    .values({
      claimCaseId: ctx.cid, pariwarId: ctx.pid, deceasedMemberId: ctx.mid as never, deathCertificateReviewId: ctx.reviewId as never,
      feeReceiptId: ctx.receiptId as never, feeOutcome: over.feeOutcome ?? 'after_death', feeDateSource: over.feeDateSource ?? 'recorded',
      feeBankDateId: (over.feeBankDateId ?? null) as never, identityRequired: true, identityOutcome: 'confirmed', identityReason: null,
      noteCiphertext: null, decidedByActorId: DA, decidedByDisplay: 'Anita (District Admin)',
    })
    .returning({ checkId: schema.claimMembershipChecks.checkId });
  return row!.checkId as string;
}

const liveId = async (ctx: Ctx, table: 'claim_membership_checks' | 'claim_fee_bank_dates'): Promise<string | null> => {
  const col = table === 'claim_membership_checks' ? 'check_id' : 'record_id';
  const r = await ctx.client.query<{ id: string }>(`SELECT ${col} AS id FROM ${table} WHERE claim_case_id = $1 AND superseded_at IS NULL`, [ctx.cid]);
  return r.rows[0]?.id ?? null;
};

/** The finance officer records a bank date (the domain writer — the handler's encryption is not under test here). */
const bank = async (ctx: Ctx, over: Partial<Parameters<typeof recordFeeBankDate>[1]> = {}) =>
  recordFeeBankDate(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, statementReference: ctx.utr, bankCreditDate: TODAY(), reasonCode: 'recorded_late_by_member',
    noteCiphertext: 'enc:v1:note', expectedLiveCheckId: await liveId(ctx, 'claim_membership_checks'),
    expectedLiveRecordId: await liveId(ctx, 'claim_fee_bank_dates'), actorId: FO, actorDisplay: 'Meera (Finance Officer)', actor: 'operator',
    now: new Date(), ...over,
  });

/** The District Admin's check, DIRECT to the writer (the handler's compare is bypassed — TR7). */
const check = async (ctx: Ctx, over: Partial<Parameters<typeof recordMembershipCheck>[1]> = {}) =>
  recordMembershipCheck(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, computedAgainstReviewId: ctx.reviewId, feeReceiptId: ctx.receiptId,
    expectedLiveCheckId: await liveId(ctx, 'claim_membership_checks'), computedAgainstFeeBankDateId: await liveId(ctx, 'claim_fee_bank_dates'),
    feeOutcome: 'before_death', identityOutcome: 'confirmed', identityReason: null, noteCiphertext: null,
    actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator', ...over,
  });

const checkRows = async (ctx: Ctx) =>
  (await ctx.client.query<{ n: number }>('SELECT count(*)::int AS n FROM claim_membership_checks WHERE claim_case_id = $1', [ctx.cid])).rows[0]!.n;
const gateState = (ctx: Ctx) => membershipCheckApprovalState(ctx.tx, ctx.pid, ctx.cid, toMemberId(ctx.mid));
async function stateOf(ctx: Pick<Ctx, 'tx' | 'cid'>): Promise<string> {
  const [row] = await ctx.tx.select({ s: schema.claims.currentState }).from(schema.claims).where(eq(schema.claims.claimCaseId, ctx.cid));
  return row!.s;
}
const refusedCheck = (reason: string) => (e: unknown) => e instanceof MembershipCheckRefusedError && e.reason === reason;
const refusedBank = (reason: string) => (e: unknown) => e instanceof FeeBankDateRefusedError && e.reason === reason;

describe.skipIf(!hasDatabase)('Story 6.39a — the bank date at the domain', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('AC5 / TR7 — the membership-check writer re-asserts the bank date under the claim lock', () => {
    it('⭐ `computedAgainstFeeBankDateId` = R1 while R2 is live ⇒ `bank_date_changed`, ⛔ row; = R2 ⇒ recorded with `bank` + R2 from what the writer RE-READ', async () => {
      const ctx = await claimAt('verifier_review');
      const r1 = (await bank(ctx, { bankCreditDate: TODAY() })).recordId as string;
      // A correction: R2 supersedes R1. (The member joined today and paid today, so the bank date can only be today — equal to
      // the recorded date, so `recorded` is kept: DL6's `bank` only when STRICTLY earlier.)
      const r2 = (await bank(ctx)).recordId as string;
      expect(r2).not.toBe(r1);
      const before = await checkRows(ctx);
      await ctx.client.query('SAVEPOINT s1');
      await expect(check(ctx, { computedAgainstFeeBankDateId: r1 })).rejects.toSatisfy(refusedCheck('bank_date_changed'));
      await ctx.client.query('ROLLBACK TO SAVEPOINT s1');
      expect(await checkRows(ctx)).toBe(before);
      const ok = await check(ctx, { computedAgainstFeeBankDateId: r2 });
      expect({ source: ok.feeDateSource, id: ok.feeBankDateId }).toEqual({ source: 'recorded', id: r2 });
      const [row] = await ctx.tx.select().from(schema.claimMembershipChecks).where(eq(schema.claimMembershipChecks.checkId, ok.checkId));
      expect({ source: row!.feeDateSource, id: row!.feeBankDateId }).toEqual({ source: 'recorded', id: r2 });
      expect(await gateState(ctx)).toEqual({ passed: true });
    });

    it('⭐ `null` while a record is live ⇒ `bank_date_changed`, ⛔ row; a STRICTLY earlier bank date is stored as `bank`', async () => {
      const ctx = await claimAt('verifier_review');
      // Move the member's joining back so a bank date YESTERDAY is allowed (as the owner — ⛔ a lifecycle column).
      await asSuperuser(ctx.client, () => ctx.client.query(`UPDATE members SET created_at = now() - interval '30 days' WHERE member_id = $1`, [ctx.mid]));
      await enterAppScope(ctx.client, ctx.pid);
      const yesterday = istDateOf(new Date(Date.now() - 86_400_000));
      const r = (await bank(ctx, { bankCreditDate: yesterday })).recordId as string;
      const before = await checkRows(ctx);
      await ctx.client.query('SAVEPOINT s2');
      await expect(check(ctx, { computedAgainstFeeBankDateId: null })).rejects.toSatisfy(refusedCheck('bank_date_changed'));
      await ctx.client.query('ROLLBACK TO SAVEPOINT s2');
      expect(await checkRows(ctx)).toBe(before);
      const ok = await check(ctx);
      expect({ source: ok.feeDateSource, id: ok.feeBankDateId }).toEqual({ source: 'bank', id: r });
    });

    it('⭐ N7 — the SAME PERSON (the id differing only in case and whitespace) ⇒ `same_person`, ⛔ row; another actor is accepted', async () => {
      const ctx = await claimAt('verifier_review');
      await bank(ctx);
      const before = await checkRows(ctx);
      await ctx.client.query('SAVEPOINT s3');
      await expect(check(ctx, { actorId: `  ${FO.toUpperCase()} ` })).rejects.toSatisfy(refusedCheck('same_person'));
      await ctx.client.query('ROLLBACK TO SAVEPOINT s3');
      expect(await checkRows(ctx)).toBe(before);
      await expect(check(ctx, { actorId: DA2 })).resolves.toMatchObject({ feeDateSource: 'recorded' });
    });
  });

  describe('AC6 — PQ1 (`2026-11-27-511` Q1 B): the bank date helps after a refusal, once the appeal sends the claim back', () => {
    it('⭐⭐ PQ1 — denied `fee_paid_after_death` ⇒ `window_closed`; the appeal reverses it ⇒ accepted in `reversed`; the re-check passes; the final vote approves; the refusal no longer stands; then corrections STOP at `state_trustee_approved`', async () => {
      const ctx = await claimAt('verifier_review', 'after_death');
      // The P1 denial for the fee (the gate answers `fee_after_death`, so the guard accepts the reason).
      await adjudicateClaim(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'denied', reasonCode: 'fee_paid_after_death',
        rationaleCiphertext: 'enc:v1:deny', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      });
      expect(await stateOf(ctx)).toBe('denied');
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(true);
      await ctx.client.query('SAVEPOINT pq1');
      await expect(bank(ctx)).rejects.toSatisfy(refusedBank('window_closed'));
      await ctx.client.query('ROLLBACK TO SAVEPOINT pq1');

      // The family appeals; stage 1 REVERSES (the ladder's own events and journey row — 6.16's shapes).
      const [row] = await ctx.tx
        .select({ intakeChannels: schema.claims.intakeChannels, claimantActorId: schema.claims.claimantActorId })
        .from(schema.claims)
        .where(eq(schema.claims.claimCaseId, ctx.cid));
      const base = { claimCaseId: ctx.cid, pariwarId: ctx.pid, deceasedMemberId: toMemberId(ctx.mid), intakeChannels: row!.intakeChannels, claimantActorId: row!.claimantActorId, actorId: null };
      await projectClaimState(ctx.client, { ...base, eventType: 'claim.appeal_stage1_initiated', payload: { from_state: 'denied', to_state: 'appeal_stage_1', trigger: 'appeal_initiate_self', actor: 'member' } });
      await projectClaimState(ctx.client, {
        ...base, eventType: 'claim.appeal_stage1_reviewed',
        payload: { from_state: 'appeal_stage_1', to_state: 'reversed', trigger: 'appeal_stage1_reverse', actor: 'operator', decision: 'reversed' },
      });
      await ctx.client.query(
        `INSERT INTO claim_appeals (claim_case_id, pariwar_id, current_stage, initiated_by_actor, status) VALUES ($1, $2, '1', 'member', 'reversed')`,
        [ctx.cid, ctx.pid],
      );
      expect(await stateOf(ctx)).toBe('reversed');

      // ⭐ In `reversed` (inside the window) the finance officer's record is ACCEPTED — the live check survived the denial.
      const rec = await bank(ctx);
      expect(rec.recordId).toBeTruthy();
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'bank_date_recorded' });
      // The District Admin checks again (the handler would compute `before_death` from the earlier bank date).
      await check(ctx, { feeOutcome: 'before_death' });
      expect(await gateState(ctx)).toEqual({ passed: true });
      // The final vote approves.
      const voted = await voteOnFrozenClaim(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      expect(voted.claimState).toBe('state_trustee_approved');
      // The family's refusal no longer stands (its `refusal_reason` reads `null` — 6.39 AC16's read).
      expect(await isFeePaidAfterDeathRefusalStanding(ctx.tx, ctx.pid, ctx.cid)).toBe(false);

      // ⚠ DL5 — corrections STOP here: `state_trustee_approved` is outside the window.
      await expect(bank(ctx)).rejects.toSatisfy(refusedBank('window_closed'));
    });
  });

  describe('AC7 — the cycle-freeze commit skips a claim held on `bank_date_recorded` (unchanged code — the ONE definition)', () => {
    it('⭐ a voted claim, then a RAW live bank-date record the check does ⛔ name ⇒ SKIPPED and KEPT; named again ⇒ a later commit approves it', async () => {
      const ctx = await claimAt('verifier_approved', 'before_death');
      const voted = await voteOnFrozenClaim(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      expect(voted.claimState).toBe('state_trustee_approved');
      // The window is closed at the final vote, so ⛔ writer can add a record now — a RAW row does.
      const [rec] = await ctx.tx
        .insert(schema.claimFeeBankDates)
        .values({
          pariwarId: ctx.pid, claimCaseId: ctx.cid, deceasedMemberId: ctx.mid as never, feeReceiptId: ctx.receiptId as never,
          bankCreditDate: TODAY(), reasonCode: 'other', noteCiphertext: 'enc:v1:n', decidedByActorId: FO, decidedByDisplay: 'Meera (Finance Officer)',
        })
        .returning({ recordId: schema.claimFeeBankDates.recordId });
      expect(await gateState(ctx)).toEqual({ passed: false, reason: 'bank_date_recorded' });
      const commit = () =>
        commitCycleFreeze(ctx.client, { pariwarId: ctx.pid, commitId: randomUUID() as CycleFreezeCommitId, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      expect((await commit()).committedClaimIds).toEqual([]);
      expect(await stateOf(ctx)).toBe('state_trustee_approved');
      // SKIP-AND-KEEP: a check naming the record (a re-check that considered it) lets a LATER commit approve it.
      await rawCheck(ctx, { feeOutcome: 'before_death', feeBankDateId: rec!.recordId as string });
      expect((await commit()).committedClaimIds).toEqual([ctx.cid]);
      expect(await stateOf(ctx)).toBe('approved');
    });
  });
});
