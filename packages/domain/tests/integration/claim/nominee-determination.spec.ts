// The District Admin's DETERMINATION and the EFFECTIVE (as-at-death) declaration — live DB (:5433).
// Story 6.20 (Task 3 / Task 9; D4, D5, D6, D15, D17; AC4, AC5, AC6, AC11).
//
// Every fixture REACHES the branch it names: a version at 23:59 IST the day before the death and one at
// 00:00 IST on the day, a post-death version, a vacated tombstone, a correction version that INHERITS an
// earlier position, a disqualification finding. The writer is driven through its real entry point
// (`recordNomineeDetermination`) and the accessor through `getEffectiveNomineeDeclaration`, so the one-
// query SQL and the pure selection rule are exercised together.
//
// The certificate date throughout is 2026-03-10; its IST start is 2026-03-09T18:30:00.000Z.

import { randomUUID } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  NomineeDeterminationRefusedError,
  NomineeDeterminationRequiredError,
  NomineeNameCheckRequiredError,
  assertNomineeNameCheckForApproval,
  getEffectiveNomineeDeclaration,
  isInDeathCertificateReviewWindow,
  recordNomineeDetermination,
  recordNomineeDisqualificationFinding,
  NOMINEE_DETERMINATION_MAX_VERSIONS,
  type RecordNomineeDeterminationInput,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  claimId as toClaimId,
  claimNomineeFindingId,
  memberId as toMemberId,
  type ClaimId,
  type MemberId,
} from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  enterAppScope,
  seedAcceptedDeathCertificate,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

const CERT = '2026-03-10';
const LONG_BEFORE = new Date('2026-02-01T06:00:00.000Z');
const LAST_MS_BEFORE = new Date('2026-03-09T18:29:59.999Z'); // 23:59:59.999 IST on 2026-03-09
const DEATH_DAY_START = new Date('2026-03-09T18:30:00.000Z'); // 00:00:00.000 IST on 2026-03-10
const AFTER = new Date('2026-03-12T06:00:00.000Z');

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

async function setup(state: 'verification_in_progress' | 'intake_pending' = 'verification_in_progress') {
  const { client, tx } = getTx();
  await enterAppScope(client, PARIWAR_A);
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  // The member row first (versions FK to it), then the claim through the projector.
  await tx.insert(schema.members).values({ memberId: mid, pariwarId: PARIWAR_A, state: 'active', stateEventVersion: 1 });
  await driveClaimTo(client, PARIWAR_A, cid, mid, state);
  return { client, tx, cid, mid };
}

async function declare(tx: Tx, mid: MemberId, count: 1 | 2, at: Date) {
  await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
    nominees: count === 1 ? [{}] : [{}, {}],
    declaredAt: at,
    ensureMember: false,
  });
}

/** Every version with its D6-CORRECT mark against CERT — what an honest District Admin enters. */
async function honestMarks(tx: Tx, mid: MemberId) {
  const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
  return versions.map((v) => ({
    versionId: v.versionId as string,
    mark: v.effectiveAt.getTime() < DEATH_DAY_START.getTime() ? ('stands' as const) : ('discarded' as const),
    rank: v.rank,
    versionNo: v.versionNo,
  }));
}

async function base(tx: Tx, cid: ClaimId, mid: MemberId): Promise<RecordNomineeDeterminationInput> {
  const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
  const head = (rank: number) =>
    versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
  const [live] = await tx
    .select({ id: schema.nomineeDeterminations.determinationId })
    .from(schema.nomineeDeterminations)
    .where(and(eq(schema.nomineeDeterminations.claimCaseId, cid), isNull(schema.nomineeDeterminations.supersededAt)));
  // Story 6.21a (D12(c)) — the determination's date must come from the claim's CURRENT, ACCEPTED death
  // certificate (D8). Accepted ONCE per claim with CERT (a repeat call reuses the review). Outside the review
  // window no review can exist, so a dummy id is passed — the writer refuses `not_recordable` first anyway.
  const [claimRow] = await tx
    .select({ state: schema.claims.currentState })
    .from(schema.claims)
    .where(eq(schema.claims.claimCaseId, cid));
  const deathCertificateReviewId = isInDeathCertificateReviewWindow(claimRow!.state as string)
    ? await seedAcceptedDeathCertificate(getTx().client, { pariwarId: PARIWAR_A, claimCaseId: cid, date: CERT })
    : randomUUID();
  return {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    deathCertificateReviewId,
    // `-246` §3 — the caller's date verdict (the HTTP handler compares decrypted dates; here the date IS CERT).
    certificateDateCheck: 'match' as const,
    certificateDate: CERT,
    certificateDateCiphertext: 'enc:v1:date',
    noteCiphertext: 'enc:v1:note',
    marks: (await honestMarks(tx, mid)).map(({ versionId, mark }) => ({ versionId, mark })),
    watermark: { rank1: head(1), rank2: head(2) },
    expectedLiveDeterminationId: (live?.id as string | undefined) ?? null,
    actorId: randomUUID(),
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
  };
}

function refusedWith(reason: string) {
  return (err: unknown) => err instanceof NomineeDeterminationRefusedError && err.reason === reason;
}

describe.skipIf(!hasDatabase)('Story 6.20 — the determination + the effective declaration (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── D6 — the day boundary ─────────────────────────────────────────────────────────────────────
  it('⭐⭐ a change at 23:59 IST the day BEFORE stands; a change at 00:00 IST ON the day of death is discarded', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await declare(tx, mid, 1, LAST_MS_BEFORE);
    await declare(tx, mid, 1, DEATH_DAY_START);
    const input = await base(tx, cid, mid);
    expect(input.marks.map((m) => m.mark)).toEqual(['stands', 'stands', 'discarded']);
    await recordNomineeDetermination(client, input);

    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.status).toBe('effective');
    // The HIGHEST standing version — the 23:59 one — is the member's choice (D5's reading of `-235` AA).
    expect(e.entries.map((x) => [x.rank, x.versionNo, x.splitPct])).toEqual([[1, 2, 100]]);
  });

  it('⭐ the writer REFUSES a mark that disagrees with D6 — a guard, ⛔ never corrected (invariant 1)', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LAST_MS_BEFORE);
    await declare(tx, mid, 1, DEATH_DAY_START);
    const input = await base(tx, cid, mid);
    // Mark the 00:00-IST version as STANDING — the post-death change the ruling discards.
    const lying = { ...input, marks: input.marks.map((m) => ({ ...m, mark: 'stands' as const })) };
    await expect(recordNomineeDetermination(client, lying)).rejects.toSatisfy(refusedWith('inconsistent_mark'));
    // …and ⛔ nothing was written.
    expect(await tx.select().from(schema.nomineeDeterminations).where(eq(schema.nomineeDeterminations.claimCaseId, cid))).toEqual([]);
  });

  it('⭐ invariant 5 — a CORRECTION recorded after the death but INHERITING an earlier effective_at STANDS', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const [v1] = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    await tx.insert(schema.memberNomineeVersions).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      rank: 1,
      versionNo: 2,
      declarationId: randomUUID(),
      kind: 'declared',
      source: 'correction',
      nameCiphertext: 'enc:v1:corrected',
      relationship: 'spouse',
      mobileCiphertext: 'enc:v1:m',
      splitPct: 100,
      recordedAt: AFTER, // recorded AFTER the death …
      effectiveAt: v1!.effectiveAt, // … positioned where the corrected version was
      correctsVersionId: v1!.versionId,
    });
    const input = await base(tx, cid, mid);
    expect(input.marks.map((m) => m.mark)).toEqual(['stands', 'stands']);
    await recordNomineeDetermination(client, input);
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => x.versionNo)).toEqual([2]); // the correction, ⛔ never mistaken for post-death
  });

  // ── AC6 — per nominee ─────────────────────────────────────────────────────────────────────────
  it('⭐ AC6 1 → 2 across the death: rank 2 (added post-death) is discarded, rank 1 reverts, split DERIVED 100', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await declare(tx, mid, 2, AFTER);
    await recordNomineeDetermination(client, await base(tx, cid, mid));
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => [x.rank, x.versionNo, x.splitPct])).toEqual([[1, 1, 100]]);
  });

  it('⭐ AC6 2 → 1 across the death: the post-death TOMBSTONE is discarded, BOTH nominees stand at 75 / 25', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 2, LONG_BEFORE);
    await declare(tx, mid, 1, AFTER); // writes r1 v2 AND the r2 v2 tombstone, both post-death
    await recordNomineeDetermination(client, await base(tx, cid, mid));
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => [x.rank, x.versionNo, x.splitPct])).toEqual([
      [1, 1, 75],
      [2, 1, 25],
    ]);
  });

  it('AC6 a change to BOTH of two before the death, then again after: each rank reverts to its OWN last pre-death version', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 2, LONG_BEFORE);
    await declare(tx, mid, 2, LAST_MS_BEFORE);
    await declare(tx, mid, 2, AFTER);
    await recordNomineeDetermination(client, await base(tx, cid, mid));
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => [x.rank, x.versionNo])).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('⭐⭐ AC11 2 → 1 → 2 across the boundary: rank 2 reverts to the TOMBSTONE from the 2 → 1, ⛔ not to its v1', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 2, LONG_BEFORE); // r1 v1, r2 v1
    await declare(tx, mid, 1, LAST_MS_BEFORE); // r1 v2, r2 v2 = vacated (pre-death)
    await declare(tx, mid, 2, AFTER); // r1 v3, r2 v3 (post-death)
    await recordNomineeDetermination(client, await base(tx, cid, mid));
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => [x.rank, x.versionNo, x.splitPct])).toEqual([[1, 2, 100]]);
  });

  it('⭐ AC6 a change to ONE of two after the death: the changed rank reverts, the untouched rank keeps its own version', async () => {
    const { client, tx, cid, mid } = await setup();
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [{ nameCiphertext: 'enc:v1:asha' }, { nameCiphertext: 'enc:v1:ravi' }],
      declaredAt: LONG_BEFORE,
      ensureMember: false,
    });
    // After the death ONLY rank 1's nominee changes (rank 2 is re-submitted unchanged — T3: no dedup).
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [{ nameCiphertext: 'enc:v1:someone-else' }, { nameCiphertext: 'enc:v1:ravi' }],
      declaredAt: AFTER,
      ensureMember: false,
    });
    await recordNomineeDetermination(client, await base(tx, cid, mid));
    const e = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(e.entries.map((x) => [x.rank, x.versionNo, x.splitPct])).toEqual([
      [1, 1, 75],
      [2, 1, 25],
    ]);
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    const standing = e.entries.map((x) => versions.find((v) => v.versionId === x.versionId)!.nameCiphertext);
    expect(standing).toEqual(['enc:v1:asha', 'enc:v1:ravi']);
  });

  // ── The writer's other guards (D5, D17, D4) ───────────────────────────────────────────────────
  // ⚠ WHAT THIS PROVES, and what it does not (code review 2026-09-24b). The writer owns ⛔ no transaction: its
  // atomicity IS the caller's one transaction. The old version of this test asserted "leaves neither" right
  // after its OWN `ROLLBACK TO SAVEPOINT` — which removes the writes whatever the writer does, so it could not
  // fail. It now proves the two things a savepoint CAN show: the failure really is MID-WAY (the row and items
  // exist when the event throws) and it is the event's schema that throws. The ROLLBACK-ON-FAILURE boundary is
  // proven where it lives — the handler's scope transaction, from a second connection
  // (`apps/api/tests/integration/claims/nominee-declaration.spec.ts`, "AC4 — a failure mid-way …").
  it('⭐ AC4 — the writer fails MID-WAY (its row + items already written) when the claim event is refused', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const input = await base(tx, cid, mid);
    await client.query('SAVEPOINT mid_way');
    // An actor the claim event's payload schema rejects.
    const err = await recordNomineeDetermination(client, { ...input, actor: 'not-an-actor' as never }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect((err as Error | undefined)?.name).toBe('ZodError');
    // ⭐ MID-WAY, asserted: the zod error is a JS throw (the transaction is ⛔ not aborted), so the writes made
    // before the event are still visible here — the failure came AFTER them.
    const rows = await tx.select().from(schema.nomineeDeterminations).where(eq(schema.nomineeDeterminations.claimCaseId, cid));
    expect(rows).toHaveLength(1);
    const items = await tx
      .select()
      .from(schema.nomineeDeterminationItems)
      .where(eq(schema.nomineeDeterminationItems.determinationId, rows[0]!.determinationId));
    expect(items).toHaveLength(1);
    await client.query('ROLLBACK TO SAVEPOINT mid_way');
    // …and the same input, well-formed, then records (the rollback was of THIS attempt only).
    await expect(recordNomineeDetermination(client, input)).resolves.toMatchObject({ standsCount: 1 });
  });

  it(`⭐ the cap BOUNDARY — exactly ${NOMINEE_DETERMINATION_MAX_VERSIONS} versions is ACCEPTED (⛔ an off-by-one \`>=\` would refuse it)`, async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await tx.execute(sql`
      INSERT INTO member_nominee_versions
        (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext, relationship,
         mobile_ciphertext, split_pct, recorded_at, effective_at)
      SELECT ${mid}, ${PARIWAR_A}, 1, g, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', 'enc:v1:m', 100,
             ${LONG_BEFORE.toISOString()}::timestamptz, ${LONG_BEFORE.toISOString()}::timestamptz
        FROM generate_series(2, ${NOMINEE_DETERMINATION_MAX_VERSIONS}) AS g
    `);
    await expect(recordNomineeDetermination(client, await base(tx, cid, mid))).resolves.toMatchObject({
      standsCount: NOMINEE_DETERMINATION_MAX_VERSIONS,
    });
  });

  it('⛔ a version marked TWICE is refused as `duplicate_mark` (⛔ not reported as an unknown version)', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const input = await base(tx, cid, mid);
    await expect(recordNomineeDetermination(client, { ...input, marks: [...input.marks, input.marks[0]!] })).rejects.toSatisfy(
      refusedWith('duplicate_mark'),
    );
  });

  it('⭐ UPPER-case ids from a client are accepted (the contract is an unbranded uuid; stored ids are lower-case)', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const first = await recordNomineeDetermination(client, await base(tx, cid, mid));
    const input = await base(tx, cid, mid);
    const res = await recordNomineeDetermination(client, {
      ...input,
      marks: input.marks.map((m) => ({ ...m, versionId: m.versionId.toUpperCase() })),
      expectedLiveDeterminationId: first.determinationId.toUpperCase(),
    });
    expect(res.supersededDeterminationId).toBe(first.determinationId);
  });

  it('⛔ family 8 — a determination with NO display name, or NO note, is refused; an unknown claim is `not_found`', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const input = await base(tx, cid, mid);
    await expect(recordNomineeDetermination(client, { ...input, actorDisplay: '  ' })).rejects.toSatisfy(refusedWith('missing_display'));
    await expect(recordNomineeDetermination(client, { ...input, noteCiphertext: '' })).rejects.toSatisfy(refusedWith('missing_note'));
    await expect(recordNomineeDetermination(client, { ...input, claimCaseId: toClaimId(randomUUID()) })).rejects.toSatisfy(
      refusedWith('not_found'),
    );
  });

  it(`⛔ past ${NOMINEE_DETERMINATION_MAX_VERSIONS} versions the writer refuses with a TYPED \`too_many_versions\` (⛔ never an unreachable \`missing_item\`)`, async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    // Versions 2 … MAX+1 of rank 1 — one statement, the fixture's own shape.
    await tx.execute(sql`
      INSERT INTO member_nominee_versions
        (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext, relationship,
         mobile_ciphertext, split_pct, recorded_at, effective_at)
      SELECT ${mid}, ${PARIWAR_A}, 1, g, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', 'enc:v1:m', 100,
             ${LONG_BEFORE.toISOString()}::timestamptz, ${LONG_BEFORE.toISOString()}::timestamptz
        FROM generate_series(2, ${NOMINEE_DETERMINATION_MAX_VERSIONS + 1}) AS g
    `);
    await expect(recordNomineeDetermination(client, await base(tx, cid, mid))).rejects.toSatisfy(refusedWith('too_many_versions'));
  });


  it('⛔ a version with NO mark is refused (every version must be judged)', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await declare(tx, mid, 1, AFTER);
    const input = await base(tx, cid, mid);
    await expect(recordNomineeDetermination(client, { ...input, marks: input.marks.slice(0, 1) })).rejects.toSatisfy(
      refusedWith('missing_item'),
    );
  });

  it('⛔ a mark naming a version outside this declaration is refused', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const input = await base(tx, cid, mid);
    await expect(
      recordNomineeDetermination(client, { ...input, marks: [...input.marks, { versionId: randomUUID(), mark: 'stands' }] }),
    ).rejects.toSatisfy(refusedWith('unknown_version'));
  });

  it('⭐ D17 — a STALE watermark (a version landed after the timeline was read) is refused', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const read = await base(tx, cid, mid);
    await declare(tx, mid, 1, LAST_MS_BEFORE); // lands "meanwhile"
    const now = await base(tx, cid, mid);
    await expect(
      recordNomineeDetermination(client, { ...now, watermark: read.watermark }),
    ).rejects.toSatisfy(refusedWith('stale_watermark'));
  });

  it('⛔ D17 — a lone {2} standing set is refused (only a disqualification FINDING may re-rank)', async () => {
    const { client, tx, cid, mid } = await setup();
    // Artificial on purpose — a declare always includes rank 1, so this is built row by row.
    const row = (rank: number, at: Date) => ({
      memberId: mid,
      pariwarId: PARIWAR_A,
      rank,
      versionNo: 1,
      declarationId: randomUUID(),
      kind: 'declared' as const,
      source: 'member' as const,
      nameCiphertext: 'enc:v1:n',
      relationship: 'son',
      mobileCiphertext: 'enc:v1:m',
      splitPct: rank === 1 ? 75 : 25,
      recordedAt: at,
      effectiveAt: at,
    });
    await tx.insert(schema.memberNomineeVersions).values([row(1, AFTER), row(2, LONG_BEFORE)]);
    await expect(recordNomineeDetermination(client, await base(tx, cid, mid))).rejects.toSatisfy(
      refusedWith('incoherent_rank_set'),
    );
  });

  it('⛔ outside the recordable window (intake_pending) a determination is refused', async () => {
    const { client, tx, cid, mid } = await setup('intake_pending');
    await declare(tx, mid, 1, LONG_BEFORE);
    await expect(recordNomineeDetermination(client, await base(tx, cid, mid))).rejects.toSatisfy(
      refusedWith('not_recordable'),
    );
  });

  it('⛔ a date that is not a real calendar date is refused (2026-02-30 would roll over in Date.parse)', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await expect(
      recordNomineeDetermination(client, { ...(await base(tx, cid, mid)), certificateDate: '2026-02-30' }),
    ).rejects.toSatisfy(refusedWith('invalid_certificate_date'));
  });

  it('⭐ D1 — a projection row with NO version fails CLOSED: the accessor says `unversioned`, the writer refuses', async () => {
    const { client, tx, cid, mid } = await setup();
    await tx.insert(schema.memberNominees).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      rank: 1,
      nameCiphertext: 'enc:v1:legacy',
      relationship: 'spouse',
      mobileCiphertext: 'enc:v1:m',
      splitPct: 100,
    });
    expect((await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid)).status).toBe('unversioned');
    await expect(recordNomineeDetermination(client, await base(tx, cid, mid))).rejects.toSatisfy(refusedWith('unversioned'));
  });

  // ── D4 — supersession, the event, the token ───────────────────────────────────────────────────
  it('⭐ a redetermination SUPERSEDES the live one (one live row), and a stale expected-live id is refused', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const first = await recordNomineeDetermination(client, await base(tx, cid, mid));
    // A second District Admin who read the timeline BEFORE the first determination.
    await expect(
      recordNomineeDetermination(client, { ...(await base(tx, cid, mid)), expectedLiveDeterminationId: null }),
    ).rejects.toSatisfy(refusedWith('stale_supersession'));
    const second = await recordNomineeDetermination(client, await base(tx, cid, mid));
    expect(second.supersededDeterminationId).toBe(first.determinationId);

    const rows = await tx.select().from(schema.nomineeDeterminations).where(eq(schema.nomineeDeterminations.claimCaseId, cid));
    expect(rows.filter((r) => r.supersededAt === null).map((r) => r.determinationId)).toEqual([second.determinationId]);
    expect(rows.find((r) => r.determinationId === first.determinationId)?.supersededReason).toBe('redetermined');
  });

  it('the identity annotation is written in the SAME tx, carries ids + counts only (⛔ no date), and moves no state', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await declare(tx, mid, 1, AFTER);
    const res = await recordNomineeDetermination(client, await base(tx, cid, mid));
    const ev = await tx
      .select()
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.streamId, cid), eq(schema.eventsLog.eventType, 'claim.nominee_determination_recorded')));
    expect(ev).toHaveLength(1);
    expect(ev[0]!.payload).toMatchObject({
      determination_id: res.determinationId,
      supersedes_determination_id: null,
      stands_count: 1,
      discarded_count: 1,
      from_state: 'verification_in_progress',
      to_state: 'verification_in_progress',
    });
    expect(JSON.stringify(ev[0]!.payload)).not.toContain('2026-03');
    const [claimRow] = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
    expect(claimRow!.currentState).toBe('verification_in_progress');
  });

  it('⭐⭐ AC4/AC5 — a NEW determination STALES an earlier name check: the approval gate refuses `stale`', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    await driveOn(client, cid, mid);
    await seedNomineeNameCheck(client, PARIWAR_A, cid); // determines + checks, current and passing
    await assertNomineeNameCheckForApproval(tx, PARIWAR_A, cid, mid); // passes
    await seedNomineeDetermination(client, PARIWAR_A, cid); // a redetermination
    await expect(assertNomineeNameCheckForApproval(tx, PARIWAR_A, cid, mid)).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeNameCheckRequiredError && err.reason === 'stale',
    );
  });

  it('⭐ AC5 — an EMPTY effective declaration (nobody the member chose before the death) is recordable but NEVER approves', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, AFTER); // the ONLY declaration was made after the death
    await recordNomineeDetermination(client, await base(tx, cid, mid));
    expect((await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid)).status).toBe('empty');
    await driveOn(client, cid, mid);
    await seedAccounts(tx, cid);
    await expect(assertNomineeNameCheckForApproval(tx, PARIWAR_A, cid, mid)).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeDeterminationRequiredError && err.reason === 'empty_declaration',
    );
  });

  // ── D17(c) — the disqualified primary (AC11(iv)) ──────────────────────────────────────────────
  it('⭐⭐ AC11(iv) — a test-seeded DISQUALIFICATION of rank 1 re-ranks the survivor to rank 1 at 100%, and stales the check', async () => {
    // ⚠ The finding is TEST-SEEDED: its producer is row 6-22 (the fraud register), unbuilt. ⛔ Never a
    // District Admin mark — a D6-valid determination CANNOT produce {2} (D17(c), v0.6).
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 2, LONG_BEFORE);
    await driveOn(client, cid, mid);
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    const before = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(before.entries.map((x) => [x.rank, x.splitPct])).toEqual([
      [1, 75],
      [2, 25],
    ]);

    await recordNomineeDisqualificationFinding(bindScopedDb(client), {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      findingId: claimNomineeFindingId(randomUUID()),
      rank: 1,
      actorId: randomUUID(),
      actorDisplay: 'Investigating Trustee',
    });
    const after = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid);
    expect(after.status).toBe('effective');
    expect(after.entries.map((x) => [x.rank, x.declaredRank, x.splitPct])).toEqual([[1, 2, 100]]);
    expect(after.token).not.toBe(before.token);
    await expect(assertNomineeNameCheckForApproval(tx, PARIWAR_A, cid, mid)).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeNameCheckRequiredError && err.reason === 'stale',
    );
  });

  // ── D17 — two claims for one death ────────────────────────────────────────────────────────────
  it('⛔ the 6-22 finding writers refuse a blank display name, an unknown claim, and a DUPLICATE (both kinds)', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 2, LONG_BEFORE);
    const { recordMemberInnocenceFinding, ClaimNomineeFindingRefusedError } = await import('../../../src/claim/index.js');
    const refused = (reason: string) => (err: unknown) => err instanceof ClaimNomineeFindingRefusedError && err.reason === reason;
    const innocence = (over: Record<string, unknown> = {}) =>
      recordMemberInnocenceFinding(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        findingId: claimNomineeFindingId(randomUUID()),
        actorId: randomUUID(),
        actorDisplay: 'Investigator',
        actor: 'trustee',
        ...over,
      });
    const disqualify = (over: Record<string, unknown> = {}) =>
      recordNomineeDisqualificationFinding(bindScopedDb(client), {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        findingId: claimNomineeFindingId(randomUUID()),
        actorId: randomUUID(),
        actorDisplay: 'Investigator',
        rank: 2,
        ...over,
      });
    await expect(innocence({ actorDisplay: ' ' })).rejects.toSatisfy(refused('missing_display'));
    await expect(disqualify({ actorDisplay: '' })).rejects.toSatisfy(refused('missing_display'));
    await expect(innocence({ claimCaseId: toClaimId(randomUUID()) })).rejects.toSatisfy(refused('claim_not_found'));
    await expect(disqualify({ claimCaseId: toClaimId(randomUUID()) })).rejects.toSatisfy(refused('claim_not_found'));
    await innocence();
    await expect(innocence()).rejects.toSatisfy(refused('duplicate'));
    await disqualify();
    await expect(disqualify()).rejects.toSatisfy(refused('duplicate'));
  });

  it('⭐ D17 — TWO claims for one death each keep their OWN determination; determining B leaves A live', async () => {
    const { client, tx, cid, mid } = await setup();
    await declare(tx, mid, 1, LONG_BEFORE);
    const a = await recordNomineeDetermination(client, await base(tx, cid, mid));
    const cidB = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cidB, mid, 'verification_in_progress');
    const b = await recordNomineeDetermination(client, await base(tx, cidB, mid));
    const live = await tx
      .select({ id: schema.nomineeDeterminations.determinationId })
      .from(schema.nomineeDeterminations)
      .where(isNull(schema.nomineeDeterminations.supersededAt));
    const liveIds = live.map((r) => r.id);
    expect(liveIds).toContain(a.determinationId);
    expect(liveIds).toContain(b.determinationId);
  });
});

/** From verification_in_progress on to verifier_review (the name-check window's approval state). */
async function driveOn(client: Client, cid: ClaimId, mid: MemberId) {
  const { projectClaimState } = await import('../../../src/claim/project.js');
  await projectClaimState(client, {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    deceasedMemberId: mid,
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: 'claim.verifier_reviewing',
    payload: { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 'test', actor: 'system' },
    actorId: null,
  });
}

async function seedAccounts(tx: Tx, cid: ClaimId) {
  await tx.insert(schema.claimNomineeBankAccounts).values(
    [1, 2].map((rank) => ({
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accountRank: rank,
      accountHolderNameCiphertext: `enc:v1:holder-${rank}`,
      accountNumberCiphertext: `enc:v1:acct-${rank}`,
      ifscCiphertext: `enc:v1:ifsc-${rank}`,
      bankName: 'State Bank of India',
      ifscValidated: true,
    })),
  );
}
