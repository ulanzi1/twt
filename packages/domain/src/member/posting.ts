// member_postings accessors — Story 3.9 (Task 3).
//
// The Life Events posting-update write (APPEND a NEW row — append-only history; AC1 "prior value
// preserved") + the latest-posting read (for the panel summary + Epic 4's retirement anchor).
// TENANT-scoped (RLS `withCheck` enforces the caller's `app.pariwar_id`); runs its statement
// DIRECTLY on the passed (scoped) `db`, so a scoped caller is already inside the `SET LOCAL
// app.pariwar_id` transaction (the member_addresses / member_medical_disclosures precedent).
//
// NO encryption here — the district is plaintext non-PII geographic data (Dev Notes §"Posting PII
// tier"). NO HTTP, NO audit, NO event emission — the route orchestrates.

import { asc, desc, and, eq, lte } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, WorkplaceId, WorkplaceRequestId } from '../ids/index.js';
import { type MemberPostingRow, memberPostings } from '../schema/member_postings.js';
import type { MemberLifecycleState } from '../schema/members.js';
import { withdrawOlderOpenRequests } from './workplace.js';

/**
 * The lifecycle states in which a member may ⛔ record a posting — the Life Events route's 409 `life_events.member_terminal`
 * (`apps/api/src/modules/life-events/handlers.ts`). ⭐ EXPORTED by Story 6.36c (RV1 (i)): the home prompts' WORKPLACE flags
 * are for exactly the members that route serves — ONE set, ⛔ a copy.
 */
export const MEMBER_POSTING_TERMINAL_STATES = ['withdrawn', 'anonymized'] as const satisfies readonly MemberLifecycleState[];

/** One posting row to append. All fields are server-validated non-PII (district plaintext). */
export interface InsertMemberPostingInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /**
   * The new posting district (plaintext, non-PII geographic). Story 6.36a (SW5): when the posting names a WORKPLACE, the
   * caller passes the workplace's MAPPED district; for *"isn't listed"* / a retirement, the LISTED spelling picked.
   */
  district: string;
  /** Optional forward-compat destination-Pariwar reference (no tenant move in v1-S). */
  pariwarRef?: string | null;
  /** Epic 4 Story 4.5 retirement anchor. Defaults to false at the DB when omitted. */
  isRetirement?: boolean;
  /** Story 6.36a — the listed school or office (⛔ with `workplaceRequestId`; ⛔ on a retirement — 0161's CHECKs). */
  workplaceId?: WorkplaceId | null;
  /** Story 6.36a — an *"isn't listed"* answer's request (written FIRST, `insertWorkplaceRequest`). */
  workplaceRequestId?: WorkplaceRequestId | null;
  /** Story 6.36a — the date the member started there, or retired (`YYYY-MM-DD`; validated by the caller — SW6). */
  startedOn?: string | null;
  /**
   * Story 6.36a — a request this posting CONFIRMS (6.36c's answer route): ⛔ never withdrawn by its own posting (the
   * writer's "end the older open request" step skips it).
   */
  exceptRequestId?: WorkplaceRequestId | null;
}

/**
 * Append ONE new posting row (append-only history — NO delete of prior rows; AC1). Runs in the
 * caller's single scope tx (the event append runs in the same tx, so a later throw rolls the whole
 * update back). Returns the inserted row. Tenant-scoped.
 *
 * ⭐ Story 6.36a — STILL THE ONE WRITER of `member_postings` (SW8, I2). In the SAME transaction it ends the member's
 * OLDER open *"isn't listed"* request (`withdrawn`) — EVERY posting write does — ⛔ never the posting's own request, ⛔ never
 * `exceptRequestId`.
 */
export async function insertMemberPosting(
  db: Db,
  input: InsertMemberPostingInput,
): Promise<MemberPostingRow> {
  const inserted = await db
    .insert(memberPostings)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      district: input.district,
      pariwarRef: input.pariwarRef ?? null,
      isRetirement: input.isRetirement ?? false,
      workplaceId: input.workplaceId ?? null,
      workplaceRequestId: input.workplaceRequestId ?? null,
      startedOn: input.startedOn ?? null,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertMemberPosting] insert returned no row — check session scope');
  }
  const keep: WorkplaceRequestId[] = [];
  if (input.workplaceRequestId) keep.push(input.workplaceRequestId);
  if (input.exceptRequestId) keep.push(input.exceptRequestId);
  await withdrawOlderOpenRequests(db, input.pariwarId, input.memberId, keep);
  return row;
}

/**
 * Returns `true` if the member has EVER recorded a retirement posting (`is_retirement=true`).
 * Epic 4 Story 4.5 computes `retired_at` from the FIRST such row — once set, retirement is a
 * one-way permanent fact regardless of later district changes. Tenant-scoped.
 */
export async function getMemberPostingRetiredEver(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db
    .select()
    .from(memberPostings)
    .where(
      and(
        eq(memberPostings.pariwarId, pariwarId),
        eq(memberPostings.memberId, memberId),
        eq(memberPostings.isRetirement, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * The member's retirement ANCHOR instant: the `created_at` of the FIRST (`is_retirement = true`)
 * posting at/before `atTimestamp`, or `null` when the member had not retired by then. Retirement is
 * a one-way permanent fact (Story 3.9) — the FIRST such row is the anchor regardless of later
 * district changes, so this orders `created_at ASC` (the earliest), NOT the `getMemberPostingLatest`
 * DESC head. A secondary `posting_id ASC` tiebreak makes the pick deterministic (query-plan-independent)
 * even if two rows share an identical `created_at` (e.g. a bulk seed/import) — required because this
 * feeds the AC2 replay-determinism-sensitive validity payload (Story 4.6). Story 4.6's Validity Service
 * reads this as `retired_at` for the tenure cutoff + the `coverage_through` date projection (the
 * bool-only `getMemberPostingRetiredEver` cannot supply the date the projection needs). Tenant-scoped.
 */
export async function getMemberRetirementAnchorAt(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<Date | null> {
  const rows = await db
    .select({ createdAt: memberPostings.createdAt })
    .from(memberPostings)
    .where(
      and(
        eq(memberPostings.pariwarId, pariwarId),
        eq(memberPostings.memberId, memberId),
        eq(memberPostings.isRetirement, true),
        lte(memberPostings.createdAt, atTimestamp),
      ),
    )
    .orderBy(asc(memberPostings.createdAt), asc(memberPostings.postingId))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}

/**
 * Resolve a member's CURRENT (newest) posting row within a Pariwar, or `null` when none exists.
 * The current posting is the newest row by `created_at` (append-only history). Tenant-scoped.
 *
 * ⚠ **DELIBERATE ORDERING DIVERGENCE — read before "fixing" this** (Story 1.19 D3, Decision
 * `2026-08-13-103`). This reader orders by `created_at DESC` **alone**, so two rows sharing a
 * `created_at` (same-transaction inserts; `defaultNow()` resolution) resolve **nondeterministically**.
 * Two other readers add a `posting_id DESC` tie-break — `claim/peer-mesh-read.ts:83-88` and
 * `member-geo/resolve.ts`'s `getMemberCurrentDistrict`, where a nondeterministic answer would mean a
 * nondeterministic geo AUDIENCE, and therefore a nondeterministic test.
 *
 * ⛔ Story 1.19 deliberately did **not** change this function. It serves Story 3.9's panel summary and
 * Epic 4's retirement anchor — a different blast radius from an audience read. The divergence is
 * recorded at both sites so the next reader sees it as **deliberate, not drift**; closing it is its own
 * story, with those two consumers in scope.
 */
export async function getMemberPostingLatest(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberPostingRow | null> {
  const rows = await db
    .select()
    .from(memberPostings)
    .where(and(eq(memberPostings.pariwarId, pariwarId), eq(memberPostings.memberId, memberId)))
    .orderBy(desc(memberPostings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
