// The UTR matching engine — Story 9.4 (Task 1; AC2/AC4/AC6). The PURE, deterministic, replay-identical
// per-pool matcher that closes the forward contracts Epic 8 + Story 9.3 left standing.
//
// ── What this module is ─────────────────────────────────────────────────────────────────────────────
// `matchPool` is a PURE function of its input SET (never its input ORDER): given a pool's UTR attestations
// (Story 8.4 `contribution.utr-attested`) and the cycle's persisted `BankStatementEntry` rows (Story 9.2 /
// this story's Task 2), it produces the confirmed/mismatched verdicts. NO DB, NO clock, NO I/O, NO
// randomness (the `classifyContributionDestination` / `classifyContributionAmount` purity discipline). The
// apps/jobs matcher worker (Task 3) is the thin shell that loads the inputs, calls this, and emits the
// events; this is where the matcher earns its correctness ([[feedback_gate_scope_semantic_coverage]] — a
// green happy-path proves little; the teeth are the frozen vectors + the shuffled-replay property).
//
// ── The matching mechanism (AC2) ────────────────────────────────────────────────────────────────────
//   (a) PRIMARY — exact string equality `attestation.utr === entry.transaction_id_utr` (a null-UTR entry is
//       never matchable — Story 9.2's schema documents this: "the matcher simply never confirms a UTR-less
//       row"). A candidate entry must ALSO fall inside the optional timestamp window (AC2 secondary).
//   (b) SECONDARY — destination FIRST (the `contribution-binding.ts` precedence, AC3.10): the matched
//       entry's PROVENANCE pool (`entry.poolId`, denormalized in Task 2) must equal the attestation's
//       assigned pool; a mismatch is `wrong_pool` and amount is NEVER checked (AC6 — never a silent remap).
//       Only on a correct-destination deposit is AMOUNT checked, reconciling the units trap
//       (`pools.fixed_amount` is whole-INR; `BankStatementEntry.amount` is integer PAISE ⇒ compare
//       `fixedAmount × 100 === amount`). The sender-VPA arm is a first-class `{available:false}` seam
//       (Decision D3 — no member/sender VPA is collected anywhere in the substrate today); it NEVER blocks
//       a confirmation and NEVER fabricates a check.
//   (c) FULL MATCH → a `confirmation`; a UTR with no in-window matchable entry / a `wrong_pool` destination /
//       an `amount_mismatch` → a `mismatch` carrying a reason-code from the 7.6/7.7-aligned vocabulary.
//
// ── Determinism + order-invariance (AC4 — the replay-identity spine) ────────────────────────────────
// Inputs are canonicalized (entries de-duplicated on `entryId` then sorted; attestations sorted by their
// event id) BEFORE matching, so a shuffled input reproduces byte-identical output. A re-parse of the same
// blob yields identical `entry_id`s (Story 9.2 `deriveBankStatementEntryId`), so the whole
// `(attestations, entries) → verdicts` computation is replay-identical (mirrors the pool-assignment
// engine's version-pinned replay identity, [[project_pool_assignment_engine]]).

import {
  classifyContributionAmount,
  classifyContributionDestination,
} from '../pool/contribution-binding.js';

/**
 * The mismatch reason-code vocabulary (reusing the 7.6/7.7 `wrong_pool` / `amount_mismatch` tokens where
 * they apply). `sender_vpa_mismatch` is a FORWARD seam only — while the sender-VPA arm ships
 * `{available:false}` (Decision D3), the matcher NEVER produces it; a dedicated member-VPA-collection story
 * lights it later. Open by design (the `ContributionValidityVerdict` precedent).
 */
export const MATCH_MISMATCH_REASONS = [
  'no_statement_entry',
  'wrong_pool',
  'amount_mismatch',
  'sender_vpa_mismatch',
  'entry_already_claimed',
] as const;
export type MatchMismatchReason = (typeof MATCH_MISMATCH_REASONS)[number];

/** The Decision-D3 reason token: no member/sender VPA is collected anywhere in the substrate today. */
export const MEMBER_VPA_NOT_COLLECTED = 'member_vpa_not_collected' as const;

/**
 * The sender-VPA secondary-match arm result. Ships EXCLUSIVELY as `{available:false}` in v1 (Decision D3 —
 * the `utr-attested` payload carries no member VPA, and none is collected anywhere). NEVER blocks a
 * confirmation; recorded on the confirmation's provenance so the absence is auditable, not silent.
 */
export interface SenderVpaCheckUnavailable {
  readonly available: false;
  readonly reason: typeof MEMBER_VPA_NOT_COLLECTED;
}

/** The frozen `{available:false}` sender-VPA verdict — one shared literal (Decision D3). */
export const SENDER_VPA_CHECK_UNAVAILABLE: SenderVpaCheckUnavailable = {
  available: false,
  reason: MEMBER_VPA_NOT_COLLECTED,
};

/** A member's UTR attestation for THIS pool (the pure-matcher projection of `contribution.utr-attested`). */
export interface MatcherAttestation {
  /** The `contribution.utr-attested` event id — the confirmation's back-reference + a stable sort key. */
  readonly attestationEventId: string;
  readonly memberId: string;
  /** The member's ASSIGNED pool (the attestation's `poolId`; destination is compared against `entry.poolId`). */
  readonly poolId: string;
  /** The alert stream the attestation rides (stream_id = alertId; the verdict is co-located, Decision D2). */
  readonly alertId: string;
  /** The deterministic `deriveContributionReference({ memberId, alertId })` (Story 7.7) — the idempotency spine. */
  readonly tr: string;
  /** The RAW member-pasted UTR — the primary-match key. */
  readonly utr: string;
}

/** A persisted, normalized bank-statement entry (the pure-matcher projection of a `bank_statement_entries` row). */
export interface MatcherEntry {
  /** Deterministic `deriveBankStatementEntryId` id (Story 9.2) — the idempotency-key component + sort key. */
  readonly entryId: string;
  /** The PROVENANCE pool — the pool the entry's statement was uploaded against (Task 2 denormalization). */
  readonly poolId: string;
  /** The UTR / bank reference (nullable — a null-UTR row is never matchable). */
  readonly transactionIdUtr: string | null;
  /** The deposit amount in INTEGER PAISE (Story 9.2 — reconcile units against whole-INR `fixedAmount`). */
  readonly amount: number;
  /** The transaction date (ISO-8601 `YYYY-MM-DD`, optionally with a time) — the window check reads the date. */
  readonly transactionDate: string;
  /** The payer VPA if the narration carried one — the Decision-D3 arm's FUTURE input (unused in v1). */
  readonly senderVpa: string | null;
  /** credit/debit/charge/reversal (Story 9.2 `BankEntryType`). Only a `credit` row is ever a match candidate —
   *  a debit/charge/reversal row sharing a UTR + amount with a real deposit must never confirm a contribution. */
  readonly entryType: string;
}

/**
 * The optional reconciliation timestamp window (AC2 secondary). Bounds are ISO calendar dates
 * (`YYYY-MM-DD`); an entry is in-window iff its transaction DATE (the entry's `transaction_date` truncated
 * to its 10-char date prefix, so a time component does not break the lexical comparison) falls within
 * `[startInclusive, endInclusive]`. An absent bound is unbounded on that side; an absent window admits every
 * entry (v1: the primary UTR match + amount are the live signals, the window is defense-in-depth).
 */
export interface MatchWindow {
  readonly startInclusive?: string;
  readonly endInclusive?: string;
}

/** The per-pool match input. `poolId` is the pool being matched; `attestations` are ITS members' claims. */
export interface MatchPoolInput {
  readonly poolId: string;
  readonly attestations: readonly MatcherAttestation[];
  /**
   * The candidate bank-statement entries. For wrong-pool detection (AC6) the worker supplies the WHOLE
   * cycle's entries (an entry whose provenance pool differs from the attestation's is a `wrong_pool`
   * mismatch, never a remap); a null-UTR / out-of-window entry is simply never a candidate.
   */
  readonly entries: readonly MatcherEntry[];
  /** The pool's SNAPSHOTTED whole-INR `fixed_amount` (Story 7.5) — the amount-lock (× 100 for the paise cmp). */
  readonly fixedAmount: number;
  /** The optional reconciliation window (AC2 secondary). Omitted ⇒ every entry is in-window. */
  readonly window?: MatchWindow;
  /**
   * Entry ids already bound to a confirmation — either from an earlier pool in THIS SAME run (the caller
   * threads its own running set across pools sharing one cross-pool `entries` array) or a PRIOR run/tick (a
   * previously emitted `contribution.confirmed`'s `matchProvenance.bankStatementEntryId`). One physical bank
   * deposit can back exactly one confirmation, ever — a second attestation resolving to an already-claimed
   * entry is `entry_already_claimed`, never a second confirmation and never silently dropped.
   */
  readonly claimedEntryIds?: ReadonlySet<string>;
}

/** A confirmed contribution (a full match). The worker appends `contribution.confirmed` from this. */
export interface MatchConfirmation {
  readonly attestationEventId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly alertId: string;
  readonly tr: string;
  readonly utr: string;
  /** The matched `bank_statement_entries.entry_id` — the provenance + the idempotency-key component. */
  readonly entryId: string;
  /** The Decision-D3 sender-VPA arm result — always `{available:false}` in v1 (defense-in-depth, never a block). */
  readonly senderVpaCheck: SenderVpaCheckUnavailable;
}

/** A reconciliation mismatch. The worker appends `contribution.reconciliation-mismatch` from this. */
export interface MatchMismatch {
  readonly attestationEventId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly alertId: string;
  readonly tr: string;
  readonly utr: string;
  readonly reason: MatchMismatchReason;
  /** The offending entry (a `wrong_pool` / `amount_mismatch` carries it; `no_statement_entry` is `null`). */
  readonly entryId: string | null;
  /**
   * The deposited amount in INTEGER PAISE — the durable over/under fact (Story 9.11, AC1). Populated ONLY on
   * the `amount_mismatch` branch (where `entry.amount` is in scope); ABSENT (`undefined`) on every other
   * branch (`no_statement_entry` has no entry; `wrong_pool` deliberately never checked amount;
   * `entry_already_claimed` is an exclusivity reject). Populating it elsewhere would fabricate a comparison
   * that was never made (matcher-worker.ts's "never fabricated" posture). The over/under DIRECTION is derived
   * from this + `expectedAmountPaise` by the canonical `classifyAmountMismatchDirection` — never inline.
   */
  readonly depositedAmountPaise?: number;
  /** The expected amount in INTEGER PAISE (`fixedAmount × 100`) — carried alongside `depositedAmountPaise` on
   *  the `amount_mismatch` branch ONLY (Story 9.11, AC1); absent everywhere else. */
  readonly expectedAmountPaise?: number;
}

/** The pure matcher's verdict set. */
export interface MatchPoolResult {
  readonly confirmations: readonly MatchConfirmation[];
  readonly mismatches: readonly MatchMismatch[];
}

/** The 10-char ISO date prefix — strips a `THH:MM:SS` so the window comparison is a clean date compare. */
function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Whether an entry's transaction date falls inside the (optional, inclusive) window. */
function inWindow(entry: MatcherEntry, window: MatchWindow | undefined): boolean {
  if (window === undefined) return true;
  const d = dateOf(entry.transactionDate);
  if (window.startInclusive !== undefined && d < dateOf(window.startInclusive)) return false;
  if (window.endInclusive !== undefined && d > dateOf(window.endInclusive)) return false;
  return true;
}

/**
 * Match a pool's attestations against the candidate entries (AC2/AC4/AC6). PURE + deterministic +
 * order-invariant. Throws on a non-finite/non-positive/non-integer `fixedAmount` (a corrupt amount-lock is
 * an upstream defect to surface, never a silent mismatch — the `classifyContributionAmount` posture).
 */
export function matchPool(input: MatchPoolInput): MatchPoolResult {
  if (!Number.isInteger(input.fixedAmount) || input.fixedAmount <= 0) {
    throw new Error(
      `[matchPool] fixedAmount must be a positive integer (whole INR), got ${String(input.fixedAmount)}`,
    );
  }
  const expectedPaise = input.fixedAmount * 100;

  // Canonicalize the inputs so the outcome is a pure function of the SET, not the order (AC4). De-duplicate
  // entries on the deterministic entry_id (a re-parse of the same blob reproduces identical ids, so a
  // double-persist / overlapping-statement re-upload never double-counts), then sort; sort attestations by
  // their event id. All downstream selection walks these sorted arrays, so ties resolve identically.
  const entriesById = new Map<string, MatcherEntry>();
  for (const e of [...input.entries].sort((a, b) => (a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : 0))) {
    if (!entriesById.has(e.entryId)) entriesById.set(e.entryId, e);
  }
  const entries = [...entriesById.values()];
  const attestations = [...input.attestations].sort((a, b) =>
    a.attestationEventId < b.attestationEventId ? -1 : a.attestationEventId > b.attestationEventId ? 1 : 0,
  );

  const confirmations: MatchConfirmation[] = [];
  const mismatches: MatchMismatch[] = [];

  // Entries already spoken for — seeded from the caller (a prior tick's confirmation, or an earlier pool in
  // THIS run sharing the same cross-pool entries array) and grown as THIS call claims entries, so the FIRST
  // attestation (in canonical sort order) to resolve to a given entry wins deterministically; any later
  // attestation resolving to the same entry is `entry_already_claimed`, never a second confirmation.
  const claimed = new Set(input.claimedEntryIds ?? []);

  for (const att of attestations) {
    const base = {
      attestationEventId: att.attestationEventId,
      memberId: att.memberId,
      poolId: att.poolId,
      alertId: att.alertId,
      tr: att.tr,
      utr: att.utr,
    };

    // (a) PRIMARY — the first in-window CREDIT entry (by sorted entry_id) whose UTR equals the attestation's.
    //     A null-UTR entry can never match (the schema's "never confirms a UTR-less row"); a debit/charge/
    //     reversal row is never a match candidate either — only a credit is a real incoming deposit.
    const entry = entries.find(
      (e) =>
        e.transactionIdUtr !== null &&
        e.transactionIdUtr === att.utr &&
        e.entryType === 'credit' &&
        inWindow(e, input.window),
    );
    if (entry === undefined) {
      mismatches.push({ ...base, reason: 'no_statement_entry', entryId: null });
      continue;
    }

    // Exclusivity — one physical deposit backs exactly one confirmation, ever. A second attestation (a
    // duplicate/forwarded UTR across members, or a duplicate CSV row) resolving to an already-claimed entry
    // is found-and-rejected, not a second confirmation and not a silent drop.
    if (claimed.has(entry.entryId)) {
      mismatches.push({ ...base, reason: 'entry_already_claimed', entryId: entry.entryId });
      continue;
    }

    // (b) SECONDARY — destination FIRST (AC3.10 precedence): a wrong-pool deposit short-circuits, amount is
    //     never checked (AC6 — preserved as invalid, never remapped).
    const destination = classifyContributionDestination({
      assignedPoolId: att.poolId,
      depositedToPoolId: entry.poolId,
    });
    if (destination.verdict === 'wrong_pool') {
      mismatches.push({ ...base, reason: 'wrong_pool', entryId: entry.entryId });
      continue;
    }

    // Amount (units reconciled: whole-INR fixedAmount × 100 vs integer-paise entry.amount).
    const amount = classifyContributionAmount({
      expectedFixedAmount: expectedPaise,
      depositedAmount: entry.amount,
    });
    if (amount.verdict === 'amount_mismatch') {
      // Carry both sides in PAISE (Story 9.11, AC1) — the durable over/under fact. `entry.amount` is already
      // integer paise; `expectedPaise` is the same `fixedAmount × 100` the amount comparison used. The
      // over/under DIRECTION is a pure derivation of these two (classifyAmountMismatchDirection) — never
      // computed here (the matcher stays a detector, not a labeller).
      mismatches.push({
        ...base,
        reason: 'amount_mismatch',
        entryId: entry.entryId,
        depositedAmountPaise: entry.amount,
        expectedAmountPaise: expectedPaise,
      });
      continue;
    }

    // (c) FULL MATCH. The sender-VPA arm is defense-in-depth only (Decision D3 — never blocks). Claim the
    //     entry so no later attestation in this run can bind to it again.
    claimed.add(entry.entryId);
    confirmations.push({ ...base, entryId: entry.entryId, senderVpaCheck: SENDER_VPA_CHECK_UNAVAILABLE });
  }

  return { confirmations, mismatches };
}
