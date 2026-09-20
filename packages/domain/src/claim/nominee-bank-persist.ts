// Claim-time nominee-bank persistence writer — Story 6.8 (Task 4). Transport-free.
//
// The write side of the dual disbursement-account substrate. Bank collection is an ANNOTATION (D2)
// — it does NOT advance the claim's lifecycle state. `recordClaimNomineeBankAccounts` records the
// two accounts (#1/#2) in ONE scope-tx with LATEST-WINS replace semantics: it row-locks the claim,
// guards the collectable window (D3), DELETEs the claim's existing account rows and INSERTs the two
// new ones (so an edit via <NomineeDetailEditor> cleanly replaces the prior pair, never appends
// orphans), and emits the `claim.nominee_bank_recorded` identity annotation via `projectClaimState`
// (the sole `claims.current_state` writer). All four steps share the tx (all-or-nothing).
//
// CONCURRENCY: the `claims` row lock (`SELECT … FOR UPDATE` by claim_case_id) is the ONE primitive —
// concurrent edits on the same claim serialize on it, so exactly one writer's pair lands cleanly (no
// interleaved/partial rows, no duplicate-rank violation). The composite PK `(claim_case_id,
// account_rank)` is the structural backstop against a duplicate rank.
//
// PII: the three Tier-1 fields (holder name / account number / IFSC) are ALREADY ENCRYPTED by the
// CALLER (the route encrypts before the writer — the 6.7 posture); the writer takes ciphertext.
// `ifsc_validated` is computed by the ROUTE from the `BankIfscLookup` result and passed in (the
// writer does not call the port — transport-free).
//
// ⚠ THE 0-OR-2 AGGREGATE INVARIANT IS WRITER-OWNED, NOT DB-ENFORCED (review finding, 2026-07-11).
// The composite PK + the `account_rank ∈ {1,2}` CHECK (migration 0057) reject a duplicate or
// invalid rank, but NOTHING at the DB level prevents a claim holding just ONE row (e.g. rank=1 with
// no rank=2 counterpart) — "exactly two, always together" is enforced ONLY by this function being
// the SOLE writer (`NomineeBankAccountSetError` below) + the contract's `.length(2)`. This is a
// deliberate, acknowledged gap, not an oversight: closing it needs a focused DB-level cardinality
// constraint (e.g. a deferred CONSTRAINT TRIGGER), which is its own design exercise (write-path
// performance + RLS interaction), not a bolt-on here. See deferred-work.md ("code review of
// 6-8-claim-time-nominee-bank-detail-collection-dual-account") for the full write-up + re-trigger
// condition. Until then: do NOT add a second write path to `claim_nominee_bank_accounts` without
// re-reading this note.

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { claims } from '../schema/claims.js';
import {
  type ClaimNomineeBankAccountRow,
  claimNomineeBankAccounts,
} from '../schema/claim_nominee_bank_accounts.js';
import {
  NOMINEE_BANK_ADMIN_CORRECTION_STATES,
  NOMINEE_BANK_COLLECTABLE_STATES,
  NomineeBankClaimNotCollectableError,
  NomineeBankCorrectionReasonRequiredError,
} from './errors.js';
import { type ClaimEventActor } from './events.js';
import { resolveClaimCorrectionState } from './state-trustee-decision-persist.js';
import { projectClaimState } from './project.js';

/**
 * The states in which the "under correction" branch is BARRED however live the record — the claim is
 * over (code review 2026-09-20).
 *
 * ⛔⛔ A TERMINAL CLAIM'S BANK DETAILS ARE NOT CORRECTABLE, and without this the row-alone branch
 * had no state test at all: an R9 DENY on a claim carrying a live return row left a `denied` claim
 * whose accounts anyone holding the correction key could keep rewriting. `approved` is barred for
 * AC11's own reason (*"⛔ never after `claim.approved`"* — once the campaign is live a name
 * correction is a different governed act, and this story rules nothing about it) and `settled`
 * because the money has moved.
 * ⚠ This is a FLOOR, not the window: it does not permit anything. The branch still needs a live
 * correction record and `allowCorrection`; this only says which states no record can unlock.
 */
const NOMINEE_BANK_CORRECTION_BARRED_STATES = ['denied', 'approved', 'settled'] as const;

/** The two account ranks v1 collects — always exactly these (Task 5 RESOLVED). */
const REQUIRED_ACCOUNT_RANKS: readonly [1, 2] = [1, 2];

/** Thrown when the account set is not exactly the two ranks {1, 2} (defense-in-depth behind the
 *  contract's `.length(2)` — a route bug must never persist a single-account partial or a bad rank). */
export class NomineeBankAccountSetError extends Error {
  public readonly name = 'NomineeBankAccountSetError';
  public constructor(public readonly detail: string) {
    super(`[nominee-bank] invalid account set: ${detail}`);
  }
}

/** Thrown when no claim row exists for the id the writer targets (tenant-scoped miss). */
export class NomineeBankClaimNotFoundError extends Error {
  public readonly name = 'NomineeBankClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[nominee-bank] no claim found for id ${claimCaseId} in scope`);
  }
}

/** One disbursement account — PII fields ALREADY encrypted by the caller; bank_name/branch plaintext. */
export interface NomineeBankAccountInput {
  accountRank: 1 | 2;
  accountHolderNameCiphertext: string;
  accountNumberCiphertext: string;
  ifscCiphertext: string;
  /** The nominee's UPI VPA ciphertext for the `pa=` payee — OPTIONAL (Story 8.13); `null` when the
   *  filer did not supply a VPA. ALREADY encrypted by the caller (same field class as the three
   *  fields above). A null VPA is a first-class state — it never blocks the write. */
  vpaCiphertext: string | null;
  /** Story 6.18 (AC7) — the filer's OPTIONAL note to the District Admin explaining a clerical name
   *  difference (`2026-09-19-226` cl.2). ALREADY encrypted by the caller (same field class as the
   *  fields above); `null` when none was submitted, which is the common case and never blocks. */
  nameDifferenceNoteCiphertext: string | null;
  /** Public, IFSC-derived (Tier-3 plaintext). */
  bankName: string;
  branch: string | null;
  /** Whether THIS account's IFSC passed format + branch lookup at claim time (D4). */
  ifscValidated: boolean;
}

export interface RecordClaimNomineeBankInput {
  claimCaseId: ClaimId;
  pariwarId: PariwarId;
  /** EXACTLY two accounts, ranks {1, 2} (Task 5 RESOLVED — no single-account partial). */
  accounts: readonly NomineeBankAccountInput[];
  /** The acting actor id (audit; non-PII). */
  recordedByActor: string;
  /** Who caused the annotation — `member` (Ravi-mode) or `operator` (helpline). */
  actor: ClaimEventActor;
  /**
   * Whether the caller is authorized to make a post-approval CORRECTION (D3 tier-2). The helpline
   * (authorized admin) passes `true`; the member/nominee passes `false`/omits — so a member can
   * never edit once the claim reaches `verifier_approved` (nominee read-only after approval).
   */
  allowCorrection?: boolean;
  /**
   * The mandatory justification when correcting in the post-approval window (audited, NON-PII
   * operator text). Required IFF the claim is in the admin-correction window; ignored in the
   * ordinary collection window.
   */
  correctionReason?: string | null;
  auditId?: string;
}

export interface RecordClaimNomineeBankResult {
  accounts: ClaimNomineeBankAccountRow[];
  eventVersion: number;
  /** `true` when this was an authorized-admin correction (post-verifier-approval window). */
  corrected: boolean;
}

/** Lock the claim row (`SELECT … FOR UPDATE`) to serialize concurrent edits + read its state. */
async function lockClaim(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

/**
 * Record the claim's two nominee bank accounts (AC1). Latest-wins replace under the claim row lock,
 * guarded to the D3 collectable window, emitting the `claim.nominee_bank_recorded` identity
 * annotation. Takes a raw `pg.PoolClient` (projectClaimState needs `SET LOCAL`); the caller owns the
 * scope-tx (BEGIN + setPariwarScope).
 */
export async function recordClaimNomineeBankAccounts(
  client: pg.PoolClient,
  input: RecordClaimNomineeBankInput,
): Promise<RecordClaimNomineeBankResult> {
  // Defense-in-depth: exactly the two ranks {1, 2}, no duplicates, no partial.
  if (input.accounts.length !== 2) {
    throw new NomineeBankAccountSetError(`expected exactly 2 accounts, got ${input.accounts.length}`);
  }
  const ranks = input.accounts.map((a) => a.accountRank).sort((x, y) => x - y);
  if (ranks[0] !== 1 || ranks[1] !== 2) {
    throw new NomineeBankAccountSetError(`account ranks must be exactly {1, 2}, got {${ranks.join(', ')}}`);
  }

  const db = bindScopedDb(client);

  // (a) Row-lock the claim (serializes concurrent edits) + read its state.
  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new NomineeBankClaimNotFoundError(input.claimCaseId);

  // (b) Guard the edit tier (D3 — three-tier governance). The ordinary (nominee) window covers up to
  //     verifier_review; the admin-correction window is verifier_approved (reason-required); anything
  //     else (pre-converged, or frozen/published) is rejected (emergency workflow, out of scope).
  const state = claimRow.currentState as string;
  const inOrdinaryWindow = (NOMINEE_BANK_COLLECTABLE_STATES as readonly string[]).includes(state);
  const inCorrectionWindow = (NOMINEE_BANK_ADMIN_CORRECTION_STATES as readonly string[]).includes(state);
  // Story 6.18 (AC5) — THE THIRD BRANCH: a claim UNDER CORRECTION.
  //
  // ⚠ SAY IT PLAINLY: `NOMINEE_BANK_ADMIN_CORRECTION_STATES` is ⛔ NOT widened — but THE EFFECT IS,
  // and pretending otherwise would be the dishonest version of this change. `errors.ts`'s five-condition
  // doc-block requires anyone reopening a correction window to define five things first; Story 6.18
  // answers all five and records that it is doing so:
  //   · RE-VERIFICATION        — the District Admin's fresh name check (AC3).
  //   · APPROVAL INVALIDATION  — the edit moves `updated_at`, so the recorded check goes STALE and
  //                              every AC4 gate refuses (`-227` cl.12 / D5).
  //   · DOWNSTREAM-READINESS   — a claim under correction is excluded from the commit set (AC11), so
  //                              ⛔ nothing downstream spawns while the correction is open.
  //   · AUDIT                  — the existing bank-write events + audit lines, plus
  //                              `admin_cycle_freeze.returned` on the return itself.
  //   · NOTIFICATION           — the filer is told ("bank details need correcting"), with ⛔ no name.
  //
  // ⭐ AND IT IS RECORDED AS A DELIBERATE FIRST, ⛔ not presented as an existing pattern: there is
  // ⛔ no precedent in this codebase for a LIVE GOVERNANCE ROW replacing a STATE GUARD.
  // `resolveEscalation` requires its live row IN ADDITION TO a state check; this permits the write on
  // the strength of the row ALONE, whatever the claim's state. The justification is `-227` cl.10-11:
  // the Pariwar Admin asked for the correction, so the states they can return FROM are exactly the
  // states the correction must be possible IN — otherwise the return is a dead end, which AC5 forbids.
  //
  // ⛔ No window constant is edited, ⛔ no state moves.
  //
  // ⚠ HOW THE EXCEPTION CLOSES — corrected 2026-09-20, because the original comment said *"it
  // closes when the corrected accounts are written"* and that is only HALF true:
  //   · the CHECK half does close on the write — the rewrite moves `updated_at`, the sending-back
  //     check goes stale, and `latestCheckSendsBack` turns false immediately;
  //   · the RETURN-ROW half does NOT. The row is superseded only by the next VOTE. What closes for
  //     the purposes of this branch is the DERIVED condition: once the accounts are corrected AND the
  //     District Admin records a fresh passing check, `isReturnedClaimResubmitted` is true and
  //     `resolveClaimCorrectionState` stops reporting `underCorrection` — even though the row is
  //     still there, waiting for the vote that will supersede it.
  let corrected = false;
  if (inOrdinaryWindow) {
    // Ordinary collection/edit — no reason required.
  } else if (
    input.allowCorrection === true &&
    !(NOMINEE_BANK_CORRECTION_BARRED_STATES as readonly string[]).includes(state) &&
    (
      await resolveClaimCorrectionState(
        db,
        input.pariwarId,
        input.claimCaseId,
        claimRow.deceasedMemberId as MemberId,
      )
    ).underCorrection
  ) {
    // Under correction — permitted WHATEVER the claim's state, on the strength of the governance
    // record ALONE. The reason stays mandatory + audited, exactly as in the tier-2 window.
    //
    // ⚠ BOTH HALVES, AND BOTH HAD TO BE FIXED HERE (code review 2026-09-20). This branch tested
    // `hasLiveReturnRow` alone, so AC5's OWN test case — the District Admin records `does_not_match`
    // at `reversed`/`state_trustee_freeze`, neither of which is a bank-writable state — threw
    // `NomineeBankClaimNotCollectableError` while the filer-facing flag was busy telling the operator
    // to correct the details. It now goes through `resolveClaimCorrectionState`, the single
    // definition, which ALSO requires the sending-back check to still be CURRENT.
    if (input.correctionReason == null || input.correctionReason.trim() === '') {
      throw new NomineeBankCorrectionReasonRequiredError(input.claimCaseId);
    }
    corrected = true;
  } else if (inCorrectionWindow && input.allowCorrection === true) {
    // Authorized-admin correction — the reason is mandatory + audited.
    if (input.correctionReason == null || input.correctionReason.trim() === '') {
      throw new NomineeBankCorrectionReasonRequiredError(input.claimCaseId);
    }
    corrected = true;
  } else {
    // Pre-converged, post-approval-for-a-non-admin, or frozen/published → not editable here.
    throw new NomineeBankClaimNotCollectableError(input.claimCaseId, state);
  }

  // (c) Latest-wins replace — delete the existing pair, insert the two current rows (all in-tx).
  await db
    .delete(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, input.pariwarId),
        eq(claimNomineeBankAccounts.claimCaseId, input.claimCaseId),
      ),
    );

  const inserted = await db
    .insert(claimNomineeBankAccounts)
    .values(
      input.accounts.map((a) => ({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        accountRank: a.accountRank,
        accountHolderNameCiphertext: a.accountHolderNameCiphertext,
        accountNumberCiphertext: a.accountNumberCiphertext,
        ifscCiphertext: a.ifscCiphertext,
        vpaCiphertext: a.vpaCiphertext,
        nameDifferenceNoteCiphertext: a.nameDifferenceNoteCiphertext,
        bankName: a.bankName,
        branch: a.branch,
        ifscValidated: a.ifscValidated,
        recordedByActor: input.recordedByActor,
      })),
    )
    .returning();

  // (d) Emit the identity annotation event (the only claims.current_state writer). Payload carries
  //     account_ranks_present + ifsc_validated (all accounts validated) — NO PII.
  const allValidated = input.accounts.every((a) => a.ifscValidated);
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.nominee_bank_recorded',
    payload: {
      from_state: claimRow.currentState,
      to_state: claimRow.currentState,
      trigger: corrected
        ? 'helpline_correct_nominee_bank'
        : input.actor === 'member'
          ? 'member_record_nominee_bank'
          : 'helpline_record_nominee_bank',
      actor: input.actor,
      account_ranks_present: [...REQUIRED_ACCOUNT_RANKS],
      ifsc_validated: allValidated,
      // Forensic flag only — the reason itself goes to the audit sink, never here (NO PII in events_log).
      ...(corrected ? { corrected: true } : {}),
    },
    actorId: input.recordedByActor,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return { accounts: inserted, eventVersion: projected.eventVersion, corrected };
}
