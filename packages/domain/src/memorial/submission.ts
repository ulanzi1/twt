// The family memorial's versions — the lock, the chain, the Send decision and the insert (Story 11b.4, MA5 / MA9 / MA13 —
// `#decision-2026-10-24-398`).
//
// ⭐ EVERY write (send / family withdraw / decide / Trust withdraw) takes `lockMemorialPool` inside the scope tx FIRST, and
// only then reads the chain and re-checks the state (MA9). Under READ COMMITTED a second Send waits on the lock, then its
// re-read sees the first's committed row and supersedes it: both return 201 (Trap 12). The unique indexes are a backstop
// that only an UNLOCKED insert can reach (23505 → `409 memorial.try_again`). ⛔ No `FOR UPDATE`: the first Send has ⛔ no
// chain-head row to lock, and the invariant spans three tables — only the pool-keyed advisory lock covers both.
// ⚠ ⛔ No KMS call while holding the lock (footguns #56(b)): encrypt BEFORE the transaction, decrypt AFTER it.
//
// ⭐ The Send's idempotency lives ON the row (migration 0183, BigDev 2026-10-24 "Key on the row"): the phone's
// `Idempotency-Key` is a column of the version, `UNIQUE (pool_id, idempotency_key)`, written by the insert itself. Under the
// lock the writer looks the key up FIRST (`readMemorialSubmissionByIdempotencyKey`) — found ⇒ a replay of that row, at any
// age; a concurrent same-key Send waits on the lock and then finds it. `insertMemorialSubmission` turns a 23505 (an
// UNLOCKED writer reached the index first) into a replay when a row with this key is now there, under a SAVEPOINT so the
// caller's transaction stays usable for the re-read.

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, PoolId } from '../ids/index.js';
import { memberNomineeVersions } from '../schema/member_nominee_versions.js';
import { memorialReviewDecisions, type MemorialReviewDecisionRow } from '../schema/memorial_review_decisions.js';
import {
  memorialSubmissions,
  type MemorialSubmissionInsert,
  type MemorialSubmissionRow,
} from '../schema/memorial_submissions.js';
import { memorialWithdrawals, type MemorialWithdrawalRow } from '../schema/memorial_withdrawals.js';
import { MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION } from './authorisation-copy.js';
import { deriveMemorialChainState, memorialCanSend } from './status.js';
import type { MemorialPhotoMime } from './vocab.js';

/** One version of the memorial with its (at most one) decision and (at most one) withdrawal. */
export interface MemorialChainLink {
  readonly submission: MemorialSubmissionRow;
  readonly decision: MemorialReviewDecisionRow | null;
  readonly withdrawal: MemorialWithdrawalRow | null;
}

/** The pool-keyed transaction lock every memorial write takes FIRST (MA9; the 7.3 `spawn.ts` precedent). */
export async function lockMemorialPool(db: Db, poolId: PoolId): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`memorial:${poolId}`}))`);
}

/**
 * The pool's whole chain, OLDEST → NEWEST, following the supersede links from the root (the partial unique index keeps
 * the root single and `UNIQUE (supersedes_submission_id)` keeps it linear). Tenant-scoped.
 */
export async function readMemorialChain(
  db: Db,
  { pariwarId, poolId }: { readonly pariwarId: PariwarId; readonly poolId: PoolId },
): Promise<MemorialChainLink[]> {
  const subs = await db
    .select()
    .from(memorialSubmissions)
    .where(and(eq(memorialSubmissions.pariwarId, pariwarId), eq(memorialSubmissions.poolId, poolId)))
    .orderBy(asc(memorialSubmissions.createdAt));
  if (subs.length === 0) return [];
  const ids = subs.map((s) => s.submissionId);
  const [decisions, withdrawals] = await Promise.all([
    db
      .select()
      .from(memorialReviewDecisions)
      .where(and(eq(memorialReviewDecisions.pariwarId, pariwarId), inArray(memorialReviewDecisions.submissionId, ids))),
    db
      .select()
      .from(memorialWithdrawals)
      .where(and(eq(memorialWithdrawals.pariwarId, pariwarId), inArray(memorialWithdrawals.submissionId, ids))),
  ]);
  const decisionBy = new Map(decisions.map((d) => [d.submissionId, d]));
  const withdrawalBy = new Map(withdrawals.map((w) => [w.submissionId, w]));
  const successorOf = new Map(subs.filter((s) => s.supersedesSubmissionId !== null).map((s) => [s.supersedesSubmissionId!, s]));
  const ordered: MemorialSubmissionRow[] = [];
  let cursor = subs.find((s) => s.supersedesSubmissionId === null);
  while (cursor !== undefined && ordered.length < subs.length) {
    ordered.push(cursor);
    cursor = successorOf.get(cursor.submissionId);
  }
  // ⚠ A broken chain is unreachable under the constraints; fall back to creation order rather than drop a version.
  const chain = ordered.length === subs.length ? ordered : subs;
  return chain.map((submission) => ({
    submission,
    decision: decisionBy.get(submission.submissionId) ?? null,
    withdrawal: withdrawalBy.get(submission.submissionId) ?? null,
  }));
}


/**
 * MA5 — the rank-1 head of the deceased's nominee declaration history: the latest `member_nominee_versions.version_id`
 * at rank 1 (the PK — ⛔ `member_nominees`, which has ⛔ no id and is re-inserted on every re-declaration). A
 * memorial-local query: `getNomineeVersionHeads` returns only `{ rank, versionNo, kind }` and is ⛔ not edited (AC17).
 * `null` for a pre-0119 projection row with ⛔ no version backfilled — Send then refuses (⛔ never a null ref).
 */
export async function readLatestPrimaryNomineeVersionId(
  db: Db,
  { pariwarId, memberId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId },
): Promise<string | null> {
  const [row] = await db
    .selectDistinctOn([memberNomineeVersions.rank], { versionId: memberNomineeVersions.versionId })
    .from(memberNomineeVersions)
    .where(
      and(
        eq(memberNomineeVersions.pariwarId, pariwarId),
        eq(memberNomineeVersions.memberId, memberId),
        eq(memberNomineeVersions.rank, 1),
      ),
    )
    // ⚠ `DISTINCT ON` requires the leading ORDER BY term to match, or PG raises 42P10.
    .orderBy(asc(memberNomineeVersions.rank), desc(memberNomineeVersions.versionNo));
  return row?.versionId ?? null;
}

/** Why a Send is refused under the lock (each maps to one member code — AC7). */
export type MemorialSendRefusal = 'already_reviewed' | 'authorisation_outdated' | 'no_previous_photo';

export type MemorialSendDecision =
  | { readonly ok: false; readonly refusal: MemorialSendRefusal }
  | {
      readonly ok: true;
      /** The chain head this version supersedes (`null` for the first version). */
      readonly supersedesSubmissionId: string | null;
      /** With `keepPreviousPhoto`: the HEAD's photo (read under the lock, ⛔ never from the client). */
      readonly keptPhoto: { readonly objectKey: string; readonly mime: MemorialPhotoMime } | null;
    };

/**
 * PURE — the Send's checks against the chain read UNDER THE LOCK (AC7's order): `canSend` (MA13) → the echoed
 * permission version is the current one (AC4) → with `keepPreviousPhoto`, the head has a photo (MA8).
 */
export function decideMemorialSend(
  chain: readonly MemorialChainLink[],
  input: { readonly authorisationCopyVersion: string; readonly keepPreviousPhoto: boolean },
): MemorialSendDecision {
  if (!memorialCanSend(deriveMemorialChainState(chain))) return { ok: false, refusal: 'already_reviewed' };
  if (input.authorisationCopyVersion !== MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION) {
    return { ok: false, refusal: 'authorisation_outdated' };
  }
  const head = chain.length === 0 ? null : chain[chain.length - 1]!.submission;
  let keptPhoto: { objectKey: string; mime: MemorialPhotoMime } | null = null;
  if (input.keepPreviousPhoto) {
    if (head === null || head.photoObjectKey === null || head.photoMime === null) {
      return { ok: false, refusal: 'no_previous_photo' };
    }
    keptPhoto = { objectKey: head.photoObjectKey, mime: head.photoMime };
  }
  return { ok: true, supersedesSubmissionId: head?.submissionId ?? null, keptPhoto };
}

/** The version a Send with this `Idempotency-Key` wrote in this pool, or `null` (0183 — the replay lookup). Tenant-scoped. */
export async function readMemorialSubmissionByIdempotencyKey(
  db: Db,
  {
    pariwarId,
    poolId,
    idempotencyKey,
  }: { readonly pariwarId: PariwarId; readonly poolId: PoolId; readonly idempotencyKey: string },
): Promise<MemorialSubmissionRow | null> {
  const [row] = await db
    .select()
    .from(memorialSubmissions)
    .where(
      and(
        eq(memorialSubmissions.pariwarId, pariwarId),
        eq(memorialSubmissions.poolId, poolId),
        eq(memorialSubmissions.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** What `insertMemorialSubmission` did: wrote a NEW version, or found the one this key already wrote (a replay). */
export type MemorialSubmissionWrite =
  | { readonly kind: 'inserted'; readonly row: MemorialSubmissionRow }
  | { readonly kind: 'replay'; readonly row: MemorialSubmissionRow };

/** A Postgres unique-violation on the direct code OR `err.cause.code` (drizzle wraps the pg error). */
function isUniqueViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const direct = (err as { code?: unknown }).code;
  const cause = (err as { cause?: { code?: unknown } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/**
 * Insert ONE version (the authorisation columns AND the Send's Idempotency-Key in the SAME row — indivisible, AC4 / 0183).
 * Runs inside the caller's locked scope tx, under a SAVEPOINT: a 23505 rolls back to it (the caller's tx stays usable — ⛔
 * `db.transaction()`, which would COMMIT the caller's tx early) and the key is re-read — a row with this key is now there
 * (an UNLOCKED writer with the same key won the index) ⇒ `{ kind: 'replay' }`; none (another index fired — the chain's
 * `supersedes_uq` / `pool_root_uq`) ⇒ the 23505 is rethrown for the caller's `409 memorial.try_again`.
 */
export async function insertMemorialSubmission(
  db: Db,
  values: Omit<MemorialSubmissionInsert, 'submissionId' | 'createdAt' | 'idempotencyKey'> & { readonly idempotencyKey: string },
): Promise<MemorialSubmissionWrite> {
  await db.execute(sql`SAVEPOINT memorial_submission_insert`);
  try {
    const [row] = await db.insert(memorialSubmissions).values(values).returning();
    await db.execute(sql`RELEASE SAVEPOINT memorial_submission_insert`);
    return { kind: 'inserted', row: row! };
  } catch (err) {
    await db.execute(sql`ROLLBACK TO SAVEPOINT memorial_submission_insert`);
    if (isUniqueViolation(err)) {
      const existing = await readMemorialSubmissionByIdempotencyKey(db, {
        pariwarId: values.pariwarId,
        poolId: values.poolId,
        idempotencyKey: values.idempotencyKey,
      });
      if (existing !== null) return { kind: 'replay', row: existing };
    }
    throw err;
  }
}
