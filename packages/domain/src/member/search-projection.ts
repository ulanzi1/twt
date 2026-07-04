// The AR-65 member-search projection refresh — Story 4.7 (Task 1; the projector-exclusive writer).
//
// THE SINGLE LEGITIMATE WRITER to `member_search_projection`. Called by the Story 3.1 member projector
// (project.ts) inside its transaction, AFTER the `members.state` write, so the projection is refreshed
// incrementally on every member-state event append (freshness = eventual consistency within the normal
// projector latency budget — Story 4.7 D1 refinement iii). No HTTP handler, admin action, background
// job, or SQL trigger calls this or writes the table directly — the write-rejection trigger (migration)
// enforces it structurally, exactly as the 0018 `members.state` trigger does
// ([[project_member_lifecycle_domain_substrate]]).
//
// ── The trigger guard ─────────────────────────────────────────────────────────────────────────────
// Before writing, this sets `SET LOCAL app.member_search_projection_writer = 'on'` (transaction-scoped,
// mirroring the projector's `app.member_state_writer` discipline). The BEFORE INSERT/UPDATE trigger on
// `member_search_projection` (migration) rejects any write while this guard is not 'on'. `SET LOCAL`
// requires a raw pg client, so this takes a `pg.PoolClient` (NOT a Drizzle `Db`) and binds its own
// scoped Db to it — the same shape as `projectMemberState`.
//
// ── Transaction contract ────────────────────────────────────────────────────────────────────────────
// MUST run inside the projector's active transaction with the Pariwar scope already set. It does NOT
// open/commit its own transaction. The state + version come from the projector's just-computed result
// (no re-read); the nominee summary is read fresh from `member_nominees` (which — for a
// `member.nominees_declared` event — was written earlier in the SAME tx, so the refresh sees it).

import { and, asc, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { memberNominees } from '../schema/member_nominees.js';
import {
  CLAIM_SECTION_UNAVAILABLE,
  CONTRIBUTION_SECTION_UNAVAILABLE,
  memberSearchProjection,
  type NomineeSummaryEntry,
} from '../schema/member_search_projection.js';
import type { MemberLifecycleState } from './state.js';

export interface RefreshMemberSearchProjectionInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The lifecycle state the projector just projected (members.state). */
  state: MemberLifecycleState;
  /** The `events_log.event_version` that state was projected from (the staleness anchor). */
  stateEventVersion: number;
}

/**
 * Read the member's current non-PII nominee summary (count + split + Tier-3 relationship — NEVER the
 * Tier-1-encrypted name/mobile/address). Rank-ordered (primary first), mirroring `getMemberNominees`.
 */
async function readNomineeSummary(
  db: ReturnType<typeof bindScopedDb>,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<NomineeSummaryEntry[]> {
  const rows = await db
    .select({
      rank: memberNominees.rank,
      relationship: memberNominees.relationship,
      splitPct: memberNominees.splitPct,
    })
    .from(memberNominees)
    .where(and(eq(memberNominees.pariwarId, pariwarId), eq(memberNominees.memberId, memberId)))
    .orderBy(asc(memberNominees.rank));
  return rows.map((r) => ({ rank: r.rank, relationship: r.relationship, splitPct: r.splitPct }));
}

/**
 * Refresh (upsert) the member's `member_search_projection` row under the projector write-guard.
 * INSERT on the first event (no prior projection row); UPDATE thereafter. The contribution + claim
 * sections stay the D2 typed `producer_unavailable` sentinel until the Epic 8/9 / Epic 6 producers land
 * (they are re-stamped every refresh so the shape is always explicit — never an empty array).
 *
 * Idempotent per `(member_id, state_event_version)`: a re-append at the same version re-writes the same
 * derived row.
 */
export async function refreshMemberSearchProjection(
  client: pg.PoolClient,
  input: RefreshMemberSearchProjectionInput,
): Promise<void> {
  const db = bindScopedDb(client);
  const nomineeSummary = await readNomineeSummary(db, input.pariwarId, input.memberId);

  await client.query("SET LOCAL app.member_search_projection_writer = 'on'");
  try {
    await db
      .insert(memberSearchProjection)
      .values({
        memberId: input.memberId,
        pariwarId: input.pariwarId,
        state: input.state,
        stateEventVersion: input.stateEventVersion,
        nomineeSummary,
        contributionSection: CONTRIBUTION_SECTION_UNAVAILABLE,
        claimSection: CLAIM_SECTION_UNAVAILABLE,
      })
      .onConflictDoUpdate({
        target: memberSearchProjection.memberId,
        set: {
          state: input.state,
          stateEventVersion: input.stateEventVersion,
          nomineeSummary,
          contributionSection: CONTRIBUTION_SECTION_UNAVAILABLE,
          claimSection: CLAIM_SECTION_UNAVAILABLE,
          projectedAt: new Date(),
        },
      });
  } finally {
    // Reset the guard immediately (defense-in-depth); it is tx-scoped so commit/rollback clears it too.
    await client.query("SET LOCAL app.member_search_projection_writer = 'off'");
  }
}
