// The moderation reason-code REGISTRY — Story 10.10 (Task 1; AC3, Decision 3).
//
// ── Why CODE-level and frozen, not a per-Pariwar DB registry ─────────────────────────────────────
// `epics.md:3549` requires "registry-driven" reason codes. That is satisfied by ONE declared `as
// const` tuple per family plus a metadata map — the shipped `verifier_reason_code` /
// `state_trustee_reason_code` precedent. These codes are Niyamavali- and FR-anchored GOVERNANCE
// VOCABULARY (R7, R14, R10(A), FR-11, FR-6), identical across every Pariwar. A per-tenant versioned
// table (the Story 10.1 `helpdesk_routing_policy_versions` shape) would let a tenant INVENT ITS OWN
// GROUNDS for terminating a member — a governance-boundary violation of exactly the kind Story
// 10.8's capability bar exists to prevent.
//
// `appliesTo` is what makes this a REGISTRY rather than a bare enum: it is the metadata that rejects
// a restore code on a termination (a typed 422, AC3).
//
// ── PRD ↔ epic vocabulary reconciliation ────────────────────────────────────────────────────────
// `prd.md:852` (authoritative, 5 grounds) and `epics.md:3549` (4 illustrative labels + "etc.") do
// not use the same words. This registry is the UNION, with PRD-anchored spellings:
//   epic `fraud`       → `r14-forgery`
//   epic `concealment` → `concealment-confirmed`  (PRD "concealment-flag confirmed by State Trustee")
// plus the epic-only `regulator-action` + `voluntary-pending-review`.
//
// ⚠ KNOWN UNCLOSED PRD GAP (`review-rubric.md:44`): FR-56 never says WHO may restore for which
// sub-clause. Story 10.10 gates all three actions on the ONE `member.moderate` key and RECORDS the
// gap; it does not invent a per-sub-clause authority model.

import { ModerationReasonCodeInvalidError } from './errors.js';
import { MODERATION_ACTIONS, type ModerationAction } from './status.js';

/**
 * The SEVEN moderation grounds (`suspend` + `terminate`). Frozen, code-level, Pariwar-independent.
 * Ordered PRD-first (`prd.md:852`), then the two epic-only grounds.
 */
export const MODERATION_REASON_CODES = [
  'r7-contribution-discipline',
  'r14-forgery',
  'r10a-parallel-org-office',
  'concealment-confirmed',
  'helpdesk-escalated-abuse',
  'regulator-action',
  'voluntary-pending-review',
] as const;
export type ModerationReasonCode = (typeof MODERATION_REASON_CODES)[number];

/** The THREE restore grounds (`restore` only). A restore code can NEVER justify a termination. */
export const RESTORE_REASON_CODES = [
  'rule-clearance',
  'trustee-discretion',
  'moderation-error',
] as const;
export type RestoreReasonCode = (typeof RESTORE_REASON_CODES)[number];

/** Every reason code in the registry (the wire vocabulary the contracts DTO mirrors). */
export const ALL_REASON_CODES = [...MODERATION_REASON_CODES, ...RESTORE_REASON_CODES] as const;
export type ReasonCode = (typeof ALL_REASON_CODES)[number];

/** Registry metadata for one reason code. `label` is an i18n-resolvable English label, NOT copy. */
export interface ReasonCodeMeta {
  readonly code: ReasonCode;
  /** The actions this code may justify. The `appliesTo` check is the AC3 422. */
  readonly appliesTo: readonly ModerationAction[];
  /** The Niyamavali rule / PRD FR this ground is anchored in (provenance, not policy). */
  readonly niyamavaliRef: string;
  /** Short English label for the admin dropdown; the member surface renders the i18n label. */
  readonly label: string;
  /**
   * ⚖ RATIFIED GUIDANCE — what this ground ORDINARILY results in (Story 10.20, AC10; Q6, Decision
   * `2026-08-12-099`). ⛔ NOT a default, not a pre-selection, not a severity score.
   *
   * ── The tension this field resolves, and why it resolves it HERE ───────────────────────────────
   * `prd.md:871` lists as a testable consequence that *"grounds for termination are enumerated
   * separately from grounds for suspension; the two sets are not interchangeable"*, while
   * `epics.md:3866` forbids narrowing `appliesTo` (*"it stays `['suspend','terminate']`"*). Both
   * hold, at DIFFERENT LAYERS: the ENUMERATION is governance text (Niyamavali §8.5), the REGISTRY
   * stays permissive and carries this guidance, and the TRUSTEE PANEL — not the registry —
   * determines the sanction. The Panel restated the constraint that makes this guidance and not
   * policy: *"a reason code does not itself terminate a member; the Trustee Panel decides whether
   * the actual case warrants suspension or termination"* (§8.6 principle 2).
   * ⛔ A dev agent that "satisfies FR-56" by narrowing `MODERATION_APPLIES_TO` has violated the epic
   * AC and pre-empted the Panel.
   *
   * ── ⭐ Why REQUIRED and NULLABLE, when both lazier readings fail ───────────────────────────────
   * `ReasonCodeMeta` types EVERY code in the registry, and `ReasonCode` spans TEN — the seven
   * moderation grounds AND the three restore grounds. Q6 ratified guidance for the seven.
   *   · OPTIONAL (`?:`) ⇒ `satisfies Record<ReasonCode, ReasonCodeMeta>` no longer bites, and a
   *     moderation ground could ship with NO guidance, silently — the exact discipline this field
   *     invokes.
   *   · REQUIRED AND NON-NULLABLE ⇒ the three restore grounds need a value THE PANEL NEVER
   *     RATIFIED, and a dev agent invents one. *"What does `moderation-error` ordinarily result
   *     in?"* has no governance answer, and manufacturing one is the registry pre-empting the Panel
   *     in miniature — principle 2's defect, at one-tenth scale.
   * ⇒ `null` is the RATIFIED answer for a restore ground: *this code carries no sanction guidance
   * because it justifies no sanction.* The Q6 ruling states it, so the value has provenance rather
   * than being a placeholder.
   */
  readonly ordinarilyResultsIn: ModerationAction | null;
}

/**
 * The two families' action sets. Every moderation ground may justify BOTH a suspension and the
 * termination that follows it (Decision 2 routes termination THROUGH suspension, so the same ground
 * carries forward); every restore ground justifies only a restore. Per-code narrowing beyond this
 * would be inventing policy the PRD does not state — recorded rather than guessed.
 */
const MODERATION_APPLIES_TO: readonly ModerationAction[] = ['suspend', 'terminate'];
const RESTORE_APPLIES_TO: readonly ModerationAction[] = ['restore'];

/**
 * The registry: code → metadata. The single source both the API and the admin dropdown read.
 *
 * ⚖ **`ordinarilyResultsIn` IS Q6-RATIFIED GOVERNANCE DATA** (Decision `2026-08-12-099`), and ⛔ no
 * dev agent may substitute its own: `'suspend'` for ALL SEVEN moderation grounds, `null` for ALL
 * THREE restore grounds. The Panel escalates by RECORDING WHY (the two-part escalation test), not by
 * the registry pre-empting it — which is why every moderation ground says `'suspend'` even though
 * each may equally justify a termination.
 */
export const REASON_CODE_REGISTRY = {
  // ── Moderation grounds (suspend + terminate) ──────────────────────────────────────────────────
  'r7-contribution-discipline': {
    code: 'r7-contribution-discipline',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'R7',
    label: 'Contribution discipline (R7)',
    ordinarilyResultsIn: 'suspend',
  },
  'r14-forgery': {
    code: 'r14-forgery',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'R14',
    label: 'Forgery or falsified documents (R14)',
    ordinarilyResultsIn: 'suspend',
  },
  'r10a-parallel-org-office': {
    code: 'r10a-parallel-org-office',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'R10(A)',
    label: 'Office held in a parallel organisation (R10(A))',
    ordinarilyResultsIn: 'suspend',
  },
  'concealment-confirmed': {
    code: 'concealment-confirmed',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'FR-11',
    label: 'Concealment confirmed by State Trustee (FR-11)',
    ordinarilyResultsIn: 'suspend',
  },
  'helpdesk-escalated-abuse': {
    code: 'helpdesk-escalated-abuse',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'FR-56',
    label: 'Abuse escalated from the helpdesk',
    ordinarilyResultsIn: 'suspend',
  },
  'regulator-action': {
    code: 'regulator-action',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'FR-56',
    label: 'Regulatory or statutory action',
    ordinarilyResultsIn: 'suspend',
  },
  'voluntary-pending-review': {
    code: 'voluntary-pending-review',
    appliesTo: MODERATION_APPLIES_TO,
    niyamavaliRef: 'FR-56',
    label: 'Voluntary pause pending review',
    ordinarilyResultsIn: 'suspend',
  },
  // ── Restore grounds (restore only) ────────────────────────────────────────────────────────────
  'rule-clearance': {
    code: 'rule-clearance',
    appliesTo: RESTORE_APPLIES_TO,
    niyamavaliRef: 'R7(A)',
    label: 'Rule cleared — three consecutive contributions (R7(A))',
    ordinarilyResultsIn: null,
  },
  'trustee-discretion': {
    code: 'trustee-discretion',
    appliesTo: RESTORE_APPLIES_TO,
    niyamavaliRef: 'R5(D)/R10(D)',
    label: 'Trustee discretion (R5(D)/R10(D))',
    ordinarilyResultsIn: null,
  },
  'moderation-error': {
    code: 'moderation-error',
    appliesTo: RESTORE_APPLIES_TO,
    niyamavaliRef: 'FR-56',
    label: 'Moderation recorded in error',
    ordinarilyResultsIn: null,
  },
} as const satisfies Record<ReasonCode, ReasonCodeMeta>;

/** True iff `code` is a declared registry code (a narrowing type guard for untrusted input). */
export function isReasonCode(code: string): code is ReasonCode {
  return Object.prototype.hasOwnProperty.call(REASON_CODE_REGISTRY, code);
}

/** The registry metadata for a code, or `null` when the code is not declared. */
export function reasonCodeMeta(code: string): ReasonCodeMeta | null {
  return isReasonCode(code) ? REASON_CODE_REGISTRY[code] : null;
}

/** True iff `code` is declared AND its `appliesTo` includes `action` (the AC3 predicate). */
export function reasonCodeAppliesTo(code: string, action: ModerationAction): boolean {
  const meta = reasonCodeMeta(code);
  return meta !== null && meta.appliesTo.includes(action);
}

/** Every code valid for an action — what the admin dropdown filters on (AC9). */
export function reasonCodesForAction(action: ModerationAction): readonly ReasonCode[] {
  return ALL_REASON_CODES.filter((c) => REASON_CODE_REGISTRY[c].appliesTo.includes(action));
}

/**
 * The full registry as a list, in declared order — what the reason-codes read serves (review
 * follow-up). The admin console fetches THIS instead of hand-duplicating `appliesTo` + `label` by
 * value ([[project_story_validate_footguns]] drift risk: the codebase's own convention is ONE
 * source of truth per registry, not a client-side mirror the server re-checks after the fact).
 */
export function listReasonCodeMeta(): readonly ReasonCodeMeta[] {
  return ALL_REASON_CODES.map((c) => REASON_CODE_REGISTRY[c]);
}

/**
 * The AC3 registry guard: the code must be declared AND its `appliesTo` must include the action.
 *
 * ⚠ IT LIVES HERE, in the registry's own leaf module, rather than in `write.ts` where Story 10.10
 * first put it. Story 10.20's grounds writer needs the same guard, and importing it from `write.ts`
 * created a `write ↔ grounds` module cycle — the failure mode that stays green through typecheck,
 * lint and the local suite while breaking CONSUMING packages at module-init
 * ([[project_type_only_import_cycle_trap]]). The registry is where a registry guard belongs, and
 * from here it is a leaf both writers can reach.
 */
export function assertReasonCodeAppliesTo(code: string, action: ModerationAction): ReasonCode {
  if (!reasonCodeAppliesTo(code, action)) {
    throw new ModerationReasonCodeInvalidError(code, action);
  }
  return code as ReasonCode;
}

// EXHAUSTIVENESS: the `satisfies Record<ReasonCode, ReasonCodeMeta>` above makes a declared code
// without metadata a COMPILE error, and `ReasonCode` is derived from the two tuples — so the tuples
// and the registry can never drift. The complementary property "every ACTION has at least one code
// that can justify it" is not expressible in the type system (it is a value-level claim over
// `appliesTo`); it is pinned by a unit test instead — see moderation-reason-codes.test.ts.
export { MODERATION_ACTIONS };
