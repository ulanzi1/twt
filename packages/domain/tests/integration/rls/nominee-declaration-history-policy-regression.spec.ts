// Migration 0119 — the nominee declaration HISTORY tables' RLS + DB-level backstops (Story 6.20,
// Task 1; D1, D4, D7, D13; checklist family 5).
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — ⛔ never inferred through a higher-level accessor (family 5:
// *"never only inferred through higher-level tests"*). Every write path in `nominee/` and `claim/`
// reasons from these backstops in prose — "the index is the backstop, the typed error is the interface"
// — so each one gets its own red here: drop it and a test goes red, even though every accessor-level
// spec would stay green.
//
// ⭐ The load-bearing ones:
//   · the APPEND-ONLY trigger (invariant 2): a direct DELETE and a non-ciphertext UPDATE are refused for
//     EVERY role, the table owner included — while the `members` cascade and the RTBF scrub still work;
//   · the `(member_id, rank, version_no)` UNIQUE (the D3 race backstop);
//   · the tombstone coherence CHECK (T4 — a vacated rank can ⛔ never claim a mobile);
//   · ONE live determination per claim (D4) and ONE open correction per claim + rank (D7);
//   · the two-DIFFERENT-approvers CHECK (D7) and the `other`-forecloses CHECK (`-237` cl.2).
//
// Live DB only (`twt-test-pg :5433`); each test runs in its own rolled-back transaction.

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
  seedClaim,
  seedMember,
} from '../_helpers.js';

const TABLES = [
  'member_nominee_versions',
  'nominee_determinations',
  'nominee_determination_items',
  'nominee_corrections',
  'claim_nominee_findings',
] as const;

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

const at = new Date('2026-03-10T06:00:00.000Z');

/** A raw DECLARED version row, bypassing the writer — this file tests the DB, not the write path. */
function declared(memberId: string, pariwarId: string, over: Partial<schema.MemberNomineeVersionInsert> = {}) {
  return {
    memberId: memberId as never,
    pariwarId: pariwarId as never,
    rank: 1,
    versionNo: 1,
    declarationId: randomUUID(),
    kind: 'declared' as const,
    source: 'member' as const,
    nameCiphertext: 'enc:v1:name',
    relationship: 'spouse',
    mobileCiphertext: 'enc:v1:mobile',
    addressCiphertext: null,
    splitPct: 100,
    recordedAt: at,
    effectiveAt: at,
    ...over,
  };
}

function determination(claimCaseId: string, memberId: string, over: Partial<schema.NomineeDeterminationInsert> = {}) {
  return {
    claimCaseId: claimCaseId as never,
    pariwarId: PARIWAR_A,
    deceasedMemberId: memberId as never,
    certificateDateCiphertext: 'enc:v1:date',
    noteCiphertext: 'enc:v1:note',
    decidedByActorId: randomUUID(),
    decidedByDisplay: 'Test District Admin',
    ...over,
  };
}

function correction(claimCaseId: string, memberId: string, targetVersionId: string, over: Partial<schema.NomineeCorrectionInsert> = {}) {
  return {
    claimCaseId: claimCaseId as never,
    pariwarId: PARIWAR_A,
    memberId: memberId as never,
    rank: 1,
    targetVersionId: targetVersionId as never,
    proposedNameCiphertext: 'enc:v1:pname',
    proposedRelationship: 'spouse',
    proposedMobileCiphertext: 'enc:v1:pmobile',
    raisedVia: 'helpline' as const,
    raisedByActorId: randomUUID(),
    raiseNoteCiphertext: 'enc:v1:raise',
    step: 'da_pending' as const,
    ...over,
  };
}

/** Seed a member + a claim on them (as the superuser), then enter PARIWAR_A's app scope. */
async function seedMemberAndClaim() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
  const claimCaseId = await seedClaim(tx, PARIWAR_A, {
    deceasedMemberId: memberId,
    currentState: 'verification_in_progress',
  });
  await enterAppScope(client, PARIWAR_A);
  return { tx, client, memberId, claimCaseId };
}

async function insertVersion(memberId: string, over: Partial<schema.MemberNomineeVersionInsert> = {}) {
  const { tx } = getTx();
  const [row] = await tx
    .insert(schema.memberNomineeVersions)
    .values(declared(memberId, PARIWAR_A, over))
    .returning();
  return row!;
}

describe.skipIf(!hasDatabase)('migration 0119 — nominee declaration history: RLS + DB backstops', { timeout: 20000 }, () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled on all five tables (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1)`,
      [TABLES],
    );
    expect(rls.rows.map((r) => r.relname).sort()).toEqual([...TABLES].sort());
    for (const row of rls.rows) {
      expect(row.relrowsecurity, row.relname).toBe(true);
      // ⛔ FORCE, ⛔ not merely ENABLE: without it the table owner bypasses every policy.
      expect(row.relforcerowsecurity, row.relname).toBe(true);
    }
  });

  it('⛔ no table carries a FOR ALL policy (a DELETE leg on an append-only record)', async () => {
    const { client } = getTx();
    const pols = await client.query<{ tablename: string; cmd: string }>(
      `SELECT tablename, cmd FROM pg_policies WHERE tablename = ANY($1)`,
      [TABLES],
    );
    expect(pols.rows.length).toBeGreaterThanOrEqual(TABLES.length * 2);
    expect(pols.rows.filter((p) => p.cmd === 'ALL' || p.cmd === 'DELETE')).toEqual([]);
  });

  it('an UNSET scope reads zero version rows (the Story 1.6 closed-failure construct)', async () => {
    const { tx, client, memberId } = await seedMemberAndClaim();
    await insertVersion(memberId);
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    expect(await tx.select().from(schema.memberNomineeVersions)).toEqual([]);
  });

  it("⛔ a Pariwar cannot read ANOTHER Pariwar's versions (cross-tenant SELECT)", async () => {
    const { tx, client, memberId } = await seedMemberAndClaim();
    await insertVersion(memberId);
    await enterAppScope(client, PARIWAR_B);
    expect(
      await tx.select().from(schema.memberNomineeVersions).where(eq(schema.memberNomineeVersions.memberId, memberId as never)),
    ).toEqual([]);
  });

  it("⛔ a Pariwar cannot WRITE another Pariwar's version (the RLS withCheck negative, 42501)", async () => {
    const { tx, memberId } = await seedMemberAndClaim();
    await expect(
      tx.insert(schema.memberNomineeVersions).values(declared(memberId, PARIWAR_B)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it("⛔ a Pariwar cannot write another Pariwar's determination / correction / finding (42501)", async () => {
    const { tx, client, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    for (const attempt of [
      () => tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId, { pariwarId: PARIWAR_B })),
      () => tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, v.versionId, { pariwarId: PARIWAR_B })),
      () =>
        tx.insert(schema.claimNomineeFindings).values({
          findingId: randomUUID() as never,
          claimCaseId: claimCaseId as never,
          pariwarId: PARIWAR_B,
          kind: 'member_found_innocent',
          recordedByActorId: randomUUID(),
          recordedByDisplay: 'Investigator',
        }),
    ]) {
      await client.query('SAVEPOINT x');
      await expect(attempt()).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
      await client.query('ROLLBACK TO SAVEPOINT x');
    }
  });

  it('⛔ twt_app cannot UPDATE a non-ciphertext version column (column-level grant, 42501)', async () => {
    const { tx, memberId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await expect(
      tx
        .update(schema.memberNomineeVersions)
        .set({ relationship: 'son' })
        .where(eq(schema.memberNomineeVersions.versionId, v.versionId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('twt_app CAN scrub the three ciphertext columns (the DPDPA-RTBF leg, D11)', async () => {
    const { tx, memberId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId, { addressCiphertext: 'enc:v1:addr' });
    await tx
      .update(schema.memberNomineeVersions)
      .set({ nameCiphertext: '[anonymized]', mobileCiphertext: '[anonymized]', addressCiphertext: null })
      .where(eq(schema.memberNomineeVersions.versionId, v.versionId));
    const [row] = await tx
      .select()
      .from(schema.memberNomineeVersions)
      .where(eq(schema.memberNomineeVersions.versionId, v.versionId));
    expect(row?.nameCiphertext).toBe('[anonymized]');
    expect(row?.addressCiphertext).toBeNull();
  });

  it('⛔ twt_app holds no DELETE on a version (42501)', async () => {
    const { tx, memberId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await expect(
      tx.delete(schema.memberNomineeVersions).where(eq(schema.memberNomineeVersions.versionId, v.versionId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ the append-only TRIGGER refuses the table OWNER too: direct DELETE and non-ciphertext UPDATE (23000)', async () => {
    const { client, memberId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await client.query('RESET ROLE'); // the Docker superuser — grants no longer protect the table
    await client.query('SAVEPOINT x');
    await expect(
      client.query('DELETE FROM member_nominee_versions WHERE version_id = $1', [v.versionId]),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23000');
    await client.query('ROLLBACK TO SAVEPOINT x');
    await expect(
      client.query("UPDATE member_nominee_versions SET effective_at = effective_at - interval '1 day' WHERE version_id = $1", [
        v.versionId,
      ]),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23000');
  });

  it('⛔ TRUNCATE is refused (23000)', async () => {
    const { client } = getTx();
    await expect(client.query('TRUNCATE member_nominee_versions CASCADE')).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23000',
    );
  });

  it('the `members` ON DELETE cascade still removes a hard-deleted member\'s versions (pg_trigger_depth > 1)', async () => {
    const { client, memberId } = await seedMemberAndClaim();
    await insertVersion(memberId);
    await client.query('RESET ROLE');
    await client.query('DELETE FROM claims WHERE deceased_member_id = $1', [memberId]);
    await client.query('DELETE FROM members WHERE member_id = $1', [memberId]);
    const left = await client.query('SELECT 1 FROM member_nominee_versions WHERE member_id = $1', [memberId]);
    expect(left.rows).toEqual([]);
  });

  it('⭐ (member_id, rank, version_no) is UNIQUE — the D3 race backstop (23505)', async () => {
    const { memberId } = await seedMemberAndClaim();
    await insertVersion(memberId, { versionNo: 1 });
    await expect(insertVersion(memberId, { versionNo: 1 })).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23505',
    );
  });

  it('the SAME version_no on the OTHER rank is fine (the chain is per rank)', async () => {
    const { memberId } = await seedMemberAndClaim();
    await insertVersion(memberId, { rank: 1, versionNo: 1 });
    const second = await insertVersion(memberId, { rank: 2, versionNo: 1, splitPct: 25 });
    expect(second.rank).toBe(2);
  });

  it('⭐ a VACATED tombstone can carry NO nominee field (T4 — never a mobile, 23514)', async () => {
    const { memberId } = await seedMemberAndClaim();
    await expect(
      insertVersion(memberId, { kind: 'vacated', relationship: null, splitPct: null, nameCiphertext: null }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('a well-formed tombstone is accepted', async () => {
    const { memberId } = await seedMemberAndClaim();
    const row = await insertVersion(memberId, {
      rank: 2,
      kind: 'vacated',
      nameCiphertext: null,
      relationship: null,
      mobileCiphertext: null,
      splitPct: null,
    });
    expect(row.kind).toBe('vacated');
  });

  it('⛔ a DECLARED version without a mobile is refused (23514)', async () => {
    const { memberId } = await seedMemberAndClaim();
    await expect(insertVersion(memberId, { mobileCiphertext: null })).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23514',
    );
  });

  it('⛔ a correction version must name the version it corrects (23514)', async () => {
    const { memberId } = await seedMemberAndClaim();
    await expect(insertVersion(memberId, { source: 'correction', correctsVersionId: null })).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23514',
    );
  });

  it("⛔ a member's own version must have effective_at = recorded_at (invariant 5's other half, 23514)", async () => {
    const { memberId } = await seedMemberAndClaim();
    await expect(
      insertVersion(memberId, { effectiveAt: new Date(at.getTime() - 86_400_000) }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('a correction version MAY carry an earlier inherited effective_at (invariant 5)', async () => {
    const { memberId } = await seedMemberAndClaim();
    const target = await insertVersion(memberId);
    const corr = await insertVersion(memberId, {
      versionNo: 2,
      source: 'correction',
      correctsVersionId: target.versionId,
      recordedAt: new Date(at.getTime() + 30 * 86_400_000),
      effectiveAt: target.effectiveAt,
    });
    expect(corr.effectiveAt.toISOString()).toBe(target.effectiveAt.toISOString());
  });

  it('⭐ at most ONE live determination per claim (D4, 23505)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    await tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId));
    await expect(
      tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('⛔ a superseded determination must carry its reason (23514)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    await expect(
      tx
        .insert(schema.nomineeDeterminations)
        .values(determination(claimCaseId, memberId, { supersededAt: new Date() })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⛔ a determination with a blank display name is refused (23514)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    await expect(
      tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId, { decidedByDisplay: '  ' })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⛔ twt_app cannot rewrite a determination’s watermark (column-level grant, 42501)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const [d] = await tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId)).returning();
    await expect(
      tx
        .update(schema.nomineeDeterminations)
        .set({ watermarkRank1VersionNo: 9 })
        .where(eq(schema.nomineeDeterminations.determinationId, d!.determinationId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⛔ an item mark outside stands | discarded is refused (23514)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    const [d] = await tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId)).returning();
    await expect(
      tx.insert(schema.nomineeDeterminationItems).values({
        determinationId: d!.determinationId,
        versionId: v.versionId,
        pariwarId: PARIWAR_A,
        mark: 'maybe' as never,
      }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⭐ ONE open correction per claim + rank (D7, 23505)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, v.versionId));
    await expect(
      tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, v.versionId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('⭐ ⛔ a proposed relationship of `other` is refused at the DB (`-237` cl.2 backstop, 23514)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await expect(
      tx
        .insert(schema.nomineeCorrections)
        .values(correction(claimCaseId, memberId, v.versionId, { proposedRelationship: 'other' })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⭐ ⛔ the SAME person cannot approve both steps (D7 backstop, 23514)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    const same = randomUUID();
    const decided = new Date();
    await expect(
      tx.insert(schema.nomineeCorrections).values(
        correction(claimCaseId, memberId, v.versionId, {
          step: 'applied',
          daActorId: same,
          daDisplay: 'A',
          daNoteCiphertext: 'enc:v1:n',
          daDecidedAt: decided,
          paActorId: same,
          paDisplay: 'A',
          paNoteCiphertext: 'enc:v1:n',
          paDecidedAt: decided,
          appliedVersionId: v.versionId,
        }),
      ),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⛔ a step with its decision columns missing is refused (the step coherence CHECK, 23514)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await expect(
      tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, v.versionId, { step: 'pa_pending' })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⛔ a DECLINED correction must say WHICH step declined it (the NULL-in-CHECK trap, 23514)', async () => {
    // ⚠ `declined_at_step = 'district_admin'` with a NULL value is NULL, and a CHECK treats NULL as
    // PASSING — this exact shape let three CHECKs in the first draft of 0119 accept malformed rows.
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    await expect(
      tx.insert(schema.nomineeCorrections).values(
        correction(claimCaseId, memberId, v.versionId, {
          step: 'declined',
          daActorId: randomUUID(),
          daDisplay: 'DA',
          daNoteCiphertext: 'enc:v1:n',
          daDecidedAt: new Date(),
        }),
      ),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
  });

  it('⛔ twt_app cannot rewrite a raised correction’s proposal target (column-level grant, 42501)', async () => {
    const { tx, memberId, claimCaseId } = await seedMemberAndClaim();
    const v = await insertVersion(memberId);
    const [c] = await tx
      .insert(schema.nomineeCorrections)
      .values(correction(claimCaseId, memberId, v.versionId))
      .returning();
    await expect(
      tx
        .update(schema.nomineeCorrections)
        .set({ rank: 2 })
        .where(eq(schema.nomineeCorrections.correctionId, c!.correctionId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⛔ a finding’s rank must match its kind (23514) and ONE innocence finding per claim (23505)', async () => {
    const { tx, client, claimCaseId } = await seedMemberAndClaim();
    const base = {
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A,
      recordedByActorId: randomUUID(),
      recordedByDisplay: 'Investigator',
    };
    await client.query('SAVEPOINT x');
    await expect(
      tx.insert(schema.claimNomineeFindings).values({ ...base, findingId: randomUUID() as never, kind: 'nominee_disqualified' }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23514');
    await client.query('ROLLBACK TO SAVEPOINT x');
    await tx
      .insert(schema.claimNomineeFindings)
      .values({ ...base, findingId: randomUUID() as never, kind: 'member_found_innocent' });
    await expect(
      tx
        .insert(schema.claimNomineeFindings)
        .values({ ...base, findingId: randomUUID() as never, kind: 'member_found_innocent' }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });
});
