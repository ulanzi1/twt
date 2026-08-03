// Member-moderation wire enums — Story 10.10 (Task 7; AC3).
//
// The action, moderation-status and reason-code tuples. RE-DECLARED here (NOT imported from
// @twt/domain) for the RN Metro bundle boundary ([[project_contracts_domain_bundle_boundary]] — a
// domain import leaks `pg` into the mobile bundle). `packages/domain/src/member/moderation/` owns
// the source tuples, and a TEST-ONLY sync-guard (tests/member-moderation.test.ts) imports both and
// asserts they never drift.
//
// ⚠ These are GOVERNANCE VOCABULARY, not UI labels. Each reason code is anchored in a Niyamavali
// rule or a PRD FR (R7, R14, R10(A), FR-11, FR-6) and is identical across every Pariwar — which is
// exactly why the registry is code-level and frozen rather than a per-tenant DB table (Decision 3:
// a tenant must not be able to invent its own grounds for terminating a member).

import { z } from 'zod';

/** The three moderation actions a `member.moderate` holder may request. */
export const MODERATION_ACTIONS = ['suspend', 'terminate', 'restore'] as const;
export const ModerationAction = z.enum(MODERATION_ACTIONS);
export type ModerationAction = z.output<typeof ModerationAction>;

/**
 * The DERIVED moderation standing (AC1) — folded from the member's `member.moderation.*` events,
 * NEVER a stored column and NEVER a `member_lifecycle_state` label (Decision 1). Carried on the
 * response DTOs so a client renders the same standing the server derived.
 */
export const MODERATION_STATUSES = ['none', 'suspended', 'terminated'] as const;
export const ModerationStatus = z.enum(MODERATION_STATUSES);
export type ModerationStatus = z.output<typeof ModerationStatus>;

/** The seven moderation grounds (`suspend` + `terminate`). PRD-anchored spellings. */
export const MODERATION_REASON_CODES = [
  'r7-contribution-discipline',
  'r14-forgery',
  'r10a-parallel-org-office',
  'concealment-confirmed',
  'helpdesk-escalated-abuse',
  'regulator-action',
  'voluntary-pending-review',
] as const;
export const ModerationReasonCode = z.enum(MODERATION_REASON_CODES);
export type ModerationReasonCode = z.output<typeof ModerationReasonCode>;

/** The three restore grounds (`restore` only). A restore code can never justify a termination. */
export const RESTORE_REASON_CODES = ['rule-clearance', 'trustee-discretion', 'moderation-error'] as const;
export const RestoreReasonCode = z.enum(RESTORE_REASON_CODES);
export type RestoreReasonCode = z.output<typeof RestoreReasonCode>;

/**
 * Every declared reason code. The request DTO accepts this WIDE union and the SERVER applies the
 * registry's `appliesTo` narrowing with a typed 422 — deliberately, so a mismatched code produces a
 * single explanatory error the console can render, rather than a generic schema-validation 400 that
 * cannot say WHY the code was wrong for that action.
 */
export const ALL_REASON_CODES = [...MODERATION_REASON_CODES, ...RESTORE_REASON_CODES] as const;
export const ReasonCode = z.enum(ALL_REASON_CODES);
export type ReasonCode = z.output<typeof ReasonCode>;
