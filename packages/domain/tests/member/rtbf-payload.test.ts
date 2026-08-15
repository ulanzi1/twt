// Story 10.21 — the RTBF anonymization payload contract. Pure, DB-free schema pins (Task 3b / AC3).
//
// ⚠ WHY THIS FILE EXISTS AT ALL. Before Story 10.21, `RtbfAnonymizedPayloadSchema` was pinned by
// NOTHING: `grep RtbfAnonymizedPayloadSchema` returned three hits, all in SOURCE (`member/events.ts`
// twice, `packages/events/src/registry.ts` once). The sibling describe block in `withdrawal.test.ts`
// ("frozen payload schemas are auditShape-only + strict") exercises ONLY the two WITHDRAWAL schemas —
// schemas this story does not widen. ⛔ Do not "consolidate" these pins into that block: it would put a
// widened schema under a heading asserting the opposite, and 10.21's own spec forbids editing it.
//
// ⭐ BOTH SHAPES ARE ASSERTED, and that is load-bearing. `helpdesk_ticket_id` is `.optional()` so the
// member self-service path (a FOUR-field payload, parsed before insert by `member/project.ts`) keeps
// working. Asserting only the 5-field off-portal shape would let the 4-field member shape regress
// unnoticed, and vice-versa — so both are pinned here, explicitly.

import { describe, expect, it } from 'vitest';

import { RtbfAnonymizedPayloadSchema } from '../../src/member/events.js';

describe('Story 10.21 — RtbfAnonymizedPayloadSchema is auditShape + an OPTIONAL ticket id, still strict', () => {
  /** The member self-service shape: exactly the four auditShape fields (`rtbf/handlers.ts`). */
  const memberShape = {
    from_state: 'withdrawn',
    to_state: 'anonymized',
    trigger: 'rtbf_request',
    actor: 'member',
  } as const;

  /** The off-portal shape: auditShape + the originating helpdesk ticket, with the 10.21 actor/trigger. */
  const offPortalShape = {
    from_state: 'active',
    to_state: 'anonymized',
    trigger: 'member_data_rights.rtbf_fulfilled',
    actor: 'trustee',
    helpdesk_ticket_id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  } as const;

  it('accepts the FOUR-field member self-service payload (the field stays optional)', () => {
    // ⛔ If this fails, `helpdesk_ticket_id` was made REQUIRED — which breaks every member RTBF at
    // runtime, because `member/project.ts` parses the payload before insert.
    expect(RtbfAnonymizedPayloadSchema.safeParse(memberShape).success).toBe(true);
  });

  it('accepts the FIVE-field off-portal payload carrying the originating ticket id', () => {
    expect(RtbfAnonymizedPayloadSchema.safeParse(offPortalShape).success).toBe(true);
  });

  it('accepts `actor: "trustee"` — the pinned off-portal staff attribution', () => {
    // `memberActorSchema` is `z.enum(['member','system','trustee'])`: there is no finer staff label, so
    // 'trustee' is the only admissible value for a staff-initiated member event. Pinned so a later
    // reader does not "correct" it to 'member' by copying the self-service exemplar.
    expect(RtbfAnonymizedPayloadSchema.safeParse({ ...offPortalShape, actor: 'trustee' }).success).toBe(true);
    expect(RtbfAnonymizedPayloadSchema.safeParse({ ...offPortalShape, actor: 'operator' }).success).toBe(false);
  });

  it('REJECTS a non-UUID ticket id', () => {
    expect(
      RtbfAnonymizedPayloadSchema.safeParse({ ...offPortalShape, helpdesk_ticket_id: 'ticket-1' }).success,
    ).toBe(false);
  });

  it('is STILL `.strict()` — free text cannot ride along (R1)', () => {
    // ⭐ The whole R1 guarantee. The widening admits ONE opaque UUID; it must not have opened the door
    // to arbitrary fields, which is where cleared PII would travel.
    expect(
      RtbfAnonymizedPayloadSchema.safeParse({ ...memberShape, rtbf_reason: 'moving abroad' }).success,
    ).toBe(false);
    expect(
      RtbfAnonymizedPayloadSchema.safeParse({ ...offPortalShape, operator_note: 'called in' }).success,
    ).toBe(false);
    // Not even a plausible-looking PII field that the erasure just cleared.
    expect(
      RtbfAnonymizedPayloadSchema.safeParse({ ...memberShape, mobile: '9876543210' }).success,
    ).toBe(false);
  });

  it('still requires the auditShape core', () => {
    const noTrigger: Record<string, unknown> = { ...memberShape };
    delete noTrigger.trigger;
    expect(RtbfAnonymizedPayloadSchema.safeParse(noTrigger).success).toBe(false);
    expect(RtbfAnonymizedPayloadSchema.safeParse({ ...memberShape, trigger: '' }).success).toBe(false);
  });
});
