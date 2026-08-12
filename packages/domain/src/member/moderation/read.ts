// The moderation READ path — Story 10.10 (Task 2; AC9, Decision 9).
//
// Two tenant-scoped reads:
//   · `listModerationHistoryForMember`   — the audit trail the admin member record renders.
//   · `listModeratedMembersForPariwar`   — the moderated-members list (Decision 9), which Story
//     10.11's Trustee-Lite view consumes.
//
// ⚠ NEITHER read ever selects `decision_note_ciphertext` into a list DTO. The history read returns it
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
  decisionNoteCiphertext: string;
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

/** One page of a member's moderation history, with the truncation signal the audit trail needs. */
export interface ModerationHistoryPage {
  entries: ModerationHistoryEntry[];
  /** True when more rows exist beyond this page — the console MUST NOT present a cut trail as whole. */
  hasMore: boolean;
}

// ── Why `created_at` is the tiebreak, not `moderation_action_id` (review follow-up) ───────────────
// `acted_at` is the INJECTED APP clock (`deps.clock()` at the handler), so two actions can share an
// instant — a fixed/frozen clock in a fixture, or a future bulk-moderation path stamping one `now`
// across a batch. The PK is `gen_random_uuid()`: as a tiebreak it is a coin flip, and a coin flip
// here can invert a suspend/terminate pair, which would make the signup rejoin guard skip the FR-6
// lock (it keys on the latest row's `action === 'terminate'`). `created_at` is `DEFAULT now()` —
// the DB clock, assigned at INSERT, in the same transaction that appends the event — so it orders
// by actual write order and is immune to app-clock skew across pods. The PK stays as the final
// arm purely for total determinism.
const HISTORY_ORDER = [
  desc(memberModerationActions.actedAt),
  desc(memberModerationActions.createdAt),
  desc(memberModerationActions.moderationActionId),
] as const;

/**
 * A member's moderation history page, newest-first. Tenant-scoped (RLS + the explicit predicates).
 * Returns the ciphertext as stored — the route decrypts a single rationale on demand and the list
 * DTO drops the field entirely (AC9: the ciphertext is NEVER rendered).
 *
 * Field-picked explicitly, never `select()`-spread: the ciphertext is pulled deliberately (this is
 * the one read whose caller may decrypt a row on demand), and every other column is named so a
 * later schema addition can never widen this projection silently.
 */
export async function listModerationHistoryForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  opts: { limit?: number; offset?: number } = {},
): Promise<ModerationHistoryPage> {
  // Capped at 199, one below the 200 ceiling the fetch-one-extra clamp below uses. A request that
  // itself asked for 200 would otherwise ask for 201, be re-clamped back to 200, and pin `has_more`
  // false at exactly the boundary where it matters (the 10.5 news-list finding, applied not
  // repeated).
  const limit = clampLimit(opts.limit, { default: 50, cap: 199 });
  const rows = await db
    .select({
      moderationActionId: memberModerationActions.moderationActionId,
      memberId: memberModerationActions.memberId,
      action: memberModerationActions.action,
      reasonCode: memberModerationActions.reasonCode,
      actorId: memberModerationActions.actorId,
      actorDisplay: memberModerationActions.actorDisplay,
      rejoinPermittedAt: memberModerationActions.rejoinPermittedAt,
      actedAt: memberModerationActions.actedAt,
      decisionNoteCiphertext: memberModerationActions.decisionNoteCiphertext,
    })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, pariwarId),
        eq(memberModerationActions.memberId, memberId),
      ),
    )
    .orderBy(...HISTORY_ORDER)
    // Fetch one MORE than asked, to detect truncation without a second COUNT round-trip. The +1
    // goes THROUGH `clampLimit` rather than being a bare `limit + 1`: the forced-pagination gate
    // requires every dynamic `.limit()` to be a clamp call, and rightly so — an unclamped computed
    // bound is exactly how a pagination bypass gets reintroduced
    // ([[project_domain_limit_clamp_and_savepoint_retry]]).
    .limit(clampLimit(limit + 1, { default: 51, cap: 200 }))
    .offset(Math.max(0, opts.offset ?? 0));

  const hasMore = rows.length > limit;
  return {
    entries: rows.slice(0, limit).map((r) => ({
      moderationActionId: r.moderationActionId,
      memberId: r.memberId,
      action: r.action,
      reasonCode: r.reasonCode,
      actorId: r.actorId,
      actorDisplay: r.actorDisplay,
      rejoinPermittedAt: r.rejoinPermittedAt,
      actedAt: r.actedAt,
      decisionNoteCiphertext: r.decisionNoteCiphertext,
    })),
    hasMore,
  };
}

/**
 * ONE moderation action's ciphertext, tenant + member scoped. The ONLY accessor that ever selects
 * `decision_note_ciphertext` for a single row (review follow-up — wires the "decrypts a SINGLE
 * rationale on demand" read this header always claimed existed). The route decrypts; a list DTO
 * never carries this field, and this accessor is never called for a list.
 */
export async function getModerationActionRationale(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  moderationActionId: ModerationActionId,
): Promise<{ decisionNoteCiphertext: string } | null> {
  const rows = await db
    .select({ decisionNoteCiphertext: memberModerationActions.decisionNoteCiphertext })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, pariwarId),
        eq(memberModerationActions.memberId, memberId),
        eq(memberModerationActions.moderationActionId, moderationActionId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? { decisionNoteCiphertext: row.decisionNoteCiphertext } : null;
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
 *
 * ⚠ That argument covers WHICH ROWS exist, not which of two rows sharing an `acted_at` is "latest".
 * `acted_at` is the injected app clock and can tie; the ORDER BY therefore breaks ties on
 * `created_at` (the DB clock, `DEFAULT now()`, assigned in the same tx as the event append) rather
 * than on the random-UUID PK — see the `HISTORY_ORDER` note above. The overlay's own authority is
 * `event_version`, which no clock can perturb.
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
             rejoin_permitted_at, acted_at, created_at, moderation_action_id
        FROM member_moderation_actions
       WHERE pariwar_id = ${pariwarId}
       ORDER BY member_id, acted_at DESC, created_at DESC, moderation_action_id DESC
    ) AS latest
     WHERE latest.action <> 'restore'
     ORDER BY latest.acted_at DESC, latest.created_at DESC, latest.member_id DESC
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
  created_at: string | Date;
  moderation_action_id: string;
}
