// Story 6.28 — "one payment per death", live DB (:5433). `2026-10-11-318` Q1 A, `2026-10-11-319` OP1.
//
//   AC1 — one definition (OP1): the two thin reads never return the claim itself, a claim of another death or another
//         Pariwar, and return the LOWEST id when (legacy) two qualify; the open fragment excludes terminal claims, finally
//         approved claims and every claim on which RF1 stands, and is EMPTY on a claim on which RF1 stands itself.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  otherClaimInStatesSql,
  otherOpenClaimForDeathExistsSql,
  otherOpenClaimsForDeathSql,
  readOtherFinallyApprovedClaim,
  readPaymentCommittedClaim,
  FINALLY_APPROVED_CLAIM_STATES,
} from '../../../src/claim/index.js';
import { memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B } from '../_helpers.js';
import { claimAt, type FixtureState } from './_one-payment-fixtures.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const LOW = '00000000-0000-4000-8000-0000000000a1';
const HIGH = 'ffffffff-ffff-4fff-8fff-0000000000a2';

describe.skipIf(!hasDatabase)('Story 6.28 — one payment per death: OP1 (:5433)', { timeout: 20000 }, () => {
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
});
