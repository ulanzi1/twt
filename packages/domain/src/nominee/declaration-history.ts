// The nominee declaration HISTORY — append + read (Story 6.20, Task 2; D1, D2, D16; AC1, T9).
// Transport-free: NO HTTP, NO audit, NO encryption, NO event emission — the route orchestrates.
//
// ⭐ WHAT IT DOES. Every declare appends ONE version per SUBMITTED rank to `member_nominee_versions`
// (⛔ no dedup — T3: Tier-1 ciphertext is non-deterministic, and 6.18's Trap 4 forbids a name hash, so
// "did this rank change?" is unanswerable and every submit is recorded), plus a `vacated` TOMBSTONE for
// a rank the submit dropped (a 2→1 change — T9). Without the tombstone, "revert rank 2 to its earlier
// version" is undefined and per-nominee reversion (invariant 4) breaks.
//
// ⛔⛔ THIS MODULE MUST NEVER IMPORT FROM `../claim/` (T5(a)). `claim/` imports `nominee/` (e.g.
// `claim/nominee-correction-persist.ts` → this module, `declaration-write.js`, `relationship.js`); a
// `nominee/` → `claim/` edge would form a runtime init cycle that
// typecheck cannot see ([[project_type_only_import_cycle_trap]]). The claim-filed LOCK lives in
// `claim/nominee-lock.ts` and is COMPOSED with this module in the API handler.
//
// ⛔ AND IT COMPARES NO NAME (invariant 6): versions are ranks, numbers, timestamps and ciphertext AS
// STORED. Nothing here decrypts.

import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, NomineeVersionId, PariwarId } from '../ids/index.js';
import {
  type MemberNomineeVersionRow,
  type NomineeVersionKind,
  memberNomineeVersions,
} from '../schema/member_nominee_versions.js';
import { memberNominees } from '../schema/member_nominees.js';
import type { NomineeRowInput } from './declaration-write.js';

/** The two ranks a declaration can occupy. */
export const NOMINEE_RANKS = [1, 2] as const;
export type NomineeRank = (typeof NOMINEE_RANKS)[number];

/** One rank's head of chain: its highest `version_no` and that version's kind. */
export interface NomineeVersionHead {
  readonly rank: NomineeRank;
  readonly versionNo: number;
  readonly kind: NomineeVersionKind;
}

/**
 * The per-rank HEAD of a member's version chain — the highest `version_no` per rank, with its kind.
 * A rank that was never declared is ABSENT from the result. Tenant-scoped (RLS + explicit predicate).
 *
 * ⚠ Call it AFTER the D3 advisory lock when the answer drives a write: the lock is what makes "the next
 * version number" stable, and the UNIQUE `(member_id, rank, version_no)` index is only the backstop.
 */
export async function getNomineeVersionHeads(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<NomineeVersionHead[]> {
  const rows = await db
    .selectDistinctOn([memberNomineeVersions.rank], {
      rank: memberNomineeVersions.rank,
      versionNo: memberNomineeVersions.versionNo,
      kind: memberNomineeVersions.kind,
    })
    .from(memberNomineeVersions)
    .where(
      and(eq(memberNomineeVersions.pariwarId, pariwarId), eq(memberNomineeVersions.memberId, memberId)),
    )
    // ⚠ `DISTINCT ON` requires the leading ORDER BY term to match, or PG raises 42P10.
    .orderBy(asc(memberNomineeVersions.rank), desc(memberNomineeVersions.versionNo));
  return rows.map((r) => ({ rank: r.rank as NomineeRank, versionNo: r.versionNo, kind: r.kind }));
}

/** Does the member have ANY version — i.e. is the next declare a RE-declaration (D9)? */
export async function hasNomineeDeclarationVersion(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(memberNomineeVersions)
    .where(
      and(eq(memberNomineeVersions.pariwarId, pariwarId), eq(memberNomineeVersions.memberId, memberId)),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Every version of a member's declaration, rank then `version_no` ascending — the TIMELINE's source
 * (D10). Ciphertext AS STORED; the caller decrypts only after authorization, and only on demand.
 */
export async function listNomineeDeclarationVersions(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberNomineeVersionRow[]> {
  return db
    .select()
    .from(memberNomineeVersions)
    .where(
      and(eq(memberNomineeVersions.pariwarId, pariwarId), eq(memberNomineeVersions.memberId, memberId)),
    )
    .orderBy(asc(memberNomineeVersions.rank), asc(memberNomineeVersions.versionNo));
}

/**
 * The RANKS present in the member's CURRENT projection (`member_nominees`) — ⛔ no ciphertext. The
 * D1 fail-closed check ("a projection rank with ⛔ no version") needs only these, so it asks for only
 * these (Trap 4 — a name is never read where it is not needed).
 */
export async function getMemberNomineeProjectionRanks(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<number[]> {
  const rows = await db
    .select({ rank: memberNominees.rank })
    .from(memberNominees)
    .where(and(eq(memberNominees.pariwarId, pariwarId), eq(memberNominees.memberId, memberId)))
    .orderBy(asc(memberNominees.rank));
  return rows.map((r) => r.rank);
}

/**
 * The versions with these ids, in this Pariwar — how a caller that holds the EFFECTIVE declaration's
 * version ids (Story 6.20, AC5 site C) reaches their ciphertext, ⛔ never the current rows. Ciphertext AS
 * STORED; decrypt only after authorization. Unknown ids are simply absent.
 */
export async function getNomineeVersionsByIds(
  db: Db,
  pariwarId: PariwarId,
  versionIds: readonly string[],
): Promise<MemberNomineeVersionRow[]> {
  if (versionIds.length === 0) return [];
  return db
    .select()
    .from(memberNomineeVersions)
    .where(
      and(
        eq(memberNomineeVersions.pariwarId, pariwarId),
        inArray(memberNomineeVersions.versionId, [...versionIds] as NomineeVersionId[]),
      ),
    );
}

/** One rank's PROJECTED version — the version the family's `member_nominees` row was last written from. */
export interface ProjectedNomineeVersion {
  readonly rank: NomineeRank;
  readonly versionId: NomineeVersionId;
}

/**
 * Walk ONE rank's versions (in `version_no` order) to the version its `member_nominees` row was last written
 * from (Story 6.19a W1). Pure — exported for the unit tests.
 *   · a `member` version always becomes the projected one (a declare rewrites the row — or, when `vacated`,
 *     removes it);
 *   · a `correction` becomes it ONLY when its `corrects_version_id` is the version immediately before it —
 *     i.e. it corrected the rank's HEAD. `nominee-correction-persist.ts` updates the projection in exactly
 *     that case (*"The projection row is updated ONLY when it IS the corrected declaration"*); a correction
 *     of an OLDER version takes `version_no` head + 1 but leaves the row — and so this answer — alone.
 * Returns `null` when the projected version is a `vacated` tombstone (the rank is empty) or there is none.
 * ⛔ NEVER "the highest `version_no`" — that is exactly the version the family may ⛔ not be seeing.
 */
export function projectedVersionOfRank(
  versionsInOrder: readonly Pick<MemberNomineeVersionRow, 'versionId' | 'versionNo' | 'kind' | 'source' | 'correctsVersionId'>[],
): NomineeVersionId | null {
  let projected: (typeof versionsInOrder)[number] | null = null;
  let previous: (typeof versionsInOrder)[number] | null = null;
  for (const v of versionsInOrder) {
    if (v.source === 'member') {
      projected = v;
    } else if (previous !== null && v.correctsVersionId === previous.versionId) {
      projected = v;
    }
    previous = v;
  }
  return projected !== null && projected.kind === 'declared' ? projected.versionId : null;
}

/**
 * The PROJECTED version of every occupied rank of a member's declaration (Story 6.19a W1) — what the family
 * sees in `nomineesStatus()`. Rank-ordered; an empty rank is absent. ⛔ No ciphertext is returned.
 */
export async function getProjectedNomineeVersions(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<ProjectedNomineeVersion[]> {
  const rows = await listNomineeDeclarationVersions(db, pariwarId, memberId);
  const out: ProjectedNomineeVersion[] = [];
  for (const rank of NOMINEE_RANKS) {
    const versionId = projectedVersionOfRank(rows.filter((r) => r.rank === rank));
    if (versionId !== null) out.push({ rank, versionId });
  }
  return out;
}

/**
 * The DATABASE wall-clock instant, taken NOW (D2).
 *
 * ⭐ `clock_timestamp()`, ⛔ not `now()`: `now()` is the transaction START, so a transaction that waited
 * on the D3 advisory lock could be stamped before midnight and commit after it — the one case where the
 * day of a change is exactly what the as-at-death rule turns on. ⛔ Not an application clock either
 * (arch §1.11). ⚠ MUST be called AFTER the advisory lock is held.
 *
 * ⚠ The value comes back as a JS `Date` (millisecond precision). It is used for BOTH `recorded_at` and
 * `effective_at`, so the two stay equal (the migration's CHECK requires it for a member's own version),
 * and truncation can only move an instant EARLIER within the same millisecond — it can never carry a
 * change made at or after an IST midnight back across it (midnight is a whole millisecond).
 */
export async function readDatabaseClock(db: Db): Promise<Date> {
  const rows = await db.execute<{ at: Date | string }>(sql`SELECT clock_timestamp() AS at`);
  const at = rows.rows?.[0]?.at;
  if (at === undefined) throw new Error('[declaration-history] clock_timestamp() returned no row');
  return at instanceof Date ? at : new Date(at);
}

/** One rank's planned version (its number and kind) — computed BEFORE the event is emitted. */
export interface PlannedNomineeVersion {
  readonly rank: NomineeRank;
  readonly versionNo: number;
  readonly kind: NomineeVersionKind;
}

/**
 * Plan the versions a member-sourced declare will append, from the current heads:
 *   · one `declared` version per SUBMITTED rank (⛔ no dedup — T3);
 *   · one `vacated` TOMBSTONE for a rank whose head is `declared` but which this submit dropped (T9).
 *     A rank already vacated (or never declared) gets ⛔ no second tombstone.
 *
 * Pure. The caller emits `member.nominees_declared` carrying these numbers, then appends.
 */
export function planDeclarationVersions(
  heads: readonly NomineeVersionHead[],
  submittedRanks: readonly NomineeRank[],
): PlannedNomineeVersion[] {
  const next = (rank: NomineeRank) => (heads.find((h) => h.rank === rank)?.versionNo ?? 0) + 1;
  const planned: PlannedNomineeVersion[] = submittedRanks.map((rank) => ({
    rank,
    versionNo: next(rank),
    kind: 'declared',
  }));
  for (const head of heads) {
    if (!submittedRanks.includes(head.rank) && head.kind === 'declared') {
      planned.push({ rank: head.rank, versionNo: head.versionNo + 1, kind: 'vacated' });
    }
  }
  return planned.sort((a, b) => a.rank - b.rank);
}

export interface AppendMemberDeclarationVersionsInput {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  /** The plan `planDeclarationVersions` produced (and the event carried). */
  readonly plan: readonly PlannedNomineeVersion[];
  /** The submitted, pre-encrypted rows (rank + split already server-stamped — R4). */
  readonly nominees: readonly NomineeRowInput[];
  /** `readDatabaseClock` taken after the D3 lock — both `recorded_at` and `effective_at` (D2, D6). */
  readonly recordedAt: Date;
  /** The `member.nominees_declared` event this declare wrote (`null` only for a test fixture that seeds
   *  a declaration without the member stream — ⛔ never on a production path). */
  readonly eventVersion: number | null;
}

/**
 * Append a MEMBER-sourced declare's versions, in the caller's transaction (the same one that writes
 * `member_nominees` — AC1). One `declaration_id` groups them. Returns the inserted rows, rank-ordered.
 * ⛔ Never UPDATEs or DELETEs (the grant and the 0119 trigger both refuse it).
 */
export async function appendMemberDeclarationVersions(
  db: Db,
  input: AppendMemberDeclarationVersionsInput,
): Promise<MemberNomineeVersionRow[]> {
  const declarationId = randomUUID();
  const values = input.plan.map((p) => {
    if (p.kind === 'vacated') {
      return {
        memberId: input.memberId,
        pariwarId: input.pariwarId,
        rank: p.rank,
        versionNo: p.versionNo,
        declarationId,
        kind: 'vacated' as const,
        source: 'member' as const,
        nameCiphertext: null,
        relationship: null,
        mobileCiphertext: null,
        addressCiphertext: null,
        splitPct: null,
        recordedAt: input.recordedAt,
        effectiveAt: input.recordedAt,
        eventVersion: input.eventVersion,
      };
    }
    const n = input.nominees.find((row) => row.rank === p.rank);
    if (!n) {
      throw new Error(`[declaration-history] planned rank ${p.rank} has no submitted nominee row`);
    }
    return {
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      rank: p.rank,
      versionNo: p.versionNo,
      declarationId,
      kind: 'declared' as const,
      source: 'member' as const,
      nameCiphertext: n.nameCiphertext,
      relationship: n.relationship,
      mobileCiphertext: n.mobileCiphertext,
      addressCiphertext: n.addressCiphertext ?? null,
      splitPct: n.splitPct,
      recordedAt: input.recordedAt,
      effectiveAt: input.recordedAt,
      eventVersion: input.eventVersion,
    };
  });
  const inserted = await db.insert(memberNomineeVersions).values(values).returning();
  if (inserted.length !== values.length) {
    throw new Error('[declaration-history] insert returned fewer rows than planned — check session scope');
  }
  return inserted.sort((a, b) => a.rank - b.rank);
}
