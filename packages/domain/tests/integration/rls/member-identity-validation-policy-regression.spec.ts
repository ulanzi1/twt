// Migration 0218 — `member_identity_validations`: RLS + DB-level backstops (Story 3.13, Task 1 / AC2; DL1). A copy of
// 6.39's `claim-membership-check-policy-regression.spec.ts` (the live-row mechanism is mirrored from 0212, F10a).
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — ⛔ never inferred through the writer.
//
// ⭐ The load-bearing ones:
//   · ONE live act per member (DL1) and the ONE-WAY supersession — a superseded `confirmed` is never revived;
//   · only the supersession pair and the note are writable, for `twt_app` (the column grants) AND for the table owner
//     (the column-aware trigger) — an outcome, a reason or a document kind is ⛔ never rewritten;
//   · the note scrub WORKS as `twt_app` (the UPDATE policy + the grant + the guard's omission — AC13's DB half);
//   · the coherence CHECKs: `confirmed` ⇔ evidence + document, ⛔ reason; `not_confirmed` ⇔ a reason AND a note, and
//     what was seen follows the reason.
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
  seedMember,
} from '../_helpers.js';

const TABLE = 'member_identity_validations';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** The violated constraint's NAME — a CHECK leg must be refused by ITS check, ⛔ not a neighbour's. */
function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint?: string }).constraint ?? (err as { cause?: { constraint?: string } }).cause?.constraint;
}

/** Seed a member (as the superuser), then enter PARIWAR_A's app scope — RAW rows: this spec tests the TABLE. */
async function seedLockInMember() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
  await enterAppScope(client, PARIWAR_A);
  return { tx, client, memberId };
}

type Seeded = Awaited<ReturnType<typeof seedLockInMember>>;

function act(s: Seeded, over: Partial<schema.MemberIdentityValidationInsert> = {}): schema.MemberIdentityValidationInsert {
  return {
    pariwarId: PARIWAR_A,
    memberId: s.memberId as never,
    outcome: 'confirmed',
    evidenceKind: 'photo_id_in_person',
    documentKind: 'voter_id',
    notConfirmedReason: null,
    noteCiphertext: null,
    kycProfileUpdatedAt: new Date('2026-11-01T00:00:00Z'),
    decidedByActorId: randomUUID(),
    decidedByDisplay: 'Test District Admin',
    ...over,
  };
}

const notConfirmed = {
  outcome: 'not_confirmed' as const,
  notConfirmedReason: 'details_do_not_match' as const,
  noteCiphertext: 'enc:v1:note',
};

describe.skipIf(!hasDatabase)('migration 0218 — member_identity_validations: RLS + DB backstops', { timeout: 20000 }, () => {
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

  it('⭐ AC9 — ⛔ column is named like a number, an Aadhaar or an image (N5)', async () => {
    const { client } = getTx();
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [TABLE],
    );
    expect(cols.rows.length).toBeGreaterThan(10); // the control: the query reads the table
    expect(cols.rows.map((r) => r.column_name).filter((c) => /number|aadhaar|image|photo|upload/.test(c))).toEqual([]);
  });

  it('⭐ visible in-scope, ZERO rows from another Pariwar’s session, ZERO rows with an unset scope', async () => {
    const s = await seedLockInMember();
    await s.tx.insert(schema.memberIdentityValidations).values(act(s));
    const count = () =>
      s.client
        .query<{ n: number }>(`SELECT count(*) AS n FROM ${TABLE} WHERE member_id = $1`, [s.memberId])
        .then((r) => Number(r.rows[0]!.n));
    expect(await count()).toBe(1);
    await enterAppScope(s.client, PARIWAR_B);
    expect(await count()).toBe(0);
    await enterAppRoleNoScope(s.client);
    await s.client.query("SET LOCAL app.pariwar_id = ''");
    expect(await count()).toBe(0);
  });

  it("⛔ a row stamped with ANOTHER Pariwar's id is refused by the WITH CHECK (42501)", async () => {
    const s = await seedLockInMember();
    await expect(s.tx.insert(schema.memberIdentityValidations).values(act(s, { pariwarId: PARIWAR_B }))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '42501',
    );
  });

  it('the member FOREIGN KEY refuses an orphan (23503)', async () => {
    const s = await seedLockInMember();
    await expect(
      s.tx.insert(schema.memberIdentityValidations).values(act(s, { memberId: randomUUID() as never })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23503');
  });

  it('⭐ every CHECK refuses by its OWN name (23514), including the NULL-in-CHECK traps', async () => {
    const s = await seedLockInMember();
    const coherence = 'member_identity_validations_outcome_coherence_check';
    const legs: [string, string, Partial<schema.MemberIdentityValidationInsert>][] = [
      ['an unknown outcome', 'member_identity_validations_outcome_check', { outcome: 'maybe' as never }],
      ['an unknown evidence kind', 'member_identity_validations_evidence_kind_check', { evidenceKind: 'uploaded_documents' as never }],
      ['an unknown document kind', 'member_identity_validations_document_kind_check', { documentKind: 'ration_card' as never }],
      ['a blank display name', 'member_identity_validations_display_check', { decidedByDisplay: '   ' }],
      ['confirmed with NO evidence kind (the NULL trap)', coherence, { evidenceKind: null }],
      ['confirmed with NO document kind (the NULL trap)', coherence, { documentKind: null }],
      ['confirmed WITH a reason', coherence, { notConfirmedReason: 'details_do_not_match' }],
      ['not_confirmed with NO reason (the NULL trap)', coherence, { ...notConfirmed, notConfirmedReason: null }],
      ['not_confirmed with an unknown reason', coherence, { ...notConfirmed, notConfirmedReason: 'because' as never }],
      ['not_confirmed with NO note', coherence, { ...notConfirmed, noteCiphertext: null }],
      ['a mismatch with NO document kind', coherence, { ...notConfirmed, documentKind: null }],
      ['a mismatch with NO evidence kind', coherence, { ...notConfirmed, notConfirmedReason: 'photo_does_not_match', evidenceKind: null }],
      ['no ID shown, yet a document kind', coherence, { ...notConfirmed, notConfirmedReason: 'no_document_shown' }],
      ['no ID shown with NO evidence kind', coherence, { ...notConfirmed, notConfirmedReason: 'no_document_shown', evidenceKind: null, documentKind: null }],
      ['not reached, yet an evidence kind', coherence, { ...notConfirmed, notConfirmedReason: 'member_not_reached', documentKind: null }],
      ['not reached, yet a document kind', coherence, { ...notConfirmed, notConfirmedReason: 'member_not_reached', evidenceKind: null }],
      ['superseded with NO reason', 'member_identity_validations_supersession_coherence_check', { supersededAt: new Date() }],
      ['a reason with NO stamp', 'member_identity_validations_supersession_coherence_check', { supersededReason: 're_checked' }],
      ['an unknown supersession reason', 'member_identity_validations_supersession_coherence_check', { supersededAt: new Date(), supersededReason: 'because' as never }],
    ];
    for (const [label, constraint, over] of legs) {
      await s.client.query('SAVEPOINT ck');
      const err = await s.tx
        .insert(schema.memberIdentityValidations)
        .values(act(s, over))
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(constraint);
      await s.client.query('ROLLBACK TO SAVEPOINT ck');
    }
  });

  it('each well-formed shape is accepted: confirmed (each evidence × document kind, with and without a note), not_confirmed (each reason)', async () => {
    const s = await seedLockInMember();
    const shapes: Partial<schema.MemberIdentityValidationInsert>[] = [
      ...schema.IDENTITY_VALIDATION_EVIDENCE_KINDS.flatMap((evidenceKind) =>
        schema.IDENTITY_VALIDATION_DOCUMENT_KINDS.map((documentKind) => ({ evidenceKind, documentKind })),
      ),
      { noteCiphertext: 'enc:v1:note' },
      { ...notConfirmed, notConfirmedReason: 'details_do_not_match' },
      { ...notConfirmed, notConfirmedReason: 'photo_does_not_match' },
      { ...notConfirmed, notConfirmedReason: 'no_document_shown', documentKind: null },
      { ...notConfirmed, notConfirmedReason: 'member_not_reached', evidenceKind: null, documentKind: null },
    ];
    // Every reason is covered by a shape above (the vocabulary cannot grow without this list).
    expect(new Set(shapes.map((x) => x.notConfirmedReason).filter(Boolean))).toEqual(
      new Set(schema.IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS),
    );
    for (const over of shapes) {
      // Each is superseded at birth so the one-live index does not interfere with the next.
      await s.tx
        .insert(schema.memberIdentityValidations)
        .values(act(s, { ...over, supersededAt: new Date(), supersededReason: 're_checked' }));
    }
    const rows = await s.client.query(`SELECT 1 FROM ${TABLE} WHERE member_id = $1`, [s.memberId]);
    expect(rows.rows).toHaveLength(shapes.length);
  });

  it('⭐ DL1 — at most ONE live act per member (23505)', async () => {
    const s = await seedLockInMember();
    await s.tx.insert(schema.memberIdentityValidations).values(act(s, notConfirmed));
    await expect(s.tx.insert(schema.memberIdentityValidations).values(act(s))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23505' && pgConstraint(err) === 'member_identity_validations_one_live_per_member_uq',
    );
  });

  it('a live act may be superseded, and a new live act then inserted (the writer’s path)', async () => {
    const s = await seedLockInMember();
    const [first] = await s.tx.insert(schema.memberIdentityValidations).values(act(s, notConfirmed)).returning();
    await s.tx
      .update(schema.memberIdentityValidations)
      .set({ supersededAt: new Date(), supersededReason: 're_checked' })
      .where(eq(schema.memberIdentityValidations.validationId, first!.validationId));
    await s.tx.insert(schema.memberIdentityValidations).values(act(s));
    const live = await s.client.query(`SELECT outcome FROM ${TABLE} WHERE member_id = $1 AND superseded_at IS NULL`, [s.memberId]);
    expect(live.rows).toEqual([{ outcome: 'confirmed' }]);
  });

  it('⭐⭐ supersession is ONE-WAY: `superseded_at` back to NULL, or a re-stamp, is refused (23000); the note scrub still works', async () => {
    const s = await seedLockInMember();
    const [c] = await s.tx.insert(schema.memberIdentityValidations).values(act(s, notConfirmed)).returning();
    const byId = eq(schema.memberIdentityValidations.validationId, c!.validationId);
    await s.tx.update(schema.memberIdentityValidations).set({ supersededAt: new Date(), supersededReason: 're_checked' }).where(byId);
    for (const [label, set] of [
      ['revived', { supersededAt: null, supersededReason: null }],
      ['re-stamped instant', { supersededAt: new Date(Date.now() + 86_400_000) }],
    ] as const) {
      await s.client.query('SAVEPOINT ow');
      const err = await s.tx
        .update(schema.memberIdentityValidations)
        .set(set as never)
        .where(byId)
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgCode(err), label).toBe('23000');
      await s.client.query('ROLLBACK TO SAVEPOINT ow');
    }
    await s.tx.update(schema.memberIdentityValidations).set({ noteCiphertext: '[anonymized]' }).where(byId);
    const [row] = await s.tx.select().from(schema.memberIdentityValidations).where(byId);
    expect(row!.noteCiphertext).toBe('[anonymized]');
    expect(row!.supersededReason).toBe('re_checked');
  });

  it('⛔ twt_app cannot UPDATE any column but the supersession pair and the note (column-level grants, 42501)', async () => {
    const s = await seedLockInMember();
    const [c] = await s.tx.insert(schema.memberIdentityValidations).values(act(s, notConfirmed)).returning();
    const byId = eq(schema.memberIdentityValidations.validationId, c!.validationId);
    const u = (set: Partial<schema.MemberIdentityValidationInsert>) => () =>
      s.tx.update(schema.memberIdentityValidations).set(set).where(byId);
    const legs: [string, () => Promise<unknown>][] = [
      ['outcome (a not_confirmed can never be rewritten to a confirmed)', u({ outcome: 'confirmed', notConfirmedReason: null })],
      ['evidence_kind', u({ evidenceKind: 'photo_id_video_call' })],
      ['document_kind', u({ documentKind: 'passport' })],
      ['not_confirmed_reason', u({ notConfirmedReason: 'photo_does_not_match' })],
      ['kyc_profile_updated_at', u({ kycProfileUpdatedAt: new Date(0) })],
      ['member_id', u({ memberId: randomUUID() as never })],
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
    const s = await seedLockInMember();
    const [c] = await s.tx.insert(schema.memberIdentityValidations).values(act(s, notConfirmed)).returning();
    const scrubbed = await s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE validation_id = $1`, [
      c!.validationId,
    ]);
    expect(scrubbed.rowCount).toBe(1);
    const [row] = await s.tx
      .select()
      .from(schema.memberIdentityValidations)
      .where(eq(schema.memberIdentityValidations.validationId, c!.validationId));
    expect(row).toEqual({ ...c!, noteCiphertext: '[anonymized]' });
  });

  it('⛔ twt_app holds no DELETE (42501)', async () => {
    const s = await seedLockInMember();
    const [c] = await s.tx.insert(schema.memberIdentityValidations).values(act(s)).returning();
    await expect(
      s.tx.delete(schema.memberIdentityValidations).where(eq(schema.memberIdentityValidations.validationId, c!.validationId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ the append-only TRIGGER refuses the table OWNER too (23000) — and lets the stamp and the scrub through', async () => {
    const s = await seedLockInMember();
    const [c] = await s.tx.insert(schema.memberIdentityValidations).values(act(s, notConfirmed)).returning();
    await s.client.query('RESET ROLE'); // the Docker superuser — grants no longer protect the table
    const legs: [string, string][] = [
      ['DELETE', `DELETE FROM ${TABLE} WHERE validation_id = $1`],
      ['UPDATE outcome', `UPDATE ${TABLE} SET outcome = 'confirmed', not_confirmed_reason = NULL WHERE validation_id = $1`],
      ['UPDATE evidence_kind', `UPDATE ${TABLE} SET evidence_kind = 'photo_id_video_call' WHERE validation_id = $1`],
      ['UPDATE document_kind', `UPDATE ${TABLE} SET document_kind = 'passport' WHERE validation_id = $1`],
      ['UPDATE not_confirmed_reason', `UPDATE ${TABLE} SET not_confirmed_reason = 'photo_does_not_match' WHERE validation_id = $1`],
      ['UPDATE kyc_profile_updated_at', `UPDATE ${TABLE} SET kyc_profile_updated_at = now() WHERE validation_id = $1`],
      ['UPDATE member_id', `UPDATE ${TABLE} SET member_id = gen_random_uuid() WHERE validation_id = $1`],
      ['UPDATE pariwar_id', `UPDATE ${TABLE} SET pariwar_id = gen_random_uuid() WHERE validation_id = $1`],
      ['UPDATE decided_by_actor_id', `UPDATE ${TABLE} SET decided_by_actor_id = 'x' WHERE validation_id = $1`],
      ['UPDATE decided_by_display', `UPDATE ${TABLE} SET decided_by_display = 'Someone Else' WHERE validation_id = $1`],
      ['UPDATE decided_at', `UPDATE ${TABLE} SET decided_at = decided_at - interval '1 day' WHERE validation_id = $1`],
      ['UPDATE validation_id', `UPDATE ${TABLE} SET validation_id = gen_random_uuid() WHERE validation_id = $1`],
    ];
    for (const [label, text] of legs) {
      await s.client.query('SAVEPOINT t');
      const err = await s.client.query(text, [c!.validationId]).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('23000');
      await s.client.query('ROLLBACK TO SAVEPOINT t');
    }
    await s.client.query(`UPDATE ${TABLE} SET note_ciphertext = '[anonymized]' WHERE validation_id = $1`, [c!.validationId]);
    await s.client.query(`UPDATE ${TABLE} SET superseded_at = now(), superseded_reason = 're_checked' WHERE validation_id = $1`, [
      c!.validationId,
    ]);
    const after = await s.client.query(
      `SELECT note_ciphertext, superseded_reason, outcome FROM ${TABLE} WHERE validation_id = $1`,
      [c!.validationId],
    );
    expect(after.rows[0]).toEqual({ note_ciphertext: '[anonymized]', superseded_reason: 're_checked', outcome: 'not_confirmed' });
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

  it('the ON DELETE cascade from `members` still removes the row (pg_trigger_depth > 1)', async () => {
    const s = await seedLockInMember();
    await s.tx.insert(schema.memberIdentityValidations).values(act(s));
    await s.client.query('RESET ROLE');
    expect((await s.client.query(`SELECT 1 FROM ${TABLE} WHERE member_id = $1`, [s.memberId])).rows).toHaveLength(1);
    await s.client.query('DELETE FROM members WHERE member_id = $1', [s.memberId]);
    expect((await s.client.query(`SELECT 1 FROM ${TABLE} WHERE member_id = $1`, [s.memberId])).rows).toEqual([]);
  });
});
