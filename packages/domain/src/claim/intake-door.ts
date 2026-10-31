// The claim DOOR — who a claim may be filed for (Story 6.38, N4, N6, DL6; `2026-10-31-425`). Transport-free.
//
// `2026-10-30-423` Q3 B: *"A claim for someone who, at their death, had not finished joining (⛔ identity check), had left
// the Trust, had been removed, or had been erased is refused when it is filed: the helpline tells the caller the claim
// cannot be filed; ⛔ claim record is kept."* `2026-10-31-424` Q1 (b) B: someone who never paid the joining fee is refused
// the same way. ⛔ Touched (`-423` Q3): *"members in their first days after joining, behind on contributions, or
// suspended"* — and (`-424` Q1 (a) C) a typed-in identity nobody checked is FILED, in any state (its check before a drive is
// row `6-39-…`).
//
// ⭐ EXACTLY FIVE REFUSALS, checked in this order (N6): `anonymized` ⇒ `erased`; terminated (the moderation OVERLAY) ⇒
// `removed`; `withdrawn` ⇒ `left`; `pending-kyc` ⇒ `not_joined`; `pending-fee` ⇒ `not_paid`. Every other lifecycle state
// and `suspended` ⇒ open. The `switch` is exhaustive with a `never` arm: a new lifecycle state FAILS TO COMPILE until
// someone decides it. A new way INTO a refused state is caught by `packages/domain/tests/member/door-input-fence.test.ts`
// (DL17), which reads `DOOR_REFUSED_LIFECYCLE_STATES` below.
//
// ⚠ WHAT THE DOOR REFUSES IS TIED TO LIFECYCLE STATES, ⛔ TO HOW IDENTITY IS CHECKED. "Never finished joining" means
// `pending-kyc` only because `pending-kyc` is reached only at signup today — any change to the KYC basis reopens `-424`
// Q1 (a).
//
// ⛔ Called ONLY from `tryConverge`, under the intake lock, and only when ⛔ death report stands (once per death — N4).
// Reads the UNBOUNDED replay and the UNBOUNDED overlay (the clock-domain-safe reads — ⛔ `getMemberStateAt`).
//
// ⭐ THE VOCABULARY IS DOMAIN-OWNED (`@twt/domain` ⛔ imports `@twt/contracts` — a turbo cycle). Contracts MIRRORS the
// tuple in `packages/contracts/src/claims/intake-refusal.ts`; a lockstep test pins the two equal.

import type { Db } from '../db.js';
import type { MemberId } from '../ids/index.js';
import { getCurrentMemberModerationOverlay } from '../member/moderation/overlay.js';
import { getCurrentMemberState } from '../member/read.js';
import { MEMBER_LIFECYCLE_STATES, type MemberLifecycleState } from '../schema/members.js';

/** The five reasons a claim is refused at the door (N6) — mirrored by `@twt/contracts`. */
export const CLAIM_INTAKE_REFUSAL_REASONS = ['erased', 'removed', 'left', 'not_joined', 'not_paid'] as const;
export type ClaimIntakeRefusalReason = (typeof CLAIM_INTAKE_REFUSAL_REASONS)[number];

export type ClaimIntakeDoor = { readonly kind: 'open' } | { readonly kind: 'refused'; readonly reason: ClaimIntakeRefusalReason };

/** The lifecycle arm of the door — exhaustive; `null` = open. Exported for the DL17 fence. */
export function lifecycleRefusal(state: MemberLifecycleState): ClaimIntakeRefusalReason | null {
  switch (state) {
    case 'anonymized':
      return 'erased';
    case 'withdrawn':
      return 'left';
    case 'pending-kyc':
      return 'not_joined';
    case 'pending-fee':
      return 'not_paid';
    case 'pending-valid':
    case 'lock-in':
    case 'active':
    case 'active-in-grace':
    case 'lapsed-unpaid':
      return null;
    default: {
      const unreachable: never = state;
      throw new Error(`claim door: undecided lifecycle state ${String(unreachable)}`);
    }
  }
}

/** The lifecycle states the door refuses — DERIVED from `lifecycleRefusal`, so the DL17 fence moves with the door. */
export const DOOR_REFUSED_LIFECYCLE_STATES: readonly MemberLifecycleState[] = MEMBER_LIFECYCLE_STATES.filter(
  (s) => lifecycleRefusal(s) !== null,
);

/**
 * Is the claim door open for this member? (Precedence N6: erased → removed → left → not_joined → not_paid.)
 * ⚠ The caller holds the intake lock and has checked that ⛔ death report stands.
 */
export async function resolveClaimIntakeDoor(db: Db, memberId: MemberId): Promise<ClaimIntakeDoor> {
  const state = await getCurrentMemberState(db, memberId);
  if (state === 'anonymized') return { kind: 'refused', reason: 'erased' };
  const overlay = await getCurrentMemberModerationOverlay(db, memberId);
  if (overlay.status === 'terminated') return { kind: 'refused', reason: 'removed' };
  const reason = lifecycleRefusal(state);
  return reason === null ? { kind: 'open' } : { kind: 'refused', reason };
}
