// The EFFECTIVE nominee declaration — the declaration IN FORCE AT THE DEATH, per the District Admin's
// determination (Story 6.20, Task 3; D5, D6, D15, D17; AC4, AC5, AC6). Transport-free.
//
// `2026-09-20-234` consequence 3: *"Story 6.18 … its AC2 names read, its declaration token and its
// two-names comparison must read the declaration in force at the death, ⛔ not the current rows."*
// This module is that read. `member_nominees` is ⛔ NOT it — the projection is always the LATEST
// version (D16), which after a post-death change is the WRONG nominee.
//
// ── The selection rule (D5) ──────────────────────────────────────────────────────────────────────
// Per rank, the STANDING version is the HIGHEST `version_no` among the versions the live determination
// marks `stands`. ⚠ An AUTHOR READING of *"the nominee the member originally chose"* (`-235` AA), ⛔ not
// the Panel's words: every pre-death change is *"assumed to be done by member"* (`-235` Y), so the LAST
// pre-death version is as much the member's own choice as the first.
//   · a version with NO item does ⛔ not stand (fail-closed);
//   · a standing `vacated` tombstone means the rank is EMPTY (T9 — a 2→1 before the death);
//   · then (D17(c)) a Story-6-22 disqualification finding removes its rank and RE-RANKS the survivor.
// The splits are DERIVED from the resulting rank set (`{1}` ⇒ 100, `{1,2}` ⇒ 75/25, R4) — ⛔ never read
// off the versions' stored `split_pct`, which can come from DIFFERENT declarations on a 1→2 / 2→1
// straddle (D17(a)).
//
// ── Fail-closed states (D1, D5, D15, D17) ────────────────────────────────────────────────────────
//   · `undetermined` — no live determination (a correction may have superseded it — D7);
//   · `unversioned`  — a `member_nominees` rank has ⛔ no version (⛔ no backfill — a dev DB is reset);
//   · `empty`        — nobody stands;
//   · `incoherent`   — a standing set that is neither `{1}` nor `{1,2}` without a disqualification.
// Each carries a TOKEN too, so a name check recorded against one of these states goes STALE the moment
// a determination makes the declaration effective. ⭐ The fail-closed token also folds in each rank's
// HIGHEST `version_no` (the version heads): a correction supersedes the determination AND appends a
// version, so the post-correction `undetermined` token differs from the pre-determination one — ⛔ an old
// name check never becomes "current" again (code review 2026-09-24).
//
// ⭐ ONE SQL ROUND-TRIP, per-claim AND bulk. Site F (`readNomineeNameCheckFlagsBulk`) serves the
// correction queue AND the State Trustee's cycle-freeze pending list — a per-claim call there would be an
// N+1 across the whole list (the bound `getMemberNomineeDeclarationRefsBulk` existed for). And the
// console's read ceiling (T7) is paid ONCE: this replaces the single `getMemberNomineeDeclarationRefs`
// read the console made before, read-for-read.
//
// ⛔⛔ TRAP 1 / TRAP 4 / INVARIANT 6: ⛔ no name, ⛔ no ciphertext, ⛔ no hash of a name — ranks, version
// ids, instants and a determination id. The names read (site C) resolves ciphertext by VERSION ID, in
// the handler, after authorization.
// ⛔⛔ T5(b): this module must ⛔ NEVER import `claim/events.ts` (the TDZ cycle `nominee-name-check-read.ts`
// exists to avoid) — and it does not need to.

import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { istMidnightAt } from '../cycle-calendar/holiday-resolver.js';
import type { Db } from '../db.js';
import type {
  ClaimId,
  MemberId,
  NomineeDeterminationId,
  NomineeVersionId,
  PariwarId,
} from '../ids/index.js';

/** One rank of the effective declaration. ⛔ No name, ⛔ no ciphertext. */
export interface EffectiveNomineeEntry {
  /** The rank this nominee holds in the EFFECTIVE set (after any D17(c) re-rank). */
  readonly rank: 1 | 2;
  /** The rank the version was DECLARED at (differs from `rank` only after a re-rank). */
  readonly declaredRank: 1 | 2;
  readonly versionId: NomineeVersionId;
  readonly versionNo: number;
  readonly effectiveAt: Date;
  /** DERIVED from the effective rank set — ⛔ never the version's stored `split_pct` (D17(a)). */
  readonly splitPct: 100 | 75 | 25;
}

export type EffectiveNomineeDeclarationStatus =
  | 'effective'
  | 'undetermined'
  | 'unversioned'
  | 'empty'
  | 'incoherent';

export interface EffectiveNomineeDeclaration {
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  readonly status: EffectiveNomineeDeclarationStatus;
  /** The live determination, or `null` when there is none. */
  readonly determinationId: NomineeDeterminationId | null;
  /** Empty unless `status === 'effective'`. */
  readonly entries: readonly EffectiveNomineeEntry[];
  /**
   * The STALENESS TOKEN a name check is recorded against (AC5). Derived from the status, the
   * determination id, each effective rank's VERSION ID and any disqualification — ⛔ never a name or a
   * hash of one (Trap 4). A new determination, a correction (which supersedes the determination) or a
   * disqualification finding each move it.
   */
  readonly token: string;
}

/** The claim was not found in this Pariwar (the accessor never guesses a deceased member). */
export class EffectiveNomineeDeclarationClaimNotFoundError extends Error {
  public readonly name = 'EffectiveNomineeDeclarationClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[nominee-effective] claim ${claimCaseId} not found in this Pariwar`);
  }
}

/**
 * D6 — does a version whose position in time is `effectiveAt` STAND against a certificate date?
 * It stands iff `effectiveAt` is BEFORE the IST start-of-day of `certificateDate` (`YYYY-MM-DD`): a change
 * on an earlier calendar day stands; the day of death and after are discarded (`-235` Y).
 *
 * ⭐ PURE, and used ONLY to VALIDATE the District Admin's marks (the writer refuses a mark that disagrees)
 * — ⛔ never to pre-select, highlight, label or auto-mark anything (invariant 1, AC3). ⚠ `effectiveAt`,
 * ⛔ not `recorded_at`: a correction inherits the corrected version's position (invariant 5).
 */
export function versionStandsAt(effectiveAt: Date, certificateDate: string): boolean {
  return effectiveAt.getTime() < istMidnightAt(certificateDate).getTime();
}

/** R4 — the split is a function of the effective rank set, ⛔ never of a stored value. */
function derivedSplit(rankCount: number, rank: 1 | 2): 100 | 75 | 25 {
  if (rankCount === 1) return 100;
  return rank === 1 ? 75 : 25;
}

function tokenOf(parts: readonly string[]): string {
  return createHash('sha256')
    .update(`nominee-declaration:v2:${parts.join('|')}`)
    .digest('hex')
    .slice(0, 32);
}

interface RawStanding {
  rank: number;
  version_id: string;
  version_no: number;
  kind: string;
  effective_at: string;
}

type RawRow = {
  claim_case_id: string;
  deceased_member_id: string;
  determination_id: string | null;
  standing: RawStanding[] | null;
  projection_ranks: number[] | null;
  versioned_ranks: number[] | null;
  disqualified_ranks: number[] | null;
  disqualification_ids: string[] | null;
  version_heads: string[] | null;
};

/** Build the effective declaration from one raw row. Pure — exported for the unit tests. */
export function resolveEffectiveNomineeDeclaration(input: {
  claimCaseId: string;
  deceasedMemberId: string;
  determinationId: string | null;
  standing: readonly { rank: number; versionId: string; versionNo: number; kind: string; effectiveAt: Date }[];
  projectionRanks: readonly number[];
  versionedRanks: readonly number[];
  disqualifiedRanks: readonly number[];
  disqualificationIds: readonly string[];
  /** `rank:highest version_no` per versioned rank — folded into the FAIL-CLOSED token only. */
  versionHeads?: readonly string[];
}): EffectiveNomineeDeclaration {
  const base = {
    claimCaseId: input.claimCaseId as ClaimId,
    deceasedMemberId: input.deceasedMemberId as MemberId,
    determinationId: (input.determinationId ?? null) as NomineeDeterminationId | null,
  };
  const disq = [...input.disqualificationIds].sort().join(',');
  const heads = [...(input.versionHeads ?? [])].sort().join(',');
  const failClosed = (status: Exclude<EffectiveNomineeDeclarationStatus, 'effective'>) => ({
    ...base,
    status,
    entries: [],
    token: tokenOf([status, `d=${input.determinationId ?? '-'}`, `x=${disq}`, `h=${heads}`]),
  });

  // D1 — a projection rank with ⛔ no version FAILS CLOSED (⛔ no backfill, ⛔ nothing fabricated).
  if (input.projectionRanks.some((r) => !input.versionedRanks.includes(r))) return failClosed('unversioned');
  if (input.determinationId === null) return failClosed('undetermined');

  // D5 — the highest `stands` version per rank (the SQL already picked it); a vacated one empties the rank.
  const survivors = input.standing
    .filter((s) => s.kind === 'declared')
    // D17(c) — a disqualified nominee is removed before the re-rank.
    .filter((s) => !input.disqualifiedRanks.includes(s.rank))
    .sort((a, b) => a.rank - b.rank);
  if (survivors.length === 0) return failClosed('empty');

  const rankSet = survivors.map((s) => s.rank);
  const isCoherent = rankSet.length === 1 ? rankSet[0] === 1 : rankSet[0] === 1 && rankSet[1] === 2;
  // ⭐ D17(c): a lone rank-2 survivor is legitimate ONLY when rank 1 was disqualified — it is RE-RANKED
  // to rank 1, so there stays exactly ONE definition of a valid declaration ({1} or {1,2}).
  const reRank = !isCoherent && rankSet.length === 1 && rankSet[0] === 2 && input.disqualifiedRanks.includes(1);
  if (!isCoherent && !reRank) return failClosed('incoherent');

  const entries: EffectiveNomineeEntry[] = survivors.map((s, i) => {
    const rank = (reRank ? 1 : s.rank) as 1 | 2;
    return {
      rank,
      declaredRank: s.rank as 1 | 2,
      versionId: s.versionId as NomineeVersionId,
      versionNo: s.versionNo,
      effectiveAt: s.effectiveAt,
      splitPct: derivedSplit(survivors.length, (i === 0 ? 1 : 2) as 1 | 2),
    };
  });
  return {
    ...base,
    status: 'effective',
    entries,
    token: tokenOf([
      'effective',
      `d=${input.determinationId}`,
      ...entries.map((e) => `${e.rank}:${e.versionId}`),
      `x=${disq}`,
    ]),
  };
}

/**
 * The raw read, for ANY number of claims, in ONE statement. Every sub-select is RLS-scoped and carries
 * the explicit `pariwar_id` predicate. Raw SQL with explicit aliases (⛔ never a Drizzle correlated
 * subquery — [[project_epic6_drizzle_correlated_subquery_bug]]).
 */
async function readRaw(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly ClaimId[],
): Promise<RawRow[]> {
  if (claimCaseIds.length === 0) return [];
  const ids = sql.join(
    claimCaseIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const result = await db.execute<RawRow>(sql`
    SELECT c.claim_case_id,
           c.deceased_member_id,
           d.determination_id,
           (
             SELECT json_agg(json_build_object(
                      'rank', s.rank, 'version_id', s.version_id, 'version_no', s.version_no,
                      'kind', s.kind, 'effective_at', s.effective_at))
               FROM (
                 SELECT DISTINCT ON (v.rank) v.rank, v.version_id, v.version_no, v.kind, v.effective_at
                   FROM member_nominee_versions v
                   JOIN nominee_determination_items i
                     ON i.version_id = v.version_id
                    AND i.determination_id = d.determination_id
                    AND i.mark = 'stands'
                  WHERE v.pariwar_id = c.pariwar_id
                    AND v.member_id = c.deceased_member_id
                  ORDER BY v.rank, v.version_no DESC
               ) s
           ) AS standing,
           (
             SELECT array_agg(mn.rank ORDER BY mn.rank)
               FROM member_nominees mn
              WHERE mn.pariwar_id = c.pariwar_id AND mn.member_id = c.deceased_member_id
           ) AS projection_ranks,
           (
             SELECT array_agg(DISTINCT v2.rank)
               FROM member_nominee_versions v2
              WHERE v2.pariwar_id = c.pariwar_id AND v2.member_id = c.deceased_member_id
           ) AS versioned_ranks,
           (
             SELECT array_agg(f.rank ORDER BY f.rank)
               FROM claim_nominee_findings f
              WHERE f.pariwar_id = c.pariwar_id
                AND f.claim_case_id = c.claim_case_id
                AND f.kind = 'nominee_disqualified'
           ) AS disqualified_ranks,
           (
             SELECT array_agg(f2.finding_id::text ORDER BY f2.finding_id)
               FROM claim_nominee_findings f2
              WHERE f2.pariwar_id = c.pariwar_id
                AND f2.claim_case_id = c.claim_case_id
                AND f2.kind = 'nominee_disqualified'
           ) AS disqualification_ids,
           (
             SELECT array_agg(h.rank || ':' || h.head_no ORDER BY h.rank)
               FROM (
                 SELECT v3.rank, max(v3.version_no) AS head_no
                   FROM member_nominee_versions v3
                  WHERE v3.pariwar_id = c.pariwar_id AND v3.member_id = c.deceased_member_id
                  GROUP BY v3.rank
               ) h
           ) AS version_heads
      FROM claims c
      LEFT JOIN nominee_determinations d
        ON d.pariwar_id = c.pariwar_id
       AND d.claim_case_id = c.claim_case_id
       AND d.superseded_at IS NULL
     WHERE c.pariwar_id = ${pariwarId}
       AND c.claim_case_id IN (${ids})
  `);
  return result.rows ?? [];
}

function fromRaw(row: RawRow): EffectiveNomineeDeclaration {
  return resolveEffectiveNomineeDeclaration({
    claimCaseId: row.claim_case_id,
    deceasedMemberId: row.deceased_member_id,
    determinationId: row.determination_id,
    standing: (row.standing ?? []).map((s) => ({
      rank: Number(s.rank),
      versionId: s.version_id,
      versionNo: Number(s.version_no),
      kind: s.kind,
      effectiveAt: new Date(s.effective_at),
    })),
    projectionRanks: (row.projection_ranks ?? []).map(Number),
    versionedRanks: (row.versioned_ranks ?? []).map(Number),
    disqualifiedRanks: (row.disqualified_ranks ?? []).map(Number),
    disqualificationIds: row.disqualification_ids ?? [],
    versionHeads: row.version_heads ?? [],
  });
}

/**
 * The effective declaration of ONE claim — ONE query (D5). ⚠ When its answer gates a write, call it
 * INSIDE the caller's transaction, after the claim row lock (the AC4/AC5 gate posture).
 *
 * @throws EffectiveNomineeDeclarationClaimNotFoundError  the claim is not in this Pariwar
 */
export async function getEffectiveNomineeDeclaration(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<EffectiveNomineeDeclaration> {
  const rows = await readRaw(db, pariwarId, [claimCaseId]);
  const row = rows[0];
  if (!row) throw new EffectiveNomineeDeclarationClaimNotFoundError(claimCaseId);
  return fromRaw(row);
}

/**
 * The effective declarations of MANY claims — still ONE query (D5's bulk form; site F). A claim that is
 * not in this Pariwar is ABSENT from the map; the caller decides what absence means.
 */
export async function getEffectiveNomineeDeclarationBulk(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly ClaimId[],
): Promise<Map<string, EffectiveNomineeDeclaration>> {
  const byClaim = new Map<string, EffectiveNomineeDeclaration>();
  const unique = [...new Set(claimCaseIds.map(String))] as ClaimId[];
  for (const row of await readRaw(db, pariwarId, unique)) {
    byClaim.set(row.claim_case_id, fromRaw(row));
  }
  return byClaim;
}
