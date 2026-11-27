// Migration 0219 — `claim_fee_bank_dates` and the two new `claim_membership_checks` columns: RLS + DB-level backstops
// (Story 6.39a, Task 1.2 / AC1; DL1, DL6).
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — ⛔ never inferred through the writer.
//
// ⭐ The load-bearing ones:
//   · ONE live record per claim (DL1) and the ONE-WAY supersession — a superseded bank date is never revived;
//   · only the supersession pair and the note are writable, for `twt_app` (the column grants) AND for the table owner
//     (the column-aware trigger) — a bank date, a reason or the payment it names is ⛔ never rewritten;
//   · the note scrub WORKS as `twt_app` (the UPDATE policy + the grant + the guard's omission — AC11's DB half);
//   · on `claim_membership_checks`: the REPLACED guard covers `fee_date_source` and `fee_bank_date_id` for the OWNER
//     (TR2 — the column grant alone hides the hole from twt_app); `'bank'` ⇒ an id; `'recorded'` WITH an id accepted
//     (DL6 — the earlier of the two dates, as answered at Task 0.2).
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

const TABLE = 'claim_fee_bank_dates';
const CHECKS = 'claim_membership_checks';

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
 * joining payment — RAW rows: this spec tests the TABLES, ⛔ the writers.
 */
async function seedClaimWithReviewAndPayment() {
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

type Seeded = Awaited<ReturnType<typeof seedClaimWithReviewAndPayment>>;

function record(s: Seeded, over: Partial<schema.ClaimFeeBankDateInsert> = {}): schema.ClaimFeeBankDateInsert {
  return {
    pariwarId: PARIWAR_A,
    claimCaseId: s.claimCaseId as never,
    deceasedMemberId: s.memberId as never,
    feeReceiptId: s.receiptId,
    bankCreditDate: '2026-03-01',
    reasonCode: 'recorded_late_by_member',
    noteCiphertext: 'enc:v1:note',
    decidedByActorId: randomUUID(),
    decidedByDisplay: 'Test Finance Officer',
    ...over,
  };
}

function check(s: Seeded, over: Partial<schema.ClaimMembershipCheckInsert> = {}): schema.ClaimMembershipCheckInsert {
  return {
    claimCaseId: s.claimCaseId as never,
    pariwarId: PARIWAR_A,
    deceasedMemberId: s.memberId as never,
    deathCertificateReviewId: s.reviewId,
    feeReceiptId: s.receiptId,
    feeOutcome: 'before_death',
    identityRequired: false,
    identityOutcome: 'not_required',
    identityReason: null,
    noteCiphertext: null,
    decidedByActorId: randomUUID(),
    decidedByDisplay: 'Test District Admin',
    ...over,
  };
}

/** Capture a rejection under a savepoint, so the next leg runs in a live transaction. */
async function refusal(s: Seeded, attempt: () => Promise<unknown>): Promise<unknown> {
  await s.client.query('SAVEPOINT leg');
  const err = await attempt().then(
    () => undefined,
    (e: unknown) => e,
  );
  await s.client.query('ROLLBACK TO SAVEPOINT leg');
  return err;
}

describe.skipIf(!hasDatabase)('migration 0219 — claim_fee_bank_dates: RLS + DB backstops', { timeout: 20000 }, () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
      [TABLE],
    );
    expect(rls.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });

  it('⛔ no FOR ALL / DELETE policy; exactly SELECT + INSERT + UPDATE', async () => {
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
    const s = await seedClaimWithReviewAndPayment();
    await s.tx.insert(schema.claimFeeBankDates).values(record(s));
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
    const s = await seedClaimWithReviewAndPayment();
    await expect(s.tx.insert(schema.claimFeeBankDates).values(record(s, { pariwarId: PARIWAR_B }))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '42501',
    );
  });

  it('every FOREIGN KEY refuses an orphan (23503)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const legs: [string, Partial<schema.ClaimFeeBankDateInsert>][] = [
      ['claim', { claimCaseId: randomUUID() as never }],
      ['payment', { feeReceiptId: randomUUID() as never }],
    ];
    for (const [label, over] of legs) {
      const err = await refusal(s, () => s.tx.insert(schema.claimFeeBankDates).values(record(s, over)));
      expect(pgCode(err), label).toBe('23503');
    }
  });

  it('⭐ every CHECK refuses by its OWN name (23514)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const legs: [string, string, Partial<schema.ClaimFeeBankDateInsert>][] = [
      ['an unknown reason', 'claim_fee_bank_dates_reason_code_check', { reasonCode: 'because' as never }],
      ['a blank display name', 'claim_fee_bank_dates_display_check', { decidedByDisplay: '   ' }],
      ['a blank note', 'claim_fee_bank_dates_note_check', { noteCiphertext: '  ' }],
      ['superseded with NO reason', 'claim_fee_bank_dates_supersession_coherence_check', { supersededAt: new Date() }],
      ['a reason with NO stamp', 'claim_fee_bank_dates_supersession_coherence_check', { supersededReason: 're_recorded' }],
      [
        'an unknown supersession reason',
        'claim_fee_bank_dates_supersession_coherence_check',
        { supersededAt: new Date(), supersededReason: 'because' as never },
      ],
    ];
    for (const [label, constraint, over] of legs) {
      const err = await refusal(s, () => s.tx.insert(schema.claimFeeBankDates).values(record(s, over)));
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(constraint);
    }
  });

  it('⛔ the note is NOT NULL (23502) — Q2 B: "with a reason"', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const err = await refusal(s, () =>
      s.client.query(
        `INSERT INTO ${TABLE} (pariwar_id, claim_case_id, deceased_member_id, fee_receipt_id, bank_credit_date, reason_code,
           decided_by_actor_id, decided_by_display) VALUES ($1, $2, $3, $4, '2026-03-01', 'other', 'a', 'A')`,
        [PARIWAR_A, s.claimCaseId, s.memberId, s.receiptId],
      ),
    );
    expect(pgCode(err)).toBe('23502');
  });

  it('every reason is accepted; the bank date round-trips as a CALENDAR date string (TR6)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    for (const reasonCode of schema.FEE_BANK_DATE_REASON_CODES) {
      await s.tx
        .insert(schema.claimFeeBankDates)
        .values(record(s, { reasonCode, supersededAt: new Date(), supersededReason: 're_recorded' }));
    }
    const [live] = await s.tx.insert(schema.claimFeeBankDates).values(record(s, { bankCreditDate: '2026-01-31' })).returning();
    expect(live!.bankCreditDate).toBe('2026-01-31');
    const rows = await s.client.query(`SELECT 1 FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(rows.rows).toHaveLength(schema.FEE_BANK_DATE_REASON_CODES.length + 1);
  });

  it('⭐ DL1 — at most ONE live record per claim (23505)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    await s.tx.insert(schema.claimFeeBankDates).values(record(s));
    await expect(s.tx.insert(schema.claimFeeBankDates).values(record(s))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23505' && pgConstraint(err) === 'claim_fee_bank_dates_one_live_per_claim_uq',
    );
  });

  it('⭐⭐ supersession is ONE-WAY: `superseded_at` back to NULL, or a re-stamp, is refused (23000); the note scrub still works', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    const byId = eq(schema.claimFeeBankDates.recordId, r!.recordId);
    await s.tx.update(schema.claimFeeBankDates).set({ supersededAt: new Date(), supersededReason: 're_recorded' }).where(byId);
    for (const [label, set] of [
      ['revived', { supersededAt: null, supersededReason: null }],
      ['re-stamped instant', { supersededAt: new Date(Date.now() + 86_400_000) }],
    ] as const) {
      const err = await refusal(s, () => s.tx.update(schema.claimFeeBankDates).set(set as never).where(byId));
      expect(pgCode(err), label).toBe('23000');
    }
    await s.tx.update(schema.claimFeeBankDates).set({ noteCiphertext: '[anonymized]' }).where(byId);
    const [row] = await s.tx.select().from(schema.claimFeeBankDates).where(byId);
    expect(row!.noteCiphertext).toBe('[anonymized]');
    expect(row!.supersededReason).toBe('re_recorded');
  });

  it('⛔ twt_app cannot UPDATE any column but the supersession pair and the note (column-level grants, 42501)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    const byId = eq(schema.claimFeeBankDates.recordId, r!.recordId);
    const u = (set: Partial<schema.ClaimFeeBankDateInsert>) => () => s.tx.update(schema.claimFeeBankDates).set(set).where(byId);
    const legs: [string, () => Promise<unknown>][] = [
      ['bank_credit_date (a bank date is never rewritten)', u({ bankCreditDate: '2020-01-01' })],
      ['reason_code', u({ reasonCode: 'other' })],
      ['fee_receipt_id', u({ feeReceiptId: randomUUID() as never })],
      ['deceased_member_id', u({ deceasedMemberId: randomUUID() as never })],
      ['claim_case_id', u({ claimCaseId: randomUUID() as never })],
      ['pariwar_id', u({ pariwarId: PARIWAR_B })],
      ['decided_by_actor_id', u({ decidedByActorId: 'someone-else' })],
      ['decided_by_display', u({ decidedByDisplay: 'Someone Else' })],
      ['decided_at', u({ decidedAt: new Date(0) })],
    ];
    for (const [label, attempt] of legs) {
      expect(pgCode(await refusal(s, attempt)), label).toBe('42501');
    }
  });

  it('⭐ twt_app CAN scrub the note — ONE row matched (the UPDATE policy), every other column unchanged', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    const scrubbed = await s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE record_id = $1`, [r!.recordId]);
    expect(scrubbed.rowCount).toBe(1);
    const [row] = await s.tx.select().from(schema.claimFeeBankDates).where(eq(schema.claimFeeBankDates.recordId, r!.recordId));
    expect(row).toEqual({ ...r!, noteCiphertext: '[anonymized]' });
  });

  it("⭐ the UPDATE policy FAILS CLOSED across tenants — another Pariwar's session (and an unset scope) scrubs and stamps ZERO rows, and the row is untouched (code review, second pass, K10)", async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    // ⚠ A statement with a WHERE on a column also needs the SELECT policy to expose the row, and that policy hides another
    // tenant's row ON ITS OWN — so those two prove the end-to-end behaviour but would stay green with the UPDATE policy
    // widened (mutation-checked: `ALTER POLICY … USING (true)` left them green). The statement with NO WHERE is decided by
    // the UPDATE policy's USING alone; the row is then read back as the owner, so the proof is the row, ⛔ a count.
    const scrubAll = () => s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]'`);
    const scrub = () => s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE record_id = $1`, [r!.recordId]);
    const stamp = () => s.client.query(`UPDATE ${TABLE} SET superseded_at = now(), superseded_reason = 're_recorded' WHERE record_id = $1`, [r!.recordId]);
    await enterAppScope(s.client, PARIWAR_B);
    await scrubAll();
    expect((await scrub()).rowCount).toBe(0);
    expect((await stamp()).rowCount).toBe(0);
    await enterAppRoleNoScope(s.client);
    await s.client.query("SET LOCAL app.pariwar_id = ''");
    expect((await scrubAll()).rowCount).toBe(0);
    expect((await scrub()).rowCount).toBe(0);
    expect((await stamp()).rowCount).toBe(0);
    await s.client.query('RESET ROLE'); // the Docker superuser — reads the row whatever the policies say
    const after = await s.client.query(`SELECT note_ciphertext, superseded_at, superseded_reason FROM ${TABLE} WHERE record_id = $1`, [r!.recordId]);
    expect(after.rows).toEqual([{ note_ciphertext: r!.noteCiphertext, superseded_at: null, superseded_reason: null }]);
    // The control: the OWNING Pariwar's session still matches the row, so a policy that matched nothing for everyone fails here.
    await enterAppScope(s.client, PARIWAR_A);
    expect((await scrub()).rowCount).toBe(1);
  });

  it('⛔ twt_app holds no DELETE (42501)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    await expect(
      s.tx.delete(schema.claimFeeBankDates).where(eq(schema.claimFeeBankDates.recordId, r!.recordId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ the append-only TRIGGER refuses the table OWNER too (23000) — and lets the stamp and the scrub through', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    await s.client.query('RESET ROLE'); // the Docker superuser — grants no longer protect the table
    const legs: [string, string][] = [
      ['DELETE', `DELETE FROM ${TABLE} WHERE record_id = $1`],
      ['UPDATE bank_credit_date', `UPDATE ${TABLE} SET bank_credit_date = bank_credit_date - 30 WHERE record_id = $1`],
      ['UPDATE reason_code', `UPDATE ${TABLE} SET reason_code = 'other' WHERE record_id = $1`],
      ['UPDATE fee_receipt_id', `UPDATE ${TABLE} SET fee_receipt_id = gen_random_uuid() WHERE record_id = $1`],
      ['UPDATE deceased_member_id', `UPDATE ${TABLE} SET deceased_member_id = gen_random_uuid() WHERE record_id = $1`],
      ['UPDATE claim_case_id', `UPDATE ${TABLE} SET claim_case_id = gen_random_uuid() WHERE record_id = $1`],
      ['UPDATE pariwar_id', `UPDATE ${TABLE} SET pariwar_id = gen_random_uuid() WHERE record_id = $1`],
      ['UPDATE record_id', `UPDATE ${TABLE} SET record_id = gen_random_uuid() WHERE record_id = $1`],
      ['UPDATE decided_by_actor_id', `UPDATE ${TABLE} SET decided_by_actor_id = 'x' WHERE record_id = $1`],
      ['UPDATE decided_by_display', `UPDATE ${TABLE} SET decided_by_display = 'Someone Else' WHERE record_id = $1`],
      ['UPDATE decided_at', `UPDATE ${TABLE} SET decided_at = decided_at - interval '1 day' WHERE record_id = $1`],
    ];
    for (const [label, text] of legs) {
      expect(pgCode(await refusal(s, () => s.client.query(text, [r!.recordId]))), label).toBe('23000');
    }
    await s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE record_id = $1`, [r!.recordId]);
    await s.client.query(`UPDATE ${TABLE} SET superseded_at = now(), superseded_reason = 're_recorded' WHERE record_id = $1`, [r!.recordId]);
    // ⭐ The one-way trigger binds the OWNER too: a superseded record is never revived.
    expect(
      pgCode(await refusal(s, () => s.client.query(`UPDATE ${TABLE} SET superseded_at = NULL, superseded_reason = NULL WHERE record_id = $1`, [r!.recordId]))),
    ).toBe('23000');
    const after = await s.client.query(`SELECT note_ciphertext, superseded_reason, bank_credit_date::text AS d FROM ${TABLE} WHERE record_id = $1`, [
      r!.recordId,
    ]);
    expect(after.rows[0]).toEqual({ note_ciphertext: '[anonymized]', superseded_reason: 're_recorded', d: '2026-03-01' });
  });

  it('⛔ TRUNCATE is refused (23000)', { timeout: 60000 }, async () => {
    const { client } = getTx();
    await client.query('SAVEPOINT tr');
    // All-or-nothing NOWAIT: `claim_membership_checks` references this table (`fee_bank_date_id`), so the CASCADE set is both.
    expect(await lockTruncateSetNowait(client, TABLE, { attempts: 300 })).toEqual([TABLE, CHECKS]);
    const err = await client.query(`TRUNCATE ${TABLE} CASCADE`).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(pgCode(err)).toBe('23000');
    // ⚠ The CASCADE set includes `claim_membership_checks`, whose own guard also raises 23000 — so the MESSAGE says whose it was.
    expect(String((err as Error).message)).toMatch(/claim_fee_bank_dates is append-only/);
    await client.query('ROLLBACK TO SAVEPOINT tr');
  });

  it('each ON DELETE cascade still removes the row (pg_trigger_depth > 1): the claim, and the payment', async () => {
    const s = await seedClaimWithReviewAndPayment();
    await s.tx.insert(schema.claimFeeBankDates).values(record(s));
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

describe.skipIf(!hasDatabase)('migration 0219 — claim_membership_checks gains fee_date_source + fee_bank_date_id', { timeout: 20000 }, () => {
  setupLiveDb();

  it('a check written WITHOUT the new columns reads `recorded` + NULL (the DEFAULT keeps every 6.39 seeder valid — TR1)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s)).returning();
    expect(c!.feeDateSource).toBe('recorded');
    expect(c!.feeBankDateId).toBeNull();
  });

  it("⭐ `'bank'` with a NULL id is refused by the coherence CHECK; an unknown source by its own CHECK (23514)", async () => {
    const s = await seedClaimWithReviewAndPayment();
    const legs: [string, string, Partial<schema.ClaimMembershipCheckInsert>][] = [
      ["'bank' with no record", 'claim_membership_checks_fee_bank_date_coherence_check', { feeDateSource: 'bank', feeBankDateId: null }],
      ['an unknown source', 'claim_membership_checks_fee_date_source_check', { feeDateSource: 'statement' as never }],
    ];
    for (const [label, constraint, over] of legs) {
      const err = await refusal(s, () => s.tx.insert(schema.claimMembershipChecks).values(check(s, over)));
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(constraint);
    }
  });

  it("⭐ DL6 (the earlier of the two dates) — `'recorded'` WITH a record id is ACCEPTED; `'bank'` with one too; an orphan id is refused (23503)", async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    const [a] = await s.tx
      .insert(schema.claimMembershipChecks)
      .values(check(s, { feeDateSource: 'recorded', feeBankDateId: r!.recordId, supersededAt: new Date(), supersededReason: 're_checked' }))
      .returning();
    expect([a!.feeDateSource, a!.feeBankDateId]).toEqual(['recorded', r!.recordId]);
    const [b] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, { feeDateSource: 'bank', feeBankDateId: r!.recordId })).returning();
    expect([b!.feeDateSource, b!.feeBankDateId]).toEqual(['bank', r!.recordId]);
    const err = await refusal(s, () =>
      s.tx
        .insert(schema.claimMembershipChecks)
        .values(check(s, { feeDateSource: 'bank', feeBankDateId: randomUUID() as never, supersededAt: new Date(), supersededReason: 're_checked' })),
    );
    expect(pgCode(err)).toBe('23503');
  });

  it('⛔ twt_app cannot UPDATE either new column (no column grant, 42501)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    // ⚠ Each leg changes ONE column (code review 2026-11-27): the check already names the record, so setting `'bank'` touches
    // `fee_date_source` alone; a NULL-id check is the other leg's.
    const [named] = await s.tx
      .insert(schema.claimMembershipChecks)
      .values(check(s, { feeDateSource: 'recorded', feeBankDateId: r!.recordId, supersededAt: new Date(), supersededReason: 're_checked' }))
      .returning();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s)).returning();
    for (const [label, id, set] of [
      ['fee_date_source', named!.checkId, { feeDateSource: 'bank' as const }],
      ['fee_bank_date_id', c!.checkId, { feeBankDateId: r!.recordId }],
    ] as const) {
      const byId = eq(schema.claimMembershipChecks.checkId, id);
      const err = await refusal(s, () => s.tx.update(schema.claimMembershipChecks).set(set).where(byId));
      expect(pgCode(err), label).toBe('42501');
    }
  });

  it('⭐⭐ TR2 — the REPLACED guard refuses the table OWNER an UPDATE of either new column (23000); the old chain still holds', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    const [c] = await s.tx.insert(schema.claimMembershipChecks).values(check(s, { feeOutcome: 'after_death' })).returning();
    // ⚠ Code review 2026-11-27 — the `fee_date_source` leg changes THAT column alone (the check already names the record, so the
    // one-way CHECK allows `'bank'`): drop the column from the guard and THIS leg goes green — ⛔ masked by `fee_bank_date_id`.
    const [named] = await s.tx
      .insert(schema.claimMembershipChecks)
      .values(check(s, { feeDateSource: 'recorded', feeBankDateId: r!.recordId, supersededAt: new Date(), supersededReason: 're_checked' }))
      .returning();
    await s.client.query('RESET ROLE');
    const legs: [string, string, unknown[]][] = [
      ['UPDATE fee_date_source', `UPDATE ${CHECKS} SET fee_date_source = 'bank' WHERE check_id = $1`, [named!.checkId]],
      ['UPDATE fee_bank_date_id', `UPDATE ${CHECKS} SET fee_bank_date_id = $2 WHERE check_id = $1`, [c!.checkId, r!.recordId]],
      ['UPDATE fee_outcome (0212 chain)', `UPDATE ${CHECKS} SET fee_outcome = 'before_death' WHERE check_id = $1`, [c!.checkId]],
      ['UPDATE identity_outcome (0212 chain)', `UPDATE ${CHECKS} SET identity_outcome = 'confirmed', identity_required = true WHERE check_id = $1`, [c!.checkId]],
    ];
    for (const [label, text, params] of legs) {
      expect(pgCode(await refusal(s, () => s.client.query(text, params))), label).toBe('23000');
    }
    // The stamp and the scrub still pass the replaced guard.
    await s.client.query(`UPDATE ${CHECKS} SET note_ciphertext = 'enc:v1:x' WHERE check_id = $1`, [c!.checkId]);
    await s.client.query(`UPDATE ${CHECKS} SET superseded_at = now(), superseded_reason = 're_checked' WHERE check_id = $1`, [c!.checkId]);
  });

  it('⭐⭐ TR2 / TR13 — the catalog pin: EVERY column of each table but the three granted ones is named in its guard function', async () => {
    const { client } = getTx();
    for (const [table, fn] of [
      [CHECKS, 'claim_membership_checks_reject_mutation'],
      [TABLE, 'claim_fee_bank_dates_reject_mutation'],
    ] as const) {
      const cols = await client.query<{ attname: string }>(
        `SELECT attname FROM pg_attribute WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped`,
        [table],
      );
      const def = (await client.query<{ d: string }>(`SELECT pg_get_functiondef($1::regproc) AS d`, [fn])).rows[0]!.d;
      const frozen = cols.rows.map((r) => r.attname).filter((c) => !['superseded_at', 'superseded_reason', 'note_ciphertext'].includes(c));
      expect(frozen.length, table).toBeGreaterThan(8);
      for (const col of frozen) expect(def.includes(`NEW.${col} IS DISTINCT FROM OLD.${col}`), `${fn} is missing ${col}`).toBe(true);
      for (const granted of ['superseded_at', 'superseded_reason', 'note_ciphertext']) {
        expect(def.includes(`NEW.${granted} IS DISTINCT FROM`), `${fn} freezes the granted ${granted}`).toBe(false);
      }
    }
  });

  it('⭐ the CHECK vocabularies match the TS constants BOTH ways (`pg_get_constraintdef`)', async () => {
    const { client } = getTx();
    const def = async (name: string) =>
      (await client.query<{ d: string }>(`SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = $1`, [name])).rows[0]!.d;
    const quoted = (d: string) => [...d.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
    expect(quoted(await def('claim_fee_bank_dates_reason_code_check'))).toEqual([...schema.FEE_BANK_DATE_REASON_CODES].sort());
    expect(quoted(await def('claim_membership_checks_fee_date_source_check'))).toEqual([...schema.MEMBERSHIP_CHECK_FEE_DATE_SOURCES].sort());
    expect(quoted(await def('claim_fee_bank_dates_supersession_coherence_check'))).toEqual([...schema.FEE_BANK_DATE_SUPERSESSION_REASONS].sort());
  });

  it('⭐ the FK is COMPOSITE: a check can name a bank-date record of its OWN claim only (23503 for another claim\'s)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const other = await seedClaimWithReviewAndPayment();
    const [theirs] = await other.tx.insert(schema.claimFeeBankDates).values(record(other)).returning();
    const err = await refusal(s, () =>
      s.tx.insert(schema.claimMembershipChecks).values(check(s, { feeDateSource: 'bank', feeBankDateId: theirs!.recordId })),
    );
    expect(pgCode(err)).toBe('23503');
    expect(pgConstraint(err)).toBe('claim_membership_checks_fee_bank_date_id_fk');
  });

  it('the three-deep cascade: deleting the payment removes the bank-date record AND the check that names it (pg_trigger_depth > 1)', async () => {
    const s = await seedClaimWithReviewAndPayment();
    const [r] = await s.tx.insert(schema.claimFeeBankDates).values(record(s)).returning();
    // ⚠ The check names ANOTHER payment (fix-diff review 2026-11-27): the check's own `fee_receipt_id` FK cascades from a payment
    // too, so naming the SAME one would delete the check directly and the leg would pass with the bank-date path broken. Here the
    // check can go ONLY by payment → bank-date record → check.
    const [otherReceipt] = await s.tx
      .insert(schema.vyawasthaShulkReceipts)
      .values({
        memberId: s.memberId as never, pariwarId: PARIWAR_A, tr: `TR-${randomUUID()}`, utr: `UTR-${randomUUID()}`,
        amountInr: 100, paymentMethod: 'upi', validThrough: new Date('2099-01-01T00:00:00Z'),
      })
      .returning();
    const [c] = await s.tx
      .insert(schema.claimMembershipChecks)
      .values(check(s, { feeReceiptId: otherReceipt!.receiptId, feeDateSource: 'bank', feeBankDateId: r!.recordId }))
      .returning();
    await s.client.query('RESET ROLE');
    await s.client.query('DELETE FROM vyawastha_shulk_receipts WHERE receipt_id = $1', [s.receiptId]);
    expect((await s.client.query(`SELECT 1 FROM ${TABLE} WHERE record_id = $1`, [r!.recordId])).rows).toEqual([]);
    expect((await s.client.query(`SELECT 1 FROM ${CHECKS} WHERE check_id = $1`, [c!.checkId])).rows).toEqual([]);
  });
});
