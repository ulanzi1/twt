// Pool-bound payment enforcement — the member-cycle → assigned-pool + collection-binding resolver
// and the pure wrong-pool classifier. Story 7.6 (Tasks 1/2; AC1/AC2/AC4).
//
// This is a [PRIMITIVE]: it commits the domain building blocks three later epics consume — it does
// NOT build those consumers. Epic 8's <UPIIntentButton> builds the `upi://pay?pa=…` deep-link string
// from THIS binding; Epic 9 reconciliation calls THIS classifier to record a deposit valid/wrong_pool;
// Epic 10 helpdesk facilitates recovery. 7.6 stays TRANSPORT-FREE + DECRYPTION-FREE (the consumer
// decrypts the ciphertext under its own encryption context).
//
// ── D1 — the SNAPSHOT is the source of truth, NEVER a recompute (load-bearing) ─
// `assign.ts` (lines 24-27) is explicit: the persisted `pool_snapshots.member_assignments` is the
// source of truth Story 7.6 reads for VPA resolution — never a naive `hash(member_id + cycle_id) % N`
// recompute. The balancing pass ([[project_pool_assignment_engine]]) means a redistributed member's
// FINAL pool depends on the whole frozen roster; only the persisted snapshot is authoritative. So this
// module reads the LATEST snapshot per pool in the cycle and finds which pool's member_assignments
// contains the member — it NEVER calls `assignMembersToPools` at resolution time.
//
// ── D5 — collection binding must be UNIQUE per pool per cycle (real correctness guard) ─
// Wrong-pool detection is only well-defined if a deposit's destination account maps to exactly one pool.
// Pool→claim is 1:1, so this guard keys on `claim_case_id`: it fails loud if two pools in one cycle share
// the SAME claim (there is no (cycle_id, claim_case_id) uniqueness constraint on `pools`, so a spawn bug
// could produce two pools for one claim — they'd share that claim's accounts and a deposit couldn't be
// attributed to a unique pool). What this guard does NOT (and CANNOT) catch is two DIFFERENT claims whose
// nominee accounts point at the same real-world bank account (e.g. two losses in one family reusing one
// account): those have DISTINCT `claim_case_id`s, so this claim-keyed check passes — and the accounts are
// Tier-1 envelope ciphertext, so this decryption-free layer cannot compare account numbers to detect it.
// That account-level cross-claim collision is Epic 9's reconciliation matcher's responsibility (it
// resolves a deposit → pool BY its destination account, so it is the layer that sees the ambiguity and
// must fail there). Here the resolver fails loud (WrongPoolBindingAmbiguousError) on the claim-level case
// rather than silently pick a pool.
//
// ── Purity contract ───────────────────────────────────────────────────────────
// The classifier + the resolution CORE (resolveAssignedPoolFromCandidates / the uniqueness assertion)
// are PURE (no clock, no DB, no randomness) — the DB accessors below are thin shells that load the
// candidates and delegate to the core, so the guards are DB-free unit-testable (contribution-binding.test.ts).

import { and, desc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, CycleFreezeCommitId, MemberId, PariwarId, PoolId } from '../ids/index.js';
import { getClaimNomineeBankAccountsCiphertext } from '../claim/nominee-bank-read.js';
import type { ClaimNomineeBankAccountRow } from '../schema/claim_nominee_bank_accounts.js';
import { pools } from '../schema/pools.js';
import { poolSnapshots } from '../schema/pool_snapshots.js';
import {
  ClaimNomineeBankAccountsCountIntegrityError,
  MemberPoolAssignmentIntegrityError,
  WrongPoolBindingAmbiguousError,
} from './errors.js';
import type { PoolSnapshotV1 } from './snapshot.js';

// ── The wrong-pool classification verdict + reason code (Story 7.6, AC2) ───────
// The CANONICAL tuples live here in @twt/domain (the lowest layer); the contracts `.strict()` union in
// packages/contracts/src/pools/pool-bound-payment.ts is RE-DECLARED value-aligned (contracts cannot
// import @twt/domain — the turbo cycle) and a cross-package LOCKSTEP test pins the two (the
// pool_fixed_amount_change_type precedent). The union is OPEN BY DESIGN (Epic 7.7 adds
// `amount_mismatch`) but ships ONLY these two values now — no dead surface until the consumer inserts it.

/** The contribution-validity verdicts. `wrong_pool` iff a deposit landed in a non-assigned pool. */
export const CONTRIBUTION_VALIDITY_VERDICTS = ['valid', 'wrong_pool'] as const;
export type ContributionValidityVerdict = (typeof CONTRIBUTION_VALIDITY_VERDICTS)[number];

/** The reason code accompanying each verdict — a stable machine token (extensible with the union). */
export const CONTRIBUTION_VALIDITY_REASON_CODES = [
  'assigned_pool_match',
  'deposited_to_non_assigned_pool',
] as const;
export type ContributionValidityReasonCode = (typeof CONTRIBUTION_VALIDITY_REASON_CODES)[number];

/** The classifier's typed verdict + reason code. */
export interface ContributionValidityResult {
  readonly verdict: ContributionValidityVerdict;
  readonly reasonCode: ContributionValidityReasonCode;
}

/**
 * Classify a deposit's destination against the member's assigned pool (AC2). PURE + deterministic —
 * both pool ids are resolved by the CALLER (Epic 9's matcher resolves `depositedToPoolId` from the
 * deposit's destination account; the assigned pool comes from {@link resolveAssignedPoolForMember}).
 * `wrong_pool` iff the deposited pool differs from the assigned pool. No clock, no DB, no I/O.
 */
export function classifyContributionDestination(input: {
  readonly assignedPoolId: string;
  readonly depositedToPoolId: string;
}): ContributionValidityResult {
  const isWrongPool = input.depositedToPoolId !== input.assignedPoolId;
  return isWrongPool
    ? { verdict: 'wrong_pool', reasonCode: 'deposited_to_non_assigned_pool' }
    : { verdict: 'valid', reasonCode: 'assigned_pool_match' };
}

// ── The pure resolution core (DB-free) ────────────────────────────────────────

/** One pool in a cycle + the member ids its LATEST snapshot assigns to it (the resolution input). */
export interface PoolBindingCandidate {
  readonly poolId: PoolId;
  readonly claimCaseId: ClaimId;
  readonly poolIndex: number;
  readonly poolCanonicalIdentifier: string;
  /** The member ids in this pool's latest `pool_snapshots.member_assignments`. */
  readonly memberIds: readonly string[];
}

/** The assigned pool for a member-cycle (the collection binding's identity half, without accounts). */
export interface AssignedPoolRef {
  readonly poolId: PoolId;
  readonly claimCaseId: ClaimId;
  readonly poolIndex: number;
  readonly poolCanonicalIdentifier: string;
}

/**
 * The resolver result — a member is EITHER assigned to exactly one pool, or `{ assigned: false }` (the
 * first-class ABSENCE signal, AC1.4: not active-at-freeze / not in any pool's latest snapshot). Absence
 * is NEVER a throw-as-flow; ≥2 memberships IS a throw (integrity violation).
 */
export type AssignedPoolResolution =
  | (AssignedPoolRef & { readonly assigned: true })
  | { readonly assigned: false };

/**
 * Assert every pool in the cycle has a DISTINCT `claim_case_id` (⇒ disjoint collection bindings), AC1.3
 * / D5. Fails loud with {@link WrongPoolBindingAmbiguousError} on the first duplicate — never silently
 * picks a pool. Pure. `cycleIdForError` is only threaded into the error message.
 */
export function assertUniquePoolCollectionBindings(
  candidates: readonly PoolBindingCandidate[],
  cycleIdForError: string,
): void {
  const seenClaimToPool = new Map<string, PoolId>();
  for (const c of candidates) {
    const priorPoolId = seenClaimToPool.get(c.claimCaseId);
    if (priorPoolId !== undefined) {
      throw new WrongPoolBindingAmbiguousError(cycleIdForError, c.claimCaseId, [priorPoolId, c.poolId]);
    }
    seenClaimToPool.set(c.claimCaseId, c.poolId);
  }
}

/**
 * Resolve a member's assigned pool from the cycle's pool→assignment candidates (PURE core, AC1.1/AC1.4).
 * First guards binding uniqueness (AC1.3), then finds the pool whose latest snapshot contains the member:
 *   · 0 occurrences → `{ assigned: false }` (the ABSENCE signal — not a throw);
 *   · 1 occurrence  → the assigned pool;
 *   · ≥2 occurrences → {@link MemberPoolAssignmentIntegrityError} (fail loud — a member is in exactly one
 *     pool exactly once). Counting OCCURRENCES (not matching pools) also catches a member listed TWICE
 *     within a single pool's `memberIds` — a corrupt snapshot that "1 matching pool" alone would mask.
 */
export function resolveAssignedPoolFromCandidates(
  memberId: string,
  candidates: readonly PoolBindingCandidate[],
  cycleIdForError: string,
): AssignedPoolResolution {
  assertUniquePoolCollectionBindings(candidates, cycleIdForError);
  const occurrences = candidates.flatMap((c) =>
    c.memberIds.filter((id) => id === memberId).map(() => c),
  );
  if (occurrences.length === 0) return { assigned: false };
  if (occurrences.length > 1) {
    throw new MemberPoolAssignmentIntegrityError(
      memberId,
      occurrences.map((c) => c.poolId),
    );
  }
  const m = occurrences[0]!;
  return {
    assigned: true,
    poolId: m.poolId,
    claimCaseId: m.claimCaseId,
    poolIndex: m.poolIndex,
    poolCanonicalIdentifier: m.poolCanonicalIdentifier,
  };
}

/** Read the member ids off a persisted snapshot's `member_assignments` (defensive over a missing/empty
 *  hot-row JSONB). The snapshot column is `$type<PoolSnapshotV1>()`, so drizzle returns the parsed body.
 *  A non-string/missing `member_id` entry (corrupt snapshot data bypassing the `PoolSnapshotV1` type) is
 *  dropped rather than silently admitted as `undefined` — it can never legitimately match a real member. */
function memberIdsOf(snapshot: PoolSnapshotV1 | undefined): readonly string[] {
  const assignments = snapshot?.member_assignments;
  if (!Array.isArray(assignments)) return [];
  return assignments
    .map((a) => a.member_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

// ── The DB accessors (thin shells over the pure core) ─────────────────────────

/**
 * Load the cycle's pools + each pool's LATEST snapshot member ids — the {@link PoolBindingCandidate}
 * set the pure core resolves against. Reads the persisted snapshot (D1), NEVER recomputes. "Latest per
 * pool" = `(pool_id, created_at DESC)` (the `pool_snapshots_pool_id_created_at_idx` index), with
 * `state_event_version DESC` as a tiebreaker (a higher event version is genuinely more recent — it keeps
 * selection stable when two snapshot rows share a `created_at`, e.g. inside one tx), and `snapshot_id
 * DESC` as a final deterministic tiebreaker for the residual case where both also tie (no ordering
 * significance — it only guarantees a total order so "latest" never depends on DB row-return order).
 * Tenant-scoped by the explicit `pariwar_id` predicate + RLS.
 */
async function loadCycleBindingCandidates(
  db: Db,
  pariwarId: PariwarId,
  cycleId: CycleFreezeCommitId,
): Promise<PoolBindingCandidate[]> {
  const poolRows = await db
    .select({
      poolId: pools.poolId,
      claimCaseId: pools.claimCaseId,
      poolIndex: pools.poolIndex,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
    })
    .from(pools)
    .where(and(eq(pools.pariwarId, pariwarId), eq(pools.cycleId, cycleId)));

  if (poolRows.length === 0) return [];

  const poolIds = poolRows.map((r) => r.poolId);
  // The latest snapshot per pool (DISTINCT ON the pool id, ordered so the newest row wins).
  const latestSnapshots = await db
    .selectDistinctOn([poolSnapshots.poolId], {
      poolId: poolSnapshots.poolId,
      snapshot: poolSnapshots.snapshot,
    })
    .from(poolSnapshots)
    .where(and(eq(poolSnapshots.pariwarId, pariwarId), inArray(poolSnapshots.poolId, poolIds)))
    .orderBy(
      poolSnapshots.poolId,
      desc(poolSnapshots.createdAt),
      desc(poolSnapshots.stateEventVersion),
      desc(poolSnapshots.snapshotId),
    );

  const latestByPool = new Map<string, PoolSnapshotV1>();
  for (const row of latestSnapshots) latestByPool.set(row.poolId, row.snapshot);

  return poolRows.map((r) => ({
    poolId: r.poolId,
    claimCaseId: r.claimCaseId,
    poolIndex: r.poolIndex,
    poolCanonicalIdentifier: r.poolCanonicalIdentifier,
    memberIds: memberIdsOf(latestByPool.get(r.poolId)),
  }));
}

/**
 * Resolve a member's assigned pool for a cycle from the PERSISTED snapshot (AC1.1/AC1.3/AC1.4) — never
 * a recompute. Returns the assigned pool, or `{ assigned: false }` (the absence signal). Throws
 * {@link WrongPoolBindingAmbiguousError} if two pools in the cycle share a claim, or
 * {@link MemberPoolAssignmentIntegrityError} if the member appears in ≥2 pools.
 */
export async function resolveAssignedPoolForMember(
  db: Db,
  pariwarId: PariwarId,
  cycleId: CycleFreezeCommitId,
  memberId: MemberId,
): Promise<AssignedPoolResolution> {
  const candidates = await loadCycleBindingCandidates(db, pariwarId, cycleId);
  return resolveAssignedPoolFromCandidates(memberId, candidates, cycleId);
}

/** The full member-cycle collection binding — the assigned pool + its claim's nominee bank accounts. */
export interface MemberContributionBinding extends AssignedPoolRef {
  readonly assigned: true;
  /**
   * The assigned pool's originating claim's nominee bank accounts (#1 primary → #2 secondary),
   * CIPHERTEXT AS STORED (transport-free, decryption-free — the consumer decrypts). `[]` = not yet
   * collected (the AC3 absence signal from getClaimNomineeBankAccountsCiphertext); EXACTLY TWO when
   * collected. The `pa=` VPA string is built by Epic 8, NOT here.
   */
  readonly collectionAccounts: readonly ClaimNomineeBankAccountRow[];
}

/** The binding result — the full binding, or the `{ assigned: false }` absence signal. */
export type MemberContributionBindingResolution =
  | MemberContributionBinding
  | { readonly assigned: false };

/**
 * Resolve a member-cycle's full COLLECTION BINDING (AC1.2): the assigned pool composed with its claim's
 * nominee bank accounts (ciphertext AS STORED, #1/#2 order). Returns `{ assigned: false }` for an
 * unassigned member. The accounts array is `[]` when the claim's disbursement accounts are not yet
 * collected. Transport-free + decryption-free — the consumer (Epic 8's <UPIIntentButton>) decrypts.
 */
export async function resolveMemberContributionBinding(
  db: Db,
  pariwarId: PariwarId,
  cycleId: CycleFreezeCommitId,
  memberId: MemberId,
): Promise<MemberContributionBindingResolution> {
  const resolution = await resolveAssignedPoolForMember(db, pariwarId, cycleId, memberId);
  if (!resolution.assigned) return { assigned: false };
  const collectionAccounts = await getClaimNomineeBankAccountsCiphertext(
    db,
    pariwarId,
    resolution.claimCaseId,
  );
  if (collectionAccounts.length !== 0 && collectionAccounts.length !== 2) {
    throw new ClaimNomineeBankAccountsCountIntegrityError(resolution.claimCaseId, collectionAccounts.length);
  }
  return {
    assigned: true,
    poolId: resolution.poolId,
    claimCaseId: resolution.claimCaseId,
    poolIndex: resolution.poolIndex,
    poolCanonicalIdentifier: resolution.poolCanonicalIdentifier,
    collectionAccounts,
  };
}
