// The nominee-declaration LOCK at the first claim, and the Story-6-22 findings that act on it
// (Story 6.20, Task 2; D3, D17(c); AC2). Transport-free.
//
// `2026-09-20-233`: *"After member has died nominee they declared cannot be changed."* · `-234` V: *"We
// cannot know for sure that person has died unless claim was filed … allowing nominee change until claim
// has been filed."* ⇒ the declaration LOCKS AT THE FIRST CLAIM.
//
// ⭐⭐ THE LOCK KEYS TO THE DURABLE FACT THAT A CLAIM WAS EVER FILED (invariant 3):
//   · ⛔ never the `account-frozen` overlay — it is REMOVED on `claim.settled` / `claim.denied_no_appeal`;
//   · ⛔ never `getClaimByDeceasedMember` — it hides terminal claims.
// So the lock holds after settlement and after a denial, as ruled. ⛔ It is ⛔ not windowed by state
// (`2026-09-23-242` consequence 2 is answered on the CORRECTION's raise instead — D7).
//
// ⭐ THE RELEASE ROUTE (`2026-09-21-238` cl.1, option B): a claim filed against a member who is ALIVE ⛔ must
// not lock them for life. An investigation finding the member INNOCENT releases the lock that claim
// created — recorded here as a `claim_nominee_findings` row + the `claim.nominee_lock_released` identity
// annotation (⛔ never a lifecycle state, AC10).
// ⭐ Story 6.22 (`2026-11-01-438`) is the PRODUCER: `claim/fraud-investigation-persist.ts` `recordFraudFinding` calls the
// two MEMBER-finding writers below (innocent / guilty) on a flagged claim, after the member was confirmed alive. A DENIAL
// alone ⛔ never releases the lock: the lock survives a denial and waits for the finding (AC11 — designed behaviour). The
// GUILTY finding releases ⛔ lock (the leaf reads the innocent kind only — the Panel's Q1). The disqualification writer
// still has ⛔ production caller (row `6-22c`).
//
// ⭐ D3 — SERIALIZATION WITH INTAKE. The nominee-edit transaction takes `pg_advisory_xact_lock(
// intakeAdvisoryLockKey(p, m))` FIRST, taking no other lock before it, then checks for a claim, then
// writes. Every intake path goes through `tryConverge`, which takes the SAME lock before minting the
// claim row in the same transaction. Under READ COMMITTED, whichever transaction holds the lock first
// wins: an edit that commits first is legitimately "before the claim", and an intake that wins makes
// the edit see the claim and refuse. ⛔ Not the member device-binding lock (`hashtext(member_id)`).
//
// ⛔ Lives in `claim/` and is COMPOSED with `nominee/` in the API handler (T5(a): a `nominee/` → `claim/`
// import would form a runtime init cycle typecheck cannot see).

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, ClaimNomineeFindingId, MemberId, PariwarId } from '../ids/index.js';
import { MEMBER_FINDING_UNIQUE_PREDICATE, claimNomineeFindings } from '../schema/claim_nominee_findings.js';
import { claims, type ClaimRow } from '../schema/claims.js';
import { isDeathReportStanding } from './death-report.js';
import { ClaimNomineeFindingRefusedError, NomineeDeclarationLockedError } from './errors.js';
import type { ClaimEventActor } from './events.js';
import { intakeAdvisoryLockKey } from './icp.js';
import { projectClaimState } from './project.js';

/**
 * Take the D3 advisory lock for `(pariwarId, memberId)` — the SAME key every claim intake takes for
 * this member as the deceased. Transaction-scoped: released on COMMIT / ROLLBACK.
 * ⚠ MUST be the FIRST lock the nominee-edit transaction takes.
 */
export async function acquireNomineeDeclarationLock(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    intakeAdvisoryLockKey(pariwarId, memberId).toString(),
  ]);
}

/**
 * Is the member's nominee declaration LOCKED — does ANY claim exist for them as the deceased, in ANY
 * state, that ⛔ no innocence finding has released? Tenant-scoped (RLS + the explicit predicate): a
 * claim in another Pariwar is a miss.
 *
 * ⭐ Story 6.38 (DL1): the SQL MOVED, unchanged, to the leaf `death-report.ts` (`isDeathReportStanding`) — the ONE
 * definition of "a death is reported and stands" the nominee lock, the erasure lock and the claim door share.
 */
export async function isNomineeDeclarationLocked(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  return isDeathReportStanding(db, pariwarId, memberId);
}

/**
 * D3 in one call: take the advisory lock FIRST, then refuse if a claim exists. Returns normally when
 * the declaration may be edited; the caller then writes in the SAME transaction.
 *
 * @throws NomineeDeclarationLockedError  a claim was filed for this member (→ 409 `nominee.locked_claim_filed`)
 */
export async function lockNomineeDeclarationForEdit(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<void> {
  await acquireNomineeDeclarationLock(client, pariwarId, memberId);
  if (await isNomineeDeclarationLocked(bindScopedDb(client), pariwarId, memberId)) {
    throw new NomineeDeclarationLockedError(memberId);
  }
}

// ── The Story-6-22 findings (input) ─────────────────────────────────────────────────────────────

export interface RecordClaimNomineeFindingInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  /** The finding's own id, supplied by its producer (6-22). */
  readonly findingId: ClaimNomineeFindingId;
  readonly actorId: string;
  /** The investigator's display name, resolved server-side by the caller. ⛔ Never email-derived. */
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
}

async function lockClaimRow(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

/** What a member-finding writer returns: its annotation's version, and whether this call REPLAYED an earlier write. */
export interface RecordMemberFindingResult {
  readonly eventVersion: number;
  /** `true` ⇒ the same finding (same id, same kind) was already recorded — ⛔ row, ⛔ event written by this call. */
  readonly replayed: boolean;
}

type MemberFindingKind = 'member_found_innocent' | 'member_found_guilty';

/**
 * ⭐ Story 6.22 DL12 (d) — the lock order every death-report writer keeps: ONE unlocked read of the claim's (immutable)
 * deceased member, the death's INTAKE key (`intakeAdvisoryLockKey` lower-cases both ids), THEN the claim row. A re-entrant
 * no-op on the key when the caller (`recordFraudFinding`) already holds it (TR9 — ⛔ assert it is held: the test-fixture
 * callers do not hold it). Without the key a finding could race a 6.38 consumer of the leaf (erasure, withdrawal, declare,
 * intake), which all serialise on it FIRST.
 */
async function lockClaimForMemberFinding(client: pg.PoolClient, input: RecordClaimNomineeFindingInput): Promise<ClaimRow> {
  if (input.actorDisplay.trim() === '') {
    throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'missing_display', 'a finding is attributed to a named human');
  }
  const db = bindScopedDb(client);
  const [pre] = await db
    .select({ deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .limit(1);
  if (!pre) throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');
  await client.query('SELECT pg_advisory_xact_lock($1)', [intakeAdvisoryLockKey(input.pariwarId, pre.deceasedMemberId).toString()]);
  const claimRow = await lockClaimRow(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');
  return claimRow;
}

/**
 * Insert ONE member finding — DL12 (a) / (b): a TARGETED conflict on the one-member-finding index
 * (`MEMBER_FINDING_UNIQUE_PREDICATE`, raw and unqualified so Postgres infers the partial index), so a PRIMARY-KEY collision
 * (a finding id already used elsewhere) surfaces as 23505 — a 500 — and is ⛔ never read as "duplicate". On a 0-row
 * conflict the claim's member finding is RE-READ: the same id AND kind ⇒ a REPLAY (⛔ second event; the original
 * annotation's version is returned); anything else ⇒ `duplicate`.
 */
async function insertMemberFinding(
  db: Db,
  input: RecordClaimNomineeFindingInput,
  kind: MemberFindingKind,
  annotation: 'claim.nominee_lock_released' | 'claim.member_found_guilty',
): Promise<{ replayedVersion: number } | null> {
  const inserted = await db
    .insert(claimNomineeFindings)
    .values({
      findingId: input.findingId,
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      kind,
      rank: null,
      recordedByActorId: input.actorId,
      recordedByDisplay: input.actorDisplay,
    })
    .onConflictDoNothing({ target: claimNomineeFindings.claimCaseId, where: MEMBER_FINDING_UNIQUE_PREDICATE })
    .returning({ findingId: claimNomineeFindings.findingId });
  if (inserted.length > 0) return null;

  const [existing] = await db
    .select({ findingId: claimNomineeFindings.findingId, kind: claimNomineeFindings.kind })
    .from(claimNomineeFindings)
    .where(
      and(
        eq(claimNomineeFindings.pariwarId, input.pariwarId),
        eq(claimNomineeFindings.claimCaseId, input.claimCaseId),
        MEMBER_FINDING_UNIQUE_PREDICATE,
      ),
    )
    .limit(1);
  if (existing && String(existing.findingId).toLowerCase() === String(input.findingId).toLowerCase() && existing.kind === kind) {
    const version = await db.execute<{ event_version: string | number }>(sql`
      SELECT e.event_version
        FROM events_log e
       WHERE e.stream_id = ${input.claimCaseId}
         AND e.event_type = ${annotation}
         AND lower(e.payload ->> 'finding_id') = lower(${String(input.findingId)})
       ORDER BY e.event_version DESC
       LIMIT 1
    `);
    const row = version.rows?.[0];
    if (!row) throw new Error(`[nominee-lock] finding ${input.findingId} is recorded but its ${annotation} event is missing`);
    return { replayedVersion: Number(row.event_version) };
  }
  throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'duplicate', 'this claim already carries a member finding');
}

/**
 * RELEASE the death locks a claim created, on a finding that the member is INNOCENT (`2026-09-21-238` cl.1; 6.20 AC2;
 * 6.38). Writes the finding row and the `claim.nominee_lock_released` identity annotation in ONE transaction. ⛔ It changes
 * no claim state and denies nothing — Story 6.22's `recordFraudFinding` closes the claim beside it.
 * ⭐ Story 6.22 DL12 — the intake key first, a targeted conflict, an idempotent same-id retry (see the helpers above).
 */
export async function recordMemberInnocenceFinding(
  client: pg.PoolClient,
  input: RecordClaimNomineeFindingInput,
): Promise<RecordMemberFindingResult> {
  const claimRow = await lockClaimForMemberFinding(client, input);
  const db = bindScopedDb(client);
  const replay = await insertMemberFinding(db, input, 'member_found_innocent', 'claim.nominee_lock_released');
  if (replay) return { eventVersion: replay.replayedVersion, replayed: true };

  const state = claimRow.currentState as string;
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.nominee_lock_released',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'fraud_register_innocence_finding',
      actor: input.actor,
      finding_id: input.findingId,
    },
    actorId: input.actorId,
  });
  return { eventVersion: projected.eventVersion, replayed: false };
}

/**
 * ⭐ Story 6.22 (DL3 step 4) — record that the member, confirmed ALIVE, is GUILTY of taking part in the false report of
 * their own death (`2026-09-21-238` cl. 4). Writes the `member_found_guilty` row and the `claim.member_found_guilty`
 * identity annotation (carrying `deceased_member_id` — the overlay's STICKY freeze matches on it) in ONE transaction, on
 * EVERY guilty finding, closable claim or not. It releases ⛔ lock (the leaf reads the innocent kind only — a declared
 * narrowing pending the Panel's Q1) and changes ⛔ claim state (`recordFraudFinding` closes a closable claim beside it).
 * Built with DL12 (a), (b), (d) from the start.
 */
export async function recordMemberGuiltFinding(
  client: pg.PoolClient,
  input: RecordClaimNomineeFindingInput,
): Promise<RecordMemberFindingResult> {
  const claimRow = await lockClaimForMemberFinding(client, input);
  const db = bindScopedDb(client);
  const replay = await insertMemberFinding(db, input, 'member_found_guilty', 'claim.member_found_guilty');
  if (replay) return { eventVersion: replay.replayedVersion, replayed: true };

  const state = claimRow.currentState as string;
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.member_found_guilty',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'fraud_register_guilt_finding',
      actor: input.actor,
      finding_id: input.findingId,
      deceased_member_id: claimRow.deceasedMemberId,
    },
    actorId: input.actorId,
  });
  return { eventVersion: projected.eventVersion, replayed: false };
}

/**
 * Record a finding that ONE nominee is DISQUALIFIED for fraud (`2026-09-21-240` cl.4; D17(c)). The
 * effective accessor then removes that rank and RE-RANKS the survivor to rank 1 at 100%.
 * ⛔ Never a District Admin determination mark — that would give the District Admin a power no ruling
 * names. ⚠ ⛔ NO PRODUCTION CALLER until row `6-22c` lands; AC11(iv) drives it with a test-seeded finding. Its own
 * defects (an untargeted conflict, a `Db` rather than a client, ⛔ claim event, ⛔ state window, ⛔ rank-exists check) are
 * fixed with that producer (Story 6.22 DL12 — recorded, ⛔ fixed here: no caller).
 * A new finding changes the effective declaration and therefore its token, so any recorded name check
 * goes STALE (AC5).
 */
export async function recordNomineeDisqualificationFinding(
  db: Db,
  input: Omit<RecordClaimNomineeFindingInput, 'actor'> & { readonly rank: 1 | 2 },
): Promise<void> {
  if (input.actorDisplay.trim() === '') {
    throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'missing_display', 'a finding is attributed to a named human');
  }
  const claimRow = await lockClaimRow(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');
  const inserted = await db
    .insert(claimNomineeFindings)
    .values({
      findingId: input.findingId,
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      kind: 'nominee_disqualified',
      rank: input.rank,
      recordedByActorId: input.actorId,
      recordedByDisplay: input.actorDisplay,
    })
    .onConflictDoNothing()
    .returning({ findingId: claimNomineeFindings.findingId });
  if (inserted.length === 0) {
    throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'duplicate', `rank ${input.rank} is already disqualified`);
  }
}
