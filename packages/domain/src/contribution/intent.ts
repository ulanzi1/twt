// UPI Intent construction — the server-authoritative `upi://pay` builder + the nominee-VPA resolver seam
// (Story 8.4, Task 2; AC1/AC2). PURE + DB-free (the vyawastha-shulk `intent` R4 precedent, but with the
// DETERMINISTIC contribution `tr` and the pool `tn` grammar). The client NEVER names the payee, amount, or
// `tr` — the whole URL is built here.
//
// ── The nominee-VPA substrate gap is the story's central decision (D1) ──────────────────────────────
// FR-16/FR-27 pre-fill the nominee's UPI VPA for `pa=`, but the substrate has NO VPA column anywhere:
// Story 6.8 collected nominee bank accounts as account#+IFSC Tier-1 ciphertext (claim_nominee_bank_accounts
// — for the reconciliation matcher + disbursement), NOT a UPI `pa=`. A bank account#+IFSC is NOT a valid
// `upi://pay?pa=` VPA. BigDev SETTLED path (b): defer VPA collection to a dedicated story; ship 8.4 with the
// seam ABSENT. So `resolveNomineeVpa` returns `{ available: false, reason: 'vpa_not_collected' }` as the
// EXPECTED, shipped v1 state — a first-class fail-soft, never a fabricated VPA / `pa=undefined`
// ([[feedback_record_unattested_no_backfill]]). The resolver is WIRED so that when a dedicated
// nominee-VPA-collection story adds a `vpa` field to the nominee-bank row, `accountVpa` reads it and the
// flow lights up with ZERO surface changes (exactly how 8.3's confirmed list populates when Epic 9 lands).

import type { ClaimNomineeBankAccountRow } from '../schema/claim_nominee_bank_accounts.js';

/** Why a nominee VPA could not be resolved — every value a first-class, tested fail-soft state (AC2). */
export type NomineeVpaUnavailableReason =
  /** The nominee bank accounts themselves have not been collected for this claim yet. */
  | 'accounts_not_collected'
  /** Accounts exist, but no UPI VPA is stored — the shipped v1 state today (D1; the VPA substrate is
   *  deferred to a dedicated story). */
  | 'vpa_not_collected'
  /** The caller asked to switch to an account rank that was never collected for this claim (e.g.
   *  `preferredAccount: 2` when only #1 exists) — a distinct signal, NEVER a silent substitution of a
   *  different account's VPA (review finding: the pre-fix code fell back to `collectionAccounts[0]`). */
  | 'account_not_found';

/** The nominee-VPA resolution — a resolved VPA (+ which account it came from), or a first-class absence. */
export type NomineeVpaResolution =
  | { readonly available: true; readonly vpa: string; readonly account: 1 | 2 }
  | { readonly available: false; readonly reason: NomineeVpaUnavailableReason };

/**
 * Read a UPI VPA off a nominee bank-account row — or null when none is stored. THE seam (D1): the substrate
 * has no VPA column today (Story 6.8 stored account#+IFSC ciphertext only), so this reads a forward-compatible
 * `vpa` field that does not exist yet and always returns null. When a dedicated nominee-VPA-collection story
 * adds the field (e.g. `vpaCiphertext` decrypted at the API boundary, or a plain `vpa`), replace this shim
 * with the real read and the whole flow lights up — no change to the URL builder, the endpoints, or the card.
 */
function accountVpa(account: ClaimNomineeBankAccountRow): string | null {
  const maybe = (account as { vpa?: unknown }).vpa;
  return typeof maybe === 'string' && maybe.length > 0 ? maybe : null;
}

export interface ResolveNomineeVpaInput {
  /** The assigned pool's claim's nominee bank accounts (the Story 7.6 binding's `collectionAccounts`). */
  readonly collectionAccounts: readonly ClaimNomineeBankAccountRow[];
  /** Which account's VPA to prefer — default #1, switchable to #2 per FR-27 ("Switch account"). */
  readonly preferredAccount?: 1 | 2;
}

/**
 * Resolve the assigned pool's nominee VPA for the UPI `pa=` (AC2) — PURE. Reads the `preferredAccount`
 * rank's VPA (default #1, switchable to #2) and returns `{ available: true, vpa, account }` — OR a
 * first-class absence (`accounts_not_collected` / `account_not_found` / `vpa_not_collected`). Absence is
 * the EXPECTED shipped v1 state (D1): today `accountVpa` always returns null, so a claim WITH collected
 * bank accounts resolves to `{ available: false, reason: 'vpa_not_collected' }`. Never fabricates a VPA,
 * never derives one from account#+IFSC (not a valid `pa=`), and NEVER silently substitutes a different
 * account's VPA when the requested rank isn't present — that is `account_not_found`, a distinct signal
 * (review finding: 6.8's "exactly-two atomic" collection means both ranks are always present together in
 * practice, so this only fires on genuinely inconsistent data — and it must be surfaced honestly, not
 * masked by picking whichever account happened to be first in the array).
 */
export function resolveNomineeVpa({
  collectionAccounts,
  preferredAccount = 1,
}: ResolveNomineeVpaInput): NomineeVpaResolution {
  if (collectionAccounts.length === 0) {
    return { available: false, reason: 'accounts_not_collected' };
  }
  const chosen = collectionAccounts.find((a) => a.accountRank === preferredAccount);
  if (chosen === undefined) {
    return { available: false, reason: 'account_not_found' };
  }
  const vpa = accountVpa(chosen);
  if (vpa === null) {
    return { available: false, reason: 'vpa_not_collected' };
  }
  return { available: true, vpa, account: chosen.accountRank === 2 ? 2 : 1 };
}

export interface BuildContributionUpiUrlInput {
  /** The nominee VPA (the `pa=` payee) — server-resolved; never client-named (R4). */
  readonly vpa: string;
  /** The amount-lock: the assigned pool's SNAPSHOTTED `fixed_amount` (whole-INR positive integer; D4). */
  readonly amountInr: number;
  /** The DETERMINISTIC `deriveContributionReference({ memberId, alertId })` (Story 7.7). */
  readonly tr: string;
  /** The human-readable note — the FR-27 grammar (pool letter/name + cycle ref), built by the caller. */
  readonly tn: string;
}

/**
 * Build the server-authoritative `upi://pay?pa=…&am=…&cu=INR&tn=…&tr=…` (AC1) — PURE. Every component is
 * `encodeURIComponent`-escaped (the vyawastha-shulk precedent — an unencoded reserved char corrupts the
 * intent, and a malformed URL is "₹310 to the wrong VPA with no recourse"). Fails LOUD on an empty `pa`, a
 * non-whole-positive `am` (the amount-lock invariant), an empty `tr`, or an empty `tn` — so the URL can
 * NEVER contain `undefined` / an empty `pa`/`am` (AC1). FR-27's optional `mc=` is deliberately omitted
 * (no reconciliation dependency; D7).
 */
export function buildContributionUpiUrl({
  vpa,
  amountInr,
  tr,
  tn,
}: BuildContributionUpiUrlInput): string {
  if (typeof vpa !== 'string' || vpa.length === 0) {
    throw new Error('[buildContributionUpiUrl] pa (nominee VPA) must be a non-empty string');
  }
  if (!Number.isInteger(amountInr) || amountInr <= 0) {
    throw new Error(
      `[buildContributionUpiUrl] am (amount) must be a whole-INR positive integer (the amount-lock), got ${String(amountInr)}`,
    );
  }
  if (typeof tr !== 'string' || tr.length === 0) {
    throw new Error('[buildContributionUpiUrl] tr (reference) must be a non-empty string');
  }
  if (typeof tn !== 'string' || tn.length === 0) {
    throw new Error('[buildContributionUpiUrl] tn (note) must be a non-empty string');
  }
  return (
    `upi://pay?pa=${encodeURIComponent(vpa)}&am=${String(amountInr)}&cu=INR` +
    `&tn=${encodeURIComponent(tn)}&tr=${encodeURIComponent(tr)}`
  );
}
