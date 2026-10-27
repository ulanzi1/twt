// The memorial's state — DERIVED, ⛔ never stored (Story 11b.4, MA10 / MA13 / MA16 — `#decision-2026-10-24-398`).
//
// ⛔ No mutable status column exists (the 10.20 posture): the state is a pure function of the chain's latest version,
// its one decision and its one withdrawal. ⚠ ⛔ Never name a wire key `status` — `SAHYOG_VIVRAN_PROHIBITED_KEYS` bans it
// on the public surface and 11b.4a will consume this shape; the wire key is `memorialState`.

import type { MemorialReviewAction, MemorialReviewReason, MemorialWithdrawalActor } from './vocab.js';

export const MEMORIAL_STATES = [
  'none',
  'with_the_trust',
  'approved',
  'approved_with_omissions',
  'not_approved',
  'withdrawn',
  'approval_withdrawn',
  // Story 11b.4a (`-412` MP9) — taken down by the helpline at the nominee's request; a CHAIN property
  // (`deriveMemorialChainState`), ⛔ never read off the head alone (Trap 18).
  'taken_down',
] as const;
export type MemorialState = (typeof MEMORIAL_STATES)[number];

/** The minimum a status derivation reads from one version. */
export interface MemorialChainLinkState {
  readonly decision: { readonly action: MemorialReviewAction } | null;
  readonly withdrawal: { readonly withdrawnBy: MemorialWithdrawalActor; readonly reasonCode: MemorialReviewReason | null } | null;
}

/**
 * The state of ONE version (`null` ⇒ `none` — nothing was ever sent). Per-row — the review list's head state; the FAMILY's
 * state is `deriveMemorialChainState` (Trap 18).
 *   · a `family` withdrawal ⇒ `withdrawn` (only reachable before a decision — MA9);
 *   · a `trust` withdrawal ⇒ `approval_withdrawn` (only reachable after an approval — MA16);
 *   · a `helpline` withdrawal ⇒ `taken_down` (Story 11b.4a — the take-down withdraws every un-withdrawn version, MP8 (a));
 *   · a decision ⇒ its act;
 *   · otherwise ⇒ `with_the_trust`.
 */
export function deriveMemorialStatus(latest: MemorialChainLinkState | null): MemorialState {
  if (latest === null) return 'none';
  if (latest.withdrawal !== null) {
    const by = latest.withdrawal.withdrawnBy;
    switch (by) {
      case 'family':
        return 'withdrawn';
      case 'trust':
        return 'approval_withdrawn';
      case 'helpline':
        return 'taken_down';
      default: {
        const exhaustive: never = by;
        throw new Error(`deriveMemorialStatus: unknown withdrawal actor ${String(exhaustive)}`);
      }
    }
  }
  if (latest.decision !== null) {
    const action = latest.decision.action;
    switch (action) {
      case 'approved':
      case 'approved_with_omissions':
      case 'not_approved':
        return action;
      default: {
        const exhaustive: never = action;
        throw new Error(`deriveMemorialStatus: unknown review action ${String(exhaustive)}`);
      }
    }
  }
  return 'with_the_trust';
}

/** A version's link with the two timestamps the chain-level state reads (both `clock_timestamp()` — 0182). */
export interface MemorialChainLinkTimed extends MemorialChainLinkState {
  readonly submission: { readonly createdAt: Date };
  readonly withdrawal:
    | {
        readonly withdrawnBy: MemorialWithdrawalActor;
        readonly reasonCode: MemorialReviewReason | null;
        readonly withdrawnAt: Date;
      }
    | null;
}

/**
 * ⭐ THE FAMILY'S STATE — a CHAIN rule (Story 11b.4a MP9, Trap 18). `taken_down` iff the chain carries a `helpline` withdrawal
 * and ⛔ no version was created after the newest one (`created_at > withdrawn_at`); otherwise the head's own state, as before.
 * ⚠ A head-only rule is wrong: in `[A-omit, family-withdrawn]` the head is ALREADY withdrawn, so the take-down adds ⛔ no row to
 * it — yet the memorial was taken down. Sound under the pool lock: every writer inserts after `lockMemorialPool`, so a version
 * sent after a take-down has `created_at > withdrawn_at`. `chain` is oldest → newest.
 */
export function deriveMemorialChainState(chain: readonly MemorialChainLinkTimed[]): MemorialState {
  if (chain.length === 0) return 'none';
  let newestTakedown: number | null = null;
  for (const link of chain) {
    if (link.withdrawal?.withdrawnBy !== 'helpline') continue;
    const at = link.withdrawal.withdrawnAt.getTime();
    if (newestTakedown === null || at > newestTakedown) newestTakedown = at;
  }
  if (newestTakedown !== null && !chain.some((l) => l.submission.createdAt.getTime() > newestTakedown!)) return 'taken_down';
  return deriveMemorialStatus(chain[chain.length - 1]!);
}

/**
 * May the family send a (new) version? (MA13 (a).) Every state but a clean `approved` — `taken_down` included (Story 11b.4a
 * MP9, `-411` item 4: after a take-down the nominee may write again whenever they wish). Every state but a clean `approved`: after `approved` nothing of
 * theirs was cut, and changing a version the Trust approved belongs with what is published (11b.4a) — the family is
 * pointed to the helpline, and a mistaken approval is cured by the Trust withdrawing it (MA16). Enforced ON THE SERVER
 * under the lock (`409 memorial.already_reviewed`), ⛔ only in the app.
 */
export function memorialCanSend(state: MemorialState): boolean {
  return state !== 'approved';
}

/** May the family withdraw the latest version? Only while it is with the Trust (MA9) — ⛔ never after a take-down. */
export function memorialCanWithdraw(state: MemorialState): boolean {
  return state === 'with_the_trust';
}

function isApproval(link: MemorialChainLinkState): boolean {
  return link.decision !== null && (link.decision.action === 'approved' || link.decision.action === 'approved_with_omissions');
}

/**
 * The index of the chain's latest APPROVED, UN-WITHDRAWN version — the one the page would show (MA13) and the only one
 * the Trust may withdraw (MA16), whatever newer versions follow it. `-1` if none. `chain` is oldest → newest.
 */
export function latestApprovedIndex(chain: readonly MemorialChainLinkState[]): number {
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const link = chain[i]!;
    if (isApproval(link) && link.withdrawal === null) return i;
  }
  return -1;
}

/**
 * `earlierApprovalWithdrawn` on the member GET (MA16): non-null IFF a version OLDER than the latest carries a `trust`
 * withdrawal AND ⛔ no version newer than that withdrawn one has been approved; it carries the newest such withdrawal's
 * reason. `null` when the latest itself is `approval_withdrawn` (its own state already says so). `chain` is oldest →
 * newest.
 */
export function deriveEarlierApprovalWithdrawn(
  chain: readonly MemorialChainLinkState[],
): { readonly reasonCode: MemorialReviewReason } | null {
  if (chain.length < 2) return null;
  const last = chain.length - 1;
  if (chain[last]!.withdrawal?.withdrawnBy === 'trust') return null;
  for (let i = last - 1; i >= 0; i -= 1) {
    const w = chain[i]!.withdrawal;
    if (w === null || w.withdrawnBy !== 'trust') continue;
    // The newest older Trust withdrawal — told only if nothing newer was approved since.
    for (let j = i + 1; j <= last; j += 1) if (isApproval(chain[j]!)) return null;
    return w.reasonCode === null ? null : { reasonCode: w.reasonCode };
  }
  return null;
}

/**
 * `earlierApprovalStands` on the member GET (R2): true IFF the chain has a CURRENTLY approved version
 * (`latestApprovedIndex` — approved or approved-with-omissions, ⛔ no withdrawal) AND a newer version exists after it. The
 * state is derived from the latest version alone, so when that newest version is withdrawn or not approved the screen
 * would say so about a memorial that the older approval still holds (MA13: the latest APPROVED version is the one the page
 * shows). Independent of `earlierApprovalWithdrawn` (an even older approval can stand while a middle one was withdrawn).
 * `chain` is oldest → newest.
 */
export function deriveEarlierApprovalStands(chain: readonly MemorialChainLinkState[]): boolean {
  const approved = latestApprovedIndex(chain);
  return approved >= 0 && approved < chain.length - 1;
}
