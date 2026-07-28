// Helpdesk routing transport types — Story 10.1 (Task 1; AC2/AC3).
//
// The deterministic routing surface: the member-scope inputs, the versioned policy
// document (an EXPLICITLY-ORDERED rule list), and the routing decision. All `.strict()`.
//
// ── Scope dimension is re-declared, not imported (bundle boundary) ────────────────────
// `packages/domain/src/rbac/scope.ts` owns `SCOPE_DIMENSIONS` (and the `scope_dimension`
// pgEnum derives from it). Contracts re-declares the SAME tuple; the tests/helpdesk.test.ts
// sync-guard asserts equality. `target_role` is a plain bounded string (the seeded roles are
// a `text` column, NOT a pgEnum, per ADR-0008 — so the wire mirrors that: any role name).
//
// ── How the target scope VALUE is filled (the resolver contract) ──────────────────────
// A rule declares only the target scope DIMENSION; the resolver fills the `value` from the
// member-scope context by that dimension (`district` → context.district, `pariwar` →
// context.pariwar_id, `self` → context.subject_member_id, `global` → null). This is the
// RBAC Dev-Note mechanism: "member_scope_context supplies the geo values that fill the
// target scope's value."

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
import { HelpdeskCategory, HelpdeskSubcategory } from './category.js';

/**
 * The canonical RBAC scope dimensions (mirror of `@twt/domain` `SCOPE_DIMENSIONS`, high→low
 * ceiling). Re-declared here for the wire; the sync-guard test binds it to the domain tuple.
 */
export const HELPDESK_SCOPE_DIMENSIONS = ['global', 'pariwar', 'state', 'district', 'block', 'self'] as const;
export const HelpdeskScopeDimension = z.enum(HELPDESK_SCOPE_DIMENSIONS);
export type HelpdeskScopeDimension = z.output<typeof HelpdeskScopeDimension>;

/**
 * A resolved RBAC grant scope `(dimension, value)` — the shape `rbac/scope.ts` `GrantScope`
 * carries. `value` is `null` for `global` (universal) and may be `null` on the wire when a
 * geo value was unresolved (the resolver itself refuses to emit a null-value geo scope — see
 * the domain resolver — so a persisted routed_to_scope always has a concrete value except for
 * `global`).
 */
export const HelpdeskGrantScope = z
  .object({
    dimension: HelpdeskScopeDimension,
    value: z.string().min(1).nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.dimension === 'global') !== (v.value === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'value must be null iff dimension is "global"',
        path: ['value'],
      });
    }
  });
export type HelpdeskGrantScope = z.output<typeof HelpdeskGrantScope>;

/**
 * The routing INPUTS snapshot (AC1's `member_scope_context`). Carries the subject's tenancy +
 * geo (for geo-dimension routing) + the subject id (for `self`-dimension routing). Geo fields
 * are nullable — a subject whose geo is not resolved routes only by non-geo dimensions (the v1
 * default policy is pariwar-dimension throughout, so it never needs a geo value).
 */
export const MemberScopeContext = z
  .object({
    pariwar_id: UuidString,
    state: z.string().min(1).nullable(),
    district: z.string().min(1).nullable(),
    block: z.string().min(1).nullable(),
    /** The subject member id (fills a `self`-dimension target scope), or null for an
     *  operator/actor-subject ticket with no member. */
    subject_member_id: UuidString.nullable(),
  })
  .strict();
export type MemberScopeContext = z.output<typeof MemberScopeContext>;

/**
 * One routing rule. `sub_category: null` matches ANY subcategory in the category (the
 * catch-all-within-category arm). The SLA budgets are DATA on the rule (the resolver never
 * hardcodes them): `sla_first_response_hours` is a plain clock offset; the resolution budget
 * is counted in business days (non-holiday days per the Pariwar calendar).
 */
// Guard-rail ceilings (NOT product policy — just a sanity bound against a typo'd absurd value,
// e.g. an extra zero). 720h = 30 days; 90 business days ≈ a full quarter.
const MAX_SLA_FIRST_RESPONSE_HOURS = 720;
const MAX_SLA_RESOLUTION_BUSINESS_DAYS = 90;

export const RoutingRule = z
  .object({
    category: HelpdeskCategory,
    sub_category: HelpdeskSubcategory.nullable(),
    target_role: z.string().min(1).max(64),
    target_scope_dimension: HelpdeskScopeDimension,
    sla_first_response_hours: z.number().int().positive().max(MAX_SLA_FIRST_RESPONSE_HOURS),
    sla_resolution_business_days: z.number().int().positive().max(MAX_SLA_RESOLUTION_BUSINESS_DAYS),
  })
  .strict();
export type RoutingRule = z.output<typeof RoutingRule>;

/**
 * A versioned routing-policy document — an EXPLICITLY-ORDERED rule list (first-match wins).
 * The `version` is the replay-identity pin (AC3): a ticket stores the version in force at its
 * creation and is never re-routed. The list MUST end with an `other`/`sub_category:null`
 * catch-all so every category resolves (the domain resolver asserts this; mirrored here at the
 * wire layer so a future admin-authoring UI gets the same validation before submit).
 */
export const RoutingPolicyDocument = z
  .object({
    version: z.number().int().positive(),
    rules: z.array(RoutingRule).min(1),
  })
  .strict()
  .superRefine((v, ctx) => {
    const hasCatchAll = v.rules.some((r) => r.category === 'other' && r.sub_category === null);
    if (!hasCatchAll) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rules must include an 'other' / sub_category:null catch-all rule",
        path: ['rules'],
      });
    }
  });
export type RoutingPolicyDocument = z.output<typeof RoutingPolicyDocument>;

/**
 * The routing decision (AC3). `matched_rule_index` + `routing_policy_version` make the decision
 * audit-replayable: the same `(category, sub_category, member_scope_context)` against the same
 * policy version reproduces the identical decision on every machine, every replay.
 */
export const RoutingDecision = z
  .object({
    target_role: z.string().min(1).max(64),
    target_scope: HelpdeskGrantScope,
    sla_first_response_hours: z.number().int().positive().max(MAX_SLA_FIRST_RESPONSE_HOURS),
    sla_resolution_business_days: z.number().int().positive().max(MAX_SLA_RESOLUTION_BUSINESS_DAYS),
    routing_policy_version: z.number().int().positive(),
    matched_rule_index: z.number().int().nonnegative(),
  })
  .strict();
export type RoutingDecision = z.output<typeof RoutingDecision>;
