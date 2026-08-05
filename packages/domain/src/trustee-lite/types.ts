// Trustee-Lite signal shapes — Story 10.11 (Task 1; AC1/AC2/AC3).
//
// ONE normalized row shape for six heterogeneous trustee-attention sources, plus the seventh
// (violator-flag) arm. This namespace owns NO state: there is no `trustee_signals` table, no
// migration, no projector and no event type. Every row is a read-time LENS over a row another
// story already ships — see the module header in `signals.ts` for the full boundary.
//
// ── FR-42 does NOT bind this surface (D10) ──────────────────────────────────────────────────
// `epics.md:92` attaches "one indexed query; no N+1" to the FR-42 per-member SIGNALS PANEL (the
// compound read model shipped at Story 4.7). FR-57's Trustee-Lite LIST is a different surface:
// six bounded, already-`clampLimit`ed reads over six unrelated subsystems is O(1) queries, not an
// N+1. A reviewer applying FR-42's phrasing literally would demand a single impossible join.
// Stated once, here, so it is not re-litigated per review.

/**
 * The seven trustee-attention categories (AC1). Six are aggregation sources named by
 * `epics.md:3578`; `violator_flag` is the seventh arm this story owns (AC4, D1-B).
 *
 * Order is DECLARED and stable — it is the tie-break's first key (AC2) and the contracts enum
 * mirrors it (the `@twt/contracts` sync-guard asserts the two never drift).
 */
export const TRUSTEE_SIGNAL_CATEGORIES = [
  /** Story 6.13 — claims awaiting the State-Trustee freeze/vote/commit. No deadline. */
  'cycle_freeze',
  /** Story 6.14 — claims routed to an R9 special-case panel. No deadline. */
  'r9_voting',
  /** Story 6.15 — the concealment-flagged SUBSET of the cycle-freeze set (a filter, not a query — D6). */
  'concealment',
  /** Story 6.16 — open appeal journeys. Deadline DERIVED from stage-entry + the per-stage SLA. */
  'appeal',
  /** Story 9.8 — open reconciliation cases. Carries a real (nullable) `deadlineAt`. */
  'reconciliation',
  /** Story 10.10 Decision 9 — currently-moderated members. No deadline, and NEVER a severity (AC3). */
  'moderation',
  /** Story 10.11 (this story) — R7 contribution-discipline violator flags. Detection-only (AC4). */
  'violator_flag',
] as const;

export type TrusteeSignalCategory = (typeof TRUSTEE_SIGNAL_CATEGORIES)[number];

/**
 * The derived severity band (AC3) — the Story 10.4 `helpdesk/sla.ts` vocabulary, REUSED rather
 * than a second severity language invented alongside it. `breached ≻ due_soon ≻ on_track`.
 *
 * Derived ONLY for the two categories that carry or can derive a deadline (`reconciliation`,
 * `appeal`). It is `null` for `cycle_freeze` / `r9_voting` / `concealment` (nothing to run a timer
 * against) and STRUCTURALLY `null` for `moderation` / `violator_flag` — `epics.md:3587`:
 * *"a severity score on a moderation row would itself be a recommendation."*
 */
export type TrusteeSignalSeverity = 'breached' | 'due_soon' | 'on_track';

/** Severity precedence, most-severe first (mirrors `HELPDESK_SEVERITY_ORDER`). */
export const TRUSTEE_SIGNAL_SEVERITY_ORDER: readonly TrusteeSignalSeverity[] = [
  'breached',
  'due_soon',
  'on_track',
];

/**
 * The categories on which `severity` is STRUCTURALLY `null` — never derived, never overridable,
 * whatever a future source may start carrying (AC3). Pinned by a revert-sanity test: deleting an
 * entry here flips a test red.
 */
export const SEVERITY_FORBIDDEN_CATEGORIES: ReadonlySet<TrusteeSignalCategory> = new Set([
  'moderation',
  'violator_flag',
]);

/**
 * Where a row's cross-link points (AC7). The href derivation itself is presentation and lives in
 * `apps/admin/src/modules/trustee-lite/crossLinks.ts` — this is only the KIND the shell switches on,
 * kept in the domain so the API can carry it on the wire without the admin app owning the taxonomy.
 */
export const TRUSTEE_CROSS_LINK_KINDS = [
  'cycle_freeze',
  'r9_voting',
  'claim_verify',
  'reconciliation_review',
  'member_record',
] as const;

export type TrusteeCrossLinkKind = (typeof TRUSTEE_CROSS_LINK_KINDS)[number];

/**
 * ONE normalized trustee-attention row (AC1). Every source maps into exactly this shape.
 *
 * ── Why three fields are nullable, and why that is the point ─────────────────────────────────
 * `deadlineAt` — only reconciliation carries one and only appeals can derive one; the other four
 * sources define none (D2). A synthesized deadline would be fabricated governance data on the
 * surface that feeds a suspension decision, which is the precise failure the two-tier order exists
 * to avoid. `null` here renders as an EXPLICIT "no deadline" affordance, never a blank cell.
 *
 * `raisedAt` / `ageMs` — reconciliation, appeal and moderation rows carry a real instant;
 * `CycleFreezePendingCase` and `R9QueueItem` carry NO temporal field at all, and AC1 forbids
 * modifying those shipped reads to add one. So an undated-source row is honestly `null` rather
 * than aged from `now` (which would render every such row as "0 minutes old" — a lie that also
 * silently randomizes the age-descending sort).
 *
 * `severity` — see {@link TrusteeSignalSeverity}.
 */
export interface TrusteeSignalRow {
  readonly category: TrusteeSignalCategory;
  /**
   * A stable, category-local identifier for the SOURCE row (e.g. the reconciliation `caseKey`).
   * Distinct from `resourceId`: two categories may point at the same resource (a claim appears in
   * BOTH `cycle_freeze` and `concealment` — they are lenses, not a partition; D6 — do not dedupe).
   */
  readonly sourceKey: string;
  /** The resource the cross-link addresses: a claim_case_id, a member_id or a pool_id. */
  readonly resourceId: string;
  /** A short NON-PII summary (codes, states, counts) — never a name, never a mobile (AC8). */
  readonly label: string;
  /** `now - raisedAt` in ms; `null` exactly when `raisedAt` is null. Never negative (clamped at 0). */
  readonly ageMs: number | null;
  /** When the item entered the trustee's worklist; `null` when the source carries no instant. */
  readonly raisedAt: Date | null;
  /** The item's deadline; `null` for the four undated sources (D2) and for an underivable one. */
  readonly deadlineAt: Date | null;
  /** Derived only for dated categories; structurally null for moderation + violator_flag (AC3). */
  readonly severity: TrusteeSignalSeverity | null;
  /** Which canonical surface this row links to (AC7). */
  readonly crossLinkKind: TrusteeCrossLinkKind;
  /**
   * The claim this row concerns, when it concerns one — carried so the cross-link can address the
   * per-claim verifier surface without the admin app re-parsing `resourceId`. Null for member- and
   * pool-scoped rows.
   */
  readonly claimCaseId: string | null;
}
