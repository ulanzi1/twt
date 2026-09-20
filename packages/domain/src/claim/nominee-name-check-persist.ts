// The nominee NAME CHECK write path — Story 6.18 (AC3, D1). Transport-free.
//
// The District Admin's recorded judgement on the holder name of each of the claim's two bank
// accounts, against the nominee(s) the deceased member declared (`2026-09-19-226` cl.3/cl.5).
//
// ⭐ D1 — THE CHECK IS ITS OWN WRITE, ⛔ NOT a field on the verification decision. Two reasons, both
// load-bearing: the check must be re-recordable AFTER an approval (a corrected account makes it
// stale — `-227` cl.12 / D5), and the Pariwar Admin's vote must be able to require a CURRENT one
// (AC4 P3). A field on the decision could do neither.
//
// ⛔⛔ THIS FILE COMPARES NO NAMES. It never reads a `name_ciphertext`, never decrypts, and has no
// access to a plaintext name at all — by construction, not by discipline. It records what a person
// decided and guards the process around that (Trap 1, `-226` cl.5).
//
// ⛔ THE CLAIM'S STATE DOES NOT MOVE. The event is an IDENTITY annotation; the reducer is a no-op.
// A `does_not_match` verdict denies nothing, escalates nothing and triggers nothing — the claim
// simply fails the AC4 gate and waits for a correction (cl.6, AC5).

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { claimNomineeBankAccounts } from '../schema/claim_nominee_bank_accounts.js';
import { claims } from '../schema/claims.js';
import type { ClaimEventActor } from './events.js';
import {
  NomineeBankAccountsRequiredError,
  NomineeNameCheckNotRecordableError,
  NomineeNameCheckStaleError,
} from './errors.js';
import {
  NOMINEE_NAME_CHECK_RECORDABLE_STATES,
  type NomineeNameCheckAccountVerdict,
  type RecordedNomineeNameCheck,
  deriveNomineeDeclarationToken,
  getLatestNomineeNameCheck,
} from './nominee-name-check.js';
import { getMemberNomineeDeclarationRefs } from '../nominee/declaration-ref.js';
import { projectClaimState } from './project.js';


/** Exactly two accounts, always — `-226` cl.7 and the 6.8 writer's own invariant. */
const REQUIRED_ACCOUNT_COUNT = 2;

export interface RecordNomineeNameCheckInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  /** The declaration the District Admin asserts they looked at (D1's optimistic token). */
  readonly nomineeDeclarationToken: string;
  /** One entry per live account, both ranks. */
  readonly accounts: readonly NomineeNameCheckAccountVerdict[];
  readonly actorId: string;
  readonly actor: ClaimEventActor;
  readonly auditId?: string;
}

export interface RecordNomineeNameCheckResult {
  readonly check: RecordedNomineeNameCheck;
  readonly eventVersion: number;
  readonly claimState: string;
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
 * Record the District Admin's per-account name check.
 *
 * ⭐ EVERY TOKEN IS RE-VALIDATED UNDER THE CLAIM LOCK, and that is the concurrency design (D1). The
 * caller read the names, thought about them, and submitted a judgement some seconds later; in that
 * window a helpline operator may have corrected an account. Re-reading both the accounts and the
 * declaration inside the locked transaction and refusing on ANY divergence is what makes it
 * impossible for a judgement about old data to be recorded as if it were about the new data. A
 * separate write racing this one therefore cannot be silently blessed.
 *
 * @throws NomineeNameCheckNotRecordableError  claim outside the AC3 state window (→ 409)
 * @throws NomineeBankAccountsRequiredError    fewer than two live accounts (→ 409, cl.7)
 * @throws NomineeNameCheckStaleError          a token moved since the read (→ 409)
 */
export async function recordNomineeNameCheck(
  client: pg.PoolClient,
  input: RecordNomineeNameCheckInput,
): Promise<RecordNomineeNameCheckResult> {
  const db = bindScopedDb(client);

  // (a) Lock the claim + read its state.
  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new NomineeNameCheckNotRecordableError(input.claimCaseId, 'not_found');

  const state = claimRow.currentState as string;
  if (!(NOMINEE_NAME_CHECK_RECORDABLE_STATES as readonly string[]).includes(state)) {
    throw new NomineeNameCheckNotRecordableError(input.claimCaseId, state);
  }

  // (b) Re-read the live accounts UNDER THE LOCK. `-226` cl.7 — a claim without both accounts
  //     cannot be decided; it WAITS, it is never refused for it.
  const liveAccounts = await db
    .select({
      accountRank: claimNomineeBankAccounts.accountRank,
      updatedAt: claimNomineeBankAccounts.updatedAt,
    })
    .from(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, input.pariwarId),
        eq(claimNomineeBankAccounts.claimCaseId, input.claimCaseId),
      ),
    );
  if (liveAccounts.length !== REQUIRED_ACCOUNT_COUNT) {
    throw new NomineeBankAccountsRequiredError(input.claimCaseId, liveAccounts.length);
  }

  // (c) The submitted set must be EXACTLY the live accounts, both ranks, each carrying the live
  //     `updated_at`. A divergence means an edit landed between the read and the submit.
  if (input.accounts.length !== liveAccounts.length) {
    throw new NomineeNameCheckStaleError(
      input.claimCaseId,
      'the submitted account set does not match the live accounts',
    );
  }
  for (const live of liveAccounts) {
    const submitted = input.accounts.find((a) => a.accountRank === live.accountRank);
    if (!submitted) {
      throw new NomineeNameCheckStaleError(
        input.claimCaseId,
        `no verdict submitted for account #${live.accountRank}`,
      );
    }
    if (submitted.accountUpdatedAt !== live.updatedAt.toISOString()) {
      throw new NomineeNameCheckStaleError(
        input.claimCaseId,
        `account #${live.accountRank} was edited after the names were read — check again`,
      );
    }
  }

  // (d) The declaration must be the one the District Admin looked at. A re-declaration between the
  //     read and the submit can change WHO the member nominated, so the judgement no longer applies.
  const declarationRefs = await getMemberNomineeDeclarationRefs(
    db,
    input.pariwarId,
    claimRow.deceasedMemberId,
  );
  const liveToken = deriveNomineeDeclarationToken(declarationRefs);
  if (liveToken !== input.nomineeDeclarationToken) {
    throw new NomineeNameCheckStaleError(
      input.claimCaseId,
      'the declared nominees changed after the names were read — check again',
    );
  }

  // (e) Emit the identity annotation. ⛔ NO name, ⛔ NO hash of a name, ⛔ NO filer note (Trap 4).
  //     The claim's state is carried through unchanged on both audit fields.
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.nominee_name_checked',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'district_admin_nominee_name_check',
      actor: input.actor,
      nominee_declaration_token: input.nomineeDeclarationToken,
      accounts: input.accounts.map((a) => ({
        account_rank: a.accountRank,
        account_updated_at: a.accountUpdatedAt,
        verdict: a.verdict,
        clerical_reason: a.clericalReason,
      })),
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  // (f) Read the check back through the same accessor every consumer uses, so the response and the
  //     gates can never disagree about what was recorded.
  const check = await getLatestNomineeNameCheck(db, input.pariwarId, input.claimCaseId);
  if (!check) {
    // Unreachable: the event was just appended in this transaction.
    throw new Error('[nominee-name-check] the check could not be read back after being recorded');
  }

  return { check, eventVersion: projected.eventVersion, claimState: projected.state };
}
