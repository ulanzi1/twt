// HelpdeskTicketCreatedPayloadSchema — DB-free unit tests (Story 10.1 review-hardening, chunk 2).
//
// Covers the cross-field `.superRefine` checks added during code review (chunk 1): the subject-XOR
// (both directions), the member_scope_context.pariwar_id ↔ top-level pariwar_id cross-validation, and
// the created_via/operator_attribution consistency check — none of which had direct test coverage
// before this file (only exercised indirectly, and only along the single "happy path" combination,
// via the live-DB projector-trigger.spec.ts fixture).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  HelpdeskAwaitingMemberPayloadSchema,
  HelpdeskMemberRepliedPayloadSchema,
  HelpdeskPickedUpPayloadSchema,
  HelpdeskResolvedPayloadSchema,
  HelpdeskTicketCreatedPayloadSchema,
} from '../../src/helpdesk/events.js';

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
    // Story 10.29 — element 1, captured at intake. PRESENT-and-nullable (⛔ not optional).
    member_staff_mediation_requested_at: null,
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

// ── Story 10.29 — element 1 of the three-part gate, captured at INTAKE ───────────────────────────
//
// Decision `2026-08-15-120` cl.1 (implementing `2026-08-15-116` cl.3, option (c)). The genesis mirrors
// the ticket's `member_staff_mediation_requested_at`, so the member's request is an IMMUTABLE event
// record and not a request-time literal the delivery caller can manufacture.

describe('Story 10.29 — member_staff_mediation_requested_at on the genesis payload', () => {
  it('round-trips an ISO instant with an offset (the member ASKED)', () => {
    const at = '2026-08-15T09:15:00.000Z';
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(
      basePayload({ member_staff_mediation_requested_at: at }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.member_staff_mediation_requested_at).toBe(at);
  });

  it('round-trips null (the member did NOT ask — the ordinary case)', () => {
    const result = HelpdeskTicketCreatedPayloadSchema.safeParse(
      basePayload({ member_staff_mediation_requested_at: null }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.member_staff_mediation_requested_at).toBeNull();
  });

  it('⛔ REJECTS the field being ABSENT — present-and-nullable, never optional', () => {
    // ⭐ THE POINT: if the key were `.optional()`, a pre-10.29 genesis and a post-10.29 genesis whose
    // member did not ask would be INDISTINGUISHABLE — "the field was not captured yet" would read
    // identically to "the member did not ask". A required-but-nullable key keeps those two apart.
    const payload = basePayload() as Record<string, unknown>;
    delete payload['member_staff_mediation_requested_at'];
    expect(HelpdeskTicketCreatedPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('⛔ REJECTS a non-ISO / offset-less string', () => {
    expect(
      HelpdeskTicketCreatedPayloadSchema.safeParse(
        basePayload({ member_staff_mediation_requested_at: '2026-08-15 09:15:00' }),
      ).success,
    ).toBe(false);
  });

  it('⛔ REJECTS a boolean — the WIRE carries a boolean, the PAYLOAD carries the server instant', () => {
    // ⛔ The intake request field `member_requested_staff_mediated_delivery` is a boolean; the server
    // converts it to its OWN clock instant. A boolean reaching the payload would mean a client value
    // had been threaded straight through (`2026-08-15-115` cl.3's defect, with a new author).
    expect(
      HelpdeskTicketCreatedPayloadSchema.safeParse(
        basePayload({ member_staff_mediation_requested_at: true }),
      ).success,
    ).toBe(false);
  });

  it('⛔ .strict() still rejects an unknown key alongside it', () => {
    expect(
      HelpdeskTicketCreatedPayloadSchema.safeParse(
        basePayload({ member_staff_mediation_requested_at: null, member_asked_for_staff_delivery: true }),
      ).success,
    ).toBe(false);
  });
});

// ── Story 10.4 — the message-bearing transition payload schemas (Decision 1) ──────────────────────
//
// awaiting_member / member_replied / resolved carry a bounded `message` (the reply round-trip); the
// message-free transitions (picked_up / closed / reopened) do NOT. `.strict()` rejects any unknown key.

const auditBase = {
  from_state: 'in_progress' as const,
  to_state: 'awaiting_member' as const,
  trigger: 'helpdesk.transition:reply',
  actor: 'staff' as const,
};

describe('Story 10.4 — message-bearing transition schemas accept a bounded message', () => {
  it('HelpdeskAwaitingMemberPayloadSchema accepts a staff message', () => {
    const result = HelpdeskAwaitingMemberPayloadSchema.safeParse({ ...auditBase, message: 'Could you share your UTR?' });
    expect(result.success).toBe(true);
  });

  it('HelpdeskResolvedPayloadSchema accepts a closing message', () => {
    const result = HelpdeskResolvedPayloadSchema.safeParse({
      ...auditBase,
      to_state: 'resolved',
      message: 'Fixed — your KYC is verified now.',
    });
    expect(result.success).toBe(true);
  });

  it('HelpdeskMemberRepliedPayloadSchema accepts a member message', () => {
    const result = HelpdeskMemberRepliedPayloadSchema.safeParse({
      ...auditBase,
      from_state: 'awaiting_member',
      to_state: 'in_progress',
      actor: 'member',
      message: 'Here is my UTR: 1234567890',
    });
    expect(result.success).toBe(true);
  });
});

describe('Story 10.4 — message-bearing transition schemas REQUIRE the message + stay .strict()', () => {
  it('HelpdeskAwaitingMemberPayloadSchema rejects a MISSING message', () => {
    expect(HelpdeskAwaitingMemberPayloadSchema.safeParse(auditBase).success).toBe(false);
  });

  it('HelpdeskResolvedPayloadSchema rejects an EMPTY message', () => {
    expect(
      HelpdeskResolvedPayloadSchema.safeParse({ ...auditBase, to_state: 'resolved', message: '' }).success,
    ).toBe(false);
  });

  it('HelpdeskAwaitingMemberPayloadSchema rejects a message over the 5000-char bound', () => {
    expect(
      HelpdeskAwaitingMemberPayloadSchema.safeParse({ ...auditBase, message: 'x'.repeat(5001) }).success,
    ).toBe(false);
  });

  it('a message-bearing schema rejects an unknown key (.strict())', () => {
    expect(
      HelpdeskAwaitingMemberPayloadSchema.safeParse({ ...auditBase, message: 'ok', surprise: 1 }).success,
    ).toBe(false);
  });
});

describe('Story 10.4 — the message-FREE transitions reject a message (.strict())', () => {
  it('HelpdeskPickedUpPayloadSchema accepts the bare audit shape', () => {
    expect(
      HelpdeskPickedUpPayloadSchema.safeParse({
        from_state: 'open',
        to_state: 'in_progress',
        trigger: 'helpdesk.transition:pick_up',
        actor: 'staff',
      }).success,
    ).toBe(true);
  });

  it('HelpdeskPickedUpPayloadSchema REJECTS an added message (.strict())', () => {
    expect(
      HelpdeskPickedUpPayloadSchema.safeParse({
        from_state: 'open',
        to_state: 'in_progress',
        trigger: 'helpdesk.transition:pick_up',
        actor: 'staff',
        message: 'pick-ups carry no message',
      }).success,
    ).toBe(false);
  });
});
