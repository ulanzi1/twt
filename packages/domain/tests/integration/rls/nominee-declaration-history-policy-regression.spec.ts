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
//   · the two-DIFFERENT-approvers CHECK (D7) and the proposed-`other` CHECK — the DB backstop of an
//     ENGINEERING READING of `-237` cl.2 (⛔ not a ratified rule; BigDev 2026-09-24);
//   · (migration 0121) a determination's SUPERSESSION is ONE-WAY — a superseded row is never revived.
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

/** The violated constraint's NAME — a CHECK leg must be refused by ITS check, ⛔ not a neighbour's. */
function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint?: string }).constraint ?? (err as { cause?: { constraint?: string } }).cause?.constraint;
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
    expect(pols.rows.filter((p) => p.cmd === 'ALL' || p.cmd === 'DELETE')).toEqual([]);
    // ⭐ PER TABLE, exactly (code review 2026-09-24): an aggregate floor let one table with ⛔ no policy
    // hide behind another's extras.
    const byTable = new Map<string, string[]>();
    for (const p of pols.rows) byTable.set(p.tablename, [...(byTable.get(p.tablename) ?? []), p.cmd].sort());
    expect(Object.fromEntries(byTable)).toEqual({
      member_nominee_versions: ['INSERT', 'SELECT', 'UPDATE'],
      nominee_determinations: ['INSERT', 'SELECT', 'UPDATE'],
      nominee_determination_items: ['INSERT', 'SELECT'],
      nominee_corrections: ['INSERT', 'SELECT', 'UPDATE'],
      claim_nominee_findings: ['INSERT', 'SELECT'],
    });
  });

  /** One row in EVERY table for a claim in PARIWAR_A. */
  async function seedAllFive() {
    const ctx = await seedMemberAndClaim();
    const v = await insertVersion(ctx.memberId);
    const [d] = await ctx.tx.insert(schema.nomineeDeterminations).values(determination(ctx.claimCaseId, ctx.memberId)).returning();
    await ctx.tx
      .insert(schema.nomineeDeterminationItems)
      .values({ determinationId: d!.determinationId, versionId: v.versionId, pariwarId: PARIWAR_A, mark: 'stands' });
    await ctx.tx.insert(schema.nomineeCorrections).values(correction(ctx.claimCaseId, ctx.memberId, v.versionId));
    await ctx.tx.insert(schema.claimNomineeFindings).values({
      findingId: randomUUID() as never,
      claimCaseId: ctx.claimCaseId as never,
      pariwarId: PARIWAR_A,
      kind: 'member_found_innocent',
      recordedByActorId: randomUUID(),
      recordedByDisplay: 'Investigator',
    });
    return { ...ctx, versionId: v.versionId, determinationId: d!.determinationId };
  }

  async function countAll(client: ReturnType<typeof getTx>['client'], claimCaseId: string, memberId: string, determinationId: string) {
    const q = (sqlText: string, arg: string) => client.query<{ n: number }>(sqlText, [arg]).then((r) => Number(r.rows[0]!.n));
    return {
      versions: await q('SELECT count(*) AS n FROM member_nominee_versions WHERE member_id = $1', memberId),
      determinations: await q('SELECT count(*) AS n FROM nominee_determinations WHERE claim_case_id = $1', claimCaseId),
      // ⭐ The items table's OWN policy, by its own column — ⛔ never through a JOIN on determinations, whose
      // policy hides the row first and made this count 0 whatever the items policy said (code review 2026-09-24b).
      items: await q(
        'SELECT count(*) AS n FROM nominee_determination_items WHERE determination_id = $1',
        determinationId,
      ),
      corrections: await q('SELECT count(*) AS n FROM nominee_corrections WHERE claim_case_id = $1', claimCaseId),
      findings: await q('SELECT count(*) AS n FROM claim_nominee_findings WHERE claim_case_id = $1', claimCaseId),
    };
  }

  it('⭐ family 5 — ALL FIVE tables: visible in-scope, ZERO rows cross-tenant, ZERO rows with an unset scope', async () => {
    const { client, claimCaseId, memberId, determinationId } = await seedAllFive();
    // Non-vacuity: every table holds this claim's row in its own Pariwar.
    expect(await countAll(client, claimCaseId, memberId, determinationId)).toEqual({ versions: 1, determinations: 1, items: 1, corrections: 1, findings: 1 });
    await enterAppScope(client, PARIWAR_B);
    expect(await countAll(client, claimCaseId, memberId, determinationId)).toEqual({ versions: 0, determinations: 0, items: 0, corrections: 0, findings: 0 });
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    expect(await countAll(client, claimCaseId, memberId, determinationId)).toEqual({ versions: 0, determinations: 0, items: 0, corrections: 0, findings: 0 });
  });

  // ⚠ WHAT THIS PROVES, stated honestly (code review 2026-09-24b): the insert runs in A's scope with
  // `pariwar_id = B`, so it is A's INSERT WITH CHECK that refuses it. The OTHER cross-tenant shape — B's scope
  // writing an item with `pariwar_id = B` that points at A's determination — passes the single-column FK (FK
  // checks ignore RLS); it is the recorded defer "DB-level cross-table coherence is writer-enforced only".
  it("⛔ an item row stamped with ANOTHER Pariwar's id is refused by the WITH CHECK (42501)", async () => {
    const { tx, determinationId, versionId } = await seedAllFive();
    await expect(
      tx.insert(schema.nomineeDeterminationItems).values({ determinationId, versionId, pariwarId: PARIWAR_B, mark: 'discarded' }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐ family 5 — every FOREIGN KEY refuses an orphan (23503)', async () => {
    const { tx, client, memberId, claimCaseId, versionId, determinationId } = await seedAllFive();
    const ghost = randomUUID();
    const attempts: [string, () => Promise<unknown>][] = [
      ['version → member', () => tx.insert(schema.memberNomineeVersions).values(declared(ghost, PARIWAR_A))],
      [
        'version → corrected version',
        () =>
          tx.insert(schema.memberNomineeVersions).values(
            declared(memberId, PARIWAR_A, {
              versionNo: 2,
              source: 'correction',
              correctsVersionId: ghost as never,
              recordedAt: new Date(at.getTime() + 1000),
            }),
          ),
      ],
      ['determination → claim', () => tx.insert(schema.nomineeDeterminations).values(determination(ghost, memberId))],
      [
        'determination → superseded determination',
        () =>
          tx.insert(schema.nomineeDeterminations).values(
            determination(claimCaseId, memberId, {
              supersedesDeterminationId: ghost as never,
              supersededAt: new Date(),
              supersededReason: 'redetermined',
            }),
          ),
      ],
      ['item → determination', () => tx.insert(schema.nomineeDeterminationItems).values({ determinationId: ghost as never, versionId, pariwarId: PARIWAR_A, mark: 'stands' })],
      ['item → version', () => tx.insert(schema.nomineeDeterminationItems).values({ determinationId, versionId: ghost as never, pariwarId: PARIWAR_A, mark: 'stands' })],
      ['correction → claim', () => tx.insert(schema.nomineeCorrections).values(correction(ghost, memberId, versionId, { rank: 2 }))],
      ['correction → member', () => tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, ghost, versionId, { rank: 2 }))],
      ['correction → target version', () => tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, ghost, { rank: 2 }))],
      [
        // (code review 2026-09-24b) — the fourth correction FK, which the list lacked. A coherent APPLIED row
        // (two different approvers, every decision column) whose applied version does not exist.
        'correction → applied version',
        () =>
          tx.insert(schema.nomineeCorrections).values(
            correction(claimCaseId, memberId, versionId, {
              rank: 2,
              step: 'applied',
              daActorId: randomUUID(),
              daDisplay: 'A',
              daNoteCiphertext: 'enc:v1:n',
              daDecidedAt: new Date(),
              paActorId: randomUUID(),
              paDisplay: 'B',
              paNoteCiphertext: 'enc:v1:n',
              paDecidedAt: new Date(),
              appliedVersionId: ghost as never,
            }),
          ),
      ],
      [
        'finding → claim',
        () =>
          tx.insert(schema.claimNomineeFindings).values({
            findingId: randomUUID() as never,
            claimCaseId: ghost as never,
            pariwarId: PARIWAR_A,
            kind: 'member_found_innocent',
            recordedByActorId: randomUUID(),
            recordedByDisplay: 'Investigator',
          }),
      ],
    ];
    for (const [label, attempt] of attempts) {
      await client.query('SAVEPOINT fk');
      await expect(attempt(), label).rejects.toSatisfy((err: unknown) => pgCode(err) === '23503');
      await client.query('ROLLBACK TO SAVEPOINT fk');
    }
  });

  it('⭐ family 5 — the value CHECKs on every table (23514)', async () => {
    const { tx, client, memberId, claimCaseId, versionId } = await seedAllFive();
    const finding = (over: Record<string, unknown>) => ({
      findingId: randomUUID() as never,
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A,
      kind: 'nominee_disqualified' as const,
      rank: 1,
      recordedByActorId: randomUUID(),
      recordedByDisplay: 'Investigator',
      ...over,
    });
    // ⭐ Each leg names the CHECK that must refuse it (code review 2026-09-24b): four of these values also
    // violate a COHERENCE check, so a bare 23514 stayed green with the named CHECK dropped. Postgres reports
    // the FIRST violated constraint in name order — so where two fire, the leg's value is chosen so that the
    // named one is the one reported, and an unexpected name fails the leg.
    const attempts: [string, string, () => Promise<unknown>][] = [
      ['version rank', 'member_nominee_versions_rank_check', () => insertVersion(memberId, { rank: 3, versionNo: 7 })],
      ['version_no', 'member_nominee_versions_version_no_check', () => insertVersion(memberId, { versionNo: 0 })],
      ['version kind', 'member_nominee_versions_kind_check', () => insertVersion(memberId, { versionNo: 7, kind: 'erased' as never })],
      ['version split', 'member_nominee_versions_split_check', () => insertVersion(memberId, { versionNo: 7, splitPct: 50 })],
      ['correction rank', 'nominee_corrections_rank_check', () => tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, versionId, { rank: 3 }))],
      ['correction step', 'nominee_corrections_step_check', () => tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, versionId, { rank: 2, step: 'lost' as never }))],
      ['correction channel', 'nominee_corrections_raised_via_check', () => tx.insert(schema.nomineeCorrections).values(correction(claimCaseId, memberId, versionId, { rank: 2, raisedVia: 'email' as never }))],
      ['finding kind', 'claim_nominee_findings_kind_check', () => tx.insert(schema.claimNomineeFindings).values(finding({ kind: 'suspected' }))],
    ];
    for (const [label, name, attempt] of attempts) {
      await client.query('SAVEPOINT ck');
      const err = await attempt().then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(name);
      await client.query('ROLLBACK TO SAVEPOINT ck');
    }
    // ⚠ `source` — NOT CONSTRUCTIBLE by an insert, and said so rather than faked (family 10): the correction
    // coherence CHECK enumerates both legal sources, so ANY value `source_check` refuses is refused by it too,
    // and Postgres reports `…_correction_coherence_check` (it sorts first). Two checks guard the column; the
    // leg proves the refusal, and the catalog proves `source_check` itself is present with its value set.
    await client.query('SAVEPOINT src');
    const srcErr = await insertVersion(memberId, { versionNo: 7, source: 'import' as never }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(pgCode(srcErr)).toBe('23514');
    expect(['member_nominee_versions_source_check', 'member_nominee_versions_correction_coherence_check']).toContain(pgConstraint(srcErr));
    await client.query('ROLLBACK TO SAVEPOINT src');
    // ⭐ EXACTLY the two legal sources, on THIS table (adversarial review 2026-09-24b: a loose regex would also
    // match a check WIDENED to a third source, which the coherence CHECK would then hide).
    const def = await client.query<{ d: string }>(
      `SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint
        WHERE conname = 'member_nominee_versions_source_check' AND conrelid = 'public.member_nominee_versions'::regclass`,
    );
    expect(def.rows).toHaveLength(1);
    const values = [...def.rows[0]!.d.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort();
    expect(values).toEqual(['correction', 'member']);
  });

  it('⭐ family 5 — ONE mark per version per determination (the items PK) and ONE disqualification per rank (23505)', async () => {
    const { tx, client, claimCaseId, versionId, determinationId } = await seedAllFive();
    await client.query('SAVEPOINT pk');
    await expect(
      tx.insert(schema.nomineeDeterminationItems).values({ determinationId, versionId, pariwarId: PARIWAR_A, mark: 'discarded' }),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
    await client.query('ROLLBACK TO SAVEPOINT pk');
    const dq = () =>
      tx.insert(schema.claimNomineeFindings).values({
        findingId: randomUUID() as never,
        claimCaseId: claimCaseId as never,
        pariwarId: PARIWAR_A,
        kind: 'nominee_disqualified',
        rank: 2,
        recordedByActorId: randomUUID(),
        recordedByDisplay: 'Investigator',
      });
    await dq();
    await expect(dq()).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('⭐⭐ migration 0121 — a determination\'s SUPERSESSION is ONE-WAY: never revived, never re-stamped (23000); the RTBF scrub still works', async () => {
    const { tx, client, memberId, claimCaseId } = await seedMemberAndClaim();
    const [d] = await tx.insert(schema.nomineeDeterminations).values(determination(claimCaseId, memberId)).returning();
    const byId = eq(schema.nomineeDeterminations.determinationId, d!.determinationId);
    // Live → superseded: allowed (the writers' only transition).
    await tx.update(schema.nomineeDeterminations).set({ supersededAt: new Date(), supersededReason: 'redetermined' }).where(byId);
    // ⛔ Revived (the coherence CHECK alone would ALLOW this pair) …
    await client.query('SAVEPOINT rv');
    await expect(
      tx.update(schema.nomineeDeterminations).set({ supersededAt: null, supersededReason: null }).where(byId),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23000');
    await client.query('ROLLBACK TO SAVEPOINT rv');
    // ⛔ … or re-stamped with another reason.
    await client.query('SAVEPOINT rs');
    await expect(
      tx.update(schema.nomineeDeterminations).set({ supersededReason: 'correction_applied' }).where(byId),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23000');
    await client.query('ROLLBACK TO SAVEPOINT rs');
    // ⛔ … or re-stamped with another INSTANT (code review 2026-09-24b: only the reason was tried).
    await client.query('SAVEPOINT rt');
    await expect(
      tx.update(schema.nomineeDeterminations).set({ supersededAt: new Date(Date.now() + 86_400_000) }).where(byId),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23000');
    await client.query('ROLLBACK TO SAVEPOINT rt');
    // ✓ The DPDPA-RTBF ciphertext scrub on a superseded row is untouched by the rule.
    await tx.update(schema.nomineeDeterminations).set({ noteCiphertext: '[anonymized]' }).where(byId);
    const [row] = await tx.select().from(schema.nomineeDeterminations).where(byId);
    expect(row!.noteCiphertext).toBe('[anonymized]');
    expect(row!.supersededReason).toBe('redetermined');
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

  it('⭐ ⛔ a proposed relationship of `other` is refused at the DB (backstop of an ENGINEERING READING of `-237` cl.2, ⛔ not a ratified rule — 23514)', async () => {
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
