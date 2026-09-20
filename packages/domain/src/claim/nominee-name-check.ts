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

import { createHash } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimNomineeBankAccounts } from '../schema/claim_nominee_bank_accounts.js';
import {
  type NomineeDeclarationRowRef,
  getMemberNomineeDeclarationRefs,
} from '../nominee/declaration-ref.js';
import { NomineeBankAccountsRequiredError, NomineeNameCheckRequiredError } from './errors.js';
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
 */
export const NOMINEE_NAME_CHECK_RECORDABLE_STATES = [
  'verification_in_progress',
  'verifier_review',
  'verifier_approved',
  'reversed',
  'state_trustee_freeze',
] as const;

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
 * The declaration token: a deterministic digest of the deceased member's `member_nominees` rows,
 * built from their `(rank, created_at)` pairs ONLY.
 *
 * ⭐ WHY A RE-DECLARATION MUST INVALIDATE A CHECK. `declaration-write.ts` replaces the nominee set
 * delete-then-insert, so a re-declaration mints new `created_at` values and the token changes. A
 * District Admin who approved a name against the OLD nominee set must look again, because the
 * person the member nominated may now be someone else entirely — and this is ⛔ not hypothetical:
 * the member-app nominee route checks only `withdrawn`/`anonymized`, and a Ravi-mode session IS the
 * deceased's, so the filer can rewrite the declaration AFTER the death (AC10, recorded open).
 *
 * ⚠⛔ THIS HASH IS NOT THE HASH TRAP 4 FORBIDS, and the distinction is the whole point: Trap 4
 * bans hashing a NAME, because a name hash is a stable identifier for a living person and a
 * confirmation oracle for any guessed name. This digest is built from ROW RANKS AND TIMESTAMPS and
 * ⛔ never touches a `name_ciphertext` — it identifies a DECLARATION, not a person. ⛔ Never widen
 * it to include a name, a name hash, or a decrypted anything.
 */
export function deriveNomineeDeclarationToken(rows: readonly NomineeDeclarationRowRef[]): string {
  const canonical = [...rows]
    .map((r) => `${r.rank}:${r.createdAt.toISOString()}`)
    .sort()
    .join('|');
  // An EMPTY declaration hashes to a stable, distinct value rather than to `''` — "this member
  // declared nobody" is a real state the District Admin must be able to have looked at (AC2), and
  // it must be distinguishable from every populated set.
  return createHash('sha256').update(`nominee-declaration:v1:${canonical}`).digest('hex').slice(0, 32);
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
    // The event payload carries NO actor display (it is NOT in the AC3 payload shape); the display
    // name lives on the audit line. Read back as an empty string so the DTO stays total — the
    // console shows "recorded" without attributing a name it was never given here.
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

// ── The AC4 approval gate (P1 / P3 / P4) ──────────────────────────────────────────────────────

/**
 * Assert a claim may be APPROVED: it carries its two live bank accounts (`-226` cl.7) AND a
 * CURRENT, PASSING nominee name check (cl.3–cl.5).
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
 * @throws NomineeBankAccountsRequiredError  fewer than two live accounts (→ 409). ⛔ NOT a denial.
 * @throws NomineeNameCheckRequiredError     no check / stale / `does_not_match` (→ 409). ⛔ NOT a denial.
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

  const check = await getLatestNomineeNameCheck(db, pariwarId, claimCaseId);
  if (!check) throw new NomineeNameCheckRequiredError(claimCaseId, 'never_checked');

  const declarationRefs = await getMemberNomineeDeclarationRefs(db, pariwarId, deceasedMemberId);
  const liveToken = deriveNomineeDeclarationToken(declarationRefs);
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
 * Is this claim UNDER CORRECTION (AC5)?
 *
 * ⭐ A DERIVED condition — ⛔ not a new table and ⛔ not a new event. It holds when EITHER:
 *   · the claim's latest recorded check carries a `does_not_match` on any account (the District
 *     Admin sent it back — `-226` cl.6), OR
 *   · a live `correction_return` row exists (the Pariwar Admin sent it back — `-227` cl.10).
 *
 * ⛔ It is NOT a denial and must never be presented as one: the claim stays open, in its state, and
 * the filer is asked to correct a detail. The two sources are deliberately collapsed because they
 * mean the same thing to everyone downstream — *the bank details need correcting.*
 *
 * ⚠ The return-row half is passed IN rather than read here, so this module keeps ⛔ no dependency on
 * the trustee-decision persistence layer (which already depends on this one).
 */
export function isClaimUnderCorrection(
  latestCheck: RecordedNomineeNameCheck | null,
  hasLiveReturn: boolean,
): boolean {
  if (hasLiveReturn) return true;
  if (!latestCheck) return false;
  return latestCheck.accounts.some((a) => a.verdict === 'does_not_match');
}
