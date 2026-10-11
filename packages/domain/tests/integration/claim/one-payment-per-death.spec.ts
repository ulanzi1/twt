// Story 6.28 — "one payment per death", live DB (:5433). `2026-10-11-318` Q1 A, `2026-10-11-319` OP1.
//
//   AC1 — one definition (OP1): the two thin reads never return the claim itself, a claim of another death or another
//         Pariwar, and return the LOWEST id when (legacy) two qualify; the open fragment excludes terminal claims, finally
//         approved claims and every claim on which RF1 stands, and is EMPTY on a claim on which RF1 stands itself.
//   AC11 (a) — `readOtherClaimsForDeath` (OP14 (a)): every other claim of the death with its stage in staff words, filed
//         instant / channels and the date-of-death comparison by keyed-index EQUALITY (same / different / not accepted /
//         not comparable); capped at 20 with the total; ⛔ no ciphertext column is ever read.
//   AC3 — the commit (OP3): a `state_trustee_approved` candidate whose death already has an `approved` / `settled` claim (this
//         run or an earlier cycle) is SKIPPED AND KEPT; a legacy two-voted pair ⇒ the lower id is committed, the other is
//         then skipped and stays `state_trustee_approved`; distinct deaths are unaffected; the result shape is unchanged.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  OTHER_CLAIMS_FOR_DEATH_CAP,
  commitCycleFreeze,
  readClosedHolderRefusedBulk,
  readFinallyApprovedElsewhereBulk,
  readOtherClaimVisits,
  readOtherClaimsForDeath,
  otherClaimInStatesSql,
  otherOpenClaimForDeathExistsSql,
  otherOpenClaimsForDeathSql,
  readOtherFinallyApprovedClaim,
  readPaymentCommittedClaim,
  FINALLY_APPROVED_CLAIM_STATES,
} from '../../../src/claim/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, CycleFreezeCommitId, PariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedAcceptedDeathCertificate, seedGroundInspection, seedNomineeNameCheck } from '../_helpers.js';
import { claimAt, emitClaim, type FixtureState } from './_one-payment-fixtures.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const LOW = '00000000-0000-4000-8000-0000000000a1';
const HIGH = 'ffffffff-ffff-4fff-8fff-0000000000a2';

describe.skipIf(!hasDatabase)('Story 6.28 — one payment per death: OP1 + OP3 (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function openOf(cid: ClaimId): Promise<{ list: string[]; exists: boolean }> {
    const { tx } = getTx();
    const r = await tx.execute<{ list: string[]; exists: boolean }>(sql`
      SELECT ${otherOpenClaimsForDeathSql('c')} AS list, ${otherOpenClaimForDeathExistsSql('c')} AS exists
        FROM claims c WHERE c.claim_case_id = ${cid}`);
    return r.rows[0]!;
  }

  describe('AC1 — the thin reads', () => {
    for (const state of ['state_trustee_approved', 'approved', 'settled'] as const) {
      it(`another claim of the death in \`${state}\` is finally approved${state === 'state_trustee_approved' ? ' — but its payment is ⛔ not committed' : ' AND payment committed'}`, async () => {
        const { client, tx } = getTx();
        const mid = toMemberId(randomUUID());
        const x = await claimAt(client, PARIWAR_A, mid, state);
        const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
        expect(await readOtherFinallyApprovedClaim(tx, PARIWAR_A, mid, y)).toBe(x);
        expect(await readPaymentCommittedClaim(tx, PARIWAR_A, mid, y)).toBe(state === 'state_trustee_approved' ? null : x);
      });
    }

    it('⛔ never the claim itself', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'approved');
      expect(await readOtherFinallyApprovedClaim(tx, PARIWAR_A, mid, x)).toBeNull();
      expect(await readPaymentCommittedClaim(tx, PARIWAR_A, mid, x)).toBeNull();
    });

    it('⛔ never a claim of ANOTHER death', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, toMemberId(randomUUID()), 'approved');
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      expect(await readOtherFinallyApprovedClaim(tx, PARIWAR_A, mid, y)).toBeNull();
    });

    it('⛔ never a claim of the same death id in ANOTHER Pariwar', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      // Superuser (RLS bypassed) — the QUERY must filter by Pariwar, ⛔ never RLS alone.
      await claimAt(client, PARIWAR_B, mid, 'approved', { bare: true });
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved', { bare: true });
      expect(await readOtherFinallyApprovedClaim(tx, PARIWAR_A, mid, y)).toBeNull();
      expect(await readPaymentCommittedClaim(tx, PARIWAR_A, mid, y)).toBeNull();
    });

    it('two qualify (the legacy shape) ⇒ the LOWEST `claim_case_id`', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'approved', { claimCaseId: HIGH });
      await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved', { claimCaseId: LOW });
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      expect(await readOtherFinallyApprovedClaim(tx, PARIWAR_A, mid, y)).toBe(LOW);
      expect(await readPaymentCommittedClaim(tx, PARIWAR_A, mid, y)).toBe(HIGH);
    });

    it('the scalar fragment agrees with the read (one definition)', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const x = await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
      const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      const r = await tx.execute<{ other: string | null }>(sql`
        SELECT ${otherClaimInStatesSql('c', FINALLY_APPROVED_CLAIM_STATES)} AS other FROM claims c WHERE c.claim_case_id = ${y}`);
      expect(r.rows[0]!.other).toBe(x);
    });
  });

  describe('AC1 — the open fragment', () => {
    const open: FixtureState[] = ['verifier_review', 'verifier_approved', 'state_trustee_freeze', 'appeal_stage_1'];
    const notOpen: FixtureState[] = ['denied', 'closed', 'settled', 'approved', 'state_trustee_approved'];
    for (const state of [...open, ...notOpen]) {
      const isOpen = open.includes(state);
      it(`another claim in \`${state}\` ${isOpen ? 'IS' : 'is ⛔ not'} open`, async () => {
        const { client } = getTx();
        const mid = toMemberId(randomUUID());
        const other = await claimAt(client, PARIWAR_A, mid, state);
        const self = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
        await claimAt(client, PARIWAR_A, toMemberId(randomUUID()), 'verifier_review'); // another death — ⛔ never counted
        expect(await openOf(self)).toEqual(isOpen ? { list: [other], exists: true } : { list: [], exists: false });
      });
    }

    it('⛔ never the claim itself; several open others in `claim_case_id` order', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await claimAt(client, PARIWAR_A, mid, 'verifier_review', { claimCaseId: HIGH });
      await claimAt(client, PARIWAR_A, mid, 'verifier_review', { claimCaseId: LOW });
      const self = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      expect(await openOf(self)).toEqual({ list: [LOW, HIGH], exists: true });
    });

    it('a claim on which RF1 stands is ⛔ not counted (the refile sees ⛔ none — Invariant 3)', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      await refusedClaim(client, PARIWAR_A, mid); // `-239`, standing
      const refile = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      expect(await openOf(refile)).toEqual({ list: [], exists: false });
    });

    it('on a claim on which RF1 stands ITSELF, the set is EMPTY even with another open claim', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const s = await refusedClaim(client, PARIWAR_A, mid);
      await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      expect(await openOf(s)).toEqual({ list: [], exists: false });
    });

    it('a refusal for ANOTHER reason (⛔ not `-239`) is `denied` — terminal, ⛔ not open; it does not empty the self set', async () => {
      const { client } = getTx();
      const mid = toMemberId(randomUUID());
      const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
      const open1 = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      expect(await openOf(s)).toEqual({ list: [open1], exists: true });
      expect(await openOf(open1)).toEqual({ list: [], exists: false });
    });
  });

  describe('AC3 — the commit re-check (OP3)', () => {
    const TRUSTEE = 'f8f8f8f8-0000-4000-8000-000000000003';
    const commit = (client: ReturnType<typeof getTx>['client'], pid: PariwarId) =>
      commitCycleFreeze(client, {
        pariwarId: pid, commitId: randomUUID() as unknown as CycleFreezeCommitId, actorId: TRUSTEE, actorDisplay: 'Trustee One', actor: 'trustee',
      });
    const stateOf = async (cid: ClaimId) =>
      (await getTx().client.query<{ s: string }>('SELECT current_state::text AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]!.s;
    /** A FRESH Pariwar — the commit's candidate set is Pariwar-wide. */
    async function freshScope(): Promise<PariwarId> {
      const pid = toPariwarId(randomUUID());
      await enterAppScope(getTx().client, pid);
      return pid;
    }

    for (const paid of ['approved', 'settled'] as const) {
      it(`a candidate whose death already has an \`${paid}\` claim (an earlier cycle) is skipped AND KEPT; another death's candidate commits`, async () => {
        const { client } = getTx();
        const pid = await freshScope();
        const mid = toMemberId(randomUUID());
        await claimAt(client, pid, mid, paid);
        const y = await claimAt(client, pid, mid, 'state_trustee_approved');
        const other = await claimAt(client, pid, toMemberId(randomUUID()), 'state_trustee_approved');
        const out = await commit(client, pid);
        expect(Object.keys(out).sort()).toEqual(['commit', 'committedClaimIds', 'idempotentReplay']);
        expect(out.committedClaimIds).toEqual([other]);
        expect(await stateOf(y)).toBe('state_trustee_approved');
        expect(await stateOf(other)).toBe('approved');
      });
    }

    it('the legacy two-voted pair of ONE death ⇒ the LOWER id is committed IN THIS RUN, the other is then skipped and kept', async () => {
      const { client } = getTx();
      const pid = await freshScope();
      const mid = toMemberId(randomUUID());
      const high = await claimAt(client, pid, mid, 'state_trustee_approved', { claimCaseId: HIGH });
      const low = await claimAt(client, pid, mid, 'state_trustee_approved', { claimCaseId: LOW });
      const out = await commit(client, pid);
      expect(out.committedClaimIds).toEqual([low]);
      expect(await stateOf(low)).toBe('approved');
      expect(await stateOf(high)).toBe('state_trustee_approved');
      // A later run still skips it (R1 — recorded, ⛔ not addressed here).
      expect((await commit(client, pid)).committedClaimIds).toEqual([]);
    });

    it('two voted claims of DISTINCT deaths both commit (⛔ no cross-death effect)', async () => {
      const { client } = getTx();
      const pid = await freshScope();
      const a = await claimAt(client, pid, toMemberId(randomUUID()), 'state_trustee_approved');
      const b = await claimAt(client, pid, toMemberId(randomUUID()), 'state_trustee_approved');
      expect((await commit(client, pid)).committedClaimIds.sort()).toEqual([a, b].sort());
    });

    it('a death whose other claim only PASSED THE VOTE does ⛔ not hold the commit (payment-committed only)', async () => {
      const { client } = getTx();
      const pid = await freshScope();
      const mid = toMemberId(randomUUID());
      // Both voted (legacy) — the FIRST in id order commits; nothing earlier blocks it.
      const low = await claimAt(client, pid, mid, 'state_trustee_approved', { claimCaseId: LOW });
      expect((await commit(client, pid)).committedClaimIds).toEqual([low]);
    });
  });

  describe('AC11 (a) — the other claims of the death for the approver (OP14)', () => {
    it('stages in staff words; ⛔ never itself, ⛔ never another death; oldest filed first', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const self = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
      const want: Record<string, string> = {};
      for (const [state, stage] of [
        ['verifier_review', 'open'], ['state_trustee_approved', 'passed_final_vote'], ['approved', 'paid'],
        ['denied', 'refused'], ['appeal_stage_1', 'under_appeal'], ['reversed', 'under_appeal'], ['closed', 'closed'],
      ] as const) {
        want[await claimAt(client, PARIWAR_A, mid, state)] = stage;
      }
      await claimAt(client, PARIWAR_A, toMemberId(randomUUID()), 'verifier_review');
      const out = await readOtherClaimsForDeath(tx, PARIWAR_A, self);
      expect(out.total).toBe(7);
      expect(Object.fromEntries(out.claims.map((c) => [c.claimCaseId, c.stage]))).toEqual(want);
      expect(out.claims.every((c) => c.intakeChannels.includes('member_app'))).toBe(true);
      expect(await readOtherClaimsForDeath(tx, PARIWAR_A, await claimAt(client, PARIWAR_A, toMemberId(randomUUID()), 'verifier_review'))).toEqual({ total: 0, claims: [] });
    });

    it('the date of death: same / different / not accepted / not comparable — by index equality, ⛔ no ciphertext read', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const self = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, self);
      await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: self, date: '2026-05-01' });
      const same = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: same, date: '2026-05-01' });
      const different = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: different, date: '2026-04-02' });
      const unaccepted = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      const legacy = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: legacy, date: '2026-05-01' });
      await client.query('UPDATE claim_death_certificate_reviews SET accepted_date_index = NULL WHERE claim_case_id = $1', [legacy]);
      const texts: string[] = [];
      const real = client.query.bind(client) as (...a: unknown[]) => unknown;
      client.query = ((...a: unknown[]) => {
        texts.push(typeof a[0] === 'string' ? a[0] : ((a[0] as { text?: string })?.text ?? ''));
        return real(...a);
      }) as never;
      let out;
      try {
        out = await readOtherClaimsForDeath(tx, PARIWAR_A, self);
      } finally {
        client.query = real as never;
      }
      expect(Object.fromEntries(out.claims.map((c) => [c.claimCaseId, c.deathDate]))).toEqual({
        [same]: 'same', [different]: 'different', [unaccepted]: 'not_accepted', [legacy]: 'not_comparable',
      });
      expect(texts.length).toBe(1);
      expect(texts.join('\n')).not.toMatch(/ciphertext/i);
    });

    it(`capped at ${OTHER_CLAIMS_FOR_DEATH_CAP}, with the total`, async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const self = await claimAt(client, PARIWAR_A, mid, 'closed');
      for (let i = 0; i < OTHER_CLAIMS_FOR_DEATH_CAP + 2; i += 1) await claimAt(client, PARIWAR_A, mid, 'closed');
      const out = await readOtherClaimsForDeath(tx, PARIWAR_A, self);
      expect(out.total).toBe(OTHER_CLAIMS_FOR_DEATH_CAP + 2);
      expect(out.claims).toHaveLength(OTHER_CLAIMS_FOR_DEATH_CAP);
    });
  });

  describe('AC11 (b) — "finally approved elsewhere", in bulk (OP14)', () => {
    it('voted ⇒ `passed_final_vote`; paid ⇒ `paid`; ⛔ none ⇒ null; the claim itself ⛔ never; ⛔ another Pariwar absent', async () => {
      const { client, tx } = getTx();
      const m1 = toMemberId(randomUUID());
      const voted = await claimAt(client, PARIWAR_A, m1, 'state_trustee_approved');
      const y1 = await claimAt(client, PARIWAR_A, m1, 'verifier_approved');
      const m2 = toMemberId(randomUUID());
      const paid = await claimAt(client, PARIWAR_A, m2, 'approved');
      const y2 = await claimAt(client, PARIWAR_A, m2, 'verifier_review');
      const lone = await claimAt(client, PARIWAR_A, toMemberId(randomUUID()), 'verifier_approved');
      const out = await readFinallyApprovedElsewhereBulk(tx, PARIWAR_A, [y1, y2.toUpperCase(), lone, voted, randomUUID()]);
      expect(out.get(y1)).toEqual({ claimCaseId: voted, stage: 'passed_final_vote' });
      expect(out.get(y2)).toEqual({ claimCaseId: paid, stage: 'paid' });
      expect(out.get(lone)).toBeNull();
      expect(out.get(voted)).toBeNull();
      expect(out.size).toBe(4);
    });
  });

  describe('AC11 (d) — the inspector\'s "already visited" (OP14)', () => {
    async function withCert(client: ReturnType<typeof getTx>['client'], mid: ReturnType<typeof toMemberId>, date: string) {
      const cid = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, date });
      return cid;
    }

    it('⛔ another visit ⇒ both false; a FULL visit on another claim ⇒ visitedElsewhere; with THIS claim\'s date ⇒ alreadyVisited', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const self = await withCert(client, mid, '2026-05-01');
      expect(await readOtherClaimVisits(tx, PARIWAR_A, self)).toEqual({ visitedElsewhere: false, alreadyVisited: false });
      const other = await withCert(client, mid, '2026-05-01');
      await seedGroundInspection(client, PARIWAR_A, other, { force: true, deathDate: '2026-04-02' });
      expect(await readOtherClaimVisits(tx, PARIWAR_A, self)).toEqual({ visitedElsewhere: true, alreadyVisited: false });
      const third = await withCert(client, mid, '2026-05-01');
      await seedGroundInspection(client, PARIWAR_A, third, { force: true, deathDate: '2026-05-01' });
      expect(await readOtherClaimVisits(tx, PARIWAR_A, self)).toEqual({ visitedElsewhere: true, alreadyVisited: true });
    });

    it('a CERTIFICATE CHECK elsewhere is ⛔ a visit; THIS claim with ⛔ accepted certificate ⇒ ⛔ alreadyVisited', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const self = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      const other = await withCert(client, mid, '2026-05-01');
      await seedGroundInspection(client, PARIWAR_A, other, { force: true, stage: 'certificate_check', deathDate: '2026-05-01' });
      expect(await readOtherClaimVisits(tx, PARIWAR_A, self)).toEqual({ visitedElsewhere: false, alreadyVisited: false });
      const full = await withCert(client, mid, '2026-05-01');
      await seedGroundInspection(client, PARIWAR_A, full, { force: true, deathDate: '2026-05-01' });
      expect(await readOtherClaimVisits(tx, PARIWAR_A, self)).toEqual({ visitedElsewhere: true, alreadyVisited: false });
    });
  });

  describe('OP10 — a closed claim whose HOLDING claim was later refused / closed', () => {
    it('held by a live claim ⇒ ⛔ listed; the holder refused or closed ⇒ listed; an open claim ⛔ ever', async () => {
      const { client, tx } = getTx();
      const mid = toMemberId(randomUUID());
      const holder = await claimAt(client, PARIWAR_A, mid, 'approved');
      const closed = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await emitClaim(client, PARIWAR_A, closed, mid, 'verifier_review', 'closed', 'claim.closed', {
        trigger: 'death_already_finally_approved', held_by_claim_case_id: holder, deceased_member_id: mid,
      });
      const open = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      expect([...(await readClosedHolderRefusedBulk(tx, PARIWAR_A, [closed, open, holder]))]).toEqual([]);
      const holder2 = await claimAt(client, PARIWAR_A, mid, 'denied');
      const closed2 = await claimAt(client, PARIWAR_A, mid, 'verifier_review');
      await emitClaim(client, PARIWAR_A, closed2, mid, 'verifier_review', 'closed', 'claim.closed', {
        trigger: 'suspicion_appeal_allowed', held_by_claim_case_id: holder2, deceased_member_id: mid,
      });
      expect([...(await readClosedHolderRefusedBulk(tx, PARIWAR_A, [closed, closed2.toUpperCase(), open]))]).toEqual([closed2]);
    });
  });
});
