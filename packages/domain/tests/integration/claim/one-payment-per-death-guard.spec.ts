// Story 6.28 — the guard (OP2), live DB (:5433). `2026-10-11-318` Q1 A, `2026-10-11-319` OP2.
//
//   AC2 — given claim X of a death `state_trustee_approved` / `approved` / `settled`, EACH of the five `final` call sites on
//         claim Y of the same death throws `DeathAlreadyFinallyApprovedError` and writes NOTHING (the DOMAIN leg — through
//         the API, H(iv) then closes Y when X is paid: AC4); the District Admin's approval (P1) on Y still succeeds; a claim
//         of ANOTHER death is unaffected; X routed to R9 and DENIED ⇒ the still-open Y can be finally approved.
//   ORDER — after RF5's suspicion wait (it rides RF15's key), BEFORE the late-warning wait (EA2 stays LAST).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  DeathAlreadyFinallyApprovedError,
  LateWarningReasonRequiredError,
  SuspicionAppealPendingError,
  adjudicateClaim,
  approveNoCorrectionNeeded,
  assertClaimApprovable,
  castR9Vote,
  decideEscalatedClosure,
  escalateStaffCase,
  finalizeR9Outcome,
  isCorrectionClaimHeld,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  recordNoCorrectionNeeded,
  routeToR9,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  SEEDED_NOMINEES_DECLARED_AT,
  enterAppScope,
  seedClauseVersion,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import { SA as CC_SA, TRUSTEE as CC_PA, DA as CC_DA, asSuperuser, decline, reachedClaim, request, returnedClaim, type Returned } from './_correction-closure-fixture.js';
import { claimAt } from './_one-payment-fixtures.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const DA = 'd8d8d8d8-0000-4000-8000-000000000001';
const PA = 'a8a8a8a8-0000-4000-8000-000000000002';
const V1 = 'b8b8b8b8-0000-4000-8000-000000000011';
const V2 = 'b8b8b8b8-0000-4000-8000-000000000012';
const V3 = 'b8b8b8b8-0000-4000-8000-000000000013';
const PANEL = [V1, V2, V3];
const R9_CLAUSE = 'niy.special-death.r9';
const DAY = 86_400_000;

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const stopped = (x: ClaimId) => (e: unknown) => e instanceof DeathAlreadyFinallyApprovedError && e.approvedClaimCaseId === x;

async function rowCounts(client: Client, cid: ClaimId) {
  const q = async (s: string) => (await client.query<{ n: number }>(s, [cid])).rows[0]!.n;
  return {
    events: await q('SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1'),
    trustee: await q('SELECT count(*)::int AS n FROM claim_state_trustee_decisions WHERE claim_case_id = $1'),
    warningRecords: await q('SELECT count(*)::int AS n FROM claim_warning_approvals WHERE claim_case_id = $1'),
    closures: await q('SELECT count(*)::int AS n FROM claim_correction_closures WHERE claim_case_id = $1'),
    state: (await client.query<{ s: string }>('SELECT current_state AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]!.s,
  };
}

/** The writer refuses with the typed STOP and writes NOTHING — counted BEFORE the rollback (the 6.26a precedent). */
async function stopsAndWritesNothing(client: Client, cid: ClaimId, fn: () => Promise<unknown>, match: (e: unknown) => boolean) {
  const before = await rowCounts(client, cid);
  await client.query('SAVEPOINT opd_gate');
  await expect(fn()).rejects.toSatisfy(match);
  const after = await rowCounts(client, cid);
  await client.query('ROLLBACK TO SAVEPOINT opd_gate');
  expect(after).toEqual(before);
}

const finalGate = (tx: Tx, pid: PariwarId, cid: ClaimId, mid: string, step: 'final' | 'district_admin' = 'final', nameCheck?: 'waived_251') =>
  assertClaimApprovable(tx, pid, cid, toMemberId(mid), { approvingActorIds: [PA], step, ...(nameCheck ? { nameCheck } : {}) });

const vote = (client: Client, pid: PariwarId, cid: ClaimId, outcome: 'approved' | 'denied' = 'approved') =>
  voteOnFrozenClaim(client, {
    claimCaseId: cid, pariwarId: pid, outcome,
    reasonCode: outcome === 'denied' ? 'other' : null,
    rationaleCiphertext: outcome === 'denied' ? 'enc:v1:deny' : 'enc:v1:why',
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });

async function seedR9(client: Client, tx: Tx, pid: PariwarId): Promise<void> {
  await client.query('RESET ROLE');
  await seedClauseVersion(tx, pid, {
    clauseId: R9_CLAUSE,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
  await enterAppScope(client, pid);
}

async function routeOpenAndVote(client: Client, pid: PariwarId, cid: ClaimId, choice: 'approve' | 'deny'): Promise<void> {
  await routeToR9(client, {
    claimCaseId: cid, pariwarId: pid, reasonCode: 'r9_special_case', rationaleCiphertext: null,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
  await openR9VotingSession(client, {
    claimCaseId: cid, pariwarId: pid, clauseId: R9_CLAUSE, panelActorIds: PANEL,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
  for (const voter of [V1, V2]) {
    await castR9Vote(client, {
      claimCaseId: cid, pariwarId: pid, vote: choice,
      rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(-2)}`), warningReasonCode: null,
      actorId: voter, actorDisplay: `Panelist ${voter.slice(-2)}`, actor: 'trustee',
    });
  }
}
const finalize = (client: Client, pid: PariwarId, cid: ClaimId) =>
  finalizeR9Outcome(client, { claimCaseId: cid, pariwarId: pid, actorId: V1, actorDisplay: 'Finalizer', actor: 'trustee' });

describe.skipIf(!hasDatabase)('Story 6.28 — the guard: one final approval per death (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('AC2 — the gate, for each finally approved state of X', () => {
    for (const state of ['state_trustee_approved', 'approved', 'settled'] as const) {
      it(`X \`${state}\` ⇒ Y's FINAL gate stops (the \`-251\` waived approve too); P1 on Y passes`, async () => {
        const { client, tx } = getTx();
        const mid = toMemberId(randomUUID());
        const x = await claimAt(client, PARIWAR_A, mid, state);
        const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
        await expect(finalGate(tx, PARIWAR_A, y, mid)).rejects.toSatisfy(stopped(x));
        await expect(finalGate(tx, PARIWAR_A, y, mid, 'final', 'waived_251')).rejects.toSatisfy(stopped(x));
        await expect(finalGate(tx, PARIWAR_A, y, mid, 'district_admin')).resolves.toBeUndefined();
      });
    }

    it('X still open (`verifier_approved`), or `denied` / `closed` ⇒ ⛔ no stop; a claim of ANOTHER death is unaffected', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      await claimAt(client, PARIWAR_A, mid, 'denied');
      await claimAt(client, PARIWAR_A, mid, 'closed');
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      await expect(finalGate(tx, PARIWAR_A, y, mid)).resolves.toBeUndefined();
      const otherMid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, otherMid, 'approved');
      await expect(finalGate(tx, PARIWAR_A, y, mid)).resolves.toBeUndefined();
    });

    it('X itself is ⛔ never stopped by its own approval (self excluded)', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
      await expect(finalGate(tx, PARIWAR_A, x, mid)).resolves.toBeUndefined();
    });
  });

  describe('AC2 — the five `final` call sites (four writers), through the REAL writers', () => {
    it('P3 — the Pariwar Admin\'s final vote on Y stops and writes nothing; a DENY vote and P1 succeed', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      await stopsAndWritesNothing(client, y, () => vote(client, PARIWAR_A, y), stopped(x));
      await client.query('SAVEPOINT opd_ok');
      expect((await vote(client, PARIWAR_A, y, 'denied')).claimState).toBe('denied');
      await client.query('ROLLBACK TO SAVEPOINT opd_ok');
    });

    it('P1 — the District Admin\'s approval of Y succeeds while X is paid (FQ5\'s "goes through every check")', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'approved');
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, y);
      const out = await adjudicateClaim(client, {
        claimCaseId: y, pariwarId: PARIWAR_A, outcome: 'approved', reasonCode: 'r5_d_natural_death',
        rationaleCiphertext: 'enc:v1:why', actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      });
      expect(out.claimState).toBe('verifier_approved');
    });

    it('P4 — R9 finalize (an APPROVE outcome) on Y stops and writes nothing', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await seedR9(client, tx, pid);
      const mid = toMemberId(randomUUID());
      const y = await claimAt(client, pid, mid, 'verifier_approved');
      await routeOpenAndVote(client, pid, y, 'approve');
      const x = await claimAt(client, pid, mid, 'state_trustee_approved');
      await stopsAndWritesNothing(client, y, () => finalize(client, pid, y), stopped(x));
    });

    it('⭐ X routed to R9 and DENIED ⇒ the still-open Y can be finally approved (F15)', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await seedR9(client, tx, pid);
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, pid, mid, 'verifier_approved');
      expect((await vote(client, pid, x)).claimState).toBe('state_trustee_approved');
      const y = await claimAt(client, pid, mid, 'verifier_approved');
      await stopsAndWritesNothing(client, y, () => vote(client, pid, y), stopped(x));
      await routeOpenAndVote(client, pid, x, 'deny');
      await finalize(client, pid, x);
      expect((await rowCounts(client, x)).state).toBe('denied');
      expect((await vote(client, pid, y)).claimState).toBe('state_trustee_approved');
    });

    describe('6.19c\'s three approvals — the Super Admin\'s FULL and `-251` WAIVED approves, and "no correction needed"', () => {
      const saApprove = (client: Client, c: Returned, reason: string) =>
        decideEscalatedClosure(client, {
          pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_SA, actorDisplay: 'Super Admin One', now: c.day(100),
          reason, noteCiphertext: 'enc:v1:sa-note', decisionRationaleCiphertext: 'enc:v1:sa-rationale', decision: 'approve',
        });

      it('the Super Admin\'s FULL-gate approve (staff case) stops', async () => {
        const { client } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await returnedClaim(client, { mustAct: 'staff' });
        await escalateStaffCase(client, { pariwarId: PARIWAR_A, claimCaseId: c.cid, now: c.day(90) });
        const x = await claimAt(client, PARIWAR_A, c.mid, 'approved', { bare: true });
        await stopsAndWritesNothing(client, c.cid, () => saApprove(client, c, 'details_verified'), stopped(x));
      });

      it('the `-251` WAIVED approve stops too (the waiver drops only the name check)', async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const c = await reachedClaim(client, tx);
        await request(client, c);
        await decline(client, c);
        const x = await claimAt(client, PARIWAR_A, c.mid, 'state_trustee_approved', { bare: true });
        await stopsAndWritesNothing(client, c.cid, () => saApprove(client, c, 'name_difference_accepted'), stopped(x));
      });

      it('"no correction needed" (D27) stops — and OP2 answers BEFORE the late-warning wait (EA2 stays LAST)', async () => {
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
        await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
        const d27 = () =>
          approveNoCorrectionNeeded(client, {
            pariwarId: PARIWAR_A, claimCaseId: c.cid, actorId: CC_PA, actorDisplay: 'PA', now: c.day(4),
            decisionRationaleCiphertext: 'enc:v1:note', warningReasonCode: 'warnings_reviewed',
          });
        // A LATE warning key nobody has answered (6.23b's construction) ⇒ the late wait answers while ⛔ no X exists …
        await client.query('UPDATE claims SET created_at = $2 WHERE claim_case_id = $1', [c.cid, new Date(SEEDED_NOMINEES_DECLARED_AT.getTime() + 30 * DAY)]);
        await client.query(
          `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
           VALUES ($1, $2, 'approved', 'r5_d_natural_death', 'enc:v1:why', $3, 'District Admin One')`,
          [c.cid, PARIWAR_A, CC_DA],
        );
        await stopsAndWritesNothing(client, c.cid, d27, (e) => e instanceof LateWarningReasonRequiredError);
        // … and with X paid, OP2 answers FIRST.
        const x = await claimAt(client, PARIWAR_A, c.mid, 'approved', { bare: true });
        await stopsAndWritesNothing(client, c.cid, d27, stopped(x));
      });
    });
  });

  it('ORDER — RF5\'s suspicion wait answers BEFORE OP2 (a claim failing both waits — ⛔ never stopped)', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    await refusedClaim(client, PARIWAR_A, mid); // `-239`, ⛔ not appealed, within 90 days ⇒ RF5 holds Y
    const x = await claimAt(client, PARIWAR_A, mid, 'approved');
    const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
    await expect(finalGate(tx, PARIWAR_A, y, mid)).rejects.toBeInstanceOf(SuspicionAppealPendingError);
    void x;
  });
});
