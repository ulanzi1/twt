// The membership check's READS — the joining receipt and the staff preview's plaintext facts (Story 6.39,
// Task 2.2; DL3, DL8, DL10; AC3). Transport-free.
//
// ⛔ No ciphertext is opened here (the no-comparison fence, this story's `it` block): this module reads ids,
// plaintext codes and a receipt's instant. The certificate's date is opened by the API handler; the deceased's name
// and date of birth come from the verifier console's packet, and the latest posting from the ONE existing reader
// (`member-geo`'s `getMemberCurrentDistrict` — the district the route's permission check already resolved) (DL8).
//
// ── The joining receipt (DL3, TR5) ─────────────────────────────────────────────────────────────────────────────
// A member may hold SEVERAL `vyawastha_shulk_receipts` rows: a confirm ALWAYS commits its receipt, even when the
// lock-in gate then fails (the member stays `pending-fee`); a confirm is also accepted from a member already in
// `lock-in` — even after a death — and adds a receipt with ⛔ event; a renewal adds one too. ⛔ Column marks the
// joining receipt. It is the receipt the `pending-fee → lock-in` step was admitted on — the ONE
// `member.vyawastha_shulk_paid` event with `from_state = 'pending-fee'` carries its UTR.
//   · ⛔ NOT the earliest receipt (a gate-failed first attempt is earlier) and ⛔ NOT the latest (`getLatestReceipt`
//     would pick a receipt added after the death);
//   · ⚠ matched by `(pariwar_id, member_id, utr)` — `member_id` is REQUIRED: until `2026-11-21-475` the event carried
//     the REQUEST BODY's UTR, so an event written before it (or a raw one) can name ANOTHER member's receipt under
//     `(pariwar_id, utr)` alone. Since `-475` the joining confirm writes the STORED receipt's UTR, so a re-confirm with
//     a corrected UTR still names this member's receipt; the `member_id` leg stays as the defence;
//   · ⛔ the event's `occurred_at` — that is when lock-in happened, ⛔ when the fee was paid;
//   · ⛔ match ⇒ `null`: the check CANNOT be recorded (fail closed — the claim waits, ⛔ a guess; the staff line says
//     "Please tell the Super Admin." — `-475`). Unreachable through the door since `-475`; kept as the defence.

import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type {
  ClaimId,
  ClaimMembershipCheckId,
  DeathCertificateReviewId,
  MemberId,
  PariwarId,
  VyawasthaShulkReceiptId,
} from '../ids/index.js';
import {
  type MembershipCheckFeeOutcome,
  type MembershipCheckIdentityOutcome,
  type MembershipCheckIdentityReason,
  claimMembershipChecks,
} from '../schema/claim_membership_checks.js';
import { eventsLog } from '../schema/events_log.js';
import { vyawasthaShulkReceipts } from '../schema/vyawastha_shulk_receipts.js';
import { FEE_PAID_AFTER_DEATH_REASON_CODE } from './membership-check-approval.js';

/** The joining receipt, as the comparison needs it. `paidAt` is the SERVER instant of the member's self-attest. */
export interface JoiningFeeReceipt {
  readonly receiptId: VyawasthaShulkReceiptId;
  readonly paidAt: Date;
}

/**
 * ⭐ DL3 — read the deceased's JOINING receipt: the receipt named by the `pending-fee → lock-in` event.
 * `null` when the member has no such event, the event carries no UTR, or ⛔ receipt of THIS member carries that
 * UTR — the caller refuses `no_fee_receipt` (fail closed).
 *
 * Reads `events_log` directly via Drizzle (the `getLockInClock` pattern, `member/read.ts`) — domain cannot import
 * `@twt/events` (the cycle). RLS-scoped; the explicit `pariwar_id` predicates are defence in depth.
 */
export async function readJoiningFeeReceipt(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<JoiningFeeReceipt | null> {
  // `pending-fee` is entered once (from `pending-kyc`) and left once, so at most ONE such event exists; the
  // ascending order makes the choice deterministic if a raw write ever added a second.
  const [event] = await db
    .select({ payload: eventsLog.payload })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, memberId),
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, 'member.vyawastha_shulk_paid'),
        sql`${eventsLog.payload}->>'from_state' = 'pending-fee'`,
      ),
    )
    .orderBy(asc(eventsLog.eventVersion))
    .limit(1);
  const utr = (event?.payload as { utr?: unknown } | undefined)?.utr;
  if (typeof utr !== 'string' || utr.length === 0) return null;

  const [receipt] = await db
    .select({ receiptId: vyawasthaShulkReceipts.receiptId, paidAt: vyawasthaShulkReceipts.paidAt })
    .from(vyawasthaShulkReceipts)
    .where(
      and(
        eq(vyawasthaShulkReceipts.pariwarId, pariwarId),
        eq(vyawasthaShulkReceipts.memberId, memberId),
        eq(vyawasthaShulkReceipts.utr, utr),
      ),
    )
    .limit(1);
  return receipt ? { receiptId: receipt.receiptId, paidAt: receipt.paidAt } : null;
}

/** The claim's LIVE membership check, as the staff preview shows it (⛔ the note). */
export interface LiveMembershipCheckView {
  readonly checkId: ClaimMembershipCheckId;
  readonly deathCertificateReviewId: DeathCertificateReviewId;
  readonly feeOutcome: MembershipCheckFeeOutcome;
  readonly identityRequired: boolean;
  readonly identityOutcome: MembershipCheckIdentityOutcome;
  readonly identityReason: MembershipCheckIdentityReason | null;
  readonly hasNote: boolean;
  readonly decidedByDisplay: string;
  readonly decidedAt: Date;
}

/** Read the claim's LIVE membership check for the staff preview (DL10). `null` when nobody has checked yet. */
export async function getLiveMembershipCheck(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<LiveMembershipCheckView | null> {
  const [row] = await db
    .select({
      checkId: claimMembershipChecks.checkId,
      deathCertificateReviewId: claimMembershipChecks.deathCertificateReviewId,
      feeOutcome: claimMembershipChecks.feeOutcome,
      identityRequired: claimMembershipChecks.identityRequired,
      identityOutcome: claimMembershipChecks.identityOutcome,
      identityReason: claimMembershipChecks.identityReason,
      hasNote: sql<boolean>`${claimMembershipChecks.noteCiphertext} IS NOT NULL`,
      decidedByDisplay: claimMembershipChecks.decidedByDisplay,
      decidedAt: claimMembershipChecks.decidedAt,
    })
    .from(claimMembershipChecks)
    .where(
      and(
        eq(claimMembershipChecks.pariwarId, pariwarId),
        eq(claimMembershipChecks.claimCaseId, claimCaseId),
        isNull(claimMembershipChecks.supersededAt),
      ),
    );
  return row ? { ...row, hasNote: row.hasNote === true } : null;
}

/**
 * ⭐ `2026-11-21-473` Q3 B (built `-474` item 4) — does the claim's refusal STAND on `fee_paid_after_death`? Feeds the
 * family's appeal card, which then shows the door's general reason (*"the person was not a member of the Trust when
 * they died"*). ⛔ The reason code itself never leaves the server. TRUE iff:
 *   · the claim is `denied`, AND
 *   · the transition that MADE it `denied` (the stream's latest event into `denied` from another state — ⛔ an identity
 *     annotation such as a revise or `claim.denied_no_appeal`, ⛔ an appeal's `upheld` review, which upholds the denial
 *     it reviewed) was the P1 verifier's denial (`claim.verifier_denied`)
 *     whose LIVE verifier decision is `denied` with that reason, OR the final vote's (`claim.state_trustee_denied`)
 *     whose LIVE `frozen_vote` decision is `denied` with that reason (DL9 gives the reason to BOTH vocabularies). On
 *     the trustee side ONLY the final vote can carry it: the escalation resolution refuses the reason, the
 *     correction-closure chains write their own codes, and R9's denial is always `r9_panel_denied` — hence
 *     `phase = 'frozen_vote'`.
 *   Keying on the denial that produced the CURRENT state is what `-474` item 4's "its LIVE denial" means: an allowed
 *   appeal leaves the old decision row live (the RF1 / F3 precedent), so a LATER denial for another reason ⛔ inherits
 *   its words — and a genuine fee refusal by the final vote AFTER a reversal is ⛔ blanked (code review 2026-11-21; the
 *   earlier blanket "⛔ reversed appeal" clause did both). An escalation's denial also emits `claim.verifier_denied`,
 *   but `resolveEscalation` supersedes the escalated verifier row and writes ⛔ new one, so there is ⛔ live verifier
 *   decision to match (and the reason is refused there anyway).
 * RLS-scoped with the explicit `pariwar_id` predicate on every table. ⛔ No ciphertext.
 */
export async function isFeePaidAfterDeathRefusalStanding(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<boolean> {
  const result = await db.execute<{ standing: boolean }>(sql`
    WITH fr_denial AS (
      -- The transition that made the claim denied: the latest event into denied from another state. An appeal
      -- review (claim.appeal_stageN_reviewed, decision upheld) also lands in denied, but it UPHOLDS the denial
      -- it reviewed, so it is skipped and the denial it upheld is the one that stands.
      SELECT fr_e.event_type
        FROM events_log fr_e
       WHERE fr_e.pariwar_id = ${pariwarId}::uuid
         AND fr_e.stream_id = ${claimCaseId}::uuid
         AND fr_e.payload->>'to_state' = 'denied'
         AND fr_e.payload->>'from_state' IS DISTINCT FROM 'denied'
         AND fr_e.event_type NOT IN ('claim.appeal_stage1_reviewed', 'claim.appeal_stage2_reviewed', 'claim.appeal_stage3_reviewed')
       ORDER BY fr_e.event_version DESC
       LIMIT 1
    )
    SELECT EXISTS (
      SELECT 1 FROM claims fr_c
       WHERE fr_c.pariwar_id = ${pariwarId}::uuid
         AND fr_c.claim_case_id = ${claimCaseId}::uuid
         AND fr_c.current_state = 'denied'
         AND (
           (
             (SELECT event_type FROM fr_denial) = 'claim.verifier_denied'
             AND EXISTS (
               SELECT 1 FROM claim_verifier_decisions fr_v
                WHERE fr_v.pariwar_id = fr_c.pariwar_id
                  AND fr_v.claim_case_id = fr_c.claim_case_id
                  AND fr_v.superseded_at IS NULL
                  AND fr_v.outcome = 'denied'
                  AND fr_v.reason_code = ${FEE_PAID_AFTER_DEATH_REASON_CODE}
             )
           )
           OR (
             (SELECT event_type FROM fr_denial) = 'claim.state_trustee_denied'
             AND EXISTS (
               SELECT 1 FROM claim_state_trustee_decisions fr_t
                WHERE fr_t.pariwar_id = fr_c.pariwar_id
                  AND fr_t.claim_case_id = fr_c.claim_case_id
                  AND fr_t.superseded_at IS NULL
                  AND fr_t.phase = 'frozen_vote'
                  AND fr_t.outcome = 'denied'
                  AND fr_t.reason_code = ${FEE_PAID_AFTER_DEATH_REASON_CODE}
             )
           )
         )
    ) AS standing
  `);
  return result.rows?.[0]?.standing === true;
}
