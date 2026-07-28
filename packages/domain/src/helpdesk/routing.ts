// Deterministic helpdesk routing resolver — Story 10.1 (Task 4; AC3).
//
// `resolveRoute(input, policyDocument)` is a PURE first-match over an EXPLICITLY-ORDERED rule
// list (the Story 4.6 rule-order determinism analog): same `(category, sub_category,
// member_scope_context)` + same policy version → the same `(target_role, target_scope,
// sla_first_response, sla_resolution)` on every machine, every replay. The `routing_policy_version`
// pins the WHOLE rule list + the first-match semantics — that IS the replay identity (the pool-
// assignment "version pins the whole algorithm, not just a hash" discipline).
//
// The determinism killers this avoids (the CI test asserts each): `Object.keys()`/`Map`/`Set`
// iteration order deciding precedence, `Date.now()`/randomness, async scheduling, parallel
// execution. Rules are a plain ARRAY (explicit order); nothing here reads a clock or does I/O.
//
// SLA DUE dates are computed separately (`computeTicketSlaDueDates`) because they depend on the
// ticket's created_at — the routing DECISION (role/scope + budgets) is time-independent; only the
// materialized due timestamps depend on the clock (via the calendar-aware business-day resolver).

import { businessDaysDeadline, type HolidayWindow } from '../cycle-calendar/holiday-resolver.js';
import type { ScopeDimension } from '../rbac/scope.js';
import type { HelpdeskCategory, MemberScopeContextSnapshot } from '../schema/helpdesk_tickets.js';
import type { RoutingPolicyDocumentJson, RoutingRuleJson } from '../schema/helpdesk_routing_policy_versions.js';
import { RoutingScopeUnresolvedError, RoutingUnresolvedError } from './errors.js';

/** The routing inputs — the tuple AC3 pins the decision to. */
export interface RoutingInput {
  category: HelpdeskCategory;
  subCategory: string | null;
  memberScopeContext: MemberScopeContextSnapshot;
}

/** A resolved RBAC grant scope `(dimension, value)` — the `rbac/scope.ts` `GrantScope` shape. */
export interface ResolvedGrantScope {
  dimension: ScopeDimension;
  value: string | null;
}

/** The routing decision (AC3) — role + scope + the SLA BUDGETS (read from the matched rule) +
 *  the version pin + the matched-rule index (for audit-replay traceability). */
export interface RoutingDecisionResult {
  targetRole: string;
  targetScope: ResolvedGrantScope;
  slaFirstResponseHours: number;
  slaResolutionBusinessDays: number;
  routingPolicyVersion: number;
  matchedRuleIndex: number;
}

/** Does a rule match the input? A `sub_category: null` rule matches ANY subcategory in its category. */
function ruleMatches(rule: RoutingRuleJson, category: HelpdeskCategory, subCategory: string | null): boolean {
  if (rule.category !== category) return false;
  return rule.sub_category === null || rule.sub_category === subCategory;
}

/**
 * Fill the target scope VALUE from the member-scope context by the rule's dimension (the RBAC
 * Dev-Note mechanism: the dimension picks which context field supplies the value). `global` →
 * null (universal). A geo dimension whose context value is absent throws
 * `RoutingScopeUnresolvedError` — the resolver refuses to emit a null-value geo scope.
 */
function resolveScopeValue(
  dimension: ScopeDimension,
  ctx: MemberScopeContextSnapshot,
  category: HelpdeskCategory,
): string | null {
  switch (dimension) {
    case 'global':
      return null;
    case 'pariwar':
      return ctx.pariwar_id;
    case 'self': {
      if (ctx.subject_member_id === null) throw new RoutingScopeUnresolvedError('self', category);
      return ctx.subject_member_id;
    }
    case 'state': {
      if (ctx.state === null) throw new RoutingScopeUnresolvedError('state', category);
      return ctx.state;
    }
    case 'district': {
      if (ctx.district === null) throw new RoutingScopeUnresolvedError('district', category);
      return ctx.district;
    }
    case 'block': {
      if (ctx.block === null) throw new RoutingScopeUnresolvedError('block', category);
      return ctx.block;
    }
    default: {
      // Exhaustive — a new ScopeDimension without an arm is a compile error via `never`.
      const unreachable: never = dimension;
      throw new Error(`[resolveRoute] unhandled scope dimension: ${String(unreachable)}`);
    }
  }
}

/**
 * Resolve the routing decision (AC3). PURE first-match: the first rule (in the policy's explicit
 * order) whose category matches and whose `sub_category` is null-or-equal wins. If no category
 * rule matches, falls through to the `other`/`sub_category:null` catch-all (deterministic). A
 * policy with neither throws `RoutingUnresolvedError` (malformed).
 */
export function resolveRoute(
  input: RoutingInput,
  policyDocument: RoutingPolicyDocumentJson,
): RoutingDecisionResult {
  const { category, subCategory, memberScopeContext } = input;

  // Phase 1 — exact category first-match (explicit array order is the ONLY precedence source).
  let matchedIndex = policyDocument.rules.findIndex((r) => ruleMatches(r, category, subCategory));
  // Phase 2 — fall through to the `other` catch-all (category 'other', sub_category null).
  if (matchedIndex === -1) {
    matchedIndex = policyDocument.rules.findIndex((r) => r.category === 'other' && r.sub_category === null);
  }
  if (matchedIndex === -1) {
    throw new RoutingUnresolvedError(category, subCategory);
  }

  const rule = policyDocument.rules[matchedIndex]!;
  const dimension = rule.target_scope_dimension as ScopeDimension;
  const value = resolveScopeValue(dimension, memberScopeContext, category);

  return {
    targetRole: rule.target_role,
    targetScope: { dimension, value },
    slaFirstResponseHours: rule.sla_first_response_hours,
    slaResolutionBusinessDays: rule.sla_resolution_business_days,
    routingPolicyVersion: policyDocument.version,
    matchedRuleIndex: matchedIndex,
  };
}

/** The two materialized SLA due instants (AC1). Computed from the ticket's created_at + the
 *  decision's budgets. First-response is a plain 24h clock offset; resolution is calendar-aware
 *  (N business days = N non-holiday days per the Pariwar's curated windows). */
export interface TicketSlaDueDates {
  slaFirstResponseDue: Date;
  slaResolutionDue: Date;
  /** Whether a holiday window extended the resolution SLA (for member-facing copy in 10.2/10.4). */
  resolutionExtendedByHoliday: boolean;
  resolutionHolidayLabel: string | null;
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Compute the ticket's SLA due instants. `windows` are the Pariwar's curated holiday windows
 * (empty → a plain N-calendar-day resolution deadline; an unresolvable calendar never extends).
 */
export function computeTicketSlaDueDates(
  createdAt: Date,
  decision: Pick<RoutingDecisionResult, 'slaFirstResponseHours' | 'slaResolutionBusinessDays'>,
  windows: readonly HolidayWindow[],
): TicketSlaDueDates {
  const slaFirstResponseDue = new Date(createdAt.getTime() + decision.slaFirstResponseHours * MS_PER_HOUR);
  const resolution = businessDaysDeadline(createdAt, decision.slaResolutionBusinessDays, windows);
  return {
    slaFirstResponseDue,
    slaResolutionDue: resolution.dueAt,
    resolutionExtendedByHoliday: resolution.extendedByHoliday,
    resolutionHolidayLabel: resolution.holidayLabel,
  };
}
