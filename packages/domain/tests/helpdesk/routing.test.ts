// Deterministic routing resolver — DB-free unit tests (Story 10.1, Task 7; AC3).
//
// THE load-bearing commitment: same (category, sub_category, member_scope_context) + same policy
// version → the same decision on every machine, every replay. Covers: the default-policy golden
// vectors; N-replay identity; shuffled input-key order → same route; the EXPLICIT rule-ORDER
// first-match (revert-sanity: reordering rules changes the outcome, so an order-independent resolver
// would fail); geo-dimension scope-value fill + the missing-geo throw; malformed-policy throw.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROUTING_POLICY,
  RoutingScopeUnresolvedError,
  RoutingUnresolvedError,
  defaultRoutingPolicy,
  resolveRoute,
  type RoutingInput,
} from '../../src/helpdesk/index.js';
import type { ScopeDimension } from '../../src/rbac/scope.js';
import type { MemberScopeContextSnapshot } from '../../src/schema/helpdesk_tickets.js';
import type { RoutingPolicyDocumentJson } from '../../src/schema/helpdesk_routing_policy_versions.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '22222222-2222-2222-2222-222222222222';

const ctx = (over: Partial<MemberScopeContextSnapshot> = {}): MemberScopeContextSnapshot => ({
  pariwar_id: PARIWAR,
  state: null,
  district: null,
  block: null,
  subject_member_id: MEMBER,
  ...over,
});

const input = (category: RoutingInput['category'], subCategory: string | null = null): RoutingInput => ({
  category,
  subCategory,
  memberScopeContext: ctx(),
});

describe('resolveRoute — default policy golden vectors', () => {
  it('routes each category to its seeded role + pariwar scope + SLA budgets', () => {
    const expectations: Array<[RoutingInput['category'], string, number]> = [
      ['kyc-trouble', 'helpline_operator', 5],
      ['payment-failed', 'helpline_operator', 5],
      ['utr-mismatch', 'finance_officer', 5],
      ['claim-status', 'helpline_operator', 5],
      ['profile-update', 'helpline_operator', 5],
      ['niyamavali-question', 'pariwar_admin', 10],
      ['partner-module-issue', 'it_cell', 5],
      ['complaint', 'pariwar_admin', 5],
      ['other', 'helpline_operator', 5],
    ];
    for (const [category, role, resolutionDays] of expectations) {
      const d = resolveRoute(input(category), DEFAULT_ROUTING_POLICY);
      expect(d.targetRole).toBe(role);
      expect(d.targetScope).toEqual({ dimension: 'pariwar', value: PARIWAR });
      expect(d.slaFirstResponseHours).toBe(24);
      expect(d.slaResolutionBusinessDays).toBe(resolutionDays);
      expect(d.routingPolicyVersion).toBe(1);
    }
  });
});

describe('resolveRoute — determinism (AC3)', () => {
  it('N replay runs of the same input produce byte-identical decisions', () => {
    const first = resolveRoute(input('utr-mismatch'), DEFAULT_ROUTING_POLICY);
    for (let i = 0; i < 50; i += 1) {
      expect(resolveRoute(input('utr-mismatch'), DEFAULT_ROUTING_POLICY)).toEqual(first);
    }
  });

  it('member_scope_context key INSERTION order does not affect the route (no object-key iteration dependence)', () => {
    const a: MemberScopeContextSnapshot = { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER };
    // Same values, DIFFERENT key insertion order.
    const b = {} as MemberScopeContextSnapshot;
    b.subject_member_id = MEMBER;
    b.block = null;
    b.district = null;
    b.state = null;
    b.pariwar_id = PARIWAR;
    const da = resolveRoute({ category: 'complaint', subCategory: null, memberScopeContext: a }, DEFAULT_ROUTING_POLICY);
    const db = resolveRoute({ category: 'complaint', subCategory: null, memberScopeContext: b }, DEFAULT_ROUTING_POLICY);
    expect(da).toEqual(db);
  });

  it('a policy round-tripped through JSON (which may reorder rule keys) resolves identically', () => {
    const roundTripped = JSON.parse(JSON.stringify(DEFAULT_ROUTING_POLICY)) as RoutingPolicyDocumentJson;
    for (const category of DEFAULT_ROUTING_POLICY.rules.map((r) => r.category)) {
      expect(resolveRoute(input(category), roundTripped)).toEqual(resolveRoute(input(category), DEFAULT_ROUTING_POLICY));
    }
  });

  it('member_scope_context key INSERTION order does not affect the route on a GEO-dimension rule (the code path where a key-order-dependent lookup bug would actually show up — pariwar-dimension categories never reach it)', () => {
    const geoPolicy: RoutingPolicyDocumentJson = {
      version: 2,
      rules: [
        { category: 'kyc-trouble', sub_category: null, target_role: 'district_admin', target_scope_dimension: 'district', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
      ],
    };
    const a: MemberScopeContextSnapshot = { pariwar_id: PARIWAR, state: null, district: 'Patna', block: null, subject_member_id: MEMBER };
    const b = {} as MemberScopeContextSnapshot;
    b.subject_member_id = MEMBER;
    b.block = null;
    b.district = 'Patna';
    b.state = null;
    b.pariwar_id = PARIWAR;
    const da = resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: a }, geoPolicy);
    const db = resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: b }, geoPolicy);
    expect(da).toEqual(db);
    expect(da.targetScope).toEqual({ dimension: 'district', value: 'Patna' });
  });
});

describe('resolveRoute — EXPLICIT rule ORDER first-match (revert-sanity)', () => {
  // Two rules that BOTH match category 'complaint': a specific sub_category rule, then a null catch-all.
  const specific = {
    category: 'complaint' as const,
    sub_category: 'urgent',
    target_role: 'pariwar_admin',
    target_scope_dimension: 'pariwar',
    sla_first_response_hours: 24,
    sla_resolution_business_days: 3,
  };
  const catchAll = {
    category: 'complaint' as const,
    sub_category: null,
    target_role: 'helpline_operator',
    target_scope_dimension: 'pariwar',
    sla_first_response_hours: 24,
    sla_resolution_business_days: 5,
  };

  it('first-match returns the EARLIER rule when both match (order is the precedence)', () => {
    const policyA: RoutingPolicyDocumentJson = { version: 2, rules: [specific, catchAll] };
    const d = resolveRoute({ category: 'complaint', subCategory: 'urgent', memberScopeContext: ctx() }, policyA);
    expect(d.targetRole).toBe('pariwar_admin');
    expect(d.matchedRuleIndex).toBe(0);
  });

  it('REVERSING the rule order changes the outcome — proving order (not sorting) decides precedence', () => {
    const policyB: RoutingPolicyDocumentJson = { version: 2, rules: [catchAll, specific] };
    const d = resolveRoute({ category: 'complaint', subCategory: 'urgent', memberScopeContext: ctx() }, policyB);
    // The catch-all now wins because it comes first — an order-INDEPENDENT resolver would fail this.
    expect(d.targetRole).toBe('helpline_operator');
    expect(d.matchedRuleIndex).toBe(0);
  });

  it('falls through to the `other` catch-all when no category rule matches', () => {
    const policy: RoutingPolicyDocumentJson = {
      version: 2,
      rules: [
        { category: 'kyc-trouble', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
        { category: 'other', sub_category: null, target_role: 'pariwar_admin', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
      ],
    };
    // 'complaint' has no rule → falls through to the 'other' catch-all.
    const d = resolveRoute({ category: 'complaint', subCategory: null, memberScopeContext: ctx() }, policy);
    expect(d.targetRole).toBe('pariwar_admin');
  });

  it('a rule with a DIFFERENT non-null sub_category is correctly SKIPPED (not treated as a wildcard match)', () => {
    // `specific` only matches sub_category 'urgent'; requesting a different sub_category must skip it
    // and fall through to the catch-all, proving `ruleMatches` checks equality, not mere category match.
    const policyA: RoutingPolicyDocumentJson = { version: 2, rules: [specific, catchAll] };
    const d = resolveRoute({ category: 'complaint', subCategory: 'not-urgent', memberScopeContext: ctx() }, policyA);
    expect(d.targetRole).toBe('helpline_operator');
    expect(d.matchedRuleIndex).toBe(1);
  });
});

describe('resolveRoute — scope-value fill from the member-scope context', () => {
  const geoRule = (dimension: ScopeDimension | string) => ({
    version: 2,
    rules: [
      { category: 'kyc-trouble' as const, sub_category: null, target_role: 'district_admin', target_scope_dimension: dimension, sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    ],
  });

  it('a district-dimension rule fills the value from context.district (the RBAC Dev-Note example)', () => {
    const d = resolveRoute(
      { category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ district: 'Patna' }) },
      geoRule('district'),
    );
    expect(d.targetScope).toEqual({ dimension: 'district', value: 'Patna' });
  });

  it('a state-dimension rule fills the value from context.state', () => {
    const d = resolveRoute(
      { category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ state: 'Bihar' }) },
      geoRule('state'),
    );
    expect(d.targetScope).toEqual({ dimension: 'state', value: 'Bihar' });
  });

  it('a state-dimension rule with an ABSENT context value throws RoutingScopeUnresolvedError', () => {
    expect(() =>
      resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ state: null }) }, geoRule('state')),
    ).toThrow(RoutingScopeUnresolvedError);
  });

  it('a block-dimension rule fills the value from context.block', () => {
    const d = resolveRoute(
      { category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ block: 'Danapur' }) },
      geoRule('block'),
    );
    expect(d.targetScope).toEqual({ dimension: 'block', value: 'Danapur' });
  });

  it('a block-dimension rule with an ABSENT context value throws RoutingScopeUnresolvedError', () => {
    expect(() =>
      resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ block: null }) }, geoRule('block')),
    ).toThrow(RoutingScopeUnresolvedError);
  });

  it('a global-dimension rule yields a null-value scope (universal)', () => {
    const d = resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx() }, geoRule('global'));
    expect(d.targetScope).toEqual({ dimension: 'global', value: null });
  });

  it('a geo-dimension rule with an ABSENT context value throws RoutingScopeUnresolvedError', () => {
    expect(() =>
      resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ district: null }) }, geoRule('district')),
    ).toThrow(RoutingScopeUnresolvedError);
  });

  it('a self-dimension rule fills the value from subject_member_id (throws when absent)', () => {
    const selfRule = geoRule('self');
    expect(resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx() }, selfRule).targetScope).toEqual({
      dimension: 'self',
      value: MEMBER,
    });
    expect(() =>
      resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx({ subject_member_id: null }) }, selfRule),
    ).toThrow(RoutingScopeUnresolvedError);
  });

  it('a rule with a target_scope_dimension OUTSIDE the ScopeDimension union (a malformed/pre-validation-vintage persisted document) throws — the resolver never silently emits an unrecognized dimension', () => {
    expect(() =>
      resolveRoute({ category: 'kyc-trouble', subCategory: null, memberScopeContext: ctx() }, geoRule('bogus-dimension')),
    ).toThrow();
  });
});

describe('resolveRoute — malformed policy', () => {
  it('throws RoutingUnresolvedError when no rule matches and there is no `other` catch-all', () => {
    const policy: RoutingPolicyDocumentJson = {
      version: 2,
      rules: [
        { category: 'kyc-trouble', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
      ],
    };
    expect(() => resolveRoute({ category: 'complaint', subCategory: null, memberScopeContext: ctx() }, policy)).toThrow(
      RoutingUnresolvedError,
    );
  });
});

describe('defaultRoutingPolicy — returns an isolated copy', () => {
  it('mutating the returned copy does not corrupt the shared default constant', () => {
    const copy = defaultRoutingPolicy();
    copy.rules[0]!.target_role = 'MUTATED';
    expect(DEFAULT_ROUTING_POLICY.rules[0]!.target_role).not.toBe('MUTATED');
  });
});
