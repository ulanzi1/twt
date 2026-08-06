// The personal-event ASSERTION — write + as-of existential reads. Story 10.26 (Tasks 2–3; AC1–AC3,
// AC9; D1, D2, D3, D5, D7).
//
// ── NO TABLE, NO PROJECTION, NO MIGRATION (D7) ───────────────────────────────────────────────────
// Story 10.24's D8 ruled the general form — "if you find yourself wanting to emit a
// `contribution.fact-*` event, stop: that is a projection, and projections do not need events." This
// module is the MIRROR case and the same rule points the other way: there is no existing data to
// project, because the member act had never happened anywhere in the substrate. A new fact needs an
// EVENT exactly when nothing in the system already knows it. So the event IS the record, and the
// existential is read straight off `events_log` — the same posture `member/read.ts` already takes for
// the signup and lock-in lifecycle anchors.
//
// ── The dotted fact key is NOT spelled here, and that is load-bearing (AC2) ──────────────────────
// Story 8.10's `no-ingest-path` fence source-scans `packages/domain/src/contribution`,
// `packages/domain/src/schema`, `packages/domain/migrations` and `packages/events/src` for any quoted
// `contribution.*` literal outside the three admitted ingest event types. This module returns a plain
// BOOLEAN anchor; `@twt/validity-service`'s `producer.ts` maps it onto
// `R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED`. `@twt/domain` also cannot import
// `@twt/niyamavali-engine` (the package cycle), so the split is forced as well as correct.
//
// ── AS-OF CORRECT, and MONOTONE (D5) ─────────────────────────────────────────────────────────────
// The reads answer "as of `at`", never "now": `apps/jobs/src/assignable-roster.ts` evaluates validity
// at `committedAt` and Epic 4 commits "Replayable for audit" (prd.md:425). The predicate is a LIFETIME
// existential — ≥1 assertion at/before `at` — matching the frozen wire contract
// (`R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED` is a BOOL and the clause reads
// `fact_equals … value: true`), and deliberately NOT a per-cycle or windowed predicate: validity is
// member-standing, not cycle-scoped, so the engine does not know which cycle an evaluation concerns,
// and a windowed boolean would silently mean different things at different instants.
//
// ⚠ The fact is MONOTONE (`false → true`, never back): A MEMBER CANNOT UN-ASSERT. That is acceptable
// ONLY because the fact can never harm them — `imposesRestorationObligation` keeps R7(G) out of the
// violator-flag channel entirely (AC5/D4). The two decisions are load-bearing on each other and must
// be read together: IF AC5 IS EVER RELAXED, MONOTONICITY BECOMES A DEFECT.

import { and, eq, lte, sql } from 'drizzle-orm';
import type pg from 'pg';

import type { Db } from '../db.js';
import { type MemberId, type PariwarId, memberId as toMemberId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import type { PersonalEventKind } from './events.js';
import { projectMemberState, type ProjectMemberStateResult } from './project.js';
import type { MemberLifecycleState } from './state.js';

/**
 * The assertion's event type. Declared once so the write and both reads cannot drift onto different
 * spellings — the `contribution.confirmed` / `contribution.reconciliation-mismatch` drift class
 * ([[project_contribution_event_name_contract]]) applied to a `member.*` name.
 */
export const PERSONAL_EVENT_ASSERTED_EVENT_TYPE = 'member.personal_event_asserted' as const;

/** What the member asserted. NO free text — see `PERSONAL_EVENT_KINDS` (D3). */
export interface AssertPersonalEventInput {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  /** The member's CURRENT lifecycle state; the marker is identity, so it is also `to_state`. */
  readonly currentState: MemberLifecycleState;
  readonly kind: PersonalEventKind;
  /** OPTIONAL provenance (D5). No surface can supply this today — see the event schema. */
  readonly cycleRef?: string;
  /** The acting member's user id, for the `events_log.actor_id` column. */
  readonly actorId: string;
  /** Idempotency: the caller-supplied event id, so a retried request appends once. */
  readonly eventId?: string;
}

/**
 * Append the member's assertion on THEIR OWN stream (`stream_id = member_id`) — Story 10.26.
 *
 * ⚖ THIS GRANTS NOTHING. The ratified Niyamavali §3.1 (`docs/legal/niyamavali.md:81`) is explicit:
 * personal events do not excuse a missed contribution; the assertion "is recorded on the member's own
 * record but grants no restoration relief and carries no consequence of its own". There is no
 * reviewer, no approval, no denial and nothing to reverse (D1). A member may assert again; nothing
 * approves an earlier assertion.
 *
 * Goes through the shared {@link projectMemberState} rather than a bespoke append, which buys three
 * things for free: the `.strict()` payload validation, the `(stream_id, event_version)` concurrency
 * guard, and the reducer replay — which lands on IDENTITY for this marker, so `members.state` is
 * re-projected to exactly the value it already had (AC8(f)).
 *
 * ⭐ And because the type is `member.*` on the member's own stream, migration
 * `0036_member-validity-cache.sql:103-107`'s AFTER-INSERT trigger
 * (`WHEN NEW.event_type LIKE 'member.%'`, keyed `member_id = NEW.stream_id`) evicts this member's
 * validity-cache row automatically. NO new trigger, NO migration, NO cache-key change. That is the
 * decisive argument for the D2 namespace choice, and it is proved by a live-DB test rather than
 * assumed.
 */
export async function assertPersonalEvent(
  client: pg.PoolClient,
  input: AssertPersonalEventInput,
): Promise<ProjectMemberStateResult> {
  return projectMemberState(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    eventType: PERSONAL_EVENT_ASSERTED_EVENT_TYPE,
    actorId: input.actorId,
    ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
    payload: {
      // Non-transition marker: `from_state === to_state` (the address_updated / posting_updated shape).
      from_state: input.currentState,
      to_state: input.currentState,
      trigger: PERSONAL_EVENT_ASSERTED_EVENT_TYPE,
      actor: 'member',
      kind: input.kind,
      ...(input.cycleRef !== undefined ? { cycle_ref: input.cycleRef } : {}),
    },
  });
}

/**
 * Has this member EVER asserted a personal event, as of `at`? — ONE bounded query (AC9).
 *
 * `false` is a REAL ANSWER, not an unknown, and that asymmetry is deliberate — record it here so a
 * future reader does not "fix" this into a nullable:
 *
 *   The other six `contribution.*` facts are read from a PROJECTION with a backfill watermark
 *   (`contribution_projection_coverage`), so for them `0` and *unknown* had to be distinguished
 *   (Story 10.25 AC7) — an unprojected ledger must never render as an affirmatively clean member.
 *   This fact is read from `events_log`, which is the PRIMARY RECORD and has no backfill horizon.
 *   There is no instant at which the events exist but are not yet readable. So "no assertion row at
 *   or before `at`" genuinely means "this member has never asserted".
 *
 * ⚠ Do NOT extend the coverage watermark to cover this fact's own source. The COVERAGE GATE still
 * governs the payload as a whole: when `deriveContributionFacts` returns `null`, the
 * `producer_unavailable` sentinel is emitted and this seventh fact never appears alone on a payload
 * whose other six are un-derivable (AC3).
 *
 * `EXISTS` rather than `count(*)`: several assertions are still one `true`, and the planner can stop
 * at the first row. RLS-scoped by `stream_id`; the explicit `pariwar_id` predicate is defence in depth.
 */
export async function hasAssertedPersonalEventAt(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  at: Date,
): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, memberId),
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, PERSONAL_EVENT_ASSERTED_EVENT_TYPE),
        lte(eventsLog.occurredAt, at),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * The SAME existential for a whole Pariwar — ONE bounded query, GROUP BY member (AC9).
 *
 * The bulk shape the Trustee-Lite candidate scan needs so it never issues one assertion read per
 * member in a loop (10.24 AC7's binding structural criterion: "is there a query inside a loop over
 * members, pools or clauses?"). Returns the SET of members who have asserted; an absent member has
 * not asserted, which — unlike the projection facts — is a real answer rather than a coverage gap.
 *
 * ⚠ Deliberately NOT folded into `missedCycleAggregateSql` (D7). That statement scans the
 * pool/assignment axis; the assertion lives on the member's own `events_log` stream. Forcing a join
 * across axes would make the riskiest SQL in the subsystem riskier and buy nothing — the two reads are
 * independent and both are member-count-independent.
 */
export async function listMembersWithPersonalEventAssertionAt(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<ReadonlySet<MemberId>> {
  const rows = await db
    .select({ memberId: eventsLog.streamId })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, PERSONAL_EVENT_ASSERTED_EVENT_TYPE),
        lte(eventsLog.occurredAt, at),
      ),
    )
    .groupBy(eventsLog.streamId);
  return new Set(rows.map((r) => toMemberId(String(r.memberId))));
}
