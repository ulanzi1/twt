// Claim lifecycle read accessors — Story 6.1 (Task 5; AC3). Twin of member/read.ts.
//
// `getClaimStateAt` is the canonical "what was this claim's state on date X?" surface
// that the verifier console (Epic 6), the Pool Engine (Epic 7), and reconciliation
// (Epic 9) consume. It replays the claim's `events_log` stream up to — but not
// exceeding — `atTimestamp`.
//
// ── Ordered by event_version, NOT occurred_at (AC3 — load-bearing) ────────────
// `occurred_at` defaults to DB `now()` and CAN tie (two events in the same
// transaction/instant). Ordering replay by the monotonic `event_version` guarantees a
// deterministic result regardless of occurred_at ties, and makes any truncated replay
// (as this does at a timestamp boundary) a valid intermediate state, never a torn one.
// The timestamp is used only as the upper BOUND of the replay window
// (`occurred_at <= atTimestamp`), never as the sort key.
//
// Reads `events_log` directly via Drizzle (domain owns the table) rather than calling
// @twt/events.loadEvents — domain cannot import @twt/events (the cycle); see
// claim/project.ts header. The stream is small per claim.

import { and, asc, desc, eq, inArray, lte, notInArray, type SQL, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimFraudInvestigationSteps } from '../schema/claim_fraud_investigation_steps.js';
import { eventsLog } from '../schema/events_log.js';
import { claims, type ClaimRow } from '../schema/claims.js';
import { memberPostings } from '../schema/member_postings.js';
import { type ClaimLifecycleState, replayClaimState } from './state.js';
import { standingSuspicionRefusalSql } from './suspicion-refusal.js';

/**
 * Lifecycle states from which a claim never re-opens (Story 6.1 state.ts:
 * `settled` and `denied` are both annotated terminal; `reversed` re-enters
 * `approved` via an appeal, so it is NOT terminal). Story 6.24a (`2026-10-07-292` RF4) adds `closed` — another claim of
 * the death won its suspicion appeal, or (Story 6.28 OP4) another claim of the death is paid; ⛔ nothing leaves `closed`.
 */
export const CLAIM_TERMINAL_STATES: readonly ClaimLifecycleState[] = ['settled', 'denied', 'closed'] as const;

/**
 * Compute a claim's lifecycle state as of `atTimestamp` by replaying its event stream
 * up to (and including) that instant, ordered by `event_version`.
 *
 * Tenant scope is enforced by RLS (the caller has set `app.pariwar_id`); the query
 * filters by `stream_id` (= claim_case_id) which is globally unique.
 *
 * Degenerate case: if the claim has NO events at/before `atTimestamp` (e.g. an instant
 * before intake), the empty replay returns the machine's initial state
 * (`intake_pending`) — consumers own the pre-existence check (inherited Story 3.1
 * contract; use `getClaimCase` to probe existence).
 */
export async function getClaimStateAt(
  db: Db,
  claimCaseId: ClaimId,
  atTimestamp: Date,
): Promise<ClaimLifecycleState> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, claimCaseId), lte(eventsLog.occurredAt, atTimestamp)))
    .orderBy(asc(eventsLog.eventVersion));
  return replayClaimState(rows);
}

/**
 * The cached `claims` row (incl. `current_state`) for convenience consumers — a
 * transport-free point read. Tenant-scoped by RLS + the explicit `pariwar_id`
 * predicate (so a cross-tenant `claim_case_id` guess resolves to `undefined`, not
 * another tenant's row). Returns `undefined` when no claim row exists in this Pariwar.
 *
 * Recorded variance (Story 6.1 review): Task 5 specified `getClaimCase(db,
 * claimCaseId)`; the `pariwarId` parameter was added for defense-in-depth explicit
 * tenant scoping on top of RLS, mirroring how other cross-tenant-sensitive reads in
 * this codebase take the scope explicitly rather than relying on RLS alone.
 */
export async function getClaimCase(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimRow | undefined> {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  return rows[0];
}

/**
 * `getClaimCase` under a `SELECT … FOR UPDATE` row lock (Story 6.9, AC5) — the ENFORCEMENT-POINT
 * read for a consumer that guards a claim-state window then mutates related rows in the SAME
 * scope-tx (the 6.8 `recordClaimNomineeBankAccounts` locking discipline). Serializes concurrent edits
 * on the claim and closes the TOCTOU window: the tenant / ownership / current-state / deceased-member
 * values the caller enforces on all come from THIS locked row, never a stale route-level pre-read.
 * MUST be called inside an active scope-tx (the lock is released on COMMIT/ROLLBACK). Returns
 * `undefined` when no claim row exists in this Pariwar.
 */
export async function lockClaimCase(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimRow | undefined> {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update')
    .limit(1);
  return rows[0];
}

/**
 * The existing claim (if any) filed against a deceased member in this Pariwar — the
 * single-channel intake-idempotency read (Story 6.2 AC3). One death yields one claim
 * (ICP / Story 6.4 enforces cross-channel convergence); this returns the most-recently-
 * created matching row so a member-app double-tap/retry resolves the same case instead of
 * minting a second `claim_case_id` (which would double-freeze the account). Uses the
 * `claims_deceased_member_id_idx`. Tenant-scoped by RLS + the explicit `pariwar_id`
 * predicate (a cross-tenant `deceased_member_id` guess resolves to `undefined`).
 *
 * Scope note: 6.2 owns only the single-channel trivial-duplicate guard. FULL cross-channel
 * dedup (member-app + helpline for one death) is Story 6.4's ICP — this read deliberately
 * does not filter by channel, so any live intake for the death is found. It DOES filter out
 * `CLAIM_TERMINAL_STATES` (`settled`/`denied`): a death whose earlier claim already reached a
 * terminal outcome must be able to re-file (e.g. a fresh claim after `denied`), so a terminal
 * row must not be handed back as "the existing intake."
 *
 * ⭐ Story 6.24a RF2 (`-261` D4 B): it also skips a claim on which a SUSPICION REFUSAL STANDS (RF1) — the SAME conjunct as
 * `getConvergenceCandidate`, because its production caller is `initiateIntake`'s `ClaimStreamConcurrencyError` backstop,
 * which must ⛔ never hand back a claim the candidate rule now keeps apart.
 */
export async function getClaimByDeceasedMember(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<ClaimRow | undefined> {
  const rows = await db
    .select()
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, deceasedMemberId),
        notInArray(claims.currentState, [...CLAIM_TERMINAL_STATES]),
        sql`NOT ${standingSuspicionRefusalSql('claims')}`,
      ),
    )
    .orderBy(desc(claims.createdAt))
    .limit(1);
  return rows[0];
}

/**
 * Story 6.20 (AC7 / CC2; code review 2026-09-24b, BigDev option (a)) — every NON-TERMINAL claim for a
 * deceased member in this Pariwar, newest first: the helpline operator raises a nominee correction against
 * the claim of the member they have SELECTED and read back, ⛔ never a claim reference the family would have
 * to quote (nothing ever shows it to them). Usually one; two only through the convergence override. ⛔ No
 * PII — ids, state and instants. Bounded.
 */
export async function listLiveClaimsForDeceasedMember(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
  /**
   * ⭐ Story 6.24a (`2026-10-07-292` RF12) — `includeClosed`: ALSO list the member's `closed` claims (the helpline
   * read-back — a closed claim must ⛔ never vanish exactly when the family is told to call the helpline). Other terminal
   * states stay excluded; every other caller is unchanged.
   */
  opts: { readonly includeClosed?: boolean } = {},
): Promise<Pick<ClaimRow, 'claimCaseId' | 'currentState' | 'createdAt'>[]> {
  const excluded = opts.includeClosed ? CLAIM_TERMINAL_STATES.filter((s) => s !== 'closed') : CLAIM_TERMINAL_STATES;
  return db
    .select({ claimCaseId: claims.claimCaseId, currentState: claims.currentState, createdAt: claims.createdAt })
    .from(claims)
    .where(and(claimsNamingMemberWhere(pariwarId, deceasedMemberId), notInArray(claims.currentState, [...excluded])))
    .orderBy(desc(claims.createdAt), desc(claims.claimCaseId))
    .limit(10);
}

/** The claims of THIS Pariwar that name the member as the deceased — the per-member reads' shared `where`. */
function claimsNamingMemberWhere(pariwarId: PariwarId, deceasedMemberId: MemberId): SQL {
  return and(eq(claims.pariwarId, pariwarId), eq(claims.deceasedMemberId, deceasedMemberId))!;
}

// ── Story 6.22 — the fraud investigation's two lists (DL5, DL10 (iv)) ───────────────────────────────────

/** Where a claim's investigation stands — read from the STEP table (⛔ the finding kind — TR2). */
export type FraudInvestigationStatus = 'none' | 'flagged' | 'found';

/** The helpline's per-member list: ⛔ more than this, newest first. */
export const FRAUD_FLAG_CLAIMS_DEFAULT_LIMIT = 20;
export const FRAUD_FLAG_CLAIMS_MAX_LIMIT = 50;

export interface ClaimNamingMemberForFraudFlag {
  readonly claimCaseId: ClaimId;
  readonly currentState: string;
  readonly filedAt: Date;
  readonly investigation: FraudInvestigationStatus;
}

/**
 * ⭐ Story 6.22 (DL5) — EVERY claim naming the member as the deceased, in EVERY state (the leaf's own scope — the shipped
 * helpline reads drop `settled` / `denied`, so a member locked by a `denied` false claim would never appear), newest first,
 * with where each claim's investigation stands. ⛔ PII — ids, states, dates (TR14). The helpline operator reaches it only
 * for the member they have FOUND and read back.
 */
export async function listClaimsNamingMemberForFraudFlag(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
  opts: { readonly limit?: number } = {},
): Promise<ClaimNamingMemberForFraudFlag[]> {
  const rows = await db
    .select({ claimCaseId: claims.claimCaseId, currentState: claims.currentState, createdAt: claims.createdAt })
    .from(claims)
    .where(claimsNamingMemberWhere(pariwarId, deceasedMemberId))
    .orderBy(desc(claims.createdAt), desc(claims.claimCaseId))
    .limit(clampLimit(opts.limit, { default: FRAUD_FLAG_CLAIMS_DEFAULT_LIMIT, cap: FRAUD_FLAG_CLAIMS_MAX_LIMIT }));
  if (rows.length === 0) return [];
  const steps = await db
    .select({ claimCaseId: claimFraudInvestigationSteps.claimCaseId, step: claimFraudInvestigationSteps.step })
    .from(claimFraudInvestigationSteps)
    .where(
      and(
        eq(claimFraudInvestigationSteps.pariwarId, pariwarId),
        inArray(
          claimFraudInvestigationSteps.claimCaseId,
          rows.map((r) => r.claimCaseId),
        ),
      ),
    );
  const status = new Map<string, FraudInvestigationStatus>();
  for (const s of steps) {
    const key = String(s.claimCaseId).toLowerCase();
    if (s.step === 'flagged') {
      if (!status.has(key)) status.set(key, 'flagged');
    } else {
      status.set(key, 'found');
    }
  }
  return rows.map((r) => ({
    claimCaseId: r.claimCaseId,
    currentState: r.currentState,
    filedAt: r.createdAt,
    investigation: status.get(String(r.claimCaseId).toLowerCase()) ?? 'none',
  }));
}

export const OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT = 50;
export const OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT = 200;

export interface OpenFraudInvestigation {
  readonly claimCaseId: ClaimId;
  readonly currentState: string;
  readonly claimFiledAt: Date;
  readonly flaggedAt: Date;
  /** The deceased member's latest posting district — the row's authorization scope (`null` ⇒ dropped by `isVisible`). */
  readonly district: string | null;
  /** The FLAG step's actor — the route compares it to the caller (R2-6: a row the viewer flagged, which they can ⛔ finish). */
  readonly flaggerActorId: string;
}

/**
 * ⭐ Story 6.22 (DL10 (iv)) — the District Admin's WORK-LIST: claims FLAGGED with ⛔ finding yet, oldest flag first, each
 * inside the caller's scope (`isVisible` — the route passes `rbac.hasPermission(claim.record_fraud_finding)` at the row's
 * district, the per-claim gate's own predicate). The filter runs BEFORE the page limit (keyset batches — the correction
 * queue's shape), so a District Admin's own rows are never crowded out by rows they cannot see. ⛔ PII.
 *
 * ⚠ `isVisible` is REQUIRED: this reads across every district of the Pariwar, and a reader that could be called without a
 * scope predicate would return all of them (the code review of 2026-11-02, RA8). A caller that really wants every row
 * passes `() => true` and says so.
 *
 * ⚠ DELIBERATE: the district below breaks a `created_at` tie on `posting_id DESC` (the audience-read idiom of
 * `peer-mesh-read.ts` and `member-geo/resolve.ts`), while the per-claim gate's `getMemberPostingLatest` orders by
 * `created_at DESC` alone and is documented as deliberately nondeterministic on a tie (Story 1.19 D3, `2026-08-13-103`;
 * "closing it is its own story"). The two can therefore name different districts only for a member with two postings
 * written in one transaction — then the gate, not this list, is the nondeterministic side, and the worst case is a listed
 * item whose finding is refused. Re-examine when `getMemberPostingLatest` gains its tie-break.
 */
export async function listOpenFraudInvestigations(
  db: Db,
  pariwarId: PariwarId,
  opts: { readonly limit?: number; readonly isVisible: (row: { readonly district: string | null }) => boolean },
): Promise<OpenFraudInvestigation[]> {
  const pageSize = clampLimit(opts.limit, { default: OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT, cap: OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT });
  const scanBatch = Math.max(pageSize, OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT);
  const out: OpenFraudInvestigation[] = [];
  let after: { flaggedAtExact: string; claimCaseId: string } | null = null;
  for (;;) {
    const cursor: SQL = after === null ? sql`TRUE` : sql`(f.acted_at, f.claim_case_id) > (${after.flaggedAtExact}::timestamptz, ${after.claimCaseId}::uuid)`;
    const batch = await db.execute<{
      claim_case_id: string;
      current_state: string;
      created_at: Date | string;
      flagged_at: Date | string;
      flagged_at_exact: string;
      district: string | null;
      flagger_actor_id: string;
    }>(sql`
      SELECT c.claim_case_id::text AS claim_case_id, c.current_state, c.created_at,
             f.acted_at AS flagged_at, f.acted_at::text AS flagged_at_exact, f.actor_id AS flagger_actor_id,
             (SELECT p.district
                FROM ${memberPostings} p
               WHERE p.member_id = c.deceased_member_id AND p.pariwar_id = c.pariwar_id
               ORDER BY p.created_at DESC, p.posting_id DESC
               LIMIT 1) AS district
        FROM claim_fraud_investigation_steps f
        JOIN claims c ON c.pariwar_id = f.pariwar_id AND c.claim_case_id = f.claim_case_id
       WHERE f.pariwar_id = ${pariwarId}
         AND f.step = 'flagged'
         AND NOT EXISTS (
           SELECT 1 FROM claim_fraud_investigation_steps fs
            WHERE fs.pariwar_id = f.pariwar_id
              AND fs.claim_case_id = f.claim_case_id
              AND fs.step IN ('found_innocent', 'found_guilty')
         )
         AND ${cursor}
       ORDER BY f.acted_at ASC, f.claim_case_id ASC
       LIMIT ${scanBatch}
    `);
    const rows = batch.rows ?? [];
    if (rows.length === 0) break;
    const last = rows[rows.length - 1]!;
    after = { flaggedAtExact: last.flagged_at_exact, claimCaseId: last.claim_case_id };
    for (const r of rows) {
      if (!opts.isVisible({ district: r.district })) continue;
      out.push({
        claimCaseId: r.claim_case_id as ClaimId,
        currentState: r.current_state,
        claimFiledAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
        flaggedAt: r.flagged_at instanceof Date ? r.flagged_at : new Date(r.flagged_at),
        district: r.district,
        flaggerActorId: r.flagger_actor_id,
      });
    }
    if (out.length >= pageSize || rows.length < scanBatch) break;
  }
  return out.slice(0, pageSize);
}
