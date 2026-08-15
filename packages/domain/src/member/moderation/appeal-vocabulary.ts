// The moderation-appeal bounded vocabulary — Story 10.22. Niyamavali §8.8 (Decision `2026-08-15-121`).
//
// ⭐ A LEAF MODULE, ON PURPOSE. These three tuples are needed by BOTH
// `schema/member_moderation_appeals.ts` (which imports `drizzle-orm/pg-core`) and
// `member/moderation/events.ts` (which must stay pg-free — it is reachable from `packages/contracts`,
// and contracts must never pull a pg-touching `@twt/domain` namespace into the RN Metro bundle:
// [[project_contracts_domain_bundle_boundary]]).
//
// ⛔ Declaring them in the schema module and importing them here would be a type-only→value import
// that materializes a runtime module-init cycle — green under typecheck, lint AND the local suite,
// red in the CONSUMING package at runtime ([[project_type_only_import_cycle_trap]]). Hoisting to a
// leaf is the fix, applied at birth rather than after the incident.

/**
 * The two ruled intake surfaces (Decision `2026-08-15-121` clause 13). ONE record, TWO surfaces —
 * a second table for the off-portal arm would let the two drift.
 */
export const APPEAL_FILED_VIA = ['portal', 'helpline'] as const;
export type AppealFiledVia = (typeof APPEAL_FILED_VIA)[number];

/** §8.8 states a single internal review; there is deliberately no third status. */
export const APPEAL_STATUSES = ['open', 'decided'] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

/**
 * The two — and only two — outcomes (§8.8; Decision clause 9).
 * ⛔ There is deliberately NO `varied`: a lesser sanction is a FRESH moderation act, taken on its own
 * ground, with its own §8.6 record and its own right of appeal. An appeal outcome that varied the
 * sanction would be a moderation act with no moderation record.
 */
export const APPEAL_OUTCOMES = ['upheld', 'allowed'] as const;
export type AppealOutcome = (typeof APPEAL_OUTCOMES)[number];
