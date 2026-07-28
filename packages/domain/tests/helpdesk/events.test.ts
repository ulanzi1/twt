// HelpdeskTicketCreatedPayloadSchema — DB-free unit tests (Story 10.1 review-hardening, chunk 2).
//
// Covers the cross-field `.superRefine` checks added during code review (chunk 1): the subject-XOR
// (both directions), the member_scope_context.pariwar_id ↔ top-level pariwar_id cross-validation, and
// the created_via/operator_attribution consistency check — none of which had direct test coverage
// before this file (only exercised indirectly, and only along the single "happy path" combination,
// via the live-DB projector-trigger.spec.ts fixture).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { HelpdeskTicketCreatedPayloadSchema } from '../../src/helpdesk/events.js';

const PARIWAR = randomUUID();
const MEMBER = randomUUID();

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    from_state: null,
    to_state: 'open',
    trigger: 'helpdesk.create:member_app',
    actor: 'member',
    ticket_id: randomUUID(),
    pariwar_id: PARIWAR,
    category: 'kyc-trouble',
    sub_category: null,
    body: 'help with KYC',
    attachments: [],
    member_scope_context: { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER },
    routing_policy_version: 1,
    target_role: 'helpline_operator',
    target_scope: { dimension: 'pariwar', value: PARIWAR },
    matched_rule_index: 0,
    sla_first_response_due: '2026-08-04T06:00:00.000Z',
    sla_resolution_due: '2026-08-08T18:30:00.000Z',
    created_via: 'member_app',
    operator_attribution: null,
    subject_member_id: MEMBER,
    subject_actor_id: null,
    claim_case_id: null,
    pool_id: null,
    module_id: null,
    validity_lookup_id: null,
    ...overrides,
  };
}

describe('HelpdeskTicketCreatedPayloadSchema — the well-formed baseline', () => {
  it('a consistent member_app payload parses cleanly', () => {
    expect(HelpdeskTicketCreatedPayloadSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('a consistent helpline_call payload (subject_actor_id set, operator_attribution set) parses cleanly', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(
      basePayload({
        subject_member_id: null,
        subject_actor_id: randomUUID(),
        created_via: 'helpline_call',
        operator_attribution: 'Operator Priya (Helpline Desk 2)',
        trigger: 'helpdesk.create:helpline_call',
        actor: 'operator',
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe('HelpdeskTicketCreatedPayloadSchema — subject XOR', () => {
  it('rejects BOTH subject_member_id and subject_actor_id set', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(basePayload({ subject_actor_id: randomUUID() }));
    expect(result.success).toBe(false);
  });

  it('rejects NEITHER subject_member_id nor subject_actor_id set', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(basePayload({ subject_member_id: null }));
    expect(result.success).toBe(false);
  });
});

describe('HelpdeskTicketCreatedPayloadSchema — member_scope_context.pariwar_id cross-validation', () => {
  it('rejects a member_scope_context.pariwar_id that differs from the top-level pariwar_id', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(
      basePayload({ member_scope_context: { pariwar_id: randomUUID(), state: null, district: null, block: null, subject_member_id: MEMBER } }),
    );
    expect(result.success).toBe(false);
  });
});

describe('HelpdeskTicketCreatedPayloadSchema — created_via/operator_attribution consistency', () => {
  it('rejects created_via: helpline_call with a null operator_attribution', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(
      basePayload({ created_via: 'helpline_call', subject_member_id: null, subject_actor_id: randomUUID() }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects created_via: member_app with a non-null operator_attribution', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(basePayload({ operator_attribution: 'should not be here' }));
    expect(result.success).toBe(false);
  });
});
