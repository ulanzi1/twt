// Story 6.22 (DL13; AC9) — `claim.closed`'s payload is DISCRIMINATED on its trigger, and OP10's guard names exactly the
// fraud triggers. DB-free.
//
//   · a HELD trigger REQUIRES `held_by_claim_case_id` (OP10 reads it); a FRAUD trigger REFUSES one (TR6 — filling it with
//     the claim's own id would make OP10 label the claim "… later refused; the family may file again") and carries the
//     `finding_id`;
//   · both keep `deceased_member_id` REQUIRED (the overlay matches on it);
//   · `OP10_EXCLUDED_CLOSE_TRIGGERS` (spelled in `one-payment-per-death.ts` to dodge an import cycle) EQUALS
//     `CLAIM_CLOSED_FRAUD_TRIGGERS`;
//   · a held closer cannot be handed a fraud trigger (the TYPE — `ClaimClosedHeldTrigger`).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CLAIM_CLOSED_FRAUD_TRIGGERS,
  CLAIM_CLOSED_HELD_TRIGGERS,
  CLAIM_CLOSED_TRIGGERS,
  ClaimClosedPayloadSchema,
  type ClaimClosedHeldTrigger,
} from '../../src/claim/events.js';
import { OP10_EXCLUDED_CLOSE_TRIGGERS } from '../../src/claim/one-payment-per-death.js';

const base = (trigger: string) => ({
  from_state: 'verifier_review',
  to_state: 'closed',
  trigger,
  actor: 'system',
  deceased_member_id: randomUUID(),
});

describe('Story 6.22 — `claim.closed` is discriminated on its trigger', () => {
  it.each(CLAIM_CLOSED_HELD_TRIGGERS)('held `%s`: REQUIRES held_by_claim_case_id; refuses a finding_id', (trigger) => {
    expect(ClaimClosedPayloadSchema.safeParse({ ...base(trigger), held_by_claim_case_id: randomUUID() }).success).toBe(true);
    expect(ClaimClosedPayloadSchema.safeParse(base(trigger)).success).toBe(false);
    expect(
      ClaimClosedPayloadSchema.safeParse({ ...base(trigger), held_by_claim_case_id: randomUUID(), finding_id: randomUUID() }).success,
    ).toBe(false);
  });

  it.each(CLAIM_CLOSED_FRAUD_TRIGGERS)('fraud `%s`: REQUIRES finding_id; REFUSES held_by_claim_case_id (TR6)', (trigger) => {
    expect(ClaimClosedPayloadSchema.safeParse({ ...base(trigger), finding_id: randomUUID() }).success).toBe(true);
    expect(ClaimClosedPayloadSchema.safeParse(base(trigger)).success).toBe(false);
    expect(
      ClaimClosedPayloadSchema.safeParse({ ...base(trigger), finding_id: randomUUID(), held_by_claim_case_id: randomUUID() }).success,
    ).toBe(false);
  });

  it('every arm keeps deceased_member_id REQUIRED (the overlay matches on it); an unknown trigger is refused', () => {
    const { deceased_member_id: _, ...noMember } = { ...base('fraud_finding_guilty'), finding_id: randomUUID() };
    expect(ClaimClosedPayloadSchema.safeParse(noMember).success).toBe(false);
    expect(ClaimClosedPayloadSchema.safeParse({ ...base('closed_because_alive'), finding_id: randomUUID() }).success).toBe(false);
  });

  it('the trigger sets: held ∪ fraud = all, disjoint; OP10 excludes EXACTLY the fraud ones', () => {
    expect([...CLAIM_CLOSED_TRIGGERS].sort()).toEqual([...CLAIM_CLOSED_HELD_TRIGGERS, ...CLAIM_CLOSED_FRAUD_TRIGGERS].sort());
    expect(CLAIM_CLOSED_HELD_TRIGGERS.filter((t) => (CLAIM_CLOSED_FRAUD_TRIGGERS as readonly string[]).includes(t))).toEqual([]);
    expect([...OP10_EXCLUDED_CLOSE_TRIGGERS]).toEqual([...CLAIM_CLOSED_FRAUD_TRIGGERS]);
    // ⛔ A fraud trigger is not a held trigger (the held closer's input type) — a compile-time pin.
    // @ts-expect-error a fraud trigger cannot be handed to a held closer
    const held: ClaimClosedHeldTrigger = 'fraud_finding_innocent';
    expect(held).toBe('fraud_finding_innocent');
  });
});
