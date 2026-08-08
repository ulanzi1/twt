// Story 3.9 Life Events markers — pure, DB-free unit tests (Task 1 / Task 9).
//
// The two NEW member events (member.address_updated + member.posting_updated) are
// NON-TRANSITION identity markers with NON-PII payloads. This covers:
//   · the payload schemas ACCEPT the non-PII marker shape and REJECT raw PII / unknown keys,
//   · the reducer leaves the lifecycle state UNCHANGED on both markers (R5 — identity).

import { describe, expect, it } from 'vitest';

import {
  AddressUpdatedPayloadSchema,
  MEMBER_EVENT_PAYLOAD_SCHEMAS,
  MEMBER_EVENT_TYPES,
  PostingUpdatedPayloadSchema,
} from '../../src/member/events.js';
import {
  type MemberEventInput,
  type MemberLifecycleState,
  memberStateMachine,
} from '../../src/member/state.js';

const ev = (type: string, payload: unknown = {}): MemberEventInput => ({ type, payload });
const fold = (events: MemberEventInput[]): MemberLifecycleState => memberStateMachine.fold(events);

/** Drive a member to `active` so we can assert the markers do not move it. */
const TO_ACTIVE: MemberEventInput[] = [
  ev('member.signup_initiated'),
  ev('member.kyc_completed'),
  ev('member.vyawastha_shulk_paid', { utr: 'X', amount_inr: 110 }),
  ev('member.lock_in_expired', { kyc_verified: true }),
];

describe('Story 3.9 — event vocabulary wiring', () => {
  it('extends the vocabulary to 21 types including the two Life Events markers', () => {
    // 14 (Story 3.1) + 2 (Story 3.9 Life Events markers, this story) + 3 (Story 10.10 moderation)
    // + 1 (Story 10.26 `member.personal_event_asserted`)
    // + 1 (Story 10.23 `member.restoration_discipline.imposed`).
    // ⚠ Story 10.10's three `member.moderation.*` events are ALSO non-transition markers — they move
    // an ORTHOGONAL moderation overlay, never `members.state` — so they belong to the same identity
    // family this file exercises, and the count moved 16 → 19 with them. Story 10.26's assertion is
    // a non-transition marker too (reducer identity, the `address_updated` precedent), so it joins
    // the same family and the count moved 19 → 20. Story 10.23's imposition is the SECOND overlay's
    // one event — same identity family, same reason — taking it 20 → 21.
    expect(MEMBER_EVENT_TYPES).toHaveLength(21);
    expect(MEMBER_EVENT_TYPES).toContain('member.address_updated');
    expect(MEMBER_EVENT_TYPES).toContain('member.posting_updated');
    expect(MEMBER_EVENT_TYPES).toContain('member.restoration_discipline.imposed');
  });

  it('binds both new types to a payload schema (exhaustive registry)', () => {
    expect(MEMBER_EVENT_PAYLOAD_SCHEMAS['member.address_updated']).toBe(AddressUpdatedPayloadSchema);
    expect(MEMBER_EVENT_PAYLOAD_SCHEMAS['member.posting_updated']).toBe(PostingUpdatedPayloadSchema);
  });
});

describe('AddressUpdatedPayloadSchema — NON-PII marker (R1)', () => {
  const base = {
    from_state: 'active',
    to_state: 'active',
    trigger: 'address_update',
    actor: 'member',
  } as const;

  it('accepts the presence-only marker', () => {
    expect(AddressUpdatedPayloadSchema.parse({ ...base, address_present: true })).toMatchObject({
      address_present: true,
    });
  });

  it('rejects a raw address field (PII must never enter the payload)', () => {
    expect(() =>
      AddressUpdatedPayloadSchema.parse({
        ...base,
        address_present: true,
        address: '12 MG Road, Pune',
      }),
    ).toThrow();
  });

  it('rejects address_present other than literal true', () => {
    expect(() => AddressUpdatedPayloadSchema.parse({ ...base, address_present: false })).toThrow();
  });
});

describe('PostingUpdatedPayloadSchema — non-PII district + retirement flag', () => {
  const base = {
    from_state: 'active',
    to_state: 'active',
    trigger: 'posting_update',
    actor: 'member',
  } as const;

  it('accepts district + is_retirement (pariwar_ref is the only optional field)', () => {
    expect(
      PostingUpdatedPayloadSchema.parse({ ...base, district: 'Pune', is_retirement: false }),
    ).toMatchObject({ district: 'Pune', is_retirement: false });
  });

  it('accepts pariwar_ref + is_retirement when present', () => {
    const parsed = PostingUpdatedPayloadSchema.parse({
      ...base,
      district: 'Nagpur',
      pariwar_ref: 'pariwar-abc',
      is_retirement: true,
    });
    expect(parsed.is_retirement).toBe(true);
    expect(parsed.pariwar_ref).toBe('pariwar-abc');
  });

  it('rejects an empty district and unknown keys', () => {
    expect(() => PostingUpdatedPayloadSchema.parse({ ...base, district: '' })).toThrow();
    expect(() =>
      PostingUpdatedPayloadSchema.parse({ ...base, district: 'Pune', ehrms_id: 'E123' }),
    ).toThrow();
  });
});

describe('reducer — both Life Events markers are identity (NON-TRANSITION)', () => {
  it('address_updated leaves the state unchanged', () => {
    expect(fold(TO_ACTIVE)).toBe('active');
    expect(fold([...TO_ACTIVE, ev('member.address_updated', {})])).toBe('active');
  });

  it('posting_updated leaves the state unchanged', () => {
    expect(fold([...TO_ACTIVE, ev('member.posting_updated', {})])).toBe('active');
  });

  it('markers never advance a pre-active state either', () => {
    const pendingFee = [ev('member.signup_initiated'), ev('member.kyc_completed')];
    expect(fold(pendingFee)).toBe('pending-fee');
    expect(fold([...pendingFee, ev('member.address_updated'), ev('member.posting_updated')])).toBe(
      'pending-fee',
    );
  });
});
