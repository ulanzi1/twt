// The MEMBERSHIP CHECK's approval state and its APPROVAL CONJUNCT — Story 6.39 (DL4, DL5; N1, N2, N4, N5, N6).
// Transport-free.
//
// `2026-10-31-424` Q1 (a) C: an identity nobody has checked *"is checked first, by staff, from the death documents
// and the details on record, before any drive opens."* `2026-10-31-430` Q1 B: *"staff compare the date of death on
// the certificate with the date the fee was paid, and ⛔ drive opens if the fee was paid after the death."*
// ⇒ a claim is approvable only with a CURRENT, PASSING membership check; anything else makes the claim WAIT (a
// typed 409), ⛔ never a denial (N5).
//
// ⭐⭐ A LEAF, AND IT MUST STAY ONE (6.21a T8; this story's TR4). `nominee-name-check.ts` imports this module (the
// outer approval helper runs the conjunct), and `nominee-determination-persist.ts` imports `nominee-name-check.ts`
// and evaluates a constant from it at module load. So if THIS module imported the determination writer — or
// anything that does — the graph would close into a runtime init cycle the typecheck cannot see
// ([[project_type_only_import_cycle_trap]]). ⛔ Import ONLY drizzle, `Db`, id types, schema tables, `errors.ts` and
// the leaf `death-certificate-approval.ts`. The NW1 transitive import scan (`approval-warnings.test.ts`) pins it.
// ⛔ And ⛔ no reading of any ciphertext here (the no-comparison fence, this story's `it` block): this module reads
// ids, outcome codes and three plaintext KYC columns — never a date, a name or a note. The fee-date / death-date
// comparison happens in the API handler; this module reads its recorded OUTCOME (N3).
//
// ⭐ ONE DEFINITION (N1). `resolveMembershipCheckApprovalState` is the only place that says what "passes":
//   · the approval conjunct (`assertMembershipCheckedForApproval`, inside `assertClaimApprovable` — all six sites);
//   · the cycle-freeze commit's skip-and-keep re-check (DL6);
//   · the deny-reason guard (`assertFeePaidAfterDeathShown`, DL9);
//   · the verifier console's packet section (DL10).

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, ClaimMembershipCheckId, DeathCertificateReviewId, MemberId, PariwarId } from '../ids/index.js';
import type {
  MembershipCheckFeeOutcome,
  MembershipCheckIdentityOutcome,
} from '../schema/claim_membership_checks.js';
import { deathCertificateStatus, readDeathCertificateSnapshot } from './death-certificate-approval.js';
import {
  FeePaidAfterDeathNotShownError,
  MembershipCheckRequiredError,
  type MembershipCheckWaitReason,
} from './errors.js';

/**
 * How the deceased's identity record stands (DL4) — plaintext columns of `member_kyc_profiles`, ⛔ a name.
 *   · `digilocker`         — `verification_strength = 'aadhaar_kyc'`: checked through DigiLocker;
 *   · `trustee_verified`   — typed in, and since verified by a trustee (row `3-13` — ⛔ built: unreachable today);
 *   · `typed_in_unchecked` — typed in at joining (`self_declared`), never checked: the Panel's case;
 *   · `unverified`         — the enum's third value, never written in production (fail-closed defence);
 *   · `no_record`          — no KYC row at all (unreachable past the door; fail-closed defence).
 * ⚠ LOCKSTEP with `@twt/contracts`' `MEMBERSHIP_CHECK_KYC_ROUTES`.
 */
export const MEMBERSHIP_CHECK_KYC_ROUTES = [
  'digilocker',
  'trustee_verified',
  'typed_in_unchecked',
  'unverified',
  'no_record',
] as const;
export type MembershipCheckKycRoute = (typeof MEMBERSHIP_CHECK_KYC_ROUTES)[number];

/** The two plaintext KYC columns DL4 reads — or `null` when the member has no KYC row. */
export interface DeceasedKycStanding {
  readonly verificationStrength: string;
  readonly trusteeVerified: boolean;
}

/** The KYC route of a standing (see `MEMBERSHIP_CHECK_KYC_ROUTES`). Pure. */
export function membershipCheckKycRoute(kyc: DeceasedKycStanding | null): MembershipCheckKycRoute {
  if (kyc === null) return 'no_record';
  if (kyc.verificationStrength === 'aadhaar_kyc') return 'digilocker';
  if (kyc.trusteeVerified) return 'trustee_verified';
  return kyc.verificationStrength === 'self_declared' ? 'typed_in_unchecked' : 'unverified';
}

/**
 * ⭐ DL4 / N2 — THE identity trigger, ONE definition: the identity half applies iff there is ⛔ KYC record, or the
 * record is ⛔ DigiLocker-verified AND ⛔ trustee-verified. So `self_declared` AND `unverified` both count as
 * unchecked, and a missing row fails CLOSED. Pure.
 */
export function isIdentityCheckRequired(kyc: DeceasedKycStanding | null): boolean {
  const route = membershipCheckKycRoute(kyc);
  return route !== 'digilocker' && route !== 'trustee_verified';
}

/** The LIVE membership check of a claim, as the gate reads it (⛔ the note, ⛔ a date). */
export interface LiveMembershipCheck {
  readonly checkId: ClaimMembershipCheckId;
  readonly deathCertificateReviewId: DeathCertificateReviewId;
  readonly feeOutcome: MembershipCheckFeeOutcome;
  readonly identityRequired: boolean;
  readonly identityOutcome: MembershipCheckIdentityOutcome;
}

/** Everything the state function needs, from TWO reads (the check + KYC row; the certificate snapshot). */
export interface MembershipCheckFacts {
  readonly liveCheck: LiveMembershipCheck | null;
  /** The claim's CURRENT review iff it is an ACCEPTED one — else `null`. */
  readonly currentAcceptedReviewId: DeathCertificateReviewId | null;
  /** The deceased's KYC standing TODAY (re-read on every call — N2). */
  readonly kyc: DeceasedKycStanding | null;
}

export type MembershipCheckApprovalState =
  | { readonly passed: true }
  | { readonly passed: false; readonly reason: MembershipCheckWaitReason };

/**
 * ⭐ DL9 — the ONE deny reason a claim whose fee was paid after the death is ended with, on BOTH denial vocabularies
 * (the District Admin's P1 denial and the final vote's — TR14). Deny-only, and accepted only while the live check
 * says so (`assertFeePaidAfterDeathShown`).
 */
export const FEE_PAID_AFTER_DEATH_REASON_CODE = 'fee_paid_after_death' as const;

/**
 * ⭐ PQ1 (a) — the fee outcomes that STOP a drive. RULED `2026-11-21-473` Q1 B (DR + KB): *"The same day counts as
 * after — ⛔ drive"* (the Panel's own day-of-death line, as `2026-09-20-235` Y). Built `-474` item 2: a `same_day`
 * check gives the gate's `fee_after_death` answer (⛔ new wait reason), so the `fee_paid_after_death` deny is accepted
 * for it too (DL9's guard reads that answer). Until the ruling it was `['after_death']` (built A).
 */
export const MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES: readonly MembershipCheckFeeOutcome[] = ['after_death', 'same_day'];

/**
 * ⭐ THE ONE DEFINITION of "the membership check passes" (N1). Pure. Precedence (DL5): `not_checked` → `stale` →
 * `fee_after_death` → `identity_not_confirmed`.
 *   · `stale` — the check names a review that is ⛔ the claim's current accepted one (N4: ANY new review, even one
 *     with the same date); OR the check recorded `not_required` while TODAY's KYC record says the identity is
 *     unchecked (N2 — a record the check called "not required" can never mask an unchecked identity);
 *   · the identity half binds only while the identity is unchecked TODAY: a `not_confirmed` recorded for a member
 *     whose record has since become DigiLocker-verified no longer holds the claim (the KYC re-read relaxes, G2).
 */
export function resolveMembershipCheckApprovalState(facts: MembershipCheckFacts): MembershipCheckApprovalState {
  const check = facts.liveCheck;
  if (check === null) return { passed: false, reason: 'not_checked' };
  // An id is a currency token, ⛔ a credential: plain `===` on lower-cased ids (6.21a D14 / T6).
  const current = (facts.currentAcceptedReviewId as string | null)?.toLowerCase() ?? null;
  if (current === null || (check.deathCertificateReviewId as string).toLowerCase() !== current) {
    return { passed: false, reason: 'stale' };
  }
  const identityRequiredToday = isIdentityCheckRequired(facts.kyc);
  if (identityRequiredToday && check.identityOutcome === 'not_required') return { passed: false, reason: 'stale' };
  if (MEMBERSHIP_CHECK_BLOCKING_FEE_OUTCOMES.includes(check.feeOutcome)) {
    return { passed: false, reason: 'fee_after_death' };
  }
  if (identityRequiredToday && check.identityOutcome === 'not_confirmed') {
    return { passed: false, reason: 'identity_not_confirmed' };
  }
  return { passed: true };
}

/**
 * Read the deceased's KYC standing: two plaintext columns, RLS-scoped with the explicit `pariwar_id` predicate.
 * `null` when the member has no KYC row.
 */
export async function readDeceasedKycStanding(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<DeceasedKycStanding | null> {
  const result = await db.execute<{ verification_strength: string; trustee_verified: boolean }>(sql`
    SELECT k.verification_strength::text AS verification_strength, k.trustee_verified
      FROM member_kyc_profiles k
     WHERE k.pariwar_id = ${pariwarId}::uuid
       AND k.member_id = ${deceasedMemberId}::uuid
  `);
  const row = (result.rows ?? [])[0];
  return row ? { verificationStrength: row.verification_strength, trusteeVerified: row.trustee_verified === true } : null;
}

/**
 * Read the gate's facts: the claim's LIVE check, the deceased's KYC standing and the claim's current accepted
 * review. RLS-scoped with the explicit `pariwar_id` predicate on every table. ⛔ No ciphertext.
 */
export async function readMembershipCheckFacts(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<MembershipCheckFacts> {
  const result = await db.execute<{
    check_id: string;
    death_certificate_review_id: string;
    fee_outcome: MembershipCheckFeeOutcome;
    identity_required: boolean;
    identity_outcome: MembershipCheckIdentityOutcome;
  }>(sql`
    SELECT mc.check_id, mc.death_certificate_review_id, mc.fee_outcome, mc.identity_required, mc.identity_outcome
      FROM claim_membership_checks mc
     WHERE mc.pariwar_id = ${pariwarId}::uuid
       AND mc.claim_case_id = ${claimCaseId}::uuid
       AND mc.superseded_at IS NULL
  `);
  const rows = result.rows ?? [];
  // Invariant (the partial unique index): at most one LIVE check per claim. Never silently pick one of two.
  if (rows.length > 1) {
    throw new Error(`membership-check: expected at most one live check for claim ${claimCaseId}, got ${rows.length}`);
  }
  const row = rows[0];
  const liveCheck: LiveMembershipCheck | null = row
    ? {
        checkId: row.check_id as ClaimMembershipCheckId,
        deathCertificateReviewId: row.death_certificate_review_id as DeathCertificateReviewId,
        feeOutcome: row.fee_outcome,
        identityRequired: row.identity_required === true,
        identityOutcome: row.identity_outcome,
      }
    : null;
  const snapshot = await readDeathCertificateSnapshot(db, pariwarId, claimCaseId);
  const currentAcceptedReviewId =
    deathCertificateStatus(snapshot) === 'accepted' ? snapshot.currentReview!.reviewId : null;
  const kyc = await readDeceasedKycStanding(db, pariwarId, deceasedMemberId);
  return { liveCheck, currentAcceptedReviewId, kyc };
}

/**
 * The membership check's approval state for a claim (DL5) — the read + the ONE resolver. Used by the approval
 * conjunct, the cycle-freeze commit's re-check (DL6) and the console's packet section (DL10).
 */
export async function membershipCheckApprovalState(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<MembershipCheckApprovalState> {
  return resolveMembershipCheckApprovalState(await readMembershipCheckFacts(db, pariwarId, claimCaseId, deceasedMemberId));
}

/**
 * ⭐ DL5 — THE APPROVAL CONJUNCT. A claim may be approved only with a CURRENT, PASSING membership check.
 *
 * ⚠ MUST run INSIDE the caller's transaction, AFTER the claim-row lock (the check writer and the certificate
 * review writer both lock the claim row first, so neither can move under an approval).
 * Called ONLY by `assertClaimApprovable` (`nominee-name-check.ts`), in its OUTER body — so the `-251` waived
 * approve reaches it too, BY CONSTRUCTION.
 *
 * @throws MembershipCheckRequiredError (→ 409). ⛔ NOT a denial.
 */
export async function assertMembershipCheckedForApproval(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  const state = await membershipCheckApprovalState(db, pariwarId, claimCaseId, deceasedMemberId);
  if (!state.passed) throw new MembershipCheckRequiredError(claimCaseId, state.reason);
}

/**
 * ⭐ DL9 / N6 — the deny reason `fee_paid_after_death` is accepted ONLY while the claim's live, CURRENT membership
 * check says the fee was paid after the death — i.e. while the gate's own answer is `fee_after_death` (a stale
 * check proves nothing: its certificate has been re-reviewed since). A guard on the REASON, ⛔ on the denial.
 *
 * @throws FeePaidAfterDeathNotShownError (→ 409 `<prefix>.fee_paid_after_death_not_shown`)
 */
export async function assertFeePaidAfterDeathShown(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  const state = await membershipCheckApprovalState(db, pariwarId, claimCaseId, deceasedMemberId);
  if (state.passed || state.reason !== 'fee_after_death') throw new FeePaidAfterDeathNotShownError(claimCaseId);
}
