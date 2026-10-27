// The helpline's take-down of a family memorial at the nominee's request — the domain half (Story 11b.4a, Task 3.3;
// `#decision-2026-10-27-412` MP6–MP9, MP12, MP14; the Panel's `-392` item 4, `-393` M1 / M4, `-395` item 3, `-411` items 1, 4).
//
// ⭐ ONLY THE NOMINEE WHO SENT IT may ask (`-395` item 3, `-411` item 1): the request is recorded only after the operator calls
// back the nominee recorded on the SHOWN version (MP7) — the request snapshots that version (`submission_id`) and its nominee
// (`handover_nominee_ref`). A request verified against one version is ⛔ not a request about another (MP8 (c)).
// ⭐ WHAT A TAKE-DOWN DOES (MP8 (a)): under the pool lock, a `helpline` withdrawal on EVERY version of the chain that has none yet —
// the shown one, every older un-withdrawn approval (Trap 1 — else `latestApprovedIndex` falls back to it) and any newer version
// still with the Trust or not approved — so nothing returns without a NEW Send. ⛔ No email row is written here: the jobs sweep
// derives the approver pairs from the outcome (MP10).
// ⭐ EVERY writer takes `lockMemorialPool` FIRST (the 11b.4 MA9 lock), then re-reads the chain: a take-down racing a Send, a family
// Withdraw, a review decision or a Trust withdraw-approval is serialised by it.
// ⭐ ERASED ⇒ INVISIBLE (Trap 4, AC13): `anonymizeMember` keeps the deceased's `mobile_blind_index` and every withdrawal, so the
// lookup would still find an erased member and `latestApprovedIndex` would still be ≥ 0 — every read here checks
// `members.state = 'anonymized'` and answers as if ⛔ no memorial existed.
// ⛔ Nothing here decrypts (the API does, after the transaction). ⛔ No family text is ever written.

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, PoolId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { memberNomineeVersions } from '../schema/member_nominee_versions.js';
import { members } from '../schema/members.js';
import { memorialSubmissions } from '../schema/memorial_submissions.js';
import {
  memorialTakedownOutcomes,
  memorialTakedownRequests,
  type MemorialTakedownOutcomeRow,
  type MemorialTakedownRequestRow,
} from '../schema/memorial_takedown_requests.js';
import { memorialWithdrawals } from '../schema/memorial_withdrawals.js';
import { pools } from '../schema/pools.js';
import { shownMemorialLink } from './public-read.js';
import { lockMemorialPool, readLatestPrimaryNomineeVersionId, readMemorialChain, type MemorialChainLink } from './submission.js';
import { MEMORIAL_TAKEDOWN_VERIFIED_BY, type MemorialTakedownOutcome } from './vocab.js';

/** A request with its outcome (`null` while open). */
export interface MemorialTakedownRequestWithOutcome {
  readonly request: MemorialTakedownRequestRow;
  readonly outcome: MemorialTakedownOutcomeRow | null;
}

/** Is the deceased member of this chain ERASED (Trap 4)? `true` also when the member row is missing (fail closed). */
async function isDeceasedErased(db: Db, pariwarId: PariwarId, deceasedMemberId: string): Promise<boolean> {
  const [row] = await db
    .select({ state: members.state })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), eq(members.memberId, deceasedMemberId as MemberId)))
    .limit(1);
  return row === undefined || row.state === 'anonymized';
}

/** The pool's requests (oldest first) with their outcomes. */
export async function readMemorialTakedownRequests(
  db: Db,
  { pariwarId, poolId }: { readonly pariwarId: PariwarId; readonly poolId: PoolId },
): Promise<MemorialTakedownRequestWithOutcome[]> {
  const rows = await db
    .select({ request: memorialTakedownRequests, outcome: memorialTakedownOutcomes })
    .from(memorialTakedownRequests)
    .leftJoin(
      memorialTakedownOutcomes,
      and(
        eq(memorialTakedownOutcomes.pariwarId, memorialTakedownRequests.pariwarId),
        eq(memorialTakedownOutcomes.requestId, memorialTakedownRequests.requestId),
      ),
    )
    .where(and(eq(memorialTakedownRequests.pariwarId, pariwarId), eq(memorialTakedownRequests.poolId, poolId)))
    .orderBy(asc(memorialTakedownRequests.receivedAt));
  return rows.map((r) => ({ request: r.request, outcome: r.outcome }));
}

// ── MP12 — the operator finds the memorial by the deceased member ───────────────────────────────────────────────────────────

export interface MemberMemorialDrive {
  readonly poolId: PoolId;
  readonly poolCanonicalIdentifier: string;
  readonly hasOpenRequest: boolean;
}

/**
 * The deceased member's drives that carry a SHOWN memorial (11b.4 R28: more than one closed pool can exist), oldest first by the
 * pool's first version. `[]` for an erased member (Trap 4) and for a member with ⛔ no memorial — ⛔ never a list of every
 * published memorial.
 */
export async function listMemberMemorialDrives(
  db: Db,
  { pariwarId, memberId }: { readonly pariwarId: PariwarId; readonly memberId: MemberId },
): Promise<MemberMemorialDrive[]> {
  if (await isDeceasedErased(db, pariwarId, memberId)) return [];
  const poolRows = await db
    .selectDistinctOn([memorialSubmissions.poolId], {
      poolId: memorialSubmissions.poolId,
      firstAt: memorialSubmissions.createdAt,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
    })
    .from(memorialSubmissions)
    .innerJoin(pools, and(eq(pools.pariwarId, memorialSubmissions.pariwarId), eq(pools.poolId, memorialSubmissions.poolId)))
    .where(and(eq(memorialSubmissions.pariwarId, pariwarId), eq(memorialSubmissions.deceasedMemberId, memberId)))
    .orderBy(asc(memorialSubmissions.poolId), asc(memorialSubmissions.createdAt));
  poolRows.sort((a, b) => a.firstAt.getTime() - b.firstAt.getTime());
  const out: MemberMemorialDrive[] = [];
  for (const p of poolRows) {
    const poolId = p.poolId as PoolId;
    const chain = await readMemorialChain(db, { pariwarId, poolId });
    if (shownMemorialLink(chain) === null) continue;
    const requests = await readMemorialTakedownRequests(db, { pariwarId, poolId });
    out.push({
      poolId,
      poolCanonicalIdentifier: p.poolCanonicalIdentifier,
      hasOpenRequest: requests.some((r) => r.outcome === null),
    });
  }
  return out;
}

// ── The drive view (AC6) ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface MemorialTakedownDriveRead {
  readonly poolId: PoolId;
  readonly poolCanonicalIdentifier: string;
  readonly chain: readonly MemorialChainLink[];
  /** The version on the page, or `null` (⛔ none — e.g. after a take-down). */
  readonly shown: MemorialChainLink | null;
  /** The nominee recorded on the SHOWN version (MP7) — ciphertexts AS STORED; `null` when ⛔ nothing is shown or the row is gone. */
  readonly shownNominee: { readonly nameCiphertext: string | null; readonly mobileCiphertext: string | null } | null;
  /**
   * The deceased's CURRENT rank-1 nominee version (who sends any new version — their `claim_handover` step-up, MP8 (b)), with
   * its name ciphertext; `null` when ⛔ none resolves.
   */
  readonly currentNominee: { readonly versionId: string; readonly nameCiphertext: string | null } | null;
  readonly requests: readonly MemorialTakedownRequestWithOutcome[];
}

/**
 * The operator's drive view. `null` (⇒ `404 memorial_takedown.not_found`) when the pool has ⛔ no memorial, the deceased is
 * ERASED (Trap 4), or ⛔ nothing is shown AND ⛔ no request was ever recorded (a drive's history stays readable after a take-down,
 * so a decided request can be seen — AC7's "decided after the due date").
 */
export async function readMemorialTakedownDrive(
  db: Db,
  { pariwarId, poolId }: { readonly pariwarId: PariwarId; readonly poolId: PoolId },
): Promise<MemorialTakedownDriveRead | null> {
  const chain = await readMemorialChain(db, { pariwarId, poolId });
  if (chain.length === 0) return null;
  if (await isDeceasedErased(db, pariwarId, chain[0]!.submission.deceasedMemberId)) return null;
  const shown = shownMemorialLink(chain);
  const requests = await readMemorialTakedownRequests(db, { pariwarId, poolId });
  if (shown === null && requests.length === 0) return null;
  const [pool] = await db
    .select({ poolCanonicalIdentifier: pools.poolCanonicalIdentifier })
    .from(pools)
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.poolId, poolId)))
    .limit(1);
  const versionRow = async (versionId: string) =>
    (
      await db
        .select({ nameCiphertext: memberNomineeVersions.nameCiphertext, mobileCiphertext: memberNomineeVersions.mobileCiphertext })
        .from(memberNomineeVersions)
        .where(and(eq(memberNomineeVersions.pariwarId, pariwarId), sql`${memberNomineeVersions.versionId} = ${versionId}::uuid`))
        .limit(1)
    )[0] ?? null;
  const shownNominee = shown === null ? null : await versionRow(shown.submission.handoverNomineeRef);
  const currentVersionId = await readLatestPrimaryNomineeVersionId(db, {
    pariwarId,
    memberId: chain[0]!.submission.deceasedMemberId as MemberId,
  });
  const currentNominee =
    currentVersionId === null
      ? null
      : { versionId: currentVersionId, nameCiphertext: (await versionRow(currentVersionId))?.nameCiphertext ?? null };
  return {
    poolId,
    poolCanonicalIdentifier: pool?.poolCanonicalIdentifier ?? '',
    chain,
    shown,
    shownNominee,
    currentNominee,
    requests,
  };
}

// ── Recording a request (AC6) ───────────────────────────────────────────────────────────────────────────────────────────────

export type RecordMemorialTakedownRequestResult =
  | { readonly ok: true; readonly request: MemorialTakedownRequestRow }
  | { readonly ok: false; readonly refusal: 'not_found' | 'shown_changed' | 'request_open' };

/**
 * ⭐ Record a request the operator verified by calling the nominee back (MP7) — UNDER THE POOL LOCK, in the caller's scope
 * transaction. Refused: ⛔ no shown memorial or an erased deceased (`not_found` — the neutral 404); the version on the page is
 * ⛔ the one the operator was looking at (`shown_changed` — R1: the call-back was to THAT version's nominee, so the request is
 * never snapshotted against a newer one, exactly as `decide` refuses a `taken_down` on a changed version, MP8 (c)); an open
 * request for the drive already (`request_open` — "one open request per drive" lives HERE, ⛔ not in an index: openness is the
 * outcome table's). `shownSubmissionId` is compared with the chain RE-READ under the lock, so a version approved between the
 * operator's drive view and this write is seen. `due_at` is computed by the DB from `first_contact_at` (0187's CHECK:
 * `+ 168 hours`). The 7-day bound on `firstContactAt` is the caller's 400 FIRST and 0187's CHECK as the backstop.
 */
export async function recordMemorialTakedownRequest(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly poolId: PoolId;
    /** The version the operator was LOOKING AT when they called the nominee back — the drive view's `shown.submissionId`. */
    readonly shownSubmissionId: string;
    readonly firstContactAt: Date;
    readonly actorId: UserId;
    readonly actorDisplay: string;
  },
): Promise<RecordMemorialTakedownRequestResult> {
  const { pariwarId, poolId } = input;
  await lockMemorialPool(db, poolId);
  const chain = await readMemorialChain(db, { pariwarId, poolId });
  const shown = shownMemorialLink(chain);
  if (shown === null) return { ok: false, refusal: 'not_found' };
  if (await isDeceasedErased(db, pariwarId, shown.submission.deceasedMemberId)) return { ok: false, refusal: 'not_found' };
  if (shown.submission.submissionId !== input.shownSubmissionId) return { ok: false, refusal: 'shown_changed' };
  const requests = await readMemorialTakedownRequests(db, { pariwarId, poolId });
  if (requests.some((r) => r.outcome === null)) return { ok: false, refusal: 'request_open' };
  const [request] = await db
    .insert(memorialTakedownRequests)
    .values({
      pariwarId,
      poolId,
      submissionId: shown.submission.submissionId,
      handoverNomineeRef: shown.submission.handoverNomineeRef,
      verifiedBy: MEMORIAL_TAKEDOWN_VERIFIED_BY,
      firstContactAt: input.firstContactAt,
      dueAt: sql`${input.firstContactAt.toISOString()}::timestamptz + interval '168 hours'`,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
    })
    .returning();
  return { ok: true, request: request! };
}

/** One request by id (tenant-scoped), with its outcome. */
export async function readMemorialTakedownRequest(
  db: Db,
  { pariwarId, requestId }: { readonly pariwarId: PariwarId; readonly requestId: string },
): Promise<MemorialTakedownRequestWithOutcome | null> {
  const [row] = await db
    .select({ request: memorialTakedownRequests, outcome: memorialTakedownOutcomes })
    .from(memorialTakedownRequests)
    .leftJoin(
      memorialTakedownOutcomes,
      and(
        eq(memorialTakedownOutcomes.pariwarId, memorialTakedownRequests.pariwarId),
        eq(memorialTakedownOutcomes.requestId, memorialTakedownRequests.requestId),
      ),
    )
    .where(and(eq(memorialTakedownRequests.pariwarId, pariwarId), eq(memorialTakedownRequests.requestId, requestId)))
    .limit(1);
  return row ? { request: row.request, outcome: row.outcome } : null;
}

// ── Deciding the request (AC7) ──────────────────────────────────────────────────────────────────────────────────────────────

export type DecideMemorialTakedownResult =
  | {
      readonly ok: true;
      readonly outcome: MemorialTakedownOutcomeRow;
      /** The versions this take-down withdrew (`[]` for `kept` / `superseded`). */
      readonly withdrawnSubmissionIds: readonly string[];
      readonly poolId: PoolId;
    }
  | { readonly ok: false; readonly refusal: 'not_found' | 'already_decided' | 'shown_changed' | 'shown_unchanged' };

/**
 * ⭐ Decide an open request — UNDER THE POOL LOCK, one transaction (the caller's scope tx). The chain is RE-READ (MP8 (c)):
 *   · `taken_down` — only while the shown version is still the request's (else `shown_changed`): one outcome row and a `helpline`
 *     withdrawal on EVERY version without one (MP8 (a), Trap 1);
 *   · `superseded` — only when the shown version CHANGED (else `shown_unchanged`): ⛔ no public change;
 *   · `kept` — always: ⛔ no public change.
 * A second outcome is `already_decided` (the outcomes PK is the backstop). An outcome after `due_at` is still accepted (AC7).
 */
export async function decideMemorialTakedown(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly requestId: string;
    readonly outcome: MemorialTakedownOutcome;
    readonly actorId: UserId;
    readonly actorDisplay: string;
  },
): Promise<DecideMemorialTakedownResult> {
  const { pariwarId } = input;
  const before = await readMemorialTakedownRequest(db, { pariwarId, requestId: input.requestId });
  if (before === null) return { ok: false, refusal: 'not_found' };
  const poolId = before.request.poolId as PoolId;
  await lockMemorialPool(db, poolId);
  const current = await readMemorialTakedownRequest(db, { pariwarId, requestId: input.requestId });
  if (current === null) return { ok: false, refusal: 'not_found' };
  if (current.outcome !== null) return { ok: false, refusal: 'already_decided' };
  const chain = await readMemorialChain(db, { pariwarId, poolId });
  const shown = shownMemorialLink(chain);
  const changed = shown === null || shown.submission.submissionId !== current.request.submissionId;
  if (input.outcome === 'taken_down' && changed) return { ok: false, refusal: 'shown_changed' };
  if (input.outcome === 'superseded' && !changed) return { ok: false, refusal: 'shown_unchanged' };

  const [outcome] = await db
    .insert(memorialTakedownOutcomes)
    .values({
      requestId: current.request.requestId,
      pariwarId,
      outcome: input.outcome,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
    })
    .returning();

  const withdrawnSubmissionIds: string[] = [];
  if (input.outcome === 'taken_down') {
    const open = chain.filter((l) => l.withdrawal === null).map((l) => l.submission.submissionId);
    if (open.length > 0) {
      await db.insert(memorialWithdrawals).values(
        open.map((submissionId) => ({
          submissionId,
          pariwarId,
          withdrawnBy: 'helpline' as const,
          reasonCode: null,
          internalNoteCiphertext: null,
          actorId: input.actorId,
          actorDisplay: input.actorDisplay,
          takedownRequestId: current.request.requestId,
        })),
      );
      withdrawnSubmissionIds.push(...open);
    }
  }
  return { ok: true, outcome: outcome!, withdrawnSubmissionIds, poolId };
}

// ── The open-request list (AC10) and the overdue watch (MP14) ───────────────────────────────────────────────────────────────

export interface OpenMemorialTakedownRequest {
  readonly request: MemorialTakedownRequestRow;
  readonly poolCanonicalIdentifier: string;
}

/**
 * The open-request list's page size (review R17) — a FIXED bound, ⛔ no caller-supplied page (the screen is a work list, ⛔ not a
 * browser). One open request per drive keeps a real Pariwar's list in single digits; the bound is the backstop.
 */
const OPEN_REQUESTS_LIMIT = { default: 200, cap: 200 } as const;

/**
 * Every OPEN request of the Pariwar, OLDEST FIRST (by `due_at`, i.e. by the nominee's first contact), at most
 * `OPEN_REQUESTS_LIMIT`. Tenant-scoped. ⭐ An ERASED deceased's request is ⛔ listed (R15, AC13): erasure already removes the
 * memorial from the page and its drive view is the neutral 404, so the request is moot. ⚠ Excluded ONLY when the deceased member's
 * row EXISTS and is anonymized — ⛔ never merely because the row is missing (the foreign key makes that impossible, and a list that
 * under-counts over a shape it cannot name reads as "nothing is open"). The joins are 1:1 (a request names ONE submission, which
 * names ONE deceased member), so ⛔ no row fans out.
 * ⚠ TRUNCATION COST: past the bound the LEAST urgent requests (latest `due_at`) fall off the list — each is still reachable
 * through its drive (the member lookup), and the overdue watch below counts every one (it is ⛔ clamped).
 */
export async function listOpenMemorialTakedownRequests(
  db: Db,
  { pariwarId, limit }: { readonly pariwarId: PariwarId; readonly limit?: number | undefined },
): Promise<OpenMemorialTakedownRequest[]> {
  const rows = await db
    .select({ request: memorialTakedownRequests, poolCanonicalIdentifier: pools.poolCanonicalIdentifier })
    .from(memorialTakedownRequests)
    .innerJoin(pools, and(eq(pools.pariwarId, memorialTakedownRequests.pariwarId), eq(pools.poolId, memorialTakedownRequests.poolId)))
    .innerJoin(
      memorialSubmissions,
      and(
        eq(memorialSubmissions.pariwarId, memorialTakedownRequests.pariwarId),
        eq(memorialSubmissions.submissionId, memorialTakedownRequests.submissionId),
      ),
    )
    .leftJoin(members, and(eq(members.pariwarId, memorialSubmissions.pariwarId), eq(members.memberId, memorialSubmissions.deceasedMemberId)))
    .leftJoin(
      memorialTakedownOutcomes,
      and(
        eq(memorialTakedownOutcomes.pariwarId, memorialTakedownRequests.pariwarId),
        eq(memorialTakedownOutcomes.requestId, memorialTakedownRequests.requestId),
      ),
    )
    .where(and(eq(memorialTakedownRequests.pariwarId, pariwarId), isNull(memorialTakedownOutcomes.requestId), sql`${members.state} IS DISTINCT FROM 'anonymized'`))
    .orderBy(asc(memorialTakedownRequests.dueAt), asc(memorialTakedownRequests.requestId))
    .limit(clampLimit(limit, OPEN_REQUESTS_LIMIT));
  return rows;
}

/** Is an open request overdue at `now`? (Derived — ⛔ never stored; the helpdesk `sla.ts` posture.) */
export function isMemorialTakedownOverdue(request: { readonly dueAt: Date }, now: Date): boolean {
  return request.dueAt.getTime() < now.getTime();
}

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/**
 * MP14 — the count of OPEN requests past `due_at`, per Pariwar with ≥ 1 (the daily watch's `warn` line). ⛔ No ids beyond the
 * Pariwar, ⛔ no names. ⭐ An ERASED deceased's request is ⛔ counted (R15, AC13 — the same rule as the open list above): the
 * `NOT EXISTS` is an anti-join on the request's own submission and that submission's deceased member — it drops a request only
 * when that member EXISTS and is anonymized (⛔ a missing row never hides one) — so ⛔ no row fans out.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ──
 * The watch has ⛔ no tenant to start from; it returns `(pariwar_id, count)` only — ⛔ no PII, ⛔ no value from one tenant reaches
 * another, and it writes ⛔ nothing. `allow` (tests) narrows it. RE-EXAMINE when: the result carries more than a Pariwar id and a
 * count, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function countOverdueMemorialTakedownRequests(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null },
): Promise<{ readonly pariwarId: PariwarId; readonly count: number }[]> {
  const { rows } = await q.query<{ pariwar_id: string; count: string }>(
    `SELECT r.pariwar_id, count(*)::text AS count
       FROM memorial_takedown_requests r
      WHERE r.due_at < $1
        AND NOT EXISTS (SELECT 1 FROM memorial_takedown_outcomes o WHERE o.pariwar_id = r.pariwar_id AND o.request_id = r.request_id)
        AND NOT EXISTS (
          SELECT 1
            FROM memorial_submissions s
            JOIN members m ON m.pariwar_id = s.pariwar_id AND m.member_id = s.deceased_member_id
           WHERE s.pariwar_id = r.pariwar_id AND s.submission_id = r.submission_id AND m.state = 'anonymized'
        )
        AND ($2::uuid[] IS NULL OR r.pariwar_id = ANY($2::uuid[]))
      GROUP BY r.pariwar_id
      ORDER BY r.pariwar_id`,
    [input.now, input.allow === null ? null : [...input.allow]],
  );
  return rows.map((r) => ({ pariwarId: r.pariwar_id as PariwarId, count: Number(r.count) }));
}

/** The versions a `taken_down` request withdrew (oldest first) — for the review detail and the approver set. */
export async function readTakedownWithdrawnSubmissionIds(
  db: Db,
  { pariwarId, requestId }: { readonly pariwarId: PariwarId; readonly requestId: string },
): Promise<string[]> {
  const rows = await db
    .select({ submissionId: memorialWithdrawals.submissionId })
    .from(memorialWithdrawals)
    .where(and(eq(memorialWithdrawals.pariwarId, pariwarId), eq(memorialWithdrawals.takedownRequestId, requestId)));
  return rows.map((r) => r.submissionId);
}

