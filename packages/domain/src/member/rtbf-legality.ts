// Story 10.21 — the ONE RTBF legality predicate, shared by BOTH erasure callers (AC7).
//
// ── Why this file exists ──────────────────────────────────────────────────────────────────────────
// Story 10.21 relocated erasure legality OUT of the reducer (`member/state.ts`, which now accepts
// `member.rtbf_anonymized` from every label but `anonymized`) and INTO the callers. There are exactly
// two callers — the member self-service handler and the off-portal admin handler — and a predicate
// duplicated across two files is a predicate that diverges. So it is declared ONCE, here, and both
// import it. ⛔ Do not inline a second copy at a call site.
//
// ⛔ THIS IS NOT REDUCER LOGIC AND MUST NOT MOVE THERE. `reduce` is a pure synchronous fold with no DB
// handle; this predicate needs TWO async reads (the lifecycle replay and the moderation overlay). Moving
// it into the reducer would make replay non-deterministic and order-dependent on a second stream — see
// the DELIBERATE block on the `member.rtbf_anonymized` arm in `state.ts`.
//
// ── The rule (Niyamavali §8.4 + the 10.16–10.23 moderation model) ─────────────────────────────────
// An erasure is legal when EITHER:
//   (a) the member's lifecycle state is `withdrawn` — the original Story 3.12 / FR-96 self-service path; OR
//   (b) the member's moderation OVERLAY reads `terminated` — the Story 10.21 off-portal path, where
//       statutory rights survive termination but authenticated access has ended.
// ⛔ There is NO `terminated` lifecycle state and one must never be introduced (the rejected model the
// whole 10.16–10.23 correct-course exists to prevent). Termination is an OVERLAY, orthogonal to the
// lifecycle — a terminated member's `members.state` is whatever it already was, which is why (b) cannot
// be expressed as a lifecycle check.

import { createHash } from 'node:crypto';

import type { Db } from '../db.js';
import type { MemberId } from '../ids/index.js';
import { getCurrentMemberModerationOverlay } from './moderation/overlay.js';
import type { MemberLifecycleState } from './state.js';

/** Why an erasure is (or is not) legal — the caller maps this onto its own typed HTTP error. */
export type RtbfLegality =
  /** Already terminal. The caller returns the shipped 409 `rtbf.already_anonymized`. */
  | { readonly kind: 'already_anonymized' }
  /** Legal via the lifecycle route (`withdrawn`). */
  | { readonly kind: 'legal'; readonly via: 'withdrawn'; readonly fromState: MemberLifecycleState }
  /** Legal via the moderation overlay (`terminated`) — the off-portal statutory-rights route. */
  | { readonly kind: 'legal'; readonly via: 'terminated'; readonly fromState: MemberLifecycleState }
  /** Neither route applies. The caller returns the shipped 409 `rtbf.invalid_state`. */
  | { readonly kind: 'illegal'; readonly fromState: MemberLifecycleState };

/**
 * Resolve RTBF legality for a member, reading the CURRENT lifecycle state and the CURRENT overlay.
 *
 * ⛔ `getCurrentMemberModerationOverlay` — the UNBOUNDED read — is used deliberately. The `at`-bounded
 * variant compares a DB-generated `occurred_at` against an INJECTED APP clock; those are different clock
 * domains, and under the wrong skew the bounded read silently drops the very event that makes the
 * termination real, folding `status: 'none'` and refusing a legal erasure (or, worse, admitting an
 * illegal one). Legality must see the PRESENT, and the present has no clock in it. See the note above
 * `getCurrentMemberModerationOverlay` in `moderation/overlay.ts`.
 *
 * ⚠ `fromState` is returned so the caller can write the REAL replayed state into the event's
 * `from_state` audit field. ⛔ Do not hardcode `'withdrawn'` there — with (b) in play that would be a
 * false audit record on the one event whose `from` set this story widened.
 *
 * @param db          the caller's scoped transaction (RLS applies)
 * @param memberId    the subject
 * @param currentState the member's replayed lifecycle state (the caller already has it; passing it in
 *                     keeps this function from owning a second replay strategy)
 */
export async function resolveRtbfLegality(
  db: Db,
  memberId: MemberId,
  currentState: MemberLifecycleState,
): Promise<RtbfLegality> {
  if (currentState === 'anonymized') return { kind: 'already_anonymized' };
  if (currentState === 'withdrawn') return { kind: 'legal', via: 'withdrawn', fromState: currentState };

  const overlay = await getCurrentMemberModerationOverlay(db, memberId);
  if (overlay.status === 'terminated') {
    return { kind: 'legal', via: 'terminated', fromState: currentState };
  }
  return { kind: 'illegal', fromState: currentState };
}

/**
 * The transaction-scoped advisory-lock key for a member erasure (AC13).
 *
 * ⛔ NAMESPACE-PREFIXED, deliberately. A bare `hashtext(member_id)` collides with
 * `auth/member/member-auth.service.ts`'s device-binding lock — a different subsystem sharing the same
 * key space. The prefix follows `claim/appeal-persist.ts` ("a DISTINCT namespace prefix … so the four
 * never collide").
 *
 * ⛔ The caller must use `pg_advisory_xact_lock`, NOT `pg_advisory_lock`. Every domain precedent is
 * transaction-scoped; the one session-scoped precedent needs a manual unlock on a dedicated client, and
 * copied onto a POOLED client without that `finally` it leaks the lock for the connection's life.
 */
export function rtbfAdvisoryLockKey(pariwarId: string, memberId: string): bigint {
  const hex = createHash('sha256').update(`member.rtbf:${pariwarId}:${memberId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}
