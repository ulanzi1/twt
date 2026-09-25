// The nominee NAME CHECK vocabulary + read helpers — Story 6.18 (AC2, AC3, AC4). Transport-free.
//
// `2026-09-19-226` (Trustee-ratified — Dhiraj Rahul + Kalpana Bharti) makes the DISTRICT ADMIN read
// the holder name on each of a claim's two bank accounts beside the nominee(s) the member declared,
// and RECORD whether they match. This module owns the vocabulary, the staleness tokens and the
// "is there a current, passing check?" predicate that the AC4 approval gates consume.
//
// ⛔⛔ TRAP 1 — THERE IS NO COMPARISON IN THIS FILE, AND THERE MUST NEVER BE ONE.
// `-226` cl.5: *"System shouldn't act for name mismatch at any time, but display/highlight that
// approved named is mismatched…"* — the highlight comes from the District Admin's RECORDED
// JUDGEMENT, ⛔ never from a computer comparing two strings. So: ⛔ no string equality, ⛔ no
// normalization-then-compare, ⛔ no similarity score, ⛔ no soundex, ⛔ no "looks different" hint.
// Every function here reads a RECORDED verdict or compares a TIMESTAMP TOKEN. If a future change
// makes this file import a name at all, that change is wrong.
//
// ⛔ And there is no linkage: Story 6.8's D1 made the accounts a claim-scoped payment channel with
// no `nominee_rank` ([[project_nominee_bank_disbursement_channel]]). Nothing here adds one.

import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimNomineeBankAccounts } from '../schema/claim_nominee_bank_accounts.js';
import {
  NomineeBankAccountsRequiredError,
  NomineeDeterminationRequiredError,
  NomineeNameCheckRequiredError,
} from './errors.js';
// ⭐ Story 6.21a (T8) — the death-certificate conjunct lives in a LEAF (schema tables, ids, errors and the
// import-free window only), so this import cannot close a runtime init cycle.
import { assertDeathCertificateAcceptedForApproval } from './death-certificate-approval.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';
import { CLAIM_REVIEW_WINDOW_STATES } from './review-window.js';
import { eventsLog } from '../schema/events_log.js';

/** The District Admin's verdict on ONE account's holder name (`-226` cl.3–cl.6). */
export const NOMINEE_NAME_CHECK_VERDICTS = ['matches', 'clerical_difference', 'does_not_match'] as const;
export type NomineeNameCheckVerdict = (typeof NOMINEE_NAME_CHECK_VERDICTS)[number];

/**
 * The clerical reasons — `-226` cl.2 names exactly these three: *"an initial, a married name, a
 * bank's shortened name"*.
 *
 * ⛔ NO `other`: cl.6 sends a non-clerical difference BACK for correction, so an escape hatch would
 * let a District Admin approve past the judgement the ruling asked them to make.
 * ⛔⛔ NO `transliteration`: `2026-09-20-227` cl.9 — *"No transliteration should not be counted as
 * clerical reason. Please use English Name everywhere to avoid this."* The script problem is solved
 * at CAPTURE (the AC12 input-only English-script gate), ⛔ never by tolerating it at the check.
 */
export const NOMINEE_NAME_CLERICAL_REASONS = ['initial', 'married_name', 'bank_shortened_name'] as const;
export type NomineeNameClericalReason = (typeof NOMINEE_NAME_CLERICAL_REASONS)[number];

/**
 * The states in which a check may be RECORDED (AC3).
 *
 * ⭐ It deliberately starts at `verification_in_progress` — the District Admin's check is part of
 * VERIFYING, so there is nothing to check before verification opens; and it deliberately extends
 * through `reversed` and `state_trustee_freeze`, because D5/`-227` cl.12 make a post-approval bank
 * correction require a FRESH check, and those are states a corrected claim can be sitting in.
 * ⛔ NOT `state_trustee_approved` and ⛔ NOT `approved`: once the Pariwar Admin has voted, the next
 * act is the commit, and a check recorded after the vote would have nothing left to gate.
 * ⚠ Story 6.21a (T8): the tuple is DEFINED in the import-free `review-window.ts` and bound here by
 * identity, so the death-certificate leaf can read the same window without an import cycle.
 */
export const NOMINEE_NAME_CHECK_RECORDABLE_STATES = CLAIM_REVIEW_WINDOW_STATES;

/** One account's recorded verdict, as it lives in the event payload. */
export interface NomineeNameCheckAccountVerdict {
  readonly accountRank: 1 | 2;
  /** `claim_nominee_bank_accounts.updated_at` as an ISO string, at the moment of the check. */
  readonly accountUpdatedAt: string;
  readonly verdict: NomineeNameCheckVerdict;
  readonly clericalReason: NomineeNameClericalReason | null;
}

/** A recorded check, read back off the claim's event stream. */
export interface RecordedNomineeNameCheck {
  readonly checkedAt: Date;
  readonly checkedByActorDisplay: string;
  readonly nomineeDeclarationToken: string;
  readonly accounts: readonly NomineeNameCheckAccountVerdict[];
  readonly eventVersion: number;
}

/**
 * ⭐ THE DECLARATION TOKEN MOVED (Story 6.20, AC5; `2026-09-20-234` consequence 3). It used to be a
 * digest of the CURRENT `member_nominees` rows' `(rank, created_at)` pairs. Under the ratified as-at-death
 * rule the current rows are the WRONG nominee whenever a change was made after the death, so the token
 * is now `EffectiveNomineeDeclaration.token` (`nominee-effective.ts`): a digest of the effective status,
 * the live DETERMINATION's id and each effective rank's VERSION ID. ⭐ A new determination, a correction
 * (which supersedes the determination) or a disqualification finding each move it — so a check recorded
 * before any of them goes STALE (AC4: *"a new determination stales any earlier name check"*).
 * ⚠⛔ Still ⛔ NOT the hash Trap 4 forbids: it is built from ids and never touches a `name_ciphertext`.
 */

/**
 * The effective declaration, CROSS-CHECKED against the caller's deceased member. The callers already
 * hold the locked claim row, so a mismatch is a caller defect — it fails LOUD rather than gating one
 * claim on another deceased's declaration.
 */
async function readEffectiveFor(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
) {
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  if (effective.deceasedMemberId !== deceasedMemberId) {
    throw new Error(
      `[nominee-name-check] claim ${claimCaseId} is for deceased ${effective.deceasedMemberId}, not ${deceasedMemberId}`,
    );
  }
  return effective;
}

/** Scan cap for the per-claim event lookback (the `DECIDER_SCAN_CAP` posture). */
const NAME_CHECK_SCAN_CAP = 1;

/**
 * The LATEST recorded check on a claim, or `null` when none was ever recorded.
 *
 * ⛔ A check is NEVER inferred and NEVER back-filled ([[feedback_record_unattested_no_backfill]]):
 * claims decided before this shipped carry none, and they read back as `null` rather than being
 * credited with a judgement nobody made. `events_log` is append-only, so "the latest" is simply the
 * highest `event_version` of this type on the claim's stream — there is no supersession to respect.
 *
 * ⚠ Reads `events_log` directly rather than a projection table. The check is a pure annotation with
 * exactly one consumer shape, and a projection would be a second source of truth to keep honest for
 * no read-path gain (the lookup is a single indexed row on `(stream_id, event_type)`).
 */
export async function getLatestNomineeNameCheck(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<RecordedNomineeNameCheck | null> {
  const rows = await db
    .select({
      payload: eventsLog.payload,
      occurredAt: eventsLog.occurredAt,
      eventVersion: eventsLog.eventVersion,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, claimCaseId),
        eq(eventsLog.eventType, 'claim.nominee_name_checked'),
      ),
    )
    .orderBy(desc(eventsLog.eventVersion))
    .limit(clampLimit(NAME_CHECK_SCAN_CAP, { default: NAME_CHECK_SCAN_CAP, cap: NAME_CHECK_SCAN_CAP }));

  const row = rows[0];
  if (!row) return null;

  const payload = row.payload as {
    nominee_declaration_token: string;
    /** ⚠ OPTIONAL ON THE READ ONLY, and ⛔ not because it is optional on the WRITE. The payload
     *  schema requires a non-empty string (D3), so every check recorded from this story onward
     *  carries one. It is typed optional here because `events_log` is APPEND-ONLY: if a check were
     *  ever written before the field existed, its row is still there and still parses. Today no
     *  such row exists — nothing is deployed — and `'—'` is what a surface shows for one. */
    checked_by_actor_display?: string;
    accounts: {
      account_rank: 1 | 2;
      account_updated_at: string;
      verdict: NomineeNameCheckVerdict;
      clerical_reason: NomineeNameClericalReason | null;
    }[];
  };

  return {
    checkedAt: row.occurredAt,
    // ⭐ THE SNAPSHOT, ⛔ NOT A LOOKUP (D3 = option A, code review 2026-09-20). The acting District
    // Admin's display name as it stood at the moment of the check, so a later rename or departure
    // cannot rewrite who made a judgement ([[project_admin_display_name_attribution]]).
    // ⚠ The `?? ''` is now a PARSE fallback for an append-only stream, ⛔ no longer the norm: every
    // check written from this story onward carries a non-empty name, enforced at the payload schema
    // AND in `recordNomineeNameCheck` before the lock. Previously this field was ALWAYS `''` — the
    // payload had no such key — so no check was ever attributed to anybody and the console showed
    // a bare em-dash on every one.
    checkedByActorDisplay: payload.checked_by_actor_display ?? '',
    nomineeDeclarationToken: payload.nominee_declaration_token,
    accounts: payload.accounts.map((a) => ({
      accountRank: a.account_rank,
      accountUpdatedAt: a.account_updated_at,
      verdict: a.verdict,
      clericalReason: a.clerical_reason,
    })),
    eventVersion: row.eventVersion,
  };
}

/** One live account, reduced to the two fields currency depends on. */
export interface LiveAccountRef {
  readonly accountRank: number;
  readonly updatedAt: Date;
}

/**
 * Is this check CURRENT — i.e. was it made about the data that is live right now?
 *
 * ⭐ CURRENCY IS THE WHOLE SAFETY PROPERTY, and it is why the gates read this rather than "does a
 * check exist". A check is current when its per-account `account_updated_at` values and its
 * declaration token equal the live ones. ANY bank edit moves `updated_at` (the writer is
 * delete-then-insert onto a `defaultNow()` column) and ANY re-declaration moves the token, so a
 * corrected account silently invalidates the judgement made about the old one — which is exactly
 * what `-227` cl.12 / D5 require: *a post-approval correction needs a fresh check.*
 *
 * ⚠ THE TIMESTAMP PRECISION TRAP: JS `Date` is millisecond, PG `timestamptz` is microsecond. The
 * comparison is made on the ISO string the SAME Drizzle read produced, ⛔ never by re-parsing a
 * client-supplied instant, so both sides have already been through the identical narrowing.
 *
 * ⚠⚠ AND THE TRANSACTION-CLOCK SUBTLETY, which is sharper and is ⛔ NOT a defect — but a future
 * reader WILL trip on it. `updated_at` is `defaultNow()`, and PostgreSQL's `now()` is the
 * TRANSACTION timestamp, constant for the whole transaction (`clock_timestamp()` is the wall clock).
 * The bank writer is delete-then-insert, so every write is an INSERT stamped with its transaction's
 * start time. ⇒ Rewriting the accounts INSIDE ONE TRANSACTION does ⛔ NOT move `updated_at`, and a
 * check made in that same transaction would ⛔ not go stale.
 * ⭐ WHY PRODUCTION IS CORRECT ANYWAY: a helpline correction and a District Admin check are separate
 * HTTP requests, each opening its OWN scope transaction, so their transaction clocks always differ.
 * The precise invariant is therefore *"a check is stale iff the accounts were rewritten in a LATER
 * TRANSACTION than the one that read them"* — which is exactly what `-227` cl.12 / D5 require.
 * ⛔ Do NOT "fix" this by switching the column to `clock_timestamp()`: that would break the
 * atomicity every other consumer of `updated_at` relies on, to solve a case that cannot occur.
 * ⚠ It does mean a LIVE-DB TEST running inside one BEGIN/ROLLBACK must advance `updated_at`
 * explicitly to simulate the later transaction — the tests do, and say so.
 */
export function isNomineeNameCheckCurrent(
  check: RecordedNomineeNameCheck,
  liveAccounts: readonly LiveAccountRef[],
  liveDeclarationToken: string,
): boolean {
  if (check.nomineeDeclarationToken !== liveDeclarationToken) return false;
  if (check.accounts.length !== liveAccounts.length) return false;
  for (const live of liveAccounts) {
    const recorded = check.accounts.find((a) => a.accountRank === live.accountRank);
    if (!recorded) return false;
    if (recorded.accountUpdatedAt !== live.updatedAt.toISOString()) return false;
  }
  return true;
}

/**
 * Does this check PASS — every account `matches` or `clerical_difference` (AC4)?
 *
 * ⛔ Passing is about what the District Admin RECORDED, never about the names. A `does_not_match` on
 * ANY account fails, which is what makes the claim "under correction" (AC5) — and that is ⛔ not a
 * denial and ⛔ never becomes one: the claim simply waits, and the helpline corrects it.
 */
export function nomineeNameCheckPasses(check: RecordedNomineeNameCheck): boolean {
  return check.accounts.every((a) => a.verdict === 'matches' || a.verdict === 'clerical_difference');
}

/**
 * Does this check carry an approved name DIFFERENCE — the AC8 highlight (`-226` cl.5)?
 * Non-PII: a boolean plus the reason codes, never a name.
 */
export function nomineeNameCheckClericalReasons(
  check: RecordedNomineeNameCheck,
): readonly NomineeNameClericalReason[] {
  const reasons = new Set<NomineeNameClericalReason>();
  for (const a of check.accounts) {
    if (a.verdict === 'clerical_difference' && a.clericalReason !== null) reasons.add(a.clericalReason);
  }
  return [...reasons];
}

/** Everything a surface needs to know about a claim's name check, from ONE pass over the data. */
export interface NomineeNameCheckSnapshot {
  /** The latest recorded check, or `null` when none was ever recorded (⛔ never back-filled). */
  readonly latestCheck: RecordedNomineeNameCheck | null;
  readonly liveAccounts: readonly LiveAccountRef[];
  /** Exactly two live accounts — `-226` cl.7. */
  readonly accountsComplete: boolean;
  /** The live declaration token, for echoing to a caller that will post a check back. */
  readonly liveDeclarationToken: string;
  /** Is `latestCheck` about the data that is live right now? `false` when there is no check. */
  readonly current: boolean;
  /** Does `latestCheck` pass (every verdict `matches` or `clerical_difference`)? */
  readonly passing: boolean;
  /** Is the claim sent back BY THE CHECK — current, with a `does_not_match` (AC5)? */
  readonly sendsBack: boolean;
}

/**
 * Read a claim's whole name-check picture in one pass — three queries, ⛔ no decryption.
 *
 * ⭐ IT EXISTS SO THE PREDICATES CANNOT DRIFT APART. Before the 2026-09-20 review, currency and
 * passing were re-derived ad hoc at four call sites and three of them got it wrong in a different
 * way: the cycle-freeze read applied neither, the console applied currency but not passing, and the
 * filer status applied neither. Every one of those is now this function plus a field selection.
 *
 * ⚠ MUST be called inside the caller's transaction when its answer gates a write — the AC4 gate
 * keeps its own inline reads for exactly that reason (it runs after the claim row lock).
 * ⛔ It reads no name and no ciphertext: ranks, timestamps, verdicts and reason codes only.
 */
export async function readNomineeNameCheckSnapshot(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<NomineeNameCheckSnapshot> {
  const liveAccounts = await db
    .select({
      accountRank: claimNomineeBankAccounts.accountRank,
      updatedAt: claimNomineeBankAccounts.updatedAt,
    })
    .from(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, pariwarId),
        eq(claimNomineeBankAccounts.claimCaseId, claimCaseId),
      ),
    );

  // ⭐ Story 6.20 (AC5, site E) — the EFFECTIVE declaration, ⛔ not the current rows. This snapshot is
  // the "under correction" definition every surface consumes (`resolveClaimCorrectionState`), so it must
  // read the SAME declaration the approval gate reads, or the two disagree — the divergence 6.18's review
  // closed. `resolveClaimCorrectionState`'s `currentState` window (`-242`) is untouched: it gates on state
  // BEFORE this read is consulted.
  const effective = await readEffectiveFor(db, pariwarId, claimCaseId, deceasedMemberId);
  const liveDeclarationToken = effective.token;
  const latestCheck = await getLatestNomineeNameCheck(db, pariwarId, claimCaseId);

  const current =
    latestCheck !== null && isNomineeNameCheckCurrent(latestCheck, liveAccounts, liveDeclarationToken);
  const passing = latestCheck !== null && nomineeNameCheckPasses(latestCheck);

  return {
    latestCheck,
    liveAccounts,
    accountsComplete: liveAccounts.length === 2,
    liveDeclarationToken,
    current,
    passing,
    sendsBack: latestCheckSendsBack(latestCheck, current),
  };
}

// ── The AC4 approval gate (P1 / P3 / P4) ──────────────────────────────────────────────────────

/**
 * ⭐ Story 6.21a (D7) — THE APPROVAL GATE. Assert a claim may be APPROVED: it carries a CURRENT, ACCEPTED
 * death certificate whose review the live determination was made against (`2026-09-20-235` Y), AND its two
 * live bank accounts (`-226` cl.7), AND an effective as-at-death declaration (6.20 AC5), AND a CURRENT,
 * PASSING nominee name check (cl.3–cl.5).
 *
 * ⭐ ONE HELPER, THREE CALL SITES, AND THAT IS THE POINT (AC4). The approval paths are
 * `adjudicateClaim` (P1 — the District Admin's verification approval), `voteOnFrozenClaim` (P3 —
 * the Pariwar Admin's FINAL approval, which is also what catches an appeal reversal and a D5
 * post-approval correction) and `finalizeR9Outcome` (P4 — R9 bypasses P1 entirely). A claim that
 * reached `state_trustee_approved` without passing one of these would be committed by a
 * `commitCycleFreeze` that deliberately carries NO check of its own.
 * ⛔ `resolveEscalation` is NOT gated separately: it can only reach `verifier_approved`, which must
 * still pass P3 before anything is committed. Gating it too would refuse an escalation resolution
 * for a claim whose accounts are not yet collected — which cl.7 forbids, because such a claim WAITS.
 *
 * ⛔⛔ THIS GATE COMPARES NO NAMES. It asks three questions about PROCESS — are there two accounts,
 * is there a check, was it made about today's data — and the third is answered by timestamps. A
 * claim whose names genuinely differ passes the moment a District Admin records
 * `clerical_difference` with a reason, and fails while they have recorded `does_not_match`. The
 * system's opinion about the two strings is, and must remain, nonexistent (cl.5).
 *
 * ⚠ MUST be called INSIDE the caller's transaction, AFTER the claim row lock — a check read before
 * the lock could be invalidated by a concurrent bank correction between the read and the approval.
 *
 * ⭐⭐ WHY AN OUTER HELPER, ⛔ NOT A FOURTH CONJUNCT INSIDE `assertNomineeNameCheckForApproval` (6.21a T4). The
 * inner helper has a FOURTH, non-approval caller — `isReturnedClaimResubmitted` — which swallows exactly
 * three typed errors and feeds `resolveClaimCorrectionState`. A certificate error raised inside it would
 * either propagate there (the family's bank-status read, the bank writer and the helpline correction all
 * answering 500) or, swallowed, keep a bank-corrected claim "under correction" — telling the family their
 * BANK needs fixing when the CERTIFICATE does. So the certificate conjunct runs HERE, FIRST, at the three
 * approval sites only.
 *
 * @throws DeathCertificateAcceptanceRequiredError  no current accepted certificate / a stale determination
 *                                                  (→ 409, Story 6.21a D7). ⛔ NOT a denial.
 * @throws NomineeBankAccountsRequiredError   fewer than two live accounts (→ 409). ⛔ NOT a denial.
 * @throws NomineeDeterminationRequiredError  no effective as-at-death declaration (→ 409, Story 6.20 AC5).
 * @throws NomineeNameCheckRequiredError      no check / stale / `does_not_match` (→ 409). ⛔ NOT a denial.
 */
export async function assertClaimApprovable(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  await assertDeathCertificateAcceptedForApproval(db, pariwarId, claimCaseId);
  await assertNomineeNameCheckForApproval(db, pariwarId, claimCaseId, deceasedMemberId);
}

/**
 * The bank-account, determination and name-check conjuncts of the approval gate: the claim carries its two
 * live bank accounts (`-226` cl.7) AND an effective as-at-death declaration AND a CURRENT, PASSING nominee
 * name check (cl.3–cl.5).
 *
 * ⭐ TWO CALLERS (Story 6.21a moved the approval-site doc-block to `assertClaimApprovable`):
 *   · `assertClaimApprovable` — the approval gate at P1 / P3 / P4, which runs the death-certificate
 *     conjunct FIRST and then this;
 *   · `isReturnedClaimResubmitted` (`state-trustee-decision-persist.ts`) — ⛔ NOT an approval: it asks
 *     whether a returned claim has been corrected and re-checked, and swallows exactly three of this
 *     helper's typed errors. ⛔ Never route it through the outer helper (T4).
 *
 * ⛔⛔ THIS GATE COMPARES NO NAMES. It asks three questions about PROCESS — are there two accounts,
 * is there a check, was it made about today's data — and the third is answered by timestamps. A
 * claim whose names genuinely differ passes the moment a District Admin records
 * `clerical_difference` with a reason, and fails while they have recorded `does_not_match`. The
 * system's opinion about the two strings is, and must remain, nonexistent (cl.5).
 *
 * ⚠ MUST be called INSIDE the caller's transaction, AFTER the claim row lock — a check read before
 * the lock could be invalidated by a concurrent bank correction between the read and the approval.
 *
 * @throws NomineeBankAccountsRequiredError   fewer than two live accounts (→ 409). ⛔ NOT a denial.
 * @throws NomineeDeterminationRequiredError  no effective as-at-death declaration (→ 409, Story 6.20 AC5).
 * @throws NomineeNameCheckRequiredError      no check / stale / `does_not_match` (→ 409). ⛔ NOT a denial.
 */
export async function assertNomineeNameCheckForApproval(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  const liveAccounts = await db
    .select({
      accountRank: claimNomineeBankAccounts.accountRank,
      updatedAt: claimNomineeBankAccounts.updatedAt,
    })
    .from(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, pariwarId),
        eq(claimNomineeBankAccounts.claimCaseId, claimCaseId),
      ),
    );
  if (liveAccounts.length !== 2) {
    throw new NomineeBankAccountsRequiredError(claimCaseId, liveAccounts.length);
  }

  // ⭐ Story 6.20 (AC5, D15) — the DECLARATION IN FORCE AT THE DEATH must be DETERMINED first. A claim
  // with no live determination, an unversioned declaration, nobody standing or an incoherent rank set
  // WAITS (409) — ⛔ never a denial: the system never decides that nothing changed (invariant 1), so even
  // an explicit "no discards" determination is a human act this gate requires.
  const effective = await readEffectiveFor(db, pariwarId, claimCaseId, deceasedMemberId);
  if (effective.status !== 'effective') {
    throw new NomineeDeterminationRequiredError(
      claimCaseId,
      effective.status === 'undetermined'
        ? 'never_determined'
        : effective.status === 'empty'
          ? 'empty_declaration'
          : effective.status,
    );
  }

  const check = await getLatestNomineeNameCheck(db, pariwarId, claimCaseId);
  if (!check) throw new NomineeNameCheckRequiredError(claimCaseId, 'never_checked');

  const liveToken = effective.token;
  if (!isNomineeNameCheckCurrent(check, liveAccounts, liveToken)) {
    throw new NomineeNameCheckRequiredError(claimCaseId, 'stale');
  }

  if (!nomineeNameCheckPasses(check)) {
    // `-226` cl.6 — the claim is SENT BACK for correction. ⛔ It is not denied, and this 409 is not
    // a step toward denial: it simply refuses to approve while the District Admin's own record says
    // the name does not match.
    throw new NomineeNameCheckRequiredError(claimCaseId, 'does_not_match');
  }
}

/**
 * Does the claim's LATEST check SEND IT BACK — the District Admin's own half of "under correction"
 * (AC5, `-226` cl.6)?
 *
 * ⚠⚠ CURRENCY IS REQUIRED, AND LEAVING IT OUT WAS A REAL DEFECT (code review 2026-09-20). The
 * first version asked only *"does the latest check carry a `does_not_match`?"*. That answer NEVER
 * BECOMES FALSE on its own: once the helpline writes the corrected accounts, the old
 * `does_not_match` check is still the latest one, so the claim stayed "under correction" forever —
 * the filer kept being told *"bank details need correcting"* on a claim that had been corrected, and
 * the bank window stayed open on a claim nobody was correcting any more, on a DENIED claim included.
 * ⭐ Requiring the sending-back check to still be CURRENT closes it exactly: writing the corrected
 * accounts moves `updated_at`, the check goes stale, and this returns false in the same breath — the
 * claim leaves "under correction" and the AC4 gates start asking for the FRESH check (D5) instead.
 */
export function latestCheckSendsBack(
  latestCheck: RecordedNomineeNameCheck | null,
  latestCheckIsCurrent: boolean,
): boolean {
  if (!latestCheck) return false;
  if (!latestCheckIsCurrent) return false;
  return latestCheck.accounts.some((a) => a.verdict === 'does_not_match');
}

/**
 * Is this claim UNDER CORRECTION (AC5)?
 *
 * ⭐⭐ ONE DEFINITION, AND THAT IS THE WHOLE POINT OF THIS FUNCTION. Before the 2026-09-20 review
 * there were three different answers in the tree — the bank writer tested the return row alone, the
 * filer-status handler tested the check alone with no currency, and the cycle-freeze pending read
 * used the raw return row — so a corrected claim could be "under correction" on one surface and not
 * on another. Every consumer now goes through `resolveClaimCorrectionState` (the async resolver in
 * `state-trustee-decision-persist.ts`, which gathers the two inputs) and lands here.
 *
 * It holds when EITHER:
 *   · the Pariwar Admin sent it back — a live `correction_return` row that has NOT yet been
 *     resubmitted (`-227` cl.10). ⚠ NOT the bare row: the row itself is superseded only by the next
 *     VOTE, so a claim that was corrected and re-checked would otherwise keep the badge and keep
 *     telling the filer to correct details they have already corrected; OR
 *   · the District Admin sent it back — the latest check is CURRENT and carries a `does_not_match`
 *     on any account (`-226` cl.6).
 *
 * ⛔ It is NOT a denial and must never be presented as one: the claim stays open, in its state, and
 * the filer is asked to correct a detail. The two sources are deliberately collapsed because they
 * mean the same thing to everyone downstream — *the bank details need correcting.*
 */
export function isClaimUnderCorrection(
  /** A live `correction_return` row exists AND the claim has not been resubmitted against it. */
  hasLiveUnresubmittedReturn: boolean,
  /** `latestCheckSendsBack(...)` — the District Admin's half. */
  checkSendsBack: boolean,
): boolean {
  return hasLiveUnresubmittedReturn || checkSendsBack;
}
