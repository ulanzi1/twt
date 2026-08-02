// The moderation READ path — Story 10.10 (Task 2; AC9, Decision 9).
//
// Two tenant-scoped reads:
//   · `listModerationHistoryForMember`   — the audit trail the admin member record renders.
//   · `listModeratedMembersForPariwar`   — the moderated-members list (Decision 9), which Story
//     10.11's Trustee-Lite view consumes.
//
// ⚠ NEITHER read ever selects `rationale_ciphertext` into a list DTO. The history read returns it
// (the admin console decrypts ONE rationale on demand through the mirror helper); the Pariwar-wide
// list does not project it at all.
//
// ── ⚠ Decision 9: what "moderation pending items" means, and what it does NOT ────────────────────
// `epics.md:3563` says Story 10.11 aggregates "moderation pending items (Story 10.10)" and `:3564`
// sorts them "by deadline-proximity" with "category + age + severity". Story 10.10's own AC block
// (`epics.md:3544-3551`) defines NO pending, queue, approval or dual-control concept whatsoever —
// every clause describes an immediate, single-actor, completed action. Inventing an approval
// workflow here would be building an unauthorized feature.
// → this read is the defensible reading: members whose CURRENT overlay status is `suspended` or
// `terminated`, i.e. "under moderation, pending resolution". It carries NO deadline and NO
// severity, so 10.11 CANNOT sort it by deadline-proximity as written. That mismatch is a live
// forward commitment for PM, recorded openly rather than papered over with a fabricated field
// ([[feedback_record_unattested_no_backfill]]).
//
// Every dynamic `.limit()` goes through `clampLimit` (the domain-accessor-invariants CI gate).

import { and, desc, eq, sql } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { MemberId, ModerationActionId, PariwarId } from '../../ids/index.js';
import { clampLimit } from '../../pagination.js';
import { memberModerationActions } from '../../schema/member_moderation_actions.js';
import type { ModerationStatus } from './status.js';

/** One row of a member's moderation history (newest-first). */
export interface ModerationHistoryEntry {
  moderationActionId: ModerationActionId;
  memberId: MemberId;
  action: string;
  reasonCode: string;
  actorId: string;
  actorDisplay: string;
  rejoinPermittedAt: Date | null;
  actedAt: Date;
  /** Tier-1 ciphertext AS STORED. The caller decrypts on demand; a LIST DTO never carries it. */
  rationaleCiphertext: string;
}

/** One entry of the Pariwar-wide moderated-members list. No rationale, ever. */
export interface ModeratedMemberEntry {
  memberId: MemberId;
  /** The member's CURRENT moderation standing — only `suspended` or `terminated` appear here. */
  status: Exclude<ModerationStatus, 'none'>;
  reasonCode: string;
  actorId: string;
  actorDisplay: string;
  /** When the current standing began (the producing action's `acted_at`). */
  since: Date;
  rejoinPermittedAt: Date | null;
}

export interface ListModeratedMembersOptions {
  limit?: number;
  offset?: number;
}

/**
 * A member's full moderation history, newest-first. Tenant-scoped (RLS + the explicit predicates).
 * Returns the ciphertext as stored — the route decrypts a single rationale on demand and the list
 * DTO drops the field entirely (AC9: the ciphertext is NEVER rendered).
 */
export async function listModerationHistoryForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  opts: { limit?: number; offset?: number } = {},
): Promise<ModerationHistoryEntry[]> {
  const rows = await db
    .select()
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, pariwarId),
        eq(memberModerationActions.memberId, memberId),
      ),
    )
    .orderBy(desc(memberModerationActions.actedAt), desc(memberModerationActions.moderationActionId))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }))
    .offset(Math.max(0, opts.offset ?? 0));

  return rows.map((r) => ({
    moderationActionId: r.moderationActionId,
    memberId: r.memberId,
    action: r.action,
    reasonCode: r.reasonCode,
    actorId: r.actorId,
    actorDisplay: r.actorDisplay,
    rejoinPermittedAt: r.rejoinPermittedAt,
    actedAt: r.actedAt,
    rationaleCiphertext: r.rationaleCiphertext,
  }));
}

/**
 * The Pariwar's currently-moderated members (Decision 9), newest-action-first. Tenant-scoped.
 *
 * ── Why the LATEST ACTION ROW, and why that is not a second source of truth ─────────────────────
 * The authority on a member's moderation status is `evaluateModerationOverlay` over their event
 * stream. Folding that per member would be one query per candidate; instead this takes the LATEST
 * `member_moderation_actions` row per member (`DISTINCT ON`) and maps `action → status`.
 *
 * The two AGREE by construction, because `moderateMember` is the ONLY producer of both the row and
 * the event, it writes them in ONE transaction, and it rejects every illegal transition BEFORE
 * writing either — so the last legal action always names the current status. That equivalence is
 * not assumed: a live-DB test drives a member through all four legal arms
 * (suspend → terminate → restore → suspend) and asserts this read agrees with
 * `getMemberModerationOverlay` at every step.
 */
export async function listModeratedMembersForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: ListModeratedMembersOptions = {},
): Promise<ModeratedMemberEntry[]> {
  // Clamped BEFORE interpolation — `clampLimit` is the forced-pagination invariant, and it applies
  // to a raw-SQL LIMIT exactly as it does to a Drizzle `.limit()` (the static gate only sees the
  // latter, so the clamp here is deliberate and load-bearing, not decorative).
  const limit = clampLimit(opts.limit, { default: 50, cap: 200 });
  const offset = Math.max(0, opts.offset ?? 0);

  // `DISTINCT ON (member_id)` with a matching leading ORDER BY = "the latest action per member".
  // Postgres-specific and not expressible in Drizzle's query builder, hence raw SQL. Every value is
  // a bound parameter (`${}` in a drizzle `sql` template is parameterized, never string-spliced).
  // The explicit `pariwar_id` predicate rides ALONGSIDE RLS — belt-and-suspenders, and it is what
  // makes the query correct if a caller ever passes a BYPASSRLS pool.
  const result = await db.execute<ModeratedLatestRow>(sql`
    SELECT * FROM (
      SELECT DISTINCT ON (member_id)
             member_id, action, reason_code, actor_id, actor_display,
             rejoin_permitted_at, acted_at, moderation_action_id
        FROM member_moderation_actions
       WHERE pariwar_id = ${pariwarId}
       ORDER BY member_id, acted_at DESC, moderation_action_id DESC
    ) AS latest
     WHERE latest.action <> 'restore'
     ORDER BY latest.acted_at DESC, latest.member_id DESC
     LIMIT ${limit} OFFSET ${offset}
  `);

  return result.rows.map((r) => ({
    memberId: r.member_id as MemberId,
    // Only `suspend`/`terminate` survive the `<> 'restore'` filter, so this maps totally.
    status: r.action === 'terminate' ? 'terminated' : 'suspended',
    reasonCode: r.reason_code,
    actorId: r.actor_id,
    actorDisplay: r.actor_display,
    // ⚠ `db.execute` bypasses Drizzle's column mapper, so a `timestamptz` arrives as a STRING here,
    // NOT the `Date` a Drizzle-mapped select would hand back. Coercing is this accessor's job: the
    // raw-SQL escape hatch must not leak its representation past the domain boundary, or every
    // caller has to know which of the two reads it is holding (the API handler called
    // `.toISOString()` and got a TypeError — caught by the Decision-9 integration test).
    since: toDate(r.acted_at),
    rejoinPermittedAt: r.rejoin_permitted_at === null ? null : toDate(r.rejoin_permitted_at),
  }));
}

/** Normalize a raw-SQL timestamp (string | Date) to a `Date`, honouring the declared return type. */
function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * The raw shape the `DISTINCT ON` subquery returns (snake_case — a raw `db.execute` bypasses
 * Drizzle's column mapper). The index signature satisfies drizzle's `Record<string, unknown>`
 * row constraint without widening the named fields.
 */
interface ModeratedLatestRow extends Record<string, unknown> {
  member_id: string;
  action: string;
  reason_code: string;
  actor_id: string;
  actor_display: string;
  // `string | Date`: a raw `db.execute` may hand back either depending on the driver's type
  // parsing — the mapping above normalizes both to `Date`.
  rejoin_permitted_at: string | Date | null;
  acted_at: string | Date;
  moderation_action_id: string;
}
