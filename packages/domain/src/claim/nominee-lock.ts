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
// ⚠⚠ ⛔ NO PRODUCTION CALLER UNTIL ROW `6-22` LANDS (`2026-09-21-241` §6). The innocence finding is the
// fraud register's investigation outcome; until it exists, a living member locked by a stray claim STAYS
// locked — a named go-live residual, ⛔ not a defect. And a DENIAL alone ⛔ never releases the lock: the
// lock survives a denial and waits for the finding (AC11 — designed behaviour).
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
import { claimNomineeFindings } from '../schema/claim_nominee_findings.js';
import { claims } from '../schema/claims.js';
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
 * ⚠ Raw SQL with explicit aliases, ⛔ not a Drizzle correlated subquery: an outer column referenced
 * inside a same-named subquery table collapses to a tautology ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export async function isNomineeDeclarationLocked(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db.execute<{ locked: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
        FROM claims c
       WHERE c.pariwar_id = ${pariwarId}
         AND c.deceased_member_id = ${memberId}
         AND NOT EXISTS (
           SELECT 1
             FROM claim_nominee_findings f
            WHERE f.pariwar_id = c.pariwar_id
              AND f.claim_case_id = c.claim_case_id
              AND f.kind = 'member_found_innocent'
         )
    ) AS locked
  `);
  return rows.rows?.[0]?.locked === true;
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

/**
 * RELEASE the nominee lock a claim created, on a finding that the member is INNOCENT
 * (`2026-09-21-238` cl.1; AC2). Writes the finding row and the `claim.nominee_lock_released` identity
 * annotation in ONE transaction. ⛔ It changes no claim state and denies nothing.
 *
 * ⚠ ⛔ NO PRODUCTION CALLER until row `6-22` lands — see the header. AC11(ii) drives it with a
 * test-seeded finding.
 */
export async function recordMemberInnocenceFinding(
  client: pg.PoolClient,
  input: RecordClaimNomineeFindingInput,
): Promise<{ eventVersion: number }> {
  if (input.actorDisplay.trim() === '') {
    throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'missing_display', 'a finding is attributed to a named human');
  }
  const db = bindScopedDb(client);
  const claimRow = await lockClaimRow(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim');

  const inserted = await db
    .insert(claimNomineeFindings)
    .values({
      findingId: input.findingId,
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      kind: 'member_found_innocent',
      rank: null,
      recordedByActorId: input.actorId,
      recordedByDisplay: input.actorDisplay,
    })
    .onConflictDoNothing()
    .returning({ findingId: claimNomineeFindings.findingId });
  if (inserted.length === 0) {
    throw new ClaimNomineeFindingRefusedError(input.claimCaseId, 'duplicate', 'this claim already carries an innocence finding');
  }

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
  return { eventVersion: projected.eventVersion };
}

/**
 * Record a finding that ONE nominee is DISQUALIFIED for fraud (`2026-09-21-240` cl.4; D17(c)). The
 * effective accessor then removes that rank and RE-RANKS the survivor to rank 1 at 100%.
 * ⛔ Never a District Admin determination mark — that would give the District Admin a power no ruling
 * names. ⚠ ⛔ NO PRODUCTION CALLER until row `6-22` lands; AC11(iv) drives it with a test-seeded finding.
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
