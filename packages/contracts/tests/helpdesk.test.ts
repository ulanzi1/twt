// Helpdesk contracts — Story 10.1 (Task 1; review-hardening, chunk 3).
//
// THREE jobs: (1) the test-only sync-guard that binds the contract tuples to the @twt/domain pgEnum-
// source tuples (contracts cannot import domain in SHIPPED files — the RN bundle boundary — so this
// test, which never ships, is the mechanical drift guard, per [[project_contracts_domain_bundle_boundary]]);
// (2) the `.strict()` + superRefine behavior of every helpdesk contract schema (previously only
// CreateTicketRequest and the four sync-guard tuples were exercised — this is how a live wire-shape
// drift, `sub_category` vs `subcategory`, went uncaught); (3) boundary-value coverage.

import { schema, rbac } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CreateTicketRequest,
  HELPDESK_CATEGORIES,
  HELPDESK_CREATED_VIA,
  HELPDESK_SCOPE_DIMENSIONS,
  HELPDESK_TICKET_STATES,
  HelpdeskAttachment,
  HelpdeskGrantScope,
  HelpdeskTicketDto,
  MemberScopeContext,
  RoutingDecision,
  RoutingPolicyDocument,
  RoutingRule,
} from '../src/helpdesk/index.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '22222222-2222-2222-2222-222222222222';
const ACTOR = '33333333-3333-3333-3333-333333333333';

describe('helpdesk contracts ↔ @twt/domain tuple sync-guard', () => {
  it('HELPDESK_CATEGORIES matches the domain pgEnum-source tuple exactly (order included)', () => {
    expect([...HELPDESK_CATEGORIES]).toEqual([...schema.HELPDESK_CATEGORIES]);
  });

  it('HELPDESK_TICKET_STATES matches the domain pgEnum-source tuple exactly (the ratified union)', () => {
    expect([...HELPDESK_TICKET_STATES]).toEqual([...schema.HELPDESK_TICKET_STATES]);
  });

  it('HELPDESK_CREATED_VIA matches the domain tuple', () => {
    expect([...HELPDESK_CREATED_VIA]).toEqual([...schema.HELPDESK_CREATED_VIA_VALUES]);
  });

  it('HELPDESK_SCOPE_DIMENSIONS matches the domain rbac SCOPE_DIMENSIONS', () => {
    expect([...HELPDESK_SCOPE_DIMENSIONS]).toEqual([...rbac.SCOPE_DIMENSIONS]);
  });
});

describe('CreateTicketRequest — .strict() + superRefine', () => {
  const base = {
    subject_member_id: MEMBER,
    category: 'kyc-trouble' as const,
    body: 'help',
    created_via: 'member_app' as const,
  };

  it('accepts a well-formed member-app request', () => {
    expect(CreateTicketRequest.safeParse(base).success).toBe(true);
  });

  it('accepts a well-formed helpline_call request (subject_actor_id)', () => {
    const r = CreateTicketRequest.safeParse({
      subject_actor_id: ACTOR,
      category: 'complaint',
      body: 'x',
      created_via: 'helpline_call',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown key (.strict())', () => {
    expect(CreateTicketRequest.safeParse({ ...base, surprise: true }).success).toBe(false);
  });

  it('rejects `operator_attribution` on the request — it is server-resolved, never client-supplied', () => {
    expect(CreateTicketRequest.safeParse({ ...base, operator_attribution: 'nope' }).success).toBe(false);
  });

  it('rejects when BOTH subject refs are present', () => {
    const r = CreateTicketRequest.safeParse({ ...base, subject_actor_id: ACTOR });
    expect(r.success).toBe(false);
  });

  it('rejects when NEITHER subject ref is present', () => {
    const noSubject = { category: base.category, body: base.body, created_via: base.created_via };
    const r = CreateTicketRequest.safeParse(noSubject);
    expect(r.success).toBe(false);
    // Both paths are reported (not just subject_member_id) — a client field-mapping either ref's
    // error correctly finds a matching issue.
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('subject_member_id');
    expect(paths).toContain('subject_actor_id');
  });

  it('rejects created_via: member_app paired with subject_actor_id — a member can only ever file for themselves', () => {
    const r = CreateTicketRequest.safeParse({
      subject_actor_id: ACTOR,
      category: 'complaint',
      body: 'x',
      created_via: 'member_app',
    });
    expect(r.success).toBe(false);
  });

  it('accepts created_via: helpline_call paired with subject_member_id — an operator may file on a member\'s behalf', () => {
    const r = CreateTicketRequest.safeParse({
      subject_member_id: MEMBER,
      category: 'complaint',
      body: 'x',
      created_via: 'helpline_call',
    });
    expect(r.success).toBe(true);
  });

  it('boundary: body at exactly 5000 chars accepted, 5001 rejected', () => {
    expect(CreateTicketRequest.safeParse({ ...base, body: 'x'.repeat(5000) }).success).toBe(true);
    expect(CreateTicketRequest.safeParse({ ...base, body: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('boundary: exactly 10 attachments accepted, 11 rejected', () => {
    const attachment = { object_key: 'k', content_type: 'image/png', filename: 'f.png' };
    expect(CreateTicketRequest.safeParse({ ...base, attachments: Array(10).fill(attachment) }).success).toBe(true);
    expect(CreateTicketRequest.safeParse({ ...base, attachments: Array(11).fill(attachment) }).success).toBe(false);
  });

  it('rejects an empty-string sub_category', () => {
    expect(CreateTicketRequest.safeParse({ ...base, sub_category: '' }).success).toBe(false);
  });

  it('rejects a malformed UUID on an optional ref field', () => {
    expect(CreateTicketRequest.safeParse({ ...base, claim_case_id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('HelpdeskGrantScope — global⇔null invariant', () => {
  it('accepts { dimension: "global", value: null }', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'global', value: null }).success).toBe(true);
  });

  it('accepts a non-global dimension with a non-null value', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'district', value: 'Patna' }).success).toBe(true);
  });

  it('rejects { dimension: "global", value: <non-null> }', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'global', value: 'garbage' }).success).toBe(false);
  });

  it('rejects a non-global dimension with a null value', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'self', value: null }).success).toBe(false);
  });
});

describe('RoutingRule / RoutingPolicyDocument', () => {
  const catchAll = {
    category: 'other' as const,
    sub_category: null,
    target_role: 'helpline_operator',
    target_scope_dimension: 'pariwar' as const,
    sla_first_response_hours: 24,
    sla_resolution_business_days: 5,
  };

  it('accepts a well-formed rule', () => {
    expect(RoutingRule.safeParse(catchAll).success).toBe(true);
  });

  it('rejects sla_first_response_hours above the 720h guard-rail ceiling', () => {
    expect(RoutingRule.safeParse({ ...catchAll, sla_first_response_hours: 721 }).success).toBe(false);
  });

  it('rejects sla_resolution_business_days above the 90-day guard-rail ceiling', () => {
    expect(RoutingRule.safeParse({ ...catchAll, sla_resolution_business_days: 91 }).success).toBe(false);
  });

  it('a document with an other/null catch-all rule parses cleanly', () => {
    expect(RoutingPolicyDocument.safeParse({ version: 1, rules: [catchAll] }).success).toBe(true);
  });

  it('a document with NO other/null catch-all rule is rejected', () => {
    const noCatchAll = { ...catchAll, category: 'kyc-trouble' as const };
    expect(RoutingPolicyDocument.safeParse({ version: 1, rules: [noCatchAll] }).success).toBe(false);
  });
});

describe('RoutingDecision / MemberScopeContext / HelpdeskAttachment — basic parse', () => {
  it('RoutingDecision parses a well-formed decision', () => {
    const decision = {
      target_role: 'helpline_operator',
      target_scope: { dimension: 'pariwar', value: PARIWAR },
      sla_first_response_hours: 24,
      sla_resolution_business_days: 5,
      routing_policy_version: 1,
      matched_rule_index: 0,
    };
    expect(RoutingDecision.safeParse(decision).success).toBe(true);
  });

  it('MemberScopeContext parses with all geo fields null', () => {
    const ctx = { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER };
    expect(MemberScopeContext.safeParse(ctx).success).toBe(true);
  });

  it('HelpdeskAttachment parses a well-formed reference', () => {
    const attachment = { object_key: 'k', content_type: 'image/png', filename: 'f.png' };
    expect(HelpdeskAttachment.safeParse(attachment).success).toBe(true);
  });
});

describe('HelpdeskTicketDto — .strict() + superRefine', () => {
  function baseDto(overrides: Record<string, unknown> = {}) {
    return {
      ticket_id: '44444444-4444-4444-4444-444444444444',
      pariwar_id: PARIWAR,
      subject_member_id: MEMBER,
      subject_actor_id: null,
      category: 'kyc-trouble',
      sub_category: null,
      body: 'help',
      attachments: [],
      current_state: 'open',
      routed_to_scope: { dimension: 'pariwar', value: PARIWAR },
      routed_to_role: 'helpline_operator',
      routed_to_actor_id: null,
      routing_policy_version: 1,
      member_scope_context: { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER },
      assigned_at: '2026-08-03T06:00:00.000Z',
      sla_first_response_due: '2026-08-04T06:00:00.000Z',
      sla_resolution_due: '2026-08-08T18:30:00.000Z',
      audit_id: '55555555-5555-5555-5555-555555555555',
      created_via: 'member_app',
      operator_attribution: null,
      claim_case_id: null,
      pool_id: null,
      module_id: null,
      validity_lookup_id: null,
      created_at: '2026-08-03T06:00:00.000Z',
      updated_at: '2026-08-03T06:00:00.000Z',
      ...overrides,
    };
  }

  it('accepts a well-formed member_app ticket', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto()).success).toBe(true);
  });

  it('uses `sub_category`, NOT `subcategory` — the field this drift was found on', () => {
    const r = HelpdeskTicketDto.safeParse(baseDto({ subcategory: 'urgent' }));
    expect(r.success).toBe(false); // unknown key under .strict()
  });

  it('accepts a well-formed helpline_call ticket (subject_actor_id + operator_attribution)', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({
        subject_member_id: null,
        subject_actor_id: ACTOR,
        created_via: 'helpline_call',
        operator_attribution: 'Operator Priya',
      }),
    );
    expect(r.success).toBe(true);
  });

  it('rejects BOTH subject refs set', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto({ subject_actor_id: ACTOR })).success).toBe(false);
  });

  it('rejects NEITHER subject ref set', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto({ subject_member_id: null })).success).toBe(false);
  });

  it('rejects created_via: helpline_call with a null operator_attribution', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({ subject_member_id: null, subject_actor_id: ACTOR, created_via: 'helpline_call' }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects created_via: member_app with a non-null operator_attribution', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto({ operator_attribution: 'should not be here' })).success).toBe(false);
  });

  it('rejects sla_resolution_due earlier than sla_first_response_due', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({ sla_resolution_due: '2026-08-03T12:00:00.000Z' }), // before sla_first_response_due
    );
    expect(r.success).toBe(false);
  });

  it('accepts equal sla_first_response_due / sla_resolution_due expressed with different UTC offsets (compared as instants, not raw strings)', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({
        sla_first_response_due: '2026-08-04T06:00:00.000Z',
        sla_resolution_due: '2026-08-04T11:30:00.000+05:30', // the SAME instant, different offset
      }),
    );
    expect(r.success).toBe(true);
  });
});
