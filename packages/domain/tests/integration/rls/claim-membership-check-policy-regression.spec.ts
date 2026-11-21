// Migration 0212 — `claim_membership_checks`: RLS + DB-level backstops (Story 6.39, Task 1.2 / AC1; DL1).
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — ⛔ never inferred through the writer. Each backstop the writer reasons
// from in prose ("the index is the truth, the typed error is the interface") gets its own red here.
//
// ⭐ The load-bearing ones:
//   · ONE live check per claim (DL1) and the ONE-WAY supersession — a superseded PASS is never revived;
//   · only the supersession pair and the note are writable, for `twt_app` (the column grants) AND for the table
//     owner (the column-aware trigger) — a fee outcome or an identity outcome is ⛔ never rewritten;
//   · the note scrub WORKS as `twt_app` (the UPDATE policy + the grant + the guard's omission — AC14's DB half);
//   · the coherence CHECKs: `not_required` ⇔ not required; `not_confirmed` ⇔ a reason AND a note.
//
// Live DB only (the story's own container); each test runs in its own rolled-back transaction.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  lockTruncateSetNowait,
  seedClaim,
  seedDeathCertificate,
  seedMember,
} from '../_helpers.js';

const TABLE = 'claim_membership_checks';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** The violated constraint's NAME — a CHECK leg must be refused by ITS check, ⛔ not a neighbour's. */
function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint?: string }).constraint ?? (err as { cause?: { constraint?: string } }).cause?.constraint;
}

/**
 * Seed a member + a claim (as the superuser), enter PARIWAR_A's app scope, then an accepted certificate review and a
 * joining receipt — RAW rows: this spec tests the TABLE, ⛔ the writers.
 */
async function seedClaimWithReviewAndReceipt() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
  const claimCaseId = await seedClaim(tx, PARIWAR_A, {
    deceasedMemberId: memberId,
    currentState: 'verification_in_progress',
  });
  await enterAppScope(client, PARIWAR_A);
  const cert = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId });
  const [review] = await tx
    .insert(schema.claimDeathCertificateReviews)
    .values({
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A,
      deceasedMemberId: memberId as never,
      uploadId: cert.uploadId as never,
      verdict: 'accepted',
      rejectionReason: null,
      acceptedDateCiphertext: 'enc:v1:date',
      noteCiphertext: 'enc:v1:note',
      decidedByActorId: randomUUID(),
      decidedByDisplay: 'Test District Admin',
    })
    .returning();
  const [receipt] = await tx
    .insert(schema.vyawasthaShulkReceipts)
    .values({
      memberId: memberId as never,
      pariwarId: PARIWAR_A,
      tr: `TR-${randomUUID()}`,
      utr: `UTR-${randomUUID()}`,
      amountInr: 100,
      paymentMethod: 'upi',
      validThrough: new Date('2099-01-01T00:00:00Z'),
    })
    .returning();
  return { tx, client, memberId, claimCaseId, reviewId: review!.reviewId, receiptId: receipt!.receiptId };
}

type Seeded = Awaited<ReturnType<typeof seedClaimWithReviewAndReceipt>>;

function check(s: Seeded, over: Partial<schema.ClaimMembershipCheckInsert> = {}): schema.ClaimMembershipCheckInsert {
  return {
    claimCaseId: s.claimCaseId as never,
    pariwarId: PARIWAR_A,
    deceasedMemberId: s.memberId as never,
    deathCertificateReviewId: s.reviewId,
    feeReceiptId: s.receiptId,
    feeOutcome: 'before_death',
    identityRequired: true,
    identityOutcome: 'confirmed',
    identityReason: null,
    noteCiphertext: null,
    decidedByActorId: randomUUID(),
    decidedByDisplay: 'Test District Admin',
    ...over,
  };
}

const notConfirmed = {
  identityOutcome: 'not_confirmed' as const,
  identityReason: 'name_differs' as const,
  noteCiphertext: 'enc:v1:note',
};

describe.skipIf(!hasDatabase)('migration 0212 — claim_membership_checks: RLS + DB backstops', { timeout: 20000 }, () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
      [TABLE],
    );
    expect(rls.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });

  it('⛔ no FOR ALL / DELETE policy; exactly SELECT + INSERT + UPDATE (the UPDATE leg is what lets the RTBF scrub match a row)', async () => {
    const { client } = getTx();
    const pols = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE tablename = $1`, [TABLE]);
    expect(pols.rows.map((p) => p.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
  });

  it('twt_app holds exactly SELECT + INSERT on the table and UPDATE on the three granted columns', async () => {
    const { client } = getTx();
    const table = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants WHERE table_name = $1 AND grantee = 'twt_app'`,
      [TABLE],
    );
    expect(table.rows.map((r) => r.privilege_type).sort()).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.role_column_grants
        WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = 'UPDATE'`,
      [TABLE],
    );
    expect(cols.rows.map((r) => r.column_name).sort()).toEqual(['note_ciphertext', 'superseded_at', 'superseded_reason']);
  });

  it('⭐ visible in-scope, ZERO rows from another Pariwar’s session, ZERO rows with an unset scope', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    await s.tx.insert(schema.claimMembershipChecks).values(check(s));
    const count = () =>
      s.client
        .query<{ n: number }>(`SELECT count(*) AS n FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId])
        .then((r) => Number(r.rows[0]!.n));
    expect(await count()).toBe(1);
    await enterAppScope(s.client, PARIWAR_B);
    expect(await count()).toBe(0);
    await enterAppRoleNoScope(s.client);
    await s.client.query("SET LOCAL app.pariwar_id = ''");
    expect(await count()).toBe(0);
  });

  it("⛔ a row stamped with ANOTHER Pariwar's id is refused by the WITH CHECK (42501)", async () => {
    const s = await seedClaimWithReviewAndReceipt();
    await expect(s.tx.insert(schema.claimMembershipChecks).values(check(s, { pariwarId: PARIWAR_B }))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '42501',
    );
  });

  it('every FOREIGN KEY refuses an orphan (23503)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const legs: [string, Partial<schema.ClaimMembershipCheckInsert>][] = [
      ['claim', { claimCaseId: randomUUID() as never }],
      ['review', { deathCertificateReviewId: randomUUID() as never }],
      ['receipt', { feeReceiptId: randomUUID() as never }],
    ];
    for (const [label, over] of legs) {
      await s.client.query('SAVEPOINT fk');
      const err = await s.tx
        .insert(schema.claimMembershipChecks)
        .values(check(s, over))
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgCode(err), label).toBe('23503');
      await s.client.query('ROLLBACK TO SAVEPOINT fk');
    }
  });

  it('⭐ every CHECK refuses by its OWN name (23514), including the NULL-in-CHECK trap on the reason', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const legs: [string, string, Partial<schema.ClaimMembershipCheckInsert>][] = [
      ['an unknown fee outcome', 'claim_membership_checks_fee_outcome_check', { feeOutcome: 'unknown' as never }],
      ['an unknown identity outcome', 'claim_membership_checks_identity_outcome_check', { identityOutcome: 'maybe' as never }],
      ['a blank display name', 'claim_membership_checks_display_check', { decidedByDisplay: '   ' }],
      ['required, yet recorded not_required', 'claim_membership_checks_identity_required_coherence_check', { identityRequired: true, identityOutcome: 'not_required' }],
      ['not required, yet judged', 'claim_membership_checks_identity_required_coherence_check', { identityRequired: false, identityOutcome: 'confirmed' }],
      ['not_confirmed with NO reason (the NULL trap)', 'claim_membership_checks_identity_reason_coherence_check', { ...notConfirmed, identityReason: null }],
      ['not_confirmed with an unknown reason', 'claim_membership_checks_identity_reason_coherence_check', { ...notConfirmed, identityReason: 'because' as never }],
      ['not_confirmed with NO note', 'claim_membership_checks_identity_reason_coherence_check', { ...notConfirmed, noteCiphertext: null }],
      ['confirmed WITH a reason', 'claim_membership_checks_identity_reason_coherence_check', { identityReason: 'other' }],
      ['superseded with NO reason', 'claim_membership_checks_supersession_coherence_check', { supersededAt: new Date() }],
      ['a reason with NO stamp', 'claim_membership_checks_supersession_coherence_check', { supersededReason: 're_checked' }],
      ['an unknown supersession reason', 'claim_membership_checks_supersession_coherence_check', { supersededAt: new Date(), supersededReason: 'because' as never }],
    ];
    for (const [label, constraint, over] of legs) {
      await s.client.query('SAVEPOINT ck');
      const err = await s.tx
        .insert(schema.claimMembershipChecks)
        .values(check(s, over))
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(constraint);
      await s.client.query('ROLLBACK TO SAVEPOINT ck');
    }
  });

  it('each well-formed shape is accepted: not_required, confirmed (with and without a note), not_confirmed (each reason)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const shapes: Partial<schema.ClaimMembershipCheckInsert>[] = [
      { identityRequired: false, identityOutcome: 'not_required' },
      { identityOutcome: 'confirmed' },
      { identityOutcome: 'confirmed', noteCiphertext: 'enc:v1:note' },
      ...schema.MEMBERSHIP_CHECK_IDENTITY_REASONS.map((identityReason) => ({ ...notConfirmed, identityReason })),
      ...schema.MEMBERSHIP_CHECK_FEE_OUTCOMES.map((feeOutcome) => ({ feeOutcome })),
    ];
    for (const over of shapes) {
      // Each is superseded at birth so the one-live index does not interfere with the next.
      await s.tx
        .insert(schema.claimMembershipChecks)
        .values(check(s, { ...over, supersededAt: new Date(), supersededReason: 're_checked' }));
    }
    const rows = await s.client.query(`SELECT 1 FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(rows.rows).toHaveLength(shapes.length);
  });

  it('⭐ DL1 — at most ONE live check per claim (23505)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    await s.tx.insert(schema.claimMembershipChecks).values(check(s));
    await expect(s.tx.insert(schema.claimMembershipChecks).values(check(s))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23505' && pgConstraint(err) === 'claim_membership_checks_one_live_per_claim_uq',
    );
  });

  it('a live check may be superseded, and a new live check then inserted (the writer’s path)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const [first] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, notConfirmed)).returning();
    await s.tx
      .update(schema.claimMembershipChecks)
      .set({ supersededAt: new Date(), supersededReason: 're_checked' })
      .where(eq(schema.claimMembershipChecks.checkId, first!.checkId));
    await s.tx.insert(schema.claimMembershipChecks).values(check(s));
    const live = await s.client.query(`SELECT 1 FROM ${TABLE} WHERE claim_case_id = $1 AND superseded_at IS NULL`, [s.claimCaseId]);
    expect(live.rows).toHaveLength(1);
  });

  it('⭐⭐ supersession is ONE-WAY: `superseded_at` back to NULL, or a re-stamp, is refused (23000); the note scrub still works', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, notConfirmed)).returning();
    const byId = eq(schema.claimMembershipChecks.checkId, c!.checkId);
    await s.tx.update(schema.claimMembershipChecks).set({ supersededAt: new Date(), supersededReason: 're_checked' }).where(byId);
    for (const [label, set] of [
      ['revived', { supersededAt: null, supersededReason: null }],
      ['re-stamped instant', { supersededAt: new Date(Date.now() + 86_400_000) }],
    ] as const) {
      await s.client.query('SAVEPOINT ow');
      const err = await s.tx
        .update(schema.claimMembershipChecks)
        .set(set as never)
        .where(byId)
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgCode(err), label).toBe('23000');
      await s.client.query('ROLLBACK TO SAVEPOINT ow');
    }
    await s.tx.update(schema.claimMembershipChecks).set({ noteCiphertext: '[anonymized]' }).where(byId);
    const [row] = await s.tx.select().from(schema.claimMembershipChecks).where(byId);
    expect(row!.noteCiphertext).toBe('[anonymized]');
    expect(row!.supersededReason).toBe('re_checked');
  });

  it('⛔ twt_app cannot UPDATE any column but the supersession pair and the note (column-level grants, 42501)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, { feeOutcome: 'after_death' })).returning();
    const byId = eq(schema.claimMembershipChecks.checkId, c!.checkId);
    const u = (set: Partial<schema.ClaimMembershipCheckInsert>) => () => s.tx.update(schema.claimMembershipChecks).set(set).where(byId);
    const legs: [string, () => Promise<unknown>][] = [
      ['fee_outcome (after_death can never be rewritten to a pass)', u({ feeOutcome: 'before_death' })],
      ['identity_outcome', u({ identityOutcome: 'not_confirmed' })],
      ['identity_required', u({ identityRequired: false })],
      ['identity_reason', u({ identityReason: 'other' })],
      ['death_certificate_review_id (the currency token)', u({ deathCertificateReviewId: randomUUID() as never })],
      ['fee_receipt_id', u({ feeReceiptId: randomUUID() as never })],
      ['deceased_member_id', u({ deceasedMemberId: randomUUID() as never })],
      ['claim_case_id', u({ claimCaseId: randomUUID() as never })],
      ['pariwar_id', u({ pariwarId: PARIWAR_B })],
      ['decided_by_actor_id', u({ decidedByActorId: 'someone-else' })],
      ['decided_by_display', u({ decidedByDisplay: 'Someone Else' })],
      ['decided_at', u({ decidedAt: new Date(0) })],
    ];
    for (const [label, attempt] of legs) {
      await s.client.query('SAVEPOINT g');
      const err = await attempt().then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('42501');
      await s.client.query('ROLLBACK TO SAVEPOINT g');
    }
  });

  it('⭐ twt_app CAN scrub the note — ONE row matched (the UPDATE policy), every other column unchanged (the DPDPA-RTBF leg, DL14)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, notConfirmed)).returning();
    const scrubbed = await s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE check_id = $1`, [c!.checkId]);
    expect(scrubbed.rowCount).toBe(1);
    const [row] = await s.tx.select().from(schema.claimMembershipChecks).where(eq(schema.claimMembershipChecks.checkId, c!.checkId));
    expect(row).toEqual({ ...c!, noteCiphertext: '[anonymized]' });
  });

  it('⛔ twt_app holds no DELETE (42501)', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s)).returning();
    await expect(
      s.tx.delete(schema.claimMembershipChecks).where(eq(schema.claimMembershipChecks.checkId, c!.checkId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ the append-only TRIGGER refuses the table OWNER too (23000) — and lets the stamp and the scrub through', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, { ...notConfirmed, feeOutcome: 'after_death' })).returning();
    await s.client.query('RESET ROLE'); // the Docker superuser — grants no longer protect the table
    const legs: [string, string][] = [
      ['DELETE', `DELETE FROM ${TABLE} WHERE check_id = $1`],
      ['UPDATE fee_outcome', `UPDATE ${TABLE} SET fee_outcome = 'before_death' WHERE check_id = $1`],
      ['UPDATE identity_outcome', `UPDATE ${TABLE} SET identity_outcome = 'confirmed', identity_reason = NULL WHERE check_id = $1`],
      ['UPDATE identity_reason', `UPDATE ${TABLE} SET identity_reason = 'other' WHERE check_id = $1`],
      ['UPDATE identity_required', `UPDATE ${TABLE} SET identity_required = false, identity_outcome = 'not_required', identity_reason = NULL WHERE check_id = $1`],
      ['UPDATE death_certificate_review_id', `UPDATE ${TABLE} SET death_certificate_review_id = gen_random_uuid() WHERE check_id = $1`],
      ['UPDATE fee_receipt_id', `UPDATE ${TABLE} SET fee_receipt_id = gen_random_uuid() WHERE check_id = $1`],
      ['UPDATE deceased_member_id', `UPDATE ${TABLE} SET deceased_member_id = gen_random_uuid() WHERE check_id = $1`],
      ['UPDATE decided_by_actor_id', `UPDATE ${TABLE} SET decided_by_actor_id = 'x' WHERE check_id = $1`],
      ['UPDATE decided_by_display', `UPDATE ${TABLE} SET decided_by_display = 'Someone Else' WHERE check_id = $1`],
      ['UPDATE decided_at', `UPDATE ${TABLE} SET decided_at = decided_at - interval '1 day' WHERE check_id = $1`],
    ];
    for (const [label, text] of legs) {
      await s.client.query('SAVEPOINT t');
      const err = await s.client.query(text, [c!.checkId]).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('23000');
      await s.client.query('ROLLBACK TO SAVEPOINT t');
    }
    await s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE check_id = $1`, [c!.checkId]);
    await s.client.query(`UPDATE ${TABLE} SET superseded_at = now(), superseded_reason = 're_checked' WHERE check_id = $1`, [c!.checkId]);
    const after = await s.client.query(`SELECT note_ciphertext, superseded_reason, fee_outcome FROM ${TABLE} WHERE check_id = $1`, [c!.checkId]);
    expect(after.rows[0]).toEqual({ note_ciphertext: '[anonymized]', superseded_reason: 're_checked', fee_outcome: 'after_death' });
  });

  it('⛔ TRUNCATE is refused (23000)', { timeout: 60000 }, async () => {
    const { client } = getTx();
    await client.query('SAVEPOINT tr');
    // All-or-nothing NOWAIT (`lockTruncateSetNowait`): this side ⛔ never waits while holding part of the set. The
    // table is a leaf (nothing references it), so the set is the table alone.
    expect(await lockTruncateSetNowait(client, TABLE, { attempts: 300 })).toEqual([TABLE]);
    const err = await client.query(`TRUNCATE ${TABLE} CASCADE`).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(pgCode(err)).toBe('23000');
    await client.query('ROLLBACK TO SAVEPOINT tr');
  });

  it('each ON DELETE cascade still removes the row (pg_trigger_depth > 1): the claim, and the receipt’s member', async () => {
    const s = await seedClaimWithReviewAndReceipt();
    await s.tx.insert(schema.claimMembershipChecks).values(check(s));
    await s.client.query('RESET ROLE');
    await s.client.query('SAVEPOINT c');
    await s.client.query('DELETE FROM claims WHERE claim_case_id = $1', [s.claimCaseId]);
    expect((await s.client.query(`SELECT 1 FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId])).rows).toEqual([]);
    await s.client.query('ROLLBACK TO SAVEPOINT c');
    expect((await s.client.query(`SELECT 1 FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId])).rows).toHaveLength(1);
    await s.client.query('DELETE FROM vyawastha_shulk_receipts WHERE receipt_id = $1', [s.receiptId]);
    expect((await s.client.query(`SELECT 1 FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId])).rows).toEqual([]);
  });
});
