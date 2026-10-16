// Peer-mesh candidate-roster snapshot read — Story 6.6 (Task 2; AC2).
//
// A transport-free accessor that captures the candidate member set at SELECTION TIME —
// the frozen input the pure engine (`peer-mesh.ts`) ranks and the audit-replay source
// (`candidate_snapshot`) persisted on `claim_peer_mesh_selections`. It reads ONLY the
// three non-PII signals the v1 `district_cohort_v1` metric needs (Decision D3): the
// opaque `member_id`, the member's LATEST posting `district` (plaintext non-PII), and
// `created_at` (the cohort proxy).
//
// ── Discipline (mirrors getMemberPostingLatest / getMemberKycProfile) ─────────
//   · Pure read — no decryption, no I/O beyond the query, no event emission. The job
//     orchestrates; this only reads.
//   · District is PLAINTEXT non-PII (`member_postings` header) — safe to select, persist,
//     and log. The encrypted `member_addresses` line is NEVER touched here.
//   · The roster is "active members" — the same ACTIVE semantics the validity service
//     uses (`ACTIVE_STATES = ['active']`). Domain cannot import @twt/validity-service
//     (that would cycle — validity-service depends on @twt/domain), so the active
//     predicate is expressed directly against the `members.state` enum here (RECORDED
//     variance from Task 2's "reuse validity.ACTIVE_STATES" — same value, legal import).
//   · NO user-controlled `.limit()` (so no domain-invariants clamp needed) — the whole
//     active roster is the candidate pool; the engine selects the top-5 deterministically.

import { and, asc, eq, ne, sql, type SQL } from 'drizzle-orm';

import {
  addCalendarDays,
  istDateOf,
  istMidnightAt,
  type CalendarDateString,
} from '../cycle-calendar/holiday-resolver.js';
import type { Db } from '../db.js';
import {
  memberId as toMemberId,
  workplaceId as toWorkplaceId,
  type ClaimId,
  type MemberId,
  type PariwarId,
  type PeerMeshSelectionId,
  type WorkplaceId,
} from '../ids/index.js';
import { namedByClaimSql } from '../member/known-people.js';
import { eventsLog } from '../schema/events_log.js';
import { members } from '../schema/members.js';
import { memberPostings } from '../schema/member_postings.js';
import {
  type ClaimPeerMeshSelectionRow,
  claimPeerMeshSelections,
} from '../schema/claim_peer_mesh_selections.js';
import {
  type ClaimPeerMeshPingRow,
  claimPeerMeshPings,
} from '../schema/claim_peer_mesh_pings.js';
import type {
  PeerMeshCandidate,
  PeerMeshCandidateGroup,
  PeerMeshDeceased,
  PeerMeshGroupedCandidate,
} from './peer-mesh-metric-registry.js';

export interface PeerMeshCandidateSnapshotInput {
  pariwarId: PariwarId;
  /** The deceased — always excluded from their own claim's mesh. */
  deceasedMemberId: MemberId;
  /** Optional actor to exclude (e.g. the claimant/filer), if distinct from the deceased. */
  excludeActorId?: MemberId | null;
}

/**
 * Capture the peer-mesh candidate snapshot for a claim: every ACTIVE member in the
 * Pariwar except the deceased (and an optional excluded actor), each with their latest
 * posting district + `created_at`. Tenant-scoped (RLS + the explicit `pariwar_id`
 * predicate). Ordered by `member_id` so the persisted snapshot is stable for audit
 * (selection itself is order-independent — the engine imposes a total order).
 *
 * The latest district is the newest `member_postings` row (by `created_at`, then
 * `posting_id` as a deterministic tiebreak — mirrors `getMemberPostingLatest` semantics
 * with an added tiebreak so a bulk-seed created_at tie resolves the same every run).
 * Members with NO posting yield `district: null` (degrades to cohort+tiebreak ranking).
 *
 * CORRELATION FIX (review, live-DB flake): the subquery's WHERE clause references the
 * OUTER `members` row by a LITERAL `"members"."member_id"` / `"members"."pariwar_id"`
 * qualifier, NOT by interpolating the `members.memberId`/`members.pariwarId` Column
 * objects. Interpolating the Column object here renders as a BARE unqualified
 * `"member_id"` / `"pariwar_id"` (Drizzle drops the table prefix when the column is
 * referenced from within a projection scoped to that same table) — and because the
 * subquery's OWN `FROM member_postings p` also has columns of those exact names, Postgres
 * resolves the bare reference to the INNER `p.member_id`/`p.pariwar_id` (nearest-scope
 * wins), collapsing the correlation into an always-true `p.member_id = p.member_id`
 * tautology. The subquery then silently returns the latest posting across EVERY member
 * in the RLS-scoped tenant, not the outer row's own member — a live, reproducible
 * (~30-40% of runs) wrong-district bug, not merely a hypothetical.
 */
export async function getPeerMeshCandidateSnapshot(
  db: Db,
  input: PeerMeshCandidateSnapshotInput,
): Promise<PeerMeshCandidate[]> {
  const rows = await db
    .select({
      memberId: members.memberId,
      createdAt: members.createdAt,
      district: sql<string | null>`(
        SELECT p.district
        FROM ${memberPostings} p
        WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
        ORDER BY p.created_at DESC, p.posting_id DESC
        LIMIT 1
      )`,
    })
    .from(members)
    .where(
      and(
        eq(members.pariwarId, input.pariwarId),
        eq(members.state, 'active'),
        ne(members.memberId, input.deceasedMemberId),
        input.excludeActorId ? ne(members.memberId, input.excludeActorId) : undefined,
      ),
    )
    .orderBy(asc(members.memberId));

  return rows.map((r) => ({
    memberId: r.memberId,
    district: r.district,
    createdAt: r.createdAt,
  }));
}

/**
 * The deceased member's selection-relevant attributes (the comparator reference point):
 * their latest posting `district` (newest `member_postings` row, `created_at` DESC then
 * `posting_id` DESC) + their `created_at`. Returns `null` when the member row is missing.
 * Tenant-scoped. Non-PII (district plaintext + created_at).
 */
export async function getPeerMeshDeceasedAttributes(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<PeerMeshDeceased | null> {
  const rows = await db
    .select({
      createdAt: members.createdAt,
      // Literal outer-table qualifier — see the correlation-fix note on
      // getPeerMeshCandidateSnapshot above (same bug, same fix, same reason).
      district: sql<string | null>`(
        SELECT p.district
        FROM ${memberPostings} p
        WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
        ORDER BY p.created_at DESC, p.posting_id DESC
        LIMIT 1
      )`,
    })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), eq(members.memberId, deceasedMemberId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { district: row.district, createdAt: row.createdAt };
}

/**
 * The persisted selection row for a claim (the audit-replay source), or `undefined` when
 * no selection exists yet. Tenant-scoped (RLS + the explicit `pariwar_id` predicate — a
 * cross-tenant guess resolves to `undefined`). The `claim_case_id` UNIQUE guarantees ≤1 row.
 */
export async function getPeerMeshSelectionByClaim(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimPeerMeshSelectionRow | undefined> {
  const rows = await db
    .select()
    .from(claimPeerMeshSelections)
    .where(
      and(
        eq(claimPeerMeshSelections.pariwarId, pariwarId),
        eq(claimPeerMeshSelections.claimCaseId, claimCaseId),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * The delivery-neutral ping intents recorded for a selection (one per selected member).
 * Tenant-scoped. Ordered by `member_id` for stable reads.
 */
export async function getPeerMeshPingIntentsBySelection(
  db: Db,
  pariwarId: PariwarId,
  selectionId: PeerMeshSelectionId,
): Promise<ClaimPeerMeshPingRow[]> {
  return db
    .select()
    .from(claimPeerMeshPings)
    .where(
      and(
        eq(claimPeerMeshPings.pariwarId, pariwarId),
        eq(claimPeerMeshPings.selectionId, selectionId),
      ),
    )
    .orderBy(asc(claimPeerMeshPings.memberId));
}

/** A recorded peer-mesh response (from a `claim.peer_mesh_responded` annotation event). */
export interface PeerMeshResponse {
  readonly responderMemberId: string;
  readonly response: 'confirmed' | 'denied' | 'unknown';
}

/**
 * Read the recorded peer-mesh responses for a claim from `events_log` (event-log-as-truth) —
 * every `claim.peer_mesh_responded` event on the claim's stream, in append order. The
 * window-expiry job counts DISTINCT responders from this (a member responding twice is one
 * peer). Non-responses are ABSENCES — they never appear here, and are NEVER inferred as
 * `denied` (AC4). Tenant-scoped by RLS; filtered by `stream_id` (== claim_case_id).
 */
export async function getPeerMeshResponses(
  db: Db,
  claimCaseId: ClaimId,
): Promise<PeerMeshResponse[]> {
  const rows = await db
    .select({ payload: eventsLog.payload })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, claimCaseId),
        eq(eventsLog.eventType, 'claim.peer_mesh_responded'),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion));

  return rows.map((r) => {
    const p = r.payload as { responder_member_id: string; response: PeerMeshResponse['response'] };
    return { responderMemberId: p.responder_member_id, response: p.response };
  });
}

/** Count of DISTINCT responders for a claim (the AR-61 sufficiency threshold input). */
export function distinctPeerMeshResponderCount(responses: readonly PeerMeshResponse[]): number {
  return new Set(responses.map((r) => r.responderMemberId)).size;
}

// ── Story 6.36 — `workplace_named_v1`'s inputs (Task 3; AC4, AC5, AC6; 6.36a SW19–SW23, I8) ────────────────────────
//
// Everything is read AS RECORDED (server time) BEFORE THE CUT — the start of the filing day (IST). ⛔ Nothing recorded
// on or after the filing day can choose who is asked (I8), EXCEPT eligibility (SW23, read at selection time) and a
// named person's own withdrawal (6.36a SW17 — it counts whenever it happened). ⛔ No decrypt, ⛔ no KMS (SF17). ⛔ Never
// `workplace_requests` (its `state` is today's — I8 — and its typed text is member-typed and erasable); ⛔ never
// `workplaces.status` (a delisted workplace still counts — I3). The reads are BOUNDED by the deceased's two
// workplaces and ≤ 3 named people — ⛔ the whole roster (NARROWS 6.6's uncapped-snapshot item for this metric).

/** How many days count as "recent" — the previous workplace (SW21), settled (SW22) and the staff line (SW20). */
export const PEER_MESH_RECENT_DAYS = 90;

/** The selection's anchor (AC4; SW19). */
export interface PeerMeshFilingCut {
  /** The IST calendar date the claim was filed. */
  readonly filingDate: CalendarDateString;
  /** IST midnight opening `filingDate` — rows count only when recorded STRICTLY before it. */
  readonly cut: Date;
  /** IST midnight 90 days before the cut — the lower bound of "recent" (inclusive). */
  readonly recentFrom: Date;
}

/**
 * The cut for a filing instant (AC4; SW19, SF17): the START of its FILING day (IST) — `istMidnightAt(istDateOf(at))` —
 * ⛔ the date of death (in v1 the certificate's OCR'd date is always empty). PURE. WHICH filing is
 * {@link resolvePeerMeshFilingCut}'s question (RF1 — `2026-10-16-339`).
 */
export function peerMeshFilingCut(claimCreatedAt: Date): PeerMeshFilingCut {
  const filingDate = istDateOf(claimCreatedAt);
  return {
    filingDate,
    cut: istMidnightAt(filingDate),
    recentFrom: istMidnightAt(addCalendarDays(filingDate, -PEER_MESH_RECENT_DAYS)),
  };
}

/**
 * ⭐ THE ONE place the anchor is chosen (AC4; RF1 — `2026-10-16-339`, Trustee-ratified, option C): *"The first filing
 * counts, unless an investigation found the member innocent of a claim filed while they were alive."* The anchor is the
 * EARLIEST `claims.created_at` among the claims — in ANY state — naming this deceased in the Pariwar, EXCLUDING every
 * claim that carries a `member_found_innocent` finding (`-238`; the SAME filter `nominee-lock.ts` applies). Our reading
 * (⛔ ratified): a refused, closed or appealed claim still anchors; only the innocence finding lifts one. Until the fraud
 * register (row 6-22) writes that finding, this behaves exactly as option A. When every such claim carries the finding,
 * the claim being selected for counts from its own filing (defensive — unreachable today). A read of `claims` and
 * `claim_nominee_findings` only (⛔ decrypt, ⛔ KMS); both have Pariwar-wide `FOR SELECT TO twt_app` policies.
 */
export async function resolvePeerMeshFilingCut(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly deceasedMemberId: MemberId; readonly claimCreatedAt: Date },
): Promise<PeerMeshFilingCut> {
  const r = await db.execute<{ first: Date | string | null }>(sql`
    SELECT min(c.created_at) AS first
      FROM claims c
     WHERE c.pariwar_id = ${input.pariwarId}
       AND c.deceased_member_id = ${input.deceasedMemberId}
       AND NOT EXISTS (
             SELECT 1 FROM claim_nominee_findings f
              WHERE f.pariwar_id = c.pariwar_id
                AND f.claim_case_id = c.claim_case_id
                AND f.kind = 'member_found_innocent')`);
  const first = r.rows[0]?.first ?? null;
  return peerMeshFilingCut(first === null ? input.claimCreatedAt : first instanceof Date ? first : new Date(first));
}

/** One `member_postings` row, as the run derivation needs it (newest first). */
export interface PeerMeshPostingRow {
  readonly postingId: string;
  readonly workplaceId: string | null;
  readonly workplaceRequestId: string | null;
  readonly isRetirement: boolean;
  /** `YYYY-MM-DD`, or NULL (legacy / district-only rows only). */
  readonly startedOn: string | null;
  readonly createdAt: Date;
}

/** The four posting row kinds (as shipped — `0161`, the life-events handler). */
export type PeerMeshPostingKind = 'workplace' | 'not_listed' | 'retirement' | 'district_only';

export function peerMeshPostingKind(r: PeerMeshPostingRow): PeerMeshPostingKind {
  if (r.workplaceId !== null) return 'workplace';
  if (r.workplaceRequestId !== null) return 'not_listed';
  if (r.isRetirement) return 'retirement';
  return 'district_only';
}

/** A member's postings as of the cut, reduced to what the selection reads (SW21). */
export interface PeerMeshPostingRun {
  /** The latest posting's workplace, when that posting is a *workplace* row; otherwise NULL. */
  readonly currentWorkplaceId: string | null;
  /** The latest EARLIER *workplace* row naming a DIFFERENT workplace (skipping every other kind); NULL when none. */
  readonly previousWorkplaceId: string | null;
  /** The `started_on` of the current run's EARLIEST row (NULL when there is no run, or — unreachable — a NULL start). */
  readonly runStartedOn: string | null;
  /** The `created_at` of the current run's EARLIEST row (SW22's `settled` reads it); NULL when there is no run. */
  readonly runRecordedAt: Date | null;
  /** The latest posting's `created_at` (the staff line reads it); NULL when there is no posting. */
  readonly latestRecordedAt: Date | null;
}

/**
 * Derive the run (6.36a SW21 word for word): *"the latest consecutive postings of the same kind, counted back from the
 * latest posting: rows naming the current workplace (an 'isn't listed' row BETWEEN two of them ⛔ never breaks the run),
 * or — when the latest row is a retirement or an unconfirmed 'isn't listed' — the latest consecutive rows of THAT kind;
 * its start = the `started_on` of its EARLIEST row"*. Pure. `rows` = the member's postings recorded before the cut,
 * NEWEST FIRST (`created_at DESC, posting_id DESC`).
 *   · A *district-only* row ⛔ never breaks a run and is ⛔ never a run of its own — it is skipped (vacuous today: it
 *     cannot follow a workplace row, since `district_only` is refused once the Pariwar has a list). A LATEST
 *     *district-only* row ⇒ ⛔ current workplace, ⛔ run (reachable only for a member who never posted after the list —
 *     who then has ⛔ workplace row at all).
 *   · *"Unconfirmed as of the cut"* ⇔ the *"isn't listed"* row is the latest posting (a confirmation writes a NEW
 *     *workplace* posting — 6.36c AC4).
 */
export function derivePeerMeshPostingRun(rows: readonly PeerMeshPostingRow[]): PeerMeshPostingRun {
  const latest = rows[0];
  if (!latest) {
    return { currentWorkplaceId: null, previousWorkplaceId: null, runStartedOn: null, runRecordedAt: null, latestRecordedAt: null };
  }
  const latestKind = peerMeshPostingKind(latest);
  const currentWorkplaceId = latestKind === 'workplace' ? latest.workplaceId : null;
  const previousRow = rows.find((r) => peerMeshPostingKind(r) === 'workplace' && r.workplaceId !== currentWorkplaceId);
  const previousWorkplaceId = previousRow?.workplaceId ?? null;
  if (latestKind === 'district_only') {
    return { currentWorkplaceId: null, previousWorkplaceId, runStartedOn: null, runRecordedAt: null, latestRecordedAt: latest.createdAt };
  }

  let earliest: PeerMeshPostingRow = latest;
  for (const r of rows.slice(1)) {
    const k = peerMeshPostingKind(r);
    if (k === 'district_only') continue;
    if (latestKind === 'workplace') {
      if (k === 'workplace' && r.workplaceId === currentWorkplaceId) earliest = r;
      else if (k === 'not_listed') continue; // BETWEEN two rows of the run ⇒ ⛔ a break; a trailing one is ⛔ part of it
      else break;
    } else if (k === latestKind) {
      earliest = r;
    } else {
      break;
    }
  }
  return {
    currentWorkplaceId,
    previousWorkplaceId,
    runStartedOn: earliest.startedOn,
    runRecordedAt: earliest.createdAt,
    latestRecordedAt: latest.createdAt,
  };
}

/**
 * The previous workplace counts when the CURRENT run began less than 90 days before the FILING date (SW21) — measured
 * on the self-declared `started_on` (⚠ Trap 3: `settled` measures the RECORDED `created_at` — two clocks, two questions).
 * A run whose earliest row has a NULL `started_on` is treated as RECENT — unreachable: the `workplace`, `not_listed` and
 * `retired` arms all require `startedOn` (`packages/contracts/src/members/workplace.ts`); a NULL-start row (legacy, or
 * `district_only`) can only come BEFORE the list, so never after a workplace row.
 */
export function peerMeshPreviousWorkplaceCounts(run: PeerMeshPostingRun, filingDate: CalendarDateString): boolean {
  if (run.previousWorkplaceId === null) return false;
  if (run.runStartedOn === null) return true;
  return run.runStartedOn > addCalendarDays(filingDate, -PEER_MESH_RECENT_DAYS);
}

// ── SW23 — the ONE eligibility predicate (AC6) ─────────────────────────────────────────────────────────────────────────

/** Who must ⛔ be asked, beyond the state / claim / identity rules. */
export interface PeerMeshEligibilityExclusions {
  readonly deceasedMemberId: MemberId;
  /** NULLABLE — a NULL claimant excludes NOBODY (⛔ everybody). */
  readonly claimantActorId: string | null;
}

/**
 * ⭐ THE ONE predicate for who may be ASKED about a death (6.36a SW23; PM1 (i)) — the snapshot uses it, and 6.27c's
 * send-time re-check MUST reuse it (keeping PM1's decrypt-time `no_sendable_number` check beside it). `m` is a
 * `members` row:
 *   · `members.state = 'active'` ONLY — ⚠ `active-in-grace` is ⛔ asked (`-333` call 2 (d)), unlike 6.36b's
 *     `knownPersonEligibleSql` (which admits it). Keep the two separate (6.36b's deferred W5 rests on this). An erased
 *     member is kept out HERE (`anonymized`) — ⛔ by the identity row (erasure RETAINS the blind index);
 *   · ⛔ a claim (in ANY state) naming them as the deceased (6.36b's `namedByClaimSql` — the same meaning);
 *   · an identity row exists (an `active` member always has a normalised mobile; ⛔ KMS);
 *   · ⛔ the deceased, ⛔ the claimant.
 * ⚠ Recorded, ⛔ changed: a member under a moderation SUSPENSION stays eligible (6.27a F3); a relative is ⛔ excluded
 * (no family-link data — the deferred item stays open).
 */
export function peerMeshEligibleMemberSql(m: SQL, x: PeerMeshEligibilityExclusions): SQL {
  return sql`(${m}.state = 'active'
    AND NOT ${namedByClaimSql(sql`${m}.pariwar_id`, sql`${m}.member_id`)}
    AND EXISTS (SELECT 1 FROM member_identities pm_i WHERE pm_i.pariwar_id = ${m}.pariwar_id AND pm_i.member_id = ${m}.member_id)
    AND ${m}.member_id <> ${x.deceasedMemberId}
    ${x.claimantActorId === null ? sql`` : sql`AND ${m}.member_id <> ${x.claimantActorId}`})`;
}

// ── The snapshot reads (AC5) ───────────────────────────────────────────────────────────────────────────────────────────

export interface PeerMeshSnapshotInput {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  /** NULLABLE (`claims.claimant_actor_id`). */
  readonly claimantActorId: string | null;
  readonly cut: PeerMeshFilingCut;
}

/** The workplace half of the snapshot. */
export interface PeerMeshWorkplaceSnapshot {
  readonly currentWorkplaceId: WorkplaceId | null;
  /** The previous workplace as of the cut (stored for row 6-32 whether or not it counted). */
  readonly previousWorkplaceId: WorkplaceId | null;
  readonly previousWorkplaceCounted: boolean;
  /** The eligible colleagues — `workplace_previous` (only when it counts) and `workplace_current`. */
  readonly candidates: readonly PeerMeshGroupedCandidate[];
  /** The deceased's latest posting's `created_at` as of the cut (the staff line). */
  readonly deceasedLatestPostingAt: Date | null;
}

interface PostingSqlRow extends Record<string, unknown> {
  member_id: string;
  posting_id: string;
  workplace_id: string | null;
  workplace_request_id: string | null;
  is_retirement: boolean;
  started_on: string | null;
  created_at: Date | string;
}

function toPostingRow(r: PostingSqlRow): PeerMeshPostingRow {
  return {
    postingId: r.posting_id,
    workplaceId: r.workplace_id,
    workplaceRequestId: r.workplace_request_id,
    isRetirement: r.is_retirement,
    startedOn: r.started_on,
    createdAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
  };
}

/**
 * The deceased's postings and the colleagues at their workplace(s), AS OF THE CUT (AC5; SW20–SW22). A candidate is in
 * `workplace_current` / `workplace_previous` when THEIR latest posting before the cut is a *workplace* row at that
 * workplace; `settled` = their run's EARLIEST row was RECORDED 90 days or more before the cut. The read is driven FROM
 * `member_postings` by `(pariwar_id, workplace_id)` (0163's index), then each candidate's postings before the cut.
 */
export async function getPeerMeshWorkplaceSnapshot(db: Db, input: PeerMeshSnapshotInput): Promise<PeerMeshWorkplaceSnapshot> {
  const { pariwarId, deceasedMemberId, cut } = input;
  const own = await db.execute<PostingSqlRow>(sql`
    SELECT p.member_id, p.posting_id, p.workplace_id, p.workplace_request_id, p.is_retirement, p.started_on::text AS started_on, p.created_at
      FROM member_postings p
     WHERE p.pariwar_id = ${pariwarId} AND p.member_id = ${deceasedMemberId} AND p.created_at < ${cut.cut}
     ORDER BY p.created_at DESC, p.posting_id DESC`);
  const run = derivePeerMeshPostingRun(own.rows.map(toPostingRow));
  const previousWorkplaceCounted = peerMeshPreviousWorkplaceCounts(run, cut.filingDate);
  const current = run.currentWorkplaceId;
  const previous = previousWorkplaceCounted ? run.previousWorkplaceId : null;
  const result = {
    currentWorkplaceId: current === null ? null : toWorkplaceId(current),
    previousWorkplaceId: run.previousWorkplaceId === null ? null : toWorkplaceId(run.previousWorkplaceId),
    previousWorkplaceCounted,
    deceasedLatestPostingAt: run.latestRecordedAt,
  };
  const workplaces = [current, previous].filter((w): w is string => w !== null);
  if (workplaces.length === 0) return { ...result, candidates: [] };

  const rows = await db.execute<PostingSqlRow>(sql`
    SELECT p.member_id, p.posting_id, p.workplace_id, p.workplace_request_id, p.is_retirement, p.started_on::text AS started_on, p.created_at
      FROM member_postings p
      JOIN members m ON m.member_id = p.member_id AND m.pariwar_id = p.pariwar_id
     WHERE p.pariwar_id = ${pariwarId}
       AND p.created_at < ${cut.cut}
       AND p.member_id IN (
             SELECT w.member_id FROM member_postings w
              WHERE w.pariwar_id = ${pariwarId}
                AND w.workplace_id IN (${sql.join(workplaces.map((w) => sql`${w}::uuid`), sql`, `)})
                AND w.created_at < ${cut.cut})
       AND ${peerMeshEligibleMemberSql(sql`m`, { deceasedMemberId, claimantActorId: input.claimantActorId })}
     ORDER BY p.member_id, p.created_at DESC, p.posting_id DESC`);

  const byMember = new Map<string, PeerMeshPostingRow[]>();
  for (const r of rows.rows) {
    const list = byMember.get(r.member_id) ?? [];
    list.push(toPostingRow(r));
    byMember.set(r.member_id, list);
  }
  const settledBy = cut.recentFrom.getTime();
  const candidates: PeerMeshGroupedCandidate[] = [];
  for (const [memberId, postings] of byMember) {
    const theirs = derivePeerMeshPostingRun(postings);
    const at = theirs.currentWorkplaceId;
    let group: PeerMeshCandidateGroup | null = null;
    if (at !== null && at === previous) group = 'workplace_previous';
    else if (at !== null && at === current) group = 'workplace_current';
    if (group === null) continue;
    candidates.push({
      memberId: toMemberId(memberId),
      group,
      settled: theirs.runRecordedAt !== null && theirs.runRecordedAt.getTime() <= settledBy,
    });
  }
  candidates.sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
  return { ...result, candidates };
}

/**
 * The deceased's NAMED people as of the cut (AC5; 6.36a SW17, SW20): links with the deceased as the NAMER that were
 * ACCEPTED before the cut and still live at it — `responded_at < cut AND state IN ('accepted','removed','erased') AND
 * (state = 'accepted' OR ended_at >= cut)`. ⚠ A STATE test, ⛔ a timestamp test (Trap 5 — a decline also writes
 * `responded_at`). A `withdrawn` link ⛔ never counts, whenever it ended (read per link); `declined` / `lapsed` never;
 * an `asked → removed | erased` link has `responded_at` NULL ⇒ ⛔. Through SW23. ≤ 3 by construction (6.36b's backstop).
 */
export async function getPeerMeshNamedSnapshot(db: Db, input: PeerMeshSnapshotInput): Promise<MemberId[]> {
  const r = await db.execute<{ named_member_id: string }>(sql`
    SELECT DISTINCT k.named_member_id
      FROM member_known_people k
      JOIN members m ON m.member_id = k.named_member_id AND m.pariwar_id = k.pariwar_id
     WHERE k.pariwar_id = ${input.pariwarId}
       AND k.namer_member_id = ${input.deceasedMemberId}
       AND k.responded_at < ${input.cut.cut}
       AND k.state IN ('accepted', 'removed', 'erased')
       AND (k.state = 'accepted' OR k.ended_at >= ${input.cut.cut})
       AND ${peerMeshEligibleMemberSql(sql`m`, { deceasedMemberId: input.deceasedMemberId, claimantActorId: input.claimantActorId })}
     ORDER BY k.named_member_id`);
  return r.rows.map((x) => toMemberId(x.named_member_id));
}

/**
 * The staff line (AC5; 6.36a SW20; `-331` SC1 A — *"staff are told when … the people they named changed"*): `true`
 * when, in [cut − 90 days, cut), the deceased's latest posting was recorded; or one of their links was ACCEPTED
 * (`responded_at` in the window, `state <> 'declined'`); or REMOVED by their account (from `asked` or `accepted`); or
 * left the accepted set (a withdrawal, or an accepted person's erasure). An ask, a decline, a lapse and erasing an
 * unanswered ask are ⛔ none. SW20's list named the acceptance and the removal; the withdrawal and the erasure MATCH
 * the ratified sentence (our reading — ⛔ a widening).
 */
export async function getPeerMeshNamedChangeBeforeFiling(db: Db, input: PeerMeshSnapshotInput): Promise<boolean> {
  const { cut } = input;
  const r = await db.execute<{ changed: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM member_known_people k
       WHERE k.pariwar_id = ${input.pariwarId}
         AND k.namer_member_id = ${input.deceasedMemberId}
         AND (
              (k.responded_at >= ${cut.recentFrom} AND k.responded_at < ${cut.cut} AND k.state <> 'declined')
           OR (k.ended_at >= ${cut.recentFrom} AND k.ended_at < ${cut.cut}
               AND (k.state IN ('removed', 'withdrawn') OR (k.state = 'erased' AND k.responded_at IS NOT NULL)))
         )
    ) AS changed`);
  return r.rows[0]?.changed === true;
}

/** Everything `workplace_named_v1` reads for one claim (the job persists all of it). */
export interface PeerMeshGroupedSnapshot {
  readonly workplace: PeerMeshWorkplaceSnapshot;
  /** The FROZEN engine input: the colleagues, then the named people NOT already a colleague (⛔ duplicate ids). */
  readonly candidates: readonly PeerMeshGroupedCandidate[];
  readonly recentChangeBeforeFiling: boolean;
}

/**
 * Compose the grouped snapshot. A named person who is ALSO a colleague is kept ONCE, in the workplace group — the
 * named group is read only when the workplace group is empty, so the replay is unchanged, and the engine's duplicate
 * throw stays reserved for a real join defect.
 */
export async function getPeerMeshGroupedSnapshot(db: Db, input: PeerMeshSnapshotInput): Promise<PeerMeshGroupedSnapshot> {
  const workplace = await getPeerMeshWorkplaceSnapshot(db, input);
  const named = await getPeerMeshNamedSnapshot(db, input);
  const colleagues = new Set<string>(workplace.candidates.map((c) => c.memberId));
  const candidates: PeerMeshGroupedCandidate[] = [
    ...workplace.candidates,
    ...named.filter((m) => !colleagues.has(m)).map((memberId) => ({ memberId, group: 'named' as const, settled: false })),
  ];
  const latest = workplace.deceasedLatestPostingAt;
  const postingChanged =
    latest !== null && latest.getTime() >= input.cut.recentFrom.getTime() && latest.getTime() < input.cut.cut.getTime();
  const recentChangeBeforeFiling = postingChanged || (await getPeerMeshNamedChangeBeforeFiling(db, input));
  return { workplace, candidates, recentChangeBeforeFiling };
}
